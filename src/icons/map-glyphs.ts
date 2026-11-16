/**
 * The symbol set on the map: each glyph rasterised once per tone into a MapLibre image `g-<glyph>-<tone>`, in the
 * scheme's colours (a scheme change reloads the map, so reading the tokens once is enough). Images are drawn at
 * 24 CSS px for the 24 grid at pixel ratio 2; layers scale them with `icon-size`.
 */
import type { Map } from 'maplibre-gl';
import { onSchemeChange } from '../layers/paint';
import { GLYPH_IDS, glyphLayers, padOf, type GlyphId, type GlyphPaint, type GlyphShape } from './glyphs';

/** Neutral things in ink with the map's label halo; hazards in the severity colours with a dark keyline. */
export type Tone = 'ink' | 'caution' | 'danger';
export const TONES: readonly Tone[] = ['ink', 'caution', 'danger'];

const tok = (name: string, fallback: string) => {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch {
    return fallback;
  }
};

/** The paint for a tone in the current scheme. */
export function tonePaint(t: Tone): GlyphPaint {
  if (t === 'ink') return { fill: tok('--ink', '#0A1626'), halo: tok('--m-halo', '#ECEADF') };
  return { fill: t === 'danger' ? tok('--sev-danger', '#DF4430') : tok('--sev-caution', '#E8A200'), key: tok('--g-key', '#0A1626') };
}

export const imageId = (g: GlyphId, t: Tone) => `g-${g}-${t}`;

const PR = 2;

function draw(ctx: CanvasRenderingContext2D, s: GlyphShape, paint: string, grow: number) {
  const sw = (s.w ?? 2.4) + grow;
  ctx.fillStyle = paint;
  ctx.strokeStyle = paint;
  if (s.f) {
    const p = new Path2D(s.f);
    ctx.fill(p, 'evenodd');
    if (grow) {
      ctx.lineWidth = grow;
      ctx.lineJoin = 'round';
      ctx.stroke(p);
    }
  }
  if (s.s) {
    ctx.lineWidth = sw;
    ctx.lineCap = grow ? 'round' : 'square';
    ctx.lineJoin = grow ? 'round' : 'miter';
    ctx.stroke(new Path2D(s.s));
  }
  for (const [x, y, r] of s.c ?? []) {
    ctx.lineWidth = sw;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const [x, y, r] of s.d ?? []) {
    ctx.beginPath();
    ctx.arc(x, y, r + grow / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** One glyph as image data (24 CSS px for the grid, at pixel ratio 2). */
export function glyphImage(g: GlyphId, paint: GlyphPaint): ImageData {
  const pad = padOf(paint);
  const n = Math.ceil((24 + pad * 2) * PR);
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d')!;
  ctx.scale(PR, PR);
  ctx.translate(pad, pad);
  for (const l of glyphLayers(g, paint)) draw(ctx, l.shape, l.paint, l.grow);
  return ctx.getImageData(0, 0, n, n);
}

const repaint = new WeakSet<Map>();
/** Add every glyph in every tone to the map (once per style); a light/dark switch redraws them in the new colours. */
export function addGlyphImages(map: Map) {
  for (const t of TONES) {
    const paint = tonePaint(t);
    for (const g of GLYPH_IDS) {
      const id = imageId(g, t);
      if (!map.hasImage(id)) map.addImage(id, glyphImage(g, paint), { pixelRatio: PR });
    }
  }
  if (repaint.has(map)) return;
  repaint.add(map);
  onSchemeChange(() => {
    for (const t of TONES) {
      const paint = tonePaint(t);
      for (const g of GLYPH_IDS) if (map.hasImage(imageId(g, t))) map.updateImage(imageId(g, t), glyphImage(g, paint));
    }
  });
}
