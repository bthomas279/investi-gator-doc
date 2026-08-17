/* ==========================================================================
   Investi-gator — update log / patch notes

   The single source of truth for the "Updates & Patch Notes" feed (#updates)
   and for the "What's New" summary in the demo section. main.js reads this
   global and renders both, so adding an update means editing this file only.

   Same plain-script pattern as detection-styles.js: no bundler, works over
   file:// and GitHub Pages alike.

   ---------------------------------------------------------------------------
   ADDING AN UPDATE
   Put the newest entry at the top of the array — order here is the order on
   the page. Every field except `title`, `date`, and `type` is optional.

     type      "major" — big card with a thumbnail (see `thumb`)
               "minor" — compact one-line row with a gator head icon
     kicker    Small label above the title ("Major Update", "Patch Notes"…)
     title     Headline, shown on the card and at the top of the popup
     date      "YYYY-MM-DD". Drives the date grouping and the "Posted" line.
     thumb     { src, alt } — major cards only; ignored on minor ones
     excerpt   The lead-in, written once and used twice: it previews the
               update on a major card and opens the popup as its first
               paragraph. Worth writing for minor updates too — their card is
               too compact to show it, but the popup still leads with it.
     sections  The notes themselves, in the order they should appear
     media     Shorthand for a single image / video at the very bottom
     whatsNext What you're working on now. Rendered last, below the media, in
               its own highlighted panel. Write it as a plain string (one
               paragraph), an array of strings (bullets), or the full block
               form { heading, text, items } when the default "What's Next?"
               heading needs changing. Leave it out and no panel appears.

   SECTIONS
   `sections` is an ordered list of blocks. A block is either a run of notes
   or a piece of media, so writing can continue below an image or video:

     sections: [
       { heading: 'Balance', items: ['...', '...'] },
       { media: { kind: 'image', src: '...', caption: '...' } },
       { heading: 'Known issues', text: 'Still shaking these out.' },
     ]

   In a notes block, `heading`, `text` (one string or an array of them, for
   prose paragraphs), and `items` (bullets) are all optional — use whichever
   the update calls for.

   MEDIA
   A media block, and the top-level `media` shorthand, take one of:

     { kind: "image", src: "...", alt: "...", caption: "..." }
     { kind: "video", src: "...", poster: "...", caption: "..." }
     { kind: "embed", src: "https://www.youtube.com/embed/ID",
       title: "...", caption: "..." }

   Leave media out entirely for a text-only popup. Use the top-level `media`
   field when it belongs at the end, and a media block inside `sections` when
   something needs to follow it.

   SIZING MEDIA
   By default a slot is a 16:9 frame with the image cropped to fill it. Three
   optional fields retune a single slot without touching any other image:

     ratio     Frame shape, as a CSS aspect-ratio: '16 / 9', '4 / 3', or the
               image's own pixel dimensions ('1331 / 208') to show all of it
               with nothing left over
     fit       'cover' (default, crops to fill) or 'contain' (zooms out until
               the whole image is visible, letterboxing the leftover space).
               Ignored on embeds.
     maxWidth  Caps how wide the frame gets — '440px', '60%'. Useful for a
               small screenshot that looks stretched at full width.

   The wide metrics strip in the first entry below shows the pair in use.

   Inside `excerpt`, `text`, `items`, `whatsNext`, and captions, wrap text in **double
   asterisks** to bold it. Everything else is escaped, so angle brackets and
   ampersands are safe to type literally.
   ---------------------------------------------------------------------------

   @typedef {{ kind: "image" | "video" | "embed", src: string, alt?: string,
               poster?: string, title?: string, caption?: string,
               ratio?: string, fit?: "cover" | "contain",
               maxWidth?: string }} UpdateMedia
   @typedef {{ heading?: string, text?: string | string[], items?: string[],
               media?: UpdateMedia }} PatchBlock
   @typedef {{ type: "major" | "minor", kicker?: string, title: string,
               date: string, thumb?: { src: string, alt?: string },
               excerpt?: string, sections?: PatchBlock[],
               media?: UpdateMedia,
               whatsNext?: string | string[] | PatchBlock }} Update
   @type {Update[]}
   ========================================================================== */
