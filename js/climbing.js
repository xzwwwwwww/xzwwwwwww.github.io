/* 攀岩小游戏 v2：点击即移动的攀爬解谜，共 20 关（随机生成岩点）
 * 玩法：点击岩点，自动选代价最小的手/脚抓过去；双击 = 动态发力（1.3 倍臂展、高消耗、失衡会冲坠）
 * 重心 = 四肢锚点加权平均（手 0.22 / 脚 0.28），移动后重心须落在其余三支点构成的三角形内
 * 指力条：无脚点踩稳时缓慢消耗，双脚踩稳时恢复，耗尽 → 冲坠摆荡（每关可点击岩点恢复一次）
 * 路线：按颜色顺序抓点，每段颜色有一个检查点（白环），抓过才解锁下一色，最终抓金色终点
 * 支点类型：0 通用 / 1 小手点（只能手抓）/ 2 大脚点（只能脚踩，踩上算踩稳）
 * Shift+拖拽画规划辅助线；悬停 0.5 秒预览抓握后的重心；普通/计时挑战两种模式
 * 进度存 localStorage：climbProgress（沿用 v1 结构 {unlocked, cleared}，兼容旧档）
 * 最佳时间存 climbTimes，模式存 climbMode
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 * 注意：CLIMB_LEVELS 必须是合法 JSON；生成器用整数 LCG，离线 Python 验证脚本逐位复现
 */

const CLIMB_LEVELS = [
  {"colors": ["red"], "reach": 150, "step": 9, "extra": 6, "small": 0.15, "big": 0.15, "drain": 0, "regen": 10, "gap": 0, "par": 7,
   "hint": {"zh": "点击岩点即可抓过去；双击可发力抓更远的点。抓到金色岩点过关", "en": "Click a hold to grab it. Double-click for a dyno to reach farther. Grab the gold hold to win!"}},
  {"colors": ["red"], "reach": 145, "step": 9, "extra": 6, "small": 0.2, "big": 0.15, "drain": 0, "regen": 10, "gap": 0, "par": 7,
   "hint": {"zh": "小点只能手抓，大点只能脚踩；双脚都踩稳时指力会恢复", "en": "Small holds are hand-only, big ones foot-only. Rest with both feet on holds to recover grip."}},
  {"colors": ["red", "blue"], "reach": 142, "step": 9, "extra": 6, "small": 0.2, "big": 0.15, "drain": 0, "regen": 10, "gap": 0, "par": 8,
   "hint": {"zh": "按颜色顺序爬：先抓带白环的检查点，才能解锁下一种颜色", "en": "Follow the color order: grab the white-ringed checkpoint to unlock the next color."}},
  {"colors": ["red", "blue"], "reach": 138, "step": 9.5, "extra": 5, "small": 0.2, "big": 0.15, "drain": 1, "regen": 9, "gap": 0, "par": 8},
  {"colors": ["red", "blue"], "reach": 135, "step": 9.5, "extra": 5, "small": 0.22, "big": 0.15, "drain": 1.3, "regen": 9, "gap": 0, "par": 8},
  {"colors": ["red", "blue", "green"], "reach": 132, "step": 9.5, "extra": 5, "small": 0.22, "big": 0.18, "drain": 1.5, "regen": 9, "gap": 0, "par": 8},
  {"colors": ["red", "blue", "green"], "reach": 130, "step": 10, "extra": 4, "small": 0.22, "big": 0.18, "drain": 1.7, "regen": 9, "gap": 0, "par": 9},
  {"colors": ["red", "blue", "green"], "reach": 128, "step": 10, "extra": 4, "small": 0.25, "big": 0.22, "drain": 1.9, "regen": 8, "gap": 0, "par": 9},
  {"colors": ["red", "blue", "green"], "reach": 126, "step": 10, "extra": 4, "small": 0.25, "big": 0.2, "drain": 2.1, "regen": 8, "gap": 0, "par": 9},
  {"colors": ["red", "blue", "green"], "reach": 124, "step": 10.5, "extra": 3, "small": 0.25, "big": 0.2, "drain": 2.3, "regen": 8, "gap": 0, "par": 9},
  {"colors": ["red", "blue", "green", "purple"], "reach": 122, "step": 10.5, "extra": 3, "small": 0.28, "big": 0.2, "drain": 2.5, "regen": 8, "gap": 0, "par": 8},
  {"colors": ["red", "blue", "green", "purple"], "reach": 120, "step": 10.5, "extra": 3, "small": 0.28, "big": 0.2, "drain": 2.7, "regen": 8, "gap": 0, "par": 8},
  {"colors": ["red", "blue", "green", "purple"], "reach": 118, "step": 11, "extra": 3, "small": 0.3, "big": 0.2, "drain": 2.9, "regen": 7, "gap": 0, "par": 8},
  {"colors": ["red", "blue", "green", "purple"], "reach": 116, "step": 11, "extra": 2, "small": 0.3, "big": 0.2, "drain": 3.1, "regen": 7, "gap": 0, "par": 8},
  {"colors": ["red", "blue", "green", "purple"], "reach": 114, "step": 11, "extra": 2, "small": 0.3, "big": 0.22, "drain": 3.3, "regen": 7, "gap": 0, "par": 9},
  {"colors": ["red", "blue", "green", "purple"], "reach": 112, "step": 10, "extra": 2, "small": 0.3, "big": 0.22, "drain": 3.3, "regen": 7, "gap": 1, "par": 8,
   "hint": {"zh": "有一段间距超出静态臂展，需要双击发力跳过去", "en": "One gap is beyond static reach — double-click to dyno across."}},
  {"colors": ["red", "blue", "green", "purple"], "reach": 110, "step": 10, "extra": 2, "small": 0.32, "big": 0.22, "drain": 3.5, "regen": 7, "gap": 1, "par": 9},
  {"colors": ["red", "blue", "green", "purple"], "reach": 108, "step": 10, "extra": 2, "small": 0.33, "big": 0.24, "drain": 3.6, "regen": 6, "gap": 1, "par": 9},
  {"colors": ["red", "blue", "green", "purple"], "reach": 106, "step": 10, "extra": 2, "small": 0.34, "big": 0.24, "drain": 3.8, "regen": 6, "gap": 1, "par": 9},
  {"colors": ["red", "blue", "green", "purple"], "reach": 104, "step": 10, "extra": 2, "small": 0.35, "big": 0.25, "drain": 4, "regen": 6, "gap": 1, "par": 9}
];

