/**
 * The drawn sargassum sprig (Joseph 2026-11-16: the drifting mats should read as seaweed at a glance). Pure geometry, no DOM
 * beyond the 2-D context it is handed.
 *
 * Pelagic sargassum (S. natans, S. fluitans) is a branching stem with narrow, alternate leaf blades and small round gas
 * bladders that keep it afloat; the bladders are what make it read as sargassum rather than any weed. The sprig is drawn
 * the way the Kinetic Plus icons are (src/icons, the iconography pass): a flat fill in the material colour (--m-sarg)
 * with a halo in --m-halo about 3/24 of its size, round joins, exactly like the map's label halos. No gradients.
 *
 * Geometry is in pixels for a sprig `len` long, lying along +x from -len/2 to len/2 and centred on the origin. Pieces
 * keep a minimum size in pixels so a small sprig still shows its bladders.
 */
export type P = [number, number];
export interface Leaf { base: P; tip: P; w: number }
export interface Bladder { at: P; r: number }
export interface Sprig {
  len: number;
  /** The stem, a cubic Bézier: start, two controls, end. */
  stem: [P, P, P, P];
  /** Short stalks carrying the leaves and bladders off the stem. */
  stalks: [P, P][];
  leaves: Leaf[];
  bladders: Bladder[];
  /** Stem and stalk width, px. */
  lineW: number;
  /** Halo width around everything, px (each side). */
  halo: number;
}

/**
 * Where leaves and bladders grow: [fraction along the stem, side]. Leaves alternate, as the plant's do; bladders grow in
 * pairs in the axils, on the side away from the leaf before them.
 */
const LEAVES: readonly [number, 1 | -1][] = [[0.16, 1], [0.38, -1], [0.6, 1], [0.8, -1]];
const BLADDERS: readonly [number, 1 | -1][] = [[0.27, -1], [0.49, 1], [0.7, -1], [0.92, 1]];

const bez = ([a, b, c, d]: [P, P, P, P], t: number): P => {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
};
const tangent = ([a, b, c, d]: [P, P, P, P], t: number): number => {
  const u = 1 - t;
  const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
  const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
  return Math.atan2(dy, dx);
};
const off = (p: P, an: number, d: number): P => [p[0] + Math.cos(an) * d, p[1] + Math.sin(an) * d];

/** A sprig `len` px long. */
export function sprig(len: number): Sprig {
  const L = Math.max(8, len);
  // A gentle S, the way a frond lies in the water.
  const stem: [P, P, P, P] = [[-L / 2, 0], [-L / 6, -0.09 * L], [L / 6, 0.09 * L], [L / 2, 0]];
  const stalks: [P, P][] = [];
  const leaves: Leaf[] = [];
  const bladders: Bladder[] = [];
  const w = Math.max(1.5, 0.06 * L);
  const stalk = Math.max(1, 0.035 * L);
  const r = Math.max(1.2, 0.034 * L);
  for (const [t, sd] of LEAVES) {
    const at = bez(stem, t), an = tangent(stem, t) + sd * 0.72;
    const base = off(at, an, stalk);
    stalks.push([at, base]);
    // Long narrow blades, shortening toward the growing tip.
    leaves.push({ base, tip: off(base, an, L * (0.3 - 0.1 * t)), w });
  }
  // The stem ends in a blade of its own.
  leaves.push({ base: stem[3], tip: off(stem[3], tangent(stem, 1), 0.17 * L), w: w * 0.9 });
  for (const [t, sd] of BLADDERS) {
    const at = bez(stem, t), an = tangent(stem, t) + sd * 1.2;
    // A pair on diverging stalks, the berries that keep the weed afloat.
    for (const da of [-0.42, 0.42]) {
      const end = off(at, an + da, stalk + r);
      stalks.push([at, end]);
      bladders.push({ at: off(end, an + da, r * 0.5), r });
    }
  }
  return { len: L, stem, stalks, leaves, bladders, lineW: Math.max(1, 0.03 * L), halo: Math.min(2.5, Math.max(1.2, (3 / 48) * L)) };
}

