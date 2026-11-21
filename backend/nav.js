/* ==========================================================================
   Investi-gator — site navigation (both pages)

   Three jobs:

     1. Active link      on index.html it follows the section in view; on
                         playground.html it's fixed in the markup.
     2. Sliding pill     sits behind the active link. Motion springs it
                         between links when the library loaded; otherwise a
                         plain CSS transition does the same job.
     3. Hamburger menu   open/close, plus closing on a link tap, a tap
                         outside, Escape, or the window growing out of the
                         "menu" layout.

   Which layout is showing (wide row / swipeable strip / hamburger menu) is
   decided entirely by public/nav.css. This file never repeats those
   breakpoints, it just asks the page which one it's in. The theme button
   is backend/theme.js's job.

   Must load after the Motion <script> tag so window.Motion exists, and
   works the same if Motion never arrives.
   ========================================================================== */
(function () {
  "use strict";

  var nav = document.querySelector("nav");
  var list = nav && nav.querySelector(".nav-links");
  var toggle = nav && nav.querySelector(".nav-toggle");
  if (!list || !toggle) return;

  var pill = list.querySelector(".nav-pill");
  var links = Array.prototype.slice.call(list.querySelectorAll("a"));
  var Motion = window.Motion;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Snappy with a small overshoot. Higher stiffness = faster; lower
  // damping = more bounce.
  var SPRING = { type: "spring", stiffness: 420, damping: 32 };

  if (!Motion) list.classList.add("no-motion");

  /* ---- which layout is showing ----------------------------------------- */

  function isMenuLayout() {
    return getComputedStyle(toggle).display !== "none";
  }

  function isStripLayout() {
    return getComputedStyle(list).overflowX === "auto";
  }

  /* ---- sliding pill ----------------------------------------------------- */

  var pillShown = false;

  function hidePill() {
    if (!pill || !pillShown) return;
    pillShown = false;
    if (Motion) Motion.animate(pill, { opacity: 0 }, { duration: 0.2 });
    else pill.style.opacity = "0";
  }

  /* `slide` false snaps the pill into place instead of springing it, used
     on first appearance (so it doesn't fly in from the corner) and after a
     resize (so it doesn't chase links that moved). */
  function placePill(slide) {
    if (!pill) return;

    var link = list.querySelector("a.is-active");
    if (!link || isMenuLayout()) return hidePill();

    var to = {
      x: link.offsetLeft,
      y: link.offsetTop,
      width: link.offsetWidth,
      height: link.offsetHeight,
    };
    var animate = slide && pillShown && !reducedMotion.matches;

    if (Motion) {
      Motion.animate(pill, to, animate ? SPRING : { duration: 0 });
      if (!pillShown) Motion.animate(pill, { opacity: 1 }, { duration: 0.2 });
    } else {
      // Without Motion, a snap means turning the CSS transition off for
      // one frame.
      if (!animate) pill.style.transition = "none";
      pill.style.transform = "translate(" + to.x + "px, " + to.y + "px)";
      pill.style.width = to.width + "px";
      pill.style.height = to.height + "px";
      pill.style.opacity = "1";
      if (!animate) {
        void pill.offsetWidth; // apply the snap before re-enabling
        pill.style.transition = "";
      }
    }
    pillShown = true;
  }

  /* In the swipeable strip, keep the active link in view. Scrolls the strip
     only, never the page. */
  function revealInStrip(link, instant) {
    if (!link || !isStripLayout()) return;
    var left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    list.scrollTo({
      left: Math.max(0, left),
      behavior: instant || reducedMotion.matches ? "auto" : "smooth",
    });
  }

  function setActive(link) {
    if (link && link.classList.contains("is-active")) return;
    links.forEach(function (a) {
      a.classList.toggle("is-active", a === link);
    });
    placePill(true);
    revealInStrip(link, false);
  }

  /* ---- active section (index.html) --------------------------------------
     Highlights the link whose section crosses the middle of the screen.
     The hero is watched too, with no link of its own, so scrolling back to
     the top clears the highlight instead of leaving the last one lit. */
  function trackSections() {
    if (!("IntersectionObserver" in window)) return;

    var byId = {};
    var targets = [];

    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      var section = document.getElementById(href.slice(1));
      if (!section) return;
      byId[section.id] = link;
      targets.push(section);
    });
    if (!targets.length) return;

    var hero = document.querySelector(".hero");
    if (hero) targets.push(hero);

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(byId[entry.target.id] || null);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }

  /* ---- hamburger menu --------------------------------------------------- */

  function isOpen() {
    return nav.classList.contains("is-open");
  }

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

    // The panel itself fades in via CSS; Motion staggers the links in after it.
    if (open && Motion && !reducedMotion.matches) {
      Motion.animate(
        links,
        { opacity: [0, 1], x: [10, 0] },
        { delay: Motion.stagger(0.035), duration: 0.22, ease: "easeOut" }
      );
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!isOpen());
  });

  // A link was picked: the menu has done its job.
  list.addEventListener("click", function (event) {
    if (isOpen() && event.target.closest && event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("click", function (event) {
    if (isOpen() && !nav.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });

  /* ---- resizing ---------------------------------------------------------
     Links move when the window changes size or the layout switches, so the
     pill snaps to its new spot, and an open menu closes if the window grows
     out of the menu layout. Batched to one update per frame. */
  var resizeQueued = false;
  window.addEventListener("resize", function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      if (isOpen() && !isMenuLayout()) setOpen(false);
      placePill(false);
    });
  });

  /* ---- startup ---------------------------------------------------------- */
  placePill(false);
  revealInStrip(list.querySelector("a.is-active"), true);
  trackSections();
})();
