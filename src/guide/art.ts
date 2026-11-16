/**
 * The SPECIES GUIDE's own drawings (PLAN 7.91): one line drawing per kind of animal or plant, drawn here, used as the
 * group icons and in place of a photo where no licensed one exists. Same stroke language as the page's tab icons:
 * plain lines in the current colour, no fill. A 96 by 64 box, the animal facing left.
 */
import type { Group } from './types';

const P = Math.PI;
const n1 = (v: number) => Math.round(v * 10) / 10;
const pt = (cx: number, cy: number, r: number, a: number) => `${n1(cx + r * Math.cos(a))} ${n1(cy + r * Math.sin(a))}`;

/** Lines out from a centre: an urchin's spines, a feather duster's crown. */
function rays(cx: number, cy: number, r0: number, r1: number, n: number, from = 0, to = 2 * P): string {
  const full = Math.abs(to - from - 2 * P) < 1e-6;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * (full ? i / n : i / (n - 1)));
    d += `M${pt(cx, cy, r0, a)} L${pt(cx, cy, r1, a)} `;
  }
  return d;
}
/** A five-armed star: tip to tip through curves pulled in near the centre. */
function star(cx: number, cy: number, R: number, r: number): string {
  let d = `M${pt(cx, cy, R, -P / 2)} `;
  for (let i = 0; i < 5; i++) {
    const a = -P / 2 + (i * 2 * P) / 5;
    d += `Q${pt(cx, cy, r, a + P / 5)} ${pt(cx, cy, R, a + (2 * P) / 5)} `;
  }
  return d + 'Z';
}
/** Thin wavy arms from a small disc. */
function brittle(cx: number, cy: number): string {
  let d = `M${cx + 6} ${cy} A6 6 0 1 1 ${cx + 6} ${cy - 0.01} `;
  for (let i = 0; i < 5; i++) {
    const a = -P / 2 + (i * 2 * P) / 5;
    d += `M${pt(cx, cy, 6, a)} Q${pt(cx, cy, 18, a + 0.35)} ${pt(cx, cy, 26, a - 0.1)} T${pt(cx, cy, 32, a + 0.25)} `;
  }
  return d;
}
/** Tentacles in a fan above a column: anemones, cup corals. */
function crown(cx: number, cy: number, w: number, h: number, n: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), x = cx - w / 2 + f * w, a = P + f * P;
    d += `M${n1(x)} ${cy} Q${n1(x + Math.cos(a) * 4)} ${n1(cy - h * 0.6)} ${pt(cx, cy, h, a)} `;
  }
  return d;
}
/** A segmented worm with tufts of bristles. */
function bristle(): string {
  let d = 'M8 34 C20 26 36 26 48 32 C60 38 76 38 88 30 ';
  for (let i = 1; i < 12; i++) {
    const x = 8 + i * 7, y = 34 - 6 * Math.sin((i / 12) * 2 * P) + (i > 6 ? 2 : 0);
    d += `M${x} ${n1(y - 2)} l-1 -5 M${x} ${n1(y + 2)} l-1 5 `;
  }
  return d;
}
/** Each drawing as SVG path data (and a few circles, written as tiny arcs so one `<path>` holds it all). */
const dot = (x: number, y: number, r: number) => `M${x + r} ${y} A${r} ${r} 0 1 1 ${x + r} ${y - 0.01} `;

