/* 五子棋小游戏：本地双人 / 人机对战 / 在线联机
 * 15×15 标准棋盘，Canvas 渲染，黑先白后，横竖斜任意方向连五即胜（无禁手）。
 * 人机：玩家执黑，AI 执白，简单棋型评分启发式（进攻分 + 防守分，带随机扰动）。
 * 联机：复用留言信箱的 Supabase 项目（gomoku_rooms 表，建表 SQL 见 SETUP-INBOX.md 附录），
 * 房间码即凭证，双方每 2 秒轮询房间行同步棋局（不用 realtime channel，实现更稳）。
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 */

(function () {
  const I18N = {
    zh: {
      modeLocal: "本地双人",
      modeAI: "人机对战",
      modeOnline: "在线联机",
      modeLabelLocal: "本地双人",
      modeLabelAI: "人机对战（你执黑）",
      modeLabelOnline: "在线联机",
      turn: "轮到",
      black: "黑棋",
      white: "白棋",
      moves: "{n} 步",
      restart: "重新开始",
      undo: "悔棋",
      create: "创建房间",
      join: "加入房间",
      leave: "离开房间",
      codePlaceholder: "房间码",
      roomCode: "房间码",
      waiting: "等待对手加入…",
      youBlack: "你执黑",
      youWhite: "你执白",
      yourTurn: "轮到你落子",
      waitTurn: "等待对方落子…",
      notConfigured: "联机对战暂未开放（站长还没有配置后端）。",
      invalidCode: "请输入 6 位房间码。",
      roomNotFound: "没找到这个房间，检查一下房间码。",
      roomFull: "这个房间已经开始或已结束。",
      onlineFail: "网络异常，请稍后再试。",
      winBlack: "🎉 黑棋获胜！",
      winWhite: "🎉 白棋获胜！",
      draw: "棋盘下满，平局！",
      youWin: "🎉 你赢了！",
      youLose: "对方获胜。",
      again: "再来一局",
      thinking: "电脑思考中…"
    },
    en: {
      modeLocal: "Local 2P",
      modeAI: "vs AI",
      modeOnline: "Online",
      modeLabelLocal: "Local two-player",
      modeLabelAI: "vs AI (you play Black)",
      modeLabelOnline: "Online match",
      turn: "Turn:",
      black: "Black",
      white: "White",
      moves: "{n} moves",
      restart: "Restart",
      undo: "Undo",
      create: "Create Room",
      join: "Join Room",
      leave: "Leave Room",
      codePlaceholder: "Room code",
      roomCode: "Room code",
      waiting: "waiting for opponent…",
      youBlack: "you play Black",
      youWhite: "you play White",
      yourTurn: "Your move",
      waitTurn: "Opponent's move…",
      notConfigured: "Online play is not available yet (backend not configured).",
      invalidCode: "Please enter the 6-character room code.",
      roomNotFound: "Room not found. Check the code.",
      roomFull: "This room has already started or finished.",
      onlineFail: "Network error. Please try again.",
      winBlack: "🎉 Black wins!",
      winWhite: "🎉 White wins!",
      draw: "Board full — it's a draw!",
      youWin: "🎉 You win!",
      youLose: "Your opponent wins.",
      again: "Play Again",
      thinking: "AI is thinking…"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const SIZE = 15;
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  // ===== 胜负判定：从最后落子 (x,y) 出发，四方向同色连五即胜 =====
  function checkWinAt(b, x, y, color) {
    for (const [dx, dy] of DIRS) {
      let n = 1;
      for (const s of [1, -1]) {
        let i = x + dx * s, j = y + dy * s;
        while (i >= 0 && i < SIZE && j >= 0 && j < SIZE && b[j][i] === color) {
          n++; i += dx * s; j += dy * s;
        }
      }
      if (n >= 5) return true;
    }
    return false;
  }

  // ===== DOM =====
  const modesEl = document.getElementById("gomoku-modes");
  const modeLabelEl = document.getElementById("gomoku-mode-label");
  const turnEl = document.getElementById("gomoku-turn");
  const countEl = document.getElementById("gomoku-count");
  const canvas = document.getElementById("gomoku-canvas");
  const statusEl = document.getElementById("gomoku-status");
  const onlineEl = document.getElementById("gomoku-online");
  const roomInfoEl = document.getElementById("gomoku-room-info");
  const codeInput = document.getElementById("gomoku-code");
  const joinBtn = document.getElementById("gomoku-join");
  const createBtn = document.getElementById("gomoku-create");
  const leaveBtn = document.getElementById("gomoku-leave");
  const barEl = document.getElementById("gomoku-bar");
  const undoBtn = document.getElementById("gomoku-undo");
  const restartBtn = document.getElementById("gomoku-restart");
  const resultEl = document.getElementById("gomoku-result");
  const resultTextEl = document.getElementById("gomoku-result-text");
  const againBtn = document.getElementById("gomoku-again");
  const ctx = canvas.getContext("2d");

  // ===== 状态 =====
  let mode = "local";            // local | ai | online
  let board = newBoard();
  let moves = [];                // [[x,y],...]，奇数下标为白方
  let winner = null;             // "black" | "white" | "draw"
  let hoverPos = null;
  let aiThinking = false;
  let statusKey = "", statusCls = "";

  // 联机状态
  let roomCode = null;
  let myColor = null;            // "black" | "white"
  let roomStatus = null;         // waiting | playing | finished
  let placing = false;           // 正在提交落子
  let pollTimer = null;

  function newBoard() {
    return Array.from({ length: SIZE }, () => new Array(SIZE).fill(EMPTY));
  }
  function turnColor() { return moves.length % 2 === 0 ? BLACK : WHITE; }
  function turnName() { return turnColor() === BLACK ? "black" : "white"; }

  // ===== Supabase（照 inbox.js 的配置检测与降级模式）=====
  const gomokuConfigured =
    typeof SUPABASE_URL === "string" &&
    !SUPABASE_URL.startsWith("YOUR_") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    !SUPABASE_ANON_KEY.startsWith("YOUR_") &&
    typeof window.supabase !== "undefined";
  // 复用 inbox.js 已创建的客户端，避免多个 GoTrueClient 实例告警
  const gsb = gomokuConfigured
    ? (typeof sb !== "undefined" && sb ? sb : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
    : null;

  // ===== 棋盘绘制 =====
  const W = canvas.width, PAD = 26, CELL = (W - 2 * PAD) / (SIZE - 1);
  const cx = x => PAD + x * CELL;
  const cy = y => PAD + y * CELL;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function draw() {
    const ink = cssVar("--text", "#1A1A1A");
    const accent = cssVar("--accent", "#C1502E");

    ctx.clearRect(0, 0, W, W);
    // 纸感底色：站点纸色块 + 一层赭橙淡晕，偏暖像旧棋盘纸
    ctx.fillStyle = cssVar("--wash", "#F3F1EA");
    ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = cssVar("--accent-tint", "rgba(193, 80, 46, 0.10)");
    ctx.fillRect(0, 0, W, W);

    // 网格线
    ctx.strokeStyle = "rgba(26, 26, 26, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < SIZE; i++) {
      const p = PAD + i * CELL;
      ctx.moveTo(PAD, p); ctx.lineTo(W - PAD, p);
      ctx.moveTo(p, PAD); ctx.lineTo(p, W - PAD);
    }
    ctx.stroke();
    // 外框加粗
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD, PAD, W - 2 * PAD, W - 2 * PAD);

    // 星位
    ctx.fillStyle = ink;
    [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(cx(x), cy(y), 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 棋子
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        if (board[y][x] !== EMPTY) drawStone(x, y, board[y][x], 1);

    // 最后一步标记（赭橙小方框）
    if (moves.length) {
      const [lx, ly] = moves[moves.length - 1];
      const m = CELL * 0.32;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx(lx) - m, cy(ly) - m, m * 2, m * 2);
    }

    // hover 半透明预落子
    if (hoverPos && !winner && canInteract() && board[hoverPos[1]][hoverPos[0]] === EMPTY) {
      drawStone(hoverPos[0], hoverPos[1], turnColor(), 0.45);
    }
  }

  function drawStone(x, y, color, alpha) {
    const px = cx(x), py = cy(y), r = CELL * 0.44;
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(px - r / 3, py - r / 3, r / 6, px, py, r);
    if (color === BLACK) {
      g.addColorStop(0, "#555550");
      g.addColorStop(1, "#111111");
    } else {
      g.addColorStop(0, "#FFFFFF");
      g.addColorStop(1, "#D8D5CF");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (color === WHITE) {
      ctx.strokeStyle = "rgba(26, 26, 26, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 当前是否允许本地玩家点棋盘
  function canInteract() {
    if (winner) return false;
    if (mode === "online") {
      return roomStatus === "playing" && !placing && turnName() === myColor;
    }
    if (mode === "ai") return !aiThinking && turnColor() === BLACK;
    return true;
  }

  // ===== 落子 =====
  function tryPlace(x, y) {
    if (board[y][x] !== EMPTY) return;
    if (mode === "online") {
      if (canInteract()) placeOnline(x, y);
      return;
    }
    if (!canInteract()) return;
    doPlace(x, y);
    if (!winner && mode === "ai") {
      aiThinking = true;
      renderInfo();
      setTimeout(aiTurn, 420);
    }
  }

  function doPlace(x, y) {
    const color = turnColor();
    board[y][x] = color;
    moves.push([x, y]);
    if (checkWinAt(board, x, y, color)) {
      winner = color === BLACK ? "black" : "white";
      showResult();
    } else if (moves.length === SIZE * SIZE) {
      winner = "draw";
      showResult();
    }
    draw();
    renderInfo();
  }

  // ===== 人机 AI：棋型评分启发式（中等强度）=====
  function aiTurn() {
    if (mode !== "ai" || winner) { aiThinking = false; renderInfo(); return; }
    const p = aiPick();
    aiThinking = false;
    if (p) doPlace(p[0], p[1]);
  }

  // 对每个邻近空位同时算「AI 下这」的进攻分和「玩家下这」的防守分，
  // 加权取最高，乘少量随机扰动避免每局走法完全一样
  function aiPick() {
    let best = null, bestScore = -Infinity;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[y][x] !== EMPTY || !hasNeighbor(x, y)) continue;
        const attack = evalPoint(x, y, WHITE);   // AI 执白
        const defend = evalPoint(x, y, BLACK);   // 堵玩家
        const score = (attack + defend * 0.9) * (1 + Math.random() * 0.12);
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
    }
    return best;
  }

  // 只考虑已有棋子两格范围内的空位，减少无效计算
  function hasNeighbor(x, y) {
    for (let j = y - 2; j <= y + 2; j++)
      for (let i = x - 2; i <= x + 2; i++)
        if (i >= 0 && i < SIZE && j >= 0 && j < SIZE && board[j][i] !== EMPTY) return true;
    return false;
  }

  // 假设 color 落在 (x,y)，四个方向按连子数与两端是否开放给分
  function evalPoint(x, y, color) {
    let total = 0;
    for (const [dx, dy] of DIRS) {
      let count = 1, open = 0;
      for (const s of [1, -1]) {
        let i = x + dx * s, j = y + dy * s;
        while (i >= 0 && i < SIZE && j >= 0 && j < SIZE && board[j][i] === color) {
          count++; i += dx * s; j += dy * s;
        }
        if (i >= 0 && i < SIZE && j >= 0 && j < SIZE && board[j][i] === EMPTY) open++;
      }
      total += patternScore(count, open);
    }
    return total;
  }

  function patternScore(count, open) {
    if (count >= 5) return 100000;                       // 连五
    if (open === 0) return 0;                            // 两头堵死
    if (count === 4) return open === 2 ? 10000 : 1200;   // 活四 / 冲四
    if (count === 3) return open === 2 ? 1000 : 120;     // 活三 / 眠三
    if (count === 2) return open === 2 ? 100 : 15;
    return open === 2 ? 10 : 2;
  }

  // ===== 悔棋：本地双人撤一步，人机撤两步（玩家 + 电脑）=====
  function undo() {
    if (mode === "online" || aiThinking || !moves.length) return;
    winner = null;
    resultEl.classList.add("hidden");
    const n = mode === "ai" && moves.length >= 2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const [x, y] = moves.pop();
      board[y][x] = EMPTY;
    }
    draw();
    renderInfo();
  }

  function resetGame() {
    board = newBoard();
    moves = [];
    winner = null;
    hoverPos = null;
    aiThinking = false;
    resultEl.classList.add("hidden");
    draw();
    renderInfo();
  }

  function showResult() {
    let key;
    if (winner === "draw") key = "draw";
    else if (mode === "online") key = winner === myColor ? "youWin" : "youLose";
    else key = winner === "black" ? "winBlack" : "winWhite";
    resultTextEl.textContent = tp(key);
    // 联机模式不显示「再来一局」（重开一局需要双方同步，从简不做）
    againBtn.classList.toggle("hidden", mode === "online");
    resultEl.classList.remove("hidden");
  }

  // ===== 在线联机：房间码 + 2 秒轮询 =====
  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉 0/O/1/I 等易混淆字符
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function createRoom() {
    if (!gsb || roomCode) return;
    setStatus("", "");
    const code = genCode();
    const { error } = await gsb.from("gomoku_rooms").insert({ code });
    if (error) { setStatus("onlineFail", "error"); return; }
    roomCode = code;
    myColor = "black";
    roomStatus = "waiting";
    resetGame();
    startPolling();
    renderTexts();
    renderInfo();
  }

  async function joinRoom() {
    if (!gsb || roomCode) return;
    const code = codeInput.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { setStatus("invalidCode", "error"); return; }
    const { data, error } = await gsb.from("gomoku_rooms")
      .select("code,status").eq("code", code).maybeSingle();
    if (error) { setStatus("onlineFail", "error"); return; }
    if (!data) { setStatus("roomNotFound", "error"); return; }
    if (data.status !== "waiting") { setStatus("roomFull", "error"); return; }
    // 带上 status='waiting' 条件更新，防止两人同时挤进同一房间
    const { data: upd, error: e2 } = await gsb.from("gomoku_rooms")
      .update({ status: "playing", updated_at: new Date().toISOString() })
      .eq("code", code).eq("status", "waiting").select();
    if (e2 || !upd || !upd.length) { setStatus("roomFull", "error"); return; }
    roomCode = code;
    myColor = "white";
    roomStatus = "playing";
    resetGame();
    startPolling();
    setStatus("", "");
    renderTexts();
    renderInfo();
  }

  // 「离开房间」只清理本地状态，不删数据库行（对手轮询到静止局面自然停住；
  // 废弃房间留在表里，可由站长在 Table Editor 定期清理）
  function leaveRoom() {
    roomCode = null;
    myColor = null;
    roomStatus = null;
    placing = false;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    codeInput.value = "";
    setStatus("", "");
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollRoom, 2000);
  }

  async function pollRoom() {
    if (!roomCode || !gsb) return;
    const { data, error } = await gsb.from("gomoku_rooms")
      .select("moves,turn,winner,status").eq("code", roomCode).maybeSingle();
    if (error || !data) return; // 网络抖动跳过这轮，下轮再来
    applyRemote(data);
  }

  // 以远端行为准同步本地棋局
  function applyRemote(row) {
    roomStatus = row.status;
    const remote = Array.isArray(row.moves) ? row.moves : [];
    if (remote.length !== moves.length) {
      board = newBoard();
      remote.forEach((m, idx) => { board[m[1]][m[0]] = idx % 2 === 0 ? BLACK : WHITE; });
      moves = remote.map(m => [m[0], m[1]]);
      winner = null;
      resultEl.classList.add("hidden");
    }
    if (row.winner && !winner) {
      winner = row.winner;
      showResult();
    } else if (!row.winner && moves.length) {
      // 兜底：远端没写 winner 时本地补判一次
      const [lx, ly] = moves[moves.length - 1];
      const c = board[ly][lx];
      if (c !== EMPTY && checkWinAt(board, lx, ly, c)) {
        winner = c === BLACK ? "black" : "white";
        showResult();
      } else if (moves.length === SIZE * SIZE) {
        winner = "draw";
        showResult();
      }
    }
    renderRoomInfo();
    renderInfo();
    draw();
  }

  async function placeOnline(x, y) {
    placing = true;
    try {
      // 轻量乐观锁：提交前重读一次，确认仍是自己回合、步数没变，
      // 避免轮询间隙双方状态错位导致互相覆盖（极端并发仍可能冲突，娱乐场景可接受）
      const { data, error } = await gsb.from("gomoku_rooms")
        .select("moves,turn,winner,status").eq("code", roomCode).maybeSingle();
      if (error || !data) { setStatus("onlineFail", "error"); return; }
      applyRemote(data);
      if (data.status !== "playing" || data.winner || data.turn !== myColor) return;
      if ((Array.isArray(data.moves) ? data.moves.length : 0) !== moves.length) return; // 远端已变，以远端为准
      if (board[y][x] !== EMPTY) return;

      const color = myColor === "black" ? BLACK : WHITE;
      const newMoves = moves.concat([[x, y]]);
      const win = checkWinAt(board, x, y, color);
      const full = newMoves.length === SIZE * SIZE;
      const update = {
        moves: newMoves,
        turn: myColor === "black" ? "white" : "black",
        updated_at: new Date().toISOString()
      };
      if (win) { update.winner = myColor; update.status = "finished"; }
      else if (full) { update.winner = "draw"; update.status = "finished"; }
      const { error: e2 } = await gsb.from("gomoku_rooms")
        .update(update).eq("code", roomCode);
      if (e2) { setStatus("onlineFail", "error"); return; }
      // 乐观渲染：本地立即更新，下轮轮询再确认
      board[y][x] = color;
      moves.push([x, y]);
      if (win) { winner = myColor; showResult(); }
      else if (full) { winner = "draw"; showResult(); }
      renderInfo();
      draw();
    } finally {
      placing = false;
    }
  }

  // ===== 文案与信息渲染 =====
  function setStatus(key, cls) {
    statusKey = key;
    statusCls = cls;
    renderStatus();
  }

  function renderStatus() {
    statusEl.textContent = statusKey ? tp(statusKey) : "";
    statusEl.className = "inbox-status" + (statusCls ? " " + statusCls : "");
  }

  function renderRoomInfo() {
    if (mode !== "online") { roomInfoEl.textContent = ""; return; }
    if (!gomokuConfigured) { roomInfoEl.textContent = tp("notConfigured"); return; }
    if (!roomCode) { roomInfoEl.textContent = ""; return; }
    let html = tp("roomCode") + " <b>" + roomCode + "</b> · " +
      (myColor === "black" ? tp("youBlack") : tp("youWhite"));
    if (roomStatus === "waiting") html += " · " + tp("waiting");
    roomInfoEl.innerHTML = html; // roomCode 由本模块生成/校验，纯字母数字
  }

  function renderInfo() {
    modeLabelEl.textContent = tp(
      mode === "local" ? "modeLabelLocal" : mode === "ai" ? "modeLabelAI" : "modeLabelOnline");
    let turnText;
    if (winner) turnText = "—";
    else if (mode === "online" && roomStatus === "playing") {
      turnText = turnName() === myColor ? tp("yourTurn") : tp("waitTurn");
    } else if (mode === "online") turnText = "—";
    else if (mode === "ai" && (aiThinking || turnColor() === WHITE)) turnText = tp("thinking");
    else turnText = tp("turn") + " " + tp(turnColor() === BLACK ? "black" : "white");
    turnEl.textContent = turnText;
    countEl.textContent = tp("moves").replace("{n}", moves.length);
  }

  const MODES = [["local", "modeLocal"], ["ai", "modeAI"], ["online", "modeOnline"]];
  const modeBtns = {};
  MODES.forEach(([m]) => {
    const b = document.createElement("button");
    b.className = "ms-level";
    b.addEventListener("click", () => setMode(m));
    modesEl.appendChild(b);
    modeBtns[m] = b;
  });

  function renderTexts() {
    MODES.forEach(([m, key]) => {
      modeBtns[m].textContent = tp(key);
      modeBtns[m].classList.toggle("active", m === mode);
    });
    undoBtn.textContent = tp("undo");
    restartBtn.textContent = tp("restart");
    againBtn.textContent = tp("again");
    createBtn.textContent = tp("create");
    joinBtn.textContent = tp("join");
    leaveBtn.textContent = tp("leave");
    codeInput.placeholder = tp("codePlaceholder");
    // 联机控件只在联机模式显示；悔棋/重新开始只用于本地与人机
    onlineEl.classList.toggle("hidden", mode !== "online");
    barEl.classList.toggle("hidden", mode === "online");
    const inRoom = !!roomCode;
    codeInput.classList.toggle("hidden", inRoom);
    joinBtn.classList.toggle("hidden", inRoom);
    createBtn.classList.toggle("hidden", inRoom);
    leaveBtn.classList.toggle("hidden", !inRoom);
    // 后端未配置时禁用联机操作（照 inbox.js 的降级模式）
    codeInput.disabled = !gomokuConfigured;
    joinBtn.disabled = !gomokuConfigured;
    createBtn.disabled = !gomokuConfigured;
    renderRoomInfo();
    renderStatus();
  }

  function setMode(m) {
    if (m === mode) return;
    leaveRoom();
    mode = m;
    resetGame();
    renderTexts();
  }

  // ===== 事件 =====
  function posFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = W / rect.width;
    const x = Math.round(((e.clientX - rect.left) * scale - PAD) / CELL);
    const y = Math.round(((e.clientY - rect.top) * scale - PAD) / CELL);
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return null;
    return [x, y];
  }

  canvas.addEventListener("pointermove", e => {
    const p = posFromEvent(e);
    const changed = (p === null) !== (hoverPos === null) ||
      (p && hoverPos && (p[0] !== hoverPos[0] || p[1] !== hoverPos[1]));
    if (changed) { hoverPos = p; draw(); }
  });
  canvas.addEventListener("pointerleave", () => {
    if (hoverPos) { hoverPos = null; draw(); }
  });
  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    const p = posFromEvent(e);
    if (p) tryPlace(p[0], p[1]);
  });

  undoBtn.addEventListener("click", undo);
  restartBtn.addEventListener("click", resetGame);
  againBtn.addEventListener("click", resetGame);
  createBtn.addEventListener("click", createRoom);
  joinBtn.addEventListener("click", joinRoom);
  leaveBtn.addEventListener("click", () => {
    leaveRoom();
    resetGame();
    renderTexts();
  });

  document.addEventListener("langchange", () => {
    renderTexts();
    renderInfo();
    if (winner) showResult();
    draw();
  });

  // ===== 启动 =====
  renderTexts();
  resetGame();
})();