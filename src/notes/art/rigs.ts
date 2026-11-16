/**
 * Drawings for the Rigs and Releasing fish tabs. Same rules as art/water.ts: flat line art, page tokens only (classes
 * in notes-rigs.css, prefix `nt-rigs-`), numbered badges match each figure's marks in sections/rigs.ts and release.ts.
 *
 * The four knot drawings live in art/knots.ts.
 */
import { badge, type Fig } from './fig';
import { RIGS_PICTS } from '../picts/rigs';
import { clinch, dOf, dropper, n1, palomar, surgeon, type Pt } from './knots';

type Lang = 'en' | 'es';

// ---------------------------------------------------------------- shared bits

const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
const LN = 'nt-rigs-ln', LD = 'nt-rigs-ld', HK = 'nt-rigs-hk';
const lbl = (x: number, y: number, t: string, anchor: 'start' | 'middle' | 'end' = 'start', cls = 'nt-lbl nt-lbl-s') =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

/** A J hook hanging from its eye at (x, y): shank down, bend to `dir` (1 right, -1 left), point up with its barb. */
function jhook(x: number, y: number, s: number, dir: 1 | -1): { p: Pt[]; barb: string } {
  const r = 4.5, top = y + r, L = 22 * s, R = 7 * s, yb = top + L, P = 10 * s;
  const p: Pt[] = [];
  for (let k = 0; k <= 8; k++) p.push({ x, y: top + (L * k) / 8, z: 0 });
  for (let k = 1; k <= 12; k++) {
    const t = Math.PI - (k / 12) * Math.PI;
    p.push({ x: x + dir * (R + R * Math.cos(t)), y: yb + R * Math.sin(t), z: 0 });
  }
  const px = x + dir * 2 * R;
  for (let k = 1; k <= 5; k++) p.push({ x: px - dir * 0.5 * k * 0.3, y: yb - (P * k) / 5, z: 0 });
  const tip = p[p.length - 1];
  const barb = `<path class="nt-rigs-hk" d="M${n1(tip.x)} ${n1(tip.y)} L${n1(tip.x - dir * 3.2 * s)} ${n1(tip.y + 5.5 * s)}"/>`;
  return { p, barb };
}

// ---------------------------------------------------------------- tackle pieces for the rig drawings

/** A barrel swivel standing upright, top eye at y. */
const swivel = (x: number, y: number) =>
  `<circle class="nt-rigs-sw" cx="${x}" cy="${y}" r="3.2"/><rect class="nt-rigs-swb" x="${x - 3.2}" y="${y + 3.6}" width="6.4" height="9"/><circle class="nt-rigs-sw" cx="${x}" cy="${y + 16.4}" r="3.2"/>`;
/** A J hook drawn as plain path: eye at (x, y). */
function hookPath(x: number, y: number, s: number, dir: 1 | -1, cls = HK): string {
  const h = jhook(x, y, s, dir);
  return `<circle class="${cls}" cx="${x}" cy="${y}" r="${n1(3.2 * s + 1)}"/><path class="${cls}" d="${dOf(h.p)}"/>${h.barb.replace(HK, cls)}`;
}
/** A shrimp hooked through the tail, facing left. */
const shrimp = (x: number, y: number) =>
  `<path class="nt-rigs-bt" d="M${x} ${y} c-6 -6 -18 -6 -24 2 c-4 6 -2 12 4 13 l4 -4 c-4 -1 -4 -5 0 -7 c6 -3 12 -1 16 4 z"/><path class="nt-rigs-bt-l" d="M${x - 24} ${y + 2} l-10 -8 M${x - 22} ${y} l-12 -2"/>`;
