/**
 * The DISPATCH drawings: one per way of doing it right (numbered to match each method's list of marks, content.ts
 * `METHODS[].marks`), and one small picture per science step. Flat line art in the page's ink, cuts and blood in its
 * red, water and ice in its sea colours. Pure strings; the styles are in dispatch.css (`.dp-art`).
 * Graphics review D-4, D-5, D-6, D-9, D-11, D-12: one fish with fins, a forked tail, a gill cover and a mouth; the cut
 * drawn solid with its badge by it; blood as clouds; the ikejime spot shown as a zone in a close-up of the head.
 * PLAN 13.7 (Joseph 2026-11-17, "square and crisp"): the fish is the shared reef fish (notes/art/fishkit.ts), every mark
 * is placed in that fish's own 100 by 40 box, badges are squares, zones and clouds are faceted, no round ends or corners.
 */
import { reefFish } from '../notes/art/fishkit';
import type { Lang, MethodId } from './content';

const n = (v: number) => +v.toFixed(2);
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
/** A numbered mark: a 17 by 17 ink square centred on (x, y), the number centred in it. */
const badge = (num: number, x: number, y: number) =>
  `<g class="dp-bd"><rect x="${n(x - 8.5)}" y="${n(y - 8.5)}" width="17" height="17"/><text x="${n(x)}" y="${n(y + 3.6)}" text-anchor="middle">${num}</text></g>`;
const lbl = (x: number, y: number, t: string, anchor = 'middle') => `<text class="dp-lbl" x="${n(x)}" y="${n(y)}" text-anchor="${anchor}">${t}</text>`;
/** A thin leader from a label or badge to the part it names. */
const lead = (d: string) => `<path class="dp-ldr" d="${d}"/>`;
/** A faceted blob (an octagon with cut corners), for zones and clouds: crisp, not round. */
const oct = (cx: number, cy: number, rx: number, ry: number, cls: string) => {
  const p = [[-1, -0.45], [-0.5, -1], [0.5, -1], [1, -0.45], [1, 0.45], [0.5, 1], [-0.5, 1], [-1, 0.45]];
  return `<path class="${cls}" d="M${p.map(([a, b]) => `${n(cx + a * rx)} ${n(cy + b * ry)}`).join(' L')} Z"/>`;
};

/** Where the reef fish sits in a drawing: its 100 by 40 box at (x, y), `s` times. */
interface At { x: number; y: number; s: number }
/** A point on the fish (in its own 100 by 40 box) in the drawing's coordinates. */
const on = (f: At, bx: number, by: number): [number, number] => [n(f.x + bx * f.s), n(f.y + by * f.s)];

/*
 * The marks, in the fish's own 100 by 40 box (fishkit.ts: eye at (12.6, 14.4), gill cover from (22, 5) to (22.6, 34),
 * tail stalk at x 81.4, between y 15 and 25), so they land on the same parts at any size or turn.
 */
/** A solid red slash just behind the gill cover, top to bottom of the body. */
const GILL_CUT = '<path class="dp-cut" d="M25.4 4.8 C20.6 12.6 20.6 26 26 34.2"/>';
/** A solid red slash across the tail stalk. */
const TAIL_CUT = '<path class="dp-cut" d="M80.6 13.2 V26.8"/>';
/** The wire, from the tail cut forward along the spine to just behind the brain. */
const WIRE = '<path class="dp-wire" d="M80.6 20 L20.4 12"/>';
/** Behind and above the eye, between the eye and the gill cover: where the brain is. */
const BRAIN: [number, number] = [17.6, 9.4];

/** The fish shared by the ikejime and the club: head left, 26 to 175 across, its fins 5 to 79 down. */
const MAIN: At = { x: 26, y: 14, s: 1.5 };

