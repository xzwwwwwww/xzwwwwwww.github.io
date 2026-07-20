/* 扫雷小游戏：DOM 网格实现，四个难度
 * 依赖 main.js 的全局 currentLang；langchange 事件刷新文案
 */

(function () {
  const I18N = {
    zh: {
      levels: ["简单", "中等", "困难", "专家"],
      mines: "雷数",
      time: "时间",
      win: "🎉 恭喜，排雷成功！",
      lose: "💥 踩到雷了，再试一次！",
      restart: "重新开始",
      hint: "左键翻格 · 右键/长按插旗"
    },
    en: {
      levels: ["Easy", "Normal", "Hard", "Expert"],
      mines: "Mines",
      time: "Time",
      win: "🎉 You cleared the field!",
      lose: "💥 Boom! Try again!",
      restart: "Play again",
      hint: "Left-click to reveal · Right-click / long-press to flag"
    }
  };
  const tm = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const LEVELS = [
    { rows: 9,  cols: 9,  mines: 10 },
    { rows: 16, cols: 16, mines: 40 },
    { rows: 16, cols: 30, mines: 99 },
    { rows: 20, cols: 30, mines: 150 }
  ];

  const gridEl = document.getElementById("ms-grid");
  const minesEl = document.getElementById("ms-mines");
  const timeEl = document.getElementById("ms-time");
  const statusEl = document.getElementById("ms-status");
  const levelsEl = document.getElementById("ms-levels");
  const resetBtn = document.getElementById("ms-reset");
  const restartBtn = document.getElementById("ms-restart");

  let levelIdx = 0;
  let board = null;        // {mine, open, flag, n}
  let started = false, over = false;
  let openCount = 0, flagCount = 0;
  let seconds = 0, timerId = null;

  const L = () => LEVELS[levelIdx];
  const idx = (r, c) => r * L().cols + c;

  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < L().rows && nc >= 0 && nc < L().cols) out.push([nr, nc]);
      }
    return out;
  }

  function newGame() {
    clearInterval(timerId);
    seconds = 0; started = false; over = false;
    openCount = 0; flagCount = 0;
    board = Array.from({ length: L().rows * L().cols },
      () => ({ mine: false, open: false, flag: false, n: 0 }));
    resetBtn.textContent = "😀";
    restartBtn.classList.remove("show");
    restartBtn.textContent = tm("restart");
    statusEl.textContent = tm("hint");
    statusEl.className = "inbox-status";
    renderLevels();
    renderGrid();
    updateBar();
  }

  function renderLevels() {
    levelsEl.innerHTML = tm("levels").map((name, i) =>
      `<button class="ms-level ${i === levelIdx ? "active" : ""}" data-level="${i}">${name}</button>`
    ).join("");
  }

  function renderGrid() {
    gridEl.style.gridTemplateColumns = `repeat(${L().cols}, 30px)`;
    gridEl.innerHTML = board.map((_, i) =>
      `<div class="ms-cell" data-i="${i}"></div>`).join("");
  }

  function updateBar() {
    minesEl.textContent = `${tm("mines")}: ${L().mines - flagCount}`;
    timeEl.textContent = `${tm("time")}: ${seconds}`;
  }

  function placeMines(sr, sc) {
    const banned = new Set([idx(sr, sc), ...neighbors(sr, sc).map(([r, c]) => idx(r, c))]);
    let placed = 0;
    while (placed < L().mines) {
      const i = Math.floor(Math.random() * board.length);
      if (banned.has(i) || board[i].mine) continue;
      board[i].mine = true;
      placed++;
    }
    for (let r = 0; r < L().rows; r++)
      for (let c = 0; c < L().cols; c++) {
        board[idx(r, c)].n = neighbors(r, c).filter(([nr, nc]) => board[idx(nr, nc)].mine).length;
      }
  }

  function cellEl(i) { return gridEl.children[i]; }

  function paint(i) {
    const cell = board[i], el = cellEl(i);
    el.classList.toggle("open", cell.open);
    el.classList.toggle("flag", cell.flag && !cell.open);
    if (cell.open) {
      el.textContent = cell.mine ? "💥" : (cell.n || "");
      if (!cell.mine && cell.n) el.dataset.n = cell.n;
    } else {
      el.textContent = cell.flag ? "🚩" : "";
    }
  }

  function openCell(r, c) {
    if (over) return;
    const cell = board[idx(r, c)];
    if (cell.open || cell.flag) return;
    if (!started) {
      placeMines(r, c);
      started = true;
      timerId = setInterval(() => { seconds++; updateBar(); }, 1000);
    }
    if (cell.mine) { gameOver(false); return; }

    // 连片展开
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const cur = board[idx(cr, cc)];
      if (cur.open || cur.flag) continue;
      cur.open = true;
      openCount++;
      paint(idx(cr, cc));
      if (cur.n === 0) neighbors(cr, cc).forEach(([nr, nc]) => {
        if (!board[idx(nr, nc)].open) stack.push([nr, nc]);
      });
    }
    if (openCount === board.length - L().mines) gameOver(true);
  }

  function toggleFlag(r, c) {
    if (over) return;
    const cell = board[idx(r, c)];
    if (cell.open) return;
    cell.flag = !cell.flag;
    flagCount += cell.flag ? 1 : -1;
    paint(idx(r, c));
    updateBar();
  }

  function gameOver(win) {
    over = true;
    clearInterval(timerId);
    resetBtn.textContent = win ? "😎" : "😵";
    if (!win) {
      board.forEach((cell, i) => {
        if (cell.mine && !cell.flag) { cell.open = true; paint(i); }
      });
    }
    statusEl.textContent = tm(win ? "win" : "lose");
    statusEl.className = "inbox-status " + (win ? "ok" : "error");
    if (!win) {
      restartBtn.textContent = tm("restart");
      restartBtn.classList.add("show");
    }
  }

  // ===== 事件 =====
  levelsEl.addEventListener("click", e => {
    const btn = e.target.closest("[data-level]");
    if (!btn) return;
    levelIdx = Number(btn.dataset.level);
    newGame();
  });

  resetBtn.addEventListener("click", newGame);
  restartBtn.addEventListener("click", newGame);

  gridEl.addEventListener("click", e => {
    const el = e.target.closest(".ms-cell");
    if (!el) return;
    const i = Number(el.dataset.i);
    openCell(Math.floor(i / L().cols), i % L().cols);
  });

  gridEl.addEventListener("contextmenu", e => {
    e.preventDefault();
    const el = e.target.closest(".ms-cell");
    if (!el) return;
    const i = Number(el.dataset.i);
    toggleFlag(Math.floor(i / L().cols), i % L().cols);
  });

  // 手机长按插旗
  let pressTimer = null, longPressed = false;
  gridEl.addEventListener("touchstart", e => {
    const el = e.target.closest(".ms-cell");
    if (!el) return;
    longPressed = false;
    const i = Number(el.dataset.i);
    pressTimer = setTimeout(() => {
      longPressed = true;
      toggleFlag(Math.floor(i / L().cols), i % L().cols);
    }, 450);
  }, { passive: true });
  gridEl.addEventListener("touchend", () => clearTimeout(pressTimer));
  gridEl.addEventListener("touchmove", () => clearTimeout(pressTimer));
  gridEl.addEventListener("click", e => {
    if (longPressed) { e.stopImmediatePropagation(); longPressed = false; }
  }, true);

  document.addEventListener("langchange", () => {
    renderLevels();
    updateBar();
    restartBtn.textContent = tm("restart");
    if (!over) statusEl.textContent = tm("hint");
  });

  newGame();
})();
