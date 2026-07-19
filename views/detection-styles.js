/* ==========================================================================
   Investi-gator — detection badge styles

   Badge labels, colors, and SVG icons for each detection type (same set the
   extension popup uses). Plain browser JavaScript: loaded with a classic
   <script> tag and read off the global by main.js, so it works over both
   file:// and GitHub Pages without a module/bundler step.

   @typedef {"image" | "text" | "bot" | "scam"} DetectionType
   @typedef {{ label: string, bg: string, fg: string, icon: string }} BadgeStyle
   @type {Record<DetectionType, BadgeStyle>}
   ========================================================================== */
var BADGE_STYLES = {
  image: {
    label: 'AI Image',
    bg: '#fef3c7',
    fg: '#92400e',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
           </svg>`,
  },
  text: {
    label: 'AI Text',
    bg: '#dbeafe',
    fg: '#1e40af',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
             <line x1="5" y1="7"  x2="19" y2="7"/>
             <line x1="5" y1="12" x2="19" y2="12"/>
             <line x1="5" y1="17" x2="13" y2="17"/>
           </svg>`,
  },
  bot: {
    label: 'Likely Bot',
    bg: '#ede9fe',
    fg: '#5b21b6',
    // Full-body bot
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
             <line x1="12" y1="2" x2="12" y2="4"/>
             <circle cx="12" cy="2" r="0.8" fill="currentColor" stroke="none"/>
             <rect x="6" y="4" width="12" height="8" rx="1.5"/>
             <circle cx="9.5"  cy="8" r="1" fill="currentColor" stroke="none"/>
             <circle cx="14.5" cy="8" r="1" fill="currentColor" stroke="none"/>
             <rect x="8" y="13" width="8" height="6" rx="1"/>
             <line x1="8"  y1="14" x2="4"  y2="16"/>
             <line x1="16" y1="14" x2="20" y2="16"/>
             <line x1="10" y1="19" x2="10" y2="22"/>
             <line x1="14" y1="19" x2="14" y2="22"/>
           </svg>`,
  },
  scam: {
    label: 'Scam',
    bg: '#fee2e2',
    fg: '#991b1b',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
             <path d="M12 3 L22 20 L2 20 Z"/>
             <line x1="12" y1="10" x2="12" y2="14"/>
             <circle cx="12" cy="17" r="0.6" fill="currentColor"/>
           </svg>`,
  },
};

// Expose explicitly so the dependency is obvious to anyone reading main.js.
window.BADGE_STYLES = BADGE_STYLES;
