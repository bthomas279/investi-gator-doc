/* ==========================================================================
   Investi-gator — shared UI helpers

   The small pieces that more than one page needs. index.html renders
   detection badges in the feature grid and the mock feed; playground.html
   renders the same badges on live model output. Both go through here, so
   a badge always looks the same no matter who drew it.

   Loaded as a plain <script> before main.js and before anything in
   backend/playground/. Hangs one object off the global, same contract as
   views/detection-styles.js.
   ========================================================================== */
window.IGShared = (function () {
  "use strict";

  /* Text going into innerHTML is ours, not user input, everywhere on
     index.html. On playground.html it IS user input — whatever someone
     pastes into the box — so this is load-bearing there, not a formality. */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Look up one detection type's presentation.
     Returns null for an unknown type so callers can skip rather than throw. */
  function detectionStyle(type) {
    var styles = window.BADGE_STYLES;
    return (styles && styles[type]) || null;
  }

  /* Build a detection badge as markup.
     main.js paints its badges by mutating elements that already exist in the
     static HTML; the playground has no static markup to paint, so it needs
     the same badge as a string. Both end up identical because both read
     BADGE_STYLES.

     value — optional trailing number ("92%"). Omitted on index.html, where
             the badges are illustrative and have no score behind them. */
  function badgeMarkup(type, value) {
    var style = detectionStyle(type);
    if (!style) return "";
    return (
      '<span class="flag" style="background:' + style.bg +
      ";color:" + style.fg + ";border-color:" + style.fg + '">' +
      style.icon +
      "<span>" + escapeHtml(style.label) + "</span>" +
      (value ? '<span class="flag-value">' + escapeHtml(value) + "</span>" : "") +
      "</span>"
    );
  }

  /* Percentage for display. The models hand back 0.0-1.0; every number the
     user sees is a whole percent, so rounding lives in exactly one place. */
  function percent(value) {
    return Math.round(Number(value) * 100) + "%";
  }

  return {
    escapeHtml: escapeHtml,
    detectionStyle: detectionStyle,
    badgeMarkup: badgeMarkup,
    percent: percent,
  };
})();
