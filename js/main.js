/* 站点逻辑：页面切换、笔记渲染与筛选、阅读弹层、生活时间线 */

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

// ===== 读书笔记：标签筛选 + 列表 =====
const tagFilterBox = document.getElementById("tag-filter");
const noteListBox = document.getElementById("note-list");

const allTags = ["全部", ...new Set(sortedNotes.flatMap(n => n.tags))];
let currentTag = "全部";

function renderTags() {
  tagFilterBox.innerHTML = allTags.map(t =>
    `<span class="tag ${t === currentTag ? "active" : ""}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`
  ).join("");
}

function renderNoteList() {
  const list = currentTag === "全部"
    ? sortedNotes
    : sortedNotes.filter(n => n.tags.includes(currentTag));
  noteListBox.innerHTML = list.map(note => `
    <div class="note-item" data-index="${sortedNotes.indexOf(note)}">
      <div>
        <h3>${escapeHtml(note.title)}</h3>
        <div class="note-tags">${note.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join("")}</div>
      </div>
      <span class="date">${note.date}</span>
    </div>
  `).join("");
}

renderTags();
renderNoteList();

tagFilterBox.addEventListener("click", e => {
  const tagEl = e.target.closest(".tag");
  if (!tagEl) return;
  currentTag = tagEl.dataset.tag;
  renderTags();
  renderNoteList();
});

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
