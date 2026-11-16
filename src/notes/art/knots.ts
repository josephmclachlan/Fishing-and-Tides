/**
 * The four knot drawings on the Rigs tab (Palomar, improved clinch, dropper loop, surgeon's knot), each as four steps of
 * the real tie, checked against Animated Knots and the IGFA knot guide.
 *
 * Drawing rules, so a beginner can follow the steps (Joseph 2026-11-16: the old Palomar's steps 1 and 2 entered the
 * hook eye from different sides):
 * - The hook sits in the same place, the same way up, in all four panels of a knot, and the line goes through its eye
 *   the same way in every panel. Each panel is the one before it plus one move.
 * - Line is drawn as a rope (dark outline, light core); the leader in the surgeon's knot has a green core. Where two
 *   parts cross, the nearer one is drawn on top (a simple painter's sort on depth), so every over and under is visible.
 * - An orange dashed arrow shows the one move to make next.
 *
 * Each strand is a smooth curve through control points that carry a depth z (toward the viewer is positive); z only
 * needs to be set near crossings. Classes are in notes-rigs.css (prefix `nt-kn-`).
 */
import { badge } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
export const n1 = (v: number) => Math.round(v * 10) / 10;

/** A control point: x, y and depth z (0 when left out). */
export type C = readonly [number, number, number?];
export interface Pt {
  x: number;
  y: number;
  z: number;
}
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
export const dOf = (p: Pt[]) => 'M' + p.map((a) => `${n1(a.x)} ${n1(a.y)}`).join('L');

/** A Catmull-Rom curve through the control points, sampled about every 2.5 units. */
export function spline(c: readonly C[]): Pt[] {
  const q = c.map(([x, y, z = 0]) => ({ x, y, z }));
  const f = (a: number, b: number, c2: number, d: number, t: number) =>
    0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t);
  const out: Pt[] = [];
  for (let i = 0; i < q.length - 1; i++) {
    const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)];
    const n = Math.max(3, Math.ceil(dist(p1, p2) / 2.5));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x, t), y: f(p0.y, p1.y, p2.y, p3.y, t), z: f(p0.z, p1.z, p2.z, p3.z, t) });
    }
  }
  out.push(q[q.length - 1]);
  return out;
}

/** The curve moved sideways by d (positive is to the left of travel on screen). */
export function offset(p: Pt[], d: number | ((t: number) => number)): Pt[] {
  const g = typeof d === 'number' ? () => d : d;
  return p.map((a, i) => {
    const b = p[Math.min(i + 1, p.length - 1)], c = p[Math.max(i - 1, 0)];
    const dx = b.x - c.x, dy = b.y - c.y, L = Math.hypot(dx, dy) || 1;
    const k = g(i / (p.length - 1));
    return { x: a.x - (dy / L) * k, y: a.y + (dx / L) * k, z: a.z };
  });
}

/** A doubled line (the Palomar's loop of line): out along one side of the centre curve, round the end, back along the other. */
function hairpin(c: Pt[], g: number): Pt[] {
  const a = offset(c, g), b = offset(c, -g).reverse();
  const e = c[c.length - 1], pe = c[c.length - 3];
  const L = dist(pe, e) || 1, tx = (e.x - pe.x) / L, ty = (e.y - pe.y) / L, nx = -ty, ny = tx;
  const arc: Pt[] = [];
  for (let k = 1; k < 10; k++) {
    const f = (k / 10) * Math.PI;
    arc.push({ x: e.x + g * (Math.cos(f) * nx + Math.sin(f) * tx), y: e.y + g * (Math.cos(f) * ny + Math.sin(f) * ty), z: e.z });
  }
  return [...a, ...arc, ...b];
}

// ---------------------------------------------------------------- drawing

type Style = 'ln' | 'ld' | 'hk';
interface Strand {
  p: Pt[];
  s: Style;
  /** Round off the start and end as cut ends (true), or leave them running off the panel. */
  tips?: [boolean, boolean];
}