/** A small baitfish, head left. */
const baitfish = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path class="nt-rigs-bf" d="M0 0 C6 -7 20 -8 30 -3 L38 -8 L36 0 L38 8 L30 3 C20 8 6 7 0 0 Z"/><circle class="nt-rigs-dot" cx="6" cy="-1.5" r="1.4"/></g>`;
/** A strip of cut bait. */
const cutbait = (x: number, y: number) => `<path class="nt-rigs-bt" d="M${x} ${y} l14 -3 l2 5 l-14 4 z"/>`;

const seabed = (y: number, W = 320) => `<path class="nt-rigs-bed" d="M0 ${y} C40 ${y - 6} 70 ${y + 4} 110 ${y - 2} S190 ${y - 8} 230 ${y - 1} S300 ${y + 3} ${W} ${y - 3} V${y + 40} H0 Z"/>`;

// ---------------------------------------------------------------- rigs

/** Running-sinker bottom rig: main line, sliding egg sinker, bead, swivel, leader with the current, hook near the bottom. 320 by 300. */
function rigRun(lang: Lang): string {
  const B = 264; // where the rig lies on the bottom
  return (
    `<rect class="nt-sea" x="0" y="0" width="320" height="300"/>` + seabed(272) +
    // the current along the bottom
    `<path class="nt-rigs-cur" d="M200 186 H254 M212 166 H266"/><path class="nt-rigs-curh" d="M248 181 L254 186 L248 191 M260 161 L266 166 L260 171"/>` +
    lbl(312, 206, w(lang, 'CURRENT', 'CORRIENTE'), 'end') +
    // main line from the rod, just tight, down to the sinker resting on the bottom
    `<path class="${LN}" d="M24 60 C36 160 64 228 132 ${B - 2} L150 ${B}"/>` +
    `<ellipse class="nt-rigs-sk" cx="120" cy="${B - 4}" rx="14" ry="7.5" transform="rotate(12 120 ${B - 4})"/>` +
    `<path class="nt-rigs-thru" d="M108 ${B - 7} L132 ${B - 1}"/>` +
    `<circle class="nt-rigs-bead" cx="140" cy="${B - 1}" r="3.6"/>` +
    `<circle class="nt-rigs-sw" cx="${150}" cy="${B}" r="3.2"/><rect class="nt-rigs-swb" x="153.6" y="${B - 3.2}" width="9" height="6.4"/><circle class="nt-rigs-sw" cx="166.4" cy="${B}" r="3.2"/>` +
    `<path class="${LD}" d="M170 ${B} C190 ${B - 2} 214 ${B - 6} 236 ${B - 6}"/>` +
    shrimp(266, B - 2) + hookPath(250, B - 16, 0.8, 1) +
    lbl(46, 126, w(lang, 'MAIN LINE', 'LÍNEA PRINCIPAL')) +
    lbl(96, 212, w(lang, 'SINKER 14–60 g', 'PLOMO 14–60 g'), 'start') + lbl(96, 223, '1/2–2 oz', 'start') +
    lbl(138, 240, w(lang, 'BEAD', 'CUENTA'), 'start') + lbl(138, 251, w(lang, 'SWIVEL', 'DESTORCEDOR'), 'start') +
    lbl(236, 292, w(lang, 'LEADER 50–80 cm', 'LÍDER 50–80 cm'), 'middle', 'nt-lbl nt-lbl-s nt-rigs-onbed') +
    badge(1, 84, 208) + badge(2, 154, 286) + badge(3, 214, 244) + badge(4, 28, 170)
  );
}

/** Free-line live bait: loose main line, knot, leader, hooked live sardine swimming by a pier piling. No sinker, no float. 320 by 270. */
function rigFree(lang: Lang): string {
  const S = 74; // water surface
  return (
    `<rect class="nt-sea" x="0" y="${S}" width="320" height="${270 - S}"/>` +
    `<path class="nt-rigs-surf" d="M0 ${S} H320"/>` +
    // pier piling on the right
    `<rect class="nt-rigs-pile" x="270" y="8" width="20" height="262"/><path class="nt-rigs-deck" d="M246 8 H320"/>` +
    // the current edge
    `<path class="nt-rigs-cur" d="M104 214 H164 M120 236 H180"/><path class="nt-rigs-curh" d="M158 209 L164 214 L158 219 M174 231 L180 236 L174 241"/>` +
    // loose main line from the rod tip, a knot, then the leader to the bait
    `<path class="${LN}" d="M10 0 C40 70 120 40 156 ${S} S166 104 168 118"/>` +
    `<circle class="nt-rigs-knot" cx="168" cy="121" r="3.6"/>` +
    `<path class="${LD}" d="M168 124 C170 146 190 156 206 166"/>` +
    `<g class="nt-rigs-swim">${baitfish(200, 172, 1.25)}${hookPath(214, 160, 0.55, 1)}</g>` +
    // a close-up: hook in front of the dorsal fin, or through the lips
    `<rect class="nt-rigs-inset" x="10" y="${S + 10}" width="122" height="84"/>` +
    baitfish(28, S + 58, 2.2) +
    hookPath(64, S + 32, 0.6, 1) + hookPath(22, S + 44, 0.6, -1, 'nt-rigs-hk nt-rigs-dash') +
    lbl(18, S + 88, w(lang, 'BACK OR LIPS', 'LOMO O LABIOS')) +
    lbl(176, 116, w(lang, 'KNOT', 'NUDO')) + lbl(104, 256, w(lang, 'CURRENT', 'CORRIENTE')) +
    lbl(212, 196, w(lang, 'LEADER 60–100 cm', 'LÍDER 60–100 cm'), 'middle') +
    lbl(150, 20, w(lang, 'NO SINKER · NO FLOAT', 'SIN PLOMO · SIN FLOTADOR'), 'middle') +
    lbl(60, 48, w(lang, 'LOOSE', 'FLOJA'), 'start') +
    badge(1, 154, 112) + badge(2, 92, S + 22) + badge(3, 252, 120) + badge(4, 36, 30)
  );
}

/** Two-hook paternoster: dropper loops 60 cm apart and 30 cm above the swivel, sinker on 10 cm below it. 320 by 300. */
function rigPat(lang: Lang): string {
  const X = 132, L2 = 64, L1 = 154, SW = 199, BED = 290;
  const arm = (y: number) =>
    `<path class="${LN}" d="M${X} ${y - 4} C${X + 14} ${y - 10} ${X + 18} ${y + 4} ${X} ${y + 4}"/>` +
    `<path class="${LD}" d="M${X + 16} ${y} C${X + 30} ${y + 8} ${X + 40} ${y + 22} ${X + 46} ${y + 30}"/>` +
    cutbait(X + 52, y + 46) + hookPath(X + 48, y + 30, 0.7, 1);
  const sk = SW + 37; // sinker top
  return (
    `<rect class="nt-sea" x="0" y="0" width="320" height="300"/>` + seabed(BED) +
    `<path class="nt-rigs-rock" d="M224 294 l14 -22 l18 6 l12 -16 l24 32 Z M14 294 l10 -12 l16 4 l8 8 Z"/>` +
    `<path class="${LN}" d="M${X} 0 V${SW}"/>` + arm(L2) + arm(L1) + swivel(X, SW + 3) +
    `<path class="${LN}" d="M${X} ${SW + 22} V${sk + 2}"/>` +
    `<path class="nt-rigs-sk" d="M${X} ${sk} c-6 6 -9 16 -6 22 c2 3 10 3 12 0 c3 -6 0 -16 -6 -22 z"/>` +
    // distances on the left
    `<path class="nt-rigs-dim" d="M66 ${L2} H74 M66 ${L1} H74 M70 ${L2} V${L1} M66 ${SW + 3} H74 M70 ${L1} V${SW + 3} M66 ${SW + 22} H74 M66 ${sk} H74 M70 ${SW + 22} V${sk}"/>` +
    lbl(62, (L2 + L1) / 2 + 3, '60 cm', 'end') + lbl(62, (L1 + SW) / 2 + 5, '30 cm', 'end') + lbl(62, SW + 33, '10 cm', 'end') +
    `<path class="nt-rigs-dim" d="M66 ${sk + 24} H74 M66 ${BED - 4} H74 M70 ${sk + 24} V${BED - 4}"/>` + lbl(62, sk + 42, w(lang, '1 SPAN', '1 PALMO'), 'end') +
    lbl(X + 24, L2 - 12, w(lang, 'DROPPER LOOP', 'LAZO DE BAJADA')) +
    lbl(X + 62, L2 + 26, w(lang, 'ARM 20–30 cm', 'BRAZO 20–30 cm')) + lbl(X + 62, L2 + 37, w(lang, 'HOOK 1/0–2/0', 'ANZUELO 1/0–2/0')) +
    lbl(X + 12, SW + 15, w(lang, 'SWIVEL', 'DESTORCEDOR'), 'start', 'nt-lbl nt-lbl-s nt-rigs-onsea') +
    lbl(X + 14, sk + 14, w(lang, 'SINKER 30–90 g', 'PLOMO 30–90 g')) + lbl(X + 14, sk + 25, '1–3 oz') +
    badge(1, X - 20, SW + 12) + badge(2, X - 20, L2) + badge(3, X + 80, L1 + 40) + badge(4, 96, sk + 34)
  );
}

// ---------------------------------------------------------------- outfits (card drawings, 300 by 140)

function handline(lang: Lang): string {
  return (
    `<circle class="nt-rigs-spool" cx="64" cy="66" r="40"/><circle class="nt-rigs-wound" cx="64" cy="66" r="24"/><circle class="nt-rigs-hub" cx="64" cy="66" r="12"/>` +
    `<path class="${LN}" d="M88 46 C140 36 170 48 196 56"/>` +
    `<circle class="nt-rigs-knot" cx="198" cy="57" r="3"/>` +
    `<path class="${LD}" d="M200 58 C220 64 234 70 246 78"/>` +
    `<ellipse class="nt-rigs-sk nt-rigs-opt" cx="224" cy="66" rx="5" ry="8" transform="rotate(-62 224 66)"/>` +
    hookPath(250, 80, 0.9, 1) +
    lbl(64, 128, w(lang, '30–50 m', '30–50 m'), 'middle') +
    lbl(142, 30, '20–40 lb · 9–18 kg', 'middle') +
    lbl(296, 128, w(lang, 'SINKER IF NEEDED', 'PLOMO SI HACE FALTA'), 'end')
  );
}

function spinning(lang: Lang): string {
  // rod from the butt (bottom left) to the tip (top right), guides along it, the reel hanging under the handle
  const ax = 16, ay = 104, bx = 292, by = 14;
  const at = (t: number) => [ax + (bx - ax) * t, ay + (by - ay) * t] as const;
  const [rx, ry] = at(0.2);
  const lx = rx + 26, ly = ry + 22; // where the line leaves the spool
  const guides = [0.4, 0.56, 0.7, 0.82, 0.92].map((t, i) => {
    const [x, y] = at(t), u = (x - lx) / (bx - lx), gy = ly + (by - ly) * u, r = 5 - i * 0.7;
    return `<path class="nt-rigs-guide" d="M${n1(x)} ${n1(y)} L${n1(x)} ${n1(gy - r)}"/><circle class="nt-rigs-guide" cx="${n1(x)}" cy="${n1(gy)}" r="${n1(r)}"/>`;
  }).join('');
  return (
    `<path class="nt-rigs-rod" d="M${ax} ${ay} L${bx} ${by}"/><path class="nt-rigs-grip" d="M${ax} ${ay} L${n1(at(0.13)[0])} ${n1(at(0.13)[1])}"/>` + guides +
    // the reel: foot on the rod, body, the fixed spool facing up the rod, the bail
    `<path class="nt-rigs-reel" d="M${n1(rx)} ${n1(ry + 2)} L${n1(rx + 2)} ${n1(ry + 16)}"/>` +
    `<rect class="nt-rigs-reelb" x="${n1(rx - 10)}" y="${n1(ry + 16)}" width="22" height="16"/>` +
    `<rect class="nt-rigs-spoolr" x="${n1(rx + 12)}" y="${n1(ry + 17)}" width="12" height="14"/>` +
    `<path class="nt-rigs-reel" d="M${n1(rx + 24)} ${n1(ry + 15)} C${n1(rx + 34)} ${n1(ry + 18)} ${n1(rx + 34)} ${n1(ry + 30)} ${n1(rx + 24)} ${n1(ry + 33)}"/>` +
    `<path class="nt-rigs-reel" d="M${n1(rx - 10)} ${n1(ry + 24)} h-10 v8"/>` +
    // line from the spool up the guides to the tip, then hanging
    `<path class="${LN}" d="M${n1(rx + 26)} ${n1(ry + 22)} L${bx} ${by} L292 104"/>` +
    hookPath(292, 108, 0.8, -1) +
    lbl(120, 40, w(lang, 'ROD 2–2.4 m · 7–8 ft', 'CAÑA 2–2,4 m · 7–8 pies'), 'middle') +
    lbl(4, 134, w(lang, 'SPINNING REEL', 'CARRETE SPINNING'), 'start')
  );
}

// ---------------------------------------------------------------- charts

/** Main line and leader strength per fish, on one pound scale. 320 by 248. */
function lines(lang: Lang): string {
  const x = (lb: number) => 104 + lb * 3.4, top = 40, rh = 32;
  const rows: { n: string; m?: [number, number]; l?: [number, number]; note?: string }[] = [
    { n: w(lang, 'HAND LINE', 'CORDEL'), m: [20, 40] },
    { n: w(lang, 'SNAPPER', 'PARGO'), m: [10, 20], l: [20, 30] },
    { n: w(lang, 'GROUPER', 'MERO'), m: [10, 20] },
    { n: w(lang, 'SNOOK', 'RÓBALO'), m: [20, 30], l: [40, 60] },
    { n: w(lang, 'MACKEREL', 'MACARELA'), m: [20, 30], note: w(lang, 'WIRE LEADER', 'LÍDER DE CABLE') },
    { n: w(lang, 'JACK', 'JUREL'), m: [30, 50], note: w(lang, 'BRAID', 'TRENZADO') },
  ];
  const grid = [0, 10, 20, 30, 40, 50, 60].map((v) => `<path class="nt-rigs-grid" d="M${x(v)} ${top - 6} V${top + rows.length * rh}"/>${lbl(x(v), top + rows.length * rh + 14, String(v), 'middle')}`).join('');
  const body = rows
    .map((r, i) => {
      const y = top + i * rh;
      let s = lbl(96, y + 15, r.n, 'end', 'nt-lbl');
      if (r.m) s += `<rect class="nt-rigs-bar" x="${x(r.m[0])}" y="${y + 6}" width="${x(r.m[1]) - x(r.m[0])}" height="9"/>`;
      if (r.l) s += `<rect class="nt-rigs-barl" x="${x(r.l[0])}" y="${y + 18}" width="${x(r.l[1]) - x(r.l[0])}" height="8"/>`;
      if (r.note) s += lbl(r.m ? x(r.m[1]) + 6 : x(0), y + 15, r.note, 'start');
      return s;
    })
    .join('');
  return (
    grid + body + lbl(x(60), top + rows.length * rh + 28, 'lb', 'end') +
    `<rect class="nt-rigs-bar" x="104" y="8" width="20" height="9"/>` + lbl(130, 16, w(lang, 'MAIN LINE', 'LÍNEA')) +
    `<rect class="nt-rigs-barl" x="208" y="9" width="20" height="8"/>` + lbl(234, 16, w(lang, 'LEADER', 'LÍDER')) +
    badge(1, 92, 12) + badge(2, 196, 12) + badge(3, 14, top + 4 * rh + 11) + badge(4, 14, top + 5 * rh + 11)
  );
}

/** Hook sizes 1/0 to 6/0, growing left to right, with the fish each range suits; a circle hook next to a J hook. 320 by 230. */
function hooks(lang: Lang): string {
  const sizes = ['1/0', '2/0', '3/0', '4/0', '5/0', '6/0'];
  const cx = (i: number) => 30 + i * 46;
  const hs = sizes.map((s, i) => {
    const k = 0.62 + i * 0.13, x = cx(i) - 6 * k;
    return hookPath(x, 14, k, 1) + lbl(cx(i), 92, s, 'middle', 'nt-lbl');
  }).join('');
  const span = (a: number, b: number, y: number, t: string) =>
    `<path class="nt-rigs-span" d="M${cx(a) - 14} ${y} H${cx(b) + 14}"/><path class="nt-rigs-dim" d="M${cx(a) - 14} ${y - 4} v8 M${cx(b) + 14} ${y - 4} v8"/>` +
    lbl(cx(a) - 14, y - 7, t, 'start');
  // a circle hook: the point turned back in toward the shank
  const circ =
    `<circle class="${HK}" cx="214" cy="200" r="4"/><path class="${HK}" d="M214 204 V216 C214 234 236 236 244 224 C250 214 246 204 236 206 L232 210"/>`;
  return (
    hs +
    `<path class="nt-rigs-dim" d="M14 102 H300 M292 98 L300 102 L292 106"/>` +
    span(0, 1, 128, w(lang, 'SNAPPER · MACKEREL', 'PARGO · MACARELA')) +
    span(1, 3, 152, w(lang, 'GROUPER, CIRCLE', 'MERO, CIRCULAR')) +
    span(3, 5, 176, w(lang, 'SNOOK · JACK', 'RÓBALO · JUREL')) +
    hookPath(186, 200, 0.75, 1) + circ +
    lbl(190, 252, 'J', 'middle') + lbl(232, 252, w(lang, 'CIRCLE', 'CIRCULAR'), 'middle') +
    badge(1, 304, 84) + badge(2, 266, 214)
  );
}

// ---------------------------------------------------------------- cast net

/** Throwing a cast net: held ready, opening into a flat circle, sinking, closed by the hand line. 320 by 180. */
function castnet(lang: Lang): string {
  const S = 96;
  const weights = (cx: number, cy: number, rx: number, ry: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * 2 * Math.PI;
      return `<circle class="nt-rigs-dot" cx="${n1(cx + rx * Math.cos(t))}" cy="${n1(cy + ry * Math.sin(t))}" r="2.2"/>`;
    }).join('');
  return (
    `<rect class="nt-sea" x="104" y="${S}" width="216" height="${180 - S}"/><path class="nt-rigs-surf" d="M104 ${S} H320"/>` +
    `<path class="nt-rigs-bank" d="M0 ${S} H104 L118 180 H0 Z"/>` +
    // 1: the thrower, the hand line round the wrist, the lead line in one hand, part of the net over the arm
    `<g class="nt-man"><circle cx="40" cy="22" r="7"/><path d="M40 30 V62 M40 62 L30 ${S} M40 62 L52 ${S} M40 38 L58 50 M40 38 L24 52"/></g>` +
    `<path class="nt-rigs-net" d="M58 50 C70 58 72 80 62 88 C52 80 50 62 58 50 Z M24 52 C14 62 16 80 26 84"/>` +
    `<path class="nt-rigs-mesh" d="M60 58 L66 80 M56 62 L64 86"/>` +
    // 2: in the air, opening into a circle, landing flat
    `<path class="nt-rigs-ar" d="M66 40 C100 10 150 10 176 42"/><path class="nt-rigs-arh" d="M168 40 L176 42 L176 34"/>` +
    `<ellipse class="nt-rigs-netc" cx="180" cy="72" rx="40" ry="11"/>` + weights(180, 72, 40, 11, 14) +
    `<path class="nt-rigs-mesh" d="M140 72 H220 M150 66 L210 78 M150 78 L210 66 M180 61 V83"/>` +
    // 3 and 4: sunk to the bottom, then the hand line pulls the weighted rim closed
    seabed(170) +
    `<path class="nt-rigs-netc" d="M256 ${S - 30} V${S + 30} M256 ${S + 30} C236 ${S + 36} 230 ${S + 60} 230 ${S + 70} M256 ${S + 30} C276 ${S + 36} 282 ${S + 60} 282 ${S + 70}"/>` +
    weights(256, S + 70, 26, 3, 9) +
    `<path class="nt-rigs-ar" d="M296 ${S + 10} V${S - 26}"/><path class="nt-rigs-arh" d="M291 ${S - 19} L296 ${S - 26} L301 ${S - 19}"/>` +
    lbl(180, 104, w(lang, 'FLAT CIRCLE', 'CÍRCULO PLANO'), 'middle', 'nt-lbl nt-lbl-s nt-rigs-onsea') +
    badge(1, 14, 80) + badge(2, 132, 34) + badge(3, 212, 150) + badge(4, 304, 52)
  );
}

// ---------------------------------------------------------------- bait for each fish

type PictKey = keyof typeof RIGS_PICTS;
/** One of this tab's pictograms drawn inside a figure, its 24 px box scaled by k with its top left at (x, y). */
function pic(id: PictKey, x: number, y: number, k: number, cls = 'nt-rigs-pic'): string {
  const p: { d: string; dots?: readonly (readonly [number, number, number])[] } = RIGS_PICTS[id];
  const dots = (p.dots ?? []).map(([cx, cy, r]) => `<circle class="nt-rigs-picd" cx="${cx}" cy="${cy}" r="${r}"/>`).join('');
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${k})"><path d="${p.d}"/>${dots}</g>`;
}

