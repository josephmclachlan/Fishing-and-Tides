/**
 * The app's symbol set (iconography overhaul, 2026-11-16). One glyph per kind of thing, drawn once on a 24 px grid
 * and used everywhere: on the map (rasterised by map-glyphs.ts), in the map key, the layer list and the HUD.
 *
 * The grammar, so a glyph can be read without the key:
 * - SHAPE says what it is. Every point on the map that is not a rated place gets its own silhouette. Rated places
 *   keep the square pin; a diamond means an official warning to act on.
 * - COLOUR says how good or how bad, nothing else: the rating scale on places, the severity scale (ink, caution,
 *   danger) on hazards. Neutral things (anchors, wrecks, lights, ships) are ink.
 * - LINE says how sure: solid observed or forecast, dashed modelled or low confidence, dotted outlook.
 * - ARROWS point the way things go (wind, current, rip, rain cells, ships); words keep the sailor's "from".
 *
 * Geometry: `f` filled paths (even-odd), `s` stroked paths with stroke width `w` (square caps, mitre joins),
 * `c` stroked circles [cx, cy, r], `d` filled dots [cx, cy, r]. `ink` holds marks drawn inside a filled frame
 * (the "!" of a warning) in the keyline colour.
 */
export interface GlyphShape {
  f?: string;
  s?: string;
  w?: number;
  c?: readonly (readonly [number, number, number])[];
  d?: readonly (readonly [number, number, number])[];
}
export interface Glyph extends GlyphShape {
  ink?: GlyphShape;
}

export const GLYPHS = {
  /** Lightning flash. */
  bolt: { f: 'M13.6 1.5h5.6l-3.9 7.7h5.4L8.2 23l2.9-10H5.4z' },
  /** Rain cell. */
  drop: { f: 'M12 2.2c3.9 5.1 7 8.7 7 12.6a7 7 0 0 1-14 0c0-3.9 3.1-7.5 7-12.6z' },
  /** Tropical storm or hurricane: the WMO sign, an eye with two opposed arms. */
  storm: { f: 'M12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10zm0 2.8a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 0 0 0-4.4zM17 12C17 6.4 13.6 2.6 7.6 1.5c3.6 2.2 5.3 4.4 5.6 6zM7 12c0 5.6 3.4 9.4 9.4 10.5c-3.6-2.2-5.3-4.4-5.6-6z' },
  /** Harbour, pier or anchorage. */
  anchor: { s: 'M12 7.5V21M7.5 10.5h9M4 14.5c0 3.8 3.6 6.5 8 6.5s8-2.7 8-6.5', c: [[12, 4.6, 2.3]], w: 2.6 },
  /** Wreck: a hull settled on its side with its mast. */
  wreck: { f: 'M2 11.2l20 4.6-2.6 4.9L5.2 18.3z', s: 'M10.4 12.6l2.4-9.4', w: 2.4 },
  /** Rock or other hazard to navigation. */
  rock: { f: 'M1.8 20L7.4 10.6l3.1 3.6L14.6 5.5 22.2 20z' },
  /** Navigation light: the chart flare. */
  light: { f: 'M4 20L13.1 7.4A4.9 4.9 0 1 1 16.6 10.9z' },
  /** Buoy. */
  buoy: { f: 'M8.3 10h7.4l1.4 8H6.9zM12 3.2a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 0 1 0-5.2zM3 20h18v2H3z' },
  /** Coral reef. */
  coral: { s: 'M12 22V12M12 12L7 7M7 7V3M7 7L3 5M12 12l5-4M17 8V4M17 8l4-1M12 16l-4-2', w: 2.6 },
  /** Ship (AIS), pointing along its course. */
  ship: { f: 'M12 1.8l5.2 7.4V22H6.8V9.2z' },
  /** Official warning to act on (navigational warning, closure). */
  warn: { f: 'M12 1.5L22.5 12L12 22.5L1.5 12z', ink: { s: 'M12 7.6v5', w: 2.6, d: [[12, 16.2, 1.5]] } },
  /** Surf break. */
  curl: { s: 'M2 17c4 0 5-10 12-10 3.5 0 6 2.3 6 5-2.2-1.6-6-.6-6 2.6 0 1.4 1 2.4 2.4 2.4', w: 2.6 },
  /** Private, shown only on this device. */
  lock: { f: 'M5 10.5h14V21H5z', s: 'M8.2 10.5V7.4a3.8 3.8 0 0 1 7.6 0v3.1', w: 2.4 },
  /** Rip current, pointing out to sea. */
  rip: { s: 'M12 22V4M6.5 9.5L12 4l5.5 5.5', w: 2.8 },
  /** Arrowhead for a moving thing's track (rain cells), pointing the way it goes. */
  head: { s: 'M4.5 15.5L12 8l7.5 7.5', w: 3 },
  /** Danger to people (venomous, can kill). */
  danger: { f: 'M12 2.5L22.5 21h-21z', ink: { s: 'M12 9.6v4.6', w: 2.4, d: [[12, 17.6, 1.4]] } },
  /** Protected by law. */
  shield: { s: 'M12 2.8l7.5 2.7v6c0 4.8-3.2 8.3-7.5 9.9-4.3-1.6-7.5-5.1-7.5-9.9v-6z', w: 2.2 },
  /** Eating. */
  eat: { s: 'M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 8h3.5', w: 2.2 },
  /** Not checked locally yet (CHECK). */
  check: { s: 'M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6', w: 2.4, d: [[12, 17.4, 1.4]] },
} as const satisfies Record<string, Glyph>;