const R_OUT = 2.4, R_IN = 1.25; // rope half widths: outline, core (match notes-rigs.css)

/**
 * Painter's sort: every strand is cut into short runs of nearly equal depth, the runs are drawn far to near, each rope
 * run as a dark outline under a light core. A nearer part therefore covers a farther one, outline and all.
 */
function draw(ss: Strand[]): string {
  const runs: { s: Style; p: Pt[]; z: number; o: number; tip?: Pt[] }[] = [];
  let order = 0;
  for (const st of ss) {
    const band = (z: number) => Math.round(z * 2) / 2;
    let cur: Pt[] = [st.p[0]], zc = band(st.p[0].z);
    const flush = () => runs.push({ s: st.s, p: cur, z: zc, o: order++ });
    for (let i = 1; i < st.p.length; i++) {
      const b = band(st.p[i].z);
      cur.push(st.p[i]);
      if (b !== zc) {
        flush();
        cur = [st.p[i - 1], st.p[i]]; // overlap one step so the joint has no seam
        zc = b;
      }
    }
    if (cur.length > 1) flush();
    const tips: Pt[] = [];
    if (st.tips?.[0]) tips.push(st.p[0]);
    if (st.tips?.[1]) tips.push(st.p[st.p.length - 1]);
    if (tips.length) runs.push({ s: st.s, p: [], z: Math.max(...tips.map((t) => band(t.z))), o: order++, tip: tips });
  }
  runs.sort((a, b) => a.z - b.z || a.o - b.o);
  // Band by band, far to near: a gap in the background colour round the parts that cross over (so the part beneath
  // shows a clear break), then the outlines, then the cores, so the two strands of a doubled line never cover each other.
  let out = '';
  for (let i = 0; i < runs.length; ) {
    let j = i;
    while (j < runs.length && runs[j].z === runs[i].z) j++;
    const band = runs.slice(i, j);
    const ds = band.map((r) => (r.tip ? '' : dOf(r.p)));
    if (band[0].z >= 0.5) out += band.map((r, k) => (r.tip ? '' : `<path class="nt-kn-halo${r.s === 'hk' ? ' nt-kn-halo-hk' : ''}" d="${ds[k]}"/>`)).join('');
    out += band.map((r, k) => (r.tip || r.s === 'hk' ? '' : `<path class="nt-kn-o" d="${ds[k]}"/>`)).join('');
    out += band
      .map((r, k) => {
        if (r.tip)
          return r.tip.map((t) => `<circle class="nt-kn-tipo" cx="${n1(t.x)}" cy="${n1(t.y)}" r="${R_OUT}"/><circle class="nt-kn-tip nt-kn-${r.s}" cx="${n1(t.x)}" cy="${n1(t.y)}" r="${R_IN}"/>`).join('');
        return r.s === 'hk' ? `<path class="nt-kn-hk" d="${ds[k]}"/>` : `<path class="nt-kn-f nt-kn-${r.s}" d="${ds[k]}"/>`;
      })
      .join('');
    i = j;
  }
  return out;
}

/** A hook eye: a ring in the drawing's plane (z 0), so a line through it passes over one side and under the other. */
function eyeRing(cx: number, cy: number, r: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k <= 32; k++) {
    const t = (k / 32) * 2 * Math.PI;
    out.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t), z: 0 });
  }
  return out;
}

/** A J hook hanging from its eye at (x, y): shank down, bend to the left, point up with its barb. */
function hook(x: number, y: number, r: number): Strand[] {
  const top = y + r, L = 28, R = 10, yb = top + L;
  const p: Pt[] = [];
  for (let k = 0; k <= 6; k++) p.push({ x, y: top + (L * k) / 6, z: 0 });
  for (let k = 1; k <= 14; k++) {
    const t = (k / 14) * Math.PI;
    p.push({ x: x - R + R * Math.cos(t), y: yb + R * Math.sin(t), z: 0 });
  }
  for (let k = 1; k <= 5; k++) p.push({ x: x - 2 * R + 0.3 * k, y: yb - 2.6 * k, z: 0 });
  const tip = p[p.length - 1];
  const barb = [{ x: tip.x, y: tip.y, z: 0 }, { x: tip.x + 3.6, y: tip.y + 5.2, z: 0 }];
  return [{ p: eyeRing(x, y, r), s: 'hk' }, { p, s: 'hk' }, { p: barb, s: 'hk' }];
}

