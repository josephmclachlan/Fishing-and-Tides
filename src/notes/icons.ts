/**
 * FIELD NOTES pictograms: line glyphs on a 24 px grid, drawn in the page's ink (`currentColor`), 2 px strokes, round
 * ends. `x` adds the diagonal "do not" bar in the danger colour. Pure strings; styles in notes.css (`.nt-i`).
 * Kept apart from the map's symbol set (src/icons/glyphs.ts), which is filled shapes sized for the map.
 * Tabs add their own pictograms in picts/<group>.ts; they are merged into PICTS here.
 */
import { SURF_PICTS } from './picts/surf';
import { AID_PICTS } from './picts/aid';
import { RIGS_PICTS } from './picts/rigs';
import { MISC_PICTS } from './picts/misc';

export interface Pict {
  /** Stroked path data. */
  d: string;
  /** Filled dots [cx, cy, r]. */
  dots?: readonly (readonly [number, number, number])[];
  /** Cross it out: "do not". */
  x?: boolean;
}

const SWIMMER = 'M3 14l5-3 4 3 4-2M2 19c2-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0 3.5 1.5 5 0';
const CORAL = 'M12 21v-8M12 13L8 9M8 9V5M8 9L5 7.5M12 13l4-3.5M16 9.5V6M16 9.5l3-1M12 17l-3-1.5M5 21h14';
const HAND = 'M8 13V6a1.4 1.4 0 0 1 2.8 0v5M10.8 10.5V4.6a1.4 1.4 0 0 1 2.8 0v5.9M13.6 10.5V5.6a1.4 1.4 0 0 1 2.8 0v7.4c0 4.5-2.6 7.5-5.8 7.5-2.5 0-4-1.4-5.6-4.2L3.8 13.6a1.4 1.4 0 0 1 2.4-1.4L8 14';

