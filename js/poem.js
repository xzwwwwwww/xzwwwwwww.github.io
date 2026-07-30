/* 古诗词小游戏：给上句填下句 / 给下句填上句，共 100 关
 * 诗词数据在 js/poem-data.js（POEMS，按难度排序）
 * 通关解锁下一关，进度存 localStorage；已通关关卡可从下拉框重玩
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 */

(function () {
  const I18N = {
    zh: {
      askNext: "请写出下一句",
      askPrev: "请写出上一句",
      submit: "提交",
      correct: "答对了！全诗如下：",
      wrong: "不对哦，再想想～",
      empty: "先写出你的答案",
      next: "下一关",
      allClear: "🏆 恭喜，100 关全部通关！",
      level: "第 {n} 关",
      progress: "已通关 {done}/100",
      answerPh: "不写标点，直接填诗句"
    },
    en: {
      askNext: "Write the next line",
      askPrev: "Write the previous line",
      submit: "Submit",
      correct: "Correct! The full poem:",
      wrong: "Not quite — think again~",
      empty: "Type your answer first",
      next: "Next level",
      allClear: "🏆 All 100 levels cleared!",
      level: "Level {n}",
      progress: "Cleared {done}/100",
      answerPh: "Just the line, no punctuation"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const TOTAL = POEMS.length;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  let unlocked = Math.max(1, Math.min(TOTAL, parseInt(store.get("poem-unlocked") || "1", 10) || 1));
  let level = Math.max(1, Math.min(unlocked, parseInt(store.get("poem-level") || String(unlocked), 10) || unlocked));
  let finished = store.get("poem-finished") === "1";   // 第 100 关已通关

  let state = "playing";   // playing | passed
  let pair = null;         // { ask: "next"|"prev", idx: 已展示句的行号, answer: 答案行号 }

  const progressEl = document.getElementById("poem-progress");
  const selectEl = document.getElementById("poem-level-select");
  const titleEl = document.getElementById("poem-title");
  const authorEl = document.getElementById("poem-author");
  const quizEl = document.getElementById("poem-quiz");
  const questionEl = document.getElementById("poem-question");
  const answerEl = document.getElementById("poem-answer");
  const submitBtn = document.getElementById("poem-submit");
  const statusEl = document.getElementById("poem-status");
  const fullEl = document.getElementById("poem-full");
  const linesEl = document.getElementById("poem-lines");
  const nextBtn = document.getElementById("poem-next");

  const esc = s => s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  // 比对答案：忽略空白与常见中英文标点
  const normalize = s => s.replace(/[\s，。！？、；：·「」『』“”‘’《》（）—…,.!?;:()"'-]/g, "");

  function poem() { return POEMS[level - 1]; }

  function renderSelect() {
    selectEl.innerHTML = POEMS.map((p, i) => {
      const lv = i + 1;
      const locked = lv > unlocked;
      return `<option value="${lv}"${lv === level ? " selected" : ""}${locked ? " disabled" : ""}>` +
        `${locked ? "🔒 " : ""}${tp("level").replace("{n}", lv)} · ${esc(p.title)}</option>`;
    }).join("");
  }

  function pickPair() {
    const lines = poem().lines;
    const i = Math.floor(Math.random() * (lines.length - 1));   // 0..len-2
    const dir = Math.random() < 0.5 ? "next" : "prev";
    // 给上句填下句：展示 i，答 i+1；给下句填上句：展示 i+1，答 i
    return dir === "next"
      ? { ask: "next", idx: i, answer: i + 1 }
      : { ask: "prev", idx: i + 1, answer: i };
  }

  function render() {
    const p = poem();
    progressEl.textContent = tp("progress").replace("{done}", unlocked - 1 + (finished ? 1 : 0));
    renderSelect();
    titleEl.textContent = `《${p.title}》`;
    authorEl.textContent = `${p.dynasty} · ${p.author}`;
    submitBtn.textContent = tp("submit");
    answerEl.placeholder = tp("answerPh");

    if (state === "playing") {
      quizEl.classList.remove("hidden");
      fullEl.classList.add("hidden");
      questionEl.innerHTML =
        `<span class="poem-known">${esc(p.lines[pair.idx])}</span>` +
        `<span class="poem-ask">${tp(pair.ask === "next" ? "askNext" : "askPrev")}</span>`;
    } else {
      quizEl.classList.add("hidden");
      fullEl.classList.remove("hidden");
      statusEl.textContent = "";
      linesEl.innerHTML =
        `<p class="poem-praise">${tp("correct")}</p>` +
        p.lines.map(l => `<p class="poem-line">${esc(l)}</p>`).join("");
      if (level >= TOTAL) {
        nextBtn.textContent = tp("allClear");
        nextBtn.disabled = true;
      } else {
        nextBtn.textContent = tp("next");
        nextBtn.disabled = false;
      }
    }
  }

  function loadLevel(n) {
    level = Math.max(1, Math.min(unlocked, n));
    store.set("poem-level", String(level));
    state = "playing";
    pair = pickPair();
    answerEl.value = "";
    statusEl.textContent = "";
    statusEl.className = "inbox-status";
    render();
  }

  function submit() {
    if (state !== "playing") return;
    const val = answerEl.value;
    if (!normalize(val)) {
      statusEl.textContent = tp("empty");
      statusEl.className = "inbox-status error";
      return;
    }
    if (normalize(val) === normalize(poem().lines[pair.answer])) {
      state = "passed";
      if (level === unlocked && unlocked < TOTAL) {
        unlocked++;
        store.set("poem-unlocked", String(unlocked));
      }
      if (level === TOTAL) {
        finished = true;
        store.set("poem-finished", "1");
      }
      render();
    } else {
      statusEl.textContent = tp("wrong");
      statusEl.className = "inbox-status error";
    }
  }

  submitBtn.addEventListener("click", submit);
  answerEl.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  nextBtn.addEventListener("click", () => {
    if (level < TOTAL) loadLevel(level + 1);
  });
  selectEl.addEventListener("change", () => loadLevel(Number(selectEl.value)));
  document.addEventListener("langchange", render);

  loadLevel(level);
})();
