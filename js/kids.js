/* 小朋友专区：涂鸦画板 / 打地鼠 / 口算小问答
 * 纯前端实现；打地鼠最高纪录存 localStorage（kidsMoleBest）
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 */

(function () {
  const I18N = {
    zh: {
      tabDoodle: "🎨 涂鸦画板",
      tabMole: "🐻 打地鼠",
      tabMath: "🔢 口算小问答",
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
      tabMath: "🔢 Quick Math",
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

  const COLORS = ["#4A3226", "#D95550", "#F2784B", "#F5A623",
    "#D99A2B", "#7FB069", "#4FA3D1", "#8E6FBF", "#E57BA8", "#FFFFFF"];
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

  // ===== 3. 口算小问答 =====
  const mathPlay = document.getElementById("math-play");
  const mathResult = document.getElementById("math-result");
  const mathStartOverlay = document.getElementById("math-start");
  const mathStartBtn = document.getElementById("math-start-btn");
  const mathProgressEl = document.getElementById("math-progress");
  const mathTimerEl = document.getElementById("math-timer");
  const mathQuestionEl = document.getElementById("math-question");
  const mathOptionsEl = document.getElementById("math-options");
  const mathCheckEl = document.getElementById("math-check");
  const mathResultTextEl = document.getElementById("math-result-text");
  const mathAgainBtn = document.getElementById("math-again");

  const MATH_TOTAL = 10;
  let mathIdx = 0;
  let mathOk = 0;
  let mathAnswer = 0;
  let mathPlaying = false;
  let mathStartTime = 0;
  let mathTick = null;
  let mathLocked = false;

  const rand = n => Math.floor(Math.random() * (n + 1));

  function makeQuestion() {
    // 前 5 题 10 以内，后 5 题 20 以内
    const max = mathIdx < 5 ? 10 : 20;
    let a, b, op;
    if (Math.random() < 0.5) {
      op = "+";
      a = rand(max - 1);
      b = rand(max - a);
    } else {
      op = "−";
      a = rand(max);
      b = rand(a);
    }
    mathAnswer = op === "+" ? a + b : a - b;
    mathQuestionEl.textContent = `${a} ${op} ${b} = ?`;

    // 3 个选项：正确答案 + 两个不重复干扰项
    const opts = new Set([mathAnswer]);
    while (opts.size < 3) {
      const d = mathAnswer + (Math.floor(Math.random() * 7) - 3);
      if (d >= 0) opts.add(d);
    }
    const arr = [...opts].sort(() => Math.random() - 0.5);
    mathOptionsEl.innerHTML = "";
    arr.forEach(v => {
      const b2 = document.createElement("button");
      b2.className = "math-option";
      b2.textContent = v;
      b2.addEventListener("click", () => pickOption(b2, v));
      mathOptionsEl.appendChild(b2);
    });
  }

  function pickOption(btn, v) {
    if (!mathPlaying || mathLocked) return;
    if (v === mathAnswer) {
      mathLocked = true;
      mathOk++;
      mathCheckEl.classList.remove("hidden");
      mathCheckEl.classList.add("pop");
      setTimeout(() => {
        mathCheckEl.classList.add("hidden");
        mathCheckEl.classList.remove("pop");
        mathIdx++;
        if (mathIdx >= MATH_TOTAL) endMath();
        else { renderMath(); makeQuestion(); mathLocked = false; }
      }, 600);
    } else {
      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 400);
    }
  }

  function renderMath() {
    mathProgressEl.textContent = tf("mathProgress", { n: Math.min(mathIdx + 1, MATH_TOTAL) });
  }

  function startMath() {
    mathIdx = 0;
    mathOk = 0;
    mathPlaying = true;
    mathLocked = false;
    mathStartTime = Date.now();
    mathStartOverlay.classList.add("hidden");
    mathResult.classList.add("hidden");
    mathPlay.classList.remove("hidden");
    clearInterval(mathTick);
    mathTick = setInterval(() => {
      mathTimerEl.textContent = tf("mathTime", { n: Math.floor((Date.now() - mathStartTime) / 1000) });
    }, 500);
    mathTimerEl.textContent = tf("mathTime", { n: 0 });
    renderMath();
    makeQuestion();
  }

  function endMath() {
    mathPlaying = false;
    clearInterval(mathTick);
    const secs = Math.floor((Date.now() - mathStartTime) / 1000);
    mathPlay.classList.add("hidden");
    mathResult.classList.remove("hidden");
    mathResultTextEl.textContent = tf("mathResult", {
      ok: mathOk,
      rate: Math.round((mathOk / MATH_TOTAL) * 100),
      t: secs
    });
  }

  mathStartBtn.addEventListener("click", startMath);
  mathAgainBtn.addEventListener("click", startMath);

  function renderMathLang() {
    mathStartBtn.textContent = tp("mathStart");
    mathAgainBtn.textContent = tp("mathAgain");
    if (mathPlaying) renderMath();
  }

  // ===== 语言切换重绘 =====
  function renderLang() {
    tabs[0].textContent = tp("tabDoodle");
    tabs[1].textContent = tp("tabMole");
    tabs[2].textContent = tp("tabMath");
    renderDoodle();
    renderMoleLang();
    renderMathLang();
  }
  document.addEventListener("langchange", renderLang);

  // 初始化
  renderDoodle();
  renderMole();
  moleStartBtn.textContent = tp("moleStart");
  renderMathLang();
  renderLang();
})();