# Edits log

Running record of structural changes to this site — what moved, what was
added, and why. Newest first.

---

## 2026-11-17 (idea 4) — Confidence meters and count-ups

- **Two-sided meter in each detector row** (`meter()` in `render.js`).
  The middle line is "unsure" (50%). The fill grows right, in the
  detector's color (scam red, AI-text blue), when it detected, and left,
  in green, when it didn't. So "not detected · 98%" visibly points toward
  clean. The fill length is computed from `confidence`, the same number
  the row prints, so they can't disagree.
- **Percentages roll up from 50%**, on the badge and on the row, as the
  results arrive. 50% is where these models' confidence starts, so the
  count never shows a number the model can't produce. It always lands on
  the exact text render.js wrote. `aria-busy` on the results area makes
  screen readers wait and read only the final values.
- **Word-importance bars grow in**, strongest word first.
- Layout: the rows are `name | meter | state | value` on wider screens.
  At 560px and down the meter gets its own full-width line.
- Reduced motion: final values and full bars right away.

## 2026-11-17 (fix) — Reasoning stuck after the cleanup bundle

**Cause:** the cleaned-up bundle renamed the keys its reasoning comes back
under, `attributions` → `lime_attributions` and `scan` → `sw_scan`.
`engine.js` only knew the old names, so it handed render.js the wrapper
object instead of the data. render.js crashed drawing it, and because that
happened after the clock had stopped, the panel froze on "processing" at
0s. Every redraw of the results hit the same crash, so the scam panel got
stuck too. The LIME and sentence-scoring logic itself is unchanged.

**Fix:**
- `engine.js` accepts both names (`REASON_KEYS`, newest first). If the
  bundle sends a shape it doesn't recognize, it now fails right there
  with a message naming the keys it got, instead of passing the bad data
  on to render.js.
- It also translates two names that never matched, even with the old
  bundle: `totalSentances` → `total` (the AI-text head would have said
  "3 of undefined sentences") and band `bits` → `traces`.
- `controller.js`: a panel the renderer can't draw now shows an error in
  that panel only, instead of freezing every panel.
- `mock-engine.js` now uses the bundle's real names, so the stand-in tests
  the translation instead of skipping it. That mismatch is why these bugs
  never showed up in testing.

**Verified against the real bundle and models** (headless Chrome, fresh
download, 48s to load): both reasonings complete and render.

**Still true, and not a page bug:** while LIME runs, the page's main thread
is blocked for several seconds (one probe waited 4.4s for a reply), so the
seconds counter can't tick until it finishes. See the note to the developer
in the conversation about yielding between model passes in the private repo.

## 2026-11-17 (newest) — Demo page: watching the models work

Three illustrations of what the models are doing. All three are labeled
as illustrations in the code: the bundle reports no progress, so the order
and timing are made up, and the seconds counter stays the only real number.

| Moment | What you see |
|---|---|
| Analyze clicked | The post appears right away with a light sweeping down it. One row per detector, with a dot pulsing in that detector's badge colors. |
| Results arrive | Badges spring onto the post one after another. The detector rows settle. |
| Scam reasoning running | The post redrawn with random groups of words fading out and back in, which is what LIME does. |
| AI-text reasoning running | A blue highlight moves through the sentences one at a time, as if each is being scored. |
| Reasoning finished | Scored sentences / ranked words fade in in order. |

**New file:** `backend/playground/animate.js` holds all the JavaScript
motion, so `render.js` stays pure markup and `controller.js` stays about
state. The looping illustrations use the browser's built-in
`element.animate()`, which runs opacity animations off the main thread.
That matters here because the models run ON the main thread, and these
loops play exactly while the models are busy.

**Controller changes, all small:**
- **The reasoning clock now ticks only its own text** (`.pg-elapsed`).
  Before, it rebuilt the whole panel every second, which would have
  restarted the illustration every second.
- **`nextPaint()` before model work.** It lets the browser draw the
  scanning view and start its animations before the main thread gets busy.
  Without it the scan would never appear.
