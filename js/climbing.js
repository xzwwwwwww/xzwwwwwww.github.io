/* 攀岩小游戏：Klifur 式四肢攀爬解谜，共 20 关
 * 点击手/脚选中 → 点击可达范围内的高亮岩点移动；任意一只手抓到顶部金色终点即过关
 * 通关解锁下一关，进度存 localStorage（climbProgress）
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 * 关卡坐标用 0-100 相对坐标（y 向下，0 在顶部），reach 为像素臂展（画布 480x600）
 * 岩点类型：0 普通 / 1 小岩点 / 2 易碎（离开后碎裂） / 3 终点
 * 注意：CLIMB_LEVELS 必须是合法 JSON（带引号的键、无尾逗号），离线求解脚本会直接解析它
 */

const CLIMB_LEVELS = [
  {"reach": 150, "par": 11, "start": [0, 1, 2, 3],
   "hint": {"zh": "点击手或脚选中，再点亮的岩点移动；任意一只手抓到金色岩点即过关", "en": "Click a hand or foot, then a glowing hold to move. Get either hand to the gold hold!"},
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 74, 0], [65, 74, 0], [35, 62, 0], [65, 62, 0], [35, 50, 0], [65, 50, 0],
     [35, 38, 0], [65, 38, 0], [35, 26, 0], [65, 26, 0], [35, 14, 0], [65, 14, 0],
     [50, 5, 3]]},
  {"reach": 145, "par": 13, "start": [0, 1, 2, 3],
   "hint": {"zh": "脚可以踩到手刚才抓过的岩点上，一步一步往上挪", "en": "Feet can step onto holds your hands just left. Move up step by step."},
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 74, 0], [65, 74, 0], [35, 62, 0], [65, 62, 0], [35, 50, 0], [65, 50, 0],
     [35, 38, 0], [65, 38, 0], [35, 26, 0], [65, 26, 0], [35, 14, 0], [65, 14, 0],
     [50, 5, 3]]},
  {"reach": 142, "par": 14, "start": [0, 1, 2, 3],
   "hint": {"zh": "带裂纹的是易碎岩点：肢体离开它之后就会碎裂消失", "en": "Cracked holds are fragile: they crumble once a limb leaves them."},
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 74, 0], [65, 74, 0], [35, 62, 0], [65, 62, 0], [35, 50, 0], [65, 50, 0],
     [35, 38, 2], [65, 38, 0], [35, 26, 0], [65, 26, 0], [35, 14, 0], [65, 14, 0],
     [50, 5, 3]]},
  {"reach": 135, "par": 12, "start": [0, 1, 2, 3],
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 75, 0], [65, 75, 0], [43, 64, 0], [57, 64, 0], [35, 53, 0], [65, 53, 0],
     [43, 42, 0], [57, 42, 0], [35, 31, 0], [65, 31, 0], [40, 20, 0], [60, 20, 0], [50, 8, 3]]},
  {"reach": 132, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 74, 0], [65, 74, 0], [35, 63, 1], [65, 63, 1], [35, 52, 0], [65, 52, 0],
     [35, 41, 1], [65, 41, 1], [35, 30, 0], [65, 30, 0], [35, 19, 0], [65, 19, 0],
     [50, 7, 3]]},
  {"reach": 130, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 74, 0], [65, 74, 0], [35, 63, 2], [65, 63, 0], [35, 52, 0], [65, 52, 0],
     [35, 41, 0], [65, 41, 2], [35, 30, 0], [65, 30, 0], [35, 19, 0], [65, 19, 0],
     [50, 7, 3]]},
  {"reach": 130, "par": 13, "start": [0, 1, 2, 3],
   "holds": [[38, 86, 0], [62, 86, 0], [40, 94, 0], [60, 94, 0],
     [38, 74, 0], [62, 74, 0], [38, 61, 0], [62, 61, 0], [38, 48, 0], [62, 48, 0],
     [38, 35, 0], [62, 35, 0], [38, 22, 0], [62, 22, 0], [50, 9, 3]]},
  {"reach": 128, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[33, 86, 0], [67, 86, 0], [36, 94, 0], [64, 94, 0],
     [33, 75, 0], [67, 75, 0], [33, 64, 0], [67, 64, 0], [33, 53, 0], [67, 53, 0],
     [33, 42, 0], [67, 42, 0], [33, 31, 0], [67, 31, 0], [33, 20, 0], [67, 20, 0],
     [50, 8, 3]]},
  {"reach": 126, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 75, 2], [65, 75, 0], [35, 64, 0], [65, 64, 2], [35, 53, 2], [65, 53, 0],
     [35, 42, 0], [65, 42, 2], [35, 31, 0], [65, 31, 0], [40, 20, 0], [60, 20, 0], [50, 8, 3]]},
  {"reach": 126, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 74, 0], [65, 74, 0], [35, 63, 2], [65, 63, 2], [35, 52, 0], [65, 52, 0],
     [35, 41, 2], [65, 41, 2], [35, 30, 0], [65, 30, 0], [35, 19, 0], [65, 19, 0],
     [50, 7, 3]]},
  {"reach": 124, "par": 16, "start": [0, 1, 2, 3],
   "holds": [[33, 86, 0], [67, 86, 0], [36, 94, 0], [64, 94, 0],
     [33, 76, 0], [67, 76, 0], [33, 66, 0], [67, 66, 0], [33, 56, 0], [67, 56, 0],
     [33, 46, 0], [67, 46, 0], [33, 36, 0], [67, 36, 0], [33, 26, 0], [67, 26, 0],
     [33, 16, 0], [67, 16, 0], [50, 6, 3]]},
  {"reach": 124, "par": 16, "start": [0, 1, 2, 3],
   "holds": [[35, 86, 0], [65, 86, 0], [38, 94, 0], [62, 94, 0],
     [35, 74, 1], [65, 74, 1], [35, 63, 0], [65, 63, 0], [35, 52, 1], [65, 52, 1],
     [35, 41, 0], [65, 41, 0], [35, 30, 1], [65, 30, 1], [35, 19, 0], [65, 19, 0],
     [50, 7, 3]]},
  {"reach": 122, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[40, 86, 0], [60, 86, 0], [42, 94, 0], [58, 94, 0],
     [40, 75, 0], [60, 75, 0], [40, 64, 2], [60, 64, 0], [40, 53, 0], [60, 53, 2],
     [40, 42, 2], [60, 42, 0], [40, 31, 0], [60, 31, 0], [42, 20, 0], [58, 20, 0], [50, 8, 3]]},
  {"reach": 122, "par": 16, "start": [0, 1, 2, 3],
   "holds": [[33, 86, 0], [67, 86, 0], [36, 94, 0], [64, 94, 0],
     [33, 76, 0], [67, 76, 0], [33, 66, 0], [67, 66, 0], [33, 56, 0], [67, 56, 0],
     [33, 46, 0], [67, 46, 0], [33, 36, 0], [67, 36, 0], [33, 26, 0], [67, 26, 0],
     [33, 16, 0], [67, 16, 0], [50, 7, 3]]},
  {"reach": 120, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[40, 86, 0], [60, 86, 0], [42, 94, 0], [58, 94, 0],
     [40, 75, 1], [60, 75, 1], [40, 64, 0], [60, 64, 0], [40, 53, 1], [60, 53, 1],
     [40, 42, 0], [60, 42, 0], [40, 31, 1], [60, 31, 1], [42, 20, 0], [58, 20, 0], [50, 8, 3]]},
  {"reach": 120, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[40, 86, 0], [60, 86, 0], [42, 94, 0], [58, 94, 0],
     [40, 75, 0], [60, 75, 0], [44, 64, 0], [56, 64, 0], [40, 53, 2], [60, 53, 0],
     [44, 42, 0], [56, 42, 0], [40, 31, 0], [60, 31, 0], [42, 20, 0], [58, 20, 0], [50, 8, 3]]},
  {"reach": 118, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[40, 86, 0], [60, 86, 0], [42, 94, 0], [58, 94, 0],
     [40, 75, 0], [60, 75, 0], [40, 64, 0], [60, 64, 2], [40, 53, 2], [60, 53, 0],
     [40, 42, 0], [60, 42, 0], [40, 31, 2], [60, 31, 0], [40, 20, 0], [60, 20, 0],
     [50, 8, 3]]},
  {"reach": 118, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[40, 86, 0], [60, 86, 0], [42, 94, 0], [58, 94, 0],
     [40, 75, 1], [60, 75, 1], [40, 64, 0], [60, 64, 2], [40, 53, 1], [60, 53, 0],
     [40, 42, 2], [60, 42, 0], [40, 31, 0], [60, 31, 1], [42, 20, 0], [58, 20, 0], [50, 8, 3]]},
  {"reach": 116, "par": 15, "start": [0, 1, 2, 3],
   "holds": [[40, 86, 0], [60, 86, 0], [42, 94, 0], [58, 94, 0],
     [40, 75, 0], [60, 75, 0], [40, 64, 2], [60, 64, 2], [40, 53, 0], [60, 53, 0],
     [40, 42, 2], [60, 42, 2], [40, 31, 0], [60, 31, 0], [40, 20, 2], [60, 20, 2],
     [50, 7, 3]]},
  {"reach": 116, "par": 16, "start": [0, 1, 2, 3],
   "holds": [[40, 86, 0], [60, 86, 0], [42, 94, 0], [58, 94, 0],
     [40, 75, 0], [60, 75, 0], [40, 64, 2], [60, 64, 1], [40, 53, 1], [60, 53, 2],
     [40, 42, 0], [60, 42, 0], [40, 31, 2], [60, 31, 0], [42, 20, 0], [58, 20, 0],
     [40, 12, 0], [60, 12, 0], [50, 4, 3]]}
];

