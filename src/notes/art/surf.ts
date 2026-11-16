/**
 * SURF drawings: who has the wave (an A-frame peak seen from above, with a drop-in and the channel), and the four wave
 * sizes next to a standing surfer. Same rules as art/water.ts: flat line art, page tokens only, badges match the marks.
 */
import { badge, breakingWave, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** A surfer standing on a board, drawn side-on so it reads at a glance, at (x, y), riding to the right (dir 1) or left. */
const rider = (x: number, y: number, dir: 1 | -1, cls: string) =>
  `<g class="nt-rider ${cls}" transform="translate(${x} ${y}) scale(${dir * 1.15} 1.15)">` +
  '<path class="nt-board" d="M-15 1.5 L11 1.5 Q16 1.5 17.5 -2 L-14 -1 Q-16.5 -0.5 -15 1.5 Z"/>' +
  '<path class="nt-body" d="M-7 -1 L-4 -7 L-1 -12 M6 -1 L5 -7 L-1 -12 M-1 -12 L2 -21 M1 -19 L-9 -16 M1 -19 L11 -22"/>' +
  '<circle cx="3.5" cy="-25" r="3.6"/></g>';

/** An arrowhead at (x2, y2) for a line coming from (x1, y1). */
const head = (x1: number, y1: number, x2: number, y2: number, cls: string, s = 8) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (da: number) => `${+(x2 - s * Math.cos(a + da)).toFixed(1)} ${+(y2 - s * Math.sin(a + da)).toFixed(1)}`;
  return `<path class="${cls}" d="M${x1} ${y1} L${x2} ${y2} M${p(0.6)} L${x2} ${y2} L${p(-0.6)}"/>`;
};

/** Right of way from above: sea at the top, beach at the bottom, the peak in the middle breaking both ways. 320 by 236. */
export function peakArt(lang: Lang): string {
  return (
    '<rect class="nt-sea" x="0" y="0" width="320" height="202"/>' +
    '<path class="nt-sand" d="M0 202 C90 196 230 196 320 202 L320 236 L0 236 Z"/>' +
    // the channel: deeper water at the left where the waves do not break
    '<path class="nt-ch" d="M16 202 C20 150 18 80 20 8 L64 8 C62 80 66 150 62 202 Z"/>' +
    `<text class="nt-lbl nt-lbl-in" x="28" y="112" text-anchor="middle" transform="rotate(-90 28 112)">${w(lang, 'CHANNEL · OFTEN A RIP', 'CANAL · SUELE SER RESACA')}</text>` +
    // the next wave on its way in, and which way the waves travel
    '<path class="nt-swell" d="M104 46 C130 40 146 37 160 36 C196 39 256 46 312 54"/>' +
    head(304, 12, 304, 36, 'nt-head') +
    `<text class="nt-lbl nt-lbl-b" x="296" y="22" text-anchor="end">${w(lang, 'WAVES COME IN', 'LAS OLAS ENTRAN')}</text>` +
    // the breaking wave: white water spreading from the peak, and its crest either side
    '<path class="nt-foam" d="M132 104 C140 122 180 122 188 104 C178 110 142 110 132 104 Z"/>' +
    '<path class="nt-crest" d="M160 92 C196 100 254 108 312 114 M160 92 C134 100 110 106 84 110"/>' +
    `<text class="nt-lbl nt-lbl-b" x="160" y="82" text-anchor="middle">${w(lang, 'PEAK', 'PICO')}</text>` +
    // riders either side of the peak each have their own side; the one further down the right takes off in front: a drop-in
    rider(130, 134, -1, 'nt-ok') + head(108, 136, 80, 138, 'nt-head nt-go') +
    rider(190, 136, 1, 'nt-ok') + head(212, 138, 238, 140, 'nt-head nt-go') +
    `<text class="nt-lbl nt-lbl-b" x="72" y="156">${w(lang, 'RIDING THIS WAY', 'SURFEA HACIA ACÁ')}</text>` +
    rider(272, 142, 1, 'nt-bad') + '<path class="nt-x2" d="M258 114 L286 146 M286 114 L258 146"/>' +
    `<text class="nt-lbl nt-lbl-b" x="272" y="166" text-anchor="middle">${w(lang, 'DROP-IN', 'SE METE')}</text>` +
    // paddling out: up the channel, then along behind the line-up, never across in front of a rider
    '<path class="nt-trk nt-paddle" d="M42 188 L42 72 Q42 62 54 62 L122 62"/>' +
    '<path class="nt-head" d="M114 56 L122 62 L114 68"/>' +
    `<text class="nt-lbl nt-lbl-b" x="190" y="222" text-anchor="middle">${w(lang, 'BEACH', 'PLAYA')}</text>` +
    badge(1, 186, 78) + badge(2, 304, 134) + badge(3, 84, 48)
  );
}

/** The four wave sizes, side-on, against a standing adult of 1.7 m with knee, waist, chest and head marked. 320 by 176. */
export function sizesArt(lang: Lang): string {
  const G = 160; // still water and the ground
  const px = 34; // pixels per metre
  const y = (m: number) => G - m * px;
  const P = 68; // the person
  const body = ([m, en, es]: [number, string, string]) =>
    `<path class="nt-tick" d="M${P - 12} ${y(m)} H${P - 6}"/><text class="nt-lbl" x="${P - 15}" y="${y(m) + 3.5}" text-anchor="end">${w(lang, en, es)}</text>`;
  const grid = (m: number) =>
    `<path class="nt-rule" d="M84 ${y(m)} H272"/><text class="nt-lbl nt-lbl-b" x="316" y="${y(m) + 4}" text-anchor="end">${m} m</text>`;
  const wave = (back: number, m: number, cls: string, n: number) => {
    const h = m * px;
    const c = back + 0.5 * h;
    return breakingWave(c, G, h, `nt-band ${cls}`, 1, 0.5) + badge(n, c, y(m) - 12);
  };
  return (
    `<rect class="nt-wv" x="84" y="${G}" width="190" height="8"/>` +
    grid(0.6) + grid(1.2) + grid(2) +
    wave(90, 0.45, 'l3', 1) + wave(112, 0.9, 'l2', 2) + wave(146, 1.6, 'l0', 3) + wave(198, 2.4, 'l0', 4) +
    `<path class="nt-ground" d="M8 ${G} H84"/>` +
    `<g class="nt-man"><circle cx="${P}" cy="${y(1.7) + 5}" r="5"/><path d="M${P} ${y(1.7) + 10} V${y(0.85)} M${P} ${y(0.85)} L${P - 5} ${G} M${P} ${y(0.85)} L${P + 5} ${G} M${P} ${y(1.4)} L${P - 7} ${y(0.95)} M${P} ${y(1.4)} L${P + 7} ${y(0.95)}"/></g>` +
    ([[0.5, 'KNEE', 'RODILLA'], [1.0, 'WAIST', 'CINTURA'], [1.3, 'CHEST', 'PECHO'], [1.7, 'HEAD', 'CABEZA']] as [number, string, string][]).map(body).join('')
  );
}

export const SURF_FIGS = {
  peak: { vb: '0 0 320 236', art: peakArt },
  sizes: { vb: '0 0 320 176', art: sizesArt },
} satisfies Record<string, Fig>;
