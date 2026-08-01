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
  const levelsEl = document.getElementById("match-levels");
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
  let grid = [];          // grid[r][c] = tile | null; tile = {t, ice, px, py, dying}
  let movesLeft = 0, score = 0, collected = 0, iceLeft = 0;
  let selected = null;    // [r, c]
  let state = "start";    // start | idle | busy | win | lose
  let chain = 0;
  let toast = "", toastUntil = 0;
  let started = false;

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
          grid[r].push({ t, ice: false, px: 0, py: 0, dying: 0 });
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

  // ===== 消除检测 =====
  function findMatches() {
    const hit = new Set();
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        const t = grid[r][c] && grid[r][c].t;
        let e = c;
        while (e + 1 < COLS && grid[r][e + 1] && grid[r][e + 1].t === t && t !== null && t !== undefined) e++;
        if (t !== null && t !== undefined && e - c + 1 >= 3) {
          for (let i = c; i <= e; i++) hit.add(r * COLS + i);
        }
        c = e + 1;
      }
    }
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < ROWS) {
        const t = grid[r][c] && grid[r][c].t;
        let e = r;
        while (e + 1 < ROWS && grid[e + 1][c] && grid[e + 1][c].t === t && t !== null && t !== undefined) e++;
        if (t !== null && t !== undefined && e - r + 1 >= 3) {
          for (let i = r; i <= e; i++) hit.add(i * COLS + c);
        }
        r = e + 1;
      }
    }
    return hit;
  }

  // ===== 结算循环 =====
  function resolveBoard() {
    state = "busy";
    const hit = findMatches();
    if (!hit.size) {
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
    score += hit.size * 10 * chain;
    hit.forEach(idx => {
      const r = Math.floor(idx / COLS), c = idx % COLS;
      const tile = grid[r][c];
      if (!tile) return;
      if (tile.ice) {
        tile.ice = false;   // 冰块被卷入消除：破冰而不消除
        iceLeft--;
      } else {
        tile.dying = performance.now();
        if (cfg.goal.kind === "collect" && tile.t === cfg.goal.type) collected++;
      }
    });
    setTimeout(() => {
      applyGravity();
      resolveBoard();
    }, 180);
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
        grid[r][c] = { t: rndT(), ice: false, px: 0, py: (r - write - 1) * CELL - CELL, dying: 0 };
      }
    }
    // 清掉已消除的
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && grid[r][c].dying) grid[r][c] = null;
      }
    }
    // 二次压实（把 null 再往下沉的已处理，上面循环保证无空洞）
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
      if (!findMatches().size && hasMove()) return;
    }
  }

  // ===== 交换 =====
  function trySwap(a, b) {
    if (state !== "idle") return;
    const ta = grid[a[0]][a[1]], tb = grid[b[0]][b[1]];
    if (!ta || !tb || ta.ice || tb.ice) return;
    [grid[a[0]][a[1]], grid[b[0]][b[1]]] = [tb, ta];
    const hit = findMatches();
    if (!hit.size) {
      [grid[a[0]][a[1]], grid[b[0]][b[1]]] = [ta, tb];
      // 弹回动画：交换像素再弹回（简单处理：短暂抖动提示）
      return;
    }
    movesLeft--;
    selected = null;
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
    buildBoard();
    state = "start";
    showOverlay(tf("level", { n: level }), goalText(cfg.goal), tp("start"), null);
  }

  // ===== 关卡按钮 =====
  function renderLevels() {
    levelsEl.innerHTML = "";
    for (let n = 1; n <= TOTAL; n++) {
      const b = document.createElement("button");
      b.className = "ms-level" + (n === level ? " active" : "") + (n > unlocked ? " match-locked" : "");
      b.textContent = n;
      b.disabled = n > unlocked;
      b.addEventListener("click", () => loadLevel(n));
      levelsEl.appendChild(b);
    }
  }

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
        if (selected && selected[0] === r && selected[1] === c) {
          ctx.strokeStyle = "#C1502E";
          ctx.lineWidth = 3;
          ctx.strokeRect(OX + c * CELL + 3, OY + r * CELL + 3, CELL - 6, CELL - 6);
          scale = 1.1;
        }
        drawBear(x, y + dy, 46, tile.t, scale, alpha);
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
