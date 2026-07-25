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
    recentTitle: "最近更新",
    lifeTitle: "生活碎碎念",
    footer: "© 2026 我的小站 · 用心记录每一天",
    navInbox: "留言信箱",
    inboxTitle: "留言信箱",
    navGame: "小游戏",
    gameTitle: "小游戏",
    tabMiner: "黄金矿工",
    tabPvz: "植物大战僵尸",
    tabSweeper: "扫雷",
    tabSnake: "贪吃蛇",
    tabPoem: "古诗词",
    navSpace: "你和我",
    spaceTitle: "你和我"
  },
  en: {
    logo: "My Corner",
    navHome: "Home",
    navLife: "Life Bits",
    heroTitle: "Hi, welcome to my corner",
    heroSub: "A place for my life, the books I've read, and the roads I've wandered.",
    sceneCaption: "Eat well, live well — one bowl at a time 🍜",
    recentTitle: "Recent Updates",
    lifeTitle: "Life Bits",
    footer: "© 2026 My Corner · Recording every day with care",
    navInbox: "Guestbook",
    inboxTitle: "Guestbook",
    navGame: "Mini Game",
    gameTitle: "Mini Games",
    tabMiner: "Gold Miner",
    tabPvz: "Plants vs. Zombies",
    tabSweeper: "Minesweeper",
    tabSnake: "Snake",
    tabPoem: "Poetry",
    navSpace: "You & Me",
    spaceTitle: "You & Me"
  }
};

let currentLang = localStorage.getItem("lang") || "zh";

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

// ===== 小游戏标签切换 =====
document.querySelectorAll(".game-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".game-tab").forEach(t =>
      t.classList.toggle("active", t === tab));
    document.querySelectorAll(".game-panel").forEach(p =>
      p.classList.toggle("active", p.id === "panel-" + tab.dataset.game));
  });
});

document.getElementById("lang-toggle").addEventListener("click", () => {
  applyLang(currentLang === "zh" ? "en" : "zh");
});

// ===== 工具 =====
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const sortedNotes = [...NOTES].sort((a, b) => b.date.localeCompare(a.date));

// ===== 首页：最近更新的三篇 =====
const recentBox = document.getElementById("recent-notes");
recentBox.innerHTML = sortedNotes.slice(0, 3).map((note, i) => `
  <div class="card" data-index="${sortedNotes.indexOf(note)}">
    <h3>${escapeHtml(note.title)}</h3>
    <p class="meta">${note.date} · ${note.tags.map(escapeHtml).join(" / ")}</p>
    <p class="excerpt">${escapeHtml(note.excerpt)}</p>
  </div>
`).join("");

applyLang(currentLang);

// ===== 阅读弹层 =====
const reader = document.getElementById("reader");
const readerTitle = document.getElementById("reader-title");
const readerMeta = document.getElementById("reader-meta");
const readerBody = document.getElementById("reader-body");

function openNote(index) {
  const note = sortedNotes[index];
  readerTitle.textContent = note.title;
  readerMeta.textContent = `${note.date} · ${note.tags.join(" / ")}`;
  readerBody.innerHTML = note.content.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  reader.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReader() {
  reader.classList.add("hidden");
  document.body.style.overflow = "";
}

document.addEventListener("click", e => {
  const item = e.target.closest("[data-index]");
  if (item) openNote(Number(item.dataset.index));
});
document.getElementById("reader-close").addEventListener("click", closeReader);
reader.addEventListener("click", e => { if (e.target === reader) closeReader(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeReader(); });

// ===== 生活记录时间线 =====
const timelineBox = document.getElementById("life-timeline");
timelineBox.innerHTML = [...MOMENTS]
  .sort((a, b) => b.date.localeCompare(a.date))
  .map(m => `
    <div class="timeline-item">
      <div class="date">${m.date}</div>
      <p>${escapeHtml(m.text)}</p>
    </div>
  `).join("");
