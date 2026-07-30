/* 留言信箱逻辑：访客提交、公开留言墙、站长登录与审核管理
 * 依赖：supabase-js CDN（window.supabase）、config.js、main.js（escapeHtml / currentLang）
 */

// ===== 文案（跟随 main.js 的 currentLang，langchange 事件触发重绘） =====
const INBOX_I18N = {
  zh: {
    notConfigured: "站长还没有配置留言后端，信箱暂未开放。",
    namePlaceholder: "你的昵称（1~20 字）",
    contentPlaceholder: "想对我说的话…（1~500 字）",
    submit: "投递留言",
    submitting: "投递中…",
    submitOk: "留言已投递，站长审核后会公开展示 ✉️",
    submitFail: "投递失败，请稍后再试。",
    inputInvalid: "请填写昵称（1~20 字）和留言内容（1~500 字）。",
    wallEmpty: "还没有留言，来抢沙发～",
    ownerReply: "站长回复",
    ownerToggle: "站长登录",
    ownerLogout: "退出登录",
    emailPlaceholder: "站长邮箱",
    pwdPlaceholder: "密码",
    login: "登录",
    loginFail: "登录失败，请检查邮箱和密码。",
    tabPending: "待审核",
    tabApproved: "已展示",
    tabHidden: "已隐藏",
    listEmpty: "这里空空如也。",
    approve: "通过",
    hide: "隐藏",
    restore: "恢复展示",
    saveReply: "保存回复",
    del: "删除",
    replyPlaceholder: "写下你的回复…（可选，会公开展示）",
    confirmDelete: "确定删除这条留言吗？删除后不可恢复。",
    loadFail: "加载失败，请刷新重试。"
  },
  en: {
    notConfigured: "The owner hasn't set up the message backend yet.",
    namePlaceholder: "Your nickname (1-20 chars)",
    contentPlaceholder: "Something you want to tell me… (1-500 chars)",
    submit: "Send",
    submitting: "Sending…",
    submitOk: "Message sent! It will appear once the owner approves it ✉️",
    submitFail: "Failed to send. Please try again later.",
    inputInvalid: "Please enter a nickname (1-20 chars) and a message (1-500 chars).",
    wallEmpty: "No messages yet — be the first!",
    ownerReply: "Owner's reply",
    ownerToggle: "Owner Login",
    ownerLogout: "Log out",
    emailPlaceholder: "Owner email",
    pwdPlaceholder: "Password",
    login: "Log in",
    loginFail: "Login failed. Check your email and password.",
    tabPending: "Pending",
    tabApproved: "Published",
    tabHidden: "Hidden",
    listEmpty: "Nothing here.",
    approve: "Approve",
    hide: "Hide",
    restore: "Publish",
    saveReply: "Save reply",
    del: "Delete",
    replyPlaceholder: "Write your reply… (optional, shown publicly)",
    confirmDelete: "Delete this message forever?",
    loadFail: "Failed to load. Please refresh."
  }
};

function ti(key) {
  return (INBOX_I18N[currentLang] || INBOX_I18N.zh)[key] || key;
}

// ===== 初始化 =====
const inboxConfigured =
  typeof SUPABASE_URL === "string" &&
  !SUPABASE_URL.startsWith("YOUR_") &&
  typeof SUPABASE_ANON_KEY === "string" &&
  !SUPABASE_ANON_KEY.startsWith("YOUR_");

const sb = inboxConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const els = {
  username: document.getElementById("msg-username"),
  content: document.getElementById("msg-content"),
  submit: document.getElementById("msg-submit"),
  status: document.getElementById("msg-status"),
  wall: document.getElementById("msg-wall"),
  ownerToggle: document.getElementById("owner-toggle"),
  ownerPanel: document.getElementById("owner-panel")
};

let ownerSession = null;
let adminTab = "pending";

function fmtDate(iso) {
  const d = new Date(iso);
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ===== 静态文案渲染 =====
function renderInboxStatic() {
  els.username.placeholder = ti("namePlaceholder");
  els.content.placeholder = ti("contentPlaceholder");
  els.submit.textContent = ti("submit");
  els.ownerToggle.textContent = ownerSession ? ti("ownerLogout") : ti("ownerToggle");
}

// ===== 公开留言墙 =====
async function loadWall() {
  if (!inboxConfigured) {
    els.wall.innerHTML = `<p class="inbox-notice">${ti("notConfigured")}</p>`;
    els.submit.disabled = true;
    return;
  }
  const { data, error } = await sb
    .from("messages")
    .select("username, content, reply, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) {
    els.wall.innerHTML = `<p class="inbox-notice">${ti("loadFail")}</p>`;
    return;
  }
  if (!data.length) {
    els.wall.innerHTML = `<p class="inbox-notice">${ti("wallEmpty")}</p>`;
    return;
  }
  els.wall.innerHTML = data.map(m => `
    <div class="msg-card">
      <div class="msg-head"><b>${escapeHtml(m.username)}</b><span>${fmtDate(m.created_at)}</span></div>
      <p class="msg-body">${escapeHtml(m.content)}</p>
      ${m.reply ? `<div class="msg-reply"><b>${ti("ownerReply")}：</b>${escapeHtml(m.reply)}</div>` : ""}
    </div>
  `).join("");
}

// ===== 访客提交留言 =====
els.submit.addEventListener("click", async () => {
  const username = els.username.value.trim();
  const content = els.content.value.trim();
  if (!username || username.length > 20 || !content || content.length > 500) {
    els.status.textContent = ti("inputInvalid");
    els.status.className = "inbox-status error";
    return;
  }
  els.submit.disabled = true;
  els.submit.textContent = ti("submitting");
  const { error } = await sb.from("messages").insert({ username, content });
  els.submit.disabled = false;
  els.submit.textContent = ti("submit");
  if (error) {
    els.status.textContent = ti("submitFail");
    els.status.className = "inbox-status error";
  } else {
    els.status.textContent = ti("submitOk");
    els.status.className = "inbox-status ok";
    els.content.value = "";
  }
});

// ===== 站长登录 / 登出 =====
els.ownerToggle.addEventListener("click", async () => {
  if (ownerSession) {
    await sb.auth.signOut();
    ownerSession = null;
    els.ownerPanel.classList.add("hidden");
    renderInboxStatic();
    return;
  }
  els.ownerPanel.classList.toggle("hidden");
  if (!els.ownerPanel.classList.contains("hidden")) renderOwnerPanel();
});

async function ownerLogin() {
  const email = document.getElementById("owner-email").value.trim();
  const password = document.getElementById("owner-password").value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("owner-login-status").textContent = ti("loginFail");
    return;
  }
  ownerSession = data.session;
  renderInboxStatic();
  renderOwnerPanel();
}

