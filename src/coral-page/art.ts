/**
 * The CORAL page's hero picture (PLAN 7.65): a reef drawn from the reading. Heat pales the coral towards white
 * (bleachShare: DHW 1 → 12), murky water (MUD WEEKS) clouds the water and dims the light rays. Kept simple:
 * the full art redo comes later (Joseph, 2026-11-10). Pure: returns an SVG string; colours are the page tokens.
 */
const r2 = (x: number) => Math.round(x * 100) / 100;

export function reefArt(o: { bleach: number; murk: number }): string {
  const b = Math.min(1, Math.max(0, o.bleach));
  const m = Math.min(1, Math.max(0, o.murk));
  // CSS mixes each coral's colour with white by --b; fish thin out as the water clouds.
  const fish = m < 0.75
    ? `<g class="fc-fish"><path class="cp-a-fish" d="M248 92c8-7 20-8 28-1l7-5v13l-7-5c-8 7-20 6-28-2z"/></g>
       <g class="fc-fish fc-swim-1"><path class="cp-a-fish cp-a-fish2" d="M96 70c6-5 15-6 21-1l5-4v10l-5-4c-6 5-15 4-21-1z"/></g>`
    : '';
  return `<svg class="cp-art" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" style="--b:${r2(b * 100)}%;--m:${r2(m)}">
    <defs>
      <linearGradient id="cp-a-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cp-a-sea-top"/><stop offset="1" class="cp-a-sea-deep"/></linearGradient>
      <linearGradient id="cp-a-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cp-a-ray-top"/><stop offset="1" class="cp-a-ray-end"/></linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#cp-a-sea)"/>
    <g class="cp-a-rays"><path d="M60 0h34L60 240H20z"/><path d="M170 0h26l-6 240h-44z"/><path d="M290 0h30l40 240h-40z"/></g>
    <path class="cp-a-surface" d="M0 10c25 0 25 6 50 6s25-6 50-6 25 6 50 6 25-6 50-6 25 6 50 6 25-6 50-6 25 6 50 6 25-6 50-6"/>
    ${fish}
    <path class="cp-a-sand" d="M0 200c60-14 120-16 200-8s140 6 200-6v54H0z"/>
    <g class="cp-a-coral cp-a-c1"><path d="M70 204c-4-30 2-52 12-70 4 18 2 30-2 42 10-16 22-26 34-30-8 16-18 28-26 40 12-6 24-6 34-2-14 6-28 12-38 22z"/></g>
    <g class="cp-a-coral cp-a-c2"><ellipse cx="200" cy="196" rx="48" ry="30"/><path class="cp-a-groove" d="M164 192c10-8 18 6 28-2s18 6 28-2 16 4 22 0M170 204c10-6 18 4 28-2s18 4 28-2"/></g>
    <g class="cp-a-coral cp-a-c3 fc-fan" style="--amp:2.5deg"><path d="M310 206c-2-20-12-44-30-58 22 2 38 16 44 34 2-24 14-42 34-50-6 22-12 40-26 56 10-4 20-2 26 2-16 4-30 10-40 18z"/></g>
    <g class="cp-a-coral cp-a-c4"><path d="M120 208c0-14 6-22 14-22s14 8 14 22zM140 208c0-10 4-16 10-16s10 6 10 16z"/></g>
    <rect class="cp-a-murk" width="400" height="240"/>
  </svg>`;
}