export const ART = {
  fish:
    'M10 33 C18 19 38 13 56 17 C64 19 70 24 74 29 L88 19 L86 33 L88 47 L74 37 C70 42 64 46 56 48 C38 52 18 46 10 33 Z ' +
    'M34 15 L40 7 L58 11 L60 18 M30 22 C34 28 34 37 30 43 M38 47 L36 55 L46 49 ' + dot(21, 30, 2.4),
  longfish: 'M4 32 L18 29 C34 25 56 25 72 28 L86 22 L84 32 L86 42 L72 36 C56 39 34 39 18 35 Z M46 26 L50 19 L56 26 M56 37 L60 43 L64 37 ' + dot(16, 31, 1.6),
  puffer: 'M16 34 C16 20 30 14 46 14 C62 14 72 22 74 30 L86 24 L86 42 L74 36 C72 46 62 52 46 52 C30 52 16 46 16 34 Z M40 22 C44 30 44 38 40 44 ' + dot(28, 28, 2.6),
  eel: 'M3 32 C9 26 22 24 30 28 C40 34 48 40 60 38 C70 36 76 28 84 26 C88 25 91 27 92 30 C88 30 84 32 80 36 C72 44 62 48 52 46 C40 44 34 38 28 35 C22 32 12 36 3 32 Z M3 32 L11 33 M24 25 C34 28 44 35 58 34 C68 33 76 24 86 22 ' + dot(14, 30, 1.6),
  flatfish:
    'M10 32 C14 18 32 12 50 12 C64 12 72 20 76 28 L90 20 L90 44 L76 36 C72 44 64 52 50 52 C32 52 14 46 10 32 Z ' +
    'M20 21 C32 15 52 15 68 20 M20 43 C32 49 52 49 68 44 ' + dot(22, 27, 2) + dot(28, 22, 2),
  seahorse:
    'M52 10 C46 8 41 9 39 13 L28 14 L28 18 L39 19 C41 22 45 24 46 28 C44 34 42 40 45 46 C48 53 57 55 59 49 C61 44 57 40 53 42 C51 44 52 46 55 46 ' +
    'M52 10 C57 12 59 17 57 22 C61 28 61 37 58 44 M47 30 L41 32 ' + dot(46, 14, 1.4),
  shark:
    'M4 36 C14 30 30 26 48 26 L56 12 L62 26 C70 27 76 28 80 26 L90 14 L88 30 L92 46 L80 36 C72 38 64 40 56 40 L50 50 L46 41 C30 42 14 42 4 36 Z ' +
    'M24 32 L23 38 M27 31 L26 38 M30 31 L29 38 ' + dot(14, 33, 1.8),
  ray: 'M48 10 C54 16 70 26 88 30 C72 34 58 42 50 48 L48 62 L46 48 C38 42 24 34 8 30 C26 26 42 16 48 10 Z M48 53 L51 50 M48 56 L51 53 ' + dot(44, 22, 1.5) + dot(52, 22, 1.5) + dot(43.5, 26.5, 0.9) + dot(52.5, 26.5, 0.9),
  crab:
    'M28 30 C28 20 38 16 48 16 C58 16 68 20 68 30 C68 40 58 44 48 44 C38 44 28 40 28 30 Z ' +
    'M32 22 C26 16 20 14 16 10 M16 10 L12 15 M16 10 L21 8 M64 22 C70 16 76 14 80 10 M80 10 L84 15 M80 10 L75 8 ' +
    'M29 32 L20 34 L14 40 M30 36 L22 40 L18 48 M34 40 L28 46 L26 54 M67 32 L76 34 L82 40 M66 36 L74 40 L78 48 M62 40 L68 46 L70 54 ' +
    'M44 16 L43 11 M52 16 L53 11',
  lobster:
    'M30 26 C36 22 50 22 56 26 L56 38 C50 42 36 42 30 38 Z M56 26 L66 27 L66 37 L56 38 M66 27 L74 28 L74 36 L66 37 M74 28 L80 29 L80 35 L74 36 ' +
    'M80 29 L90 24 L92 32 L90 40 L80 35 M30 28 C20 20 12 14 4 10 M30 36 C20 44 12 50 4 54 ' +
    'M38 40 L36 50 M44 41 L44 52 M50 41 L52 50 M38 24 L36 14 M44 23 L44 12 M50 23 L52 14',
  shrimp:
    'M20 30 C22 22 34 18 46 18 C60 18 70 24 74 34 C76 40 74 46 70 50 L76 56 L66 56 L64 50 C68 44 66 36 58 32 C50 28 38 30 30 34 C26 36 22 34 20 30 Z ' +
    'M20 28 L10 24 M21 27 C14 20 8 16 2 16 M23 25 C19 14 14 8 8 4 M34 32 L32 40 M40 31 L39 40 M46 30 L46 39 M52 30 L53 38 ' + dot(25, 25, 1.6),
  barnacle: 'M24 54 L34 26 L62 26 L72 54 Z M38 54 L42 26 M58 54 L54 26 M40 26 L48 32 L56 26 M48 26 C44 18 46 12 50 8 M48 26 C52 18 56 14 60 12',
  octopus:
    'M36 26 C36 12 60 12 60 26 C60 32 56 36 54 38 L42 38 C40 36 36 32 36 26 Z ' +
    'M42 38 C36 46 28 48 22 44 M45 38 C42 50 36 56 30 58 M48 38 C48 50 50 56 56 58 M51 38 C56 48 64 50 70 46 M54 38 C62 42 70 40 74 34 M42 38 C34 40 26 38 22 32 ' +
    dot(44, 28, 1.6) + dot(52, 28, 1.6),
  squid:
    'M8 32 L18 22 L24 27 C38 25 54 27 64 30 L64 34 C54 37 38 39 24 37 L18 42 Z ' +
    'M64 30 C72 28 80 26 90 22 M64 32 L90 32 M64 34 C72 36 80 38 90 42 M65 31 C74 30 82 29 88 27 M65 33 C74 34 82 35 88 37 ' + dot(60, 31, 1.5),
  slug:
    'M10 44 C14 36 24 34 36 34 C50 34 62 32 72 34 C80 36 86 40 88 44 C70 46 30 46 10 44 Z ' +
    'M20 34 L15 24 M26 34 L26 23 M72 34 L70 25 M76 35 L76 25 M80 37 L83 28 M36 34 C40 30 44 30 48 34 M50 33 C54 29 58 29 62 33',
  snail:
    'M20 44 C16 30 26 16 42 14 C58 12 74 20 80 30 C84 38 78 46 68 48 L30 50 C26 50 22 48 20 44 Z ' +
    'M42 14 C48 20 50 28 46 34 C42 38 36 36 36 30 C36 26 40 24 42 26 M52 14 L54 8 M62 16 L66 11 M70 20 L75 16 M68 48 C74 52 80 54 88 52',
  bivalve:
    'M14 40 C14 22 30 12 48 12 C66 12 82 22 82 40 C82 46 78 50 72 50 L24 50 C18 50 14 46 14 40 Z ' +
    'M48 14 L48 50 M37 15 L33 50 M59 15 L63 50 M27 20 L20 47 M69 20 L76 47 M40 50 L56 50 L54 55 L42 55 Z',
  chiton: 'M18 32 C18 22 34 18 48 18 C62 18 78 22 78 32 C78 42 62 46 48 46 C34 46 18 42 18 32 Z M28 21 L28 43 M36 19 L36 45 M44 18 L44 46 M52 18 L52 46 M60 19 L60 45 M68 21 L68 43',
  tusk: 'M18 46 C38 32 60 22 86 16 L88 23 C64 28 42 38 22 52 Z M30 42 L33 46 M44 33 L47 38 M60 26 L62 31 M74 20 L76 26',
  urchin: dot(48, 34, 13) + rays(48, 34, 13, 29, 18),
  sanddollar: dot(48, 32, 24) + [0, 1, 2, 3, 4].map((i) => {
    const a = -P / 2 + (i * 2 * P) / 5;
    return `M${pt(48, 32, 3, a)} Q${pt(48, 32, 10, a - 0.4)} ${pt(48, 32, 16, a)} Q${pt(48, 32, 10, a + 0.4)} ${pt(48, 32, 3, a)} `;
  }).join(''),
  star: star(48, 34, 29, 3) + dot(48, 34, 2.5),
  brittle: brittle(48, 32),
  cucumber:
    'M12 38 C12 28 24 24 40 24 C56 24 74 24 82 30 C88 34 88 42 82 44 C72 48 56 46 40 46 C24 46 12 46 12 38 Z ' +
    'M12 36 L5 31 M12 38 L4 38 M12 40 L5 45 ' + dot(30, 29, 1.6) + dot(44, 28, 1.6) + dot(58, 29, 1.6) + dot(71, 31, 1.6) + dot(37, 38, 1.4) + dot(52, 39, 1.4) + dot(66, 38, 1.4),
  jelly:
    'M24 30 C24 14 72 14 72 30 C66 33 62 30 56 33 C52 30 44 30 40 33 C34 30 30 33 24 30 Z ' +
    'M30 32 C28 42 34 50 30 60 M40 33 C40 44 44 50 42 60 M56 33 C56 44 52 50 54 60 M66 32 C68 42 62 50 66 60 M46 32 C46 42 50 48 48 56 M50 32 C50 42 46 48 48 54',
  manowar:
    'M24 34 C22 22 40 14 56 16 C70 18 78 26 76 34 C68 36 34 36 24 34 Z M34 18 C40 12 52 10 60 14 ' +
    'M30 36 C30 46 26 54 28 62 M40 36 C42 46 38 54 40 62 M52 36 C52 46 56 54 54 62 M64 35 C66 44 62 52 64 60',
  anemone: 'M36 58 L37 42 C38 38 58 38 59 42 L60 58 M30 58 L66 58 ' + crown(48, 40, 24, 22, 9),
  coral:
    'M48 58 L48 40 M48 40 C40 34 36 26 34 14 M48 40 C56 34 60 28 64 16 M42 31 C34 28 28 24 24 16 M58 31 C66 30 72 26 76 18 ' +
    'M48 46 C40 44 32 41 22 36 M48 46 C56 44 66 41 74 36 M36 22 L30 18 M61 22 L66 17 M34 58 L62 58',
  brain:
    'M12 52 C12 30 30 16 48 16 C66 16 84 30 84 52 Z ' +
    'M20 46 C24 36 32 30 40 34 C46 38 50 30 56 28 C64 26 70 34 74 44 M28 50 C30 44 36 40 42 44 C48 48 54 40 62 42 C68 44 70 48 72 50 M30 28 C36 22 46 20 52 22 C58 24 62 22 66 24',
  plate: 'M46 58 L48 44 M14 40 C30 30 66 30 82 40 C66 44 30 44 14 40 Z M22 30 C36 22 60 22 74 30 C60 34 36 34 22 30 Z M30 50 C40 46 56 46 66 50 M36 58 L60 58',
  fan:
    'M48 60 L48 50 C30 48 16 36 18 22 C22 12 36 8 48 8 C60 8 74 12 78 22 C80 36 66 48 48 50 ' +
    'M48 50 L30 16 M48 50 L48 9 M48 50 L66 16 M48 50 L22 30 M48 50 L74 30 M24 26 C38 22 58 22 72 26 M28 38 C40 34 56 34 68 38',
  plume: 'M48 60 L48 6 ' + [10, 18, 26, 34, 42, 50].map((y, i) => `M48 ${y + 4} C${42 - i} ${y} ${36 - i} ${y - 2} ${32 - i} ${y + 2} M48 ${y + 4} C${54 + i} ${y} ${60 + i} ${y - 2} ${64 + i} ${y + 2} `).join(''),
  sponge:
    'M30 58 L30 26 C30 22 40 22 40 26 L40 58 M44 58 L44 14 C44 10 56 10 56 14 L56 58 M60 58 L60 32 C60 28 68 28 68 32 L68 58 M24 58 L74 58 ' +
    'M30 26 C33 28 37 28 40 26 M44 14 C48 16 52 16 56 14 M60 32 C63 34 65 34 68 32',
  featherduster: 'M48 62 L48 38 ' + rays(48, 38, 3, 24, 11, P * 1.08, P * 1.92) + 'M40 62 L56 62',
  bristle: bristle(),
  flatworm: 'M14 34 C14 26 30 22 48 22 C66 22 82 26 82 34 C82 42 66 46 48 46 C30 46 14 42 14 34 Z M18 30 L13 24 M18 30 L20 24 M30 25 C40 28 56 28 70 25 M30 43 C40 40 56 40 70 43',
  squirt: 'M36 58 C30 46 32 30 40 22 L41 13 L47 14 L46 22 C50 21 53 22 55 19 L58 13 L63 15 L60 24 C66 32 66 46 60 58 Z M32 58 L64 58',
  turtle:
    'M48 14 C60 14 66 23 66 34 C66 46 60 54 48 54 C36 54 30 46 30 34 C30 23 36 14 48 14 Z M43 14 C43 7 53 7 53 14 ' +
    'M32 25 C22 19 14 19 8 23 C14 27 22 30 31 30 M64 25 C74 19 82 19 88 23 C82 27 74 30 65 30 ' +
    'M34 48 C28 52 24 56 22 60 C28 58 32 56 36 52 M62 48 C68 52 72 56 74 60 C68 58 64 56 60 52 M48 19 L48 50 M33 28 L63 28 M33 41 L63 41',
  dolphin:
    'M4 34 L12 33 C18 26 30 22 44 22 L50 12 L56 22 C66 23 76 28 82 34 L92 26 L90 36 L94 46 L82 40 C74 44 62 46 50 46 L44 54 L40 46 C28 45 16 40 12 36 L4 36 Z ' + dot(17, 31, 1.4),
  whale:
    'M4 34 C10 26 26 22 44 24 C58 26 70 30 78 32 L88 24 L90 34 L92 44 L80 38 C70 42 56 44 44 44 C28 44 12 42 4 34 Z M30 43 C28 50 24 56 18 58 C24 52 26 48 26 43 M8 36 C16 38 24 38 32 36 ' + dot(14, 33, 1.2),
  manatee:
    'M8 36 C10 28 20 24 30 26 C44 26 60 26 72 30 C78 32 82 30 88 26 C93 30 93 40 88 46 C82 42 78 40 72 42 C60 46 44 46 30 44 C20 44 10 42 8 36 Z M28 44 L24 53 L33 48 M8 35 L5 38 ' + dot(16, 32, 1.1),
  otter:
    'M8 40 C8 32 14 28 22 30 C30 26 44 24 58 26 C68 28 76 32 82 38 C86 42 90 46 94 50 C86 48 80 46 74 44 C66 46 56 46 46 46 L44 52 L38 52 L38 46 ' +
    'C30 46 24 46 19 46 L17 52 L11 52 L12 45 C9 44 8 42 8 40 Z M18 30 L17 26 L21 28 M8 39 L5 39 ' + dot(15, 35, 1.2),
  croc:
    'M4 34 L24 30 C30 26 36 26 42 28 L70 30 C78 31 86 34 92 36 C86 38 78 40 70 40 L42 42 C36 44 30 44 24 40 L4 38 Z ' +
    'M34 42 L30 50 L36 50 M58 41 L56 50 L62 50 M36 28 L32 20 L38 20 M60 30 L58 22 L64 22 M26 29 C27 26 30 26 31 28 M44 30 L48 28 L52 30 L56 28 L60 30 L64 28 L68 30',
  bird: 'M6 26 C18 20 32 22 44 32 C52 24 70 18 90 22 C74 26 60 32 52 38 C50 40 46 40 44 38 C34 32 20 28 6 26 Z M44 34 L36 31 L30 32 M51 38 L58 44 M51 38 L54 45',
  heron:
    'M40 30 C48 26 62 28 68 34 C72 38 72 42 66 44 C58 46 48 44 42 40 Z M42 32 C36 28 34 22 38 16 C40 12 44 12 46 14 M46 14 L58 12 L46 17 ' +
    'M54 44 L52 60 M60 44 L62 60 M68 35 L77 39 M48 60 L56 60 M58 60 L66 60',
  mangrove:
    'M20 26 C16 16 28 8 38 12 C42 4 58 4 62 12 C72 8 84 16 78 26 C74 32 62 32 56 28 C50 32 44 32 38 28 C32 32 24 32 20 26 Z M48 30 L48 40 ' +
    'M48 40 C42 44 38 50 34 58 M48 40 C54 44 58 50 62 58 M48 36 C38 40 30 48 26 58 M48 36 C58 40 66 48 70 58 M14 56 C20 54 26 58 32 56 M64 56 C70 54 76 58 82 56',
  palm:
    'M50 60 C48 46 46 34 48 22 M48 22 C40 14 28 14 18 20 M48 22 C42 10 32 6 24 8 M48 22 C52 10 62 6 72 10 M48 22 C58 14 70 14 80 22 M48 22 C48 14 50 8 54 4 M30 60 L70 60 ' +
    dot(45, 25, 2) + dot(51, 26, 2),
  seaweed: 'M36 60 C30 48 40 40 34 28 C30 20 36 12 34 6 M48 60 C52 46 44 36 50 24 C54 16 50 10 52 4 M60 60 C66 48 58 40 64 30 C68 22 62 16 66 10 M28 60 L70 60 M35 30 L42 26 M50 24 L44 20 M64 30 L70 26',
  sargassum:
    'M48 60 C46 50 50 40 48 30 C46 22 50 14 48 6 M48 44 C40 42 34 38 30 32 M48 32 C56 30 62 26 66 20 M48 20 C42 18 38 14 36 8 M48 50 C56 48 62 46 68 42 ' +
    dot(28, 30, 2) + dot(68, 18, 2) + dot(34, 6, 2) + dot(70, 40, 2) + dot(40, 40, 1.6) + dot(58, 28, 1.6),
  grass: 'M34 60 C34 44 30 30 26 14 M42 60 C42 40 44 26 42 8 M50 60 C50 44 54 30 58 16 M58 60 C58 48 62 38 68 28 M26 60 C28 50 24 42 18 36 M16 60 L80 60',
} as const;
export type ArtKey = keyof typeof ART;

