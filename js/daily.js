/* 首页「今天」：公历日期 + 实时时钟 + 农历 + 趣味黄历宜忌 + 每日一句
 * 农历用浏览器内置 Intl 中国历法；宜忌为当天固定的种子伪随机（趣味内容）。
 * 依赖：daily-data.js（DAILY_SENTENCES / ALMANAC_YI / ALMANAC_JI）、
 *       main.js（currentLang、langchange 事件）
 */

(function () {
  const I18N = {
    zh: { lunar: "农历", yi: "宜", ji: "忌" },
    en: { lunar: "Lunar", yi: "Do", ji: "Avoid" }
  };
  const td = k => (I18N[currentLang] || I18N.zh)[k];

  const dateEl = document.getElementById("day-date");
  const timeEl = document.getElementById("day-time");
  const lunarEl = document.getElementById("day-lunar");
  const yijiEl = document.getElementById("day-yiji");
  const captionEl = document.querySelector(".scene-caption");

  function dayOfYear(d) {
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  }

  // 种子伪随机：同一天刷新结果不变
  function seeded(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function renderDay() {
    const now = new Date();
    const en = currentLang === "en";

    // 公历 + 星期
    dateEl.textContent = new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
      year: "numeric", month: "long", day: "numeric", weekday: "long"
    }).format(now);

    // 农历
    let lunarTxt;
    if (en) {
      lunarTxt = new Intl.DateTimeFormat("en-US-u-ca-chinese", {
        month: "long", day: "numeric"
      }).format(now);
    } else {
      // "2026丙午年六月十九" → "六月十九 · 丙午年"
      const full = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { dateStyle: "long" }).format(now);
      const m = full.match(/^(\d+)(.+?年)(.+)$/);
      lunarTxt = m ? m[3] + " · " + m[2] : full;
    }
    lunarEl.textContent = td("lunar") + " " + lunarTxt;

    // 趣味宜忌：种子 = 年*1000 + 年内第几天
    const doy = dayOfYear(now);
    const rnd = seeded(now.getFullYear() * 1000 + doy);
    const yiPool = ALMANAC_YI.slice();
    const picks = [];
    for (let i = 0; i < 2; i++) {
      picks.push(yiPool.splice(Math.floor(rnd() * yiPool.length), 1)[0]);
    }
    const ji = ALMANAC_JI[Math.floor(rnd() * ALMANAC_JI.length)];
    const li = p => (en ? p[1] : p[0]);
    yijiEl.innerHTML = "";
    const yiSpan = document.createElement("span");
    yiSpan.className = "day-yi";
    yiSpan.textContent = td("yi") + "：" + picks.map(li).join(" · ");
    const jiSpan = document.createElement("span");
    jiSpan.className = "day-ji";
    jiSpan.textContent = td("ji") + "：" + li(ji);
    yijiEl.appendChild(yiSpan);
    yijiEl.appendChild(jiSpan);

    // 每日一句
    if (captionEl && typeof DAILY_SENTENCES !== "undefined" && DAILY_SENTENCES.length) {
      const s = DAILY_SENTENCES[doy % DAILY_SENTENCES.length];
      captionEl.textContent = en ? s[1] : s[0];
    }
  }

  function tickClock() {
    const now = new Date();
    timeEl.textContent =
      pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }

  renderDay();
  tickClock();
  setInterval(tickClock, 1000);
  document.addEventListener("langchange", renderDay);
})();
