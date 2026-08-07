/* 自嘲熊消消乐：8×8 三消，50 关程序化难度曲线
 * 棋子为同款熊头（换底色表示类型），冰块障碍 L16 起。
 * 依赖 main.js 的全局 currentLang；进度存 localStorage "match-progress"。
 */

(function () {
  const I18N = {
    zh: {
      level: "第 {n} 关",
      goalScore: "目标：达到 {s} 分",
      goalCollect: "目标：收集 {c} 只{n}",
      goalIce: "目标：清除全部冰块",
      start: "开始游戏",
      win: "过关啦！",
      winSub: "得分 {s} · 剩余步数 {m}",
      next: "下一关",
      replay: "重玩",
      lose: "步数用完了…",
      retry: "重试本关",
      moves: "步数",
      score: "得分",
      shuffling: "没有可消的啦，洗牌！",
      bearNames: ["白熊", "橘熊", "蓝熊", "绿熊", "粉熊", "紫熊", "黄熊"]
    },
    en: {
      level: "Level {n}",
      goalScore: "Goal: reach {s} points",
      goalCollect: "Goal: collect {c} {n}",
      goalIce: "Goal: clear all the ice",
      start: "Start",
      win: "Level clear!",
      winSub: "Score {s} · {m} moves left",
      next: "Next level",
      replay: "Replay",
      lose: "Out of moves…",
      retry: "Retry",
      moves: "Moves",
      score: "Score",
      shuffling: "No moves left — shuffling!",
      bearNames: ["White", "Orange", "Blue", "Green", "Pink", "Purple", "Yellow"]
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;
  const tf = (k, map) => {
    let s = tp(k);
    Object.keys(map).forEach(key => { s = s.replace("{" + key + "}", map[key]); });
    return s;
  };

  const W = 720, H = 640;
  const COLS = 8, ROWS = 8, CELL = 64;
  const OX = (W - COLS * CELL) / 2, OY = 104;
  const TOTAL = 50;

  const BEARS = [
    { body: "#FFFFFF", cheek: "#F2A65A" },
    { body: "#F2A65A", cheek: "#FFF1E0" },
    { body: "#7AC7E3", cheek: "#FFF1E0" },
    { body: "#9CCC65", cheek: "#FFF1E0" },
    { body: "#F4A7C3", cheek: "#FFF1E0" },
    { body: "#B39DDB", cheek: "#FFF1E0" },
    { body: "#FFD166", cheek: "#F2A65A" }
  ];

  const canvas = document.getElementById("match-canvas");
  const ctx = canvas.getContext("2d");
  const levelsEl = document.getElementById("match-level-select");
  const overlayEl = document.getElementById("match-overlay");
  const ovTitle = document.getElementById("match-ov-title");
  const ovSub = document.getElementById("match-ov-sub");
  const ovMain = document.getElementById("match-ov-main");
  const ovAlt = document.getElementById("match-ov-alt");

  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  let unlocked = Math.max(1, Math.min(TOTAL, store.get("match-progress", 1)));

  // ===== 关卡配置（程序化生成） =====
  function levelCfg(n) {
    const types = n <= 10 ? 5 : n <= 30 ? 6 : 7;
    const moves = Math.max(15, 27 - Math.floor(n / 4));
    const ice = n >= 16 ? Math.min(18, 3 + Math.floor((n - 14) * 0.45)) : 0;
    let goal;
    if (n >= 16 && n % 3 === 0) goal = { kind: "ice" };
    else if (n % 3 === 2) goal = { kind: "collect", type: n % types, count: Math.min(40, 12 + Math.floor(n * 0.7)) };
    else goal = { kind: "score", score: 1200 + n * 260 };
    return { types, moves, ice, goal };
  }

  function goalText(g) {
    if (g.kind === "ice") return tp("goalIce");
    if (g.kind === "collect") return tf("goalCollect", { c: g.count, n: tp("bearNames")[g.type] });
    return tf("goalScore", { s: g.score });
  }

  // ===== 状态 =====
  let level = unlocked;
  let cfg = levelCfg(level);
  let grid = [];          // grid[r][c] = tile | null; tile = {t, ice, sp, px, py, dying}
  let movesLeft = 0, score = 0, collected = 0, iceLeft = 0;
  let selected = null;    // [r, c]
  let state = "start";    // start | idle | busy | win | lose
  let chain = 0;
  let toast = "", toastUntil = 0;
  let started = false;
  let beams = [];         // 特效光带 {sp, r, c, t}
  let lastSwap = null;    // 玩家刚交换的格子（特殊熊生成落点优先）

  const rndT = () => Math.floor(Math.random() * cfg.types);

  // ===== 棋盘生成：无初始 3 连且有可行步 =====
  function makesMatch(tg, r, c) {
    const t = tg[r][c];
    let run = 1;
    for (let i = c - 1; i >= 0 && tg[r][i] === t; i--) run++;
    for (let i = c + 1; i < COLS && tg[r][i] === t; i++) run++;
    if (run >= 3) return true;
    run = 1;
    for (let i = r - 1; i >= 0 && tg[i][c] === t; i--) run++;
    for (let i = r + 1; i < ROWS && tg[i][c] === t; i++) run++;
    return run >= 3;
  }

  function typeGrid() {
    return grid.map(row => row.map(t => (t ? t.t : -1)));
  }

  function hasMove() {
    const tg = typeGrid();
    const dirs = [[0, 1], [1, 0]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (tg[r][c] < 0) continue;
        for (const [dr, dc] of dirs) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= ROWS || c2 >= COLS || tg[r2][c2] < 0) continue;
          if (grid[r][c].ice || grid[r2][c2].ice) continue;
          [tg[r][c], tg[r2][c2]] = [tg[r2][c2], tg[r][c]];
          const ok = makesMatch(tg, r, c) || makesMatch(tg, r2, c2);
          [tg[r][c], tg[r2][c2]] = [tg[r2][c2], tg[r][c]];
          if (ok) return true;
        }
      }
    }
    return false;
  }

  function buildBoard() {
    for (let attempt = 0; attempt < 200; attempt++) {
      grid = [];
      for (let r = 0; r < ROWS; r++) {
        grid.push([]);
        for (let c = 0; c < COLS; c++) {
          let t;
          do { t = rndT(); } while (
            (c >= 2 && grid[r][c - 1].t === t && grid[r][c - 2].t === t) ||
            (r >= 2 && grid[r - 1][c].t === t && grid[r - 2][c].t === t));
          grid[r].push({ t, ice: false, sp: null, px: 0, py: 0, dying: 0 });
        }
      }
      // 放冰块（不放在前两行，避免开局卡死）
      iceLeft = 0;
      const cells = [];
      for (let r = 2; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push([r, c]);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      for (let i = 0; i < cfg.ice && i < cells.length; i++) {
        const [r, c] = cells[i];
        grid[r][c].ice = true;
        iceLeft++;
      }
      if (hasMove()) return;
    }
  }

  // ===== 消除检测：返回所有 ≥3 的段（含方向，供特殊熊判定） =====
  function findRuns() {
    const runs = [];
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        const tile = grid[r][c];
        const t = tile ? tile.t : -1;
        let e = c;
        while (e + 1 < COLS && grid[r][e + 1] && grid[r][e + 1].t === t && t >= 0) e++;
        if (t >= 0 && e - c + 1 >= 3) {
          const cells = [];
          for (let i = c; i <= e; i++) cells.push([r, i]);
          runs.push({ cells, dir: "h" });
        }
        c = e + 1;
      }
    }
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < ROWS) {
        const tile = grid[r][c];
        const t = tile ? tile.t : -1;
        let e = r;
        while (e + 1 < ROWS && grid[e + 1][c] && grid[e + 1][c].t === t && t >= 0) e++;
        if (t >= 0 && e - r + 1 >= 3) {
          const cells = [];
          for (let i = r; i <= e; i++) cells.push([i, c]);
          runs.push({ cells, dir: "v" });
        }
        r = e + 1;
      }
    }
    return runs;
  }
  const hasMatches = () => findRuns().length > 0;

  // ===== 特殊熊生成判定：L/T 交叉 → 炸弹；≥5 → 十字；4 → 条纹 =====
  function planCreations(runs) {
    const creations = new Map();   // idx -> sp
    const inH = {}, inV = {};
    runs.forEach(run => run.cells.forEach(([r, c]) => {
      (run.dir === "h" ? inH : inV)[r * COLS + c] = run;
    }));
    Object.keys(inH).forEach(k => {
      if (inV[k]) creations.set(Number(k), "bomb");
    });
    runs.forEach(run => {
      if (run.cells.length < 4) return;
      const sp = run.cells.length >= 5 ? "cross" : (run.dir === "h" ? "row" : "col");
      let spot;
      if (lastSwap && run.cells.some(([r, c]) => r === lastSwap[0] && c === lastSwap[1])) {
        spot = lastSwap[0] * COLS + lastSwap[1];
      } else {
        const mid = run.cells[Math.floor(run.cells.length / 2)];
        spot = mid[0] * COLS + mid[1];
      }
      if (!creations.has(spot)) creations.set(spot, sp);
    });
    return creations;
  }

  // ===== 特效展开：命中集里的特殊熊触发并连锁 =====
  function expandEffects(hit) {
    const out = new Set(hit);
    const queue = [...hit];
    const fired = new Set();
    while (queue.length) {
      const idx = queue.shift();
      if (fired.has(idx)) continue;
      fired.add(idx);
      const r = Math.floor(idx / COLS), c = idx % COLS;
      const tile = grid[r] && grid[r][c];
      if (!tile || !tile.sp || tile.ice) continue;
      beams.push({ sp: tile.sp, r, c, t: performance.now() });
      const add = [];
      if (tile.sp === "row" || tile.sp === "cross")
        for (let i = 0; i < COLS; i++) add.push(r * COLS + i);
      if (tile.sp === "col" || tile.sp === "cross")
        for (let i = 0; i < ROWS; i++) add.push(i * COLS + c);
      if (tile.sp === "bomb")
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) add.push(rr * COLS + cc);
          }
      add.forEach(i => { if (!out.has(i)) { out.add(i); queue.push(i); } });
    }
    return out;
  }

  // ===== 结算循环 =====
  function resolveBoard() {
    state = "busy";
    const runs = findRuns();
    if (!runs.length) {
      chain = 0;
      if (!hasMove()) {
        shuffle();
        toast = tp("shuffling");
        toastUntil = performance.now() + 1400;
      }
      checkEnd();
      if (state === "busy") state = "idle";
      return;
    }
    chain++;
    const nowT = performance.now();
    // 特殊熊生成
    const creations = planCreations(runs);
    // 命中集 = 所有段的格子，剔除生成格，再展开特效
    let hit = new Set();
    runs.forEach(run => run.cells.forEach(([r, c]) => hit.add(r * COLS + c)));
    creations.forEach((sp, idx) => hit.delete(idx));
    hit = expandEffects(hit);
    score += hit.size * 10 * chain;
    hit.forEach(idx => {
      const r = Math.floor(idx / COLS), c = idx % COLS;
      const tile = grid[r][c];
      if (!tile) return;
      if (tile.ice) {
        tile.ice = false;   // 冰块被波及：破冰而不消除（不触发其上特效）
        iceLeft--;
        return;
      }
      tile.dying = nowT;
      tile.sp = null;
      if (cfg.goal.kind === "collect" && tile.t === cfg.goal.type) collected++;
    });
    // 生成格变身（已死/带冰的跳过，带冰只破冰）
    creations.forEach((sp, idx) => {
      const r = Math.floor(idx / COLS), c = idx % COLS;
      const tile = grid[r][c];
      if (!tile || tile.dying) return;
      if (tile.ice) { tile.ice = false; iceLeft--; return; }
      tile.sp = sp;
      tile.bornT = nowT;
    });
    setTimeout(() => {
      applyGravity();
      resolveBoard();
    }, 200);
  }

  function applyGravity() {
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const tile = grid[r][c];
        if (tile && !tile.dying) {
          grid[write][c] = tile;
          if (write !== r) grid[r][c] = null;
          write--;
        }
      }
      for (let r = write; r >= 0; r--) {
        grid[r][c] = { t: rndT(), ice: false, sp: null, px: 0, py: (r - write - 1) * CELL - CELL, dying: 0 };
      }
    }
    // 清掉已消除的
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && grid[r][c].dying) grid[r][c] = null;
      }
    }
  }

  function goalMet() {
    const g = cfg.goal;
    if (g.kind === "ice") return iceLeft <= 0;
    if (g.kind === "collect") return collected >= g.count;
    return score >= g.score;
  }

  function checkEnd() {
    if (goalMet()) {
      state = "win";
      if (level === unlocked && unlocked < TOTAL) {
        unlocked++;
        store.set("match-progress", unlocked);
      }
      renderLevels();
      showOverlay(tp("win"), tf("winSub", { s: score, m: movesLeft }),
        level < TOTAL ? tp("next") : tp("replay"), tp("replay"));
    } else if (movesLeft <= 0) {
      state = "lose";
      showOverlay(tp("lose"), goalText(cfg.goal), tp("retry"), null);
    }
  }

  // ===== 洗牌（保留冰块位置） =====
  function shuffle() {
    const flat = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c].ice) flat.push(grid[r][c].t);
      }
    }
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let i = flat.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flat[i], flat[j]] = [flat[j], flat[i]];
      }
      let k = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!grid[r][c].ice) grid[r][c].t = flat[k++];
        }
      }
      if (!hasMatches() && hasMove()) return;
    }
  }

  // ===== 交换 =====
  function trySwap(a, b) {
    if (state !== "idle") return;
    const ta = grid[a[0]][a[1]], tb = grid[b[0]][b[1]];
    if (!ta || !tb || ta.ice || tb.ice) return;
    [grid[a[0]][a[1]], grid[b[0]][b[1]]] = [tb, ta];
    const runs = findRuns();
    if (!runs.length) {
      [grid[a[0]][a[1]], grid[b[0]][b[1]]] = [ta, tb];
      return;
    }
    movesLeft--;
    selected = null;
    lastSwap = b;
    resolveBoard();
  }

  // ===== 输入 =====
  function cellAt(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return [r, c];
  }

  canvas.addEventListener("mousedown", e => {
    if (state !== "idle") return;
    const cell = cellAt(e);
    if (!cell) { selected = null; return; }
    const [r, c] = cell;
    if (grid[r][c].ice) { selected = null; return; }
    if (!selected) { selected = cell; return; }
    if (selected[0] === r && selected[1] === c) { selected = null; return; }
    const dr = Math.abs(selected[0] - r), dc = Math.abs(selected[1] - c);
    if (dr + dc === 1) trySwap(selected, cell);
    else selected = cell;
  });
  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    if (e.touches.length) {
      canvas.dispatchEvent(new MouseEvent("mousedown", {
        clientX: e.touches[0].clientX, clientY: e.touches[0].clientY
      }));
    }
  }, { passive: false });

  // ===== 遮罩 =====
  function showOverlay(title, sub, mainTxt, altTxt) {
    ovTitle.textContent = title;
    ovSub.textContent = sub;
    ovMain.textContent = mainTxt;
    ovAlt.classList.toggle("hidden", !altTxt);
    if (altTxt) ovAlt.textContent = altTxt;
    overlayEl.classList.remove("hidden");
  }
  function hideOverlay() { overlayEl.classList.add("hidden"); }

  // ===== 关卡加载 =====
  function loadLevel(n) {
    level = n;
    cfg = levelCfg(n);
    startLevel();
  }

  function startLevel() {
    movesLeft = cfg.moves;
    score = 0;
    collected = 0;
    chain = 0;
    selected = null;
    beams = [];
    lastSwap = null;
    buildBoard();
    state = "start";
    showOverlay(tf("level", { n: level }), goalText(cfg.goal), tp("start"), null);
  }

  // ===== 关卡下拉 =====
  function renderLevels() {
    levelsEl.innerHTML = "";
    for (let n = 1; n <= TOTAL; n++) {
      const o = document.createElement("option");
      o.value = n;
      o.disabled = n > unlocked;
      o.textContent = (o.disabled ? "🔒 " : "") + tf("level", { n });
      levelsEl.appendChild(o);
    }
    levelsEl.value = level;
  }
  levelsEl.addEventListener("change", () => loadLevel(Number(levelsEl.value)));

  // ===== 绘制 =====
  function drawBear(x, y, size, type, scale, alpha) {
    const b = BEARS[type];
    const R = size / 2 * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    // 耳朵
    ctx.fillStyle = b.body;
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * R * 0.62, -R * 0.66, R * 0.3, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // 脸
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // ∪ 眼
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * R * 0.36, -R * 0.06, R * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    // 腮
    ctx.fillStyle = b.cheek;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * R * 0.55, R * 0.3, R * 0.19, R * 0.1, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 特殊熊角标：条纹（白杠）/ 十字（✚）/ 炸弹（引信弹）
  function drawSpBadge(x, y, sp) {
    ctx.save();
    ctx.translate(x, y);
    if (sp === "row" || sp === "col") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle = "#4A3226";
      ctx.lineWidth = 1;
      const horiz = sp === "row";
      for (const off of [-7, 2]) {
        ctx.beginPath();
        if (horiz) ctx.roundRect(-14, off, 28, 5, 2);
        else ctx.roundRect(off, -14, 5, 28, 2);
        ctx.fill(); ctx.stroke();
      }
    } else if (sp === "cross") {
      ctx.fillStyle = "#F2A65A";
      ctx.strokeStyle = "#4A3226";
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(14, 14, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(9.5, 14); ctx.lineTo(18.5, 14);
      ctx.moveTo(14, 9.5); ctx.lineTo(14, 18.5);
      ctx.stroke();
    } else if (sp === "bomb") {
      ctx.fillStyle = "#3A3A3A";
      ctx.strokeStyle = "#4A3226";
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(14, 14, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(14, 6); ctx.quadraticCurveTo(17, 2, 20, 1); ctx.stroke();
      ctx.fillStyle = "#F2A65A";
      ctx.beginPath(); ctx.arc(20, 1, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function draw(now) {
    ctx.fillStyle = "#FBF6EC";
    ctx.fillRect(0, 0, W, H);

    // HUD
    ctx.textAlign = "left";
    ctx.font = "20px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillStyle = "#4A3226";
    ctx.fillText(`${tp("moves")}: ${movesLeft}`, OX, 52);
    ctx.textAlign = "center";
    ctx.fillStyle = "#A0785F";
    ctx.font = "16px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    let goalLine = goalText(cfg.goal);
    if (cfg.goal.kind === "score") goalLine += `（${Math.min(score, cfg.goal.score)}/${cfg.goal.score}）`;
    if (cfg.goal.kind === "collect") goalLine += `（${Math.min(collected, cfg.goal.count)}/${cfg.goal.count}）`;
    if (cfg.goal.kind === "ice") goalLine += `（${iceLeft}）`;
    ctx.fillText(goalLine, W / 2, 50);
    ctx.textAlign = "right";
    ctx.fillStyle = "#4A3226";
    ctx.font = "20px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillText(`${tp("score")}: ${score}`, OX + COLS * CELL, 52);

    // 棋盘底
    ctx.fillStyle = "#FFFDF8";
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(OX - 6, OY - 6, COLS * CELL + 12, ROWS * CELL + 12, 10);
    ctx.fill(); ctx.stroke();

    // 格子与棋子（裁剪到棋盘范围内，避免下落新棋子飘出边框）
    ctx.save();
    ctx.beginPath();
    ctx.rect(OX - 6, OY - 6, COLS * CELL + 12, ROWS * CELL + 12);
    ctx.clip();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = OX + c * CELL + CELL / 2;
        const y = OY + r * CELL + CELL / 2;
        ctx.fillStyle = (r + c) % 2 ? "#F8F2E6" : "#FFFDF8";
        ctx.fillRect(OX + c * CELL + 1, OY + r * CELL + 1, CELL - 2, CELL - 2);
        const tile = grid[r] && grid[r][c];
        if (!tile) continue;
        let scale = 1, alpha = 1, dy = 0;
        if (tile.dying) {
          const k = Math.min(1, (now - tile.dying) / 170);
          scale = 1 - k * 0.9;
          alpha = 1 - k;
        } else if (tile.py < 0) {
          tile.py = Math.min(0, tile.py + CELL * 0.35);
          dy = tile.py;
        }
        // 特殊熊变身小脉冲
        if (tile.bornT && now - tile.bornT < 300) {
          scale *= 1 + 0.35 * Math.sin((now - tile.bornT) / 300 * Math.PI);
        }
        if (selected && selected[0] === r && selected[1] === c) {
          ctx.strokeStyle = "#C1502E";
          ctx.lineWidth = 3;
          ctx.strokeRect(OX + c * CELL + 3, OY + r * CELL + 3, CELL - 6, CELL - 6);
          scale = 1.1;
        }
        drawBear(x, y + dy, 46, tile.t, scale, alpha);
        if (tile.sp && !tile.dying && !tile.ice) drawSpBadge(x, y + dy, tile.sp);
        if (tile.ice) {
          ctx.fillStyle = "rgba(143, 216, 232, 0.45)";
          ctx.strokeStyle = "#7AC7E3";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(OX + c * CELL + 4, OY + r * CELL + 4, CELL - 8, CELL - 8, 8);
          ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.moveTo(OX + c * CELL + 12, OY + r * CELL + 22);
          ctx.lineTo(OX + c * CELL + 26, OY + r * CELL + 12);
          ctx.moveTo(OX + c * CELL + 14, OY + r * CELL + 38);
          ctx.lineTo(OX + c * CELL + 36, OY + r * CELL + 16);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // 特效光带（行/列亮带、炸弹扩散圈，300ms 淡出）
    beams = beams.filter(b => now - b.t < 300);
    beams.forEach(b => {
      const k = (now - b.t) / 300;
      const a = 0.45 * (1 - k);
      ctx.fillStyle = `rgba(240, 194, 78, ${a})`;
      if (b.sp === "row" || b.sp === "cross") ctx.fillRect(OX, OY + b.r * CELL, COLS * CELL, CELL);
      if (b.sp === "col" || b.sp === "cross") ctx.fillRect(OX + b.c * CELL, OY, CELL, ROWS * CELL);
      if (b.sp === "bomb") {
        ctx.beginPath();
        ctx.arc(OX + b.c * CELL + CELL / 2, OY + b.r * CELL + CELL / 2,
          CELL * 1.6 * (0.6 + k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 洗牌提示
    if (toast && now < toastUntil) {
      ctx.textAlign = "center";
      ctx.font = "22px 'ZCOOL KuaiLe', sans-serif";
      ctx.fillStyle = "rgba(74, 50, 38, 0.85)";
      ctx.fillText(toast, W / 2, OY + ROWS * CELL + 34);
    }
  }

  // ===== 主循环 =====
  function loop(t) {
    const active = document.getElementById("game").classList.contains("active") &&
      document.getElementById("panel-match").classList.contains("active");
    if (active && !document.hidden) draw(t || performance.now());
    requestAnimationFrame(loop);
  }

  // 遮罩主按钮统一入口（start 态开始游戏；win 态下一关；lose 态重试）
  ovMain.onclick = () => {
    if (state === "start") { hideOverlay(); state = "idle"; started = true; }
    else if (state === "win") { if (level < TOTAL) loadLevel(level + 1); else startLevel(); }
    else if (state === "lose") startLevel();
  };
  ovAlt.onclick = () => startLevel();

  // 初始化
  renderLevels();
  loadLevel(unlocked);
  requestAnimationFrame(loop);
  document.addEventListener("langchange", () => {
    if (state === "start") showOverlay(tf("level", { n: level }), goalText(cfg.goal), tp("start"), null);
  });
})();
