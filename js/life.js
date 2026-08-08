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
      thoughtWrite: "✎ 写感悟",
      looseNotes: "随手记",
      edit: "✏️ 编辑",
      del: "🗑 删除",
      save: "保存修改",
      cancel: "取消",
      delConfirm: "确定删除这条碎碎念吗？删除后不可恢复",
      hmLabel: "最新碎碎念",
      justNow: "刚刚",
      minAgo: "{n} 分钟前",
      hourAgo: "{n} 小时前"
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
      thoughtWrite: "✎ Write",
      looseNotes: "Loose notes",
      edit: "✏️ Edit",
      del: "🗑 Delete",
      save: "Save changes",
      cancel: "Cancel",
      delConfirm: "Delete this moment? This can't be undone.",
      hmLabel: "Latest bit",
      justNow: "just now",
      minAgo: "{n}m ago",
      hourAgo: "{n}h ago"
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
    editCancel: document.getElementById("life-edit-cancel"),
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

  // ===== 月历渲染（main.js 的 renderTimeline 委托到这里） =====
  let openPop = null, popTimer = null;

  function closePop() {
    if (openPop) { openPop.remove(); openPop = null; }
  }
  function scheduleClose() {
    clearTimeout(popTimer);
    popTimer = setTimeout(closePop, 150);
  }

  const MONTH_EMOJI = ["❄️", "🧣", "🌸", "🌿", "🌷", "🌧️", "🍉", "🌻", "🍂", "🎃", "🍁", "⛄"];

  function monthLabel(mk) {
    const [y, m] = mk.split("-").map(Number);
    const label = currentLang === "en"
      ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
        .format(new Date(y, m - 1, 1))
      : y + " 年 " + m + " 月";
    return label + " " + MONTH_EMOJI[m - 1];
  }

  // 日期归一化：接受 2026-7-2 / 2026/7/2 / 2026年7月2日 等写法 → 2026-07-02
  function parseDateStr(s) {
    const m = String(s || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/);
    if (!m) return null;
    const mm = +m[2], dd = +m[3];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return m[1] + "-" + String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
  }

  function showPop(card, cell, entries) {
    clearTimeout(popTimer);
    closePop();
    const pop = document.createElement("div");
    pop.className = "cal-pop";
    entries.forEach(m => {
      const wrap = document.createElement("div");
      wrap.className = "cal-pop-entry";
      const p = document.createElement("p");
      const body = currentLang === "en" && m.text_en ? m.text_en : m.text;
      p.textContent = (m.mood ? m.mood + " " : "") + body;
      wrap.appendChild(p);
      // 站长登录后：DB 条目带编辑/删除
      if (m.id && authed) {
        const actions = document.createElement("div");
        actions.className = "cal-pop-actions";
        const eb = document.createElement("button");
        eb.type = "button";
        eb.textContent = tl("edit");
        eb.addEventListener("click", e => {
          e.stopPropagation();
          startEdit(m);
        });
        const db = document.createElement("button");
        db.type = "button";
        db.className = "danger";
        db.textContent = tl("del");
        db.addEventListener("click", e => {
          e.stopPropagation();
          deleteMoment(m.id);
        });
        actions.appendChild(eb);
        actions.appendChild(db);
        wrap.appendChild(actions);
      }
      pop.appendChild(wrap);
      // 照片：已有的缩略图直接渲染，旧条目按需补拉后再挂上浮层
      ensureImages(m).then(imgs => {
        if (!imgs || !imgs.length || !wrap.isConnected) return;
        const row = document.createElement("div");
        row.className = "cal-pop-photos";
        imgs.forEach((src, idx) => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = "";
          img.loading = "lazy";
          img.addEventListener("click", e => {
            e.stopPropagation();
            openLightbox(m, idx);
          });
          row.appendChild(img);
        });
        wrap.appendChild(row);
      });
    });
    card.appendChild(pop);
    // 定位：默认在格子上方，第一行格子改放下方；横向夹在卡片内
    const cw = card.clientWidth;
    const pw = Math.min(260, cw - 24);
    pop.style.width = pw + "px";
    let left = cell.offsetLeft + cell.offsetWidth / 2 - pw / 2;
    left = Math.max(12, Math.min(left, cw - pw - 12));
    pop.style.left = left + "px";
    if (cell.offsetTop < 120) {
      pop.style.top = (cell.offsetTop + cell.offsetHeight + 6) + "px";
    } else {
      pop.style.bottom = (card.clientHeight - cell.offsetTop + 6) + "px";
    }
    // 鼠标移上浮层不收起（可点图片）
    pop.addEventListener("mouseenter", () => clearTimeout(popTimer));
    pop.addEventListener("mouseleave", scheduleClose);
    openPop = pop;
  }

  document.addEventListener("click", closePop);

  window.renderLifeTimeline = function () {
    closePop();
    const merged = MOMENTS.concat(dbMoments);
    const byMonth = {};
    const loose = [];
    merged.forEach(m => {
      const nd = parseDateStr(m.date);
      if (nd) {
        const mk = nd.slice(0, 7), dk = nd.slice(8, 10);
        (byMonth[mk] = byMonth[mk] || {});
        (byMonth[mk][dk] = byMonth[mk][dk] || []).push(m);
      } else {
        loose.push(m);
      }
    });
    els.timeline.innerHTML = "";
    const nowD = new Date();
    const todayMk = nowD.getFullYear() + "-" + String(nowD.getMonth() + 1).padStart(2, "0");
    const todayD = nowD.getDate();
    const wdays = currentLang === "en"
      ? ["M", "T", "W", "T", "F", "S", "S"]
      : ["一", "二", "三", "四", "五", "六", "日"];

    Object.keys(byMonth).sort().reverse().forEach(mk => {
      const [y, mo] = mk.split("-").map(Number);
      const card = document.createElement("div");
      card.className = "cal-month";
      const title = document.createElement("div");
      title.className = "cal-month-title";
      title.textContent = monthLabel(mk);
      card.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "cal-grid";
      wdays.forEach(w => {
        const h = document.createElement("div");
        h.className = "cal-wday";
        h.textContent = w;
        grid.appendChild(h);
      });
      // 周一为首列
      const firstDow = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(y, mo, 0).getDate();
      for (let i = 0; i < firstDow; i++) {
        const empty = document.createElement("div");
        empty.className = "cal-day";
        grid.appendChild(empty);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const key = String(d).padStart(2, "0");
        const entries = byMonth[mk][key];
        const cell = document.createElement("div");
        cell.className = "cal-day" + (entries ? " has" : "");
        if (mk === todayMk && d === todayD) cell.classList.add("today");
        // 日期数字角标
        const num = document.createElement("span");
        num.className = "cal-num";
        num.textContent = d;
        cell.appendChild(num);
        if (entries) {
          // 心情角标（当天第一条带心情的条目）
          const moodEntry = entries.find(m => m.mood);
          if (moodEntry) {
            const ms = document.createElement("span");
            ms.className = "cal-mood";
            ms.textContent = moodEntry.mood;
            cell.appendChild(ms);
          }
          // 方格里放概述或小照片：优先用第一张带图的照片（缩略图）
          const withImg = entries.find(m =>
            (m.thumbs && m.thumbs.length) || (m.images && m.images.length));
          if (withImg) {
            const im = document.createElement("img");
            im.className = "cal-thumb";
            im.src = (withImg.thumbs && withImg.thumbs[0]) || withImg.images[0];
            im.alt = "";
            im.loading = "lazy";
            cell.appendChild(im);
          } else {
            const first = entries[0];
            const txt = currentLang === "en" && first.text_en ? first.text_en : first.text;
            const ex = document.createElement("span");
            ex.className = "cal-excerpt";
            ex.textContent = txt.length > 14 ? txt.slice(0, 14) + "…" : txt;
            cell.appendChild(ex);
          }
          cell.addEventListener("mouseenter", () => showPop(card, cell, entries));
          cell.addEventListener("mouseleave", scheduleClose);
          cell.addEventListener("click", e => {
            e.stopPropagation();
            showPop(card, cell, entries);
          });
        }
        grid.appendChild(cell);
      }
      card.appendChild(grid);
      els.timeline.appendChild(card);
    });

    // 非日期条目（如「未完待续」）收在下方，带心情和图片
    if (loose.length) {
      const box = document.createElement("div");
      box.className = "cal-loose";
      const t = document.createElement("div");
      t.className = "cal-loose-title";
      t.textContent = tl("looseNotes");
      box.appendChild(t);
      loose.forEach(m => {
        const wrap = document.createElement("div");
        wrap.className = "cal-pop-entry";
        const p = document.createElement("p");
        const body = currentLang === "en" && m.text_en ? m.text_en : m.text;
        p.textContent = (m.mood ? m.mood + " " : "") + body;
        wrap.appendChild(p);
        box.appendChild(wrap);
        ensureImages(m).then(imgs => {
          if (!imgs || !imgs.length || !wrap.isConnected) return;
          const row = document.createElement("div");
          row.className = "cal-pop-photos";
          imgs.forEach((src, idx) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "";
            img.loading = "lazy";
            img.addEventListener("click", e => {
              e.stopPropagation();
              openLightbox(m, idx);
            });
            row.appendChild(img);
          });
          wrap.appendChild(row);
        });
      });
      els.timeline.appendChild(box);
    }
  };

  // ===== 拉取在线数据（只取缩略图；旧行图片点开时才按需加载） =====
  async function fetchMoments() {
    if (!sb) return;
    let res = await sb.from("life_moments")
      .select("id,date,text,text_en,mood,thumbs")
      .order("created_at", { ascending: false });
    let rows;
    if (!res.error) {
      rows = res.data || [];
    } else {
      // thumbs/mood 列还没建：退回带完整 images 的旧查询
      res = await sb.from("life_moments")
        .select("id,date,text,text_en,images")
        .order("created_at", { ascending: false });
      if (res.error) return; // 表不存在/网络问题：只显示静态内容
      rows = res.data || [];
    }
    dbMoments = rows.map(r => ({
      id: r.id,
      date: r.date,
      text: r.text,
      text_en: r.text_en || "",
      mood: r.mood || null,
      thumbs: Array.isArray(r.thumbs) ? r.thumbs : null,
      images: Array.isArray(r.images) ? r.images : [],
      _legacyLoaded: false
    }));
    window.renderLifeTimeline();
    migrateLegacy();
  }

  // 旧条目（thumbs 为 null）的图片按需加载，一次一条带缓存
  async function ensureImages(m) {
    if (!m.id || m.thumbs != null) return (m.thumbs && m.thumbs.length) ? m.thumbs : m.images;
    if (!m._legacyLoaded) {
      const { data } = await sb.from("life_moments")
        .select("images").eq("id", m.id).single();
      m.images = (data && Array.isArray(data.images)) ? data.images : [];
      m._legacyLoaded = true;
    }
    return m.images;
  }

  // dataURL → 200px 缩略图
  function makeThumb(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > 200 || h > 200) {
          const k = 200 / Math.max(w, h);
          w = Math.round(w * k); h = Math.round(h * k);
        }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // 站长登录后后台静默迁移：给旧条目生成缩略图，之后加载走快速通道
  let migrating = false;
  async function migrateLegacy() {
    if (!authed || !sb || migrating) return;
    const legacy = dbMoments.filter(m => m.id && m.thumbs == null);
    if (!legacy.length) return;
    migrating = true;
    for (const m of legacy) {
      await ensureImages(m);
      const thumbs = [];
      for (const u of m.images) thumbs.push(await makeThumb(u));
      await sb.from("life_moments").update({ thumbs }).eq("id", m.id);
      m.thumbs = thumbs;
    }
    migrating = false;
    window.renderLifeTimeline();
  }

  // 点开大图：先给缩略图，再按条目 id 懒加载完整图片（一次一条，带缓存）
  async function openLightbox(m, idx) {
    if (m.id && m.thumbs == null) await ensureImages(m);  // 旧条目先补拉
    const thumbs = (m.thumbs && m.thumbs.length) ? m.thumbs : m.images;
    els.lightboxImg.src = thumbs[idx] || "";
    els.lightbox.classList.remove("hidden");
    if (!m.id) return; // 静态条目图片本来就在本地
    if (m._full) {
      els.lightboxImg.src = m._full[idx] || els.lightboxImg.src;
      return;
    }
    const { data } = await sb.from("life_moments")
      .select("images").eq("id", m.id).single();
    if (data && Array.isArray(data.images)) {
      m._full = data.images;
      m.images = data.images;
      if (data.images[idx]) els.lightboxImg.src = data.images[idx];
    }
  }

  // ===== 登录与发布器显隐 =====
  function syncPanels() {
    els.loginCard.classList.add("hidden");
    els.composer.classList.toggle("hidden", !authed);
    els.thoughtComposer.classList.add("hidden");
    els.thoughtWriteBtn.classList.toggle("hidden", !authed);
    renderTexts();
    // 登录态决定浮层里有没有编辑/删除按钮，重渲日历
    if (typeof window.renderLifeTimeline === "function") window.renderLifeTimeline();
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

  // ===== 图片选择与压缩（大图 1000px + 缩略图 200px 双份） =====
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const make = (max, q) => {
            let w = img.width, h = img.height;
            if (w > max || h > max) {
              const k = max / Math.max(w, h);
              w = Math.round(w * k);
              h = Math.round(h * k);
            }
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            c.getContext("2d").drawImage(img, 0, 0, w, h);
            return c.toDataURL("image/jpeg", q);
          };
          resolve({ full: make(1000, 0.72), thumb: make(200, 0.6) });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPreviews() {
    els.previews.innerHTML = "";
    photos.forEach((p, i) => {
      const pv = document.createElement("div");
      pv.className = "pv";
      const img = document.createElement("img");
      img.src = p.thumb || p;
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

  // ===== 心情选择（单选，可再点取消；默认 😊） =====
  const moodBox = document.getElementById("life-mood");
  moodBox.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      const was = b.classList.contains("on");
      moodBox.querySelectorAll("button").forEach(x => x.classList.remove("on"));
      if (!was) b.classList.add("on");
    });
  });
  function currentMood() {
    const on = moodBox.querySelector("button.on");
    return on ? on.dataset.mood : null;
  }
  function resetMood() {
    moodBox.querySelectorAll("button").forEach(x =>
      x.classList.toggle("on", x.dataset.mood === "😊"));
  }

  // ===== 站长编辑/删除碎碎念 =====
  let editingId = null;

  async function startEdit(m) {
    closePop();
    // 编辑需要完整图片：只有缩略图时先按 id 拉一次
    if (m.id && (!m.images || !m.images.length) && m.thumbs && m.thumbs.length && !m._full) {
      const { data } = await sb.from("life_moments")
        .select("images").eq("id", m.id).single();
      if (data && Array.isArray(data.images)) {
        m._full = data.images;
        m.images = data.images;
      }
    }
    editingId = m.id;
    els.composer.classList.remove("hidden");
    els.date.value = m.date;
    els.text.value = m.text;
    els.textEn.value = m.text_en || "";
    photos = (Array.isArray(m.images) ? m.images : []).map(u => ({ full: u, thumb: u }));
    renderPreviews();
    moodBox.querySelectorAll("button").forEach(x =>
      x.classList.toggle("on", x.dataset.mood === (m.mood || "😊")));
    els.editCancel.classList.remove("hidden");
    renderTexts();
    els.publishBtn.textContent = tl("save");
    els.composer.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelEdit() {
    editingId = null;
    els.composer.classList.add("hidden");
    els.editCancel.classList.add("hidden");
    els.text.value = "";
    els.textEn.value = "";
    photos = [];
    renderPreviews();
    resetMood();
    renderTexts();
  }
  els.editCancel.addEventListener("click", cancelEdit);

  async function deleteMoment(id) {
    if (!sb || !authed) return;
    if (!confirm(tl("delConfirm"))) return;
    const { error } = await sb.from("life_moments").delete().eq("id", id);
    if (!error) {
      closePop();
      fetchMoments();
    }
  }

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
    // 照片统一保证有独立缩略图（编辑旧条目时可能只有大图）
    const thumbsOut = [];
    for (const p of photos) {
      if (p.thumb && p.thumb !== p.full) thumbsOut.push(p.thumb);
      else thumbsOut.push(await makeThumb(p.full || p.thumb || p));
    }
    const payload = {
      date: parseDateStr(els.date.value.trim() || els.date.placeholder) ||
        (els.date.value.trim() || els.date.placeholder),
      text,
      text_en: els.textEn.value.trim() || null,
      images: photos.map(p => p.full || p),
      thumbs: thumbsOut,
      mood: currentMood()
    };
    let error;
    if (editingId) {
      // 编辑模式：更新原行
      error = (await sb.from("life_moments").update(payload).eq("id", editingId)).error;
      if (error && (payload.thumbs || payload.mood)) {
        delete payload.thumbs;   // thumbs/mood 列还没建：去掉再试一次
        delete payload.mood;
        error = (await sb.from("life_moments").update(payload).eq("id", editingId)).error;
      }
    } else {
      error = (await sb.from("life_moments").insert(payload)).error;
      if (error && (payload.thumbs || payload.mood)) {
        delete payload.thumbs;
        delete payload.mood;
        error = (await sb.from("life_moments").insert(payload)).error;
      }
    }
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
    resetMood();
    if (editingId) {
      editingId = null;
      els.editCancel.classList.add("hidden");
      els.composer.classList.add("hidden");
      renderTexts();
    }
    els.status.textContent = tl("published");
    els.status.className = "inbox-status ok";
    // 首页「最新碎碎念」即时更新
    latestMoment = {
      date: payload.date,
      text, text_en: payload.text_en, mood: payload.mood || null,
      thumbs: thumbsOut, images: payload.images,
      created_at: new Date().toISOString()
    };
    renderHomeMoment();
    fetchMoments();
  });

  // ===== 灯箱 =====
  els.lightbox.addEventListener("click", () => els.lightbox.classList.add("hidden"));

  // ===== 首页「最新碎碎念」：发布后即时更新，超 12 小时自动隐藏 =====
  let latestMoment = null;

  function relTime(iso) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return tl("justNow");
    if (m < 60) return tl("minAgo").replace("{n}", m);
    return tl("hourAgo").replace("{n}", Math.floor(m / 60));
  }

  function renderHomeMoment() {
    const box = document.getElementById("home-moment");
    if (!box) return;
    const fresh = latestMoment &&
      Date.now() - new Date(latestMoment.created_at).getTime() < 12 * 3600 * 1000;
    box.classList.toggle("hidden", !fresh);
    if (!fresh) return;
    box.querySelector(".hm-label").textContent = tl("hmLabel");
    box.querySelector(".hm-mood").textContent = latestMoment.mood || "";
    box.querySelector(".hm-text").textContent =
      currentLang === "en" && latestMoment.text_en ? latestMoment.text_en : latestMoment.text;
    box.querySelector(".hm-when").textContent = relTime(latestMoment.created_at);
    // 图片缩略图（无图隐藏）
    const thumbEl = box.querySelector(".hm-thumb");
    const thumbSrc = (latestMoment.thumbs && latestMoment.thumbs[0]) ||
      (latestMoment.images && latestMoment.images[0]) || null;
    thumbEl.classList.toggle("hidden", !thumbSrc);
    if (thumbSrc) thumbEl.src = thumbSrc;
  }

  async function fetchLatestMoment() {
    if (!sb) return;
    const { data, error } = await sb.from("life_moments")
      .select("id,date,text,text_en,mood,thumbs,created_at")
      .order("created_at", { ascending: false }).limit(10);
    if (error) return;
    // 12 小时内发布的候选里，取日期字段最新的一条
    const now = Date.now();
    const fresh = (data || []).filter(r =>
      now - new Date(r.created_at).getTime() < 12 * 3600 * 1000);
    fresh.sort((a, b) =>
      (parseDateStr(b.date) || "").localeCompare(parseDateStr(a.date) || "") ||
      b.created_at.localeCompare(a.created_at));
    latestMoment = fresh[0] || null;
    // 旧结构条目补图后再渲染
    if (latestMoment && latestMoment.thumbs == null && latestMoment.id) {
      await ensureImages(latestMoment);
    }
    renderHomeMoment();
  }
  setInterval(renderHomeMoment, 60000);  // 相对时间/过期隐藏随时间刷新

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
    els.editCancel.textContent = tl("cancel");
  }

  document.addEventListener("langchange", () => {
    renderTexts();
    renderWarm();
    renderThoughts();
    renderHomeMoment();
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
  fetchLatestMoment();
})();
