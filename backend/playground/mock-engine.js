/* ==========================================================================
   Investi-gator playground — stand-in engine

   NOT A MODEL. A keyword scorer that returns the same shapes the real
   detectors return, so the whole page — loading, progress, badges, both
   reasoning views, the empty state — can be built and reviewed before the
   bundle from the private repo exists.

   It mirrors the REAL bundle's surface exactly — init(), detectors,
   classify(detector, text), reason(detector, text) returning the same
   { attributions } / { scan } wrappers — so engine.js adapts both through
   one code path instead of each getting its own. A stand-in on a private
   side road proves nothing about the road everyone else drives on.

   When the bundle is present engine.js picks that instead and this file is
   never called. It stays as the fallback for anyone whose browser cannot
   run the real thing, or who declines a 170MB download.

   Two rules this file has to keep:
     1. Deterministic. The same text always scores the same, so a reviewer
        comparing the stand-in to the real models is comparing like to like.
     2. Never silently plausible. engine.js reports source() === "mock" and
        the controller puts a banner on every result. Nothing here should
        ever be mistaken for a real classification.
   ========================================================================== */
window.PlaygroundMockEngine = (function () {
  "use strict";


  /* Markers, roughly in the spirit of what each detector keys on. Weight is
     how hard a hit pushes the score up. */
  var AI_TEXT_MARKERS = [
    ["delve", 3], ["tapestry", 3], ["moreover", 2], ["furthermore", 2],
    ["in conclusion", 3], ["it is important to note", 3], ["navigate the", 2],
    ["landscape", 2], ["underscore", 2], ["multifaceted", 3], ["realm of", 2],
    ["fostering", 2], ["leverage", 1], ["robust", 1], ["seamless", 2],
    ["testament to", 3], ["ever-evolving", 3], ["crucial role", 2],
  ];

  var SCAM_MARKERS = [
    ["click here", 3], ["act now", 3], ["limited time", 3], ["guaranteed", 3],
    ["free money", 4], ["winner", 3], ["you have won", 4], ["dm me", 3],
    ["crypto", 2], ["wallet", 2], ["investment opportunity", 4], ["double your", 4],
    ["risk-free", 3], ["urgent", 2], ["verify your account", 4], ["suspended", 2],
    ["bit.ly", 3], ["telegram", 2], ["giveaway", 2], ["100%", 2],
  ];

  /* Stable per-string jitter, so scores are varied but never random. */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return (h % 1000) / 1000;
  }

  function markerScore(text, markers) {
    var lower = String(text).toLowerCase();
    var hits = 0;
    markers.forEach(function (m) {
      if (lower.indexOf(m[0]) !== -1) hits += m[1];
    });
    // Squash the hit count into 0-1, then nudge by the stable jitter so
    // two texts with identical hits do not print identical percentages.
    var base = 1 - Math.exp(-hits / 6);
    return Math.min(0.99, Math.max(0.01, base * 0.9 + hash(lower) * 0.1));
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* Split into sentences for the AI-text scan. Keeps the trailing
     punctuation on each sentence so the rebuilt post reads normally. */
  function splitSentences(text) {
    var parts = String(text).match(/[^.!?]+[.!?]*\s*/g) || [String(text)];
    return parts.map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function toResult(type, score) {
    // The real classifiers report the winning class, so confidence is
    // always >= 0.5. Below the decision point that means confidence in
    // "not this", which is what a detected:false result carries.
    var detected = score >= 0.5;
    var confidence = detected ? score : 1 - score;
    return {
      type: type,
      detected: detected,
      confidence: confidence,
      strength: (confidence - 0.5) * 2,
    };
  }

  var progressHook = null;

  /* Synchronous and loads nothing, same as the bundle. */
  function init(options) {
    progressHook = (options && options.onProgress) || null;
  }

  /* The bundle downloads weights on the first classify() per detector, so
     the stand-in fakes that here — otherwise the progress bar would never
     be exercised against realistic numbers. */
  var warmed = {};
  var SIZES = { text: 172 * 1024 * 1024, scam: 44 * 1024 * 1024 };

  async function fakeDownload(detector) {
    if (warmed[detector]) return;
    warmed[detector] = true;
    var total = SIZES[detector] || 50 * 1024 * 1024;
    var file = detector + "-detector/onnx/model_quantized.onnx";
    for (var step = 0; step <= 10; step++) {
      if (progressHook) {
        progressHook({ status: "progress", file: file, loaded: (total / 10) * step, total: total });
      }
      await sleep(45);
    }
    if (progressHook) progressHook({ status: "ready", file: file });
  }

  /* One detector, one result — the bundle's shape, not an array. */
  async function classify(detector, text) {
    await fakeDownload(detector);
    await sleep(300);
    var markers = detector === "text" ? AI_TEXT_MARKERS : SCAM_MARKERS;
    return toResult(detector, markerScore(text, markers));
  }

  /* AI text: one forward pass per sentence, cheap and quick. */
  async function reasonAiText(text) {
    var raw = splitSentences(text);
    var sentences = [];
    for (var i = 0; i < raw.length; i++) {
      await sleep(90);
      sentences.push({ text: raw[i], score: markerScore(raw[i], AI_TEXT_MARKERS) });
    }

    // The real scan reports how many sentences cleared its flag threshold.
    // The stand-in uses 0.5; render.js never assumes that number, it just
    // trusts whatever `flagged` says.
    var flagged = sentences.filter(function (s) { return s.score >= 0.5; }).length;
    var fraction = sentences.length ? flagged / sentences.length : 0;
    return {
      sentences: sentences,
      flagged: flagged,
      total: sentences.length,
      aiFraction: fraction,
      band: fraction >= 0.6 ? "mostly" : fraction >= 0.25 ? "partly" : "traces",
    };
  }

  /* Scam: LIME over word-level perturbations. The expensive one — the
     sample loop is here mainly so the progress UI is built against work
     that actually takes a while. */
  async function reasonScam(text) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var SAMPLES = 120;
    for (var s = 0; s <= SAMPLES; s += 10) {
      await sleep(70);
    }

    var attributions = words.map(function (word, index) {
      var clean = word.toLowerCase().replace(/[^a-z0-9$.]/g, "");
      var weight = 0;
      SCAM_MARKERS.forEach(function (m) {
        if (m[0].indexOf(" ") === -1 && clean.indexOf(m[0]) !== -1) weight += m[1];
      });
      // Words with no marker still get a small signed nudge, the way a real
      // attribution has noise around zero rather than exact zeros.
      var noise = (hash(clean + index) - 0.5) * 0.24;
      return { word: word, score: weight ? weight / 4 + noise : noise, index: index };
    });

    // Real LIME returns the top contributors, not every token.
    return attributions
      .sort(function (a, b) { return Math.abs(b.score) - Math.abs(a.score); })
      .slice(0, 14)
      .sort(function (a, b) { return a.index - b.index; });
  }

  /* Wrapped exactly as the bundle wraps them: { scan } for text (null when
     the text is too short to split), { attributions } for scam. */
  async function reason(detector, text) {
    if (detector === "text") {
      var scan = await reasonAiText(text);
      return { scan: scan.total < 2 ? null : scan };
    }
    if (detector === "scam") return { attributions: await reasonScam(text) };
    throw new Error("no reasoning for detector: " + detector);
  }

  return {
    version: "stand-in",
    backend: "none",
    detectors: ["scam", "text"],
    init: init,
    classify: classify,
    reason: reason,
  };
})();