/** A dashed arrow along a curve, its head at the end: the next move. */
function arrow(c: readonly C[]): string {
  const p = spline(c), e = p[p.length - 1], q = p[Math.max(0, p.length - 4)];
  const a = Math.atan2(e.y - q.y, e.x - q.x), h = 6.5;
  const s = (k: number) => `${n1(e.x - h * Math.cos(a + k))} ${n1(e.y - h * Math.sin(a + k))}`;
  return `<path class="nt-rigs-ar" d="${dOf(p)}"/><path class="nt-rigs-arh" d="M${s(0.55)} L${n1(e.x)} ${n1(e.y)} L${s(-0.55)}"/>`;
}

const lbl = (x: number, y: number, t: string, anchor: 'start' | 'middle' | 'end' = 'start', cls = 'nt-lbl nt-lbl-s') =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

/** Four step panels in a 320 by 280 box, numbered top left, each clipped to its frame. */
const PW = 154, PH = 134;
const PANELS: readonly [number, number][] = [[4, 4], [162, 4], [4, 142], [162, 142]];
function panels(id: string, parts: string[]): string {
  return parts
    .map((s, i) => {
      const [x, y] = PANELS[i];
      const cid = `nt-kn-${id}-${i + 1}`;
      return (
        `<g transform="translate(${x} ${y})"><clipPath id="${cid}"><rect x="0" y="0" width="${PW}" height="${PH}"/></clipPath>` +
        `<rect class="nt-rigs-pan" x="0" y="0" width="${PW}" height="${PH}"/><g clip-path="url(#${cid})">${s}</g>${badge(i + 1, 13, 13)}</g>`
      );
    })
    .join('');
}

// ---------------------------------------------------------------- Palomar

/**
 * Palomar. The hook hangs from its eye at E in all four panels, and the doubled line goes through the eye from left to
 * right every time. Step 2 is an overhand knot in the doubled line: down the left, along the bottom through the eye,
 * up the right, back over the top (over the line coming in), then the loop end tucked under the left side and over the
 * right side of that ring. Step 3 is step 2 with the loop end opened and dropped over the hook. Step 4 is it pulled
 * tight on the eye.
 */
const E: [number, number] = [70, 70];
const ER = 9.5; // eye radius
const DG = 3.3; // half the gap between the two strands of the doubled line

/** The doubled line's centre from the top, down the left of the ring, through the eye, up the right. */
const PAL_IN: C[] = [
  [52, -6], [51, 8], [50, 20, -1], [48, 32], [46, 46, 1], [50, 60], [60, 69, 1.2], [70, E[1], 0], [80, 69, -1.2],
  [91, 60], [95, 47, -1], [94, 34], [87, 22], [74, 15], [60, 16], [51, 19, 1], [38, 24], [27, 33], [27, 44], [34, 47, -1],
  [46, 47, -1], [62, 47], [80, 47], [95, 47, 1], [104, 48, 0.4],
];

