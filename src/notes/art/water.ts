/**
 * WATER SAFETY drawings: the rip current seen from above (animated: the water running out and a swimmer getting out
 * of it), the shore break against a standing adult, and the depths the scores and dive certificates mean.
 * Flat line art in the page's ink, the sea and the rating colours from the page's tokens. Numbered badges match each
 * figure's list of marks in sections/water.ts. Words inside a drawing are short labels only.
 */
import { badge, breakingWave, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);


/** Deterministic 0..1 noise for grain and foam, so the drawing is the same every time. */
const h1 = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/** A band of white water over a sandbar from x0 to x1, its sharp front on y, foam grains thinning out behind it. */
const breakers = (x0: number, x1: number, y: number, seed: number) => {
  let g = '';
  for (let j = 0; j < (x1 - x0) * 0.45; j++) {
    const fx = x0 + h1(j * 7 + seed) * (x1 - x0), fd = Math.pow(h1(j * 13 + seed * 3), 1.8) * 14;
    g += `M${fx.toFixed(1)} ${(y - 5 - fd).toFixed(1)}h2v2h-2z`;
  }
  return `<path class="nt-foamg" d="${g}"/><rect class="nt-foamb" x="${x0}" y="${y - 5}" width="${x1 - x0}" height="5"/><path class="nt-brk" d="M${x0} ${y + 0.75}H${x1}"/>`;
};

/** Hard chevrons along a straight line from (x1, y1) to (x2, y2), every `gap`, marching with the CSS class's animation. */
const chevrons = (x1: number, y1: number, x2: number, y2: number, gap: number, cls: string, s = 6) => {
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a);
  let d = '';
  for (let u = gap / 2; u < L; u += gap) {
    const x = x1 + ca * u, y = y1 + sa * u, p = (q: number, r: number) => `${(x + q * ca - r * sa).toFixed(1)} ${(y + q * sa + r * ca).toFixed(1)}`;
    d += `M${p(-s * 0.6, -s * 0.75)}L${p(s * 0.4, 0)}L${p(-s * 0.6, s * 0.75)}`;
  }
  return `<g class="${cls}" style="--dx:${(ca * gap).toFixed(1)}px;--dy:${(sa * gap).toFixed(1)}px"><path d="${d}"/></g>`;
};

/** A square label block: ink fill, the words knocked out (the hero pictures' tags). */
const tagB = (x: number, y: number, s: string, anchor: 'start' | 'middle' | 'end', cls = 'nt-tag') => {
  const w = s.length * 6.9 + 10, x0 = anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w;
  return `<g class="${cls}"><rect x="${x0.toFixed(1)}" y="${y - 9}" width="${w.toFixed(1)}" height="18"/><text x="${(x0 + 5).toFixed(1)}" y="${y + 4}">${s}</text></g>`;
};

/** A swimmer's head in the water with one arm up, centred on 0 0. */
const SWIMMER = '<rect class="nt-ripple" x="-11" y="-7" width="22" height="16"/><path class="nt-arm" d="M3 1 L10 -9 M-3 1 L-10 -5"/><circle r="5"/>';

/** The swimmer's way out: pulled out by the rip, across it parallel to the beach, then back in with the waves. */
export const RIP_TRACK = { out: 'M160 150 L160 104', across: 'M160 104 L240 104', back: 'M240 104 L256 158' };

/**
 * The rip from above, drawn like the SWIM hero (PLAN 13.7): sea at the top, beach at the bottom. White water over the
 * sandbars either side; between them the deeper, darker channel where the waves do not break; chevrons marching in
 * along the shore, out through the gap and fanning into the plume of sandy water past the waves; the way out traced
 * and swum. Square tags, square badges. 320 by 236.
 */
