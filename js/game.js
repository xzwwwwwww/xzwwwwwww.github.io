/* 黄金矿工小游戏：Canvas 手绘，无素材依赖
 * 依赖 main.js 的全局 currentLang；画布每帧重绘，语言切换即时生效
 */

(function () {
  // roundRect 兼容旧浏览器
  if (typeof CanvasRenderingContext2D !== "undefined" &&
      !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }

  const GAME_I18N = {
    zh: {
      score: "得分",
      time: "时间",
      hint: "点击画布或按空格放钩",
      readyTitle: "黄金矿工",
      readySub: "点击开始，60 秒内挖到更多宝藏！",
      overTitle: "时间到！",
      overClear: "挖光了！",
      overScore: "本局得分",
      restart: "再来一局",
      start: "开始挖矿",
      boomTitle: "💥 砰！抓到炸弹",
      boomSub: "整局失败，再试一次吧"
    },
    en: {
      score: "Score",
      time: "Time",
      hint: "Click the canvas or press Space to drop the claw",
      readyTitle: "Gold Miner",
      readySub: "Click start — grab as much treasure as you can in 60s!",
      overTitle: "Time's up!",
      overClear: "All cleared!",
      overScore: "Final score",
      restart: "Play again",
      start: "Start",
      boomTitle: "💥 Boom! A bomb!",
      boomSub: "Game over — try again"
    }
  };
  const tg = k => (GAME_I18N[currentLang] || GAME_I18N.zh)[k] || k;

  const W = 760, H = 500;
  const PIVOT = { x: W / 2, y: 70 };
  const SOIL_TOP = 100;
  const BASE_LEN = 26;        // 静止时绳长
  const MAX_ANGLE = 1.3;      // 摆动幅度（弧度）
  const SWING_SPEED = 1.7;    // 摆动角速度
  const EXTEND_SPEED = 420;   // 射出速度 px/s
  const RETRACT_SPEED = 420;  // 空钩收回速度
  const ROUND_TIME = 60;

  const TYPES = [
    { key: "goldBig",   r: 30, value: 500, weight: 3,   color: "#E8B33A", n: 2 },
    { key: "goldSmall", r: 16, value: 200, weight: 1.6, color: "#F0C24E", n: 3 },
    { key: "diamond",   r: 11, value: 600, weight: 0.7, color: "#8FD8E8", n: 2 },
    { key: "rock",      r: 20, value: 50,  weight: 4,   color: "#9A8468", n: 3 },
    { key: "bomb",      r: 14, value: 0,   weight: 1.2, color: "#3A3A3A", n: 2 }
  ];

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("game-start");

  let state = "ready";   // ready | swing | extend | retract | over
  let angle = 0, swingDir = 1;
  let ropeLen = BASE_LEN, launchAngle = 0;
  let grabbed = null;
  let items = [], speckles = [];
  let score = 0, timeLeft = ROUND_TIME;
  let fail = false;
  let lastT = 0;

  // ===== 回合初始化 =====
  function spawnItems() {
    items = [];
    for (const t of TYPES) {   // TYPES 中 bomb 排在最后，优先生成宝藏
      for (let i = 0; i < t.n; i++) {
        let pos = null;
        for (let attempt = 0; attempt < 300 && !pos; attempt++) {
          const x = 50 + Math.random() * (W - 100);
          const y = SOIL_TOP + 60 + Math.random() * (H - SOIL_TOP - 110);
          // 与其他物品保持距离；炸弹额外避开黄金/钻石的正上方（不挡钩线路径）
          const clear = items.every(it => Math.hypot(it.x - x, it.y - y) > it.r + t.r + 14);
          const aboveTreasure = t.key === "bomb" && items.some(g =>
            (g.key.startsWith("gold") || g.key === "diamond") &&
            Math.abs(g.x - x) < g.r + 30 && y < g.y);
          if (clear && !aboveTreasure) {
            pos = { x, y };
          }
        }
        if (pos) items.push({ ...t, x: pos.x, y: pos.y, rot: Math.random() * Math.PI });
      }
    }
    speckles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: SOIL_TOP + 10 + Math.random() * (H - SOIL_TOP - 20),
      r: 1 + Math.random() * 2.5
    }));
  }

  function startGame() {
    score = 0;
    timeLeft = ROUND_TIME;
    angle = 0; swingDir = 1;
    ropeLen = BASE_LEN;
    grabbed = null;
    fail = false;
    spawnItems();
    state = "swing";
    startBtn.textContent = tg("restart");
  }

  // ===== 更新 =====
  // 还剩多少黄金/钻石：抓完即通关，不必清石头
  const valuablesLeft = () =>
    items.some(it => it.key.startsWith("gold") || it.key === "diamond");

  function tip() {
    const a = state === "swing" ? angle : launchAngle;
    return { x: PIVOT.x + Math.sin(a) * ropeLen, y: PIVOT.y + Math.cos(a) * ropeLen };
  }

  function update(dt) {
    if (state === "ready" || state === "over") return;

    timeLeft -= dt;
    if (timeLeft < 0) timeLeft = 0;

    if (state === "swing") {
      angle += swingDir * SWING_SPEED * dt;
      if (angle > MAX_ANGLE) { angle = MAX_ANGLE; swingDir = -1; }
      if (angle < -MAX_ANGLE) { angle = -MAX_ANGLE; swingDir = 1; }
      if (timeLeft <= 0) state = "over";
    } else if (state === "extend") {
      ropeLen += EXTEND_SPEED * dt;
      const p = tip();
      // 撞到边界：空收
      if (p.x < 8 || p.x > W - 8 || p.y > H - 8) {
        state = "retract";
        return;
      }
      // 碰撞检测
      for (const it of items) {
        if (Math.hypot(it.x - p.x, it.y - p.y) < it.r + 10) {
          items = items.filter(x => x !== it);
          if (it.key === "bomb") {
            fail = true;          // 抓到炸弹：整局失败
            state = "over";
            return;
          }
          grabbed = it;
          state = "retract";
          break;
        }
      }
    } else if (state === "retract") {
      const speed = grabbed ? RETRACT_SPEED / grabbed.weight : RETRACT_SPEED;
      ropeLen -= speed * dt;
      if (ropeLen <= BASE_LEN) {
        ropeLen = BASE_LEN;
        if (grabbed) {
          score += grabbed.value;
          grabbed = null;
          if (!valuablesLeft()) { state = "over"; return; }
        }
        state = timeLeft <= 0 ? "over" : "swing";
      }
    }
  }

  // ===== 绘制 =====
  function drawItem(it, x, y) {
    ctx.save();
    ctx.translate(x, y);
    if (it.key === "bomb") {
      // 炸弹主体
      ctx.fillStyle = it.color;
      ctx.strokeStyle = "#4A3226";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 2, it.r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // 高光
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(-it.r * 0.35, -it.r * 0.25, it.r * 0.22, it.r * 0.14, -0.6, 0, Math.PI * 2);
      ctx.fill();
      // 引信
      ctx.strokeStyle = "#4A3226";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 2 - it.r);
      ctx.quadraticCurveTo(4, -it.r - 6, 8, -it.r - 7);
      ctx.stroke();
      // 火星
      ctx.fillStyle = "#F2A65A";
      ctx.beginPath();
      ctx.arc(9, -it.r - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (it.key === "diamond") {
      ctx.rotate(it.rot);
      ctx.fillStyle = it.color;
      ctx.strokeStyle = "#4A3226";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -it.r); ctx.lineTo(it.r, 0); ctx.lineTo(0, it.r); ctx.lineTo(-it.r, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.moveTo(0, -it.r + 3); ctx.lineTo(it.r - 4, 0); ctx.lineTo(0, 2); ctx.lineTo(-it.r + 4, 0);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.rotate(it.rot);
      ctx.fillStyle = it.color;
      ctx.strokeStyle = "#4A3226";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, it.r, it.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (it.key.startsWith("gold")) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(-it.r * 0.3, -it.r * 0.3, it.r * 0.25, it.r * 0.18, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawClaw(p, a) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-a);
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();   // 两个爪钩
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(-12, 4, -9, 14);
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(12, 4, 9, 14);
    ctx.stroke();
    ctx.restore();
  }

  // 自嘲熊头：白脸 + 圆耳 + ∪形笑眼 + 橘色腮黄（与首页风格一致）
  function drawBearHead(cx, cy, R) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#4A3226";
    // 耳朵
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(s * R * 0.68, -R * 0.72, R * 0.36, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#FBE3CE";
      ctx.beginPath();
      ctx.arc(s * R * 0.68, -R * 0.72, R * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
    // 脸
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // ∪形笑眼
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * R * 0.38, -R * 0.08, R * 0.15, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    // 腮黄
    ctx.fillStyle = "#F2A65A";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * R * 0.56, R * 0.3, R * 0.2, R * 0.11, s * 0.2, 0, Math.PI * 2);
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
    const bw = 400, bh = 180, bx = (W - bw) / 2, by = (H - bh) / 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 18);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#4A3226";
    ctx.font = "34px 'ZCOOL KuaiLe', sans-serif";
    ctx.fillText(title, W / 2, by + 58);
    ctx.font = "17px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillStyle = "#A0785F";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 100 + i * 28));
  }

  function draw() {
    // 天空
    ctx.fillStyle = "#FFF3E4";
    ctx.fillRect(0, 0, W, SOIL_TOP);
    // 土地
    ctx.fillStyle = "#E4B96F";
    ctx.fillRect(0, SOIL_TOP, W, H - SOIL_TOP);
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, SOIL_TOP);
    ctx.lineTo(W, SOIL_TOP);
    ctx.stroke();
    // 土地斑点
    ctx.fillStyle = "rgba(74, 50, 38, 0.12)";
    speckles.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 物品
    items.forEach(it => drawItem(it, it.x, it.y));

    // 绳子 + 钩爪（+ 抓到的物品）
    const a = state === "swing" ? angle : launchAngle;
    const p = tip();
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(PIVOT.x, PIVOT.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (grabbed) drawItem(grabbed, p.x, p.y + grabbed.r * 0.8);
    drawClaw(p, a);

    // 自嘲熊头（代替绞盘，盖住绳子起点）
    drawBearHead(PIVOT.x, PIVOT.y - 8, 20);

    // HUD
    ctx.textAlign = "left";
    ctx.font = "20px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillStyle = "#4A3226";
    ctx.fillText(`${tg("score")}: ${score}`, 20, 42);
    ctx.textAlign = "right";
    ctx.fillStyle = timeLeft <= 10 ? "#D95550" : "#4A3226";
    ctx.fillText(`${tg("time")}: ${Math.ceil(timeLeft)}`, W - 20, 42);

    // 遮罩层
    if (state === "ready") {
      drawOverlay(tg("readyTitle"), [tg("readySub"), tg("hint")]);
    } else if (state === "over") {
      if (fail) {
        drawOverlay(tg("boomTitle"), [tg("boomSub"), `${tg("overScore")}: ${score}`]);
      } else {
        drawOverlay(valuablesLeft() ? tg("overTitle") : tg("overClear"),
          [`${tg("overScore")}: ${score}`, tg("restart") + " →"]);
      }
    }
  }

  // ===== 主循环（页面不可见时暂停计时） =====
  function loop(t) {
    const dt = Math.min((t - lastT) / 1000 || 0, 0.05);
    lastT = t;
    const sectionActive = document.getElementById("game").classList.contains("active") &&
      document.getElementById("panel-miner").classList.contains("active");
    if (sectionActive && !document.hidden) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ===== 输入 =====
  function launch() {
    if (state === "ready" || state === "over") { startGame(); return; }
    if (state !== "swing") return;
    launchAngle = angle;
    state = "extend";
  }

  canvas.addEventListener("mousedown", launch);
  canvas.addEventListener("touchstart", e => { e.preventDefault(); launch(); }, { passive: false });
  startBtn.addEventListener("click", launch);
  document.addEventListener("keydown", e => {
    if (e.code === "Space" && document.getElementById("game").classList.contains("active")) {
      e.preventDefault();
      launch();
    }
  });

  // 初始化
  startBtn.textContent = tg("start");
  spawnItems();
  requestAnimationFrame(loop);
})();
