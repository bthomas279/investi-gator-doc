/* ==========================================================================
   Investi-gator playground — controller

   Owns all state and all DOM. One state object, one render pass per change,
   listeners delegated off the section root the way backend/main.js does it.

   The flow is deliberately linear and one-directional:

     an event  ->  mutate state  ->  render()  ->  DOM

   Nothing reads values back out of the DOM to decide what to do next, so
   there is only ever one answer to "what is the page showing". The one
   exception is the textarea: re-rendering it under the user would eat their
   cursor mid-sentence, so it keeps its own DOM state and pushes into
   `state` rather than being pushed from it.
   ========================================================================== */
(function () {
  "use strict";

  var IG = window.IGShared;
  var Render = window.PlaygroundRender;
  var Engine = window.PlaygroundEngine;

  /* Both detectors are configured with maxLength: 256 tokens. English runs
     roughly four characters per token, so 1000 characters is about 250
     tokens — right up against that ceiling without going over it. Anything
     longer would be spent on text the model never sees.

     It also bounds LIME, whose cost scales with word count. An unbounded
     paste is how you get a thirty-second explanation. */
  var MAX_CHARS = 1000;

  /* A recommendation, not a rule. Short posts still classify, they just
     give the models less to work with, so the page says so and lets the
     user decide. Nothing is disabled by this number. */
  var RECOMMENDED_CHARS = 80;

  var root = document.getElementById("playground");
  if (!root || !IG || !Render || !Engine) return;

  var el = {
    banner: root.querySelector("#pg-banner"),
    loadPanel: root.querySelector("#pg-load"),
    samples: root.querySelector("#pg-samples"),
    input: root.querySelector("#pg-input"),
    counter: root.querySelector("#pg-counter"),
    advice: root.querySelector("#pg-advice"),
    analyze: root.querySelector("#pg-analyze"),
    results: root.querySelector("#pg-results"),
  };

  var state = {
    // checking | idle | loading | ready | classifying | results | error
    phase: "checking",
    text: "",
    results: null,
    reasoning: {},          // type -> { phase, data, startedAt, error }
    loadProgress: null,
    cached: false,          // weights already in this browser's Cache Storage
    keepCached: true,       // write weights to disk, or run session-only
    storageBytes: null,     // what this origin is currently using, once known
    clearing: false,
    error: null,
  };

  /* Staleness. Model work can take upwards of thirty seconds, so a result
     can easily arrive after the thing it was computed for is gone. Two
     counters, because the two kinds of work go stale for different reasons:

       generation   bumped by every new classification. Any reasoning still
                    running belongs to the previous text and must be dropped
                    — otherwise it resolves and repaints an explanation of a
                    post that is no longer on screen.

       reasonToken  per detection type. Re-running one detector's reasoning
                    must not invalidate the other's, which a single shared
                    counter would do: click "View AI Text Reasoning", then
                    "View Scam Reasoning", and the first panel would sit on
                    its progress bar forever.

     Nothing is actually cancelled. The work finishes and its result is
     discarded, which needs no cooperation from the bundle. */
  var generation = 0;
  var reasonToken = {};

  /* ---- rendering -------------------------------------------------------- */

  function formatBytes(bytes) {
    var mb = bytes / 1048576;
    return mb >= 1024
      ? (mb / 1024).toFixed(2) + " GB"
      : Math.round(mb) + " MB";
  }

  function renderBanner() {
    if (!el.banner) return;
    if (Engine.source() === "bundle") {
      el.banner.hidden = true;
      return;
    }
    el.banner.hidden = false;
    el.banner.innerHTML =
      "<strong>Simulated results.</strong> The detection bundle is not wired " +
      "up on this page yet, so a keyword stand-in is filling in for the " +
      "models. The layout, the scores, and both explanations are real in " +
      "shape but not in substance.";
  }

  function renderLoadPanel() {
    if (!el.loadPanel) return;

    // Momentary: we are asking Cache Storage whether the weights are already
    // here. Rendering the download pitch first and yanking it away a beat
    // later would be worse than a blank panel for one frame.
    if (state.phase === "checking") {
      el.loadPanel.innerHTML = '<div class="pg-load-copy"><h3>Checking for cached models…</h3></div>';
      return;
    }

    if (state.phase === "idle") {
      el.loadPanel.innerHTML =
        '<div class="pg-load-copy">' +
        "<h3>Load the Models</h3>" +
        "<p>The detectors availiable are run entirely in your browser, and the text you paste " +
        "never leaves your device or is saved. In order to test these models you will have to download them locally first: around " +
        "<strong>277&nbsp;MB</strong> total for both. It should take less than 40 seconds at most.</p>" +
        "<p> You can choose whether or not to keep the models long term. If you decide to keep them, you'll always have a choice to remove them later. " +
        "</p>" +
        "</div>" +
        '<div class="pg-load-actions">' +
        '<button class="btn btn-primary" id="pg-load-btn" type="button">Load models</button>' +
        '<label class="pg-keep"><input type="checkbox" id="pg-keep"' +
        (state.keepCached ? " checked" : "") + ">" +
        "Check to keep them on this device so the next visit is instant. Uncheck to run " +
        "them only for this tab session and store nothing on your device.</label>" +
        "</div>";
      return;
    }

    if (state.phase === "loading") {
      el.loadPanel.innerHTML =
        '<div class="pg-load-copy"><h3>' +
        (state.cached ? "Starting models…" : "Loading models…") +
        "</h3>" +
        (state.cached
          ? '<p class="pg-meta">Models already downloaded on this device. Reading them ' +
            "back from cache.</p>"
          : "") +
        "</div>" +
        (state.loadProgress ? Render.progress(state.loadProgress) : "");
      return;
    }

    var backend = Engine.backend();
    var stored = Engine.isPersisted() && state.cached;

    /* Storage is stated plainly and is undoable. Someone who tries this once
       should not silently keep 200MB forever, and should not have to go
       digging through browser settings to get it back. */
    var storage = stored
      ? '<p class="pg-meta">Stored in this browser' +
        (state.storageBytes ? " · " + formatBytes(state.storageBytes) : "") +
        ". Refreshing restarts them in a only few seconds. " +
        "</p>" +
        '<button class="pg-clear" id="pg-clear" type="button"' +
        (state.clearing ? " disabled" : "") + ">" +
        (state.clearing ? "Removing…" : "Remove downloaded models") +
        "</button>"
      : '<p class="pg-meta">Running only from this tab session memory. ' +
        "Closing the tab will remove the models.</p>";

    el.loadPanel.innerHTML =
      '<div class="pg-load-copy"><h3>Models ready</h3>' +
      '<p class="pg-meta">build <code>' + IG.escapeHtml(Engine.version()) + "</code>" +
      (backend ? " · running on <code>" + IG.escapeHtml(backend) + "</code>" : "") +
      "</p>" + storage + "</div>";
  }

  function renderInputState() {
    var len = state.text.length;
    var thin = len > 0 && len < RECOMMENDED_CHARS;
    var tooLong = len > MAX_CHARS;

    if (el.counter) {
      el.counter.textContent = len + " / " + MAX_CHARS;
      el.counter.classList.toggle("is-under", thin);
      el.counter.classList.toggle("is-over", tooLong);
    }

    /* Advisory, deliberately separate from the counter and from the button's
       enabled state. Short text is worth flagging but it is not an error,
       and wording it as one would stop people trying the thing this page
       exists for. */
    if (el.advice) {
      el.advice.textContent = thin
        ? "Under " + RECOMMENDED_CHARS + " characters. The models will still run, " +
          "but they're more likely to be inaccurate."
        : tooLong
          ? "Over the " + MAX_CHARS + " character limit. Trim it to run analysis."
          : "";
      el.advice.classList.toggle("is-warn", tooLong);
    }

    if (el.analyze) {
      var busy = state.phase === "classifying";
      el.analyze.disabled = busy || !Engine.isLoaded() || len === 0 || tooLong;
      el.analyze.textContent = busy ? "Analyzing…" : "Analyze";
    }
  }

  function reasonPanelInner(type) {
    var r = state.reasoning[type];
    if (!r || r.phase === "idle") return "";
    if (r.phase === "running") {
      return Render.working(
        type === "scam" ? "running LIME over word perturbations" : "scoring sentences",
        Date.now() - r.startedAt
      );
    }
    if (r.phase === "error") {
      return '<p class="pg-error">Could not investigate this one: ' +
        IG.escapeHtml(r.error) + "</p>";
    }
    if (type === "text") {
      // A null scan means the post was too short to split into sentences —
      // a normal outcome, not an error.
      return r.data ? Render.sentenceScan(r.data) : Render.scanUnavailable();
    }
    return Render.wordAttributions(r.data);
  }

  function renderResults() {
    if (!el.results) return;

    if (state.phase === "error") {
      el.results.innerHTML = '<p class="pg-error">' + IG.escapeHtml(state.error) + "</p>";
      return;
    }
    if (!state.results) {
      el.results.innerHTML = "";
      return;
    }

    var results = state.results.list;
    var hits = results.filter(function (r) { return r.detected; });

    var why = hits.map(function (r) {
      var style = IG.detectionStyle(r.type);
      var busy = state.reasoning[r.type] && state.reasoning[r.type].phase === "running";
      var open = state.reasoning[r.type] && state.reasoning[r.type].phase !== "idle";
      return (
        '<section class="pg-why-block">' +
        '<button class="btn btn-ghost pg-why" type="button" data-why="' + r.type + '"' +
        (busy ? " disabled" : "") + ">" +
        // style.label is "AI Text" or "Scam" (views/detection-styles.js), so
        // this reads "View AI Text Reasoning" / "View Scam Reasoning".
        (busy ? "Working…" : open ? "Re-run Reasoning" : "View " +
          IG.escapeHtml(style ? style.label : r.type) + " Reasoning") +
        "</button>" +
        '<div class="pg-reason-slot" id="pg-reason-' + r.type + '">' +
        reasonPanelInner(r.type) +
        "</div>" +
        "</section>"
      );
    }).join("");

    var thin = state.results.text.length < RECOMMENDED_CHARS;

    el.results.innerHTML =
      '<div class="pg-result-head"><h3>Analysis Results</h3></div>' +
      Render.post(state.results.text, results) +
      Render.verdicts(results) +
      (thin
        ? '<p class="pg-thin-note">This post is under ' + RECOMMENDED_CHARS +
          " characters. Both detectors ran but there wasn't much to " +
          "weigh. Don't take these results too seriously.</p>"
        : "") +
      (hits.length
        ? why
        : '<p class="pg-clean-note">Both detectors ran and neither flagged ' +
          "this post.</p>");
  }

  function render() {
    renderBanner();
    renderLoadPanel();
    renderInputState();
    renderResults();
  }

  /* ---- actions ---------------------------------------------------------- */

  async function loadModels() {
    state.phase = "loading";
    state.loadProgress = null;
    render();
    try {
      await Engine.load(function (info) {
        state.loadProgress = info;
        renderLoadPanel();
      }, state.keepCached);
      state.phase = "ready";
      state.cached = state.keepCached ? await Engine.weightsCached() : false;
      state.storageBytes = await Engine.storageUsed();
    } catch (err) {
      state.phase = "error";
      var message = err && err.message ? err.message : "";
      /* 429 is Hugging Face's per-IP rate limit, usually hit on cellular
         data or a VPN where many people share one address. transformers.js
         has no named message for it and throws
         'Error (429) occurred while trying to load file: "<url>".' */
      state.error = /Error \(429\)/.test(message)
        ? "The models were unable to download. Your wifi may be off, or your VPN may be interfering. Try again a little later. Contact me if the issue persists."
        : "The models failed to load. " + message;
    }
    render();
  }

  async function analyze() {
    var text = state.text.trim();
    if (!text || !Engine.isLoaded()) return;

    generation += 1;
    var gen = generation;
    state.phase = "classifying";
    state.reasoning = {};
    render();

    try {
      var list = await Engine.classify(text);
      if (gen !== generation) return;
      state.results = { text: text, list: list };
      state.phase = "results";
    } catch (err) {
      if (gen !== generation) return;
      state.phase = "error";
      state.error = "Classification failed. " + (err && err.message ? err.message : "");
    }
    render();
  }

  async function explain(type) {
    if (!state.results) return;

    var gen = generation;
    var token = reasonToken[type] = (reasonToken[type] || 0) + 1;
    function stale() {
      return gen !== generation || token !== reasonToken[type];
    }

    state.reasoning[type] = { phase: "running", startedAt: Date.now() };
    renderResults();

    /* The clock has to be driven from here because the engine reports no
       reasoning progress. Scoped to the one panel: re-rendering the whole
       result block every second would pull focus off the button that
       started it. */
    var slot = document.getElementById("pg-reason-" + type);
    var ticker = setInterval(function () {
      if (stale()) return clearInterval(ticker);
      if (slot) slot.innerHTML = reasonPanelInner(type);
    }, 1000);

    try {
      var data = await Engine.reason(type, state.results.text);
      if (stale()) return;
      state.reasoning[type] = { phase: "done", data: data };
    } catch (err) {
      if (stale()) return;
      state.reasoning[type] = {
        phase: "error",
        error: (err && err.message) || "unknown error",
      };
    } finally {
      clearInterval(ticker);
    }
    renderResults();
  }

  /* Frees the disk without ending the session: the instantiated models live
     in JS memory, so everything on the page keeps working until the tab is
     closed. Only the next visit pays for the download again. */
  async function clearModels() {
    state.clearing = true;
    renderLoadPanel();
    await Engine.clearWeights();
    state.cached = false;
    state.storageBytes = await Engine.storageUsed();
    state.clearing = false;
    renderLoadPanel();
  }

  /* ---- wiring ----------------------------------------------------------- */

  root.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    if (target.closest("#pg-load-btn")) return void loadModels();
    if (target.closest("#pg-clear")) return void clearModels();
    if (target.closest("#pg-analyze")) return void analyze();

    var why = target.closest("[data-why]");
    if (why) return void explain(why.dataset.why);

    var sample = target.closest("[data-sample]");
    if (sample) {
      var samples = window.PLAYGROUND_SAMPLES || [];
      var picked = samples[+sample.dataset.sample];
      if (!picked || !el.input) return;
      el.input.value = picked.text;
      state.text = picked.text;
      renderInputState();
      el.input.focus();
    }
  });

  /* The checkbox lives inside the region renderLoadPanel() rebuilds, so it
     is delegated off the root rather than bound to the input itself. */
  root.addEventListener("change", function (event) {
    if (!event.target || event.target.id !== "pg-keep") return;
    state.keepCached = event.target.checked;
  });

  if (el.input) {
    el.input.addEventListener("input", function () {
      state.text = el.input.value;
      renderInputState();
    });
  }

  /* Sample buttons are static once painted — no state depends on them. The
     label is rendered here rather than sitting in the HTML so that it
     disappears along with the buttons if the sample file is ever removed. */
  if (el.samples) {
    var samples = window.PLAYGROUND_SAMPLES || [];
    el.samples.innerHTML = samples.length
      ? '<span class="pg-samples-label">Premade examples:</span>' +
        samples.map(function (sample, i) {
          return '<button class="chip pg-sample" type="button" data-sample="' + i + '">' +
            IG.escapeHtml(sample.label) + "</button>";
        }).join("")
      : "";
  }

  /* ---- startup ------------------------------------------------------------
     A page load always has to re-instantiate the ONNX session — no browser
     API keeps a live WASM model across a navigation. What it does NOT have
     to do is re-download, because the weights are in Cache Storage.

     So: if the weights are already here, start automatically. The user has
     already accepted the one expensive part, and making them click through
     the 210MB pitch again on every refresh implies a cost they are not
     paying. If they are not cached, nothing happens until they ask. */
  (async function start() {
    render();   // paints the "checking" panel before the probe suspends us
    state.cached = await Engine.weightsCached();
    state.phase = "idle";
    render();
    if (state.cached) loadModels();
  })();
})();