function palomar(lang: Lang): string {
  const H = hook(E[0], E[1], ER);
  // 1: the doubled line passed through the eye, left to right; the loop end out to the right
  const c1 = spline([[52, -6], [53, 14], [55, 34], [57, 52], [61, 64, 1.2], [70, E[1], 0], [80, 71, -1.2], [96, 68], [116, 60], [136, 54]]);
  const s1 = hairpin(c1, DG);
  let end1 = s1.length - 1; // the short end stops just inside the panel; the main line runs off the top
  while (end1 > 0 && s1[end1].y < 16) end1--;
  const p1 =
    draw([...H, { p: s1.slice(0, end1 + 1), s: 'ln', tips: [false, true] }]) +
    lbl(112, 100, '15 cm', 'middle') + `<path class="nt-rigs-dim" d="M82 88 L140 70 M80 83 L83 92 M138 66 L141 75"/>` +
    lbl(60, 10, w(lang, 'MAIN LINE', 'LÍNEA'), 'start') + lbl(44, 26, w(lang, 'END', 'PUNTA'), 'end');
  // 2: a loose overhand knot in the doubled line, the hook hanging from the bottom of the ring
  const c2 = spline([...PAL_IN, [118, 52], [132, 58]]);
  const s2 = hairpin(c2, DG);
  const p2 = draw([...H, { p: s2, s: 'ln' }]) + lbl(136, 76, w(lang, 'LOOP', 'LAZO'), 'end');
  // 3: the loop end opened and passed over the whole hook; it now hangs round the hook below the eye
  const k3 = spline(PAL_IN);
  const A = offset(k3, DG), B = offset(k3, -DG).reverse();
  const a1 = A[A.length - 1], b0 = B[0];
  const loop3 = spline([
    [a1.x, a1.y, a1.z], [114, 52], [126, 70], [124, 98], [108, 122], [80, 130], [52, 127], [40, 118], [44, 104],
    [56, 94, -1.2], [70, 90, -1.5], [84, 90, -1.2], [98, 84], [106, 70], [b0.x, b0.y, b0.z],
  ]);
  const p3 = draw([...H, { p: [...A, ...loop3.slice(1, -1), ...B], s: 'ln' }]) + arrow([[136, 34], [142, 64], [138, 96]]);
  // 4: pulled tight: the knot sits on the eye, the loop round the hook just below it, the end cut short
  const p4 = palomarDone(lang);
  return panels('pal', [p1, p2, p3, p4]);
}

/**
 * The finished Palomar on the same hook: two strands go down in front, through the eye and back up behind it; the loop
 * has slid up past the eye and sits round all of them just above it; the overhand knot sits on top; the short end is cut.
 */
function palomarDone(lang: Lang): string {
  const H = hook(E[0], E[1], ER);
  const [x, y] = E;
  const top = y - ER;
  /** One strand: down in front at x0, through the eye, back up behind at x1. */
  const thru = (x0: number, x1: number, y0: number) =>
    spline([[x0, y0], [x0, top - 4, 0.6], [x0, top + 2, 1.4], [x0, y - 1, 0.4], [(x0 + x1) / 2, y + 3, -1.2], [x1, y - 2, -1.6], [x1, top - 2, -1.6], [x1, top - 30, -1.6]]);
  const main = thru(x - 3, x - 8, -6);
  const short = thru(x + 3, x + 8, top - 30);
  // the loop, slid up past the eye: two turns round all four strands just above it
  const ring = (cy: number) => spline([[x - 13, cy], [x - 8, cy + 3.5, 2], [x, cy + 4.5, 2.2], [x + 8, cy + 3.5, 2], [x + 13, cy], [x + 8, cy - 3.5, -2.2], [x, cy - 4.5, -2.4], [x - 8, cy - 3.5, -2.2], [x - 13, cy]]);
  // the overhand knot on top: a doubled band across the front, its ends round the back
  const band = spline([[x - 15, top - 34, -2], [x - 9, top - 30, 2.4], [x, top - 26, 2.6], [x + 9, top - 22, 2.4], [x + 15, top - 18, -2]]);
  const b1 = offset(band, 2.9), b2 = offset(band, -2.9);
  const tag = spline([[x + 6, top - 26, 2.8], [x + 12, top - 34, 2.8], [x + 16, top - 40, 2.8]]);
  return (
    draw([...H, { p: main, s: 'ln' }, { p: short, s: 'ln' }, { p: ring(top - 8), s: 'ln' }, { p: ring(top - 15), s: 'ln' }, { p: b1, s: 'ln' }, { p: b2, s: 'ln' }, { p: tag, s: 'ln', tips: [false, true] }]) +
    arrow([[x - 26, 52], [x - 26, 16]]) + lbl(x - 32, 42, w(lang, 'PULL', 'JALE'), 'end') +
    lbl(x + 30, 12, '3 mm', 'start') + `<path class="nt-rigs-dim" d="M${x + 30} 15 L${x + 19} ${top - 41}"/>` +
    lbl(x + 22, top - 6, w(lang, 'LOOP', 'LAZO'), 'start')
  );
}