/** Half-extents of the sprig plus its halo, px: how big a canvas it needs around its centre. */
export function sprigExtent(s: Sprig): { x: number; y: number } {
  let x = 0, y = 0;
  const see = (p: P, pad: number) => ((x = Math.max(x, Math.abs(p[0]) + pad)), (y = Math.max(y, Math.abs(p[1]) + pad)));
  s.stem.forEach((p) => see(p, s.lineW));
  s.leaves.forEach((l) => (see(l.base, l.w), see(l.tip, l.w)));
  s.bladders.forEach((b) => see(b.at, b.r));
  return { x: Math.ceil(x + s.halo + 1), y: Math.ceil(y + s.halo + 1) };
}

/** A leaf blade: pointed at both ends, widest a third of the way out. */
const leafPath = (l: Leaf): string => {
  const dx = l.tip[0] - l.base[0], dy = l.tip[1] - l.base[1], n = Math.hypot(dx, dy) || 1;
  const px = (-dy / n) * l.w, py = (dx / n) * l.w; // twice the half-width: a quadratic only reaches half its control
  const mx = l.base[0] + dx * 0.4, my = l.base[1] + dy * 0.4;
  const f = (v: number) => v.toFixed(2);
  return `M${f(l.base[0])} ${f(l.base[1])}Q${f(mx + px)} ${f(my + py)} ${f(l.tip[0])} ${f(l.tip[1])}Q${f(mx - px)} ${f(my - py)} ${f(l.base[0])} ${f(l.base[1])}Z`;
};
const f2 = (v: number) => v.toFixed(2);
const curve = ([a, b, c, d]: [P, P, P, P]) => `M${f2(a[0])} ${f2(a[1])}C${f2(b[0])} ${f2(b[1])} ${f2(c[0])} ${f2(c[1])} ${f2(d[0])} ${f2(d[1])}`;
const linePath = (s: Sprig): string => {
  return curve(s.stem) + s.stalks.map(([p, q]) => `M${f2(p[0])} ${f2(p[1])}L${f2(q[0])} ${f2(q[1])}`).join('');
};
const fillPath = (s: Sprig): string =>
  s.leaves.map(leafPath).join('') + s.bladders.map((b) => `M${f2(b.at[0] + b.r)} ${f2(b.at[1])}a${f2(b.r)} ${f2(b.r)} 0 1 0 ${f2(-2 * b.r)} 0a${f2(b.r)} ${f2(b.r)} 0 1 0 ${f2(2 * b.r)} 0Z`).join('');

/** The sprig as SVG path data: `line` is stroked (stem and stalks), `fill` is filled (blades and bladders). */
export function sprigPaths(s: Sprig): { line: string; fill: string } {
  return { line: linePath(s), fill: fillPath(s) };
}

/**
 * The sprig as an inline SVG for keys and legends, `w` px wide, in `currentColor` with no halo (a legend sits on a
 * panel, not the sea). Drawn at a fixed 24 px length so it matches the icon grid, then scaled.
 */
export function sprigSvg(w = 18, cls = ''): string {
  const s = sprig(24), e = sprigExtent({ ...s, halo: 0 }), p = sprigPaths(s);
  const h = Math.round((w * e.y) / e.x);
  return `<svg${cls ? ` class="${cls}"` : ''} width="${w}" height="${h}" viewBox="${-e.x} ${-e.y} ${2 * e.x} ${2 * e.y}" aria-hidden="true"><path d="${p.line}" fill="none" stroke="currentColor" stroke-width="${f2(s.lineW)}" stroke-linecap="round"/><path d="${p.fill}" fill="currentColor"/></svg>`;
}

/** Draw the sprig with its halo, centred on the context's origin. */
export function drawSprig(ctx: CanvasRenderingContext2D, s: Sprig, fill: string, halo: string): void {
  const { line, fill: shapes } = sprigPaths(s);
  const lp = new Path2D(line), fp = new Path2D(shapes);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Halo: everything stroked wide in the halo colour, under the fill.
  ctx.strokeStyle = halo;
  ctx.fillStyle = halo;
  ctx.lineWidth = s.lineW + 2 * s.halo;
  ctx.stroke(lp);
  ctx.lineWidth = 2 * s.halo;
  ctx.stroke(fp);
  ctx.strokeStyle = fill;
  ctx.fillStyle = fill;
  ctx.lineWidth = s.lineW;
  ctx.stroke(lp);
  ctx.fill(fp);
}