/** Which bait each fish takes (filled dot), and its hook size. 320 by 252. */
function baitMatrix(lang: Lang): string {
  const cols: { id: PictKey; t: string }[] = [
    { id: 'rgshrimp', t: w(lang, 'SHRIMP', 'CAMARÓN') },
    { id: 'rgsardine', t: w(lang, 'FISH', 'PEZ') },
    { id: 'rgcut', t: w(lang, 'CUT', 'TIRA') },
    { id: 'rgcrab', t: w(lang, 'CRAB', 'JAIBA') },
  ];
  const cx = (i: number) => 134 + i * 36, HX = 290, top = 58, rh = 38;
  const rows: { id: PictKey; n: string; b: number[]; hook: string }[] = [
    { id: 'rgsnapper', n: w(lang, 'SNAPPER', 'PARGO'), b: [1, 1, 1, 1], hook: '1/0–2/0' },
    { id: 'rgjack', n: w(lang, 'JACK', 'JUREL'), b: [0, 1, 1, 0], hook: '4/0–6/0' },
    { id: 'rgsnook', n: w(lang, 'SNOOK', 'RÓBALO'), b: [1, 1, 0, 0], hook: '4/0–6/0' },
    { id: 'rgmackerel', n: w(lang, 'MACKEREL', 'MACARELA'), b: [0, 1, 1, 0], hook: '1/0–2/0' },
    { id: 'rggrouper', n: w(lang, 'GROUPER', 'MERO'), b: [0, 1, 1, 1], hook: '2/0–4/0' },
  ];
  const head =
    cols.map((c, i) => pic(c.id, cx(i) - 13, 4, 1.1) + lbl(cx(i), 44, c.t, 'middle')).join('') +
    `<circle class="nt-rigs-hk" cx="${HX - 4}" cy="9" r="3"/><path class="nt-rigs-hk" d="M${HX - 4} 12 V26 C${HX - 4} 34 ${HX + 8} 34 ${HX + 8} 26 V20"/>` +
    lbl(HX, 44, w(lang, 'HOOK', 'ANZUELO'), 'middle');
  const body = rows
    .map((r, j) => {
      const y = top + j * rh, mid = y + rh / 2;
      return (
        `<path class="nt-rigs-grid" d="M0 ${y} H320"/>` +
        pic(r.id, 2, mid - 15, 1.25) + lbl(34, mid + 4, r.n, 'start', 'nt-lbl') +
        r.b.map((v, i) => (v ? `<circle class="nt-rigs-yes" cx="${cx(i)}" cy="${mid}" r="7"/>` : `<circle class="nt-rigs-no0" cx="${cx(i)}" cy="${mid}" r="3"/>`)).join('') +
        lbl(HX, mid + 4, r.hook, 'middle', 'nt-lbl') + badge(j + 1, 106, mid)
      );
    })
    .join('');
  return head + body;
}