export type GlyphId = keyof typeof GLYPHS;
export const GLYPH_IDS = Object.keys(GLYPHS) as GlyphId[];

/** Paint for one glyph: `fill` its body, `key` a thin keyline (severity glyphs), `halo` a wide one (neutral glyphs). */
export interface GlyphPaint {
  fill: string;
  key?: string | null;
  halo?: string | null;
  /** Inner marks (the "!" of a warning); defaults to the keyline, else the halo. */
  ink?: string | null;
}

/** Widths on the 24 grid: the halo around ink glyphs, the keyline around coloured ones. */
export const HALO_W = 3;
export const KEY_W = 1.4;
/** Grid units of padding the halo or keyline needs around the 24 box. */
export const padOf = (p: Pick<GlyphPaint, 'key' | 'halo'>) => (p.halo ? 4 : p.key ? 2 : 0);

const shapeSvg = (g: GlyphShape, paint: string, grow: number) => {
  const sw = (g.w ?? 2.4) + grow;
  let o = '';
  // Paints go in style attributes so a CSS variable (var(--sev-danger)) works as well as a hex.
  if (g.f) o += `<path d="${g.f}" style="fill:${paint};fill-rule:evenodd${grow ? `;stroke:${paint};stroke-width:${grow};stroke-linejoin:round` : ''}"/>`;
  if (g.s) o += `<path d="${g.s}" style="fill:none;stroke:${paint};stroke-width:${sw};stroke-linecap:${grow ? 'round' : 'square'};stroke-linejoin:${grow ? 'round' : 'miter'}"/>`;
  for (const [x, y, r] of g.c ?? []) o += `<circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:${paint};stroke-width:${sw}"/>`;
  for (const [x, y, r] of g.d ?? []) o += `<circle cx="${x}" cy="${y}" r="${r + grow / 2}" style="fill:${paint}"/>`;
  return o;
};

/** The glyph's layers, back to front: halo, keyline, body, inner marks. Pure. */
export function glyphLayers(id: GlyphId, p: GlyphPaint): { shape: GlyphShape; paint: string; grow: number }[] {
  const g: Glyph = GLYPHS[id];
  const out: { shape: GlyphShape; paint: string; grow: number }[] = [];
  if (p.halo) out.push({ shape: g, paint: p.halo, grow: HALO_W * 2 + (p.key ? KEY_W * 2 : 0) });
  if (p.key) out.push({ shape: g, paint: p.key, grow: KEY_W * 2 });
  out.push({ shape: g, paint: p.fill, grow: 0 });
  if (g.ink) out.push({ shape: g.ink, paint: p.ink ?? p.key ?? p.halo ?? p.fill, grow: 0 });
  return out;
}

/** The glyph as an SVG string, `size` CSS px for the 24 box (the halo pads outside it). Pure. */
export function glyphSvg(id: GlyphId, p: GlyphPaint, size = 24, cls = ''): string {
  const pad = padOf(p);
  const px = (size * (24 + pad * 2)) / 24;
  const body = glyphLayers(id, p).map((l) => shapeSvg(l.shape, l.paint, l.grow)).join('');
  return `<svg${cls ? ` class="${cls}"` : ''} width="${px}" height="${px}" viewBox="${-pad} ${-pad} ${24 + pad * 2} ${24 + pad * 2}" aria-hidden="true">${body}</svg>`;
}

/** The glyph in `currentColor` with no halo, for buttons, badges and type. Pure. */
export const glyphInline = (id: GlyphId, cls = '') => glyphSvg(id, { fill: 'currentColor', ink: 'var(--glyph-ink, #fff)' }, 24, cls).replace(/ width="[^"]+" height="[^"]+"/, '');