export function ripArt(lang: Lang): string {
  const cx = 160, Y = 176, half = (y: number) => (y >= 64 ? 15 - (Y - y) * 0.02 : 12);
  let ch = `M${cx - half(Y)} ${Y}`;
  for (let y = Y; y >= 44; y -= 8) ch += ` L${(cx - half(y)).toFixed(1)} ${y}`;
  for (let y = 44; y <= Y; y += 8) ch += ` L${(cx + half(y)).toFixed(1)} ${y}`;
  ch += ' Z';
  let bars = '';
  for (let i = 0; i < 260; i++) { const x = h1(i) * 320, y = 64 + h1(i + 999) * 96; if (Math.abs(x - cx) < 20) continue; bars += `M${x.toFixed(1)} ${y.toFixed(1)}h2v2h-2z`; }
  let grain = '';
  for (let i = 0; i < 220; i++) grain += `M${(h1(i + 11) * 320).toFixed(1)} ${(180 + h1(i + 23) * 56).toFixed(1)}h1.5v1.5h-1.5z`;
  return (
    '<rect class="nt-sea" x="0" y="0" width="320" height="182"/>' +
    `<path class="nt-bar" d="${bars}"/>` +
    `<path class="nt-ch" d="${ch}"/>` +
    // the plume of sandy water past the waves
    '<path class="nt-plume" d="M148 46 C132 46 118 40 120 30 C122 16 198 16 200 30 C202 40 188 46 172 46 Z"/>' +
    breakers(0, cx - 18, 82, 1) + breakers(cx + 18, 320, 82, 2) + breakers(0, cx - 17, 108, 3) + breakers(cx + 17, 320, 108, 4) + breakers(0, cx - 16, 134, 5) + breakers(cx + 16, 320, 134, 6) +
    // across the channel the wave does not break: only its line
    '<path class="nt-swl" d="M143 82H177M144 108H176M145 134H175"/>' +
    '<path class="nt-sand" d="M0 178 L320 178 L320 236 L0 236 Z"/>' +
    `<path class="nt-grain" d="${grain}"/>` +
    '<path class="nt-wash" d="M0 177H320"/>' +
    // water running in along the shore, out through the gap, fanning out at the head
    chevrons(14, 166, 136, 166, 18, 'nt-cv nt-cv-feed') + chevrons(306, 166, 184, 166, 18, 'nt-cv nt-cv-feed') +
    chevrons(cx, 172, cx, 50, 14, 'nt-cv nt-cv-out', 7) +
    chevrons(cx - 4, 44, 126, 32, 14, 'nt-cv nt-cv-feed') + chevrons(cx + 4, 44, 194, 32, 14, 'nt-cv nt-cv-feed') +
    // the way out
    `<path class="nt-trk nt-t-out" d="${RIP_TRACK.out}"/><path class="nt-trk nt-t-across" d="${RIP_TRACK.across}"/><path class="nt-trk nt-t-back" d="${RIP_TRACK.back}"/>` +
    '<path class="nt-go-hd" d="M252 150 L257 160 L262 151 Z"/>' +
    `<g class="nt-swimmer">${SWIMMER}<animateMotion dur="9s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;0.29;0.7;1;1" keyTimes="0;0.06;0.25;0.62;0.94;1" path="${RIP_TRACK.out} L240 104 L256 158"/></g>` +
    `<g class="nt-swim0" transform="translate(160 150)">${SWIMMER}</g>` +
    tagB(160, 10, w(lang, 'RIP CURRENT', 'CORRIENTE DE RESACA'), 'middle') +
    tagB(6, 70, w(lang, 'BREAKING WAVES', 'OLAS ROMPIENDO'), 'start', 'nt-tag nt-tag-o') +
    tagB(6, 152, w(lang, 'WATER RUNS IN', 'EL AGUA ENTRA'), 'start', 'nt-tag nt-tag-o') +
    tagB(160, 214, w(lang, 'BEACH', 'PLAYA'), 'middle', 'nt-tag nt-tag-o') +
    `<text class="nt-lbl nt-lbl-s" x="314" y="20" text-anchor="end">${w(lang, 'SEA', 'MAR')}</text>` +
    badge(1, 182, 150) + badge(2, 200, 92) + badge(3, 274, 136)
  );
}