const BASE = {
  phone: { d: 'M6.5 3h3.2l1.6 4.6-2.2 1.5a11 11 0 0 0 5.8 5.8l1.5-2.2 4.6 1.6v3.2a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z' },
  shout: { d: 'M3 10v4h3l7 4.5v-13L6 10zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.6 7.6 0 0 1 0 11' },
  ring: { d: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 4v4.5M12 15.5V20M4 12h4.5M15.5 12H20' },
  eye: { d: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  noswim: { d: SWIMMER, dots: [[16.5, 7.5, 2]], x: true },
  swim: { d: SWIMMER, dots: [[16.5, 7.5, 2]] },
  lifeguard: { d: 'M12 21V9M12 9l-6 3M12 9l6 3M6 21l2-6h8l2 6M9 4h6v3H9z' },
  flag: { d: 'M5 21V3M5 4h12l-3 4 3 4H5' },
  alone: { d: 'M9 21v-7M15 21v-7M8 10h8M12 3v3M12 6a2 2 0 1 1 0 .01M3 3l18 18' },
  gap: { d: 'M2 9c1.5-1.5 3-1.5 4.5 0S8 10.5 9 9M15 9c1-1.5 2.5-1.5 3.5 0s3 1.5 3.5 0M2 14c1.5-1.5 3-1.5 4.5 0S8 15.5 9 14M15 14c1-1.5 2.5-1.5 3.5 0s3 1.5 3.5 0M12 21V5M9 8l3-3 3 3' },
  foam: { d: 'M12 21V8M9 11l3-3 3 3', dots: [[7, 6, 1.6], [16.5, 4.5, 1.4], [6, 13, 1.2], [18, 12, 1.6], [9, 3.5, 1.1]] },
  channel: { d: 'M8 21V3M16 21V3M10.5 18l1.5-2 1.5 2M10.5 11l1.5-2 1.5 2M10.5 5l1.5-2 1.5 2' },
  river: { d: 'M4 21c3-3 2-6 5-8.5S13 7 12 3M10 21c3-3 2.5-5.5 5.5-7.5S20 8 19 3' },
  rain: { d: 'M7 14a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6 1A3.5 3.5 0 0 1 17 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3' },
  warn: { d: 'M12 3l10 18H2zM12 10v5', dots: [[12, 18, 1.2]] },
  gauge: { d: 'M3.5 17a8.5 8.5 0 1 1 17 0M12 17l4-6M6 17h1M17 17h1' },
  float: { d: 'M7 12.5h11l3 1.5M10 12.5l-2.5-3M15 12.5l2-3M2 18c2-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0 3.5 1.5 5 0', dots: [[4.5, 11.5, 2]] },
  wave: { d: 'M12 9v7M12 16l-3 5M12 16l3 5M12 11L7 5M12 11l5-6M5 4l-1-1.5M19 4l1-1.5', dots: [[12, 6.2, 2]] },
  side: { d: 'M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4' },
  clock: { d: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3.2 2' },
  gate: { d: 'M4 21V7h16v14M4 11h16M8 11v10M12 11v10M16 11v10M2 21h20' },
  card: { d: 'M3 6h18v12H3zM3 10h18M6 15h4' },
  free: { d: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM9 12.5l2 2 4-4.5' },
  hook: { d: 'M14 6v8.5a4.5 4.5 0 0 1-9 0V12l2.5 2M14 6a1.6 1.6 0 1 1 0-.01M14 2.5v1.8' },
  spear: { d: 'M4 20L19 5M19 5l-5.5 1M19 5l-1 5.5M4 20l-1.5-.5M4 20l.5 1.5' },
  jetski: { d: 'M3 15h13l4-4h-5l-2-3H9l-1 3H4zM2 19c2-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0 3.5 1.5 5 0', x: true },
  guide: { d: 'M9 9v6l-2 6M9 15l2 6M9 11l-3 3M9 11l4-2M13 9V3l5 2-5 2', dots: [[9, 6, 2]] },
  mask: { d: 'M3 8h14v6h-4l-2-2-2 2H3zM20 3v10a4 4 0 0 1-4 4h-3' },
  tank: { d: 'M9 7h6v14H9zM10.5 7V4h3v3M12 4V2M9 11h6' },
  cert: { d: 'M4 4h16v12H4zM8 8h8M8 11h5M15 16l-1 5 2.5-1.5L19 21l-1-5' },
  plane: { d: 'M21 3L3 10.5l6.5 3 3 6.5zM9.5 13.5L21 3' },
  hospital: { d: 'M4 21V5h16v16M10 10h4M12 8v4M9 21v-5h6v5' },
  nochamber: { d: 'M3 12a5 5 0 0 1 5-5h8a5 5 0 0 1 0 10H8a5 5 0 0 1-5-5zM8 12h.01M12 12h.01', x: true },
  ask: { d: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9.4 9.4a2.7 2.7 0 1 1 3.7 2.5c-.7.3-1.1.9-1.1 1.6v.5', dots: [[12, 17, 1.2]] },
  jelly: { d: 'M5 12a7 7 0 0 1 14 0zM8 12c0 3-1 5 0 8M12 12v9M16 12c0 3 1 5 0 8' },
  signal: { d: 'M4 20v-2M9 20v-5M14 20v-8M19 20V7' },
  coral: { d: CORAL },
  nostand: { d: CORAL, x: true },
  notouch: { d: HAND, x: true },
  rock: { d: 'M3 19l4-7 4 2 4-6 6 11zM12 6V2M10 4l2-2 2 2', x: true },
  current: { d: 'M3 8c3-2 6 2 9 0s6-2 9 0M3 13c3-2 6 2 9 0s6-2 9 0M14 18h7M18 15l3 3-3 3' },
  depth: { d: 'M12 3v18M8 6h4M8 10h4M8 14h4M8 18h4M15 15l3 3 3-3M18 9v9' },
} as const satisfies Record<string, Pict>;

export const PICTS = { ...BASE, ...SURF_PICTS, ...AID_PICTS, ...RIGS_PICTS, ...MISC_PICTS };
export type PictId = keyof typeof PICTS;

/** One pictogram, inline, sized by CSS. Decorative: the words next to it carry the meaning. */
export function pict(id: PictId, cls = 'nt-i'): string {
  const p: Pict = PICTS[id];
  const dots = (p.dots ?? []).map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('');
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${p.d}"/>${dots}${p.x ? '<path class="nt-x" d="M3.5 3.5l17 17"/>' : ''}</svg>`;
}
