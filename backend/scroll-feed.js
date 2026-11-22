/* ==========================================================================
   Investi-gator — scroll feed animation (index.html #passive)

   A looping mock feed: posts drift upward, and as each one passes a point a
   little below the middle of the window it "gets checked". It brightens,
   and if it has detections a badge pops into its header. Posts that leave
   the top move to the bottom with their badge cleared, so the feed never
   ends and every loop plays out the same way.

   Content comes from window.SCROLL_FEED_POSTS (views/scroll-feed-posts.js)
   and badge colors/icons from window.BADGE_STYLES (views/detection-styles.js).
   The badge is built like buildBadge() in the extension's
   src/content-scripts/ui/badge-overlay.ts: the top detection's icon, label,
   "·" and percent, plus "+N" for any others.

   Motion (window.Motion) springs the badge in when it loaded; otherwise the
   browser's own element.animate() does a similar pop. Reduced-motion
   visitors get a still frame with every badge already showing. Without
   JavaScript the figure stays hidden and the text panel stands alone.
   ========================================================================== */

(function () {
  "use strict";

  var posts = window.SCROLL_FEED_POSTS;
  var styles = window.BADGE_STYLES;
  var figure = document.querySelector(".scroll-feed");
  if (!figure || !posts || !posts.length || !styles || !window.IGShared) return;

  var escapeHtml = window.IGShared.escapeHtml;
  var viewport = figure.querySelector(".scroll-feed-viewport");
  var track = figure.querySelector(".scroll-feed-track");

  /* Tuning ---------------------------------------------------------------- */
  var SPEED = 38;        // scroll speed, px per second
  var CHECK_AT = 0.55;   // where posts get checked, as a fraction of the window's height
  var GAP = 12;          // must match the .scroll-feed-track gap in how-it-works.css

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Markup ---------------------------------------------------------------- */

  // A steady avatar color per handle, so nobody needs to pick one in the data file.
  function avatarHue(handle) {
    var hash = 0;
    for (var i = 0; i < handle.length; i++) hash = (hash * 31 + handle.charCodeAt(i)) % 360;
    return hash;
  }

  function badgeMarkup(detections) {
    var top = styles[detections[0][0]];
    var extra = detections.length - 1;
    // Icons are static markup from our own source file, not user input.
    return '<span class="feed-badge" style="background-color:' + top.bg + ';color:' + top.fg + '">' +
      top.icon +
      "<span>" + escapeHtml(top.label) + "</span>" +
      "<span>·</span>" +
      '<span class="feed-badge-pct">' + Number(detections[0][1]) + "%</span>" +
      (extra > 0 ? '<span class="feed-badge-extra">+' + extra + "</span>" : "") +
    "</span>";
  }

  function postMarkup(post, index) {
    var image = post.image === "ai" || post.image === "real"
      ? '<div class="feed-post-img is-' + post.image + '"></div>'
      : "";
    return '<article class="feed-post" data-index="' + index + '">' +
      '<div class="feed-post-head">' +
        '<div class="feed-avatar" style="--avatar-hue:' + avatarHue(post.handle) + '">' +
          escapeHtml(post.name.charAt(0)) +
        "</div>" +
        '<div class="feed-who">' +
          '<span class="feed-name">' + escapeHtml(post.name) + "</span>" +
          '<span class="feed-handle">@' + escapeHtml(post.handle) + "</span>" +
        "</div>" +
        '<div class="feed-badge-slot"></div>' +
      "</div>" +
      '<p class="feed-post-text">' + escapeHtml(post.text) + "</p>" +
      image +
    "</article>";
  }

  /* Checking a post ------------------------------------------------------- */

  // About half the playground's badge pop: grows from half size rather
  // than zero, and the spring is damped so it barely overshoots.
  function pop(badge) {
    if (window.Motion) {
      window.Motion.animate(badge, { scale: [0.5, 1], opacity: [0, 1] },
        { type: "spring", stiffness: 380, damping: 24 });
    } else if (badge.animate) {
      badge.animate(
        [{ transform: "scale(0.5)", opacity: 0 }, { transform: "scale(1.04)", opacity: 1, offset: 0.7 }, { transform: "scale(1)" }],
        { duration: 380, easing: "ease-out" });
    }
  }

  // A soft glow around the post in the badge's color, once.
  function glow(post, color) {
    if (!post.animate) return;
    post.animate([
      { boxShadow: "0 0 0 1px " + color + "00" },
      { boxShadow: "0 0 0 1px " + color + "80, 0 0 11px " + color + "2b", offset: 0.25 },
      { boxShadow: "0 0 0 1px " + color + "00" }
    ], { duration: 1100, easing: "ease-out" });
  }

  function check(post, animate) {
    post.dataset.checked = "true";
    post.classList.add("is-checked");

    var detections = posts[post.dataset.index].detections || [];
    if (!detections.length || !styles[detections[0][0]]) return;

    var slot = post.querySelector(".feed-badge-slot");
    slot.innerHTML = badgeMarkup(detections);
    if (!animate) return;
    pop(slot.firstChild);
    glow(post, styles[detections[0][0]].fg);
  }

  function uncheck(post) {
    delete post.dataset.checked;
    post.classList.remove("is-checked");
    post.querySelector(".feed-badge-slot").innerHTML = "";
  }

  /* The loop -------------------------------------------------------------- */
  var offset = 0;        // how far the track has scrolled, px
  var lastTime = null;
  var onScreen = true;
  var running = false;   // whether a frame is currently scheduled

  function checkPassed(animate) {
    var line = viewport.clientHeight * CHECK_AT;
    Array.prototype.forEach.call(track.children, function (post) {
      if (post.dataset.checked) return;
      if (post.offsetTop + post.offsetHeight * 0.4 - offset <= line) check(post, animate);
    });
  }

  // Posts fully above the window move to the end of the track. Shrinking
  // the offset by the same height keeps everything else where it was.
  function recycle() {
    var first = track.firstElementChild;
    while (first.offsetTop + first.offsetHeight - offset < 0) {
      offset -= first.offsetHeight + GAP;
      track.appendChild(first);
      uncheck(first);
      first = track.firstElementChild;
    }
  }

  function frame(time) {
    // Off-screen: stop scheduling frames until the observer below restarts us.
    if (!onScreen) { running = false; return; }
    // Cap the step so a long pause (hidden tab, slow frame) doesn't jump.
    var seconds = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    offset += SPEED * seconds;
    recycle();
    track.style.transform = "translate3d(0, " + -offset + "px, 0)";
    checkPassed(true);
    window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = null;
    window.requestAnimationFrame(frame);
  }

  /* Start ----------------------------------------------------------------- */
  track.innerHTML = posts.map(postMarkup).join("");
  figure.hidden = false;
  figure.parentElement.classList.add("has-feed");

  if (prefersReducedMotion) {
    Array.prototype.forEach.call(track.children, function (post) { check(post, false); });
    return;
  }

  // Posts already above the check point start with their badges on.
  checkPassed(false);

  // Pause while the feed is off-screen; resume without a jump. (Browsers
  // already pause animation frames in background tabs.)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start();
    }).observe(viewport);
  }
  document.addEventListener("visibilitychange", function () { lastTime = null; });

  start();
})();