/** A standing adult (1.7 m) with feet at (x, y), `px` pixels to the metre. */
const adult = (x: number, y: number, px: number) => {
  const h = (m: number) => y - m * px;
  const r = 0.13 * px;
  return (
    `<g class="nt-man"><circle cx="${x}" cy="${h(1.7) + r}" r="${r}"/>` +
    `<path d="M${x} ${h(1.7) + 2 * r} V${h(0.85)} M${x} ${h(0.85)} L${x - 0.12 * px} ${y} M${x} ${h(0.85)} L${x + 0.12 * px} ${y} ` +
    `M${x} ${h(1.4)} L${x - 0.16 * px} ${h(0.95)} M${x} ${h(1.4)} L${x + 0.16 * px} ${h(0.95)}"/></g>`
  );
};

/**
 * The shore break side-on: three small scenes, each a wave dumping on a sloping beach in front of the same standing
 * adult (1.7 m). Easy under 0.5 m, wait for a lull up to 1.3 m, stay out above. 320 by 160.
 */
export function shoreArt(lang: Lang): string {
  const px = 40; // pixels per metre
  const W = 100; // the still water line
  const G = 116; // bottom of each scene
  const scene = (x0: number, m: number, cls: string, n: number, words: string[]) => {
    const h = m * px;
    const c = x0 + 9 + h * 0.6; // crest
    const f = c + 0.33 * h; // where the face lands
    const s = f + 2; // where the sand starts under water
    const end = s + 40;
    const lines = words.map((t, i) => `<text class="nt-blbl ${cls}" x="${(x0 + end) / 2}" y="${G + 20 + (i - (words.length - 1) / 2) * 12}" text-anchor="middle">${t}</text>`).join('');
    return (
      `<rect class="nt-wv" x="${x0}" y="${W}" width="${end - x0}" height="${G - W}"/>` +
      breakingWave(c, W, h, 'nt-wv') +
      (m > 0.6 ? `<ellipse class="nt-spl" cx="${f + 3}" cy="${W}" rx="${0.18 * h}" ry="${0.07 * h}"/>` : '') +
      `<path class="nt-sand" d="M${s} ${G} L${end} ${W - 8} L${end} ${G} Z"/>` +
      adult(s + 22, W + 3, px) +
      `<rect class="nt-band ${cls}" x="${x0}" y="${G + 5}" width="${end - x0}" height="30"/>${lines}` +
      badge(n, x0 + 9, 24)
    );
  };
  return (
    `<path class="nt-rule" d="M40 ${W - 0.5 * px} H316 M40 ${W - 1.3 * px} H316"/>` +
    `<text class="nt-lbl" x="38" y="${W - 0.5 * px + 4}" text-anchor="end">0.5 m</text>` +
    `<text class="nt-lbl" x="38" y="${W - 1.3 * px + 4}" text-anchor="end">1.3 m</text>` +
    scene(42, 0.35, 'l3', 1, [w(lang, 'EASY', 'FÁCIL')]) +
    scene(110, 0.9, 'l2', 2, lang === 'es' ? ['ESPERE', 'UNA PAUSA'] : ['WAIT FOR', 'A LULL']) +
    scene(198, 1.6, 'l0', 3, [w(lang, 'STAY OUT', 'NO ENTRE')])
  );
}

/** A person swimming face down, head to the left at (x, y): mask, body, fins, and a snorkel or a tank. */
const swimmer = (x: number, y: number, kit: 'snorkel' | 'tank') =>
  '<g class="nt-swm">' +
  (kit === 'tank'
    ? `<rect class="nt-tank" x="${x + 7}" y="${y - 9}" width="20" height="6.5" rx="3"/><path class="nt-limb nt-hose" d="M${x + 8} ${y - 6} Q${x - 1} ${y - 9} ${x - 3} ${y + 2}"/>`
    : `<path class="nt-snork" d="M${x + 2} ${y - 3} V${y - 15} Q${x + 2} ${y - 18} ${x - 1} ${y - 18}"/>`) +
  `<path class="nt-torso" d="M${x + 5} ${y + 1} L${x + 26} ${y + 2}"/>` +
  `<path class="nt-limb" d="M${x + 8} ${y + 3} L${x + 18} ${y + 7} M${x + 26} ${y + 2} L${x + 38} ${y - 1} M${x + 26} ${y + 2} L${x + 38} ${y + 5}"/>` +
  `<path class="nt-fin" d="M${x + 37} ${y - 2} L${x + 47} ${y - 6} L${x + 46} ${y} Z M${x + 37} ${y + 4} L${x + 47} ${y + 4} L${x + 45} ${y + 9} Z"/>` +
  `<circle cx="${x}" cy="${y}" r="4.6"/><rect class="nt-mask" x="${x - 7}" y="${y - 1}" width="4.5" height="5.5" rx="1"/>` +
  '</g>';