- **`MIN_SCAN_MS = 900`.** The scan stays up at least that long, because a
  fast classification would otherwise flash it for a split second. It's
  cosmetic; set it to 0 to show results instantly.
- **On phones, Analyze scrolls the results into view**, so the scan is on
  screen to watch.

Reduce motion, no Motion library, or no animation support: same content,
no movement.

## 2026-11-17 (latest) — Nav layouts settled

The final order, which replaces the tables in both entries below:

| Width | Layout |
|---|---|
| 861px and up | links in a row, theme button, sliding pill |
| 561–860px | brand + theme button on top, swipeable strip below, sliding pill |
| 560px and down | brand, theme button, hamburger; links in a dropdown panel |

**Hamburger line fix.** One of the three bars used to look thicker. The
bars were 5px apart, and with display scaling (Windows at 125%, phones) a
CSS pixel isn't a whole screen pixel, so each bar landed on a different
fraction of one. They're now 8px apart, which is a whole number of screen
pixels at every common scale. Checked at 125% and 150%. The reason is
written next to the rule in `nav.css` so the spacing doesn't get
"tidied" back.

## 2026-11-17 (later) — Theme button, stronger aurora

- ~~**No more hamburger.**~~ Reversed in the entry above: the hamburger is
  back, for phone widths only.
- **Light/dark button** in the nav (`backend/theme.js`, new, loaded in
  `<head>` so the page never flashes the wrong theme). Until a visitor
  clicks it, the site follows their device setting. After that, their
  choice is remembered on that device (`localStorage` key `ig-theme`).
  The light colors in `main.css` moved from `@media (prefers-color-scheme:
  light)` to `:root[data-theme="light"]`. Without JavaScript the site shows
  the dark theme.
- **Aurora is visible now.** Brighter glows, 18s/23s loops instead of
  28s/37s, and roughly twice the travel distance. Tuning notes are next to
  the keyframes in `background.css` and the `--aurora-*` tokens in
  `main.css`.

## 2026-11-17 — Animated background, responsive nav, Motion

### Background (`public/background.css`, new)

- **Aurora:** two slow-drifting layers of soft green/blue glow behind
  every page, pinned to the screen.
- **Scan grid:** a faint grid behind the index hero, with a light line that
  sweeps down it every 7 seconds. The hero's original glow moved here from
  `main.css`.
- Only `transform`/`opacity` are animated, because the browser runs those
  off the main thread. That matters on the playground, where the models run
  ON the main thread and would freeze anything driven by JavaScript.
- Colors are tokens in `main.css` (`--aurora-*`, `--grid-line`, `--scan-*`),
  with separate light-mode values. To make the effect stronger or weaker,
  change the alpha numbers there.

### Nav (`public/nav.css` + `backend/nav.js`, both new)

One set of markup, three layouts by width:

| Width | Layout |
|---|---|
| 861px and up | links in a row, sliding pill behind the active one |
| 561–860px | hamburger button, dropdown panel |
| 560px and down | swipeable tab strip under the brand, with the pill |

- Before this, phones under 640px had **no nav links at all**.
- The breakpoints exist only in `nav.css`. `nav.js` asks the page which
  layout is showing, so there is only one place to change them.
- Active-section tracking moved from `main.js` into `nav.js`, since the
  pill needs it on both pages. Scrolling back to the hero now clears the
  highlight instead of leaving the last section lit.
- `html { scroll-padding-top }` stops jump links from landing under the
  sticky bar, which is two rows tall in the strip layout.

### Motion

Loaded from jsDelivr, pinned to `motion@14.8.0` with an integrity hash, so
a changed file is refused. It drives the pill's spring and the staggered
menu links. **If it fails to load, the nav still works**, using a plain CSS
transition (the `.no-motion` class). The full browser build is ~178 KB raw
(~55 KB over the wire) and is cached after the first visit. To remove it,
delete the two `<script>` tags and nothing breaks.

---

## 2026-09-07 — Storage is now visible, optional, and reversible

### What "the browser caches the models" actually meant

