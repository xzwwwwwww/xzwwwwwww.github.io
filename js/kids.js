/* 小朋友专区：涂鸦画板 / 打地鼠 / 口算小问答（二年级下册、三年级下册两个难度）
 * 纯前端实现；打地鼠最高纪录存 localStorage（kidsMoleBest）
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 */

(function () {
  const I18N = {
    zh: {
      tabDoodle: "🎨 涂鸦画板",
      tabMole: "🐻 打地鼠",
      tabMath2: "🔢 口算·二年级下",
      tabMath3: "🔢 口算·三年级下",
      brush: "笔刷",
      eraser: "🧽 橡皮",
      pencil: "🖍️ 画笔",
      clear: "🗑️ 清空",
      save: "💾 保存",
      score: "得分：{n}",
      time: "时间：{n} 秒",
      best: "最高纪录：{n}",
      moleStart: "开始游戏",
      moleOver: "时间到！你的得分是 {n} 分",
      moleNewBest: "🎉 新纪录！",
      moleAgain: "再玩一次",
      mathProgress: "第 {n}/10 题",
      mathTime: "用时：{n} 秒",
      mathStart: "开始答题",
      mathAgain: "再来一组",
      mathResult: "答对 {ok}/10 题，正确率 {rate}%，用时 {t} 秒"
    },
    en: {
      tabDoodle: "🎨 Doodle Board",
      tabMole: "🐻 Whack-a-Bear",
      tabMath2: "🔢 Math · Grade 2B",
      tabMath3: "🔢 Math · Grade 3B",
      brush: "Brush",
      eraser: "🧽 Eraser",
      pencil: "🖍️ Pencil",
      clear: "🗑️ Clear",
      save: "💾 Save",
      score: "Score: {n}",
      time: "Time: {n}s",
      best: "Best: {n}",
      moleStart: "Start",
      moleOver: "Time's up! You scored {n}",
      moleNewBest: "🎉 New record!",
      moleAgain: "Play again",
      mathProgress: "Question {n}/10",
      mathTime: "Time: {n}s",
      mathStart: "Start",
      mathAgain: "One more round",
      mathResult: "{ok}/10 correct ({rate}%) in {t}s"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;
  const tf = (k, map) => {
    let s = tp(k);
    Object.keys(map).forEach(key => { s = s.replace("{" + key + "}", map[key]); });
    return s;
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ===== 标签切换 =====
  const tabs = document.querySelectorAll(".kids-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".kids-panel").forEach(p =>
        p.classList.toggle("active", p.id === "kids-panel-" + tab.dataset.kids));
    });
  });

  // ===== 1. 涂鸦画板 =====
  const canvas = document.getElementById("doodle-canvas");
  const ctx = canvas.getContext("2d");
  const paletteEl = document.getElementById("doodle-palette");
  const sizesEl = document.getElementById("doodle-sizes");
  const eraserBtn = document.getElementById("doodle-eraser");
  const clearBtn = document.getElementById("doodle-clear");
  const saveBtn = document.getElementById("doodle-save");

  // 30 色调色板：中性 / 红橙 / 黄绿 / 蓝紫 / 粉 五排
  const COLORS = [
    "#4A3226", "#2B2B2B", "#6B6B6B", "#BFBFBF", "#FFFFFF", "#8B5E3C",
    "#D95550", "#E86A6A", "#F2784B", "#F59A62", "#F5A623", "#FFD166",
    "#D99A2B", "#C6D64F", "#7FB069", "#4CAF7D", "#2E8B57", "#9CCC65",
    "#4FA3D1", "#3A6FD8", "#7AC7E3", "#8E6FBF", "#7A4FD8", "#B39DDB",
    "#E57BA8", "#F4A7C3", "#FFCCE0", "#D94F8E", "#FF8FA3", "#FFE3EC"
  ];
  const SIZES = [6, 12, 22];
  let color = COLORS[1];
  let size = SIZES[1];
  let erasing = false;
  let drawing = false;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "#FFF7EF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function renderPalette() {
    paletteEl.innerHTML = "";
    COLORS.forEach(c => {
      const b = document.createElement("button");
      b.className = "doodle-color" + (c === color && !erasing ? " active" : "");
      b.style.background = c;
      b.setAttribute("aria-label", c);
      b.addEventListener("click", () => { color = c; erasing = false; renderDoodle(); });
      paletteEl.appendChild(b);
    });
  }

  function renderSizes() {
    sizesEl.innerHTML = "";
    SIZES.forEach(s => {
      const b = document.createElement("button");
      b.className = "doodle-size" + (s === size ? " active" : "");
      const dot = document.createElement("span");
      dot.style.width = dot.style.height = (s + 4) + "px";
      b.appendChild(dot);
      b.addEventListener("click", () => { size = s; renderDoodle(); });
      sizesEl.appendChild(b);
    });
  }

  function renderDoodle() {
    renderPalette();
    renderSizes();
    eraserBtn.textContent = erasing ? tp("pencil") : tp("eraser");
    eraserBtn.classList.toggle("active", erasing);
    clearBtn.textContent = tp("clear");
    saveBtn.textContent = tp("save");
  }

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  }

  canvas.addEventListener("pointerdown", e => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // 点画：按下即落一个圆点
    ctx.strokeStyle = erasing ? "#FFF7EF" : color;
    ctx.lineWidth = erasing ? size * 2 : size;
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", e => {
    if (!drawing) return;
    const p = canvasPos(e);
    ctx.strokeStyle = erasing ? "#FFF7EF" : color;
    ctx.lineWidth = erasing ? size * 2 : size;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    e.preventDefault();
  });
  ["pointerup", "pointercancel"].forEach(ev =>
    canvas.addEventListener(ev, () => { drawing = false; }));

  eraserBtn.addEventListener("click", () => { erasing = !erasing; renderDoodle(); });
  clearBtn.addEventListener("click", () => {
    ctx.fillStyle = "#FFF7EF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
  saveBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = "doodle.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  });

  // ===== 2. 打地鼠 =====
  const MOLE_SECS = 30;
  const moleGrid = document.getElementById("mole-grid");
  const moleScoreEl = document.getElementById("mole-score");
  const moleTimeEl = document.getElementById("mole-time");
  const moleBestEl = document.getElementById("mole-best");
  const moleStatusEl = document.getElementById("mole-status");
  const moleStartBtn = document.getElementById("mole-start");

  let moleScore = 0;
  let moleLeft = 0;
  let molePlaying = false;
  let moleTimer = null;
  let molePopTimer = null;
  let best = parseInt(store.get("kidsMoleBest") || "0", 10) || 0;

  // 建 3×3 格子
  const holes = [];
  for (let i = 0; i < 9; i++) {
    const h = document.createElement("div");
    h.className = "mole-hole";
    h.addEventListener("pointerdown", () => hitHole(i));
    moleGrid.appendChild(h);
    holes.push(h);
  }

  function hitHole(i) {
    if (!molePlaying) return;
    const h = holes[i];
    if (h.classList.contains("show-bear")) {
      moleScore += 1;
      h.classList.remove("show-bear");
    } else if (h.classList.contains("show-bomb")) {
      moleScore = Math.max(0, moleScore - 2);
      h.classList.remove("show-bomb");
      h.classList.add("hit-bomb");
      setTimeout(() => h.classList.remove("hit-bomb"), 300);
    } else {
      return;
    }
    renderMole();
  }

  function popOne() {
    if (!molePlaying) return;
    // 清理旧目标，随机冒一个（约 1/6 概率炸弹）
    holes.forEach(h => h.classList.remove("show-bear", "show-bomb"));
    const i = Math.floor(Math.random() * 9);
    holes[i].classList.add(Math.random() < 1 / 6 ? "show-bomb" : "show-bear");
    const wait = 500 + Math.random() * 450;
    molePopTimer = setTimeout(popOne, wait);
  }

  function renderMole() {
    moleScoreEl.textContent = tf("score", { n: moleScore });
    moleTimeEl.textContent = tf("time", { n: moleLeft });
    moleBestEl.textContent = tf("best", { n: best });
  }

  function endMole() {
    molePlaying = false;
    clearInterval(moleTimer);
    clearTimeout(molePopTimer);
    holes.forEach(h => h.classList.remove("show-bear", "show-bomb"));
    let msg = tf("moleOver", { n: moleScore });
    if (moleScore > best) {
      best = moleScore;
      store.set("kidsMoleBest", String(best));
      msg += " " + tp("moleNewBest");
    }
    moleStatusEl.textContent = msg;
    moleStartBtn.textContent = tp("moleAgain");
    renderMole();
  }

  function startMole() {
    moleScore = 0;
    moleLeft = MOLE_SECS;
    molePlaying = true;
    moleStatusEl.textContent = "";
    moleStartBtn.disabled = true;
    clearInterval(moleTimer);
    clearTimeout(molePopTimer);
    moleTimer = setInterval(() => {
      moleLeft--;
      renderMole();
      if (moleLeft <= 0) {
        moleStartBtn.disabled = false;
        endMole();
      }
    }, 1000);
    renderMole();
    popOne();
  }

  moleStartBtn.addEventListener("click", () => {
    if (!molePlaying) startMole();
  });

  function renderMoleLang() {
    if (!molePlaying && moleLeft === 0 && moleScore === 0) {
      moleStartBtn.textContent = tp("moleStart");
    } else if (!molePlaying) {
      moleStartBtn.textContent = tp("moleAgain");
    }
    renderMole();
  }

  // ===== 3/4. 口算小问答（二年级下册 / 三年级下册，同一套逻辑两个实例）=====
  const MATH_TOTAL = 10;
  const rand = n => Math.floor(Math.random() * (n + 1));

  // 整数干扰项：答案附近 ±15% 内的不同整数
  function intOpts(ans) {
    const spread = Math.max(3, Math.round(Math.abs(ans) * 0.15));
    const s = new Set([ans]);
    while (s.size < 3) {
      const d = ans + Math.floor(Math.random() * (2 * spread + 1)) - spread;
      if (d >= 0 && d !== ans) s.add(d);
    }
    return [...s].sort(() => Math.random() - 0.5);
  }
  // 一位小数干扰项（内部按十分位整数算，避免浮点误差）
  function decOpts(ans) {
    const a10 = Math.round(ans * 10);
    const s = new Set([a10]);
    while (s.size < 3) {
      const d = a10 + Math.floor(Math.random() * 25) - 12;
      if (d >= 0 && d !== a10) s.add(d);
    }
    return [...s].sort(() => Math.random() - 0.5).map(v => v / 10);
  }

  // 二年级下册：100 以内加减 + 表内乘除
  function genG2() {
    const t = Math.floor(Math.random() * 4);
    if (t === 0) {
      const a = 11 + rand(88), b = 1 + rand(Math.max(0, 99 - a));
      return { text: `${a} + ${b} = ?`, answer: a + b, opts: intOpts(a + b) };
    }
    if (t === 1) {
      const a = 11 + rand(88), b = 1 + rand(a - 1);
      return { text: `${a} − ${b} = ?`, answer: a - b, opts: intOpts(a - b) };
    }
    if (t === 2) {
      const a = 2 + rand(7), b = 2 + rand(7);
      return { text: `${a} × ${b} = ?`, answer: a * b, opts: intOpts(a * b) };
    }
    const b = 2 + rand(7), c = 2 + rand(7), a = b * c;
    return { text: `${a} ÷ ${b} = ?`, answer: c, opts: intOpts(c) };
  }

  // 三年级下册：两位数乘法 + 除数一位数 + 一位小数加减
  function genG3() {
    const t = Math.floor(Math.random() * 5);
    if (t === 0) {
      const a = 12 + rand(87), b = 2 + rand(7);
      return { text: `${a} × ${b} = ?`, answer: a * b, opts: intOpts(a * b) };
    }
    if (t === 1) {
      const a = 11 + rand(14), b = 11 + rand(8);
      return { text: `${a} × ${b} = ?`, answer: a * b, opts: intOpts(a * b) };
    }
    if (t === 2) {
      const b = 2 + rand(7), c = 12 + rand(87), a = b * c;
      return { text: `${a} ÷ ${b} = ?`, answer: c, opts: intOpts(c) };
    }
    const a10 = 5 + rand(94), b10 = 5 + rand(94);
    if (t === 3) {
      const s = (a10 + b10) / 10;
      return { text: `${(a10 / 10).toFixed(1)} + ${(b10 / 10).toFixed(1)} = ?`,
               answer: s, opts: decOpts(s), dec: true };
    }
    const hi = Math.max(a10, b10), lo = Math.min(a10, b10), d = (hi - lo) / 10;
    return { text: `${(hi / 10).toFixed(1)} − ${(lo / 10).toFixed(1)} = ?`,
             answer: d, opts: decOpts(d), dec: true };
  }

  // 口算实例工厂：prefix = 元素 id 前缀（m2 / m3），gen = 出题函数
  function setupMath(prefix, gen) {
    const play = document.getElementById(prefix + "-play");
    const result = document.getElementById(prefix + "-result");
    const startOverlay = document.getElementById(prefix + "-start");
    const startBtn = document.getElementById(prefix + "-start-btn");
    const progressEl = document.getElementById(prefix + "-progress");
    const timerEl = document.getElementById(prefix + "-timer");
    const questionEl = document.getElementById(prefix + "-question");
    const optionsEl = document.getElementById(prefix + "-options");
    const checkEl = document.getElementById(prefix + "-check");
    const resultTextEl = document.getElementById(prefix + "-result-text");
    const againBtn = document.getElementById(prefix + "-again");

    let idx = 0, ok = 0, answer = 0, dec = false;
    let playing = false, locked = false, startTime = 0, tick = null;

    function makeQuestion() {
      const q = gen();
      answer = q.answer;
      dec = !!q.dec;
      questionEl.textContent = q.text;
      optionsEl.innerHTML = "";
      q.opts.forEach(v => {
        const b2 = document.createElement("button");
        b2.className = "math-option";
        b2.textContent = dec ? v.toFixed(1) : v;
        b2.addEventListener("click", () => pickOption(b2, v));
        optionsEl.appendChild(b2);
      });
    }

    function pickOption(btn, v) {
      if (!playing || locked) return;
      const right = dec ? Math.round(v * 10) === Math.round(answer * 10) : v === answer;
      if (right) {
        locked = true;
        ok++;
        checkEl.classList.remove("hidden");
        checkEl.classList.add("pop");
        setTimeout(() => {
          checkEl.classList.add("hidden");
          checkEl.classList.remove("pop");
          idx++;
          if (idx >= MATH_TOTAL) endMath();
          else { renderProgress(); makeQuestion(); locked = false; }
        }, 600);
      } else {
        btn.classList.add("shake");
        setTimeout(() => btn.classList.remove("shake"), 400);
      }
    }

    function renderProgress() {
      progressEl.textContent = tf("mathProgress", { n: Math.min(idx + 1, MATH_TOTAL) });
    }

    function startMath() {
      idx = 0; ok = 0;
      playing = true; locked = false;
      startTime = Date.now();
      startOverlay.classList.add("hidden");
      result.classList.add("hidden");
      play.classList.remove("hidden");
      clearInterval(tick);
      tick = setInterval(() => {
        timerEl.textContent = tf("mathTime", { n: Math.floor((Date.now() - startTime) / 1000) });
      }, 500);
      timerEl.textContent = tf("mathTime", { n: 0 });
      renderProgress();
      makeQuestion();
    }

    function endMath() {
      playing = false;
      clearInterval(tick);
      const secs = Math.floor((Date.now() - startTime) / 1000);
      play.classList.add("hidden");
      result.classList.remove("hidden");
      resultTextEl.textContent = tf("mathResult", {
        ok: ok,
        rate: Math.round((ok / MATH_TOTAL) * 100),
        t: secs
      });
    }

    startBtn.addEventListener("click", startMath);
    againBtn.addEventListener("click", startMath);

    function renderLang() {
      startBtn.textContent = tp("mathStart");
      againBtn.textContent = tp("mathAgain");
      if (playing) renderProgress();
    }
    return { renderLang };
  }

  const math2 = setupMath("m2", genG2);
  const math3 = setupMath("m3", genG3);

  // ===== 语言切换重绘 =====
  function renderLang() {
    tabs[0].textContent = tp("tabDoodle");
    tabs[1].textContent = tp("tabMole");
    tabs[2].textContent = tp("tabMath2");
    tabs[3].textContent = tp("tabMath3");
    renderDoodle();
    renderMoleLang();
    math2.renderLang();
    math3.renderLang();
  }
  document.addEventListener("langchange", renderLang);

  // 初始化
  renderDoodle();
  renderMole();
  moleStartBtn.textContent = tp("moleStart");
  renderLang();
})();