// ---------------------------------------------------------------- lionfish

/** A lionfish from the side: the venomous spines (dorsal, pelvic, anal) in the danger colour. 320 by 190. */
function lionfish(lang: Lang): string {
  const dorsal = Array.from({ length: 13 }, (_, i) => {
    const x = 104 + i * 9.5, base = 70 - Math.sin((i / 12) * Math.PI) * 6, len = 46 - Math.abs(i - 3) * 2.6;
    return `M${n1(x)} ${n1(base)} L${n1(x - 6 + i * 0.6)} ${n1(base - len)}`;
  }).join(' ');
  return (
    // fan-like pectoral fins (not venomous) behind the head
    `<path class="nt-rigs-fin" d="M112 112 C130 140 150 170 176 182 M112 112 C140 136 172 150 200 158 M112 112 C146 126 180 130 210 128 M112 112 C122 146 128 168 140 186"/>` +
    // body, head left
    `<path class="nt-rigs-lion" d="M40 104 C52 80 86 68 130 70 C180 72 220 84 240 100 C220 116 180 128 130 128 C86 128 52 122 40 104 Z"/>` +
    `<path class="nt-rigs-stripe" d="M76 80 C70 96 72 112 78 124 M100 74 C94 94 96 112 100 128 M128 70 C122 92 124 112 128 128 M156 72 C150 92 152 112 156 126 M184 76 C178 94 180 110 184 122 M210 84 C206 96 206 106 210 114"/>` +
    `<circle class="nt-rigs-dot" cx="58" cy="96" r="3.2"/><path class="nt-rigs-fin" d="M40 104 L50 108"/>` +
    // tail fin and soft rear dorsal and anal rays
    `<path class="nt-rigs-fin" d="M240 100 C262 82 284 84 296 100 C284 116 262 118 240 100 Z M226 90 L246 74 M226 114 L248 126"/>` +
    // venomous spines
    `<path class="nt-rigs-spine" d="${dorsal}"/>` +
    `<path class="nt-rigs-spine" d="M100 126 L94 158 M106 126 L104 160"/>` +
    `<path class="nt-rigs-spine" d="M196 122 L206 150 M204 120 L216 146 M212 118 L226 140"/>` +
    lbl(316, 182, w(lang, 'VENOMOUS SPINES', 'ESPINAS VENENOSAS'), 'end', 'nt-lbl nt-lbl-s nt-rigs-dz') +
    badge(1, 92, 30) + badge(2, 86, 166) + badge(3, 236, 154)
  );
}

