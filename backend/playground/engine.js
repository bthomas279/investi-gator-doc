/* ==========================================================================
   Investi-gator playground — engine

   The single seam between this documentation site and the real detection
   code. Nothing else in backend/playground/ knows which implementation is
   answering, and nothing else should learn.

   ---------------------------------------------------------------------------
   WHAT THE BUNDLE ACTUALLY EXPOSES

   public/vendor/investi-gator-core.js is built from transfer-doc.ts in the
   private repo and defines a global `InvestiGator`:

     InvestiGator.init(options)                    -> void, synchronous
     InvestiGator.detectors                        -> ["scam", "text"]
     InvestiGator.classify(detector, text)         -> Promise<ClassifierResult>
     InvestiGator.reason(detector, text)           -> Promise<ReasonPayload>
     InvestiGator.analyze(text, detector)          -> Promise<AnalyzeResult>
     InvestiGator.modelConfidence(detector, text)  -> Promise<number>

   Three things about that shape drive everything in this file:

   1. init() is synchronous and loads nothing. Weights download lazily on
      the first classify() for a given detector, and there is no exported
      warm-up. So "Load models" is implemented as init() followed by a
      throwaway classify() per detector — that is the only way to make the
      download happen on the user's click rather than on their first real
      question.

   2. classify() is per detector and returns ONE result. The page wants
      every detector's verdict at once, so load() and classify() fan out
      across InvestiGator.detectors here.

   3. reason() returns a wrapper, not the payload:
        scam -> { attributions: WordAttribution[] }
        text -> { scan: SentenceScan | null }   (null when the text is too
                                                 short to split into sentences)
      render.js is given the unwrapped payload, and the null case is a real
      state the page has to show rather than an error.

   Progress comes from transformers.js as ProgressInfo
   ({ status, file, loaded, total, progress }) and is normalised here into
   the flat { stage, loaded, total, label } shape the renderer draws.
   ---------------------------------------------------------------------------

   backend/playground/mock-engine.js implements this same surface, so both
   implementations run through the one adapter below rather than each
   getting its own path. It stands in when the bundle is missing or the
   browser cannot run it, and the page says so in an undismissable banner.
   ========================================================================== */
