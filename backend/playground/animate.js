/* ==========================================================================
   Investi-gator playground — animations

   Every bit of motion on the results that needs JavaScript lives here, so
   render.js stays pure markup and controller.js stays about state. The
   controller calls in at three moments:

     resultsIn(root)        classification finished: badges spring onto the
                            post, confidence meters grow from the middle,
                            and every percentage rolls up from 50%
     illustrate(root)       start any reasoning illustration on screen
                            (LIME word flicker, sentence-by-sentence wave)
     reasoningIn(slot)      reasoning finished: its result fades in piece by
                            piece, and the word-importance bars grow in

   Two tools, on purpose:

     Motion (window.Motion)   one-off springs and staggers.
     element.animate()        the looping illustrations. This is the
                              browser's built-in animation engine, which
                              runs opacity animations off the main thread.
                              That matters because the models run ON the
                              main thread, and these loops play exactly
                              while the models are busy.

   Everything is optional. No Motion, no animation support, or "reduce
   motion" turned on: the page shows the same final state, just without the
   movement. Nothing here changes what the page says.
   ========================================================================== */
window.PlaygroundAnimate = (function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Read on each call rather than once, so script load order can't matter.
  function motion() {
    return reducedMotion.matches ? null : window.Motion || null;
  }

  function canLoop() {
    return !reducedMotion.matches && typeof Element.prototype.animate === "function";
  }

  /* ---- classification finished ----------------------------------------- */

  var COUNT_SECONDS = 0.9;
  var BADGE_DELAY = 0.08; // first badge
  var BADGE_GAP = 0.12;   // each badge after it
  var ROW_GAP = 0.08;     // each detector row after the first

  /* Rolls a percentage like "92%" up from 50% to its real value. 50% is
     where these models' confidence starts ("no clue"), so the count never
     passes through numbers the model can't produce. The element's own text
     is the target, and it's put back exactly at the end, so the final
     number is always the one render.js wrote. */
  function countUp(Motion, el, delay) {
    var finalText = el.textContent;
    var target = parseFloat(finalText);
    if (isNaN(target)) return;

    var start = Math.min(50, target);
    el.textContent = start + "%";
    Motion.animate(start, target, {
      duration: COUNT_SECONDS,
      delay: delay,
      ease: "easeOut",
      onUpdate: function (value) { el.textContent = Math.round(value) + "%"; },
      onComplete: function () { el.textContent = finalText; },
    });
  }

  function resultsIn(root) {
    var Motion = motion();
    if (!root || !Motion) return;

    /* The results area is a live region that screen readers announce. While
       the numbers roll, aria-busy tells them to wait, so they read out the
       final values once instead of every step of the count. */
    root.setAttribute("aria-busy", "true");
    setTimeout(function () { root.removeAttribute("aria-busy"); },
      (COUNT_SECONDS + BADGE_DELAY + BADGE_GAP * 4) * 1000);

    // Badges pop onto the post with a bounce, one after another, the way
    // they appear on a post in the real extension. Each one's number rolls
    // up as it lands.
    var badges = root.querySelectorAll(".pg-post-flags .flag");
    if (badges.length) {
      Motion.animate(
        badges,
        { scale: [0.3, 1], opacity: [0, 1] },
        { type: "spring", stiffness: 520, damping: 17, delay: Motion.stagger(BADGE_GAP, { startDelay: BADGE_DELAY }) }
      );
      badges.forEach(function (badge, i) {
        var value = badge.querySelector(".flag-value");
        if (value) countUp(Motion, value, BADGE_DELAY + i * BADGE_GAP);
      });
    }

    // Each detector row: its meter grows out from the middle while its
    // number rolls up alongside, so the two finish together.
    root.querySelectorAll(".pg-verdict").forEach(function (row, i) {
      var delay = i * ROW_GAP;
      Motion.animate(row, { opacity: [0.35, 1] }, { duration: 0.35, delay: delay });

      var fill = row.querySelector(".pg-meter-fill");
      if (fill) {
        Motion.animate(fill, { scaleX: [0, 1] }, { duration: COUNT_SECONDS, delay: delay, ease: "easeOut" });
      }

      var value = row.querySelector(".pg-verdict-value");
      if (value) countUp(Motion, value, delay);
    });
  }

  /* ---- reasoning illustrations ----------------------------------------- */

  /* LIME: each word dims out and back in on its own randomized clock, so at
     any moment a different random group of words is "hidden", which is
     what LIME is actually doing to the post. */
  function limeFlicker(container) {
    container.querySelectorAll(".pg-lime-word").forEach(function (word) {
      var duration = 1800 + Math.random() * 1600;
      word.animate(
        [
          { opacity: 1, offset: 0 },
          { opacity: 1, offset: 0.5 },
          { opacity: 0.12, offset: 0.62 },
          { opacity: 0.12, offset: 0.85 },
          { opacity: 1, offset: 1 },
        ],
        {
          duration: duration,
          // A random head start, so the words don't all begin in step.
          delay: -Math.random() * duration,
          iterations: Infinity,
          easing: "ease-in-out",
        }
      );
    });
  }

  /* AI text: one sentence at a time lights up while the rest stay dim, as
     if each is being scored in turn, then the pass starts over. Keyframes
     are worked out per sentence because the number of sentences varies. */
  var STEP_MS = 650; // how long the highlight spends on each sentence
  var DIM = 0.3;

  function sentenceWave(container) {
    var sentences = container.querySelectorAll(".pg-wave-sentence");
    var count = sentences.length;
    if (!count) return;

    // At least three steps per pass so a short post still has a beat of
    // rest, plus a little tail so the last sentence can fade out.
    var cycle = (Math.max(count, 3) + 0.6) * STEP_MS;

    sentences.forEach(function (sentence, i) {
      var start = (i * STEP_MS) / cycle;
      var lit = (i * STEP_MS + 180) / cycle;
      var hold = ((i + 1) * STEP_MS) / cycle;
      var out = ((i + 1) * STEP_MS + 260) / cycle;

      sentence.animate(
        [
          { opacity: DIM, offset: 0 },
          { opacity: DIM, offset: start },
          { opacity: 1, offset: lit },
          { opacity: 1, offset: hold },
          { opacity: DIM, offset: out },
          { opacity: DIM, offset: 1 },
        ],
        { duration: cycle, iterations: Infinity, easing: "ease-in-out" }
      );
    });
  }

  /* Starts every illustration inside `root`. Safe to call after any
     re-render: a re-render makes new elements, and new elements start
     fresh. */
  function illustrate(root) {
    if (!root || !canLoop()) return;
    root.querySelectorAll('[data-illustrate="lime"]').forEach(limeFlicker);
    root.querySelectorAll('[data-illustrate="wave"]').forEach(sentenceWave);
  }

  /* ---- reasoning finished ---------------------------------------------- */

  function reasoningIn(slot) {
    var Motion = motion();
    if (!slot || !Motion) return;

    // Scored sentences appear one after another, in reading order.
    var sentences = slot.querySelectorAll(".pg-ann-sentence");
    if (sentences.length) {
      Motion.animate(sentences, { opacity: [0, 1] }, { duration: 0.35, delay: Motion.stagger(0.09) });
    }

    // Ranked words slide in from the top of the list down (strongest word
    // first), and each one's bar grows out from zero just after it lands.
    var words = slot.querySelectorAll(".pg-word");
    if (words.length) {
      Motion.animate(words, { opacity: [0, 1], x: [-10, 0] }, { duration: 0.3, delay: Motion.stagger(0.06) });
      var bars = slot.querySelectorAll(".pg-word-bar span");
      Motion.animate(bars, { scaleX: [0, 1] }, { duration: 0.6, ease: "easeOut", delay: Motion.stagger(0.06, { startDelay: 0.12 }) });
    }
  }

  return {
    resultsIn: resultsIn,
    illustrate: illustrate,
    reasoningIn: reasoningIn,
  };
})();