// ---------------------------------------------------------------- release drawings

/** A fish on its side, head left, in a 100 by 40 box, placed at (x, y) and scaled by s; `flip` turns it head right. */
function fish(x: number, y: number, s: number, flip = false, extra = ''): string {
  const t = flip ? `translate(${x + 100 * s} ${y}) scale(${-s} ${s})` : `translate(${x} ${y}) scale(${s})`;
  return (
    `<g class="nt-rigs-fish" transform="${t}">` +
    '<path class="nt-rigs-fb" d="M2 20 C12 6 40 2 64 8 C76 11 84 15 90 14 L100 3 L97 20 L100 37 L90 26 C84 25 76 29 64 32 C40 38 12 34 2 20 Z"/>' +
    '<path d="M38 5 C44 -2 54 -2 62 7"/><path d="M22 9 C18 16 18 25 22 31"/><path d="M2 20 H10"/>' +
    '<circle class="nt-rigs-dot" cx="12" cy="16" r="2.4"/>' + extra +
    '</g>'
  );
}
/** An open hand from below, palm up (a cupped support). */
const palm = (x: number, y: number) =>
  `<path class="nt-rigs-hand" d="M${x - 14} ${y + 34} V${y + 4} a3.5 3.5 0 0 1 7 0 a3.5 3.5 0 0 1 7 0 a3.5 3.5 0 0 1 7 0 a3.5 3.5 0 0 1 7 0 V${y + 34}"/><path class="nt-rigs-handl" d="M${x - 7} ${y + 4} v8 M${x} ${y + 4} v8 M${x + 7} ${y + 4} v8"/>`;
