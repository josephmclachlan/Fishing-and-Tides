/**
 * Layer legends (PLAN 7.12). For every catalog layer: a one-line "what am I looking at" and the
 * colours, shapes and marks it draws, each with a swatch drawn in the HUD colours. Pure data; the
 * LAYERS drawer shows it under the layer's ? button (layers-panel.ts). Text lives in i18n as
 * `legend.<layer>.what` and `legend.<layer>.<n>` (n from 1). Keep it in step with the layer's own
 * drawing code: a legend that disagrees with the map is worse than none.
 */
import type { LayerId } from './registry';
import { sprigSvg } from './sargassum-glyph';
import type { GlyphId } from '../icons/glyphs';
import { glyphSvg, squareSvg } from '../icons/glyphs';

/** `weed` is the drawn sargassum sprig itself (sargassum-glyph.ts); `glyph` is a symbol from src/icons, so the key shows the mark the map draws. */
export type Swatch = 'fill' | 'hatch' | 'dot' | 'ring' | 'line' | 'dash' | 'zone' | 'weed' | 'glyph' | 'none';
/** HUD roles, plus the Kinetic Plus crest blue, three steps of its rain ramp (PLAN 7.86) and the weed's own colour. */
export type SwatchTone = 'amber' | 'green' | 'red' | 'dim' | 'surf' | 'rain0' | 'rain2' | 'rain4' | 'sarg';
/** Symbol tones (src/icons/map-glyphs.ts): ink for neutral things, caution and danger for hazards. */
export type GlyphTone = 'ink' | 'caution' | 'danger';
/** A 'glyph' swatch draws the map's own symbol `g` in tone `gt` (and `dim` when the map draws it faded). */
export interface LegendItem { sw: Swatch; tone: SwatchTone; g?: GlyphId; gt?: GlyphTone; dim?: boolean; /** On a rating square of this level (rated places). */ lv?: RatingLevel }
/** Rating levels, lv0 very poor to lv4 great, n none (src/kmap/tokens.css). */
export type RatingLevel = '0' | '1' | '2' | '3' | '4' | 'n';
const LV_FALLBACK: Record<RatingLevel, [string, string]> = { 0: ['#F2634A', '#1B0905'], 1: ['#F59A3D', '#1F0E02'], 2: ['#F4C542', '#1D1604'], 3: ['#A5DBC2', '#07241A'], 4: ['#0C6B66', '#F2FAF7'], n: ['#C9D3DE', '#0A1626'] };

/** The CSS paint of a symbol tone, for keys drawn in the page (the map rasterises the same tokens). */
export const GLYPH_PAINT: Record<GlyphTone, { fill: string; key?: string; halo?: string }> = {
  ink: { fill: 'var(--ink)', halo: 'var(--m-halo)' },
  caution: { fill: 'var(--sev-caution)', key: 'var(--g-key)' },
  danger: { fill: 'var(--sev-danger)', key: 'var(--g-key)' },
};
/** A key swatch that is the map's own symbol, `px` wide. */
export const glyphSwatch = (it: LegendItem, px = 16) =>
  it.lv
    ? squareSvg(it.g!, `var(--lv${it.lv}, ${LV_FALLBACK[it.lv][0]})`, `var(--on${it.lv}, ${LV_FALLBACK[it.lv][1]})`, 'var(--g-key, #0A1626)', px)
    : glyphSvg(it.g!, GLYPH_PAINT[it.gt ?? 'ink'], px);