// ---------------------------------------------------------------- improved clinch

/** The tag end wound round the main line: `turns` turns from x0 to x1, starting on top; z alternates over and under. */
function helix(x0: number, x1: number, y: number, a: number, turns: number): Pt[] {
  const out: Pt[] = [];
  const n = Math.ceil((x1 - x0) / 1.2);
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n, f = (2 * Math.PI * turns * k) / n;
    out.push({ x, y: y - a * Math.cos(f), z: 1.6 * Math.sin(f) });
  }
  return out;
}

/**
 * Improved clinch. The hook hangs from its eye on the left in all four panels; the main line comes from the right and
 * goes through the eye (over its right side, under its left), and the short end comes back above it.
 */
export function clinch(lang: Lang): string {
  const Y = 66, X = 24; // the eye
  const H = hook(X, Y, ER);
  const into: C[] = [[162, Y], [110, Y], [60, Y], [X + 13, Y, 1.2], [X, Y, 0], [X - 13, Y, -1.2], [X - 18, Y - 7, -0.6], [X - 13, Y - 15], [X, Y - 17]];
  // 1: through the eye and folded back
  const s1 = spline([...into, [40, Y - 18], [76, Y - 21], [110, Y - 24]]);
  const p1 = draw([...H, { p: s1, s: 'ln', tips: [false, true] }]) + lbl(110, Y - 32, w(lang, 'SHORT END', 'PUNTA'), 'middle') + lbl(150, Y + 16, w(lang, 'MAIN LINE', 'LÍNEA'), 'end');
  // 2: the short end wound round the main line five times, moving away from the eye
  const main = spline([[162, Y], [110, Y], [60, Y], [X + 13, Y, 1.2], [X, Y, 0], [X - 13, Y, -1.2], [X - 18, Y - 7, -0.6], [X - 13, Y - 15], [X, Y - 17], [36, Y - 13], [44, Y - 9]]);
  const wraps = helix(46, 116, Y, 9, 5);
  const tag2 = [...main, ...wraps, ...spline([[116, Y - 9], [124, Y - 20], [132, Y - 30]]).slice(1)];
  const p2 = draw([...H, { p: tag2, s: 'ln', tips: [false, true] }]) + lbl(81, Y + 28, w(lang, '5 TURNS', '5 VUELTAS'), 'middle', 'nt-lbl');
  // 3: the end brought back and pushed down through the small loop by the eye; then (arrow) up through the big loop
  const back = spline([[116, Y - 9], [125, Y - 22], [124, Y - 38], [106, Y - 50], [74, Y - 52], [48, Y - 44], [38, Y - 30], [36, Y - 16, 1.6], [36, Y - 8], [36, Y, -1.6], [38, Y + 10], [40, Y + 18]]);
  const tag3 = [...main, ...wraps, ...back.slice(1)];
  const p3 =
    draw([...H, { p: tag3, s: 'ln', tips: [false, true] }]) +
    arrow([[46, Y + 22], [64, Y + 28], [80, Y + 18], [84, Y - 30]]) + lbl(82, 30, w(lang, 'BIG LOOP', 'LAZO GRANDE'), 'middle') +
    lbl(58, 128, w(lang, 'SMALL LOOP', 'LAZO CHICO'), 'start') + `<path class="nt-rigs-dim" d="M62 120 L42 ${Y - 5}"/>`;
  // 4: pulled tight: the turns pack into a neat coil against the eye; the end trimmed
  const ret = spline([[X + 13, Y, 1.2], [X, Y, 0], [X - 13, Y, -1.2], [X - 16, Y - 6, -0.6], [X - 11, Y - 12.5], [X + 2, Y - 12], [X + 12, Y - 7]]);
  const coil = helix(X + 13, X + 46, Y, 6.5, 5);
  // the end went back through the big loop, which now lies along the top of the coil: it comes out by the eye end
  const tag4 = [...ret, ...coil.slice(1), ...spline([[X + 46, Y - 6.5], [X + 40, Y - 10, 2.4], [X + 28, Y - 10, 2.4], [X + 19, Y - 9, 2.4], [X + 16, Y - 16, 2.4], [X + 14, Y - 24, 2.4]]).slice(1)];
  const p4 =
    draw([...H, { p: spline([[162, Y], [100, Y], [X + 13, Y]]), s: 'ln' }, { p: tag4, s: 'ln', tips: [false, true] }]) +
    arrow([[112, Y + 18], [146, Y + 18]]) + lbl(112, Y + 34, w(lang, 'PULL', 'JALE'), 'start') +
    lbl(44, Y - 36, '3 mm', 'start') + `<path class="nt-rigs-dim" d="M42 ${Y - 38} L${X + 16} ${Y - 27}"/>`;
  return panels('cl', [p1, p2, p3, p4]);
}

