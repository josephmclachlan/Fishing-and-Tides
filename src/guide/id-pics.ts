/**
 * Picture answers for IDENTIFY (PLAN 14.3, Joseph 2026-11-17): every shape, marking and place is a small line drawing
 * as well as its words, so a reader picks what they saw instead of reading a list. Plain lines in the current colour,
 * the same stroke language as the guide's own drawings (art.ts), which the body shapes reuse where one fits.
 */
import { ART, type ArtKey } from './art';
import type { Pattern, Position, Shape } from './types';

/** Body shapes the guide has no drawing for: a fish built for speed, and a tall flat-sided one. 96 by 64, facing left. */
const OWN: Partial<Record<Shape, string>> = {
  torpedo: 'M8 32 C22 20 52 18 70 28 L86 16 L81 32 L86 48 L70 36 C52 46 22 44 8 32 Z M44 21 L52 12 L58 24 M46 43 L52 50 L56 41 M18 30 l0 0.1',
  'deep-bodied':
    'M12 32 C13 13 38 4 58 13 C66 18 70 25 71 32 C70 39 66 46 58 51 C38 60 13 51 12 32 Z M71 32 L86 21 L83 32 L86 43 Z M34 8 L44 2 L54 12 M34 56 L46 62 L54 52 M22 28 l0 0.1',
};
const FROM_ART: Partial<Record<Shape, ArtKey>> = {
  elongate: 'longfish', flat: 'flatfish', round: 'puffer', 'crab-like': 'crab', 'lobster-like': 'lobster', 'shrimp-like': 'shrimp', star: 'star',
  'urchin-ball': 'urchin', cylinder: 'cucumber', 'coiled-shell': 'snail', 'two-shell': 'bivalve', bell: 'jelly', 'soft-blob': 'slug', branching: 'coral',
  mound: 'brain', plate: 'plate', fan: 'fan', 'tube-vase': 'sponge', blade: 'seaweed', feathery: 'plume', bird: 'bird', reptile: 'turtle', mammal: 'dolphin',
  'tree-palm': 'palm',
};

/** A body shape as a drawing, or '' for "other". */
export function shapePic(s: Shape): string {
  const d = OWN[s] ?? (FROM_ART[s] ? ART[FROM_ART[s]!] : '');
  return d ? `<svg class="gd-pic" viewBox="0 0 96 64" aria-hidden="true"><path d="${d}"/></svg>` : '';
}

/** A fish outline the markings are drawn inside (48 by 32). */
const BODY = 'M3 16 C9 6 27 5 35 12 L45 6 L42 16 L45 26 L35 20 C27 27 9 26 3 16 Z';
const dots = (pts: [number, number][], r: number) => pts.map(([x, y]) => `M${x + r} ${y} A${r} ${r} 0 1 1 ${x + r} ${y - 0.01}`).join(' ');
const PAT: Record<Pattern, string> = {
  plain: '',
  stripes: 'M4 12 H36 M3 16 H36 M4 20 H36',
  bars: 'M12 6 V26 M19 5 V27 M26 6 V26 M33 9 V23',
  spots: dots([[11, 12], [18, 9], [25, 12], [14, 19], [21, 17], [28, 19], [32, 14]], 1.4),
  eyespot: `${dots([[29, 15]], 3.6)} ${dots([[29, 15]], 1.2)}`,
  mottled: 'M8 13 q3 -4 6 0 t5 2 M20 9 q4 -2 6 2 M10 20 q4 3 8 0 M22 17 q3 4 7 1 M28 11 q3 -1 4 3',
  'two-tone': 'M3 16 H36 M6 11 L10 16 M11 9 L16 16 M17 8 L23 16 M23 8 L29 16 M29 10 L34 15',
  'lines-face': 'M6 11 L13 15 M5 16 L13 19 M7 21 L13 22',
  rings: `${dots([[14, 15]], 3)} ${dots([[25, 15]], 3)} M30 8 a3 3 0 0 1 3 6`,
  net: 'M8 8 L28 26 M15 6 L35 24 M22 6 L35 18 M5 20 L15 10 M10 24 L26 8 M18 26 L34 10 M26 26 L36 16',
};
/** A marking, drawn inside a fish outline. */
export function patternPic(p: Pattern): string {
  return `<svg class="gd-pic gd-pic-s" viewBox="0 0 48 32" aria-hidden="true"><path d="${BODY}"/>${PAT[p] ? `<path class="gd-pic-m" d="${PAT[p]}"/>` : ''}</svg>`;
}

/** Where it was: a slice of sea (surface, seabed, a reef), with a lit dot where the animal or plant sat. */
const SEA = 'M2 7 q5 -3 10 0 t10 0 t10 0 t10 0 t4 0 M2 28 H46';
const WHERE: Record<Position, { scene: string; at: [number, number] }> = {
  surface: { scene: '', at: [20, 7] },
  midwater: { scene: '', at: [24, 17] },
  bottom: { scene: '', at: [20, 25.5] },
  reef: { scene: 'M26 28 C27 21 31 18 34 20 C36 15 42 16 43 22 C45 23 46 26 46 28', at: [35, 17] },
  hidden: { scene: 'M22 28 C22 17 30 13 38 15 C44 16 46 22 46 28 M30 25 C30 21 36 21 36 25', at: [33, 23.6] },
  attached: { scene: 'M24 28 V20 M24 22 L20 17 M24 21 L28 16', at: [24, 15] },
  shore: { scene: 'M2 14 L22 14 C30 16 36 22 46 26', at: [10, 11.5] },
};
export function wherePic(p: Position): string {
  const w = WHERE[p];
  const sea = p === 'shore' ? 'M24 17 q5 -2 10 0 t12 0 M2 28 H46' : SEA;
  return `<svg class="gd-pic gd-pic-s" viewBox="0 0 48 32" aria-hidden="true"><path class="gd-pic-sea" d="${sea}"/>${w.scene ? `<path d="${w.scene}"/>` : ''}<path class="gd-pic-dot" d="${dots([w.at], 2.4)}"/></svg>`;
}