transformers.js writes the weights into the **Cache API**, in a bucket named
`transformers-cache`. Specifically:

- **Scoped to the origin**, not to the dev server process. `localhost:5500`
  is an origin; restarting the server does not touch what is stored under
  it. That is why the models stayed cached across a server restart.
- **Survives** reloads, tab closes, and browser restarts.
- **Best-effort, not persistent.** The site never calls
  `navigator.storage.persist()`, so the browser is allowed to evict it under
  disk pressure — but nothing makes it do so, and nothing should be counted
  on. In practice it sits there until the user clears site data.
- **Counts against the origin's storage quota**, alongside IndexedDB and
  localStorage.

So the concern was right: before this change, someone who tried the demo
once kept ~210 MB indefinitely, was never told, and had no way to undo it
short of digging through browser settings.

### Three changes

**1. The choice is offered before anything downloads.** The load panel now
has a checkbox, ticked by default: keep the models on this device, or run
them for this session only. Unticking passes `cache: false` to `init()`, so
transformers.js never writes to disk — the models live in tab memory, work
normally, and vanish when the tab closes. The cost is downloading again next
visit, which is the honest trade and is stated as such.

**2. What is stored is stated plainly.** When the models are cached, the
ready panel says so and shows the actual figure from
`navigator.storage.estimate()`. That measures the whole origin rather than
the cache alone, but this page stores nothing else, so it is a fair number.

**3. It is reversible from the page.** A "Remove downloaded models" button
calls `caches.delete("transformers-cache")`.

The useful property of that last one: **removing the cache does not end the
session.** The instantiated models live in JS memory, not in Cache Storage,
so everything on the page keeps working until the tab is closed — only the
next visit pays for the download again. Someone can finish what they were
doing and still leave nothing behind.

Every storage helper returns `null`/`false` rather than throwing where the
APIs are missing (private windows, blocked site data, insecure origins).

### What was deliberately not done

- **Auto-clearing on unload.** `beforeunload` is unreliable and it would
  make the cache pointless — identical in effect to session-only mode, but
  without the user having chosen it.
- **Defaulting to session-only.** It would mean 210 MB per visit for repeat
  visitors, which is worse for them and for Hugging Face's bandwidth. The
  better default with an easy exit beats the cautious default that annoys
  everyone.

### The ordinary post is back

Restored as a third sample using a real, human-written post about
differential forms. It fills the gap noted in the previous entry: a demo
where every sample gets flagged reads as a model that flags everything.

It also happens to be the most interesting of the three — it contains a
link, which is a signal the scam detector weighs, so it tests that a
legitimate post sharing a URL does not get flagged for having one.

Note that its behaviour is only verified against the stand-in, which returns
no detection for it. Whether the real AI-text detector agrees is exactly the
kind of thing this page exists to surface.

The sample row now carries a label — "Premade examples — click one to fill
the box" — rendered alongside the buttons rather than sitting in the HTML,
so it disappears with them if the sample file is ever removed again.

---

## 2026-09-06 (latest) — Token-aligned cap, soft length advice, blue AI heat

### 1000 characters, and now there is a reason for the number

Both detectors are registered with `maxLength: 256` tokens. English averages
roughly four characters per token, so 1000 characters lands around 250 —
right against that ceiling without going past it. Beyond it you would be
typing text the model never sees, which is worse than being stopped, because
nothing tells you it was ignored.

That reasoning is now in the comment on `MAX_CHARS`, so the number does not
look arbitrary next time someone reads it.

### The 80-character minimum became a recommendation

Nothing is disabled by length any more. Any non-empty input runs.

`RECOMMENDED_CHARS` drives advice instead of a rule:

- **While typing**, an advisory line under the counter appears below 80
  characters: the models will still run, short posts just give them less to
  go on. Deliberately not styled as an error, and it does not touch the
  Analyze button — wording it as a failure would stop people trying the
  thing this page exists for.
- **On the result**, a post that was under 80 characters carries a note
  saying so. The input box is out of sight by the time someone is reading a
  percentage, and that is exactly when the caveat matters.