function ikejime(lang: Lang): string {
  const [zx, zy] = on(MAIN, ...BRAIN);
  const [, gy] = on(MAIN, 0, 34.2);
  const [tx, ty] = on(MAIN, 80.6, 26.8);
  const [wx, wy] = on(MAIN, 50, 16);
  // the close-up: the same fish, 3 times, framed on the head (snout at x 14, the top of the head just under the frame)
  const Z: At = { x: 14, y: 98, s: 3 };
  const [bx, by] = on(Z, ...BRAIN);
  const [ex, ey] = on(Z, 12.6, 14.4);
  return (
    reefFish(MAIN.x, MAIN.y, MAIN.s, { extra: GILL_CUT + TAIL_CUT + WIRE }) +
    // where the spike goes, marked on the whole fish, then shown up close below
    oct(zx, zy, 4.6, 3.4, 'dp-zone') +
    badge(1, 40, 12) + lead(`M46 20.5 L${n(zx - 2)} ${n(zy - 3)}`) + badge(2, 57, gy + 12) + badge(3, tx + 6, ty + 18) + lead(`M${tx + 6} ${ty + 9.5} L${tx} ${ty + 1}`) +
    badge(4, wx, wy) +
    // the close-up of the head: snout, forehead, gill cover and eye; the brain as a zone, the spike going in from above
    '<clipPath id="dp-ik-clip"><rect x="6" y="92" width="208" height="82"/></clipPath>' +
    '<rect class="dp-inset" x="6" y="92" width="208" height="82"/>' +
    `<g clip-path="url(#dp-ik-clip)">${reefFish(Z.x, Z.y, Z.s)}</g>` +
    oct(bx, by, 9, 5.6, 'dp-brain') +
    `<path class="dp-spike" d="M84 95 L${n(bx + 2)} ${n(by - 5)}"/>` +
    `<path class="dp-arrow" d="M${n(bx + 2)} ${n(by - 5)} L${n(bx - 1)} ${n(by - 13)} M${n(bx + 2)} ${n(by - 5)} L${n(bx + 9)} ${n(by - 10)}"/>` +
    // the frame's tag, then the parts named from the empty water in front of the forehead
    '<rect class="dp-tag" x="6" y="92" width="60" height="14"/>' +
    `<text class="dp-lbl dp-tag-t" x="10" y="102.4">${w(lang, 'CLOSE-UP', 'DE CERCA')}</text>` +
    lbl(10, 118, w(lang, 'BRAIN', 'CEREBRO'), 'start') + lead(`M${n(bx - 10)} ${n(by - 2)} L${lang === 'es' ? 58 : 46} 120`) +
    lbl(30, n(ey + 3.6), w(lang, 'EYE', 'OJO'), 'end') + lead(`M33 ${ey} H${n(ex - 11)}`)
  );
}

/** A fish club from its grip end (ax, ay) to its striking face (bx, by): a wrapped grip, then a straight taper to a square face. */
function club2(ax: number, ay: number, bx: number, by: number): string {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, px = -uy, py = ux;
  const at = (t: number, h: number) => `${n(ax + dx * t + px * h)} ${n(ay + dy * t + py * h)}`;
  return (
    `<path class="dp-clubb" d="M${at(0, -2.4)} L${at(0.34, -2.6)} L${at(1, -5.8)} L${at(1, 5.8)} L${at(0.34, 2.6)} L${at(0, 2.4)} Z"/>` +
    `<path class="dp-ldr" d="M${at(0.1, -2.4)} L${at(0.1, 2.4)} M${at(0.2, -2.5)} L${at(0.2, 2.5)} M${at(0.3, -2.6)} L${at(0.3, 2.6)}"/>`
  );
}

/** A club coming down from above onto the top of the head, the strike marked, then the gill cut. */
function club(): string {
  // the same fish 8 lower than in the ikejime, for room above its head
  const F: At = { ...MAIN, y: MAIN.y + 8 };
  const [hx, hy] = on(F, 15.6, 7);
  const [, gy] = on(F, 0, 34.2);
  return (
    reefFish(F.x, F.y, F.s, { extra: GILL_CUT }) +
    // the club swung in from the upper left, its heavy end on the top of the head over the brain
    club2(8, 2, hx - 1, hy - 3) +
    `<path class="dp-hit" d="M${hx + 7} ${hy - 4} L${hx + 13} ${hy - 7} M${hx - 11} ${hy + 3} L${hx - 17} ${hy + 6}"/>` +
    badge(1, n(hx + 9), 10) + badge(2, 57, gy + 12)
  );
}

/** A bucket of seawater with the whole fish head down under the water, the gill cut open, blood drifting out. */
function bleed(lang: Lang): string {
  // the fish turned head down: its box's x runs up the bucket from the snout at y 102, its belly faces right
  const s = 0.7, X = 76, Y = 102;
  return (
    '<path class="dp-sea" d="M55 24 L65 106 L155 106 L165 24 Z"/>' +
    `<g transform="translate(${X} ${Y}) rotate(-90)">${reefFish(0, 0, s, { plain: true, extra: GILL_CUT })}</g>` +
    // blood: clouds drifting up and out of the gills
    '<g class="dp-bloods">' +
    oct(X + 32 * s + 10, Y - 26 * s + 2, 7, 4.5, 'dp-blood b0') + oct(124, 66, 9, 5.5, 'dp-blood b1') +
    oct(138, 48, 7, 4.5, 'dp-blood b2') + oct(118, 36, 5, 3.5, 'dp-blood b3') +
    '</g>' +
    '<path class="dp-water" d="M55 24 C66 19 74 29 86 24 C98 19 106 29 118 24 C130 19 138 29 150 24 L165 24"/>' +
    '<path class="dp-line" d="M52 16 L64 106 L156 106 L168 16"/>' +
    '<path class="dp-line" d="M46 16 L174 16"/>' +
    // a square timer: face, two hands, the button on top
    '<text class="dp-clock" x="176" y="44">3 min</text>' +
    '<rect class="dp-line" x="180" y="56" width="20" height="20"/><path class="dp-line" d="M186 52 H194 M190 52 V56 M190 66 V59 M190 66 L195 70"/>' +
    '<path class="dp-ldr" d="M190 57 V59.4 M199 66 H196.6 M190 75 V72.6 M181 66 H183.4"/>' +
    lbl(110, 10, w(lang, 'SEAWATER', 'AGUA DE MAR')) +
    badge(1, 128, 92) + lead(`M119.5 92 H${n(X + 34 * s + 3)}`) + badge(2, 190, 92)
  );
}