(function () {
  const I18N = {
    zh: {
      level: "第 {n} 关",
      moves: "步数 {n}",
      par: "参考 {n}",
      cleared: "🎉 过关！用了 {n} 步",
      allClear: "🏆 恭喜，20 关全部通关！",
      reset: "重置本关",
      next: "下一关",
      outOfReach: "已达最大臂展",
      occupied: "这个岩点被占着",
      selectFirst: "先点选一个手或脚"
    },
    en: {
      level: "Level {n}",
      moves: "Moves {n}",
      par: "Par {n}",
      cleared: "🎉 Cleared in {n} moves!",
      allClear: "🏆 All 20 levels cleared!",
      reset: "Reset",
      next: "Next level",
      outOfReach: "Out of reach",
      occupied: "Hold occupied",
      selectFirst: "Select a hand or foot first"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const W = 480, H = 600;
  const X = x => x / 100 * W, Y = y => y / 100 * H;
  const TOTAL = CLIMB_LEVELS.length;
  const EPS = 0.5;

  const levelsEl = document.getElementById("climb-levels");
  const levelLabelEl = document.getElementById("climb-level-label");
  const movesEl = document.getElementById("climb-moves");
  const parEl = document.getElementById("climb-par");
  const hintEl = document.getElementById("climb-hint");
  const statusEl = document.getElementById("climb-status");
  const resetBtn = document.getElementById("climb-reset");
  const nextBtn = document.getElementById("climb-next");
  const canvas = document.getElementById("climb-canvas");
  const ctx = canvas.getContext("2d");

  // ===== 进度 =====
  function loadProg() {
    try {
      const p = JSON.parse(localStorage.getItem("climbProgress"));
      if (p && p.unlocked >= 1) return { unlocked: Math.min(TOTAL, p.unlocked), cleared: p.cleared || [] };
    } catch (e) {}
    return { unlocked: 1, cleared: [] };
  }
  function saveProg() {
    try { localStorage.setItem("climbProgress", JSON.stringify(prog)); } catch (e) {}
  }
  const prog = loadProg();

  // ===== 游戏状态 =====
  let level = Math.min(prog.unlocked, TOTAL);   // 当前关（1 起）
  let limbs = [];        // 4 个肢体锚定的岩点下标：0 左手 1 右手 2 左脚 3 右脚
  let destroyed = new Set();
  let steps = 0;
  let selected = -1;
  let cleared = false;
  let anim = null;       // { limb, from, to, t0, dur }

  const lv = () => CLIMB_LEVELS[level - 1];
  const holdPx = i => ({ x: X(lv().holds[i][0]), y: Y(lv().holds[i][1]) });
  const holdType = i => lv().holds[i][2] || 0;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // 肢体端点当前位置（动画中取插值）
  function limbPos(i) {
    if (anim && anim.limb === i) {
      const t = Math.min(1, (performance.now() - anim.t0) / anim.dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return { x: anim.from.x + (anim.to.x - anim.from.x) * e,
               y: anim.from.y + (anim.to.y - anim.from.y) * e };
    }
    return holdPx(limbs[i]);
  }
  // 逻辑重心 = 四肢锚点平均（判断臂展用）
  function centerOf(arr) {
    let x = 0, y = 0;
    arr.forEach(i => { const p = holdPx(i); x += p.x; y += p.y; });
    return { x: x / arr.length, y: y / arr.length };
  }

  function canMove(limb, target) {
    if (limbs.includes(target) || destroyed.has(target)) return false;
    const R = lv().reach;
    const c = centerOf(limbs);
    if (dist(holdPx(target), c) > R + EPS) return false;
    const next = limbs.slice();
    next[limb] = target;
    const c2 = centerOf(next);
    return next.every(i => dist(holdPx(i), c2) <= R + EPS);
  }

  function doMove(limb, target) {
    const from = holdPx(limbs[limb]);
    const to = holdPx(target);
    if (holdType(limbs[limb]) === 2) destroyed.add(limbs[limb]);   // 易碎岩点碎裂
    limbs[limb] = target;
    steps++;
    anim = { limb, from, to, t0: performance.now(), dur: 220 };
    if ((limb === 0 || limb === 1) && holdType(target) === 3) onCleared();
    updateBar();
  }

  function onCleared() {
    cleared = true;
    selected = -1;
    statusEl.textContent = tp("cleared").replace("{n}", steps);
    statusEl.className = "inbox-status";
    if (!prog.cleared.includes(level)) prog.cleared.push(level);
    if (level === prog.unlocked && prog.unlocked < TOTAL) prog.unlocked++;
    saveProg();
    if (level >= TOTAL) {
      nextBtn.textContent = tp("allClear");
      nextBtn.disabled = true;
    } else {
      nextBtn.textContent = tp("next");
      nextBtn.disabled = false;
    }
    nextBtn.classList.remove("hidden");
    renderLevels();
  }

  // ===== UI =====
  function updateBar() {
    levelLabelEl.textContent = tp("level").replace("{n}", level);
    movesEl.textContent = tp("moves").replace("{n}", steps);
    parEl.textContent = tp("par").replace("{n}", lv().par);
  }

  function renderLevels() {
    levelsEl.innerHTML = "";
    for (let n = 1; n <= TOTAL; n++) {
      const b = document.createElement("button");
      b.className = "ms-level" + (n === level ? " active" : "");
      b.textContent = n + (prog.cleared.includes(n) ? " ✓" : "");
      b.disabled = n > prog.unlocked;
      b.addEventListener("click", () => loadLevel(n));
      levelsEl.appendChild(b);
    }
  }

  function renderTexts() {
    updateBar();
    resetBtn.textContent = tp("reset");
    const h = lv().hint;
    hintEl.textContent = h ? (h[currentLang] || h.zh) : "";
    if (cleared) {
      statusEl.textContent = tp("cleared").replace("{n}", steps);
      nextBtn.textContent = level >= TOTAL ? tp("allClear") : tp("next");
    } else {
      statusEl.textContent = "";
    }
  }

  function loadLevel(n) {
    level = Math.max(1, Math.min(prog.unlocked, n));
    limbs = lv().start.slice();
    destroyed = new Set();
    steps = 0;
    selected = -1;
    cleared = false;
    anim = null;
    statusEl.textContent = "";
    statusEl.className = "inbox-status";
    nextBtn.classList.add("hidden");
    renderLevels();
    renderTexts();
  }

  // ===== 绘制 =====
  const INK = "#4A3226";
  function drawHold(i, now) {
    if (destroyed.has(i)) return;
    const p = holdPx(i), t = holdType(i);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (t === 3) {   // 终点：金色 + 呼吸光圈
      const pulse = 2 + Math.sin(now / 300) * 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 11 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(217,154,43,0.25)"; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#E9B93C"; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFF7EF"; ctx.fill();
    } else {
      const r = t === 1 ? 4.5 : 7;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = t === 2 ? "#EBD9C0" : "#FFF7EF";
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      if (t === 2) {   // 裂纹
        ctx.beginPath();
        ctx.moveTo(-3, -5); ctx.lineTo(0, -1); ctx.lineTo(-2, 3);
        ctx.moveTo(3, -4); ctx.lineTo(1, 0); ctx.lineTo(4, 4);
        ctx.lineWidth = 1.2; ctx.strokeStyle = "#A0785F"; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#FBE3CE"); g.addColorStop(1, "#F6C3AB");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 选中肢体时：臂展圈 + 可达岩点高亮
    if (selected >= 0 && !cleared) {
      const c = centerOf(limbs);
      ctx.beginPath(); ctx.arc(c.x, c.y, lv().reach, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(217,154,43,0.08)"; ctx.fill();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(74,50,38,0.4)"; ctx.stroke();
      ctx.setLineDash([]);
    }
    lv().holds.forEach((h, i) => drawHold(i, now));
    if (selected >= 0 && !cleared) {
      lv().holds.forEach((h, i) => {
        if (canMove(selected, i)) {
          const p = holdPx(i);
          ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
          ctx.lineWidth = 2.5; ctx.strokeStyle = "#D99A2B"; ctx.stroke();
        }
      });
    }

    // 攀爬者：四肢 + 躯干（重心略微下垂）
    const pos = [0, 1, 2, 3].map(limbPos);
    const cx = pos.reduce((s, p) => s + p.x, 0) / 4;
    const cy = pos.reduce((s, p) => s + p.y, 0) / 4 + 12;
    ctx.lineCap = "round";
    pos.forEach(p => {
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y);
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    });
    ctx.beginPath(); ctx.ellipse(cx, cy, 15, 19, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#D99A2B"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    // 小脸
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(cx - 5, cy - 4, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 5, cy - 4, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(217,85,80,0.5)";
    ctx.beginPath(); ctx.arc(cx - 8, cy + 1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy + 1, 2.5, 0, Math.PI * 2); ctx.fill();
    // 手 / 脚端点
    pos.forEach((p, i) => {
      const isHand = i < 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, isHand ? 7 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isHand ? "#D95550" : "#A0785F";
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      if (i === selected) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFF7EF"; ctx.stroke();
      }
    });
  }

  function frame(now) {
    if (anim && now - anim.t0 >= anim.dur) anim = null;
    const panel = document.getElementById("panel-climb");
    if (panel && panel.classList.contains("active")) draw(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ===== 交互 =====
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (anim || cleared) return;
    const p = canvasPos(e);
    // 先判肢体端点
    for (let i = 0; i < 4; i++) {
      if (dist(p, limbPos(i)) < 16) {
        selected = selected === i ? -1 : i;
        return;
      }
    }
    if (selected < 0) return;
    // 再判岩点
    let hit = -1;
    lv().holds.forEach((h, i) => {
      if (!destroyed.has(i) && dist(p, holdPx(i)) < 16) hit = i;
    });
    if (hit < 0) { selected = -1; return; }
    if (limbs.includes(hit)) {
      statusEl.textContent = tp("occupied");
      statusEl.className = "inbox-status error";
      return;
    }
    if (canMove(selected, hit)) {
      statusEl.textContent = "";
      statusEl.className = "inbox-status";
      doMove(selected, hit);
      selected = -1;
    } else {
      statusEl.textContent = tp("outOfReach");
      statusEl.className = "inbox-status error";
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") selected = -1;
  });

  resetBtn.addEventListener("click", () => loadLevel(level));
  nextBtn.addEventListener("click", () => { if (level < TOTAL) loadLevel(level + 1); });
  document.addEventListener("langchange", () => { renderTexts(); renderLevels(); });

  loadLevel(level);
})();