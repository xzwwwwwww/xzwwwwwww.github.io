/* 植物大战僵尸（网页简化版）：Canvas 手绘，设定参照用户的 C++ 课程作业
 * 5行x9列 / 向日葵50·豌豆射手100·坚果墙50 / 普通僵尸200·撑杆340
 * 依赖 main.js 的全局 currentLang；每帧重绘，语言切换即时生效
 */

(function () {
  const I18N = {
    zh: {
      sun: "阳光",
      readyTitle: "植物大战僵尸",
      readySub: "种下植物，挡住 15 只僵尸的进攻！",
      readyHint: "点卡片选植物，再点草坪种下；点阳光收集",
      win: "🎉 胜利！",
      winSub: "你守住了草坪",
      lose: "🧟 僵尸吃掉了你的脑子！",
      restart: "再来一局",
      start: "开始",
      wave: "进度"
    },
    en: {
      sun: "Sun",
      readyTitle: "Plants vs. Zombies",
      readySub: "Plant your defenses and stop 15 zombies!",
      readyHint: "Pick a seed card, then click a lawn cell; click suns to collect",
      win: "🎉 Victory!",
      winSub: "The lawn is safe",
      lose: "🧟 The zombies ate your brains!",
      restart: "Play again",
      start: "Start",
      wave: "Wave"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const W = 800, H = 600;
  const ROWS = 5, COLS = 9;
  const CELL_W = 80, CELL_H = 100;
  const LAWN_X = 40, LAWN_Y = 90;
  const PEA_DPS = 20;          // 豌豆单发伤害
  const ZOMBIE_TOTAL = 15;     // 总出怪数

  const PLANTS = {
    sunflower: { cost: 50, hp: 300, cd: 5, name: "向日葵" },
    peashooter: { cost: 100, hp: 300, cd: 5, name: "豌豆射手" },
    wallnut: { cost: 50, hp: 4000, cd: 8, name: "坚果墙" }
  };
  const CARD_ORDER = ["sunflower", "peashooter", "wallnut"];

  const canvas = document.getElementById("pvz-canvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("pvz-start");

  let state = "ready";   // ready | playing | win | lose
  let sun = 150;
  let plants = [];       // [row][col] -> plant
  let zombies = [], peas = [], suns = [];
  let cards = [];        // {key, cdLeft}
  let selected = null;   // 植物 key 或 "shovel"
  let spawned = 0, killed = 0;
  let spawnTimer = 0, skySunTimer = 0;
  let hoverCell = null;
  let lastT = 0, now = 0;

  function resetGrid() {
    plants = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  }

  function startGame() {
    state = "playing";
    sun = 150;
    zombies = []; peas = []; suns = [];
    cards = CARD_ORDER.map(k => ({ key: k, cdLeft: 0 }));
    selected = null;
    spawned = 0; killed = 0;
    spawnTimer = 12;         // 首只僵尸 12 秒后出现
    skySunTimer = 4;
    resetGrid();
    startBtn.textContent = tp("restart");
  }

  // ===== 坐标辅助 =====
  const cellCX = c => LAWN_X + c * CELL_W + CELL_W / 2;
  const rowCY = r => LAWN_Y + r * CELL_H + CELL_H / 2;

  // ===== 生成 =====
  function spawnZombie() {
    const row = Math.floor(Math.random() * ROWS);
    const isPole = spawned >= ZOMBIE_TOTAL - 3;   // 最后 3 只是撑杆
    zombies.push({
      row, x: W + 30,
      hp: isPole ? 340 : 200,
      maxHp: isPole ? 340 : 200,
      type: isPole ? "pole" : "normal",
      speed: isPole ? 22 : 12,
      hasPole: isPole,
      eating: false,
      jumpT: 0
    });
    spawned++;
  }

  function dropSun(fromSky, x, y) {
    suns.push({
      x: fromSky ? x : x + (Math.random() * 40 - 20),
      y: fromSky ? -20 : y,
      targetY: fromSky ? LAWN_Y + 40 + Math.random() * (H - LAWN_Y - 80) : y + 28,
      vy: fromSky ? 40 : 60,
      life: 12,
      settled: !fromSky
    });
  }

  // ===== 更新 =====
  function update(dt) {
    if (state !== "playing") return;

    // 卡片冷却
    cards.forEach(c => { if (c.cdLeft > 0) c.cdLeft = Math.max(0, c.cdLeft - dt); });

    // 出怪节奏：间隔从 12s 缩到 4s
    if (spawned < ZOMBIE_TOTAL) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnZombie();
        spawnTimer = 12 - (spawned / ZOMBIE_TOTAL) * 8;
      }
    }

    // 天上掉阳光
    skySunTimer -= dt;
    if (skySunTimer <= 0) {
      dropSun(true, 80 + Math.random() * (W - 160), 0);
      skySunTimer = 8;
    }

    // 阳光落地与过期
    suns.forEach(s => {
      if (s.y < s.targetY) s.y = Math.min(s.targetY, s.y + s.vy * dt);
      else { s.life -= dt; }
    });
    suns = suns.filter(s => s.life > 0);

    // 植物行为
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = plants[r][c];
        if (!p) continue;
        p.timer -= dt;
        if (p.key === "sunflower" && p.timer <= 0) {
          dropSun(false, cellCX(c), rowCY(r) - 20);
          p.timer = 12;
        }
        if (p.key === "peashooter") {
          const hasTarget = zombies.some(z => z.row === r && z.x > cellCX(c) && z.x < W + 40 && z.jumpT <= 0);
          if (hasTarget && p.timer <= 0) {
            peas.push({ row: r, x: cellCX(c) + 24, y: rowCY(r) - 18 });
            p.timer = 1.5;
            p.recoil = 0.12;
          }
        }
        if (p.recoil) p.recoil = Math.max(0, p.recoil - dt);
      }
    }

    // 豌豆飞行与命中
    peas.forEach(pe => {
      pe.x += 220 * dt;
      const hit = zombies.find(z => z.row === pe.row && z.jumpT <= 0 &&
        pe.x > z.x - 14 && pe.x < z.x + 20);
      if (hit) {
        hit.hp -= PEA_DPS;
        pe.dead = true;
      }
      if (pe.x > W + 20) pe.dead = true;
    });
    peas = peas.filter(p => !p.dead);

    // 僵尸行为
    zombies.forEach(z => {
      // 撑杆跳跃中（约 91px，保证越过 80px 的格子）
      if (z.jumpT > 0) {
        z.jumpT -= dt;
        z.x -= 130 * dt;
        return;
      }
      // 面前是否有植物
      const col = Math.floor((z.x - 20 - LAWN_X) / CELL_W);
      const target = (col >= 0 && col < COLS) ? plants[z.row][col] : null;
      if (target) {
        if (z.hasPole) {          // 撑杆：跳过第一棵植物
          z.hasPole = false;
          z.jumpT = 0.7;
          z.eating = false;
          return;
        }
        z.eating = true;
        target.hp -= 40 * dt;     // 啃食
        if (target.hp <= 0) {
          plants[z.row][col] = null;
          z.eating = false;
        }
      } else {
        z.eating = false;
        z.x -= z.speed * dt;
      }
      // 脑子被吃
      if (z.x < LAWN_X + 6) state = "lose";
    });

    // 死亡清理
    zombies = zombies.filter(z => {
      if (z.hp <= 0) { killed++; return false; }
      return true;
    });

    // 胜利判定
    if (spawned === ZOMBIE_TOTAL && zombies.length === 0 && state === "playing") {
      state = "win";
    }
  }

  // ===== 绘制 =====
  function drawSunShape(x, y, r) {
    const pulse = 1 + Math.sin(now / 300) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#FFD94D";
    ctx.strokeStyle = "#D99A2B";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawPlant(p, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    if (p.key === "sunflower") {
      // 茎叶
      ctx.strokeStyle = "#4E8C3A"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, 8); ctx.stroke();
      ctx.fillStyle = "#5DAE4A";
      ctx.beginPath(); ctx.ellipse(-8, 22, 8, 4, -0.5, 0, Math.PI * 2); ctx.fill();
      // 花瓣
      ctx.fillStyle = "#FFD94D";
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + Math.sin(now / 500) * 0.05;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 15, -8 + Math.sin(a) * 15, 7, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      // 脸
      ctx.fillStyle = "#8A5A2B";
      ctx.beginPath(); ctx.arc(0, -8, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4A3226";
      ctx.beginPath(); ctx.arc(-4, -10, 1.6, 0, Math.PI * 2); ctx.arc(4, -10, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -6, 4, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    } else if (p.key === "peashooter") {
      const rec = (p.recoil || 0) * 30;
      ctx.strokeStyle = "#4E8C3A"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, 6); ctx.stroke();
      ctx.fillStyle = "#5DAE4A";
      ctx.beginPath(); ctx.ellipse(-8, 24, 8, 4, -0.5, 0, Math.PI * 2); ctx.fill();
      // 头
      ctx.fillStyle = "#6CBE52";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-rec * 0.3, -6, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // 炮口
      ctx.fillStyle = "#6CBE52";
      ctx.beginPath(); ctx.roundRect(6 - rec, -12, 16, 11, 4); ctx.fill(); ctx.stroke();
      // 眼
      ctx.fillStyle = "#4A3226";
      ctx.beginPath(); ctx.arc(-3 - rec * 0.3, -10, 2, 0, Math.PI * 2); ctx.fill();
    } else if (p.key === "wallnut") {
      ctx.fillStyle = "#B98A4E";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 2, 20, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.ellipse(-6, -10, 6, 9, -0.4, 0, Math.PI * 2); ctx.fill();
      // 受伤裂纹
      if (p.hp < 2600) {
        ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(2, -2); ctx.lineTo(-4, 8); ctx.stroke();
      }
      if (p.hp < 1200) {
        ctx.beginPath(); ctx.moveTo(8, -18); ctx.lineTo(4, -4); ctx.lineTo(10, 10); ctx.stroke();
      }
      // 眼睛（委屈）
      ctx.fillStyle = "#4A3226";
      ctx.beginPath(); ctx.arc(-6, -4, 2, 0, Math.PI * 2); ctx.arc(6, -4, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawZombie(z) {
    const y = rowCY(z.row);
    const wob = Math.sin(now / 180 + z.x / 30) * 3;
    ctx.save();
    ctx.translate(z.x, y + (z.jumpT > 0 ? -40 * Math.sin((z.jumpT / 0.7) * Math.PI) : 0));
    // 腿
    ctx.strokeStyle = "#5F7057"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, 20); ctx.lineTo(-4 + wob, 34);
    ctx.moveTo(5, 20); ctx.lineTo(5 - wob, 34);
    ctx.stroke();
    // 身体
    ctx.fillStyle = z.type === "pole" ? "#A8927C" : "#8FA382";
    ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(-11, -22, 24, 44, 8); ctx.fill(); ctx.stroke();
    // 头
    ctx.fillStyle = "#A9BD9B";
    ctx.beginPath(); ctx.arc(0, -32, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 眼睛
    ctx.fillStyle = "#D95550";
    ctx.beginPath(); ctx.arc(-5, -34, 2, 0, Math.PI * 2); ctx.arc(4, -34, 2, 0, Math.PI * 2); ctx.fill();
    // 撑杆
    if (z.hasPole) {
      ctx.strokeStyle = "#8A5A2B"; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(14, -50); ctx.lineTo(-6, 30); ctx.stroke();
    } else {
      // 前伸的手
      ctx.strokeStyle = "#A9BD9B"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-22, -4 + (z.eating ? wob : 0)); ctx.stroke();
    }
    // 血条
    ctx.fillStyle = "rgba(74,50,38,0.3)";
    ctx.fillRect(-14, -52, 28, 4);
    ctx.fillStyle = "#D95550";
    ctx.fillRect(-14, -52, 28 * Math.max(0, z.hp / z.maxHp), 4);
    ctx.restore();
  }

  function drawCard(card, i) {
    const x = 130 + i * 68, y = 8, w = 60, h = 74;
    const info = PLANTS[card.key];
    const affordable = sun >= info.cost;
    ctx.save();
    ctx.fillStyle = affordable ? "#FFF7EF" : "#E8DCCB";
    ctx.strokeStyle = selected === card.key ? "#D99A2B" : "#4A3226";
    ctx.lineWidth = selected === card.key ? 3.5 : 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
    // 迷你植物图
    ctx.save();
    ctx.translate(x + w / 2, y + 34);
    ctx.scale(0.62, 0.62);
    drawPlant({ key: card.key, hp: PLANTS[card.key].hp }, 0, 0);
    ctx.restore();
    // 价格
    ctx.fillStyle = affordable ? "#4A3226" : "#A0785F";
    ctx.font = "14px 'ZCOOL KuaiLe', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(info.cost, x + w / 2, y + h - 6);
    // 冷却遮罩
    if (card.cdLeft > 0) {
      ctx.fillStyle = "rgba(74,50,38,0.45)";
      const ch = h * (card.cdLeft / PLANTS[card.key].cd);
      ctx.fillRect(x, y, w, ch);
    }
    ctx.restore();
  }

  function drawOverlay(title, lines) {
    ctx.fillStyle = "rgba(74, 50, 38, 0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFF7EF";
    ctx.strokeStyle = "#4A3226";
    ctx.lineWidth = 3;
    const bw = 460, bh = 200, bx = (W - bw) / 2, by = (H - bh) / 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#4A3226";
    ctx.font = "34px 'ZCOOL KuaiLe', sans-serif";
    ctx.fillText(title, W / 2, by + 62);
    ctx.font = "17px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillStyle = "#A0785F";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 106 + i * 30));
  }

  function draw() {
    // 顶栏
    ctx.fillStyle = "#FFF3E4";
    ctx.fillRect(0, 0, W, LAWN_Y);
    ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, LAWN_Y); ctx.lineTo(W, LAWN_Y); ctx.stroke();

    // 阳光计数
    drawSunShape(34, 34, 16);
    ctx.fillStyle = "#4A3226";
    ctx.font = "20px 'ZCOOL KuaiLe', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${tp("sun")}: ${sun}`, 60, 42);

    // 进度
    ctx.textAlign = "right";
    ctx.fillText(`${tp("wave")}: ${Math.min(killed + (state === "playing" ? 0 : 0), ZOMBIE_TOTAL)}/${ZOMBIE_TOTAL}`, W - 100, 42);

    // 卡片
    cards.forEach((c, i) => drawCard(c, i));

    // 铲子
    const shx = W - 78, shy = 8;
    ctx.fillStyle = "#FFF7EF";
    ctx.strokeStyle = selected === "shovel" ? "#D99A2B" : "#4A3226";
    ctx.lineWidth = selected === "shovel" ? 3.5 : 2;
    ctx.beginPath(); ctx.roundRect(shx, shy, 60, 74, 10); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#8A5A2B"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(shx + 20, shy + 20); ctx.lineTo(shx + 38, shy + 44); ctx.stroke();
    ctx.fillStyle = "#9A9A9A";
    ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(shx + 30, shy + 40, 20, 20, 5); ctx.fill(); ctx.stroke();

    // 草坪
    for (let r = 0; r < ROWS; r++) {
      ctx.fillStyle = r % 2 ? "#AED695" : "#BFE3A8";
      ctx.fillRect(LAWN_X, LAWN_Y + r * CELL_H, COLS * CELL_W, CELL_H);
    }
    ctx.strokeStyle = "rgba(74,50,38,0.15)"; ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(LAWN_X + c * CELL_W, LAWN_Y);
      ctx.lineTo(LAWN_X + c * CELL_W, LAWN_Y + ROWS * CELL_H);
      ctx.stroke();
    }

    // 悬停高亮
    if (selected && hoverCell && state === "playing") {
      ctx.fillStyle = "rgba(255, 247, 239, 0.45)";
      ctx.fillRect(LAWN_X + hoverCell.c * CELL_W, LAWN_Y + hoverCell.r * CELL_H, CELL_W, CELL_H);
    }

    // 植物
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (plants[r][c]) drawPlant(plants[r][c], cellCX(c), rowCY(r));

    // 豌豆
    peas.forEach(p => {
      ctx.fillStyle = "#6CBE52";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // 僵尸
    zombies.forEach(drawZombie);

    // 阳光
    suns.forEach(s => drawSunShape(s.x, s.y, 15));

    // 遮罩
    if (state === "ready") {
      drawOverlay(tp("readyTitle"), [tp("readySub"), tp("readyHint")]);
    } else if (state === "win") {
      drawOverlay(tp("win"), [tp("winSub"), tp("restart") + " →"]);
    } else if (state === "lose") {
      drawOverlay(tp("lose"), [tp("restart") + " →"]);
    }
  }

  // ===== 输入 =====
  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: (p.clientX - rect.left) * (W / rect.width),
      y: (p.clientY - rect.top) * (H / rect.height)
    };
  }

  function onTap(e) {
    e.preventDefault();
    if (state === "ready" || state === "win" || state === "lose") { startGame(); return; }
    const { x, y } = canvasPos(e);

    // 点阳光
    for (const s of suns) {
      if (Math.hypot(s.x - x, s.y - y) < 24) {
        sun += 25;
        suns = suns.filter(v => v !== s);
        return;
      }
    }
    // 点卡片
    if (y < LAWN_Y) {
      for (let i = 0; i < cards.length; i++) {
        const cx = 130 + i * 68;
        if (x >= cx && x <= cx + 60 && y >= 8 && y <= 82) {
          const card = cards[i];
          if (card.cdLeft <= 0 && sun >= PLANTS[card.key].cost) {
            selected = selected === card.key ? null : card.key;
          }
          return;
        }
      }
      if (x >= W - 78 && x <= W - 18 && y >= 8 && y <= 82) {
        selected = selected === "shovel" ? null : "shovel";
        return;
      }
      return;
    }
    // 点草坪
    const c = Math.floor((x - LAWN_X) / CELL_W);
    const r = Math.floor((y - LAWN_Y) / CELL_H);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (selected === "shovel") {
      plants[r][c] = null;
      selected = null;
      return;
    }
    if (selected && !plants[r][c]) {
      const info = PLANTS[selected];
      if (sun >= info.cost) {
        plants[r][c] = { key: selected, hp: info.hp, timer: selected === "sunflower" ? 5 : 0 };
        sun -= info.cost;
        cards.find(cd => cd.key === selected).cdLeft = info.cd;
        selected = null;
      }
    }
  }

  canvas.addEventListener("mousedown", onTap);
  canvas.addEventListener("touchstart", onTap, { passive: false });
  canvas.addEventListener("mousemove", e => {
    const { x, y } = canvasPos(e);
    const c = Math.floor((x - LAWN_X) / CELL_W);
    const r = Math.floor((y - LAWN_Y) / CELL_H);
    hoverCell = (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? { r, c } : null;
  });
  startBtn.addEventListener("click", () => {
    if (state === "playing") return;
    startGame();
  });

  // ===== 主循环（页面/标签不可见时暂停） =====
  function visible() {
    return document.getElementById("game").classList.contains("active") &&
           document.getElementById("panel-pvz").classList.contains("active") &&
           !document.hidden;
  }

  function loop(t) {
    now = t;
    const dt = Math.min((t - lastT) / 1000 || 0, 0.05);
    lastT = t;
    if (visible()) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resetGrid();
  startBtn.textContent = tp("start");
  requestAnimationFrame(loop);
})();