/** A cooler about half full of ice in seawater, the fish under it, a wet cloth over the top; below, ice in a big fish's belly. */
function slurry(lang: Lang): string {
  const cube = (x: number, y: number, r = 0, z = 12) =>
    `<rect class="dp-cube" x="${x}" y="${y}" width="${z}" height="${z}" transform="rotate(${r} ${x + z / 2} ${y + z / 2})"/>`;
  const back: [number, number, number][] = [[30, 48, -10], [48, 46, 6], [150, 46, -6], [170, 50, 10], [184, 62, -4], [96, 46, 8], [122, 47, -8], [72, 47, 4]];
  const front: [number, number, number][] = [
    [26, 94, 8], [44, 92, -6], [58, 96, 12], [76, 92, -10], [94, 96, 4], [112, 92, -8], [130, 96, 10], [148, 92, -4],
    [164, 96, 6], [180, 90, -12], [182, 76, 8], [26, 54, 4], [168, 78, 12],
  ];
  const F: At = { x: 52, y: 53, s: 1.12 };
  const B: At = { x: 12, y: 120, s: 1.2 };
  const [cx0, cy0] = on(B, 30, 26);
  return (
    '<path class="dp-sea" d="M22 40 L22 108 L198 108 L198 40 Z"/>' +
    back.map(([x, y, r]) => cube(x, y, r)).join('') +
    reefFish(F.x, F.y, F.s) +
    front.map(([x, y, r]) => cube(x, y, r)).join('') +
    '<path class="dp-water" d="M22 42 C40 37 50 47 70 42 C90 37 100 47 120 42 C140 37 150 47 170 42 L198 42"/>' +
    '<path class="dp-line" d="M20 30 L20 108 L200 108 L200 30"/>' +
    // a wet cloth laid over the top, keeping the sun off, in flat folds
    '<path class="dp-cloth" d="M12 29 L56 25 L100 31 L148 24 L208 28 L208 36 L148 32 L100 39 L56 33 L12 37 Z"/>' +
    '<path class="dp-ldr" d="M56 25 V33 M100 31 V39 M148 24 V32"/>' +
    '<text class="dp-clock" x="208" y="16" text-anchor="end">≈ 0 °C / 32 °F</text>' +
    lbl(12, 16, w(lang, 'COVERED', 'CUBIERTO'), 'start') +
    badge(1, 38, 78) + badge(2, 86, 12) + lead('M86 20.5 V27') +
    // big fish: guts out, the belly opened and packed with ice
    reefFish(B.x, B.y, B.s, {
      extra: '<path class="dp-belly" d="M29 25.6 L57.4 25 L58.6 35 C48 36.8 38 36.8 29 35.8 Z"/>',
    }) +
    cube(n(cx0 + 3), n(cy0 + 2), -6, 8) + cube(n(cx0 + 13), n(cy0 + 3), 8, 8) + cube(n(cx0 + 23), n(cy0 + 2), -4, 8) +
    lbl(146, 144, w(lang, 'BIG FISH:', 'PEZ GRANDE:'), 'start') +
    lbl(146, 156, w(lang, 'ICE IN', 'HIELO EN'), 'start') +
    lbl(146, 168, w(lang, 'THE BELLY', 'LA PANZA'), 'start') +
    badge(3, 154.5, 126)
  );
}

export function methodArt(id: MethodId, lang: Lang = 'en'): string {
  switch (id) {
    case 'ikejime': return ikejime(lang);
    case 'club': return club();
    case 'bleed': return bleed(lang);
    case 'slurry': return slurry(lang);
  }
}

/** Each drawing's viewBox: the ikejime adds a close-up of the head, the slurry a big fish with ice in its belly. */
export const ART_VB: Record<MethodId, string> = { ikejime: '0 0 220 178', club: '0 0 220 96', bleed: '0 0 220 112', slurry: '0 0 220 176' };

/** How many numbered marks each drawing carries, for the tests that keep them in step with the lists. */
export const ART_MARKS: Record<MethodId, number> = { ikejime: 4, club: 2, bleed: 2, slurry: 3 };

