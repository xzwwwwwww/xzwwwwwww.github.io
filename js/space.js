/* 「你和我」：前端校验登录，不同账号看到不同内容
 * 账号与内容在 js/space-data.js；登录状态存 sessionStorage（关标签页即失效）
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
      hint: "这是属于你们的私密角落，输入账号密码进入"
    },
    en: {
      userPh: "Username",
      passPh: "Password",
      login: "Enter",
      logout: "Log out",
      wrong: "Wrong username or password, try again",
      empty: "Nothing here yet — coming soon~",
      hint: "A private corner for you two. Sign in to enter."
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

  const sess = {
    get() { try { return sessionStorage.getItem("space-user"); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem("space-user", v); } catch (e) {} },
    clear() { try { sessionStorage.removeItem("space-user"); } catch (e) {} }
  };

  const esc = s => s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  function currentUser() {
    const name = sess.get();
    return SPACE_USERS.find(u => u.username === name) || null;
  }

  function renderLogin() {
    userInput.placeholder = ts("userPh");
    passInput.placeholder = ts("passPh");
    loginBtn.textContent = ts("login");
    hintEl.textContent = ts("hint");
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
        </article>
      `).join("") : `<p class="space-empty">${ts("empty")}</p>`}
    `;
    document.getElementById("space-logout").addEventListener("click", () => {
      sess.clear();
      passInput.value = "";
      statusEl.textContent = "";
      render();
    });
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
