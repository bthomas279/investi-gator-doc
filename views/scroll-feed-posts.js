/* ==========================================================================
   Investi-gator — scroll feed posts

   The made-up posts that loop through the mock feed in the "Detection that
   happens as you scroll" section (index.html #passive). backend/scroll-feed.js
   reads this list off the global and does the drawing and animating; this file
   is only the content. The caption under the feed lives in index.html.

   Same loading contract as detection-styles.js: a plain <script> that hangs
   the data off the global. No bundler, works over file:// and GitHub Pages.

   Each entry is { name, handle, text, image?, detections }:
     name       — display name at the top of the post
     handle     — shown as @handle under the name (no "@" needed here)
     text       — the post body. Keep it at 80+ characters: the extension
                  skips anything shorter (MIN_CHARACTER_LENGTH in the
                  extension's background/classify-checks.ts), so a shorter
                  post would never really get a badge.
     image      — optional. "ai" draws an over-saturated sunset, "real" a
                  soft watercolor wash. Leave it off for text-only posts.
     detections — what the badge shows, strongest first, exactly like the
                  extension: [type, percent]. Type is one of image / text /
                  bot / scam (see views/detection-styles.js). The badge shows
                  the first one plus "+N" for the rest. Use [] for a clean
                  post, which gets no badge.

   Posts that scroll off the top go back to the bottom, so the order here is
   the order they loop in. Aim for roughly half clean posts so the feed looks
   like a real one rather than a wall of badges.
   @type {{ name: string, handle: string, text: string, image?: "ai" | "real", detections: [string, number][] }[]}
   ========================================================================== */
var SCROLL_FEED_POSTS = [
  {
    name: "Deals 4 U",
    handle: "deals_4u_today",
    text: "🎁 CONGRATULATIONS! You've been selected as one of our 50 lucky winners of a $500 gift card. Spots are limited and this offer expires at midnight. DM me your email and shipping address to claim yours now!",
    detections: [["scam", 94]],
  },
  {
    name: "Maya Kim",
    handle: "maya.kim",
    text: "Finally finished the bookshelf build. It took three weekends, one bent nail, and a very patient trip back to the hardware store, but it's level and it holds every book I own. Next up: actually organizing them.",
    detections: [],
  },
  {
    name: "user84120375",
    handle: "user84120375",
    text: "Great point!! Totally agree with this 100%. So many people need to hear this right now. Follow me for more daily insights and motivation, link in bio for my free guide 🔥🔥🔥",
    detections: [["bot", 81], ["scam", 64]],
  },
  {
    name: "Priya S.",
    handle: "priya.runs",
    text: "Ran my first 10K this morning! Didn't hit my goal time, but I didn't stop to walk once, which felt impossible three months ago. Huge thanks to everyone in the Saturday run club for dragging me out of bed.",
    detections: [],
  },
  {
    name: "Sunset Captures",
    handle: "sunset.captures",
    text: "Golden hour over the lake last night. No filters, no edits, just sat on the dock and waited for the light to hit the water. Some evenings make the whole week worth it 🌅",
    image: "ai",
    detections: [["image", 88]],
  },
  {
    name: "Jordan R.",
    handle: "jordan_r",
    text: "Anyone know a good ramen place downtown that stays open past ten? The spot on 5th closed for renovations and I've been craving a proper bowl of tonkotsu all week. Bonus points for a vegetarian broth.",
    detections: [],
  },
  {
    name: "Thought Leader",
    handle: "thoughtleader.io",
    text: "In today's fast-paced world, it's important to remember that growth is a journey, not a destination. By embracing challenges, fostering meaningful connections, and staying true to your values, you can unlock your full potential and thrive.",
    detections: [["text", 76]],
  },
  {
    name: "Alex",
    handle: "alex.paints",
    text: "New watercolor, still drying on the desk. I tried wet-on-wet for the sky this time and let the colors bleed more than usual. Not perfect, but I like how the greens turned out.",
    image: "real",
    detections: [],
  },
  {
    name: "Sam Okafor",
    handle: "samokafor",
    text: "Hot take: the best part of any road trip is the gas station snacks. I will not be taking questions. Currently ranking every brand of beef jerky we've tried between here and the coast, full list coming soon.",
    detections: [],
  },
  {
    name: "Crypto Mentor",
    handle: "crypto.mentor.88",
    text: "I turned $200 into $14,000 in one week using a simple strategy the banks don't want you to know about. I'm only helping 10 more people this month. Reply \"INFO\" and I'll send you the details 📈💰",
    detections: [["scam", 91], ["bot", 72]],
  },
];

window.SCROLL_FEED_POSTS = SCROLL_FEED_POSTS;