// ---------------------------------------------------------------- dropper loop

/** Two strands twisted round each other along y0, from x0 to x1, the phase running from f0 to f1 (a crossing every half turn). */
function twist(x0: number, x1: number, y0: number, a: (x: number) => number, f0: number, f1: number, sign: 1 | -1): Pt[] {
  const out: Pt[] = [];
  const n = Math.ceil((x1 - x0) / 1);
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n, f = f0 + ((f1 - f0) * k) / n;
    out.push({ x, y: y0 - sign * a(x) * Math.sin(f), z: sign * 1.4 * Math.cos(f) });
  }
  return out;
}

/**
 * Dropper loop. 1: a loop. 2: one side wound round the other six times, the turns on both sides of an opening kept in
 * the middle. 3: the bottom of the loop pushed up through that opening. 4: pulled tight, the loop standing out.
 */
export function dropper(lang: Lang): string {
  // 1: a loop in the line
  const p1 = draw([{ p: spline([[-6, 40], [30, 40], [58, 42], [78, 54], [86, 74], [76, 94], [58, 98], [46, 84], [48, 62, 1], [60, 47, 1.4], [74, 40, 1], [100, 36], [160, 36]]), s: 'ln' }]);
  // 2: the turns, an opening kept in the middle, the loop hanging below
  const y0 = 36, A = (x: number) => (x > 62 && x < 92 ? 5 + 7 * Math.sin((Math.PI * (x - 62)) / 30) : 5);
  const fL0 = Math.PI / 2, fL1 = fL0 + 5 * Math.PI, fR1 = fL1 + 6 * Math.PI;
  const run = (sign: 1 | -1) => [...twist(12, 62, y0, A, fL0, fL1, sign), ...twist(62, 92, y0, A, fL1, fL1, sign).slice(1), ...twist(92, 142, y0, A, fL1, fR1, sign).slice(1)];
  const P1 = run(1), P2 = run(-1);
  const whole = (legs: Pt[]) => [...spline([[-6, 30], [12, 31]]), ...P1.slice(1), ...legs.slice(1), ...P2.slice(1), ...spline([[142, 31], [160, 30]]).slice(1)];
  const legs2 = spline([[142, 41], [149, 54], [146, 82], [124, 104], [78, 112], [32, 104], [10, 82], [6, 54], [12, 41]]);
  const p2 = draw([{ p: whole(legs2), s: 'ln' }]) + lbl(77, 70, w(lang, 'OPENING', 'ABERTURA'), 'middle') + `<path class="nt-rigs-dim" d="M77 60 V44"/>`;
  // 3: the bottom of the loop pushed up through the opening and held
  const legs3 = spline([
    [142, 41], [149, 54], [146, 84], [126, 104], [100, 100], [86, 76], [83.5, 52, 0.8], [83, 44, 1.6], [82.5, 34, 0], [82, 22, -1.6], [80, 10, -0.6], [77, 4, 0],
    [73, 10, -0.6], [71.5, 22, -1.6], [71, 34, 0], [71, 44, 1.6], [70.5, 52, 0.8], [67, 76], [54, 100], [28, 104], [10, 84], [6, 54], [12, 41],
  ]);
  const p3 = draw([{ p: whole(legs3), s: 'ln' }]) + arrow([[104, 30], [104, 6]]);
  // 4: pulled tight: the turns packed on each side, the loop standing out at a right angle
  const y4 = 96, a4 = () => 4.4, g0 = Math.PI / 2, g1 = g0 + 5 * Math.PI;
  const lead = spline([[-6, y4 - 3], [34, y4 - 4.4]]);
  const L1 = twist(34, 70, y4, a4, g0, g1, 1), L2 = twist(34, 70, y4, a4, g0, g1, -1);
  const R1 = twist(86, 122, y4, a4, g1, g1 + 5 * Math.PI, 1), R2 = twist(86, 122, y4, a4, g1, g1 + 5 * Math.PI, -1);
  const tail = spline([[122, y4 - 4.4], [160, y4 - 3]]);
  const m1 = spline([[70, y4 + 4.4], [78, y4 + 6], [86, y4 + 4.4]]), m2 = spline([[70, y4 - 4.4], [78, y4 - 6], [86, y4 - 4.4]]);
  const loop4 = spline([[73, y4, 2], [72, y4 - 14, 2], [69, 60], [69, 40], [78, 30], [87, 40], [87, 60], [84, y4 - 14, 2], [83, y4, 2]]);
  const p4 =
    draw([
      { p: [...lead, ...L1.slice(1), ...m1.slice(1), ...R1.slice(1)], s: 'ln' },
      { p: [...L2, ...m2.slice(1), ...R2.slice(1), ...tail.slice(1)], s: 'ln' },
      { p: loop4, s: 'ln' },
    ]) + lbl(98, 56, '90°', 'start', 'nt-lbl') + arrow([[30, y4 + 22], [4, y4 + 22]]) + arrow([[126, y4 + 22], [152, y4 + 22]]) + lbl(78, y4 + 26, w(lang, 'PULL BOTH ENDS', 'JALE AMBAS'), 'middle');
  return panels('dr', [p1, p2, p3, p4]);
}