/** One small picture per science step (content.ts STEPS ids), in a 160 by 64 box. */
export function scienceArt(id: string, lang: Lang): string {
  switch (id) {
    case 'stress': {
      // two fuel gauges: a calm fish starts full, a fish that fought starts nearly empty
      const g = (x: number, fill: number, word: string) =>
        `<rect class="dp-gauge" x="${x}" y="14" width="60" height="18"/><rect class="dp-fuel" x="${x + 2}" y="16" width="${Math.round(56 * fill)}" height="14"/>` + lbl(x + 30, 50, word);
      return g(10, 1, w(lang, 'CALM', 'TRANQUILO')) + g(90, 0.15, w(lang, 'FOUGHT', 'LUCHÓ')) + lbl(80, 10, w(lang, 'FUEL LEFT', 'COMBUSTIBLE'));
    }
    case 'acid': {
      // a pH ruler from 7.0 down to 6.4: rested fish barely move, stressed fish drop five times as far in 3 hours
      const x = (ph: number) => 16 + ((7 - ph) / 0.6) * 90;
      let s = `<path class="dp-line" d="M${x(7)} 32 H${x(6.4)}"/>`;
      for (const p of [7, 6.8, 6.6, 6.4]) s += `<path class="dp-line" d="M${x(p)} 28 V36"/>` + lbl(x(p), 45, p.toFixed(1));
      s += `<path class="dp-good" d="M${x(7)} 20 H${x(6.9)}"/><path class="dp-bad" d="M${x(7)} 53 H${x(6.5)}"/>`;
      s += lbl(x(6.9) + 4, 23, w(lang, 'RESTED', 'DESCANSADO'), 'start') + lbl(x(6.5) + 4, 56, w(lang, 'STRESSED', 'ESTRESADO'), 'start');
      return s + lbl(158, 30, 'pH', 'end') + lbl(158, 42, w(lang, 'IN 3 H', 'EN 3 H'), 'end');
    }
    case 'rigor':
      // how soon a cod starts to stiffen: half an hour hot after a fight, 14 hours calm on ice
      return (
        `<rect class="dp-bad-f" x="10" y="12" width="6" height="14"/>` + lbl(22, 23, w(lang, 'HOT, FOUGHT: 30 MIN', 'CALOR, LUCHÓ: 30 MIN'), 'start') +
        `<rect class="dp-good-f" x="10" y="36" width="140" height="14"/>` + lbl(14, 62, w(lang, 'ICE, CALM: 14 H', 'HIELO, TRANQUILO: 14 H'), 'start')
      );
    case 'blood': {
      // two fillets: a bled one is clean, an unbled one is spotted and dark
      const fillet = (x: number, cls: string) => `<path class="${cls}" d="M${x} 30 L${x + 14} 18 L${x + 46} 15 L${x + 64} 22 V38 L${x + 46} 45 L${x + 14} 42 Z"/>`;
      const spots = [[96, 26], [108, 32], [120, 22], [130, 34], [112, 40], [140, 28]].map(([cx, cy]) => `<rect class="dp-spot" x="${cx - 2.5}" y="${cy - 2.5}" width="5" height="5"/>`).join('');
      return fillet(8, 'dp-meat') + fillet(88, 'dp-meat dp-dark') + spots + lbl(40, 58, w(lang, 'BLED', 'DESANGRADO')) + lbl(120, 58, w(lang, 'NOT BLED', 'CON SANGRE'));
    }
    case 'k': {
      // the flavour fades step by step: tasty, then flat, then bitter
      const words = lang === 'es' ? ['SABROSO', 'PLANO', 'AMARGO'] : ['TASTY', 'FLAT', 'BITTER'];
      return [0, 1, 2].map((i) => `<rect class="dp-taste t${i}" x="${14 + i * 55}" y="${12 + i * 3}" width="${28 - i * 6}" height="${28 - i * 6}"/>` + lbl(28 + i * 52, 56, words[i])).join('') +
        '<path class="dp-arrow" d="M46 26 H62 M58 22 L62 26 L58 30 M98 26 H116 M112 22 L116 26 L112 30"/>';
    }
    case 'bacteria': {
      // bacteria in a day: a few on ice, many in the heat
      const dots = (x0: number, n: number) => Array.from({ length: n }, (_, i) => `<rect class="dp-bug" x="${x0 - 2.2 + (i % 8) * 7}" y="${13.8 + Math.floor(i / 8) * 7}" width="4.4" height="4.4"/>`).join('');
      return dots(36, 1) + lbl(40, 58, w(lang, 'ON ICE', 'EN HIELO')) + dots(96, 28) + lbl(122, 58, '28–30 °C') + '<path class="dp-line" d="M80 8 V60"/>';
    }
  }
  return '';
}