Over the 1000 ceiling is still a hard stop, since past it the input is
genuinely not what gets classified.

The counter itself turns **amber** below 80 and **red** over 1000 — two
different signals for two different situations: a nudge you can ignore
versus a limit you cannot.

### Samples are back, minus the "ordinary post"

`views/playground-samples.js` is restored with two entries. The third, a
deliberately mundane post meant to demonstrate the no-detection path, is
gone because the AI-text detector flagged it — correctly. Filler written to
sound like a normal person, by something that is not one, is exactly what
that model is trained to catch.

That is the detector working, not a bug, but it does leave a gap: no sample
now demonstrates a clean result. A convincing negative example has to be a
real post written by a real person, so it is not something that can be
generated into place. Until one exists, the no-detection view is only
reachable by typing something yourself. Its rendering path is unchanged and
still covered by the checks.

### AI-text reasoning highlights are blue

The sentence heat map was amber, borrowed from `--warn`. It is now blue,
deepening with AI-ness.

Added `--ai` to the tokens in `main.css` (`#60a5fa` dark, `#2563eb` light)
rather than hardcoding a colour in `playground.css`, so it follows the theme
like every other colour. It is the same blue family as the AI Text badge in
`views/detection-styles.js`, which means the heat map reads as the same
signal as the badge it is explaining.

The flagged-sentence underline and the legend swatch moved with it, and the
legend now says "deeper blue" rather than "darker".

Scam attributions keep red/green — those are signed (toward vs away from the
detection), which is a different kind of scale from a single-direction
intensity, and should not look like the same thing.

---

## 2026-09-06 (later still) — Confidence only, 80-char floor, cache-aware start

### Strength is no longer shown

`strength` is currently wrong for AI-text detections, so the confidence /
strength radios are gone and every number on the page is `confidence`. The
decision lives in one function — `metricValue()` in `render.js` — so putting
the choice back once strength is fixed is a small change in one place.

`ClassifierResult.strength` is still read from the bundle and still in the
data; it is simply never rendered. A demo is the worst possible place to
show a number you already know is broken.

### 80-character minimum

> **Superseded by the entry above.** The floor became a recommendation and
> no longer disables anything; the 1500 ceiling became 1000. Kept here for
> the reasoning, which still holds.

Below 80 characters the detectors do not have enough to work with, so
Analyze stays disabled. This is enforced in the page, not the bundle — the
bundle's `assertText` only checks the input is a non-empty string, which is
a different question from whether it is worth classifying.

The character counter carries the rule instead of a separate hint line: it
counts toward `80 minimum` while the box is short, then switches to the
`1500` ceiling once there is enough to run. One number at a time, always
naming the limit that currently matters.

### Reloading no longer means re-downloading

**The 210 MB was never being re-downloaded.** transformers.js sets
`useBrowserCache = (options.cache ?? true)`, so the weights live in the
Cache Storage bucket `transformers-cache` and survive reloads, new tabs and
browser restarts. What repeats on refresh is instantiating the ONNX session
from those cached bytes — seconds, not megabytes.

No browser API can carry a live WASM model across a page load, so that part
cannot be removed. What could be removed was the *appearance* of paying
again, and the pointless click:

- `Engine.weightsCached()` probes Cache Storage for any `.onnx` entry.
- On load the page checks, and **auto-starts if the weights are already
  there**. The user already accepted the expensive part; making them click
  through the 210 MB pitch every refresh implies a cost they are not paying.
- While starting from cache the panel says so — "reading them back from
  cache, no download" — instead of showing the download copy.
- The ready panel now states the reload behaviour outright, so nobody has to
  discover it by experiment.

`weightsCached()` returns false rather than throwing anywhere it cannot tell
(private window, site data blocked, insecure origin). Being wrong there
costs one click.

Worth knowing: a **back/forward navigation** may restore the page from the
browser's bfcache with the loaded models still live in memory, so that case
is already instant. Nothing here breaks that.

### Followed your edits

- `MAX_CHARS` is now 1500, matching the ceiling you put in the HTML.
- The textarea placeholder no longer promises examples, and states the
  80-character minimum.
