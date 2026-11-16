/**
 * SurCast brand (Joseph 2026-11-16): the name is Caribe Sur + forecast + the fishing cast.
 *
 * The mark is "Ensemble" (concept A, chosen 2026-11-16): eight forecast runs leave one "now" point together,
 * spread apart as the forecast gets less sure, and curl over into a breaking wave. Each run is one activity's
 * colour. Drawn on a 64 x 64 grid. The small version (favicon, header) keeps three runs so it still reads at 16 px.
 *
 * Colours come from the Kinetic Plus activity tokens (`--t-*`, src/kmap/tokens.css), so the mark follows light and
 * dark. The PWA icons and favicon need fixed colours, so scripts/brand-icons.ts passes hex values instead.
 */

const f = (n: number) => +n.toFixed(2);
const rad = (d: number) => (d * Math.PI) / 180;

/** The eight runs, inside to outside, as a hue loop. */
export const RUN_TOKENS = ['snorkel', 'paddle', 'surf', 'dive', 'swim', 'fish', 'coral', 'sail'] as const;
export type RunToken = (typeof RUN_TOKENS)[number];

/** Hex values for places that cannot read CSS (icons, canvas). Same as tokens.css. */
export const RUN_HEX = {
  dark: { snorkel: '#2FD6C2', paddle: '#4FC3F7', surf: '#4D9DFF', dive: '#9A93FF', swim: '#FF5FA2', fish: '#FF7A52', coral: '#F0A040', sail: '#74D65E' },
  light: { snorkel: '#00877A', paddle: '#0A8FB8', surf: '#0A66E0', dive: '#4338D6', swim: '#D4176B', fish: '#E4441C', coral: '#B4670E', sail: '#2A8A1E' },
} as const;
export const BRAND_NAVY = '#0A1626';

const NOW: [number, number] = [9, 53];
const CX = 37;
const CY = 31;

/** Path data for run i (0 = innermost). */
export function runPath(i: number): string {
  const t = i / 7;
  const r = 5.2 + 2.25 * i;
  const L = [CX - r, CY];
  const th = rad(8 + 50 * t);
  const len = 9 + 6 * t;
  const c1 = [NOW[0] + Math.cos(th) * len, NOW[1] - Math.sin(th) * len];
  const c2 = [L[0], CY + 9 + 5 * t];
  const phi = 205 + 55 * t; // how far round the curl goes
  const a = rad(180 + phi);
  const E = [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  return `M${NOW.join(',')} C${c1.map(f).join(',')} ${c2.map(f).join(',')} ${L.map(f).join(',')} A${f(r)} ${f(r)} 0 1 1 ${E.map(f).join(',')}`;
}

export interface MarkOpts {
  /** Three thick runs for 48 px and below. */
  small?: boolean;
  /** Colour per run; default the CSS activity tokens. */
  colour?: (run: RunToken) => string;
  /** The "now" dot; default the page ink. */
  ink?: string;
  /** Extra attributes on each run path (the loader animates them). */
  runAttrs?: string;
}

/** The mark's inner SVG (no <svg> wrapper), 64 x 64 grid. */
export function markInner(o: MarkOpts = {}): string {
  const colour = o.colour ?? ((run: RunToken) => `var(--t-${run})`);
  const idx = o.small ? [1, 4, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
  const sw = o.small ? 4.2 : 1.45;
  const runs = idx
    .map((i) => `<path ${o.runAttrs ?? ''} d="${runPath(i)}" fill="none" stroke="${colour(RUN_TOKENS[i])}" stroke-width="${sw}" stroke-linecap="round"/>`)
    .join('');
  return `${runs}<circle cx="${NOW[0]}" cy="${NOW[1]}" r="${o.small ? 4.6 : 3}" fill="${o.ink ?? 'var(--ink)'}"/>`;
}

/** The mark as an inline SVG, cropped close for use beside text. Decorative: the name always sits beside it. */
export function markSvg(size: number, o: MarkOpts = {}, cls = 'sc-mark'): string {
  return `<svg class="${cls}" viewBox="2 2 60 60" width="${size}" height="${size}" aria-hidden="true" focusable="false">${markInner(o)}</svg>`;
}

/** The word mark: "Sur" in ink, "Cast" in the activity colours. Styled by .sc-wm (src/brand.css). */
export const WORDMARK = '<span class="sc-wm">Sur<i>Cast</i></span>';

/** The small brand line used at the top of every page: mark, name, and region. */
export function brandLine(region: string, hideRegionCls: string): string {
  return `<span class="sc-brand">${markSvg(16, { small: true })}${WORDMARK}</span><span class="${hideRegionCls}"> · ${region}</span>`;
}
