/**
 * Layer legends (PLAN 7.12). For every catalog layer: a one-line "what am I looking at" and the
 * colours, shapes and marks it draws, each with a swatch drawn in the HUD colours. Pure data; the
 * LAYERS drawer shows it under the layer's ? button (layers-panel.ts). Text lives in i18n as
 * `legend.<layer>.what` and `legend.<layer>.<n>` (n from 1). Keep it in step with the layer's own
 * drawing code: a legend that disagrees with the map is worse than none.
 */
import type { LayerId } from './registry';

export type Swatch = 'fill' | 'hatch' | 'dot' | 'ring' | 'line' | 'none';
export type SwatchTone = 'amber' | 'green' | 'red' | 'dim';
export interface LegendItem { sw: Swatch; tone: SwatchTone }

/** Items per layer, in the order of their text keys `legend.<layer>.1`, `.2` ... */
export const LEGEND: Readonly<Record<LayerId, readonly LegendItem[]>> = {
  waves: [{ sw: 'line', tone: 'amber' }, { sw: 'line', tone: 'red' }],
  currents: [{ sw: 'line', tone: 'green' }, { sw: 'line', tone: 'red' }],
  wind: [{ sw: 'line', tone: 'amber' }, { sw: 'line', tone: 'red' }],
  sst: [{ sw: 'fill', tone: 'green' }, { sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'red' }, { sw: 'line', tone: 'amber' }, { sw: 'none', tone: 'amber' }],
  fronts: [{ sw: 'dot', tone: 'amber' }, { sw: 'dot', tone: 'green' }, { sw: 'none', tone: 'amber' }],
  clarity: [{ sw: 'fill', tone: 'green' }, { sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'red' }],
  sargassum: [{ sw: 'fill', tone: 'amber' }, { sw: 'hatch', tone: 'dim' }, { sw: 'dot', tone: 'amber' }, { sw: 'ring', tone: 'amber' }],
  weather: [{ sw: 'ring', tone: 'red' }, { sw: 'fill', tone: 'green' }, { sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'red' }, { sw: 'line', tone: 'amber' }],
  lightning: [{ sw: 'dot', tone: 'red' }, { sw: 'dot', tone: 'amber' }],
  obs: [{ sw: 'dot', tone: 'green' }, { sw: 'dot', tone: 'amber' }, { sw: 'dot', tone: 'red' }],
  rip: [{ sw: 'fill', tone: 'amber' }, { sw: 'fill', tone: 'red' }, { sw: 'ring', tone: 'amber' }, { sw: 'none', tone: 'dim' }],
  surf: [{ sw: 'ring', tone: 'green' }, { sw: 'ring', tone: 'amber' }, { sw: 'ring', tone: 'red' }, { sw: 'ring', tone: 'dim' }],
  depth: [{ sw: 'line', tone: 'amber' }],
  reefs: [{ sw: 'none', tone: 'amber' }, { sw: 'none', tone: 'amber' }],
  seamarks: [],
  fishing: [{ sw: 'fill', tone: 'dim' }, { sw: 'fill', tone: 'amber' }, { sw: 'none', tone: 'amber' }],
  effort: [{ sw: 'fill', tone: 'dim' }, { sw: 'fill', tone: 'amber' }, { sw: 'none', tone: 'amber' }],
  zones: [{ sw: 'line', tone: 'red' }, { sw: 'line', tone: 'amber' }],
  anchorages: [{ sw: 'ring', tone: 'green' }, { sw: 'ring', tone: 'dim' }],
};

export const legendWhatKey = (id: LayerId) => `legend.${id}.what`;
export const legendItemKey = (id: LayerId, n: number) => `legend.${id}.${n}`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The legend as HTML. `text` looks up an i18n key; swatches are CSS classes (see `.sw` in style.css). */
export function legendHtml(id: LayerId, text: (key: string) => string): string {
  const rows = LEGEND[id].map((it, i) => `<li>${it.sw === 'none' ? '<i class="sw sw-none"></i>' : `<i class="sw sw-${it.sw} sw-${it.tone}"></i>`}<span>${esc(text(legendItemKey(id, i + 1)))}</span></li>`).join('');
  return `<p class="lg-what">${esc(text(legendWhatKey(id)))}</p>${rows ? `<ul class="lg-list">${rows}</ul>` : ''}`;
}