- Removed the stale "Uncomment once the bundle is committed" comment sitting
  above an already-live script tag.

### One thing to confirm

You deleted `views/playground-samples.js` and its script tag. The controller
tolerates it — `window.PLAYGROUND_SAMPLES || []` — and `.pg-samples:empty`
now collapses the empty row, so the page is correct either way. **If that
deletion was incidental rather than deliberate, say so and I will restore
it**; the sample buttons were the only thing letting someone try the models
without writing 80 characters themselves. All wiring for them is still in
place, so it is a one-file change.

---

## 2026-09-06 (later) — Wired the real bundle

`public/vendor/investi-gator-core.js` is present, so the playground now
drives the actual models. Only `engine.js` and `mock-engine.js` changed
shape; `render.js` and `controller.js` needed one call-signature fix each.
That is the seam doing its job.

### ⚠️ Delete `investi-gator-core.js.map` from this repo

The sourcemap embeds the **complete original TypeScript** of
`transfer-doc.ts`, `detector-core.ts`, `lime.ts` and `sliding-window.ts` —
comments, thresholds and all — in `sourcesContent`. This repo is public and
the extension repo is not. Anyone can read the private source out of it with
one `JSON.parse`.

Keep the map in the private repo. Either stop emitting it for the docs build
or drop it before committing here. Nothing on the page needs it; it is only
for devtools.

### What the bundle actually exposes, vs what I had guessed

| I documented | It actually is |
|---|---|
| `load(onProgress) -> Promise` | `init(options)` — synchronous, loads nothing |
| `classify(text) -> Result[]` | `classify(detector, text) -> Result` — one detector |
| `reason(...) -> payload` | `reason(detector, text) -> { attributions } \| { scan }` |
| — | `detectors`, `analyze`, `modelConfidence` |

Three consequences, all handled in `engine.js`:

1. **`init()` downloads nothing** and there is no exported warm-up, so
   "Load models" is `init()` followed by a throwaway `classify()` per
   detector. Otherwise the first real question would eat the whole download.
   Detectors are warmed sequentially — two large fetches racing makes the
   progress bar jump between files and finishes neither sooner.
2. **`classify()` is per detector**, so the engine fans out across
   `InvestiGator.detectors` and returns the array the page expects.
3. **`reason()` returns a wrapper.** The engine unwraps it, and `{ scan: null }`
   — a post too short to split into sentences — is rendered as an
   explanatory note rather than an error, because it is a normal outcome.

### Scam reasoning is now a ranked list, not inline highlighting

You said the extension separates the top words out rather than highlighting
them in the post, and that you weren't sure what `WordAttribution.index`
indexes. Both point the same way, so the inline highlighting is gone.

`index` is now used only to break ties between equal scores — never to
locate a word inside the text. Whatever the LIME tokeniser calls a word, the
word it hands back is the word printed. **The open question from the last
entry is closed**: nothing depends on how `index` is defined any more.

### Other changes

- **Reasoning progress is an indeterminate bar plus a running clock.** The
  bundle reports no reasoning progress — LIME can't say how far along it is —
  so rather than fake a percentage the panel shows motion and elapsed
  seconds. Honest, and it makes a 30-second run legible.
- **Download size is on the page.** ~210 MB for both models (the text
  detector alone is ~172 MB, per `transfer-doc.ts`). The load panel says so
  before anyone clicks.
- **The stand-in now mirrors the bundle's surface exactly** — `init()`,
  `detectors`, per-detector `classify()`, wrapped `reason()` payloads,
  transformers.js-shaped progress events. Both implementations run through
  one adapter instead of each having its own path. A stand-in on a private
  side road proves nothing about the road everyone else drives on.
- **The backend line is omitted when unknown.** The bundle doesn't report
  which ONNX backend it settled on, and a confidently wrong "running on
  wasm" is worse than saying nothing.
- **Fixed the script tag**: it pointed at `investigator-core.js`; the file is
  `investi-gator-core.js`. It was 404ing, which is why the stand-in banner
  would have stayed up.

