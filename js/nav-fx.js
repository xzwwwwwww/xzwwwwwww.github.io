/* 导航动效增强：滑动下划线指示器 + 滚动质感
 * 纯装饰性增强，不触碰任何现有逻辑与钩子；
 * 若本文件加载失败，导航回退为 CSS 自带的 active 下划线。
 */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var nav = document.querySelector(".nav");
  var links = nav ? nav.querySelectorAll(".nav-link") : [];
  if (!header || !nav || !links.length) return;

  // ===== 滑动下划线 =====
  var ink = document.createElement("span");
  ink.className = "nav-ink";
  ink.setAttribute("aria-hidden", "true");
  nav.appendChild(ink);
  nav.classList.add("js-ink"); // 关闭 CSS 回退下划线，避免双线

  function moveInk(el) {
    if (!el) {
      ink.style.opacity = "0";
      return;
    }
    var navRect = nav.getBoundingClientRect();
    var rect = el.getBoundingClientRect();
    ink.style.width = rect.width + "px";
    ink.style.transform = "translateX(" + (rect.left - navRect.left) + "px)";
    ink.style.opacity = "1";
  }

  function toActive() {
    moveInk(nav.querySelector(".nav-link.active") || links[0]);
  }

  // hover 时滑向悬停项，移出回到当前页
  nav.addEventListener("mouseover", function (e) {
    var link = e.target.closest ? e.target.closest(".nav-link") : null;
    if (link) moveInk(link);
  });
  nav.addEventListener("mouseleave", toActive);
  // 点击后 active 已切换（main.js 先注册先执行），下一帧量取更稳
  nav.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".nav-link")) {
      requestAnimationFrame(toActive);
    }
  });

  // 语言切换改变文字宽度，需重算
  document.addEventListener("langchange", function () {
    requestAnimationFrame(toActive);
  });
  window.addEventListener("resize", toActive);
  // Web 字体加载完成后文字宽度会变化，再校准一次
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(toActive);
  }
  toActive();

  // ===== 滚动质感：越过阈值后导航栏背景更实、加细微阴影 =====
  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