/** Depths: what the SNORKEL and DIVE scores look at, and how deep each first dive certificate goes. 320 by 282. */
export function depthArt(lang: Lang): string {
  const y = (m: number) => 22 + m * 6.6;
  const ticks = [0, 5, 10, 15, 20, 25, 30].map((m) => `<path class="nt-tick" d="M38 ${y(m)} H46"/><text class="nt-lbl" x="34" y="${y(m) + 3.5}" text-anchor="end">${m}</text>`).join('');
  const line = (m: number, label: string, n: number, cls = '', below = false) =>
    `<path class="nt-rule ${cls}" d="M46 ${y(m)} H316"/><text class="nt-lbl nt-lbl-b ${cls}" x="312" y="${y(m) + (below ? 14 : -5)}" text-anchor="end">${label}</text>` + badge(n, 64, y(m));
  const key = (yy: number, cls: string, label: string) =>
    `<path class="nt-rule ${cls}" d="M46 ${yy} H72"/><text class="nt-lbl nt-lbl-b" x="80" y="${yy + 4}">${label}</text>`;
  return (
    `<rect class="nt-sea" x="46" y="${y(0)}" width="270" height="${y(34) - y(0)}"/>` +
    `<rect class="nt-zone l2" x="46" y="${y(18)}" width="270" height="${y(30) - y(18)}"/>` +
    `<rect class="nt-zone l0" x="46" y="${y(30)}" width="270" height="${y(34) - y(30)}"/>` +
    `<path class="nt-ground" d="M46 ${y(0)} H316"/>` +
    `<path class="nt-floor" d="M46 ${y(34)} C120 ${y(33.4)} 200 ${y(34.6)} 316 ${y(33.8)}"/>` +
    `<path class="nt-tick" d="M42 ${y(0)} V${y(30)}"/>` + ticks +
    `<text class="nt-lbl" x="6" y="12">${w(lang, 'DEPTH, m', 'PROF., m')}</text>` +
    swimmer(92, y(0) + 4, 'snorkel') + swimmer(96, y(6) - 9, 'tank') +
    line(2, w(lang, 'SNORKEL SCORE · 2 m', 'NOTA SNORKEL · 2 m'), 1, 'nt-score', true) +
    line(6, w(lang, 'DIVE SCORE · 6 m', 'NOTA BUCEO · 6 m'), 2, 'nt-score', true) +
    line(18, w(lang, 'OPEN WATER LIMIT · 18 m', 'LÍMITE OPEN WATER · 18 m'), 3) +
    line(30, w(lang, 'ADVANCED LIMIT · 30 m', 'LÍMITE AVANZADO · 30 m'), 4) +
    key(260, 'nt-score', w(lang, 'WHAT THE APP SCORE LOOKS AT', 'LO QUE MIRA LA NOTA')) +
    key(274, '', w(lang, 'DEEPEST A CERTIFICATE ALLOWS', 'LO MÁS HONDO DEL CERTIFICADO'))
  );
}

export const WATER_FIGS = {
  rip: { vb: '0 0 320 236', art: ripArt },
  shore: { vb: '0 0 320 160', art: shoreArt },
  depth: { vb: '0 0 320 282', art: depthArt },
} satisfies Record<string, Fig>;