/** Items per layer, in the order of their text keys `legend.<layer>.1`, `.2` ... */
export const LEGEND: Readonly<Record<LayerId, readonly LegendItem[]>> = {
  waves: [{ sw: 'line', tone: 'surf' }, { sw: 'line', tone: 'red' }],
  currents: [{ sw: 'line', tone: 'green' }, { sw: 'line', tone: 'red' }],
  wind: [{ sw: 'line', tone: 'amber' }, { sw: 'line', tone: 'red' }],
  sst: [{ sw: 'fill', tone: 'green' }, { sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'red' }, { sw: 'line', tone: 'amber' }, { sw: 'none', tone: 'amber' }],
  chl: [{ sw: 'fill', tone: 'green' }, { sw: 'fill', tone: 'dim' }, { sw: 'none', tone: 'amber' }],
  fronts: [{ sw: 'dot', tone: 'amber' }, { sw: 'dot', tone: 'green' }, { sw: 'none', tone: 'amber' }],
  clarity: [{ sw: 'fill', tone: 'green' }, { sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'red' }],
  sargassum: [{ sw: 'fill', tone: 'amber' }, { sw: 'hatch', tone: 'dim' }, { sw: 'weed', tone: 'sarg' }, { sw: 'ring', tone: 'amber' }],
  weather: [{ sw: 'glyph', tone: 'red', g: 'storm', gt: 'danger' }, { sw: 'fill', tone: 'rain0' }, { sw: 'fill', tone: 'rain2' }, { sw: 'fill', tone: 'rain4' }, { sw: 'glyph', tone: 'amber', g: 'drop', gt: 'ink' }],
  lightning: [{ sw: 'glyph', tone: 'red', g: 'bolt', gt: 'danger' }, { sw: 'glyph', tone: 'amber', g: 'bolt', gt: 'caution' }, { sw: 'dash', tone: 'red' }],
  obs: [{ sw: 'dot', tone: 'green' }, { sw: 'dot', tone: 'amber' }, { sw: 'dot', tone: 'red' }],
  rip: [{ sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'red' }, { sw: 'glyph', tone: 'amber', g: 'rip', gt: 'caution' }, { sw: 'none', tone: 'dim' }],
  surf: [{ sw: 'glyph', tone: 'green', g: 'curl', lv: '3' }, { sw: 'glyph', tone: 'amber', g: 'curl', lv: '2' }, { sw: 'glyph', tone: 'red', g: 'curl', lv: '1' }, { sw: 'glyph', tone: 'dim', g: 'curl', lv: 'n' }],
  depth: [{ sw: 'line', tone: 'amber' }],
  reefs: [{ sw: 'none', tone: 'amber' }, { sw: 'none', tone: 'amber' }],
  seamarks: [{ sw: 'glyph', tone: 'amber', g: 'light' }, { sw: 'glyph', tone: 'amber', g: 'buoy' }, { sw: 'glyph', tone: 'amber', g: 'wreck' }, { sw: 'glyph', tone: 'amber', g: 'rock' }, { sw: 'glyph', tone: 'amber', g: 'warn', gt: 'caution' }],
  fishing: [{ sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'green' }, { sw: 'none', tone: 'amber' }, { sw: 'zone', tone: 'green' }, { sw: 'none', tone: 'amber' }],
  spear: [{ sw: 'fill', tone: 'green' }, { sw: 'fill', tone: 'red' }, { sw: 'line', tone: 'amber' }, { sw: 'zone', tone: 'green' }],
  zones: [{ sw: 'line', tone: 'red' }, { sw: 'line', tone: 'amber' }],
  anchorages: [{ sw: 'glyph', tone: 'green', g: 'anchor' }, { sw: 'glyph', tone: 'dim', g: 'anchor', dim: true }],
  ais: [{ sw: 'glyph', tone: 'green', g: 'ship' }, { sw: 'glyph', tone: 'amber', g: 'ship', dim: true }],
};

export const legendWhatKey = (id: LayerId) => `legend.${id}.what`;
export const legendItemKey = (id: LayerId, n: number) => `legend.${id}.${n}`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The legend as HTML. `text` looks up an i18n key; swatches are CSS classes (see `.sw` in style.css). */
export function legendHtml(id: LayerId, text: (key: string) => string): string {
  const rows = LEGEND[id].map((it, i) => `<li>${it.sw === 'none' ? '<i class="sw sw-none"></i>' : it.sw === 'glyph' ? `<i class="sw sw-glyph${it.dim ? ' sw-dimg' : ''}">${glyphSwatch(it, 14)}</i>` : `<i class="sw sw-${it.sw} sw-${it.tone}">${it.sw === 'weed' ? sprigSvg(22) : ''}</i>`}<span>${esc(text(legendItemKey(id, i + 1)))}</span></li>`).join('');
  return `<p class="lg-what">${esc(text(legendWhatKey(id)))}</p>${rows ? `<ul class="lg-list">${rows}</ul>` : ''}`;
}