// ---------------------------------------------------------------- surgeon's knot

/**
 * Main line and leader held side by side along one centre curve (main line on the left of travel, leader on the right).
 * The pair runs left to right: on the left the main line runs off the panel and the leader's short end stops at x0; on
 * the right the leader runs off and the main line's short end stops at x1.
 */
function pair(c: readonly C[], x0: number, x1: number, g = DG): Strand[] {
  const p = spline(c);
  const m = offset(p, g), l = offset(p, -g);
  const i0 = l.findIndex((q) => q.x >= x0);
  let i1 = m.length - 1;
  while (i1 > 0 && m[i1].x > x1) i1--;
  return [
    { p: m.slice(0, i1 + 1), s: 'ln', tips: [false, true] },
    { p: l.slice(Math.max(0, i0)), s: 'ld', tips: [true, false] },
  ];
}

const SURG2: C[] = [
  [-6, 80], [30, 80], [56, 80], [86, 80], [108, 76], [122, 60], [118, 36], [98, 22], [72, 20], [50, 28], [40, 46, 1], [44, 80, 1.6], [48, 96, 1],
  [56, 104, 0], [64, 98, -1], [68, 80, -1.6], [72, 62, -0.6], [80, 58, 0], [88, 64, 0.6], [92, 80, 1.6], [98, 98, 0.6], [112, 108], [160, 112],
];
const SURG3: C[] = [
  [-6, 84], [24, 84], [50, 84], [80, 84], [108, 84], [126, 74], [132, 52], [122, 30], [98, 18], [70, 18], [48, 26], [36, 46, 1], [40, 84, 1.6], [42, 96, 1],
  [48, 104, 0], [56, 98, -1], [58, 84, -1.6], [60, 68, -0.6], [66, 62, 0], [72, 68, 0.6], [74, 84, 1.6], [76, 98, 1], [82, 104, 0], [88, 98, -1],
  [90, 84, -1.6], [92, 68, -0.6], [98, 62, 0], [104, 68, 0.6], [106, 84, 1.6], [110, 100, 0.6], [124, 110], [160, 114],
];