### Known cosmetic issue

The bundle's last line is `//# sourceMappingURL=investi-gator-doc.js.map`,
but the committed map is named `investi-gator-core.js.map`. Devtools will
404 looking for it. Fix it in the build (`vite.config.doc.ts` output name)
rather than by hand-editing the artifact, which would be overwritten on the
next build. Moot if the map stops being committed here, which it should.

### Verified

Re-ran the data → engine → markup path against all three samples, plus:

- The real bundle evaluates and exposes `init`/`classify`/`reason` with
  `detectors: ["scam", "text"]`; `engine.usable()` accepts it.
- `reason()` unwrapping returns a scan object for text and an array for scam.
- A two-character input returns `{ scan: null }` and renders the note.
- `<script>` tags in a model-supplied `word` are escaped in the ranked list.

---

## 2026-09-06 — Model playground (`playground.html`)

A second page where visitors paste text and run the AI-text and scam
detectors in their own browser, with the same badges and the same reasoning
the extension shows on a real post.

**The detection bundle does not exist yet.** Everything below is built
against a documented contract and driven by a keyword stand-in until that
bundle lands. The page says so, in a banner that cannot be dismissed.

### New architecture

The site had three roles for its folders. The playground keeps them:

| Folder | Role |
|---|---|
| `public/` | styles, one file per page or section |
| `views/` | data — plain `<script>` files that hang a value off the global |
| `backend/` | behaviour |

Playground behaviour is four files under `backend/playground/`, split so
each one has a single reason to change:

```
backend/
  shared.js                  helpers both pages use
  main.js                    (unchanged role: index.html behaviour)
  playground/
    engine.js                the seam with the real detection bundle
    mock-engine.js           keyword stand-in, satisfies the same contract
    render.js                pure state -> HTML, no DOM, no engine calls
    controller.js            all state, all DOM, all listeners
views/
  playground-samples.js      example texts for the paste box
public/
  playground.css             page styles, all prefixed pg-
playground.html              the page
```

The dependency direction is one way: `controller` → `render` → `shared`, and
`controller` → `engine` → (`bundle` | `mock`). `render.js` never calls the
engine and never touches the DOM, so the entire result view can be tested
without a browser or a model — which is how the checks below were run.

### The seam

`backend/playground/engine.js` is the only file that knows whether the real
models or the stand-in are answering. Its header documents the exact shape
the private repo's bundle has to expose as `window.InvestiGator`:

- `version: string`
- `load(onProgress) -> Promise<{ backend }>`
- `classify(text) -> Promise<ClassifierResult[]>`
- `reason(type, text, onProgress) -> Promise<SentenceScan | WordAttribution[]>`

A bundle missing any of the three functions is rejected outright and the
page falls back to the stand-in. A half-present global would load fine and
then throw partway through someone's first classification, which is worse
than not loading at all.

**To wire up the real thing:** commit the built bundle to
`public/vendor/investigator-core.js` and uncomment its `<script>` tag in
`playground.html`. It must be evaluated *before* `engine.js`. Nothing else
changes — the banner disappears on its own once `engine.source()` reports
`"bundle"`.

### Decisions worth knowing about

**`detected` drives badging.** Confirmed with you: `ClassifierResult.detected`
means the detector fired. Both detectors' results are rendered, including
`detected: false` ones, so the page shows a detector running and declining to
flag. A demo that only ever shows hits reads as a model that flags
everything.

**Percentages needed a caption.** Confidence is always the winning class, so
a "not detected" row showing 87% means 87% sure it is *clean*. Unlabelled,
that reads as a weak detection. There is now a note under the verdict list
saying so.

**Confidence vs strength is a control, not a choice.** The extension makes
it a user setting, so the page has radios rather than picking one.

**One annotation component, two granularities.** `SentenceScan` and
`WordAttribution[]` are both scores over spans of the input, so they share
one CSS treatment — `--heat` for sentence AI-ness, `--w` for word
attribution magnitude, colour maths in `playground.css` so it follows the
theme tokens.

