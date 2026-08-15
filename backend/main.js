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

    var targets = document.querySelectorAll(".feat, .step, .media-item, .highlight");
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

  /* Detection badges -----------------------------------------------------
     Paint the sample badges using the extension's real BADGE_STYLES
     (see views/detection-styles.js) so the page always matches what the
     extension actually renders. The markup ships with plain-text labels as
     a fallback, so this only ever upgrades what's already there. */
  function initDetectionBadges() {
    var styles = window.BADGE_STYLES;
    if (!styles) return;

    document.querySelectorAll("[data-detection]").forEach(function (el) {
      var style = styles[el.dataset.detection];
      if (!style) return;

      el.style.background = style.bg;
      el.style.color = style.fg;
      el.style.borderColor = style.fg;
      // Icons are static markup from our own source file, not user input.
      el.innerHTML = style.icon + "<span>" + style.label + "</span>";
    });
  }

  /* Update log -----------------------------------------------------------
     Renders the patch notes feed (#updates), the "What's New" summary in the
     demo section, and the popup both of them open. Everything comes from
     window.UPDATES (see views/updates.js), so the page never holds a second
     copy of an update's text. */

  // Update text is ours, not user input, but it still goes through escaping
  // so an ampersand or angle bracket in a patch note can't break the markup.
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Escape first, then allow **bold** as the one bit of inline formatting.
  function inlineText(str) {
    return escapeHtml(str).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  // Built from parts on purpose: new Date("2026-08-07") is parsed as UTC and
  // can land on the previous day for anyone west of Greenwich.
  function parseDate(iso) {
    var parts = String(iso).split("-");
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  }

  function formatDate(iso, withWeekday) {
    var options = { year: "numeric", month: "long", day: "numeric" };
    if (withWeekday) options.weekday = "short";
    return parseDate(iso).toLocaleDateString(undefined, options);
  }

  // Gator head in profile, jaws open. Filled rather than stroked on purpose:
  // at this size an outline of a long snout closes up into a blob, while a
  // solid silhouette keeps its shape. The eye is knocked out of the upper jaw
  // by the evenodd fill rule, so it shows the card behind it at any color.
  var GATOR_ICON =
    '<svg width="20" height="20" viewBox="0 0 24 24">' +
    '<path fill="currentColor" fill-rule="evenodd" d="M2.3 10C2.3 6.3 4.6 3.8 8 3.8c2.4 0' +
    " 4.2 1.5 5 3.7l7.7 1.9c1.8.4 1.8 2.5 0 2.8l-18.4.7Z" +
    'M9.2 8.6a1.45 1.45 0 1 0-2.9 0 1.45 1.45 0 1 0 2.9 0Z"/>' +
    '<path fill="currentColor" d="M4.3 14.9l16.4 1.9c1.6.2 1.6 2.5 0 2.7l-11.6 1c-3.1.3-4.8-1.8-4.8-4.1Z"/>' +
    "</svg>";

  function updateCardMarkup(update, index) {
    var kicker = update.kicker
      ? '<span class="update-kicker">' + escapeHtml(update.kicker) + "</span>"
      : "";
    // Spans rather than <h3>/<p>: a <button> may only contain phrasing
    // content, and updates.css gives these back their block layout.
    var title = '<span class="update-title">' + escapeHtml(update.title) + "</span>";

    if (update.type === "minor") {
      return (
        '<button class="update-card is-minor" type="button" data-update="' + index + '">' +
        '<span class="update-icon" aria-hidden="true">' + GATOR_ICON + "</span>" +
        '<span class="update-card-body">' + kicker + title + "</span>" +
        "</button>"
      );
    }

    var thumb = update.thumb
      ? '<span class="update-thumb"><img src="' + escapeHtml(update.thumb.src) +
        '" alt="' + escapeHtml(update.thumb.alt || "") + '" loading="lazy"></span>'
      : "";
    var excerpt = update.excerpt
      ? '<span class="update-excerpt">' + inlineText(update.excerpt) + "</span>"
      : "";

    return (
      '<button class="update-card is-major" type="button" data-update="' + index + '">' +
      thumb +
      '<span class="update-card-body">' + kicker + title + excerpt + "</span>" +
      "</button>"
    );
  }

  // One header per day, then that day's cards beneath it — same shape as the
  // update lists the popup is modeled on.
  function renderUpdatesFeed(feed, updates) {
    var html = "";
    var lastDate = null;

    updates.forEach(function (update, index) {
      if (update.date !== lastDate) {
        html += '<p class="update-date">' + escapeHtml(formatDate(update.date)) + "</p>";
        lastDate = update.date;
      }
      html += updateCardMarkup(update, index);
    });

    feed.innerHTML = html;
  }

  /* The demo section's "What's New" block: title and date only, with the
     details left to the popup the button opens. */
  function renderLatestUpdate(host, update, index) {
    host.innerHTML =
      "<h3>What's New: " + escapeHtml(update.title) + "</h3>" +
      '<p class="latest-date">' + escapeHtml(formatDate(update.date)) + "</p>" +
      '<button class="btn btn-ghost" type="button" data-update="' + index + '">' +
      "Read the full patch notes →</button>";
  }

  // Sizing values come from our own data file, but they land inside a style
  // attribute, so anything outside a plain CSS value is dropped rather than
  // written through.
  function safeCssValue(value) {
    var text = String(value == null ? "" : value).trim();
    return /^[\w\s.,%/()#-]+$/.test(text) ? text : "";
  }

  function styleAttr(declarations) {
    var css = declarations
      .filter(function (pair) {
        return pair[1];
      })
      .map(function (pair) {
        return pair[0] + ":" + pair[1];
      })
      .join(";");

    return css ? ' style="' + css + '"' : "";
  }

  /* A media slot. The frame is 16:9 with the image cropped to fill, which
     suits a screenshot but not, say, a wide strip of metrics — so `ratio`,
     `fit`, and `maxWidth` can retune any single slot. They are written as
     inline styles on that slot alone, so every other image keeps the
     defaults from updates.css. */
  function updateMediaMarkup(media) {
    if (!media || !media.src) return "";

    var frameStyle = styleAttr([
      ["aspect-ratio", safeCssValue(media.ratio)],
      ["max-width", safeCssValue(media.maxWidth)],
    ]);
    // object-fit has no effect on an iframe, so embeds only take the frame.
    var fitStyle = styleAttr([["object-fit", safeCssValue(media.fit)]]);

    var element;
    if (media.kind === "video") {
      element =
        "<video controls preload=\"metadata\"" +
        (media.poster ? ' poster="' + escapeHtml(media.poster) + '"' : "") +
        ' src="' + escapeHtml(media.src) + '"' + fitStyle + "></video>";
    } else if (media.kind === "embed") {
      element =
        '<iframe src="' + escapeHtml(media.src) +
        '" title="' + escapeHtml(media.title || "Update video") +
        '" allowfullscreen loading="lazy"></iframe>';
    } else {
      element =
        '<img src="' + escapeHtml(media.src) +
        '" alt="' + escapeHtml(media.alt || "") + '" loading="lazy"' + fitStyle + ">";
    }

    return (
      '<figure class="update-media">' +
      '<div class="media-frame"' + frameStyle + ">" + element + "</div>" +
      (media.caption ? "<figcaption>" + inlineText(media.caption) + "</figcaption>" : "") +
      "</figure>"
    );
  }

  /* The prose and bullets of a notes block, without its wrapper. Shared by
     the patch notes themselves and the "What's Next?" panel. */
  function notesMarkup(block) {
    // `text` takes one paragraph or several.
    var paragraphs = block.text ? [].concat(block.text) : [];
    var items = block.items || [];

    return (
      paragraphs
        .map(function (paragraph) {
          return "<p>" + inlineText(paragraph) + "</p>";
        })
        .join("") +
      (items.length
        ? "<ul>" +
          items
            .map(function (item) {
              return "<li>" + inlineText(item) + "</li>";
            })
            .join("") +
          "</ul>"
        : "")
    );
  }

  /* One block of a popup's body. A block is either a media slot or a run of
     notes (heading, prose, bullets — each optional), so an update can keep
     writing below an image or video simply by listing another block after
     the media one. */
  function updateBlockMarkup(block) {
    if (!block) return "";
    if (block.media) return updateMediaMarkup(block.media);

    return (
      '<div class="patch-section">' +
      (block.heading ? "<h4>" + escapeHtml(block.heading) + "</h4>" : "") +
      notesMarkup(block) +
      "</div>"
    );
  }

  /* "What's Next?" — the work in progress, closing out the popup below the
     media. Written as a plain string (one paragraph), an array of strings
     (bullets), or the full { heading, text, items } block. */
  function whatsNextMarkup(whatsNext) {
    if (!whatsNext) return "";

    var block = whatsNext;
    if (typeof whatsNext === "string") block = { text: whatsNext };
    else if (Array.isArray(whatsNext)) block = { items: whatsNext };

    var body = notesMarkup(block);
    if (!body) return "";

    return (
      '<div class="whats-next">' +
      "<h4>" + escapeHtml(block.heading || "What's Next?") + "</h4>" +
      body +
      "</div>"
    );
  }

  function initUpdates() {
    var updates = window.UPDATES;
    if (!updates || !updates.length) return;

    var feed = document.getElementById("updates-feed");
    var latest = document.getElementById("latest-update");
    var modal = document.getElementById("update-modal");

    if (feed) renderUpdatesFeed(feed, updates);
    if (latest) renderLatestUpdate(latest, updates[0], 0);
    if (!modal) return;

    var dialog = modal.querySelector(".update-dialog");
    var head = modal.querySelector(".update-dialog-meta");
    var titleEl = modal.querySelector("#update-modal-title");
    var body = modal.querySelector(".update-dialog-body");
    var closeBtn = modal.querySelector(".update-close");
    var lastFocused = null;

    function open(update) {
      head.innerHTML =
        (update.kicker
          ? '<span class="update-kicker">' + escapeHtml(update.kicker) + "</span>"
          : "") +
        '<span class="update-posted">Posted ' +
        escapeHtml(formatDate(update.date, true)) +
        "</span>";

      titleEl.textContent = update.title;

      // The excerpt does double duty: preview text on the card, and the
      // opening paragraph the popup leads with.
      body.innerHTML =
        (update.excerpt ? '<p class="update-lead">' + inlineText(update.excerpt) + "</p>" : "") +
        (update.sections || []).map(updateBlockMarkup).join("") +
        // Shorthand for the common case: media last, no block needed.
        updateMediaMarkup(update.media) +
        // Always last, so it closes the popup out below any media.
        whatsNextMarkup(update.whatsNext);

      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.classList.add("no-scroll");
      dialog.scrollTop = 0;
      closeBtn.focus();
    }

    function close() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.classList.remove("no-scroll");
      // Stop any video that was left playing inside the popup.
      body.innerHTML = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    // One delegated listener covers the feed cards and the demo section's
    // "read the full patch notes" button, including cards added later.
    document.addEventListener("click", function (event) {
      if (!event.target || !event.target.closest) return;

      var trigger = event.target.closest("[data-update]");
      if (trigger) {
        var update = updates[+trigger.dataset.update];
        if (update) open(update);
        return;
      }
      if (event.target.closest(".update-close, .update-modal-backdrop")) close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });
  }

  /* Current year in the footer ------------------------------------------- */
  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function init() {
    initDetectionBadges();
    initUpdates();
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
