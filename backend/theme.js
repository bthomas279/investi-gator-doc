/* ==========================================================================
   Investi-gator — light / dark theme (both pages)

   Loaded in <head>, before the page draws, so it never flashes the wrong
   theme for a moment on load.

     - With no saved choice, the site follows the device's light/dark
       setting, and keeps following it if that setting changes.
     - The sun/moon button in the nav flips it, and the choice is remembered
       on this device from then on.

   The colors themselves are tokens in public/main.css: dark by default,
   light under :root[data-theme="light"].
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "ig-theme";
  var root = document.documentElement;
  var deviceLight = window.matchMedia("(prefers-color-scheme: light)");

  // Storage can be blocked (private windows, strict settings). The toggle
  // still works then; it just won't be remembered.
  function savedTheme() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function saveTheme(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) { /* not remembered */ }
  }

  function deviceTheme() {
    return deviceLight.matches ? "light" : "dark";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);

    var button = document.querySelector(".theme-toggle");
    if (!button) return;
    var label = "Switch to " + (theme === "light" ? "dark" : "light") + " mode";
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  // Runs immediately, while the page is still loading.
  apply(savedTheme() || deviceTheme());

  deviceLight.addEventListener("change", function () {
    if (!savedTheme()) apply(deviceTheme());
  });

  // The button is further down the page, so wire it up once it exists.
  document.addEventListener("DOMContentLoaded", function () {
    var button = document.querySelector(".theme-toggle");
    if (!button) return;

    apply(root.getAttribute("data-theme"));
    button.hidden = false;

    button.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      saveTheme(next);

      // A quick crossfade between themes where the browser supports it;
      // an instant switch everywhere else.
      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.startViewTransition && !reduced) {
        document.startViewTransition(function () { apply(next); });
      } else {
        apply(next);
      }
    });
  });
})();
