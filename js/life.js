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
      collapse: "收起"
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
      collapse: "Collapse"
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
    lightboxImg: document.getElementById("life-lightbox-img")
  };

  const MAX_IMGS = 6;
  let dbMoments = [];
  let photos = []; // 待发布图片的 dataURL
  let authed = false; // Supabase Auth 站长会话是否有效

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
  }

  document.addEventListener("langchange", () => {
    renderTexts();
    window.renderLifeTimeline();
  });

  renderTexts();
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
})();