/** Pliers, jaws pointing to (x, y), handles going down right. */
const pliers = (x: number, y: number, a = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${a})"><path class="nt-rigs-jaw" d="M0 0 L20 -4 L20 4 Z"/><path class="nt-rigs-tool" d="M20 -3 C30 -6 40 -12 58 -16 M20 3 C30 6 40 12 58 16"/><circle class="nt-rigs-tooln" cx="21" cy="0" r="3.4"/><path class="nt-rigs-grip2" d="M38 -10 C46 -13 52 -15 60 -16 M38 10 C46 13 52 15 60 16"/></g>`;
/** Scissors, blades open at (x, y). */
const scissors = (x: number, y: number) =>
  `<g transform="translate(${x} ${y})"><path class="nt-rigs-tool" d="M22 -6 L0 3 M22 6 L0 -3"/><circle class="nt-rigs-ring" cx="-6" cy="6" r="5"/><circle class="nt-rigs-ring" cx="-6" cy="-6" r="5"/></g>`;
const drop = (x: number, y: number, s = 1) => `<path class="nt-rigs-drop" d="M${x} ${y} c${-4 * s} ${6 * s} ${-5 * s} ${9 * s} 0 ${11 * s} c${5 * s} ${-2 * s} ${4 * s} ${-5 * s} 0 ${-11 * s} z"/>`;
const stopX = (x: number, y: number, r = 10) => `<path class="nt-rigs-no" d="M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}"/>`;

/** Ready before you land it: pliers, a wet cloth, a net without knots. 280 by 120. */
function rlReady(lang: Lang): string {
  return (
    pliers(14, 54, 0) +
    `<path class="nt-rigs-cloth" d="M100 40 C112 34 124 46 136 40 C148 34 160 46 172 40 V86 C160 92 148 80 136 86 C124 92 112 80 100 86 Z"/>` + drop(128, 92, 0.9) + drop(146, 96, 0.8) +
    `<ellipse class="nt-rigs-hoop" cx="232" cy="40" rx="30" ry="12"/><path class="nt-rigs-netb" d="M202 40 C206 74 222 88 232 90 C242 88 258 74 262 40"/><path class="nt-rigs-tool" d="M262 40 L276 8"/>` +
    lbl(46, 108, w(lang, 'PLIERS', 'ALICATE'), 'middle') + lbl(136, 112, w(lang, 'WET CLOTH', 'PAÑO MOJADO'), 'middle') + lbl(232, 108, w(lang, 'NO KNOTS', 'SIN NUDOS'), 'middle')
  );
}

/** Wet hands: hands under falling water. 280 by 120. */
function rlWet(lang: Lang): string {
  const hand = (x: number, flip: boolean) =>
    `<g transform="translate(${x} 40) scale(${flip ? -3 : 3} 3)"><path class="nt-rigs-handp" d="M8 13V6a1.4 1.4 0 0 1 2.8 0v5M10.8 10.5V4.6a1.4 1.4 0 0 1 2.8 0v5.9M13.6 10.5V5.6a1.4 1.4 0 0 1 2.8 0v7.4c0 4.5-2.6 7.5-5.8 7.5-2.5 0-4-1.4-5.6-4.2L3.8 13.6a1.4 1.4 0 0 1 2.4-1.4L8 14"/></g>`;
  return (
    hand(66, false) + hand(214, true) +
    [[110, 14], [126, 30], [140, 10], [156, 26], [170, 12], [118, 50], [162, 48]].map(([x, y]) => drop(x, y, 1.1)).join('') +
    `<path class="nt-rigs-ok" d="M126 92 l8 8 l16 -18"/>` + lbl(140, 116, w(lang, 'WET HANDS', 'MANOS MOJADAS'), 'middle')
  );
}

/** Support the body along its length with both hands; under a minute in the air. 280 by 120. */
function rlHold(lang: Lang): string {
  return (
    fish(30, 30, 1.9, false) + palm(80, 84) + palm(170, 82) +
    `<circle class="nt-rigs-clock" cx="252" cy="26" r="16"/><path class="nt-rigs-tool" d="M252 26 V16 M252 26 L260 30"/>` +
    lbl(252, 58, '< 60 s', 'middle', 'nt-lbl') +
    `<path class="nt-rigs-no" d="M38 26 l12 12 M50 26 l-12 12"/>` + lbl(44, 18, w(lang, 'EYES · GILLS', 'OJOS · AGALLAS'), 'start')
  );
}

/** Hook out with pliers; a circle hook in the corner of the mouth, barb pressed flat. 280 by 120. */
function rlHook(lang: Lang): string {
  return (
    fish(40, 26, 1.7, false) +
    `<path class="${HK}" d="M48 60 C40 68 30 66 30 58 C30 50 38 48 44 52"/><circle class="${HK}" cx="48" cy="62" r="3"/>` +
    pliers(48, 64, 35) +
    `<path class="nt-rigs-ar" d="M24 48 C10 50 6 64 16 74"/><path class="nt-rigs-arh" d="M9 70 L16 74 L17 66"/>` +
    lbl(270, 112, w(lang, 'BARB FLAT', 'SIN LENGÜETA'), 'end')
  );
}

