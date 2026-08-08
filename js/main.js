/* 站点逻辑：中英文切换、页面切换、笔记渲染与筛选、阅读弹层、生活时间线 */

// ===== 中英文切换 =====
const I18N = {
  zh: {
    logo: "小站",
    navHome: "首页",
    navLife: "生活碎碎念",
    heroTitle: "你好，欢迎来到我的小站",
    heroSub: "在这里记录生活，存放读过的书与想过的路。",
    sceneCaption: "今天也要好好吃饭，认真生活 🍜",
    lifeTitle: "生活碎碎念",
    momentsTitle: "我的碎碎念",
    footer: "© 2026 我的小站 · 用心记录每一天",
    navInbox: "留言信箱",
    inboxTitle: "留言信箱",
    navGame: "小游戏",
    gameTitle: "小游戏",
    tabSudoku: "数独",
    tabMiner: "黄金矿工",
    tabPvz: "植物大战僵尸",
    tabSweeper: "扫雷",
    tabSnake: "贪吃蛇",
    tabPoem: "古诗词",
    tabGomoku: "五子棋",
    tabMatch: "消消乐",
    backToGames: "← 返回游戏列表",
    levelPick: "选择关卡",
    navSpace: "你和我",
    spaceTitle: "你和我",
    navKids: "小朋友",
    kidsTitle: "小朋友专区",
    kidsCatExplore: "知识探索",
    kidsCatCraft: "创意手工",
    kidsCatGames: "互动游戏",
    kidsCatGrow: "成长陪伴",
    kidsCatStage: "展示舞台",
    kidsComingSoon: "这里还在筹备中，敬请期待～",
    kidsBack: "← 返回分类",
    kidsBackCols: "← 返回栏目",
    kidsBackGames: "← 返回游戏列表",
    kidsGameDoodle: "涂鸦画板",
    kidsGameMole: "打地鼠",
    kidsGameMath2: "口算 · 二年级下",
    kidsGameMath3: "口算 · 三年级下"
  },
  en: {
    logo: "My Corner",
    navHome: "Home",
    navLife: "Life Bits",
    heroTitle: "Hi, welcome to my corner",
    heroSub: "A place for my life, the books I've read, and the roads I've wandered.",
    sceneCaption: "Eat well, live well — one bowl at a time 🍜",
    lifeTitle: "Life Bits",
    momentsTitle: "My Life Bits",
    footer: "© 2026 My Corner · Recording every day with care",
    navInbox: "Guestbook",
    inboxTitle: "Guestbook",
    navGame: "Mini Game",
    gameTitle: "Mini Games",
    tabSudoku: "Sudoku",
    tabMiner: "Gold Miner",
    tabPvz: "Plants vs. Zombies",
    tabSweeper: "Minesweeper",
    tabSnake: "Snake",
    tabPoem: "Poetry",
    tabGomoku: "Gomoku",
    tabMatch: "Bear Match",
    backToGames: "← All games",
    levelPick: "Level",
    navSpace: "You & Me",
    spaceTitle: "You & Me",
    navKids: "Kids",
    kidsTitle: "Kids' Corner",
    kidsCatExplore: "Explore",
    kidsCatCraft: "Crafts",
    kidsCatGames: "Games",
    kidsCatGrow: "Growing Up",
    kidsCatStage: "On Stage",
    kidsComingSoon: "Still in the works — stay tuned~",
    kidsBack: "← Categories",
    kidsBackCols: "← Columns",
    kidsBackGames: "← Game list",
    kidsGameDoodle: "Doodle Pad",
    kidsGameMole: "Whack-a-Mole",
    kidsGameMath2: "Mental Math · Grade 2B",
    kidsGameMath3: "Mental Math · Grade 3B"
  }
};

let currentLang = localStorage.getItem("lang") || "en"; // 默认英文

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = I18N[lang][el.dataset.i18n] || el.textContent;
  });
  document.getElementById("lang-toggle").textContent = lang === "zh" ? "EN" : "中";
  document.dispatchEvent(new CustomEvent("langchange")); // 通知信箱等模块重绘
}

// ===== 单页导航切换 =====
const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

function switchPage(hash) {
  const target = (hash || "#home").slice(1);
  pages.forEach(p => p.classList.toggle("active", p.id === target));
  navLinks.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + target));
  window.scrollTo(0, 0);
}

navLinks.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    history.replaceState(null, "", link.getAttribute("href"));
    switchPage(link.getAttribute("href"));
  });
});
switchPage(location.hash);

// ===== 小游戏方框入口：网格 ↔ 游戏面板 =====
const gameGrid = document.getElementById("game-grid");
const gameBackBtn = document.getElementById("game-back");

function showGameGrid() {
  gameGrid.classList.remove("hidden");
  gameBackBtn.classList.add("hidden");
  document.querySelectorAll("#game .game-panel").forEach(p =>
    p.classList.remove("active"));
}

gameGrid.querySelectorAll(".game-box").forEach(box => {
  box.addEventListener("click", () => {
    gameGrid.classList.add("hidden");
    gameBackBtn.classList.remove("hidden");
    document.querySelectorAll("#game .game-panel").forEach(p =>
      p.classList.toggle("active", p.id === "panel-" + box.dataset.game));
  });
});

gameBackBtn.addEventListener("click", showGameGrid);

document.getElementById("lang-toggle").addEventListener("click", () => {
  applyLang(currentLang === "zh" ? "en" : "zh");
});

// ===== 工具 =====
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

applyLang(currentLang);

// ===== 生活碎碎念时间线 =====
const timelineBox = document.getElementById("life-timeline");
function renderTimeline() {
  // life.js 加载后接管渲染（在线数据 + 静态 MOMENTS 合并）
  if (typeof window.renderLifeTimeline === "function") {
    window.renderLifeTimeline();
    return;
  }
  timelineBox.innerHTML = [...MOMENTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(m => `
      <div class="timeline-item">
        <div class="date">${m.date}</div>
        <p>${escapeHtml(currentLang === "en" && m.text_en ? m.text_en : m.text)}</p>
      </div>
    `).join("");
}
renderTimeline();
document.addEventListener("langchange", renderTimeline);
