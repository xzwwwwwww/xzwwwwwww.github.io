/* 「你和我」：前端校验登录，不同账号看到不同内容
 * 账号与内容在 js/space-data.js；登录状态存 sessionStorage（关标签页即失效）
 * 每条内容下方可留言（带时间），留言存在 Supabase 的 space_comments 表
 * 依赖 main.js 的全局 currentLang 与 langchange 事件
 */

(function () {
  const I18N = {
    zh: {
      userPh: "用户名",
      passPh: "密码",
      login: "进入",
      logout: "退出登录",
      wrong: "用户名或密码不对，再试一次",
      empty: "还没有内容，等站长慢慢添加～",
      hint: "这是属于你们的私密角落，输入账号密码进入",
      commentPh: "在这条下面说点什么…",
      send: "留言",
      sending: "发送中…",
      sendFail: "发送失败，请稍后再试",
      noComment: "还没有留言",
      commentOff: "留言功能暂未开放（站长还没配置数据库）"
    },
    en: {
      userPh: "Username",
      passPh: "Password",
      login: "Enter",
      logout: "Log out",
      wrong: "Wrong username or password, try again",
      empty: "Nothing here yet — coming soon~",
      hint: "A private corner for you two. Sign in to enter.",
      commentPh: "Say something here…",
      send: "Post",
      sending: "Posting…",
      sendFail: "Failed to post, please try again",
      noComment: "No comments yet",
      commentOff: "Comments unavailable (database not configured)"
    }
  };
  const ts = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const loginCard = document.getElementById("space-login");
  const userInput = document.getElementById("space-username");
  const passInput = document.getElementById("space-password");
  const loginBtn = document.getElementById("space-login-btn");
  const statusEl = document.getElementById("space-status");
  const hintEl = document.getElementById("space-hint");
  const contentBox = document.getElementById("space-content");

  // Supabase 客户端（config.js + CDN 均已加载时才可用）
  const sb = (window.supabase && typeof SUPABASE_URL !== "undefined" &&
              SUPABASE_URL && SUPABASE_ANON_KEY)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const sess = {
    get() { try { return sessionStorage.getItem("space-user"); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem("space-user", v); } catch (e) {} },
    clear() { try { sessionStorage.removeItem("space-user"); } catch (e) {} }
  };

  const esc = s => s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  // 留言时间：本地时区 YYYY-MM-DD HH:mm
  function fmtTime(iso) {
    const d = new Date(iso);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function currentUser() {
    const name = sess.get();
    return SPACE_USERS.find(u => u.username === name) || null;
  }

  // 条目的稳定标识：日期 + 标题（调整条目顺序不影响留言归属）
  const entryKey = e => `${e.date}|${e.title}`;

  function renderLogin() {
    userInput.placeholder = ts("userPh");
    passInput.placeholder = ts("passPh");
    loginBtn.textContent = ts("login");
    hintEl.textContent = ts("hint");
  }

  function commentListHtml(list) {
    if (!list.length) return `<p class="sc-none">${ts("noComment")}</p>`;
    return list.map(c => `
      <div class="sc-item">
        <span class="sc-author">${esc(c.author)}</span>
        <span class="sc-time">${fmtTime(c.created_at)}</span>
        <p class="sc-text">${esc(c.content)}</p>
      </div>
    `).join("");
  }

  async function loadComments(user) {
    if (!sb) return;
    const { data, error } = await sb
      .from("space_comments")
      .select("*")
      .eq("username", user.username)
      .order("created_at", { ascending: true });
    if (error) return;
    contentBox.querySelectorAll(".sc-list").forEach(el => {
      const key = el.dataset.key;
      el.innerHTML = commentListHtml((data || []).filter(c => c.entry_key === key));
    });
  }

  async function sendComment(user, key, input, btn) {
    const content = input.value.trim();
    if (!content || content.length > 500) return;
    btn.disabled = true;
    btn.textContent = ts("sending");
    const { error } = await sb.from("space_comments").insert({
      username: user.username,
      entry_key: key,
      author: user.nickname || user.username,
      content
    });
    btn.disabled = false;
    btn.textContent = ts("send");
    if (error) {
      input.value = "";
      input.placeholder = ts("sendFail");
      return;
    }
    input.value = "";
    loadComments(user);
  }

  function renderContent(user) {
    const entries = [...user.entries].sort((a, b) => b.date.localeCompare(a.date));
    contentBox.innerHTML = `
      <div class="space-head">
        <h3 class="space-label">${esc(user.label)}</h3>
        <button id="space-logout" class="inbox-submit">${ts("logout")}</button>
      </div>
      ${entries.length ? entries.map(e => `
        <article class="space-entry">
          <div class="space-entry-head">
            <h4>${esc(e.title)}</h4>
            <span class="date">${esc(e.date)}</span>
          </div>
          ${(e.text || []).map(p => `<p>${esc(p)}</p>`).join("")}
          ${(e.photos || []).map(src => `<img src="${esc(src)}" alt="" loading="lazy">`).join("")}
          <div class="space-comments">
            <div class="sc-list" data-key="${esc(entryKey(e))}">
              <p class="sc-none">…</p>
            </div>
            ${sb ? `
              <div class="sc-form">
                <input class="sc-input" type="text" maxlength="500" placeholder="${ts("commentPh")}">
                <button class="inbox-submit sc-send" data-key="${esc(entryKey(e))}">${ts("send")}</button>
              </div>
            ` : `<p class="sc-none">${ts("commentOff")}</p>`}
          </div>
        </article>
      `).join("") : `<p class="space-empty">${ts("empty")}</p>`}
    `;
    document.getElementById("space-logout").addEventListener("click", () => {
      sess.clear();
      passInput.value = "";
      statusEl.textContent = "";
      render();
    });
    if (sb) {
      contentBox.querySelectorAll(".sc-send").forEach(btn => {
        btn.addEventListener("click", () => {
          const input = btn.parentElement.querySelector(".sc-input");
          sendComment(user, btn.dataset.key, input, btn);
        });
      });
      contentBox.querySelectorAll(".sc-input").forEach(input => {
        input.addEventListener("keydown", e => {
          if (e.key === "Enter") {
            const btn = input.parentElement.querySelector(".sc-send");
            sendComment(user, btn.dataset.key, input, btn);
          }
        });
      });
      loadComments(user);
    }
  }

  function render() {
    const user = currentUser();
    loginCard.classList.toggle("hidden", !!user);
    contentBox.classList.toggle("hidden", !user);
    renderLogin();
    if (user) renderContent(user);
  }

  function tryLogin() {
    const u = userInput.value.trim();
    const p = passInput.value;
    const user = SPACE_USERS.find(x => x.username === u && x.password === p);
    if (!user) {
      statusEl.textContent = ts("wrong");
      statusEl.className = "inbox-status error";
      return;
    }
    sess.set(user.username);
    statusEl.textContent = "";
    statusEl.className = "inbox-status";
    passInput.value = "";
    render();
  }

  loginBtn.addEventListener("click", tryLogin);
  passInput.addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
  userInput.addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });

  document.addEventListener("langchange", render);

  render();
})();
