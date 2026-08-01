/* 生活碎碎念：站长登录后在线发布（文字 + 图片），存 Supabase life_moments 表
 * 渲染：在线数据与 data.js 的静态 MOMENTS 合并，按日期倒序；
 * main.js 的 renderTimeline 会委托到这里的 window.renderLifeTimeline。
 * 登录与「留言信箱」站长共用 Supabase Auth 账号（邮箱 + 密码）。
 * 依赖：config.js（SUPABASE_*）、main.js（currentLang、langchange 事件）
 */

(function () {
  const I18N = {
    zh: {
      write: "✎ 写碎碎念",
      userPh: "站长邮箱",
      passPh: "站长密码",
      login: "登录",
      wrong: "登录失败，请检查邮箱和密码",
      datePh: "日期（如 2026-07-30）",
      textPh: "今天想记点什么…",
      textEnPh: "英文版（可选，不写则英文模式显示中文）",
      publish: "发布",
      publishing: "发布中…",
      published: "已发布！",
      fail: "发布失败，请检查网络或稍后再试",
      needText: "先写点内容再发布",
      imgLimit: "一次最多 6 张图片",
      collapse: "收起",
      thoughtPh: "此刻在想什么…",
      thoughtEnPh: "英文版（可选）",
      thoughtPublish: "发布感悟",
      thoughtPublishing: "发布中…",
      thoughtPublished: "已发布！",
      thoughtEmpty: "还没有感悟，坐等第一篇",
      commentName: "你的昵称",
      commentPh: "写下你的评论…",
      commentBtn: "评论",
      commentNeed: "昵称和内容都要填哦",
      commentFail: "评论失败，请稍后再试",
      thoughtWrite: "✎ 写感悟"
    },
    en: {
      write: "✎ Write",
      userPh: "Owner email",
      passPh: "Owner password",
      login: "Log in",
      wrong: "Login failed. Check your email and password.",
      datePh: "Date (e.g. 2026-07-30)",
      textPh: "What's on your mind today…",
      textEnPh: "English version (optional; Chinese shows in EN mode if empty)",
      publish: "Publish",
      publishing: "Publishing…",
      published: "Published!",
      fail: "Failed — check your network or try again later",
      needText: "Write something first",
      imgLimit: "Up to 6 photos at a time",
      collapse: "Collapse",
      thoughtPh: "What's on your mind…",
      thoughtEnPh: "English version (optional)",
      thoughtPublish: "Publish",
      thoughtPublishing: "Publishing…",
      thoughtPublished: "Published!",
      thoughtEmpty: "No thoughts yet — stay tuned",
      commentName: "Your nickname",
      commentPh: "Leave a comment…",
      commentBtn: "Comment",
      commentNeed: "Nickname and comment are both required",
      commentFail: "Failed, try again later",
      thoughtWrite: "✎ Write"
    }
  };
  const tl = k => (I18N[currentLang] || I18N.zh)[k] || k;

  const configured =
    typeof SUPABASE_URL === "string" && !SUPABASE_URL.startsWith("YOUR_") &&
    typeof SUPABASE_ANON_KEY === "string" && !SUPABASE_ANON_KEY.startsWith("YOUR_");
  const sb = configured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const els = {
    timeline: document.getElementById("life-timeline"),
    writeBtn: document.getElementById("life-write-btn"),
    loginCard: document.getElementById("life-login"),
    email: document.getElementById("life-email"),
    pass: document.getElementById("life-password"),
    loginBtn: document.getElementById("life-login-btn"),
    loginStatus: document.getElementById("life-login-status"),
    composer: document.getElementById("life-composer"),
    date: document.getElementById("life-date"),
    text: document.getElementById("life-text"),
    textEn: document.getElementById("life-text-en"),
    imgInput: document.getElementById("life-images"),
    previews: document.getElementById("life-img-previews"),
    publishBtn: document.getElementById("life-publish"),
    status: document.getElementById("life-status"),
    lightbox: document.getElementById("life-lightbox"),
    lightboxImg: document.getElementById("life-lightbox-img"),
    thoughtComposer: document.getElementById("thought-composer"),
    thoughtText: document.getElementById("thought-text"),
    thoughtTextEn: document.getElementById("thought-text-en"),
    thoughtPublish: document.getElementById("thought-publish"),
    thoughtStatus: document.getElementById("thought-status"),
    thoughtList: document.getElementById("thought-list"),
    thoughtWriteBtn: document.getElementById("thought-write-btn")
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  const MAX_IMGS = 6;
  let dbMoments = [];
  let photos = []; // 待发布图片的 dataURL
  let authed = false; // Supabase Auth 站长会话是否有效

  // ===== 节气与小站天数（装饰性，节气按常见日期近似） =====
  const SOLAR_TERMS = [
    [1, 5, "小寒", "Minor Cold"], [1, 20, "大寒", "Major Cold"],
    [2, 4, "立春", "Spring Begins"], [2, 19, "雨水", "Rain Water"],
    [3, 5, "惊蛰", "Insects Awaken"], [3, 21, "春分", "Spring Equinox"],
    [4, 5, "清明", "Pure Brightness"], [4, 20, "谷雨", "Grain Rain"],
    [5, 6, "立夏", "Summer Begins"], [5, 21, "小满", "Grain Buds"],
    [6, 6, "芒种", "Grain in Ear"], [6, 21, "夏至", "Summer Solstice"],
    [7, 7, "小暑", "Minor Heat"], [7, 23, "大暑", "Major Heat"],
    [8, 8, "立秋", "Autumn Begins"], [8, 23, "处暑", "End of Heat"],
    [9, 8, "白露", "White Dew"], [9, 23, "秋分", "Autumn Equinox"],
    [10, 8, "寒露", "Cold Dew"], [10, 23, "霜降", "Frost's Descent"],
    [11, 8, "立冬", "Winter Begins"], [11, 22, "小雪", "Minor Snow"],
    [12, 7, "大雪", "Major Snow"], [12, 22, "冬至", "Winter Solstice"]
  ];
  const SITE_BIRTHDAY = new Date(2026, 6, 19); // 小站开张：2026-07-19

  function renderWarm() {
    const el = document.getElementById("life-warm");
    if (!el) return;
    const now = new Date();
    const md = (now.getMonth() + 1) * 100 + now.getDate();
    let term = SOLAR_TERMS[SOLAR_TERMS.length - 1];
    for (const t of SOLAR_TERMS) {
      if (t[0] * 100 + t[1] <= md) term = t;
      else break;
    }
    const exact = term[0] * 100 + term[1] === md;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const n = Math.max(1, Math.floor((today - SITE_BIRTHDAY) / 86400000) + 1);
    const en = currentLang === "en";
    el.innerHTML = "";
    const s1 = document.createElement("span");
    s1.className = "warm-term";
    s1.textContent = en
      ? (exact ? "Today is " + term[3] : "Solar term · " + term[3])
      : (exact ? "今日" + term[2] : "节气 · " + term[2]);
    const s2 = document.createElement("span");
    s2.textContent = en ? "Day " + n + " of my corner" : "小站陪你第 " + n + " 天";
    el.appendChild(s1);
    el.appendChild(s2);
  }

  // ===== 时间线渲染（main.js 委托到这里） =====
  window.renderLifeTimeline = function () {
    const merged = MOMENTS.concat(dbMoments);
    merged.sort((a, b) => b.date.localeCompare(a.date));
    els.timeline.innerHTML = "";
    merged.forEach(m => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      const d = document.createElement("div");
      d.className = "date";
      d.textContent = m.date;
      const p = document.createElement("p");
      p.textContent = currentLang === "en" && m.text_en ? m.text_en : m.text;
      item.appendChild(d);
      item.appendChild(p);
      const imgs = Array.isArray(m.images) ? m.images : [];
      if (imgs.length) {
        const row = document.createElement("div");
        row.className = "life-photos";
        imgs.forEach(src => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = "";
          img.loading = "lazy";
          img.addEventListener("click", () => {
            els.lightboxImg.src = src;
            els.lightbox.classList.remove("hidden");
          });
          row.appendChild(img);
        });
        item.appendChild(row);
      }
      els.timeline.appendChild(item);
    });
  };

  // ===== 拉取在线数据 =====
  async function fetchMoments() {
    if (!sb) return;
    const { data, error } = await sb.from("life_moments")
      .select("date,text,text_en,images")
      .order("created_at", { ascending: false });
    if (error) return; // 表不存在/网络问题：只显示静态内容
    dbMoments = (data || []).map(r => ({
      date: r.date,
      text: r.text,
      text_en: r.text_en || "",
      images: Array.isArray(r.images) ? r.images : []
    }));
    window.renderLifeTimeline();
  }

  // ===== 登录与发布器显隐 =====
  function syncPanels() {
    els.loginCard.classList.add("hidden");
    els.composer.classList.toggle("hidden", !authed);
    els.thoughtComposer.classList.add("hidden");
    els.thoughtWriteBtn.classList.toggle("hidden", !authed);
    renderTexts();
  }

  els.writeBtn.addEventListener("click", () => {
    if (authed) {
      els.composer.classList.toggle("hidden");
      els.loginCard.classList.add("hidden");
    } else {
      els.loginCard.classList.toggle("hidden");
      els.composer.classList.add("hidden");
    }
    renderTexts();
  });

  async function tryLogin() {
    if (!sb) return;
    els.loginBtn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({
      email: els.email.value.trim(),
      password: els.pass.value
    });
    els.loginBtn.disabled = false;
    if (error) {
      els.loginStatus.textContent = tl("wrong");
      els.loginStatus.className = "inbox-status error";
      return;
    }
    authed = true;
    els.loginStatus.textContent = "";
    els.email.value = "";
    els.pass.value = "";
    syncPanels();
  }
  els.loginBtn.addEventListener("click", tryLogin);
  els.pass.addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });

  // ===== 图片选择与压缩 =====
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX = 1000;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            const k = MAX / Math.max(w, h);
            w = Math.round(w * k);
            h = Math.round(h * k);
          }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.75));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPreviews() {
    els.previews.innerHTML = "";
    photos.forEach((src, i) => {
      const pv = document.createElement("div");
      pv.className = "pv";
      const img = document.createElement("img");
      img.src = src;
      const x = document.createElement("button");
      x.type = "button";
      x.textContent = "×";
      x.addEventListener("click", () => { photos.splice(i, 1); renderPreviews(); });
      pv.appendChild(img);
      pv.appendChild(x);
      els.previews.appendChild(pv);
    });
  }

  els.imgInput.addEventListener("change", async () => {
    const files = Array.from(els.imgInput.files || []);
    els.imgInput.value = "";
    for (const f of files) {
      if (photos.length >= MAX_IMGS) {
        els.status.textContent = tl("imgLimit");
        els.status.className = "inbox-status error";
        break;
      }
      try {
        photos.push(await compressImage(f));
      } catch (e) { /* 跳过读不出来的文件 */ }
    }
    renderPreviews();
  });

  // ===== 发布 =====
  els.publishBtn.addEventListener("click", async () => {
    if (!sb) { els.status.textContent = tl("fail"); els.status.className = "inbox-status error"; return; }
    const text = els.text.value.trim();
    if (!text) {
      els.status.textContent = tl("needText");
      els.status.className = "inbox-status error";
      return;
    }
    els.publishBtn.disabled = true;
    els.publishBtn.textContent = tl("publishing");
    const { error } = await sb.from("life_moments").insert({
      date: els.date.value.trim() || els.date.placeholder,
      text,
      text_en: els.textEn.value.trim() || null,
      images: photos
    });
    els.publishBtn.disabled = false;
    els.publishBtn.textContent = tl("publish");
    if (error) {
      els.status.textContent = tl("fail");
      els.status.className = "inbox-status error";
      return;
    }
    els.text.value = "";
    els.textEn.value = "";
    photos = [];
    renderPreviews();
    els.status.textContent = tl("published");
    els.status.className = "inbox-status ok";
    fetchMoments();
  });

  // ===== 灯箱 =====
  els.lightbox.addEventListener("click", () => els.lightbox.classList.add("hidden"));

  // ===== 我的生活思考：站长感悟 + 访客免审评论 =====
  let thoughts = [];

  // 列表直接摊在页面上；写作框默认收起，站长登录后点「✎ 写感悟」才展开
  els.thoughtWriteBtn.addEventListener("click", () => {
    els.thoughtComposer.classList.toggle("hidden");
    renderTexts();
  });

  function fmtWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const p = n => String(n).padStart(2, "0");
    return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  async function fetchThoughts() {
    if (!sb) return;
    const { data: ts, error } = await sb.from("life_thoughts")
      .select("id,text,text_en,created_at")
      .order("created_at", { ascending: false });
    if (error) { renderThoughts(); return; } // 表还没建：显示空态
    const { data: cs } = await sb.from("life_thought_comments")
      .select("thought_id,username,content,created_at")
      .order("created_at", { ascending: true });
    const byId = {};
    (cs || []).forEach(c => {
      (byId[c.thought_id] = byId[c.thought_id] || []).push(c);
    });
    thoughts = (ts || []).map(t => ({ ...t, comments: byId[t.id] || [] }));
    renderThoughts();
  }

  function renderThoughts() {
    els.thoughtList.innerHTML = "";
    if (!thoughts.length) {
      const p = document.createElement("p");
      p.className = "thought-empty";
      p.textContent = tl("thoughtEmpty");
      els.thoughtList.appendChild(p);
      return;
    }
    const en = currentLang === "en";
    thoughts.forEach(t => {
      const card = document.createElement("div");
      card.className = "thought-card";
      const d = document.createElement("div");
      d.className = "thought-date";
      d.textContent = (t.created_at || "").slice(0, 10);
      const p = document.createElement("p");
      p.className = "thought-text";
      p.textContent = en && t.text_en ? t.text_en : t.text;
      card.appendChild(d);
      card.appendChild(p);

      const box = document.createElement("div");
      box.className = "thought-comments";
      t.comments.forEach(c => {
        const row = document.createElement("div");
        row.className = "thought-comment";
        const name = document.createElement("b");
        name.textContent = c.username;
        const body = document.createElement("span");
        body.className = "tc-body";
        body.textContent = c.content;
        const when = document.createElement("span");
        when.className = "tc-when";
        when.textContent = fmtWhen(c.created_at);
        row.appendChild(name);
        row.appendChild(body);
        row.appendChild(when);
        box.appendChild(row);
      });

      // 评论表单：昵称记忆在 localStorage
      const form = document.createElement("div");
      form.className = "thought-cform";
      const nameIn = document.createElement("input");
      nameIn.type = "text";
      nameIn.maxLength = 20;
      nameIn.placeholder = tl("commentName");
      nameIn.value = store.get("thought-name") || "";
      const bodyIn = document.createElement("input");
      bodyIn.type = "text";
      bodyIn.maxLength = 300;
      bodyIn.placeholder = tl("commentPh");
      const btn = document.createElement("button");
      btn.className = "ms-level";
      btn.textContent = tl("commentBtn");
      const submit = () => postComment(t.id, nameIn, bodyIn, btn);
      btn.addEventListener("click", submit);
      bodyIn.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
      form.appendChild(nameIn);
      form.appendChild(bodyIn);
      form.appendChild(btn);
      box.appendChild(form);

      card.appendChild(box);
      els.thoughtList.appendChild(card);
    });
  }

  async function postComment(thoughtId, nameIn, bodyIn, btn) {
    if (!sb) return;
    const username = nameIn.value.trim();
    const content = bodyIn.value.trim();
    if (!username || !content) {
      bodyIn.value = "";
      bodyIn.placeholder = tl("commentNeed");
      return;
    }
    btn.disabled = true;
    const { error } = await sb.from("life_thought_comments")
      .insert({ thought_id: thoughtId, username, content });
    btn.disabled = false;
    if (error) {
      bodyIn.value = "";
      bodyIn.placeholder = tl("commentFail");
      return;
    }
    store.set("thought-name", username);
    bodyIn.value = "";
    bodyIn.placeholder = tl("commentPh");
    fetchThoughts();
  }

  els.thoughtPublish.addEventListener("click", async () => {
    if (!sb || !authed) return;
    const text = els.thoughtText.value.trim();
    if (!text) {
      els.thoughtStatus.textContent = tl("needText");
      els.thoughtStatus.className = "inbox-status error";
      return;
    }
    els.thoughtPublish.disabled = true;
    els.thoughtPublish.textContent = tl("thoughtPublishing");
    const { error } = await sb.from("life_thoughts").insert({
      text,
      text_en: els.thoughtTextEn.value.trim() || null
    });
    els.thoughtPublish.disabled = false;
    els.thoughtPublish.textContent = tl("thoughtPublish");
    if (error) {
      els.thoughtStatus.textContent = tl("fail");
      els.thoughtStatus.className = "inbox-status error";
      return;
    }
    els.thoughtText.value = "";
    els.thoughtTextEn.value = "";
    els.thoughtStatus.textContent = tl("thoughtPublished");
    els.thoughtStatus.className = "inbox-status ok";
    fetchThoughts();
  });

  // ===== 文案与初始化 =====
  function todayStr() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function renderTexts() {
    els.writeBtn.textContent = els.composer.classList.contains("hidden")
      ? tl("write") : tl("collapse");
    els.email.placeholder = tl("userPh");
    els.pass.placeholder = tl("passPh");
    els.loginBtn.textContent = tl("login");
    els.date.placeholder = todayStr();
    els.text.placeholder = tl("textPh");
    els.textEn.placeholder = tl("textEnPh");
    els.publishBtn.textContent = tl("publish");
    els.thoughtText.placeholder = tl("thoughtPh");
    els.thoughtTextEn.placeholder = tl("thoughtEnPh");
    els.thoughtPublish.textContent = tl("thoughtPublish");
    els.thoughtWriteBtn.textContent =
      els.thoughtComposer.classList.contains("hidden") ? tl("thoughtWrite") : tl("collapse");
  }

  document.addEventListener("langchange", () => {
    renderTexts();
    renderWarm();
    renderThoughts();
    window.renderLifeTimeline();
  });

  renderTexts();
  renderWarm();
  renderThoughts();
  // 已登录过（留言信箱那边登录过也会带上同一份会话）就直接打开发布器
  if (sb) {
    sb.auth.getSession().then(({ data }) => {
      authed = !!(data && data.session);
      syncPanels();
    }).catch(() => syncPanels());
  } else {
    syncPanels();
  }
  fetchMoments();
  fetchThoughts();
})();