(function () {
  const I18N = {
    zh: {
      level: "第 {n} 关", moves: "步数 {n}", par: "参考 {n}",
      strength: "指力",
      cleared: "🎉 过关！用了 {n} 步", clearedTime: "🎉 过关！{n} 步 · {t} 秒（最佳 {b} 秒）",
      allClear: "🏆 恭喜，20 关全部通关！",
      reset: "重置本关", next: "下一关",
      outOfReach: "太远，够不着", occupied: "这个岩点被占着",
      colorOrder: "需按颜色顺序", unstable: "重心不稳，换条路",
      falling: "冲坠！快点击一个岩点恢复！", recoveryUsed: "本关恢复机会已用完",
      failed: "💥 坠落……点击「重置本关」再来",
      target: "目标：{c}", gold: "金色终点",
      red: "红色", blue: "蓝色", green: "绿色", purple: "紫色",
      modeNormal: "普通模式", modeTimed: "计时挑战", clearLines: "清除辅助线",
      time: "{t} 秒"
    },
    en: {
      level: "Level {n}", moves: "Moves {n}", par: "Par {n}",
      strength: "Grip",
      cleared: "🎉 Cleared in {n} moves!", clearedTime: "🎉 Cleared! {n} moves · {t}s (best {b}s)",
      allClear: "🏆 All 20 levels cleared!",
      reset: "Reset", next: "Next level",
      outOfReach: "Out of reach", occupied: "Hold occupied",
      colorOrder: "Follow the color order", unstable: "Off balance — try another way",
      falling: "Falling! Click a hold to recover!", recoveryUsed: "Recovery already used",
      failed: "💥 Fallen… hit Reset to retry",
      target: "Target: {c}", gold: "Gold finish",
      red: "Red", blue: "Blue", green: "Green", purple: "Purple",
      modeNormal: "Normal", modeTimed: "Time attack", clearLines: "Clear lines",
      time: "{t}s"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const COLORS = { red: "#D95550", blue: "#3A6FD8", green: "#3A9A5B", purple: "#7A4FD8" };
  const GOLD = "#E9B93C";
  const INK = "#4A3226";
  const W = 480, H = 600;
  const X = x => x / 100 * W, Y = y => y / 100 * H;
  const TOTAL = CLIMB_LEVELS.length;
  const DYN = 1.3;              // 动态发力臂展倍率
  const M_STATIC = -20, M_DYN = -8;  // 稳定性安全边距（px，负值=允许越界容忍）
  const LW = [0.22, 0.22, 0.28, 0.28]; // 肢体权重：手低脚高

  const levelsEl = document.getElementById("climb-levels");
  const levelLabelEl = document.getElementById("climb-level-label");
  const colorEl = document.getElementById("climb-color");
  const movesEl = document.getElementById("climb-moves");
  const parEl = document.getElementById("climb-par");
  const timeEl = document.getElementById("climb-time");
  const strengthFill = document.getElementById("climb-strength-fill");
  const hintEl = document.getElementById("climb-hint");
  const statusEl = document.getElementById("climb-status");
  const resetBtn = document.getElementById("climb-reset");
  const modeBtn = document.getElementById("climb-mode");
  const clearLinesBtn = document.getElementById("climb-clear-lines");
  const nextBtn = document.getElementById("climb-next");
  const canvas = document.getElementById("climb-canvas");
  const ctx = canvas.getContext("2d");

  // ===== 存档 =====
  function loadJSON(k, def) {
    try { const v = JSON.parse(localStorage.getItem(k)); if (v) return v; } catch (e) {}
    return def;
  }
  const prog = loadJSON("climbProgress", { unlocked: 1, cleared: [] });   // 沿用 v1 结构
  if (!prog.cleared) prog.cleared = [];
  const times = loadJSON("climbTimes", {});
  let mode = "timed" === (localStorage.getItem("climbMode") || "") ? "timed" : "normal";
  function save(k, v) { try { localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); } catch (e) {} }

  // ===== 种子化随机 + 关卡生成（与离线验证脚本逐位一致）=====
  function makeRng(seed) {
    let s = seed % 2147483648;
    if (s <= 0) s += 2147483647;
    return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  }
  function genLevel(cfg, seed) {
    const rand = makeRng(seed);
    const holds = [];
    const Y0 = 88, YTOP = 14, n = cfg.colors.length, bh = (Y0 - YTOP) / n;
    // 起点（固定，颜色 = 第一段）
    holds.push({ x: 38, y: 92, t: 0, c: 0 }, { x: 62, y: 92, t: 0, c: 0 },
               { x: 42, y: 98, t: 0, c: 0 }, { x: 58, y: 98, t: 0, c: 0 });
    // 主路线脊柱：每行一对支点交替上行，保证可解
    const spine = [];
    let y = Y0, gapped = false;
    while (y > YTOP) {
      if (cfg.gap && !gapped && y < Y0 - bh) { y -= cfg.step; gapped = true; continue; }   // 动态发力缺口
      const x1 = 43 + (rand() * 2 - 1) * 5;
      const x2 = 57 + (rand() * 2 - 1) * 5;
      const c = Math.min(n - 1, Math.floor((Y0 - y) / bh));
      const h1 = { x: x1, y: y, t: 0, c: c };
      const h2 = { x: x2, y: y, t: 0, c: c };
      spine.push(h1, h2); holds.push(h1, h2);
      y -= cfg.step;
    }
    // 每段最上面的一对脊柱点 = 检查点
    for (let k = 0; k < n; k++) {
      let top = null;
      spine.forEach(h => { if (h.c === k && (top === null || h.y < top)) top = h.y; });
      spine.forEach(h => { if (h.c === k && h.y === top) h.cp = true; });
    }
    // 每段撒额外点（小手/大脚/通用）
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < cfg.extra; i++) {
        for (let tr = 0; tr < 12; tr++) {
          const x = 18 + rand() * 64;
          const y2 = Y0 - (k + 1) * bh + 2 + rand() * (bh - 4);
          const r = rand();
          const t = r < cfg.small ? 1 : (r < cfg.small + cfg.big ? 2 : 0);
          let ok = true;
          for (let j = 0; j < holds.length; j++) {
            if (Math.hypot(holds[j].x - x, holds[j].y - y2) < 5.5) { ok = false; break; }
          }
          if (ok) { holds.push({ x: x, y: y2, t: t, c: k }); break; }
        }
      }
    }
    holds.push({ x: 50, y: 6, t: 0, c: 99, gold: true });
    return holds;
  }

  // ===== 状态 =====
  let level = Math.min(prog.unlocked, TOTAL);
  let holds = [], limbs = [0, 1, 2, 3], stage = 0, steps = 0, strength = 100;
  let cleared = false, failed = false, recoveryUsed = false;
  let falling = null, anim = null, pendingFall = false;
  let lines = [], drawing = null;
  let hover = { idx: -1, since: 0 };
  let lastTap = 0, startTime = 0, clearTime = 0;

  const cfg = () => CLIMB_LEVELS[level - 1];
  const nColors = () => cfg().colors.length;
  const holdPx = i => ({ x: X(holds[i].x), y: Y(holds[i].y) });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ===== 几何：重心与稳定性 =====
  function limbPos(i) {
    if (anim && anim.limb === i) {
      const t = Math.min(1, (performance.now() - anim.t0) / anim.dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return { x: anim.from.x + (anim.to.x - anim.from.x) * e,
               y: anim.from.y + (anim.to.y - anim.from.y) * e };
    }
    return holdPx(limbs[i]);
  }
  function cogOf(pos) {
    let x = 0, y = 0;
    for (let i = 0; i < 4; i++) { x += LW[i] * pos[i].x; y += LW[i] * pos[i].y; }
    return { x: x, y: y };
  }
  function distPtSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L2 = dx * dx + dy * dy;
    let t = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  // 移动 moving 号肢体后，重心是否落在其余三支点三角形内（边距 margin）
  function stableAfter(postPos, moving, margin) {
    const c = cogOf(postPos);
    const tri = [0, 1, 2, 3].filter(i => i !== moving).map(i => postPos[i]);
    const a = tri[0], b = tri[1], d = tri[2];
    const area = Math.abs((b.x - a.x) * (d.y - a.y) - (d.x - a.x) * (b.y - a.y)) / 2;
    if (area < 300) {   // 退化共线：线段 + 容差
      return Math.min(distPtSeg(c, a, b), distPtSeg(c, b, d), distPtSeg(c, a, d)) <= margin + 6;
    }
    const edge = (p1, p2, p3) => {
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const sign = Math.sign((p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)) || 1;
      return sign * ((p2.x - p1.x) * (c.y - p1.y) - (p2.y - p1.y) * (c.x - p1.x)) / len;
    };
    return edge(a, b, d) >= margin && edge(b, d, a) >= margin && edge(d, a, b) >= margin;
  }

  // ===== 规则判定 =====
  function colorLocked(h) { return h.gold ? stage < nColors() : h.c > stage; }
  function limbOk(h, limb) { return h.t === 0 || (h.t === 1 && limb < 2) || (h.t === 2 && limb >= 2); }
  // 返回 {limb, dist} 或 null；dynamic = 动态发力（1.3 倍臂展）
  function bestLimb(idx, dynamic) {
    const h = holds[idx];
    if (colorLocked(h) || limbs.includes(idx)) return null;
    const R = cfg().reach * (dynamic ? DYN : 1);
    const hp = holdPx(idx);
    let best = null;
    for (let i = 0; i < 4; i++) {
      if (!limbOk(h, i)) continue;
      const d = dist(hp, holdPx(limbs[i]));
      if (d <= R && (!best || d < best.d)) best = { limb: i, d: d };
    }
    return best;
  }
  function postPos(limb, idx) {
    const pos = [0, 1, 2, 3].map(i => holdPx(limbs[i]));
    pos[limb] = holdPx(idx);
    return pos;
  }

  function tryGrab(idx, dynamic) {
    const h = holds[idx];
    if (colorLocked(h)) { setStatus(tp("colorOrder"), true); return; }
    if (limbs.includes(idx)) { setStatus(tp("occupied"), true); return; }
    const b = bestLimb(idx, dynamic);
    if (!b) { setStatus(tp("outOfReach"), true); return; }
    const pp = postPos(b.limb, idx);
    if (!stableAfter(pp, b.limb, dynamic ? M_DYN : M_STATIC)) {
      if (!dynamic) { setStatus(tp("unstable"), true); return; }
      pendingFall = true;   // 动态失衡：动作做出去，然后冲坠
    }
    applyMove(b.limb, idx, dynamic, dynamic ? 160 : 240);
  }

  function applyMove(limb, idx, dynamic, dur) {
    const from = holdPx(limbs[limb]);
    anim = { limb: limb, from: from, to: holdPx(idx), t0: performance.now(), dur: dur };
    limbs[limb] = idx;
    steps++;
    strength = Math.max(0, strength - (dynamic ? 2.5 : 1) * (4 + 0.05 * dist(from, holdPx(idx))));
    const h = holds[idx];
    if (h.cp && h.c === stage) stage++;
    if ((limb === 0 || limb === 1) && h.gold) onCleared();
    updateBar();
  }

  function onCleared() {
    cleared = true;
    clearTime = (performance.now() - startTime) / 1000;
    lines = [];
    if (!prog.cleared.includes(level)) prog.cleared.push(level);
    if (level === prog.unlocked && prog.unlocked < TOTAL) prog.unlocked++;
    save("climbProgress", prog);
    let msg = tp("cleared").replace("{n}", steps);
    if (mode === "timed") {
      const t = clearTime.toFixed(1);
      const prev = times[level];
      if (!prev || clearTime < prev) { times[level] = Math.round(clearTime * 10) / 10; save("climbTimes", times); }
      msg = tp("clearedTime").replace("{n}", steps).replace("{t}", t).replace("{b}", times[level]);
    }
    statusEl.textContent = msg;
    statusEl.className = "inbox-status";
    if (level >= TOTAL) { nextBtn.textContent = tp("allClear"); nextBtn.disabled = true; }
    else { nextBtn.textContent = tp("next"); nextBtn.disabled = false; }
    nextBtn.classList.remove("hidden");
    renderLevels();
  }

  // ===== 冲坠与恢复 =====
  function startSwing() {
    if (falling || cleared || failed) return;
    falling = { t0: performance.now() };
    setStatus(tp("falling"), true);
  }
  function tryRecovery(p) {
    if (recoveryUsed) { setStatus(tp("recoveryUsed"), true); return; }
    const idx = hitHold(p);
    if (idx < 0) return;
    const b = bestLimb(idx, true);
    if (!b) { setStatus(tp("outOfReach"), true); return; }
    recoveryUsed = true;
    falling = null;
    strength = Math.max(strength, 20);   // 绳子借你一口气
    applyMove(b.limb, idx, true, 160);
    if (!cleared) { statusEl.textContent = ""; statusEl.className = "inbox-status"; }
  }

  // ===== UI =====
  function setStatus(t, err) {
    statusEl.textContent = t;
    statusEl.className = "inbox-status" + (err ? " error" : "");
  }
  function targetName() {
    return stage >= nColors() ? tp("gold") : tp(cfg().colors[stage]);
  }
  function updateBar() {
    levelLabelEl.textContent = tp("level").replace("{n}", level);
    movesEl.textContent = tp("moves").replace("{n}", steps);
    parEl.textContent = tp("par").replace("{n}", cfg().par);
    colorEl.textContent = tp("target").replace("{c}", targetName());
    const col = stage >= nColors() ? GOLD : COLORS[cfg().colors[stage]];
    colorEl.style.setProperty("--chip", col);
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
    modeBtn.textContent = mode === "timed" ? tp("modeTimed") : tp("modeNormal");
    clearLinesBtn.textContent = tp("clearLines");
    const h = cfg().hint;
    hintEl.textContent = h ? (h[currentLang] || h.zh) : "";
    if (cleared) onClearedText();
    else if (failed) setStatus(tp("failed"), true);
    else if (falling) setStatus(tp("falling"), true);
    else { statusEl.textContent = ""; statusEl.className = "inbox-status"; }
  }
  function onClearedText() {   // langchange 时重算过关文案
    let msg = tp("cleared").replace("{n}", steps);
    if (mode === "timed") msg = tp("clearedTime").replace("{n}", steps)
      .replace("{t}", clearTime.toFixed(1)).replace("{b}", times[level] || clearTime.toFixed(1));
    statusEl.textContent = msg;
    statusEl.className = "inbox-status";
    nextBtn.textContent = level >= TOTAL ? tp("allClear") : tp("next");
  }

  function loadLevel(n) {
    level = Math.max(1, Math.min(prog.unlocked, n));
    holds = genLevel(cfg(), (Math.random() * 1e9) | 0);
    limbs = [0, 1, 2, 3];
    stage = 0; steps = 0; strength = 100;
    cleared = false; failed = false; recoveryUsed = false;
    falling = null; anim = null; pendingFall = false;
    lines = []; drawing = null; hover = { idx: -1, since: 0 };
    startTime = performance.now();
    nextBtn.classList.add("hidden");
    statusEl.textContent = ""; statusEl.className = "inbox-status";
    renderLevels();
    renderTexts();
  }

  // ===== 绘制 =====
  function drawHold(i, now) {
    const h = holds[i], p = holdPx(i);
    const locked = colorLocked(h);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (locked) ctx.globalAlpha = 0.3;
    if (h.gold) {
      const pulse = 2 + Math.sin(now / 300) * 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 11 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(217,154,43,0.25)"; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = GOLD; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFF7EF"; ctx.fill();
    } else {
      const col = COLORS[cfg().colors[h.c]];
      if (h.t === 2) {   // 大脚点：扁椭圆
        ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, h.t === 1 ? 4.5 : 7.5, 0, Math.PI * 2);
      }
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      if (h.cp) {   // 检查点：白环
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFF7EF"; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.stroke();
      } else if (!locked && h.c === stage) {   // 当前目标色微光
        ctx.beginPath(); ctx.arc(0, 0, h.t === 1 ? 8 : 11, 0, Math.PI * 2);
        ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,247,239,0.7)"; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawClimber(now) {
    const pos = [0, 1, 2, 3].map(limbPos);
    const cog = cogOf(pos);
    const tx = cog.x, ty = cog.y + 12;   // 躯干重心略下垂
    ctx.lineCap = "round";
    pos.forEach(p => {
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(p.x, p.y);
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    });
    ctx.beginPath(); ctx.ellipse(tx, ty, 15, 19, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#D99A2B"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(tx - 5, ty - 4, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + 5, ty - 4, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(217,85,80,0.5)";
    ctx.beginPath(); ctx.arc(tx - 8, ty + 1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + 8, ty + 1, 2.5, 0, Math.PI * 2); ctx.fill();
    // 重心球：躯干中心延伸出的小圆点
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(cog.x, cog.y);
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(74,50,38,0.6)"; ctx.stroke();
    ctx.beginPath(); ctx.arc(cog.x, cog.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF7EF"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    pos.forEach((p, i) => {
      const isHand = i < 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, isHand ? 7 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isHand ? "#D95550" : "#A0785F";
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    });
  }

  function drawPreview() {   // 悬停 0.5 秒：重心偏移预测
    if (hover.idx < 0 || cleared || failed || falling || anim) return;
    if (performance.now() - hover.since < 500) return;
    const b = bestLimb(hover.idx, false);
    if (!b) return;
    const pp = postPos(b.limb, hover.idx);
    if (!stableAfter(pp, b.limb, M_STATIC)) return;
    const tri = [0, 1, 2, 3].filter(i => i !== b.limb).map(i => holdPx(limbs[i]));
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(tri[0].x, tri[0].y); ctx.lineTo(tri[1].x, tri[1].y); ctx.lineTo(tri[2].x, tri[2].y);
    ctx.closePath();
    ctx.fillStyle = "#FFF7EF"; ctx.fill();
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.setLineDash([]);
    const cog = cogOf(pp);
    ctx.beginPath(); ctx.arc(cog.x, cog.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#D99A2B"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#FBE3CE"); g.addColorStop(1, "#F6C3AB");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 规划辅助线（蜡笔虚线）
    ctx.save();
    ctx.setLineDash([7, 6]); ctx.lineCap = "round";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,247,239,0.85)";
    lines.forEach(pl => {
      if (pl.length < 2) return;
      ctx.beginPath(); ctx.moveTo(pl[0].x, pl[0].y);
      for (let i = 1; i < pl.length; i++) ctx.lineTo(pl[i].x, pl[i].y);
      ctx.stroke();
    });
    ctx.restore();
    holds.forEach((h, i) => drawHold(i, now));
    drawPreview();
    if (falling) {   // 绳子 + 摆荡
      const el = (now - falling.t0) / 1600;
      const ang = 0.45 * Math.sin((now - falling.t0) / 1000 * 9) * Math.max(0, 1 - el);
      const pos = [0, 1, 2, 3].map(limbPos);
      const cog = cogOf(pos);
      const ax = cog.x, ay = 0;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(cog.x, cog.y + 12);
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.translate(ax, ay); ctx.rotate(ang); ctx.translate(-ax, -ay);
      drawClimber(now);
      ctx.restore();
    } else {
      drawClimber(now);
    }
  }

  let prevT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - prevT) / 1000);
    prevT = now;
    if (anim && now - anim.t0 >= anim.dur) {
      anim = null;
      if (pendingFall) { pendingFall = false; startSwing(); }
    }
    if (falling && now - falling.t0 > 1600) {
      falling = null; failed = true;
      setStatus(tp("failed"), true);
    }
    // 指力：双脚踩稳恢复，都无踩稳消耗
    if (!cleared && !failed && !falling) {
      const f2 = holds[limbs[2]].t !== 1, f3 = holds[limbs[3]].t !== 1;
      if (f2 && f3) strength = Math.min(100, strength + cfg().regen * dt);
      else if (!f2 && !f3) {
        strength = Math.max(0, strength - cfg().drain * dt);
        if (strength <= 0) startSwing();
      }
      strengthFill.style.width = strength + "%";
      strengthFill.style.background = strength < 25 ? "#D95550" : strength < 55 ? "#D99A2B" : "#3A9A5B";
    }
    if (mode === "timed" && !cleared && !failed) {
      timeEl.textContent = tp("time").replace("{t}", ((now - startTime) / 1000).toFixed(1));
    } else timeEl.textContent = "";
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
  function hitHold(p) {
    let hit = -1, bd = 18;
    holds.forEach((h, i) => {
      const d = dist(p, holdPx(i));
      if (d < bd) { bd = d; hit = i; }
    });
    return hit;
  }

  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    const p = canvasPos(e);
    if (e.shiftKey) {   // 规划辅助线
      drawing = [p];
      lines.push(drawing);
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (cleared || failed) return;
    if (falling) { tryRecovery(p); return; }
    if (anim) return;
    const idx = hitHold(p);
    const now = performance.now();
    const dynamic = e.detail >= 2 || now - lastTap < 350;
    lastTap = now;
    if (idx >= 0) tryGrab(idx, dynamic);
  });
  canvas.addEventListener("pointermove", e => {
    const p = canvasPos(e);
    if (drawing) { drawing.push(p); return; }
    const idx = hitHold(p);
    if (idx !== hover.idx) hover = { idx: idx, since: performance.now() };
  });
  canvas.addEventListener("pointerup", () => { drawing = null; });
  canvas.addEventListener("pointerleave", () => { drawing = null; hover = { idx: -1, since: 0 }; });

  resetBtn.addEventListener("click", () => loadLevel(level));
  nextBtn.addEventListener("click", () => { if (level < TOTAL) loadLevel(level + 1); });
  modeBtn.addEventListener("click", () => {
    mode = mode === "timed" ? "normal" : "timed";
    save("climbMode", mode);
    loadLevel(level);
  });
  clearLinesBtn.addEventListener("click", () => { lines = []; });
  document.addEventListener("langchange", () => { renderTexts(); renderLevels(); });

  loadLevel(level);
})();