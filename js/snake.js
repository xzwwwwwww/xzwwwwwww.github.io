/* 贪吃蛇（自嘲熊主题）：熊头蛇身吃拉面
 * 依赖 main.js 的全局 currentLang；每帧重绘，语言切换即时生效
 */

(function () {
  const I18N = {
    zh: {
      score: "得分",
      readyTitle: "贪吃蛇",
      readySub: "方向键 / WASD / 滑动控制小熊吃拉面",
      overTitle: "游戏结束",
      overScore: "本局得分",
      restart: "再来一局",
      start: "开始",
      paused: "已暂停 · 按 P 继续"
    },
    en: {
      score: "Score",
      readyTitle: "Snake",
      readySub: "Arrows / WASD / swipe — feed the bear some ramen",
      overTitle: "Game Over",
      overScore: "Final score",
      restart: "Play again",
      start: "Start",
      paused: "Paused · press P to resume"
    }
  };
  const ts = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const GRID = 20, CELL = 26, W = GRID * CELL, H = GRID * CELL;
  const canvas = document.getElementById("snake-canvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("snake-start");

  let state = "ready";   // ready | playing | paused | over
  let snake = [], dir = { x: 1, y: 0 }, dirQueue = [];
  let food = null, score = 0;

  function placeFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID)
      };
      if (!snake.some(s => s.x === f.x && s.y === f.y)) return f;
    }
  }

  function startGame() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 };
    dirQueue = [];
    score = 0;
    food = placeFood();
    state = "playing";
    startBtn.textContent = ts("restart");
  }

  function speed() {  // 6 格/秒 → 最快 14 格/秒
    return Math.max(70, 167 - score * 1.2);
  }

  function visible() {
    return document.getElementById("game").classList.contains("active") &&
           document.getElementById("panel-snake").classList.contains("active") &&
           !document.hidden;
  }

  function tick() {
    if (state === "playing" && visible()) {
      // 应用缓存的转向（禁止 180° 掉头）
      while (dirQueue.length) {
        const d = dirQueue.shift();
        if (d.x !== -dir.x || d.y !== -dir.y) { dir = d; break; }
      }
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      // 撞墙或咬到自己
      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
          snake.some(s => s.x === head.x && s.y === head.y)) {
        state = "over";
      } else {
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score += 10;
          food = placeFood();
        } else {
          snake.pop();
        }
      }
    }
    draw();
    setTimeout(tick, speed());
  }

  // ===== 绘制 =====
  function drawBowl(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#D95550";
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -1);
    ctx.quadraticCurveTo(-8, 9, 0, 9);
    ctx.quadraticCurveTo(8, 9, 9, -1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 碗沿
    ctx.fillStyle = "#FFF3DF";
    ctx.beginPath();
    ctx.ellipse(0, -2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // 筷子
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(4, -4); ctx.lineTo(8, -12);
    ctx.moveTo(6, -4); ctx.lineTo(10, -12);
    ctx.stroke();
    ctx.restore();
  }

  function drawBearHead(cx, cy, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const R = CELL * 0.46;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4A3226";
    // 耳朵（朝向前方两侧）
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(R * 0.5, s * R * 0.75, R * 0.32, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // 脸
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // 笑眼
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(R * 0.25, s * R * 0.34, R * 0.14, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    // 腮黄
    ctx.fillStyle = "#F2A65A";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-R * 0.15, s * R * 0.62, R * 0.18, R * 0.1, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOverlay(title, lines) {
    ctx.fillStyle = "rgba(74, 50, 38, 0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFF7EF";
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 3;
    const bw = 400, bh = 170, bx = (W - bw) / 2, by = (H - bh) / 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 18);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#4A3226";
    ctx.font = "32px 'ZCOOL KuaiLe', sans-serif";
    ctx.fillText(title, W / 2, by + 56);
    ctx.font = "16px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillStyle = "#A0785F";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 94 + i * 26));
  }

  function draw() {
    // 浅橘背景 + 网格
    ctx.fillStyle = "#FBE9D9";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(74, 50, 38, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H);
      ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL);
      ctx.stroke();
    }

    // 食物
    if (food) drawBowl(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 2);

    // 蛇身（奶白丸子节节相连）
    for (let i = snake.length - 1; i >= 1; i--) {
      const s = snake[i];
      ctx.fillStyle = "#FFF7EF";
      ctx.strokeStyle = "#EDD0BB";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 9);
      ctx.fill(); ctx.stroke();
    }
    // 蛇头（熊头，朝向移动方向）
    if (snake.length) {
      const h = snake[0];
      const angle = Math.atan2(dir.y, dir.x);
      drawBearHead(h.x * CELL + CELL / 2, h.y * CELL + CELL / 2, angle);
    }

    // 得分
    ctx.textAlign = "left";
    ctx.font = "18px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillStyle = "rgba(74, 50, 38, 0.75)";
    ctx.fillText(`${ts("score")}: ${score}`, 12, 26);

    if (state === "ready") {
      drawOverlay(ts("readyTitle"), [ts("readySub")]);
    } else if (state === "paused") {
      drawOverlay(ts("paused"), []);
    } else if (state === "over") {
      drawOverlay(ts("overTitle"), [`${ts("overScore")}: ${score}`, ts("restart") + " →"]);
    }
  }

  // ===== 输入 =====
  const DIRS = {
    ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 }
  };

  function turn(d) {
    if (dirQueue.length < 3) dirQueue.push(d);
  }

  document.addEventListener("keydown", e => {
    if (!document.getElementById("panel-snake").classList.contains("active") ||
        !document.getElementById("game").classList.contains("active")) return;
    if (e.code === "KeyP" && state === "playing") { state = "paused"; return; }
    if (e.code === "KeyP" && state === "paused") { state = "playing"; return; }
    const d = DIRS[e.code];
    if (d) {
      e.preventDefault();
      if (state === "ready" || state === "over") startGame();
      if (state === "playing") turn(d);
    }
  });

  canvas.addEventListener("mousedown", () => {
    if (state === "ready" || state === "over") startGame();
  });

  let touchStart = null;
  canvas.addEventListener("touchstart", e => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (state === "ready" || state === "over") { startGame(); return; }
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    const d = Math.abs(dx) > Math.abs(dy)
      ? { x: Math.sign(dx), y: 0 }
      : { x: 0, y: Math.sign(dy) };
    if (state === "playing") turn(d);
  });

  startBtn.addEventListener("click", () => {
    if (state === "playing") return;
    startGame();
  });

  startBtn.textContent = ts("start");
  draw();
  setTimeout(tick, speed());
})();
