/* 数独小游戏：50 关，从易到难
 * 题库在 js/sudoku-data.js（SUDOKU_LEVELS，离线生成且逐题验证唯一解）
 * 通关解锁下一关，进度存 localStorage；支持笔记、提示（每关 3 次）、重置、计时与最佳成绩
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 */

(function () {
  const I18N = {
    zh: {
      level: "第 {n} 关",
      difficulty: "难度",
      time: "用时 {t}",
      notes: "笔记",
      erase: "擦除",
      hint: "提示（{n}）",
      reset: "重置",
      solved: "🎉 过关！用时 {t}",
      best: "本关最佳：{t}",
      next: "下一关",
      allClear: "🏆 恭喜，50 关全部通关！"
    },
    en: {
      level: "Level {n}",
      difficulty: "Difficulty",
      time: "Time {t}",
      notes: "Notes",
      erase: "Erase",
      hint: "Hint ({n})",
      reset: "Reset",
      solved: "🎉 Solved! Time {t}",
      best: "Best for this level: {t}",
      next: "Next level",
      allClear: "🏆 All 50 levels cleared!"
    }
  };
  const tp = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const TOTAL = SUDOKU_LEVELS.length;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // 进度：{ u: 已解锁到第几关, done: [已通关关卡号] }
  let progress = { u: 1, done: [] };
  try {
    const p = JSON.parse(store.get("sudokuProgress") || "null");
    if (p && p.u >= 1) progress = { u: Math.min(TOTAL, p.u), done: Array.isArray(p.done) ? p.done : [] };
  } catch (e) {}
  let best = {};   // { 关卡号: 秒 }
  try { best = JSON.parse(store.get("sudokuBest") || "{}") || {}; } catch (e) {}

  const levelsEl = document.getElementById("sudoku-levels");
  const levelLabelEl = document.getElementById("sudoku-level-label");
  const starsEl = document.getElementById("sudoku-stars");
  const timeEl = document.getElementById("sudoku-time");
  const boardEl = document.getElementById("sudoku-board");
  const padEl = document.getElementById("sudoku-pad");
  const notesBtn = document.getElementById("sudoku-notes");
  const eraseBtn = document.getElementById("sudoku-erase");
  const hintBtn = document.getElementById("sudoku-hint");
  const resetBtn = document.getElementById("sudoku-reset");
  const winEl = document.getElementById("sudoku-win");
  const winTextEl = document.getElementById("sudoku-win-text");
  const winBestEl = document.getElementById("sudoku-win-best");
  const nextBtn = document.getElementById("sudoku-next");

  let level = Math.min(progress.u, TOTAL);
  let values = [];    // 81 格当前数字，0 为空
  let givens = [];    // 81 格是否给定（含提示填入，均不可改）
  let hinted = [];    // 81 格是否为提示填入
  let notes = [];     // 81 格笔记数组
  let selected = -1;
  let notesMode = false;
  let hintsLeft = 3;
  let seconds = 0;
  let timerId = null;
  let solved = false;

  // 建棋盘（81 个 div）与数字键盘，只建一次
  const cells = [];
  for (let i = 0; i < 81; i++) {
    const d = document.createElement("div");
    d.className = "sudoku-cell";
    d.addEventListener("click", () => { select(i); renderBoard(); });
    boardEl.appendChild(d);
    cells.push(d);
  }
  const padBtns = [];
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement("button");
    b.className = "sudoku-num";
    b.textContent = n;
    b.addEventListener("click", () => input(n));
    padEl.appendChild(b);
    padBtns.push(b);
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const solution = () => SUDOKU_LEVELS[level - 1].solution;

  function sameBox(a, b) {
    return Math.floor(a / 27) === Math.floor(b / 27) &&
           Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3);
  }

  function select(i) {
    if (solved) return;
    selected = (selected === i) ? -1 : i;
  }

  function renderLevels() {
    levelsEl.innerHTML = "";
    for (let lv = 1; lv <= TOTAL; lv++) {
      const b = document.createElement("button");
      b.className = "ms-level" + (lv === level ? " active" : "");
      b.textContent = progress.done.includes(lv) ? lv + "✓" : lv;
      b.disabled = lv > progress.u;
      b.addEventListener("click", () => loadLevel(lv));
      levelsEl.appendChild(b);
    }
  }

  function renderInfo() {
    levelLabelEl.textContent = tp("level").replace("{n}", level);
    starsEl.textContent = tp("difficulty") + " " + "★".repeat(Math.ceil(level / 10));
    timeEl.textContent = tp("time").replace("{t}", fmt(seconds));
  }

  function renderTools() {
    notesBtn.textContent = tp("notes");
    notesBtn.classList.toggle("on", notesMode);
    eraseBtn.textContent = tp("erase");
    hintBtn.textContent = tp("hint").replace("{n}", hintsLeft);
    hintBtn.disabled = hintsLeft <= 0 || solved;
    resetBtn.textContent = tp("reset");
  }

  function renderBoard() {
    const selVal = selected >= 0 ? values[selected] : 0;
    // 只有全部填满（未过关）时才标红错误格，填写过程中不提示
    const full = values.every(v => v > 0);
    for (let i = 0; i < 81; i++) {
      const c = cells[i];
      let cls = "sudoku-cell";
      if (givens[i]) cls += hinted[i] ? " hinted" : " given";
      if (i === selected) cls += " selected";
      else if (selected >= 0) {
        const r = Math.floor(i / 9), col = i % 9;
        const sr = Math.floor(selected / 9), sc = selected % 9;
        if (r === sr || col === sc || sameBox(i, selected)) cls += " peer";
        if (selVal && values[i] === selVal) cls += " same";
      }
      if (full && values[i] && !givens[i] && String(values[i]) !== solution()[i]) cls += " error";
      c.className = cls;

      if (values[i]) {
        c.textContent = values[i];
      } else if (notes[i].length) {
        c.innerHTML = '<div class="sudoku-notes">' +
          Array.from({ length: 9 }, (_, n) =>
            `<span>${notes[i].includes(n + 1) ? n + 1 : ""}</span>`).join("") +
          "</div>";
      } else {
        c.textContent = "";
      }
    }
  }

  function renderAll() {
    renderLevels();
    renderInfo();
    renderTools();
    renderBoard();
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      seconds++;
      timeEl.textContent = tp("time").replace("{t}", fmt(seconds));
    }, 1000);
  }

  function loadLevel(n) {
    level = Math.max(1, Math.min(progress.u, n));
    const puzzle = SUDOKU_LEVELS[level - 1].puzzle;
    values = puzzle.split("").map(Number);
    givens = values.map(v => v > 0);
    hinted = values.map(() => false);
    notes = values.map(() => []);
    selected = -1;
    notesMode = false;
    hintsLeft = 3;
    seconds = 0;
    solved = false;
    winEl.classList.add("hidden");
    startTimer();
    renderAll();
  }

  function input(n) {
    if (solved || selected < 0 || givens[selected]) return;
    if (notesMode) {
      const idx = notes[selected].indexOf(n);
      if (idx >= 0) notes[selected].splice(idx, 1);
      else notes[selected].push(n);
    } else {
      if (values[selected] === n) return;
      values[selected] = n;
      notes[selected] = [];
      checkWin();
    }
    renderBoard();
  }

  function erase() {
    if (solved || selected < 0 || givens[selected]) return;
    values[selected] = 0;
    notes[selected] = [];
    renderBoard();
  }

  function hint() {
    if (solved || hintsLeft <= 0) return;
    const empties = [];
    for (let i = 0; i < 81; i++) if (!values[i]) empties.push(i);
    if (!empties.length) return;
    const i = empties[Math.floor(Math.random() * empties.length)];
    values[i] = Number(solution()[i]);
    givens[i] = true;
    hinted[i] = true;
    notes[i] = [];
    hintsLeft--;
    selected = i;
    renderTools();
    renderBoard();
    checkWin();
  }

  function checkWin() {
    for (let i = 0; i < 81; i++) {
      if (String(values[i]) !== solution()[i]) return;
    }
    solved = true;
    clearInterval(timerId);
    if (!progress.done.includes(level)) {
      progress.done.push(level);
    }
    if (level === progress.u && progress.u < TOTAL) progress.u++;
    store.set("sudokuProgress", JSON.stringify(progress));
    const prevBest = best[level];
    if (!prevBest || seconds < prevBest) {
      best[level] = seconds;
      store.set("sudokuBest", JSON.stringify(best));
    }
    winTextEl.textContent = tp("solved").replace("{t}", fmt(seconds));
    winBestEl.textContent = tp("best").replace("{t}", fmt(best[level]));
    if (level >= TOTAL) {
      nextBtn.textContent = tp("allClear");
      nextBtn.disabled = true;
    } else {
      nextBtn.textContent = tp("next");
      nextBtn.disabled = false;
    }
    winEl.classList.remove("hidden");
    renderLevels();
    renderTools();
  }

  notesBtn.addEventListener("click", () => {
    notesMode = !notesMode;
    renderTools();
  });
  eraseBtn.addEventListener("click", erase);
  hintBtn.addEventListener("click", hint);
  resetBtn.addEventListener("click", () => loadLevel(level));
  nextBtn.addEventListener("click", () => {
    if (level < TOTAL) loadLevel(level + 1);
  });

  // 键盘操作：仅数独面板激活时响应
  document.addEventListener("keydown", e => {
    if (!document.getElementById("panel-sudoku").classList.contains("active")) return;
    if (e.key >= "1" && e.key <= "9") input(Number(e.key));
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") erase();
    else if (e.key === "n" || e.key === "N") { notesMode = !notesMode; renderTools(); }
    else if (e.key.startsWith("Arrow") && selected >= 0) {
      const r = Math.floor(selected / 9), c = selected % 9;
      const d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      const nr = r + (d === -9 ? -1 : d === 9 ? 1 : 0);
      const nc = c + (d === -1 ? -1 : d === 1 ? 1 : 0);
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
        selected += d;
        renderBoard();
      }
      e.preventDefault();
    }
  });

  document.addEventListener("langchange", () => {
    renderAll();
    if (solved) {
      winTextEl.textContent = tp("solved").replace("{t}", fmt(seconds));
      winBestEl.textContent = tp("best").replace("{t}", fmt(best[level]));
      nextBtn.textContent = level >= TOTAL ? tp("allClear") : tp("next");
    }
  });

  loadLevel(level);
})();