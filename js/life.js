/* 生活碎碎念：登录后在线发布（文字 + 图片），存 Supabase life_moments 表
 * 渲染：在线数据与 data.js 的静态 MOMENTS 合并，按日期倒序；
 * main.js 的 renderTimeline 会委托到这里的 window.renderLifeTimeline。
 * 依赖：config.js（SUPABASE_*、LIFE_SECRET）、space-data.js（SPACE_USERS）、
 *       main.js（currentLang、langchange 事件）
 */

(function () {
  const I18N = {
    zh: {
      write: "✎ 写碎碎念",
      userPh: "用户名",
      passPh: "密码",
      login: "登录",
      wrong: "用户名或密码不对，再试一次",
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
      userPh: "Username",
      passPh: "Password",
      login: "Log in",
      wrong: "Wrong username or password, try again",
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
    typeof SUPABASE_ANON_KEY === "string" && !SUPABASE_ANON_KEY.startsWith("YOUR_") &&
    typeof LIFE_SECRET === "string";
  const sb = configured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const els = {
    timeline: document.getElementById("life-timeline"),
    writeBtn: document.getElementById("life-write-btn"),
    loginCard: document.getElementById("life-login"),
    user: document.getElementById("life-username"),
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

  // 登录状态与「你和我」共用同一个 session key
  const sess = {
    get() { try { return sessionStorage.getItem("space-user"); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem("space-user", v); } catch (e) {} }
  };

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
    const logged = !!sess.get();
    els.loginCard.classList.add("hidden");
    els.composer.classList.toggle("hidden", !logged);
    renderTexts();
  }

  els.writeBtn.addEventListener("click", () => {
    if (sess.get()) {
      els.composer.classList.toggle("hidden");
      els.loginCard.classList.add("hidden");
    } else {
      els.loginCard.classList.toggle("hidden");
      els.composer.classList.add("hidden");
    }
    renderTexts();
  });

  function tryLogin() {
    const u = els.user.value.trim();
    const p = els.pass.value;
    const hit = (typeof SPACE_USERS !== "undefined" ? SPACE_USERS : [])
      .find(x => x.username === u && x.password === p);
    if (!hit) {
      els.loginStatus.textContent = tl("wrong");
      els.loginStatus.className = "inbox-status error";
      return;
    }
    sess.set(u);
    els.loginStatus.textContent = "";
    els.user.value = "";
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
      images: photos,
      secret: LIFE_SECRET
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
    els.user.placeholder = tl("userPh");
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
  syncPanels();
  fetchMoments();
})();
