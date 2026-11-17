/**
 * The COAST DRAWING (PLAN 14.6, option F of the guide rethink, Joseph 2026-11-17): a cross-section of this coast from
 * the beach out to deep water. Tapping a part of it shows what lives there: it sets the guide's habitat filter to
 * that part's habitats, so the shelves, the list, the groups and Flip all follow. Pure markup and counts.
 */
import { t, type Key } from '../i18n';
import { ART, type ArtKey } from './art';
import { inView, matches, type GdFilter } from './filter';
import type { GdMode } from './route';
import type { Entry, Group, Habitat } from './types';

export const ZONES = ['beach', 'mangrove', 'seagrass', 'reef', 'open', 'deep'] as const;
export type Zone = (typeof ZONES)[number];

/** The habitats each part of the drawing stands for (every habitat in the research is in one part). */
export const ZONE_HABITATS: Record<Zone, readonly Habitat[]> = {
  beach: ['beach'],
  mangrove: ['mangrove', 'estuary'],
  seagrass: ['seagrass', 'sand', 'rubble'],
  reef: ['reef', 'rock'],
  open: ['open-water', 'drift'],
  deep: ['offshore', 'deep'],
};

/** The part of the drawing a habitat filter is, if it is exactly one part. */
export function zoneOf(habitats: readonly Habitat[]): Zone | null {
  return ZONES.find((z) => ZONE_HABITATS[z].length === habitats.length && ZONE_HABITATS[z].every((h) => habitats.includes(h))) ?? null;
}

/** How many species each part holds under the current list, group and other filters. */
export function zoneCounts(list: readonly Entry[], f: GdFilter, mode: GdMode, group: Group | null, hays?: Map<string, string>): Record<Zone, number> {
  const out = Object.fromEntries(ZONES.map((z) => [z, 0])) as Record<Zone, number>;
  for (const z of ZONES) {
    const fz = { ...f, habitats: [...ZONE_HABITATS[z]] };
    for (const e of list) if (inView(e, mode, group) && matches(e, fz, hays?.get(e.id))) out[z]++;
  }
  return out;
}

/** Where each part sits in the 400 by 200 drawing: its tap area, label and the drawing that marks it. */
const PARTS: Record<Zone, { area: string; lx: number; ly: number; art: ArtKey; at: [number, number, number]; end?: boolean }> = {
  beach: { area: 'M0 0 H92 V118 H0 Z', lx: 40, ly: 98, art: 'palm', at: [8, 6, 0.62] },
  mangrove: { area: 'M92 0 H142 V128 H92 Z', lx: 117, ly: 22, art: 'mangrove', at: [88, 30, 0.58] },
  seagrass: { area: 'M142 88 H214 V140 H142 Z', lx: 178, ly: 154, art: 'grass', at: [158, 96, 0.4] },
  reef: { area: 'M214 88 H298 V150 H214 Z', lx: 256, ly: 164, art: 'coral', at: [228, 92, 0.5] },
  open: { area: 'M142 52 H400 V88 H142 Z M298 88 H400 V112 H298 Z', lx: 214, ly: 46, art: 'fish', at: [300, 62, 0.42] },
  deep: { area: 'M298 112 H400 V200 H298 Z', lx: 396, ly: 174, end: true, art: 'squid', at: [324, 122, 0.42] },
};

/** The coast's own lines: land, the sea surface (in the SurCast run colours) and the seabed from shore to deep. */
const LAND = 'M0 54 C30 50 64 50 92 56 C110 60 124 66 142 74';
const BED = 'M142 74 C150 82 152 92 160 104 C176 112 196 114 214 114 C220 104 228 100 236 108 C244 96 256 96 262 108 C270 100 282 102 290 112 C296 140 300 170 312 188 L400 192';
const SURFACE = (i: number) => `M142 ${54 + i * 2.6} q 10 -${(3.2 - i * 0.5).toFixed(1)} 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 18 0`;

export function coastHtml(on: Zone | null, counts: Record<Zone, number>): string {
  const zone = (z: Zone) => {
    const p = PARTS[z];
    const label = t(`gd.coast.${z}` as Key);
    return `<g class="gd-cz z-${z}${z === on ? ' on' : ''}" data-zone="${z}" role="button" tabindex="0" aria-pressed="${z === on}" aria-label="${label}: ${counts[z]}">
      <path class="gd-cz-a" d="${p.area}"/>
      <path class="gd-cz-art" d="${ART[p.art]}" transform="translate(${p.at[0]} ${p.at[1]}) scale(${p.at[2]})"/>
      <text class="gd-cz-l" x="${p.lx}" y="${p.ly}" text-anchor="${p.end ? 'end' : 'middle'}">${label}<tspan class="gd-cz-n" dx="5">${counts[z]}</tspan></text>
    </g>`;
  };
  return `<svg class="gd-coast-svg" viewBox="0 0 400 204" role="group" aria-label="${t('gd.coast.title')}">
    <path class="gd-coast-land" d="${LAND}"/>
    ${[0, 1, 2, 3].map((i) => `<path class="gd-coast-sea r${i}" d="${SURFACE(i)}"/>`).join('')}
    <path class="gd-coast-bed" d="${BED}"/>
    ${ZONES.map(zone).join('')}
  </svg>`;
}
