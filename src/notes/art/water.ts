/**
 * WATER SAFETY drawings: the rip current seen from above (animated: the water running out and a swimmer getting out
 * of it), the shore break against a standing adult, and the depths the scores and dive certificates mean.
 * Flat line art in the page's ink, the sea and the rating colours from the page's tokens. Numbered badges match each
 * figure's list of marks in sections/water.ts. Words inside a drawing are short labels only.
 */
import { badge, breakingWave, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);


/** A row of breaking waves: small curls from x0 to x1 along y, with white water spilling just behind them. */
const breakers = (x0: number, x1: number, y: number) => {
  let d = `M${x0} ${y}`;
  let x = x0;
  for (; x + 16 <= x1; x += 16) d += ` q8 -7 16 0`;
  return `<path class="nt-foamb" d="${d} L${x} ${y + 6} L${x0} ${y + 6} Z"/><path class="nt-brk" d="${d}"/>`;
};

/** An arrowhead at (x2, y2) for a line coming from (x1, y1). */
const head = (x1: number, y1: number, x2: number, y2: number, cls: string, s = 9) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (da: number) => `${+(x2 - s * Math.cos(a + da)).toFixed(1)} ${+(y2 - s * Math.sin(a + da)).toFixed(1)}`;
  return `<path class="${cls}" d="M${p(0.6)} L${x2} ${y2} L${p(-0.6)}"/>`;
};

/** A swimmer's head in the water with one arm up, centred on 0 0. */
const SWIMMER = '<ellipse class="nt-ripple" rx="10" ry="3.4" cy="3"/><path class="nt-arm" d="M3 0 L11 -11"/><circle r="5.5"/>';

/** The swimmer's way out: pulled out by the rip, across it parallel to the beach, then back in with the waves. */
export const RIP_TRACK = { out: 'M160 150 L160 96', across: 'M160 96 L236 96', back: 'M236 96 L258 146' };

/** The rip from above: sea at the top, beach at the bottom, the gap in the breaking waves in the middle. 320 by 236. */
export function ripArt(lang: Lang): string {
  const flow = (d: string, cls = 'nt-flow') => `<path class="${cls}" d="${d}"/>`;
  return (
    '<rect class="nt-sea" x="0" y="0" width="320" height="182"/>' +
    '<path class="nt-ch" d="M138 178 C141 146 143 116 141 84 C118 70 118 40 160 34 C202 40 202 70 179 84 C177 116 179 146 182 178 Z"/>' +
    '<path class="nt-sand" d="M0 178 C80 170 240 170 320 178 L320 236 L0 236 Z"/>' +
    breakers(8, 128, 84) + breakers(192, 312, 84) + breakers(16, 128, 104) + breakers(192, 304, 104) + breakers(8, 124, 124) + breakers(196, 312, 124) +
    `<text class="nt-lbl nt-lbl-b nt-halo" x="10" y="72">${w(lang, 'BREAKING WAVES', 'OLAS ROMPIENDO')}</text>` +
    // water running along the shore into the rip
    flow('M18 166 L122 166', 'nt-flow nt-feed') + flow('M302 166 L198 166', 'nt-flow nt-feed') +
    '<path class="nt-head" d="M114 160 L123 166 L114 172 M206 160 L197 166 L206 172"/>' +
    `<text class="nt-lbl nt-lbl-b nt-halo" x="10" y="144">${w(lang, 'WATER RUNS', 'EL AGUA CORRE')}</text>` +
    `<text class="nt-lbl nt-lbl-b nt-halo" x="10" y="157">${w(lang, 'INTO THE RIP', 'A LA RESACA')}</text>` +
    // the rip itself, running out to sea
    flow('M160 170 L160 50') + flow('M149 168 C149 124 147 92 140 62') + flow('M171 168 C171 124 173 92 180 62') +
    '<path class="nt-head nt-hot" d="M153 58 L160 46 L167 58 M134 70 L138 58 L147 63 M186 70 L182 58 L173 63"/>' +
    `<text class="nt-lbl nt-lbl-b nt-halo" x="160" y="24" text-anchor="middle">${w(lang, 'RIP CURRENT', 'CORRIENTE DE RESACA')}</text>` +
    `<text class="nt-lbl nt-lbl-b nt-lbl-in" x="160" y="76" text-anchor="middle">${w(lang, 'GAP', 'HUECO')}</text>` +
    // the way out
    `<path class="nt-trk nt-t-out" d="${RIP_TRACK.out}"/><path class="nt-trk nt-t-across" d="${RIP_TRACK.across}"/><path class="nt-trk nt-t-back" d="${RIP_TRACK.back}"/>` +
    head(236, 96, 258, 146, 'nt-head nt-go') +
    `<g class="nt-swimmer">${SWIMMER}<animateMotion dur="9s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;0.29;0.7;1;1" keyTimes="0;0.06;0.25;0.62;0.94;1" path="${RIP_TRACK.out} L236 96 L258 146"/></g>` +
    `<g class="nt-swim0" transform="translate(160 150)">${SWIMMER}</g>` +
    `<text class="nt-lbl nt-lbl-b" x="160" y="214" text-anchor="middle">${w(lang, 'BEACH', 'PLAYA')}</text>` +
    `<text class="nt-lbl nt-lbl-s" x="10" y="20">${w(lang, 'SEA', 'MAR')}</text>` +
    badge(1, 160, 116) + badge(2, 212, 96) + badge(3, 270, 124)
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