/** Swallowed hook: cut the line close to the mouth. 280 by 120. */
function rlCut(lang: Lang): string {
  return (
    fish(90, 26, 1.7, false) +
    `<path class="nt-rigs-hid" d="M94 60 C110 60 124 60 136 62 C142 64 142 72 136 72"/>` +
    `<path class="${LN}" d="M94 60 C70 60 50 50 34 30 L20 0"/>` +
    scissors(54, 60) + `<path class="nt-rigs-cut" d="M74 52 l6 -6 M78 58 l9 -1"/>` +
    lbl(270, 112, w(lang, 'CUT CLOSE', 'CORTE CERCA'), 'end') + lbl(140, 112, w(lang, 'HOOK INSIDE', 'ANZUELO ADENTRO'), 'middle')
  );
}

/** Reviving: upright, head into the current, water over the gills. 280 by 120. */
function rlRevive(lang: Lang): string {
  return (
    `<rect class="nt-sea" x="0" y="0" width="280" height="120"/>` +
    `<path class="nt-rigs-curw" d="M4 30 H56 M4 56 H52 M4 82 H56 M80 16 H250 M230 96 H274"/>` +
    `<path class="nt-rigs-curh" d="M50 25 L56 30 L50 35 M50 77 L56 82 L50 87 M244 11 L250 16 L244 21 M268 91 L274 96 L268 101"/>` +
    fish(64, 34, 1.8, false) + palm(150, 92) +
    lbl(10, 112, w(lang, 'CURRENT', 'CORRIENTE'), 'start', 'nt-lbl nt-lbl-s nt-rigs-onsea')
  );
}

/** It kicks and swims off on its own. 280 by 120. */
function rlGo(lang: Lang): string {
  return (
    `<rect class="nt-sea" x="0" y="0" width="280" height="120"/>` +
    `<g class="nt-rigs-away">${fish(40, 36, 1.4, false)}<path class="nt-rigs-kick" d="M196 40 l12 -8 M200 60 h14 M196 80 l12 8"/></g>` +
    `<path class="nt-rigs-ar" d="M36 106 H6"/><path class="nt-rigs-arh" d="M12 101 L6 106 L12 111"/>` +
    lbl(270, 112, w(lang, 'ON ITS OWN', 'POR SÍ MISMO'), 'end', 'nt-lbl nt-lbl-s nt-rigs-onsea')
  );
}

/** A sea turtle in the water, the line cut near the hook, never lifted. 280 by 120. */
function rlTurtle(lang: Lang): string {
  return (
    `<rect class="nt-sea" x="0" y="0" width="280" height="120"/>` +
    `<path class="nt-rigs-shell" d="M90 60 C90 36 112 24 136 24 C164 24 186 38 186 60 C186 82 164 96 136 96 C112 96 90 84 90 60 Z"/>` +
    `<path class="nt-rigs-scute" d="M112 46 L136 38 L160 46 L160 74 L136 82 L112 74 Z M136 38 V24 M136 82 V96 M112 46 L96 40 M160 46 L176 40 M112 74 L96 80 M160 74 L176 80"/>` +
    `<path class="nt-rigs-flip" d="M106 34 C92 18 72 12 62 16 C72 26 86 34 98 40 M106 86 C92 102 72 108 62 104 C72 94 86 86 98 80 M178 40 C190 32 200 32 204 36 M178 80 C190 88 200 88 204 84"/>` +
    `<path class="nt-rigs-head" d="M90 60 C82 52 66 52 60 60 C66 68 82 68 90 60 Z"/>` +
    `<path class="${LN}" d="M62 60 C40 60 30 50 22 30 L14 0"/>` + scissors(14, 54) +
    `<path class="nt-rigs-no" d="M236 70 V30 M228 38 L236 30 L244 38"/>` + stopX(236, 50, 16) +
    lbl(236, 92, w(lang, 'NOT BY THE LINE', 'NO POR LA LÍNEA'), 'middle', 'nt-lbl nt-lbl-s nt-rigs-onsea')
  );
}

/** A stingray from above: the venomous spine on the tail. 280 by 120. */
function rlRay(lang: Lang): string {
  return (
    `<rect class="nt-sea" x="0" y="0" width="280" height="120"/>` +
    `<path class="nt-rigs-shell" d="M60 60 C70 30 104 18 120 20 C136 18 170 30 180 60 C170 86 136 96 120 96 C104 96 70 86 60 60 Z"/>` +
    `<circle class="nt-rigs-dot" cx="112" cy="40" r="2.4"/><circle class="nt-rigs-dot" cx="128" cy="40" r="2.4"/>` +
    `<path class="nt-rigs-tail" d="M180 60 C206 60 228 62 270 70"/><path class="nt-rigs-spine" d="M204 61 L222 54"/>` +
    lbl(222, 44, w(lang, 'SPINE', 'ESPINA'), 'middle', 'nt-lbl nt-lbl-s nt-rigs-dz') +
    `<path class="${LN}" d="M70 60 C40 60 30 40 24 0"/>` + scissors(14, 36) +
    lbl(120, 112, w(lang, 'DO NOT LIFT · CUT THE LINE', 'NO LEVANTE · CORTE LA LÍNEA'), 'middle', 'nt-lbl nt-lbl-s nt-rigs-onsea')
  );
}

