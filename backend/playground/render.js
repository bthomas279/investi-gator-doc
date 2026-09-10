/* ==========================================================================
   Investi-gator playground — markup builders

   Pure functions: state in, HTML string out. No DOM reads, no listeners, no
   engine calls. controller.js owns all of that. Keeping this file pure is
   what makes the result view reviewable without running a model.

   Every badge here goes through IGShared.badgeMarkup, so the playground's
   badges and the ones on index.html cannot drift apart.
   ========================================================================== */
window.PlaygroundRender = (function () {
  "use strict";

  var IG = window.IGShared;

  /* The number on the badge is always "confidence" — the probability of the
     winning class, never below 50%.

     ClassifierResult also carries "strength" (that same confidence rescaled
     onto a full 0-100% range) and the extension lets a user choose between
     them. The playground deliberately does not: strength is currently wrong
     for AI-text detections, and a demo is the worst possible place to show a
     number you already know is broken. Re-add the choice once it is fixed —
     this function is the only place that decides. */
  function metricValue(result) {
    return IG.percent(result.confidence);
  }

  /* One mock feed post: the pasted text, badged the way the extension would
     badge it. Deliberately the same .post-row / .avatar structure as the
     "Detection that happens as you scroll" panel on index.html. */
  function post(text, results) {
    var hits = results.filter(function (r) { return r.detected; });

    var flags = hits.map(function (r) {
      return IG.badgeMarkup(r.type, metricValue(r));
    }).join("");

    return (
      '<article class="pg-post' + (hits.length ? "" : " is-clean") + '">' +
      '<div class="pg-post-head">' +
      '<span class="avatar" aria-hidden="true"></span>' +
      '<div class="pg-post-who">' +
      '<span class="pg-post-name">Pasted text</span>' +
      '<span class="pg-post-handle">@you · just now</span>' +
      "</div>" +
      (flags ? '<div class="pg-post-flags">' + flags + "</div>" : "") +
      "</div>" +
      '<p class="pg-post-body">' + IG.escapeHtml(text) + "</p>" +
      "</article>"
    );
  }

  /* Every detector that ran, including the ones that declined to flag.
     This is the honest half of the result: a demo that only ever shows
     hits reads as a model that flags everything. */
  function verdicts(results) {
    var rows = results.map(function (r) {
      var style = IG.detectionStyle(r.type);
      var name = style ? style.label : r.type;
      return (
        '<li class="pg-verdict' + (r.detected ? " is-hit" : "") + '">' +
        '<span class="pg-verdict-name">' + IG.escapeHtml(name) + "</span>" +
        '<span class="pg-verdict-state">' +
        (r.detected ? "detected" : "not detected") +
        "</span>" +
        '<span class="pg-verdict-value">' + metricValue(r) + "</span>" +
        "</li>"
      );
    }).join("");

    /* The percentage is always the winning class's confidence, so on a
       "not detected" row it reads as certainty the post is clean, not as a
       weak detection. Without saying so, "Scam · not detected · 87%" looks
       like the model is 87% sure it IS a scam. */
    return '<ul class="pg-verdicts">' + rows + "</ul>" +
      '<p class="pg-verdict-note">Percentages are how confident each AI is with its classification. ' +
      '≈100% = "very confident" | ≈50% = "I have no clue what this is".</p>';
  }

  /* AI text reasoning. SentenceScan gives a per-sentence AI-ness score and
     its own count of how many cleared the flag threshold — we never guess
     that threshold, we take the top `flagged` scorers, which is the same
     set by definition. */
  function sentenceScan(scan) {
    var BANDS = {
      mostly: "Mostly AI-generated",
      partly: "Partly AI-generated",
      traces: "Traces of AI-generated text",
    };

    var ranked = scan.sentences
      .map(function (s, i) { return { i: i, score: s.score }; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, scan.flagged);
    var isFlagged = {};
    ranked.forEach(function (r) { isFlagged[r.i] = true; });

    var body = scan.sentences.map(function (s, i) {
      return (
        '<span class="pg-ann pg-ann-sentence' + (isFlagged[i] ? " is-flagged" : "") +
        '" style="--heat:' + s.score.toFixed(3) + '"' +
        ' title="AI-ness ' + IG.percent(s.score) + '">' +
        IG.escapeHtml(s.text) + "</span>"
      );
    }).join(" ");

    return (
      '<div class="pg-reason">' +
      '<p class="pg-reason-head">' +
      "<strong>" + IG.escapeHtml(BANDS[scan.band] || scan.band) + "</strong> — " +
      scan.flagged + " of " + scan.total + " sentences flagged (" +
      IG.percent(scan.aiFraction) + ")" +
      "</p>" +
      '<p class="pg-reason-body">' + body + "</p>" +
      '<p class="pg-reason-key"><span class="pg-key-swatch is-ai"></span>' +
      "Deeper blue means the sentence scored higher for AI-ness.</p>" +
      "</div>"
    );
  }

  /* Scam reasoning. Pulled out of the text as a ranked list rather than
     highlighted in place, which is what the extension itself does — and it
     means WordAttribution.index is only ever used to break ties, never to
     locate a word inside the post. Whatever the LIME tokeniser considers a
     word, the word it hands back is the word we print. */
  function wordAttributions(attributions) {
    /* An empty list is a real answer, not a failure. LIME scores each word by
       how much the scam probability moves when that word is present, then
       drops everything below a small floor. A post whose signals are spread
       across many redundant words produces no winners: removing any single
       one barely changes the verdict, so every score lands near zero.
       Ironically the most blatant scams hit this most often. */
    if (!attributions || !attributions.length) {
      return '<div class="pg-reason"><p class="pg-reason-head">' +
        "<strong>No single word stood out.</strong> Every word scored below " +
        "the threshold for being called important — usually because the " +
        "signals here are spread across many words rather than concentrated " +
        "in a few, so removing any one of them barely changes the verdict." +
        "</p></div>";
    }

    var max = attributions.reduce(function (m, a) {
      return Math.max(m, Math.abs(a.score));
    }, 0) || 1;

    var rows = attributions
      .slice()
      .sort(function (a, b) {
        return Math.abs(b.score) - Math.abs(a.score) || a.index - b.index;
      })
      .map(function (a) {
        var toward = a.score >= 0;
        return (
          '<li class="pg-word ' + (toward ? "is-toward" : "is-away") + '"' +
          ' style="--w:' + (Math.abs(a.score) / max).toFixed(3) + '">' +
          '<span class="pg-word-text">' + IG.escapeHtml(a.word) + "</span>" +
          '<span class="pg-word-bar"><span></span></span>' +
          '<span class="pg-word-score">' +
          (toward ? "+" : "−") + Math.abs(a.score).toFixed(3) +
          "</span></li>"
        );
      }).join("");

    return (
      '<div class="pg-reason">' +
      '<p class="pg-reason-head"><strong>Word importance</strong> — the ' +
      attributions.length + " words that moved the decision most</p>" +
      '<ul class="pg-words">' + rows + "</ul>" +
      '<p class="pg-reason-key">' +
      '<span class="pg-key-swatch is-toward"></span>pushed toward scam' +
      '<span class="pg-key-swatch is-away"></span>pushed away' +
      "</p>" +
      "</div>"
    );
  }

  /* The text detector splits a post into sentences to explain it, so a post
     it cannot split gets no scan back. That is a normal outcome for a short
     post, not a failure, and it needs to read as one. */
  function scanUnavailable() {
    return (
      '<div class="pg-reason"><p class="pg-reason-head">' +
      'This post is too shallow to deeply analyze. A post needs at least 3 "sentences" to run informative AI-text reasoning.' +
      "</p></div>"
    );
  }

  /* Shared progress row, used by both model loading and reasoning. */
  function progress(info) {
    var pct = info.total ? Math.round((info.loaded / info.total) * 100) : null;
    var detail = pct === null ? "" : " " + pct + "%";
    if (info.stage === "download" && info.total) {
      detail = " " + Math.round(info.loaded / 1048576) + " / " +
        Math.round(info.total / 1048576) + " MB";
    }
    /* aria-live="off" because this sits inside the polite #pg-results
       region. Download progress ticks several times a second — without this
       a screen reader would read the percentage aloud on every tick. The
       finished result announces itself when it replaces this. */
    return (
      '<div class="pg-progress" aria-live="off">' +
      '<div class="pg-progress-bar"><span style="width:' + (pct === null ? 100 : pct) + '%"></span></div>' +
      '<p class="pg-progress-label">' + IG.escapeHtml(info.label || "working") + detail + "</p>" +
      "</div>"
    );
  }

  /* Reasoning has no progress events to report — the bundle exposes none,
     because LIME cannot say how far along it is until it is done. So this
     is an indeterminate bar plus a running clock, which is the honest
     signal: not "62% complete", just "still going, and here is how long".
     On a long post this can legitimately run for half a minute. */
  function working(label, elapsedMs) {
    var seconds = Math.floor(elapsedMs / 1000);
    return (
      '<div class="pg-progress" aria-live="off">' +
      '<div class="pg-progress-bar is-indeterminate"><span></span></div>' +
      '<p class="pg-progress-label">' + IG.escapeHtml(label) +
      " · " + seconds + "s</p>" +
      "</div>"
    );
  }

  return {
    post: post,
    verdicts: verdicts,
    working: working,
    sentenceScan: sentenceScan,
    scanUnavailable: scanUnavailable,
    wordAttributions: wordAttributions,
    progress: progress,
    metricValue: metricValue,
  };
})();
