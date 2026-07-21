/* 植物大战僵尸（网页简化版）：Canvas 手绘，10 个关卡
 * 关卡越高僵尸越多，并逐步出现撑杆 / 报纸 / 铁桶僵尸；
 * 植物随关卡解锁：寒冰射手(L2)、樱桃炸弹(L3)、食人花(L4)、窝瓜(L5)
 * 进度存档在 localStorage；依赖 main.js 的全局 currentLang，每帧重绘
 */

(function () {
  const I18N = {
    zh: {
      sun: "阳光",
      readyTitle: "植物大战僵尸",
      readySub: "种下植物，挡住僵尸的进攻！",
      readyHint: "点卡片选植物，再点草坪种下；点阳光收集",
      win: "🎉 胜利！",
      winSub: "你守住了草坪",
      allClear: "🏆 全部通关！",
      allClearSub: "你击败了所有僵尸，太强了",
      lose: "🧟 僵尸吃掉了你的脑子！",
      restart: "再来一局",
      start: "开始",
      next: "下一关",
      wave: "进度",
      level: "关卡"
    },
    en: {
      sun: "Sun",
      readyTitle: "Plants vs. Zombies",
      readySub: "Plant your defenses and stop the horde!",
      readyHint: "Pick a seed card, then click a lawn cell; click suns to collect",
      win: "🎉 Victory!",
      winSub: "The lawn is safe",
      allClear: "🏆 All levels cleared!",
      allClearSub: "You beat every zombie. Amazing!",
      lose: "🧟 The zombies ate your brains!",
      restart: "Play again",
      start: "Start",
      next: "Next level",
      wave: "Wave",
      level: "Level"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const W = 800, H = 600;
  const ROWS = 5, COLS = 9;
  const CELL_W = 80, CELL_H = 100;
  const LAWN_X = 40, LAWN_Y = 90;
  const PEA_DPS = 20;          // 豌豆单发伤害
  const MAX_LEVEL = 10;

  const PLANTS = {
    sunflower:  { cost: 50,  hp: 300,  cd: 5,  name: "向日葵" },
    peashooter: { cost: 100, hp: 300,  cd: 5,  name: "豌豆射手" },
    wallnut:    { cost: 50,  hp: 4000, cd: 8,  name: "坚果墙" },
    snowpea:    { cost: 175, hp: 300,  cd: 7,  name: "寒冰射手" },
    cherrybomb: { cost: 150, hp: 300,  cd: 18, name: "樱桃炸弹" },
    chomper:    { cost: 150, hp: 300,  cd: 8,  name: "食人花" },
    squash:     { cost: 50,  hp: 300,  cd: 10, name: "窝瓜" }
  };

  // 每关可用的卡片：1~5 关逐个解锁新植物，第 5 关起全卡池
  const LEVEL_CARDS = [
    null,
    ["sunflower", "peashooter", "wallnut"],
    ["sunflower", "peashooter", "wallnut", "snowpea"],
    ["sunflower", "peashooter", "wallnut", "snowpea", "cherrybomb"],
    ["sunflower", "peashooter", "wallnut", "snowpea", "cherrybomb", "chomper"],
    ["sunflower", "peashooter", "wallnut", "snowpea", "cherrybomb", "chomper", "squash"]
  ];
  const cardsFor = lv => LEVEL_CARDS[Math.min(lv, 5)];

  // 僵尸类型：armor 为防具值；报纸(paper)防具破碎后暴怒加速
  const ZOMBIE_TYPES = {
    normal: { hp: 200, armor: 0,   armorType: null,     speed: 12 },
    pole:   { hp: 340, armor: 0,   armorType: null,     speed: 22 },
    news:   { hp: 200, armor: 150, armorType: "paper",  speed: 10 },
    bucket: { hp: 200, armor: 900, armorType: "bucket", speed: 12 }
  };

  // 10 个关卡：出怪总数与类型配比，难度递增
  const LEVELS = [
    null,
    { total: 10, mix: [["normal", 1]] },
    { total: 12, mix: [["normal", .8], ["pole", .2]] },
    { total: 14, mix: [["normal", .7], ["pole", .15], ["news", .15]] },
    { total: 16, mix: [["normal", .6], ["pole", .15], ["news", .15], ["bucket", .1]] },
    { total: 18, mix: [["normal", .5], ["pole", .2], ["news", .2], ["bucket", .1]] },
    { total: 20, mix: [["normal", .45], ["pole", .2], ["news", .2], ["bucket", .15]] },
    { total: 22, mix: [["normal", .4], ["pole", .2], ["news", .2], ["bucket", .2]] },
    { total: 24, mix: [["normal", .35], ["pole", .2], ["news", .2], ["bucket", .25]] },
    { total: 26, mix: [["normal", .3], ["pole", .2], ["news", .2], ["bucket", .3]] },
    { total: 28, mix: [["normal", .25], ["pole", .2], ["news", .25], ["bucket", .3]] }
  ];

  const canvas = document.getElementById("pvz-canvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("pvz-start");

  // localStorage 可能在沙箱环境不可用，包一层
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const clampLv = n => Math.max(1, Math.min(MAX_LEVEL, n));

  let state = "ready";   // ready | playing | win | lose
  let unlocked = clampLv(parseInt(store.get("pvz-unlocked") || "1", 10) || 1);
  let level = clampLv(parseInt(store.get("pvz-level") || String(unlocked), 10) || unlocked);
  if (level > unlocked) level = unlocked;
  let sun = 150;
  let plants = [];       // [row][col] -> plant
  let zombies = [], peas = [], suns = [], explosions = [];
  let cards = [];        // {key, cdLeft}
  let selected = null;   // 植物 key 或 "shovel"
  let spawned = 0, killed = 0;
  let spawnTimer = 0, skySunTimer = 0;
  let hoverCell = null;
  let lastT = 0, now = 0;

  const L = () => LEVELS[level];

  function resetGrid() {
    plants = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  }

  function startGame() {
    state = "playing";
    sun = 150;
    zombies = []; peas = []; suns = []; explosions = [];
    cards = cardsFor(level).map(k => ({ key: k, cdLeft: 0 }));
    selected = null;
    spawned = 0; killed = 0;
    spawnTimer = Math.max(6, 12 - level * 0.7);   // 首只僵尸出现时间随关卡提前
    skySunTimer = 4;
    resetGrid();
  }

  // 胜利后进下一关，失败/准备状态重开当前关
  function proceed() {
    if (state === "win" && level < MAX_LEVEL) {
      level++;
      store.set("pvz-level", String(level));
    }
    startGame();
  }

  // 切换已解锁的关卡（回到准备界面）
  function changeLevel(n) {
    n = Math.max(1, Math.min(unlocked, n));
    if (n === level) return;
    level = n;
    store.set("pvz-level", String(level));
    state = "ready";
    zombies = []; peas = []; suns = []; explosions = [];
    selected = null;
    resetGrid();
  }

  // ===== 坐标辅助 =====
  const cellCX = c => LAWN_X + c * CELL_W + CELL_W / 2;
  const rowCY = r => LAWN_Y + r * CELL_H + CELL_H / 2;

  // ===== 生成 =====
  function pickType(mix) {
    let r = Math.random(), acc = 0;
    for (const [k, w] of mix) { acc += w; if (r <= acc) return k; }
    return mix[mix.length - 1][0];
  }

  function spawnZombie() {
    const type = pickType(L().mix);
    const t = ZOMBIE_TYPES[type];
    zombies.push({
      row: Math.floor(Math.random() * ROWS), x: W + 30,
      type,
      hp: t.hp, maxHp: t.hp,
      armor: t.armor, maxArmor: t.armor, armorType: t.armorType,
      speed: t.speed, slowT: 0,
      hasPole: type === "pole",
      eating: false, jumpT: 0
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

  // ===== 伤害 =====
  function hurt(z, dmg) {
    if (z.armor > 0) {
      z.armor -= dmg;
      if (z.armor <= 0 && z.armorType === "paper") z.speed = 26;  // 报纸碎了，暴怒
    } else {
      z.hp -= dmg;
    }
  }
  function instaKill(z) { z.armor = 0; z.hp = 0; }   // 樱桃/食人花/窝瓜：无视防具

  // ===== 更新 =====
  function update(dt) {
    if (state !== "playing") return;

    // 卡片冷却
    cards.forEach(c => { if (c.cdLeft > 0) c.cdLeft = Math.max(0, c.cdLeft - dt); });

    // 出怪节奏：随关卡与进度加快
    if (spawned < L().total) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnZombie();
        spawnTimer = Math.max(3, (12 - level * 0.7) - (spawned / L().total) * 5);
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

    // 爆炸特效
    explosions.forEach(e => { e.t -= dt; });
    explosions = explosions.filter(e => e.t > 0);

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
        if (p.key === "peashooter" || p.key === "snowpea") {
          const hasTarget = zombies.some(z => z.row === r && z.x > cellCX(c) && z.x < W + 40 && z.jumpT <= 0);
          if (hasTarget && p.timer <= 0) {
            peas.push({ row: r, x: cellCX(c) + 24, y: rowCY(r) - 18, ice: p.key === "snowpea" });
            p.timer = 1.5;
            p.recoil = 0.12;
          }
        }
        if (p.key === "cherrybomb") {          // 1.1 秒后 3x3 爆炸
          p.fuse -= dt;
          if (p.fuse <= 0) {
            zombies.forEach(z => {
              if (Math.abs(z.row - r) <= 1 && Math.abs(z.x - cellCX(c)) < 120) instaKill(z);
            });
            explosions.push({ x: cellCX(c), y: rowCY(r), t: 0.45 });
            plants[r][c] = null;
            continue;
          }
        }
        if (p.key === "chomper") {             // 吞掉面前第一只，咀嚼 18 秒
          if (p.chew > 0) {
            p.chew -= dt;
          } else {
            const prey = zombies.find(z => z.row === r && z.jumpT <= 0 &&
              z.x > cellCX(c) && z.x - cellCX(c) < 95);
            if (prey) { instaKill(prey); p.chew = 18; }
          }
        }
        if (p.key === "squash") {              // 僵尸靠近时跳劈，一次性
          const t = zombies.find(z => z.row === r && z.jumpT <= 0 &&
            Math.abs(z.x - cellCX(c)) < 70);
          if (t) {
            zombies.forEach(z => {
              if (z.row === r && Math.abs(z.x - cellCX(c)) < 95) instaKill(z);
            });
            explosions.push({ x: cellCX(c), y: rowCY(r), t: 0.25 });
            plants[r][c] = null;
            continue;
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
        hurt(hit, PEA_DPS);
        if (pe.ice) hit.slowT = 4;             // 寒冰豌豆：减速 4 秒
        pe.dead = true;
      }
      if (pe.x > W + 20) pe.dead = true;
    });
    peas = peas.filter(p => !p.dead);

    // 僵尸行为
    zombies.forEach(z => {
      if (z.slowT > 0) z.slowT -= dt;
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
        z.x -= z.speed * (z.slowT > 0 ? 0.5 : 1) * dt;
      }
      // 脑子被吃
      if (z.x < LAWN_X + 6) state = "lose";
    });

    // 死亡清理
    zombies = zombies.filter(z => {
      if (z.hp <= 0) { killed++; return false; }
      return true;
    });

    // 胜利判定：解锁下一关
    if (spawned === L().total && zombies.length === 0 && state === "playing") {
      state = "win";
      if (level < MAX_LEVEL && unlocked < level + 1) {
        unlocked = level + 1;
        store.set("pvz-unlocked", String(unlocked));
      }
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
    } else if (p.key === "peashooter" || p.key === "snowpea") {
      const ice = p.key === "snowpea";
      const head = ice ? "#8FD4EC" : "#6CBE52";
      const rec = (p.recoil || 0) * 30;
      ctx.strokeStyle = "#4E8C3A"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, 6); ctx.stroke();
      ctx.fillStyle = "#5DAE4A";
      ctx.beginPath(); ctx.ellipse(-8, 24, 8, 4, -0.5, 0, Math.PI * 2); ctx.fill();
      // 头
      ctx.fillStyle = head;
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-rec * 0.3, -6, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // 炮口
      ctx.fillStyle = head;
      ctx.beginPath(); ctx.roundRect(6 - rec, -12, 16, 11, 4); ctx.fill(); ctx.stroke();
      // 寒冰射手头顶的冰晶
      if (ice) {
        ctx.fillStyle = "#C9EDFA";
        ctx.beginPath();
        ctx.moveTo(-2, -19); ctx.lineTo(2, -27); ctx.lineTo(6, -19);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
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
    } else if (p.key === "cherrybomb") {
      // 引信将尽时急促闪烁膨胀
      const urgent = p.fuse !== undefined && p.fuse < 0.6 && p.fuse > 0;
      const pulse = urgent ? 1 + Math.sin(now / 40) * 0.15 : 1;
      ctx.strokeStyle = "#4E8C3A"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-7, -2); ctx.quadraticCurveTo(-3, -14, 2, -18);
      ctx.moveTo(7, 2); ctx.quadraticCurveTo(5, -10, 2, -18);
      ctx.stroke();
      ctx.save();
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#D94F3D";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-7, -1, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#E05B47";
      ctx.beginPath(); ctx.arc(7, 3, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.arc(-9, -4, 2.5, 0, Math.PI * 2); ctx.arc(5, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (p.key === "chomper") {
      // 茎
      ctx.strokeStyle = "#4E8C3A"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, 6); ctx.stroke();
      ctx.fillStyle = "#5DAE4A";
      ctx.beginPath(); ctx.ellipse(-8, 24, 8, 4, -0.5, 0, Math.PI * 2); ctx.fill();
      // 头
      ctx.fillStyle = "#A06BB8";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, -8, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (p.chew > 0) {
        // 咀嚼中：抿嘴
        ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-10, -6); ctx.quadraticCurveTo(0, -3, 10, -6); ctx.stroke();
        ctx.fillStyle = "#4A3226";
        ctx.beginPath(); ctx.arc(-5, -14, 1.8, 0, Math.PI * 2); ctx.arc(5, -14, 1.8, 0, Math.PI * 2); ctx.fill();
      } else {
        // 张嘴（朝右）+ 尖牙
        ctx.fillStyle = "#5E3372";
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.arc(0, -8, 15, -0.65, 0.65);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        for (const ty of [-13.5, -8, -2.5]) {
          ctx.beginPath();
          ctx.moveTo(9, ty - 2); ctx.lineTo(14, ty); ctx.lineTo(9, ty + 2);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "#4A3226";
        ctx.beginPath(); ctx.arc(-5, -15, 2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p.key === "squash") {
      // 窝瓜：矮胖梨形
      ctx.fillStyle = "#8FBF4E";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 6, 17, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // 瓜棱
      ctx.strokeStyle = "rgba(74,50,38,0.35)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6, -12); ctx.quadraticCurveTo(-9, 6, -5, 24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(9, 6, 5, 24); ctx.stroke();
      // 瓜蒂
      ctx.strokeStyle = "#4E8C3A"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(2, -20, 7, -21); ctx.stroke();
      // 严肃的脸
      ctx.fillStyle = "#4A3226";
      ctx.beginPath(); ctx.arc(-5, 0, 2, 0, Math.PI * 2); ctx.arc(5, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(4, 8); ctx.stroke();
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
    } else if (!(z.armorType === "paper" && z.armor > 0)) {
      // 前伸的手（拿报纸时不画）
      ctx.strokeStyle = "#A9BD9B"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-22, -4 + (z.eating ? wob : 0)); ctx.stroke();
    }
    // 铁桶
    if (z.armorType === "bucket" && z.armor > 0) {
      ctx.fillStyle = "#B9BEC6";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, -38); ctx.lineTo(11, -38);
      ctx.lineTo(8, -53); ctx.lineTo(-8, -53);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, -43); ctx.lineTo(10, -43); ctx.stroke();
    }
    // 报纸
    if (z.armorType === "paper" && z.armor > 0) {
      ctx.save();
      ctx.translate(-21, -2);
      ctx.rotate(-0.15);
      ctx.fillStyle = "#F4EFE3";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(-8, -14, 18, 26); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#A79C86"; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(-4, -8 + i * 6); ctx.lineTo(6, -8 + i * 6); ctx.stroke();
      }
      ctx.restore();
    }
    // 血条（本体 + 防具合并）
    const frac = (z.hp + Math.max(0, z.armor)) / (z.maxHp + z.maxArmor);
    ctx.fillStyle = "rgba(74,50,38,0.3)";
    ctx.fillRect(-14, -58, 28, 4);
    ctx.fillStyle = "#D95550";
    ctx.fillRect(-14, -58, 28 * Math.max(0, frac), 4);
    // 减速冰冻效果
    if (z.slowT > 0) {
      ctx.fillStyle = "rgba(140, 200, 235, 0.35)";
      ctx.beginPath(); ctx.roundRect(-13, -46, 28, 84, 8); ctx.fill();
    }
    ctx.restore();
  }

  function drawCard(card, i) {
    const x = 200 + i * 68, y = 8, w = 60, h = 74;
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
    drawPlant({ key: card.key, hp: PLANTS[card.key].hp, chew: 0 }, 0, 0);
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

  // 关卡切换箭头（仅非进行中可点）
  function drawLevelNav() {
    const canPrev = level > 1;
    const canNext = level < unlocked;
    ctx.font = "22px 'ZCOOL KuaiLe', sans-serif";
    ctx.textAlign = "center";
    for (const [bx, arrow, can] of [[12, "‹", canPrev], [148, "›", canNext]]) {
      ctx.fillStyle = "#FFF7EF";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx, 52, 32, 32, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = can ? "#4A3226" : "#C9BBA8";
      ctx.fillText(arrow, bx + 16, 77);
    }
    ctx.font = "16px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.fillStyle = "#4A3226";
    ctx.fillText(`${tp("level")} ${level}/${MAX_LEVEL}`, 96, 74);
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

    // 关卡导航
    drawLevelNav();

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

    // 豌豆（寒冰豌豆为冰蓝色）
    peas.forEach(p => {
      ctx.fillStyle = p.ice ? "#9BDCF0" : "#6CBE52";
      ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // 僵尸
    zombies.forEach(drawZombie);

    // 爆炸特效
    explosions.forEach(e => {
      const k = 1 - e.t / 0.45;
      ctx.fillStyle = `rgba(240, 140, 60, ${0.55 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, 40 + k * 90, 0, Math.PI * 2); ctx.fill();
    });

    // 阳光
    suns.forEach(s => drawSunShape(s.x, s.y, 15));

    // 击杀进度（右下角小胶囊，避免与卡片挤占顶栏）
    ctx.fillStyle = "rgba(255, 247, 239, 0.85)";
    ctx.strokeStyle = "#4A3226"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(W - 158, H - 38, 142, 28, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#4A3226";
    ctx.font = "16px 'ZCOOL KuaiLe', 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${tp("wave")}: ${killed}/${L().total}`, W - 87, H - 19);

    // 遮罩
    if (state === "ready") {
      drawOverlay(`${tp("readyTitle")} · ${tp("level")} ${level}`, [tp("readySub"), tp("readyHint")]);
    } else if (state === "win") {
      if (level < MAX_LEVEL) {
        drawOverlay(tp("win"), [tp("winSub"), tp("next") + " →"]);
      } else {
        drawOverlay(tp("allClear"), [tp("allClearSub"), tp("restart") + " →"]);
      }
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
    const { x, y } = canvasPos(e);

    // 关卡切换箭头（准备/胜利/失败时可用）
    if (state !== "playing" && y >= 52 && y <= 84) {
      if (x >= 12 && x <= 44) { changeLevel(level - 1); return; }
      if (x >= 148 && x <= 180) { changeLevel(level + 1); return; }
    }
    if (state !== "playing") { proceed(); return; }

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
        const cx = 200 + i * 68;
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
        plants[r][c] = {
          key: selected, hp: info.hp,
          timer: selected === "sunflower" ? 5 : 0,
          fuse: selected === "cherrybomb" ? 1.1 : 0,
          chew: 0
        };
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
    proceed();
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
    // 按钮文案跟随状态与语言
    startBtn.textContent = state === "win" && level < MAX_LEVEL ? tp("next")
      : state === "playing" ? tp("restart") : tp("start");
    requestAnimationFrame(loop);
  }

  resetGrid();
  cards = cardsFor(level).map(k => ({ key: k, cdLeft: 0 }));
  requestAnimationFrame(loop);
})();