/** Surgeon's knot: main line (light) and leader (green) held together and tied as one in a double overhand knot. */
export function surgeon(lang: Lang): string {
  // 1: side by side, overlapping
  const p1 =
    draw([{ p: spline([[-6, 70], [118, 70]]), s: 'ln', tips: [false, true] }, { p: spline([[34, 62], [160, 62]]), s: 'ld', tips: [true, false] }]) +
    `<path class="nt-rigs-dim" d="M34 44 V52 M118 44 V52 M34 48 H118"/>` + lbl(76, 40, '20–25 cm', 'middle') +
    lbl(4, 92, w(lang, 'MAIN LINE', 'LÍNEA')) + lbl(150, 92, w(lang, 'LEADER', 'LÍDER'), 'end');
  // 2: one overhand knot with both lines held as one; 3: the same pair through the loop a second time
  const p2 = draw(pair(SURG2, 12, 140)) + lbl(150, 128, w(lang, 'ONCE', '1 VEZ'), 'end');
  const p3 = draw(pair(SURG3, 12, 140)) + lbl(150, 132, w(lang, 'TWICE', '2 VECES'), 'end');
  // 4: pulled tight from all four ends: the same knot, small; the two short ends trimmed to stubs
  const k = SURG3.slice(2, -2).map(([x, y, z = 0]) => [80 + (x - 82) * 0.36, 74 + (y - 66) * 0.36, z] as const);
  const first = k[0], last = k[k.length - 1];
  const ldStub = spline([[first[0] + 2, first[1] - 3, 3], [first[0] - 4, first[1] - 9, 3], [first[0] - 8, first[1] - 14, 3]]);
  const lnStub = spline([[last[0] - 2, last[1] + 3, 3], [last[0] + 4, last[1] + 9, 3], [last[0] + 8, last[1] + 14, 3]]);
  const p4 =
    draw([
      { p: offset(spline([[-6, first[1] - 1], [first[0] - 20, first[1]], ...k]), 2.5), s: 'ln' },
      { p: offset(spline([...k, [last[0] + 20, last[1]], [160, last[1] + 1]]), -2.5), s: 'ld' },
      { p: ldStub, s: 'ld', tips: [false, true] },
      { p: lnStub, s: 'ln', tips: [false, true] },
    ]) +
    arrow([[30, 108], [6, 108]]) + arrow([[126, 108], [152, 108]]) + lbl(78, 112, w(lang, 'PULL', 'JALE'), 'middle') +
    lbl(4, 50, w(lang, 'MAIN LINE', 'LÍNEA')) + lbl(150, 50, w(lang, 'LEADER', 'LÍDER'), 'end') +
    lbl(78, 26, w(lang, 'ENDS CUT TO 3 mm', 'PUNTAS A 3 mm'), 'middle') +
    `<path class="nt-rigs-dim" d="M66 30 L${n1(first[0] - 9)} ${n1(first[1] - 16)} M90 30 Q${n1(last[0] + 18)} 40 ${n1(last[0] + 10)} ${n1(last[1] + 15)}"/>`;
  return panels('su', [p1, p2, p3, p4]);
}

export { palomar };
