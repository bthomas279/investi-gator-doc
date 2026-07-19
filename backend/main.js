/* ==========================================================================
   Investi-gator — overview page behavior

   Purely progressive enhancement. The page is fully readable without this
   file; everything here just adds polish on top of the static markup.
   ========================================================================== */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll reveal --------------------------------------------------------
     Fade cards in as they enter the viewport. Elements are only hidden
     once we know IntersectionObserver is available, so a browser without
     it (or with JS off) shows everything immediately. */
  function initScrollReveal() {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

    var targets = document.querySelectorAll(".feat, .step, .media, .highlight");
    if (!targets.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });

    targets.forEach(function (el, i) {
      el.classList.add("reveal");
      // Stagger siblings slightly so a row animates in sequence.
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      observer.observe(el);
    });
  }

  /* Active nav link ------------------------------------------------------
     Highlight the nav link whose section is currently in view. */
  function initActiveNav() {
    if (!("IntersectionObserver" in window)) return;

    var links = Array.prototype.slice.call(
      document.querySelectorAll('.nav-links a[href^="#"]')
    );
    if (!links.length) return;

    var byId = {};
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      byId[id] = link;
      sections.push(section);
    });

    if (!sections.length) return;

    function setActive(id) {
      links.forEach(function (link) {
        link.classList.toggle("is-active", link === byId[id]);
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* Current year in the footer ------------------------------------------- */
  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function init() {
    initScrollReveal();
    initActiveNav();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