const BY_SUB: Record<string, ArtKey> = {
  morays: 'eel', 'snake-eels': 'eel', 'conger-eels': 'eel', 'river-eels': 'eel', 'cusk-eels-pearlfishes': 'eel',
  flounders: 'flatfish', 'soles-tonguefishes': 'flatfish', 'seahorses-pipefishes': 'seahorse',
  puffers: 'puffer', porcupinefishes: 'puffer', 'boxfishes-cowfishes': 'puffer', 'frogfishes-batfishes': 'puffer',
  barracudas: 'longfish', needlefishes: 'longfish', halfbeaks: 'longfish', 'cutlassfishes-escolars': 'longfish', 'trumpetfish-cornetfish': 'longfish',
  'tarpon-ladyfish-bonefish': 'fish', snooks: 'fish',
  stingrays: 'ray', 'river-stingrays': 'ray', 'eagle-rays-cownose-rays': 'ray', 'mantas-devil-rays': 'ray', 'electric-rays': 'ray', 'sawfishes-guitarfishes': 'ray',
  'spiny-lobsters': 'lobster', 'slipper-lobsters': 'lobster', shrimps: 'shrimp', 'river-shrimps': 'shrimp', 'mantis-shrimps': 'shrimp', 'isopods-others': 'shrimp', barnacles: 'barnacle',
  octopuses: 'octopus', squids: 'squid', 'deep-cephalopods': 'squid',
  'sea-hares': 'slug', 'sap-sucking-slugs': 'slug', nudibranchs: 'slug', 'other-sea-slugs': 'slug', 'bubble-snails': 'snail',
  oysters: 'bivalve', mussels: 'bivalve', 'ark-clams': 'bivalve', 'venus-clams': 'bivalve', 'tellins-donax': 'bivalve', 'scallops-file-clams': 'bivalve',
  'pen-shells': 'bivalve', 'jewel-boxes-thorny-oysters': 'bivalve', 'other-clams': 'bivalve', 'shipworms-borers': 'bivalve', chitons: 'chiton', 'tusk-shells': 'tusk',
  'sea-urchins': 'urchin', 'sand-dollars-heart-urchins': 'sanddollar', 'sea-stars': 'star', 'brittle-stars': 'brittle', 'sea-cucumbers': 'cucumber', 'feather-stars': 'brittle',
  jellyfish: 'jelly', 'box-jellyfish': 'jelly', 'comb-jellies': 'jelly', 'drifters-siphonophores': 'manowar', hydroids: 'plume',
  'sea-anemones': 'anemone', 'zoanthids-corallimorphs': 'anemone',
  'brain-corals': 'brain', 'star-corals': 'brain', 'boulder-mound-corals': 'brain', 'plate-lettuce-corals': 'plate', 'sea-fans': 'fan', 'small-cup-corals': 'anemone',
  'black-corals': 'plume', 'lace-corals': 'coral',
  sponges: 'sponge', 'bristle-worms': 'bristle', 'fan-worms': 'featherduster', flatworms: 'flatworm', 'ribbon-worms': 'eel', 'peanut-worms-spoon-worms': 'cucumber',
  'sea-squirts': 'squirt', 'salps-pyrosomes': 'squirt', bryozoans: 'plume',
  'sea-turtles': 'turtle', crocodilians: 'croc', dolphins: 'dolphin', whales: 'whale', manatee: 'manatee', seals: 'manatee', otters: 'otter', 'shore-mammals': 'otter',
  'herons-egrets': 'heron',
  seagrasses: 'grass', mangroves: 'mangrove', 'coastal-plants': 'palm', sargassum: 'sargassum',
};
const BY_GROUP: Record<Group, ArtKey> = {
  fish: 'fish', 'sharks-rays': 'shark', crustaceans: 'crab', cephalopods: 'octopus', molluscs: 'snail', echinoderms: 'star', 'jellies-anemones': 'jelly',
  corals: 'coral', 'sponges-worms': 'sponge', 'reptiles-mammals': 'turtle', seabirds: 'bird', 'plants-algae': 'seaweed',
};
/** The group's own icon (the group strip). */
export const GROUP_ART: Record<Group, ArtKey> = { ...BY_GROUP, 'plants-algae': 'mangrove' };

/** The drawing for a species: by its subgroup, else its group's. */
export const artFor = (group: Group, sub: string): ArtKey => BY_SUB[sub] ?? BY_GROUP[group];

/** The drawing as inline SVG. */
export const artSvg = (k: ArtKey, cls = 'gd-art') =>
  `<svg class="${cls}" viewBox="0 0 96 64" aria-hidden="true"><path d="${ART[k]}"/></svg>`;
