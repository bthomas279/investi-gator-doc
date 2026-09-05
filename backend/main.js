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

  /* Tech stack badges ----------------------------------------------------
     Paint the #tech lists from window.TECH_STACK (see views/tech-stack.js).
     Each <div data-tech="..."> names a group in that file and is filled
     with one brand-colored badge per tool. Entries with no brand color fall
     back to the shared muted style and the generic glyph. */
  function initTechStack() {
    var groups = window.TECH_STACK;
    if (!groups) return;

    document.querySelectorAll("[data-tech]").forEach(function (list) {
      var items = groups[list.dataset.tech];
      if (!items) return;

      list.innerHTML = items.map(function (item) {
        var generic = !item.bg;
        var classes = "tech-badge";
        if (generic) classes += " is-generic";
        else if (item.fg === "dark") classes += " is-dark-ink";

        // Labels are ours, not user input, but they still pass through
        // escapeHtml so an "&" in a name can't break the markup.
        return '<span class="' + classes + '"' +
               (generic ? "" : ' style="--badge:' + item.bg + '"') + ">" +
               (item.icon || window.TECH_GENERIC_ICON || "") +
               "<span>" + escapeHtml(item.label) + "</span>" +
               "</span>";
      }).join("");
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

  /* Gator head in profile, jaws open. Drawn the way the tech-stack logos are:
     one solid silhouette rather than an outline, since at 20px a stroked
     snout closes up into a blob.

     It is a single path, not a jaw plus a separate lower jaw. The mouth is a
     notch cut into the right side, so the head reads as one connected shape
     instead of two floating slabs. The notch stops short of the back of the
     skull rather than tapering to a point — a wedge that narrows to nothing
     turns to grey mush once it drops below a pixel.

     Three teeth, not a full row: at this size a finer sawtooth stops reading
     as teeth and starts reading as noise. The eye is knocked out by the
     evenodd fill rule, so it shows the card behind it at any color. */
  var GATOR_ICON =
    '<svg width="20" height="20" viewBox="0 0 24 24">' +
    '<path fill="currentColor" fill-rule="evenodd" d="' +
    // cranium, brow ridge, snout, rounded nose
    "M6.67 4.24C9.27 4.24 11.18 5.84 12.18 7.69C14.77 7.99 17.98 8.39 20.58 8.74" +
    "C22.38 8.99 22.38 11.09 20.58 11.34" +
    // upper bite line, back toward the hinge
    "L19.78 11.39L17.98 13.51L16.18 11.62L14.37 13.74L12.58 11.85L10.77 13.97L8.98 12.08" +
    // back of the mouth, then the lower jaw out to its tip and around
    "L4.88 12.34L4.88 14.64L20.18 16.64C21.88 16.89 21.88 18.99 20.18 19.24" +
    // underside of the jaw, throat, and up the back of the skull
    "L9.37 19.74C5.77 19.99 2.07 17.64 2.07 13.84C2.07 8.24 3.47 4.24 6.67 4.24Z" +
    // eye
    "M7.98 8.14a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 1 0 2.5 0Z" +
    '"/></svg>';

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

  /* A table slot, same shape as the media one: a figure with an optional
     caption, sized with `maxWidth` alone since a table's own columns set its
     height. Wrapped in a scroll container so a wide table doesn't blow out
     the popup on narrow screens. */
  function tableMarkup(table) {
    if (!table || !table.rows || !table.rows.length) return "";

    var frameStyle = styleAttr([["max-width", safeCssValue(table.maxWidth)]]);
    var headers = table.headers || [];

    // Every row is padded out to the widest one so a row written with a cell
    // or two missing still gets its full set of borders and stripes rather
    // than stopping short mid-table.
    var columns = table.rows.reduce(function (widest, row) {
      return Math.max(widest, row.length);
    }, headers.length);

    function cells(tag, row) {
      var html = "";
      for (var i = 0; i < columns; i++) {
        html += "<" + tag + ">" + inlineText(row[i] == null ? "" : row[i]) + "</" + tag + ">";
      }
      return "<tr>" + html + "</tr>";
    }

    var head = headers.length ? "<thead>" + cells("th", headers) + "</thead>" : "";

    var body =
      "<tbody>" +
      table.rows
        .map(function (row) {
          return cells("td", row);
        })
        .join("") +
      "</tbody>";

    return (
      '<figure class="update-table">' +
      '<div class="table-scroll"' + frameStyle + ">" +
      "<table>" + head + body + "</table>" +
      "</div>" +
      (table.caption ? "<figcaption>" + inlineText(table.caption) + "</figcaption>" : "") +
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
    if (block.table) return tableMarkup(block.table);

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
        // Shorthand for the common case: media/table last, no block needed.
        updateMediaMarkup(update.media) +
        tableMarkup(update.table) +
        // Always last, so it closes the popup out below any media/table.
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
    initTechStack();
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