**Flagged sentences are derived, not guessed.** `SentenceScan` gives a
`flagged` count but not the threshold behind it. `render.js` takes the top
`flagged` sentences by score, which is the same set by definition, so no
threshold is hardcoded anywhere.

**Models never load on page view.** They only download on an explicit click.
Most visitors are here to read.

**Input is capped at 1000 characters.** Bounds LIME cost, and matches the cap
the extension applies to a post.

**Async/await, unlike the rest of the site.** `backend/main.js` is ES5-flavoured.
The playground has sequential awaits with progress callbacks, and promise
chains would have obscured the flow. Still no build step — this is plain
browser JavaScript.

**Staleness is the controller's job, not the engine's.** Reasoning can take
30 seconds, so results routinely arrive after the thing they described is
gone. Two counters in `controller.js`:

- `generation` — bumped by each new classification; kills reasoning that
  belongs to the previous text.
- `reasonToken[type]` — per detector, so re-running one detector's reasoning
  does not invalidate the other's.

A single shared counter looked fine but had a real bug: clicking
"Why AI Text?" then "Why Scam?" left the first panel spinning forever.
Nothing is actually cancelled; finished work is just discarded, which needs
no cooperation from the bundle.

### Changes to existing files

- **`public/main.css`** — gained `.flag` and `.avatar`, moved up from
  `how-it-works.css` now that two pages render them. Also gained `.sr-only`
  and a `nav a.brand` rule, since the playground's nav brand is a link home
  rather than plain text.
- **`public/how-it-works.css`** — lost `.flag` and `.avatar` to main.css.
  `.pulse-demo`, `.post-row` and `.post-meta` stayed; still index-only.
- **`backend/main.js`** — its private `escapeHtml` became
  `IGShared.escapeHtml`, declared at the top of the IIFE. On index.html
  escaping is a formality; on the playground it is load-bearing, because the
  text really is user input.
- **`index.html`** — nav link to the playground, and `backend/shared.js`
  loads before `main.js`.

### Verified

Ran the data → engine → markup path in Node against all three samples:

- `confidence` in [0.5, 1], `strength` in [0, 1], and
  `strength === (confidence - 0.5) * 2` for every result.
- Both metrics render without `undefined` or `NaN`.
- Sentence scan: `sentences.length === total`.
- LIME: no attribution index past the end of the text.
- Clean-sample path produces the no-detection view.
- `<img src=x onerror=...>` pasted as input does not survive into markup.

`controller.js` is not covered — it needs a DOM. Its logic was reviewed by
hand; the staleness bug above was found that way.

### Open questions

1. ~~**Word indices.**~~ Closed by the next entry — scam reasoning became a
   ranked list, so nothing depends on what `index` indexes.
2. ~~**Download size.**~~ Closed by the next entry — ~210 MB, now stated on
   the load panel.
3. **Cross-origin isolation.** GitHub Pages cannot set COOP/COEP, so ONNX
   Runtime is limited to single-threaded WASM. Moving the site to Cloudflare
   Pages or Netlify and adding a `_headers` file would unlock multithreading.
   Nothing in the code assumes either way.

---

## 2026-09-04 — Gator icon redraw

`GATOR_ICON` in `backend/main.js` redrawn as a single connected silhouette
with a brow ridge, tapering snout, and three teeth. The old one was two
disconnected slabs that read as a shoe at 20px. Reasoning is documented in
the comment above the icon, including the two things that were tried and
dropped (a nostril, and a second row of teeth) so they do not get
re-attempted.

## 2026-09-04 — Tech stack badges

The Tech Stack list moved from plain chips to shields.io-style brand badges.
Colours and logos live in `views/tech-stack.js`; layout in `public/tech.css`;
rendering in `initTechStack()` in `backend/main.js`. Logos are Simple Icons
paths (CC0), inlined rather than fetched from img.shields.io so the page
makes no third-party requests. Items without an official logo share a muted
green and a generic module glyph. Plain chips remain in the HTML as the
no-JS fallback.