var UPDATES = [
  /* EXAMPLE — shows what a small update looks like in the feed, and how a
     block can keep the notes going below an image. Delete this entry once
     there is a real one to take its place. */
  {
    type: "minor",
    kicker: "Small Update / Patch Notes",
    title: "Patch 1.2.a: AI-Text V1 Evaluation & Threshold Adjustments",
    date: "2026-08-14",
    excerpt:
      "I did some analysis on V1 of the AI text detector. Prior to implementing the text detector, I ran 6 tests on data it didn't see during training. " +
      "This makes it really helpful for me to determine how the model performs with data it hasn't seen before.",
    sections: [
      {
        heading: "Datasets:",
        items: [
          "in-distribution testing (in_dist_test)",
          "OOD datasets from some authors of the training data (ood_mage_gpt, ood_mage_gpt_para)",
          "data from more recent models (ood_gsingh)",
          "cut-out domains/models not included in training (ood_raid_llama, ood_raid_reviews)",
        ],
      },
      {
        text: "The results of these tests can be seen below.",
      },
      {
        media: {
          kind: "image",
          src: "public/images/ai-text-v1-0.5.png",
          alt: "Investi-gator's AI-Text Detector OOD Eval in 0.5 threshold",
          caption: "OOD metrics with a threshold of 0.5.",
          // The image is a wide 1331x208 strip, so it gets its own frame
          // shape instead of being cropped into the default 16:9 one.
          ratio: "1331 / 208",
          fit: "contain",
        },
      },
      {
        text:
          "As you can maybe tell, it didn't perform too well. Turns out the LLM is extremely overconfident. To make a long story short, it naturally has a much higher confidence threshold so the line between an AI and human detection " +
          "isvery thin and high (ex: 0.998...). That basically caused a lot of human posts to be labeled5 as AI since the threshold line was much lower (0.5).",
      },
      {
        text:
          "While I can't figure out exactly why the model is so overconfident, it's likely due to the " +
          "lack of diversity in its training data. Since it was trained mainly on MAGE and a bit of RAID, it probably got too familiar with that data structure.",
      },
      {
        text:
          "Reducing the false positive rate is the most imporant thing at the moment, so " +
          "after performing some more analysis I found an optimal margin to use to lower fpr. That value is 6.36. Below is the same 6 tests run with that margin.",
      },
      {
        media: {
          kind: "image",
          src: "public/images/ai-text-v1-6.36.png",
          alt: "Investi-gator's AI-Text Detector OOD Eval in 6.36 margin",
          caption:
            "New OOD metrics with a margin threshold of 6.36. While the false negative ratio increased, I believe the new fpr is more than worth it.",
          // The image is a wide 1331x208 strip, so it gets its own frame
          // shape instead of being cropped into the default 16:9 one.
          ratio: "1331 / 208",
          fit: "contain",
        },
      },
      {
        heading: "Costs:",
        text: "I implemented margin into the extension for AI text specifically. It stopped a lot of the false flags for posts but it came at a cost:",
        items: [
          "The threshold is linked to the confidence; so classifications with a high threshold natually have a high confidence. This makes the minimum confidence requirements for AI text detections pointless. While this doesn't completely mess up the system, it does bring the use of confidence into " +
            "question. I'm hoping that since V2 will be trained on more diverse data, it will be a bit less confident.",
          "I had planned on having larger models be called if confidence is too low. If V2 still looks to be overconfident, that methodology will have to change.",
        ],
      },
    ],
  },

  {
    type: "major",
    kicker: "Major Update",
    title: "Scam Detector 1.5 & AI Text Reasoning",
    date: "2026-08-07",
    thumb: {
      src: "public/images/current_scam_look.png",
      alt: "A post badged by the updated scam detector",
    },
    excerpt:
      "Hi everyone. I've been doing some model and system improvements. The scam detector now understands social media post structure well enough to tell scams apart from most ads and headlines AI text detections finally come with reasoning. " +
      "",
    sections: [
      {
        heading: "Detectors",
        items: [
          "The scam detector is now on version 1.5 with an improved understanding of social media post structure and the differences between scams and advertisements/news headlines. I grabbed about 200 posts that were false positives while running the detector and used that along with " +
            "the previous training data I used for version 1.0. It's performing much better with avoid false positives now but it isn't perfect.",
          "AI text detection is still on version 1.0. However, it currently has a bit higher accuracy on longer posts than shorter ones. I'm currently gathering data to improve it.",
          "AI text reasoning has been implemented with the sliding window algorithm for analysis. Posts must have minimum length of 3 'sentences' for it to run.",
        ],
      },
      {
        heading: "Settings",
        items: [
          "Users can choose which detection types to turn on and off whenever.",
          "Users can choose whether to see the confidence or the strength of a detection.",
        ],
      },
      {
        heading: "Bug Fixes & Polish",
        items: [
          "Twitter badge UI is now in a good enough state to share. In my last update I didn't share it in the demo because of it's intrusive structure.",
          "Post classification/reasoning caching now saves long-term instead of in the service worker's memory. The outcomes of classifiers are saved to caches to avoid using them again for the same post. This works cross-platform. ",
          "Improved the dataflow and architecture for badges and their popups. Each platform has their own dedicated styling.",
        ],
      },
    ],
    media: {
      kind: "image",
      src: "public/images/current_scam_look.png",
      alt: "Investi-gator's updated scam detector badging a post",
      caption:
        "Scam detector version 1.5 in action. Now mostly stays quiet unless a post really does look like a scam.",
    },
    /* Currently working on */
    whatsNext: [
      "Develop and optimize V2 of the AI text detector. Fine-tuning a LLM for AI text classifaction is much more complex than scam detection. I've been very careful about the data I use for it. So far, " +
        "V2's training data will cover newer models, posts prior to 2020, very diverse domains, sythetic AI generated short/long posts, human -> AI & AI -> human paraphrasing, and potentially more.",
      "Get Investi-gator working on Facebook. Facebook's DOM is inconsistent and lacks post IDs so implementing that will take time.",
      "Run analysis on both the current scam and AI detector so I know what to improve when developing their V2s.",
    ],
  },

  {
    type: "major",
    kicker: "First Investi-gator Update",
    title: "Investi-gator's webpage is live!",
    date: "2026-07-21",
    thumb: {
      src: "public/images/placeholder_badges.png",
      alt: "All four detection badge types on a feed",
    },
    excerpt:
      "Investi-gator's webpage is live, along with its overview and the first demo on Reddit. ",

    sections: [
      {
        heading: "W",
        items: [
          "A demo video walking through passive detection on a live feed.",
          "Screenshots of the badges, the badge popup, and the extension popup.",
          "A written breakdown of the six-step detection pipeline, from observing the feed to per-detection reasoning.",
        ],
      },
    ],
    media: {
      kind: "embed",
      src: "https://www.youtube.com/embed/CDJjE1CFp04",
      title: "Investi-gator demo video",
      caption: "The full walkthrough, also embedded in the demo section above.",
    },
  },
];

// Expose explicitly so the dependency is obvious to anyone reading main.js.
window.UPDATES = UPDATES;