window.PlaygroundEngine = (function () {
  "use strict";

  /* An implementation only counts if it has everything we are going to
     call. A partial global is worse than none: it would load fine and then
     throw halfway through someone's first classification. */
  function usable(candidate) {
    return !!candidate &&
      typeof candidate.init === "function" &&
      typeof candidate.classify === "function" &&
      typeof candidate.reason === "function";
  }

  var real = usable(window.InvestiGator) ? window.InvestiGator : null;
  var impl = real || window.PlaygroundMockEngine;

  /* Only detectors this site has a badge for. The bundle's registry is the
     source of truth for what exists; BADGE_STYLES decides what we can draw.
     Anything the bundle gains later shows up here automatically, but only
     once it has a badge style to render with. */
  function detectorIds() {
    var ids = (impl && impl.detectors) || ["scam", "text"];
    return Array.prototype.slice.call(ids).filter(function (id) {
      return !!window.IGShared.detectionStyle(id);
    });
  }

  var state = { loaded: false, loading: false, backend: null, persisted: true };

  /* Are the weights already on this device?

     transformers.js sets useBrowserCache = (options.cache ?? true), so every
     .onnx it downloads goes into the Cache Storage bucket named below and
     survives a reload, a new tab, and a browser restart. That means a
     refresh costs no bandwidth — only the few seconds it takes to read the
     weights back and instantiate the ONNX session, which no browser API can
     persist across a page load.

     Knowing which of those two situations we are in is the difference
     between honestly saying "a few seconds" and wrongly implying another
     210MB. It is also what makes auto-starting on refresh reasonable: the
     expensive, metered part has already been paid.

     Returns false rather than throwing anywhere it cannot tell — a private
     window, a browser with site data blocked, a non-secure origin. Being
     wrong here only costs a click. */
  var TRANSFORMERS_CACHE = "transformers-cache";

  async function weightsCached() {
    if (typeof caches === "undefined") return false;
    try {
      var cache = await caches.open(TRANSFORMERS_CACHE);
      var keys = await cache.keys();
      return keys.some(function (request) {
        return /\.onnx(\?|$)/.test(request.url);
      });
    } catch (err) {
      return false;
    }
  }

  /* transformers.js ProgressInfo -> the renderer's flat shape. */
  function normaliseProgress(info) {
    if (!info) return { stage: "download", label: "loading" };
    if (info.status === "progress") {
      return {
        stage: "download",
        loaded: info.loaded,
        total: info.total,
        label: info.file || "model weights",
      };
    }
    if (info.status === "ready" || info.status === "done") {
      return { stage: "compile", label: "preparing " + (info.file || "model") };
    }
    return { stage: "download", label: info.file || info.status || "loading" };
  }

  /* Short and harmless. Its only job is to make from_pretrained() run, so
     the weights are on disk before the user's real text arrives. */
  var WARM_TEXT = "hello there, just checking in on things today.";

  /* How much storage this origin is using. Practically all of it is the
     model cache — the rest of the site stores nothing — so this is a fair
     stand-in for "how much space the models are taking", without having to
     read 210MB of response bodies back to measure them exactly. */
  async function storageUsed() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      var estimate = await navigator.storage.estimate();
      return typeof estimate.usage === "number" ? estimate.usage : null;
    } catch (err) {
      return null;
    }
  }

  /* Delete the cached weights. The models already instantiated in this tab
     keep working — they live in JS memory, not in the cache — so this frees
     the disk without ending the session. The next visit downloads again. */
  async function clearWeights() {
    if (typeof caches === "undefined") return false;
    try {
      return await caches.delete(TRANSFORMERS_CACHE);
    } catch (err) {
      return false;
    }
  }

  /* keepCached=false runs the models without ever writing them to disk.
     They live in memory for this tab and vanish when it closes, at the cost
     of downloading again next time. */
  async function load(onProgress, keepCached) {
    if (state.loaded || state.loading) return state;
    state.loading = true;
    var report = onProgress || function () {};
    state.persisted = keepCached !== false;

    try {
      impl.init({
        cache: state.persisted,
        onProgress: function (info) { report(normaliseProgress(info)); },
      });

      /* Sequential, not Promise.all: two large downloads racing each other
         makes the progress bar jump between files and finishes neither any
         sooner on a single connection. Registry order puts the lighter
         model first. */
      var ids = detectorIds();
      for (var i = 0; i < ids.length; i++) {
        report({ stage: "download", label: ids[i] + " detector" });
        await impl.classify(ids[i], WARM_TEXT);
      }

      // The bundle does not report which ONNX backend it settled on, so
      // this stays null unless an implementation volunteers it. Better a
      // missing line in the UI than a confidently wrong one.
      state.backend = impl.backend || null;
      state.loaded = true;
      return state;
    } finally {
      state.loading = false;
    }
  }

  async function classify(text) {
    if (!state.loaded) throw new Error("models are not loaded yet");
    var ids = detectorIds();
    var results = await Promise.all(ids.map(function (id) {
      return impl.classify(id, text);
    }));
    // The bundle already sets `type`, but the page keys badges off it, so
    // it is pinned to the detector we actually asked for rather than
    // trusted to come back correct.
    return results.map(function (result, i) {
      return Object.assign({}, result, { type: ids[i] });
    });
  }

  /* Returns the unwrapped payload: a SentenceScan (or null) for "text",
     a WordAttribution[] for "scam". */
  async function reason(type, text) {
    if (!state.loaded) throw new Error("models are not loaded yet");
    var payload = await impl.reason(type, text);
    if (!payload) return null;
    if (type === "text") return payload.scan === undefined ? payload : payload.scan;
    return payload.attributions || payload;
  }

  return {
    /* "bundle" once the real build is loaded, "mock" until then. The
       controller reads this to decide whether to show the simulated
       banner — that decision lives in exactly one place on purpose. */
    source: function () { return real ? "bundle" : "mock"; },
    version: function () { return (impl && impl.version) || "docs build"; },
    backend: function () { return state.backend; },
    isLoaded: function () { return state.loaded; },
    isPersisted: function () { return state.persisted; },
    isLoading: function () { return state.loading; },
    detectorIds: detectorIds,
    weightsCached: weightsCached,
    storageUsed: storageUsed,
    clearWeights: clearWeights,

    load: load,
    classify: classify,
    reason: reason,
  };
})();