/** Barotrauma: a fish pulled up fast from below about 10 m swells at the surface; a descender sends it back down. 320 by 290. */
function baro(lang: Lang): string {
  const S = 40, y10 = 150;
  const swollen =
    `<g transform="translate(100 ${S - 4})">` +
    '<path class="nt-rigs-fb" d="M2 20 C10 0 40 -12 64 0 C80 6 86 14 90 14 L100 3 L97 20 L100 37 L90 26 C84 30 76 42 60 46 C36 52 10 38 2 20 Z"/>' +
    '<circle class="nt-rigs-eyeb" cx="13" cy="14" r="5.5"/><circle class="nt-rigs-dot" cx="14" cy="14" r="2.2"/>' +
    '<path class="nt-rigs-bt" d="M2 20 C-8 14 -14 22 -8 30 C-4 34 2 30 2 24 Z"/>' +
    '<path class="nt-rigs-scale" d="M40 8 l4 -5 M52 6 l4 -5 M64 6 l4 -5 M46 44 l4 4 M58 42 l4 4"/>' +
    '</g>';
  return (
    `<path class="nt-rigs-sky" d="M0 0 H320 V${S} H0 Z"/>` +
    `<rect class="nt-sea" x="0" y="${S}" width="320" height="${290 - S}"/>` + seabed(278) +
    `<path class="nt-rigs-surf" d="M0 ${S} H320"/>` +
    `<path class="nt-rigs-dim" d="M0 ${y10} H320"/>` + lbl(150, y10 - 6, '10 m · 30 ft', 'middle', 'nt-lbl nt-lbl-s nt-rigs-onsea') +
    // the catch: deep and normal, hauled up fast
    fish(36, 222, 0.8, false) +
    `<path class="nt-rigs-ar" d="M60 214 V${S + 30}"/><path class="nt-rigs-arh" d="M55 ${S + 37} L60 ${S + 30} L65 ${S + 37}"/>` +
    lbl(70, 208, w(lang, 'FAST', 'RÁPIDO'), 'start', 'nt-lbl nt-lbl-s nt-rigs-onsea') +
    swollen +
    // the descender: a weight clipped to the lip, taking it back down
    `<g class="nt-rigs-down">${fish(212, 200, 0.8, true)}<path class="${LN}" d="M292 0 V214"/><path class="nt-rigs-clip" d="M292 214 l-6 6 M292 214 l6 6"/><path class="nt-rigs-sk" d="M286 222 h12 l-2 14 h-8 z"/></g>` +
    `<path class="nt-rigs-ar" d="M250 70 V180"/><path class="nt-rigs-arh" d="M245 173 L250 180 L255 173"/>` +
    lbl(244, 120, w(lang, 'BACK DOWN', 'DE VUELTA'), 'end', 'nt-lbl nt-lbl-s nt-rigs-onsea') +
    badge(1, 30, 230) + badge(2, 86, 22) + badge(3, 214, 30) + badge(4, 272, 96)
  );
}

/** The three kinds of descender: weighted lip clamp, inverted hook, fish elevator (a weighted crate). 320 by 150. */
function descenders(lang: Lang): string {
  const col = (x: number, s: string) => `<g transform="translate(${x} 0)">${s}</g>`;
  const clamp =
    `<path class="${LN}" d="M30 0 V44"/><path class="nt-rigs-clip" d="M30 44 l-5 8 M30 44 l5 8"/>` +
    fish(30, 40, 0.62, false) + `<path class="${LN}" d="M30 58 V70"/><path class="nt-rigs-sk" d="M23 70 h14 l-3 16 h-8 z"/>`;
  const inv =
    `<path class="${LN}" d="M30 0 V58"/><path class="nt-rigs-sk" d="M23 58 h14 l-3 18 h-8 z"/>` +
    `<path class="${HK}" d="M30 76 V88 C30 96 20 96 20 88 V80"/><path class="${HK}" d="M20 80 l-3 5"/>` +
    fish(22, 64, 0.62, false);
  const crate =
    `<path class="${LN}" d="M50 0 V30"/><path class="nt-rigs-crate" d="M22 30 H78 V96 M22 30 V96 M22 52 H78 M22 74 H78 M40 30 V96 M60 30 V96"/>` +
    `<path class="nt-rigs-sk" d="M44 22 h12 v8 h-12 z"/>` + fish(30, 66, 0.4, false) +
    `<path class="nt-rigs-ar" d="M50 104 V120"/><path class="nt-rigs-arh" d="M45 114 L50 120 L55 114"/>`;
  return (
    col(4, clamp) + col(110, inv) + col(216, crate) +
    lbl(54, 142, w(lang, 'LIP CLAMP', 'PINZA'), 'middle') + lbl(160, 142, w(lang, 'INVERTED HOOK', 'ANZUELO INVERTIDO'), 'middle') + lbl(266, 142, w(lang, 'FISH ELEVATOR', 'ELEVADOR'), 'middle') +
    badge(1, 16, 14) + badge(2, 122, 14) + badge(3, 228, 14)
  );
}

export const RIGS_FIGS = {
  rghand: { vb: '0 0 300 140', art: handline },
  rgspin: { vb: '0 0 300 140', art: spinning },
  rglines: { vb: '0 0 320 270', art: lines },
  rghooks: { vb: '0 0 320 262', art: hooks },
  rgrun: { vb: '0 60 320 240', art: rigRun },
  rgfree: { vb: '0 0 320 270', art: rigFree },
  rgpat: { vb: '0 0 320 300', art: rigPat },
  rgpalomar: { vb: '0 0 320 280', art: palomar },
  rgclinch: { vb: '0 0 320 280', art: clinch },
  rgdropper: { vb: '0 0 320 280', art: dropper },
  rgsurgeon: { vb: '0 0 320 280', art: surgeon },
  rgnet: { vb: '0 0 320 180', art: castnet },
  rgbait: { vb: '0 0 320 250', art: baitMatrix },
  rglion: { vb: '0 0 320 190', art: lionfish },
  rlready: { vb: '0 0 280 120', art: rlReady },
  rlwet: { vb: '0 0 280 120', art: rlWet },
  rlhold: { vb: '0 0 280 120', art: rlHold },
  rlhook: { vb: '0 0 280 120', art: rlHook },
  rlcut: { vb: '0 0 280 120', art: rlCut },
  rlrevive: { vb: '0 0 280 120', art: rlRevive },
  rlgo: { vb: '0 0 280 120', art: rlGo },
  rlturtle: { vb: '0 0 280 120', art: rlTurtle },
  rlray: { vb: '0 0 280 120', art: rlRay },
  rlbaro: { vb: '0 0 320 290', art: baro },
  rldesc: { vb: '0 0 320 150', art: descenders },
} satisfies Record<string, Fig>;