// ===== 站长管理面板 =====
async function renderOwnerPanel() {
  if (!ownerSession) {
    els.ownerPanel.innerHTML = `
      <div class="owner-login">
        <input id="owner-email" type="email" placeholder="${ti("emailPlaceholder")}">
        <input id="owner-password" type="password" placeholder="${ti("pwdPlaceholder")}">
        <button id="owner-login-btn">${ti("login")}</button>
        <p id="owner-login-status" class="inbox-status error"></p>
      </div>
    `;
    document.getElementById("owner-login-btn").addEventListener("click", ownerLogin);
    return;
  }

  const { data, error } = await sb
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    els.ownerPanel.innerHTML = `<p class="inbox-notice">${ti("loadFail")}</p>`;
    return;
  }

  const counts = { pending: 0, approved: 0, hidden: 0 };
  data.forEach(m => counts[m.status]++);
  const tabs = [
    ["pending", ti("tabPending")],
    ["approved", ti("tabApproved")],
    ["hidden", ti("tabHidden")]
  ];
  const list = data.filter(m => m.status === adminTab);

  els.ownerPanel.innerHTML = `
    <div class="admin-tabs">
      ${tabs.map(([key, label]) => `
        <button class="admin-tab ${key === adminTab ? "active" : ""}" data-tab="${key}">
          ${label} (${counts[key]})
        </button>
      `).join("")}
    </div>
    <div class="admin-list">
      ${list.length ? list.map(m => `
        <div class="admin-item" data-id="${m.id}">
          <div class="msg-head">
            <b>${escapeHtml(m.username)}</b><span>${fmtDate(m.created_at)}</span>
          </div>
          <p class="msg-body">${escapeHtml(m.content)}</p>
          <textarea class="reply-input" rows="2" placeholder="${ti("replyPlaceholder")}">${escapeHtml(m.reply || "")}</textarea>
          <div class="admin-actions">
            ${m.status === "pending" ? `<button data-act="approve">${ti("approve")}</button>` : ""}
            ${m.status === "hidden" ? `<button data-act="approve">${ti("restore")}</button>` : ""}
            ${m.status !== "hidden" ? `<button data-act="hide">${ti("hide")}</button>` : ""}
            <button data-act="reply">${ti("saveReply")}</button>
            <button data-act="delete" class="danger">${ti("del")}</button>
          </div>
        </div>
      `).join("") : `<p class="inbox-notice">${ti("listEmpty")}</p>`}
    </div>
  `;
}

els.ownerPanel.addEventListener("click", async e => {
  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) {
    adminTab = tabBtn.dataset.tab;
    renderOwnerPanel();
    return;
  }
  const actBtn = e.target.closest("[data-act]");
  if (!actBtn) return;
  const item = actBtn.closest(".admin-item");
  const id = item.dataset.id;
  const act = actBtn.dataset.act;

  if (act === "delete") {
    if (!confirm(ti("confirmDelete"))) return;
    await sb.from("messages").delete().eq("id", id);
  } else if (act === "reply") {
    const reply = item.querySelector(".reply-input").value.trim();
    await sb.from("messages").update({ reply: reply || null }).eq("id", id);
  } else {
    await sb.from("messages").update({ status: act === "approve" ? "approved" : "hidden" }).eq("id", id);
  }
  renderOwnerPanel();
  loadWall();
});

// ===== 启动 =====
(async function initInbox() {
  renderInboxStatic();
  if (inboxConfigured) {
    const { data } = await sb.auth.getSession();
    ownerSession = data.session;
    renderInboxStatic();
    if (ownerSession) {
      els.ownerPanel.classList.remove("hidden");
      renderOwnerPanel();
    }
  } else {
    els.ownerToggle.classList.add("hidden");
  }
  loadWall();
})();

// 语言切换时重绘
document.addEventListener("langchange", () => {
  renderInboxStatic();
  loadWall();
  if (!els.ownerPanel.classList.contains("hidden")) renderOwnerPanel();
});
