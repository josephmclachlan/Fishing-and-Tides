/**
 * SURF drawings: who has the wave (an A-frame peak seen from above, with a drop-in and the channel), and the four wave
 * sizes next to a standing surfer. Same rules as art/water.ts: flat line art, page tokens only, badges match the marks.
 */
import { badge, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** A surfboard at (x, y) pointing along `deg` (0 = right), with the rider's head on it. */
const rider = (x: number, y: number, deg: number, cls: string) =>
  `<g class="nt-rider ${cls}" transform="translate(${x} ${y}) rotate(${deg}) scale(1.5)"><path class="nt-board" d="M-12 -2.8 Q-13 0 -12 2.8 L3 2.8 Q11 2 13.5 0 Q11 -2 3 -2.8 Z"/><path class="nt-body" d="M-2 -6.5 L-2 6.5"/><circle cx="-2" cy="0" r="2.6"/></g>`;

/** Right of way from above: sea at the top, beach at the bottom, the peak in the middle breaking both ways. 320 by 224. */
export function peakArt(lang: Lang): string {
  return (
    '<rect class="nt-sea" x="0" y="0" width="320" height="190"/>' +
    '<path class="nt-sand" d="M0 190 C90 184 230 184 320 190 L320 224 L0 224 Z"/>' +
    // the channel: deeper water at the left where the waves do not break
    '<path class="nt-ch" d="M18 190 C22 140 20 80 24 20 L70 20 C66 80 70 140 66 190 Z"/>' +
    // white water spreading from the peak, and the wave's crest either side of it
    '<path class="nt-foam" d="M124 94 C132 114 170 114 178 94 C168 100 134 100 124 94 Z"/>' +
    '<path class="nt-crest" d="M151 80 C186 90 246 98 310 104 M151 80 C126 90 104 96 82 101"/>' +
    `<text class="nt-lbl" x="151" y="68" text-anchor="middle">${w(lang, 'PEAK', 'PICO')}</text>` +
    // riders on each side of the peak have the wave; the one further down the right takes off in front: a drop-in
    rider(176, 96, 8, 'nt-ok') + '<path class="nt-head nt-go" d="M200 101 L222 104 M215 99 L222 104 L214 109"/>' +
    rider(126, 96, 172, 'nt-ok') + '<path class="nt-head nt-go" d="M102 101 L80 104 M87 99 L80 104 L88 109"/>' +
    rider(258, 108, 6, 'nt-bad') + '<path class="nt-x2" d="M244 94 L272 122 M272 94 L244 122"/>' +
    // paddling out: up the channel, then along behind the line-up, never across in front of a rider
    '<path class="nt-trk nt-paddle" d="M44 176 L44 64 Q44 50 58 50 L128 50"/>' +
    '<path class="nt-head" d="M120 44 L128 50 L120 56"/>' +
    `<text class="nt-lbl nt-lbl-s" x="35" y="150" transform="rotate(-90 35 150)">${w(lang, 'CHANNEL', 'CANAL')}</text>` +
    `<text class="nt-lbl" x="190" y="212" text-anchor="middle">${w(lang, 'BEACH', 'PLAYA')}</text>` +
    badge(1, 151, 138) + badge(2, 288, 132) + badge(3, 88, 38)
  );
}

/** The four wave faces in the size guide, against a standing surfer of 1.7 m. 320 by 176. */
export function sizesArt(lang: Lang): string {
  const G = 152; // ground
  const px = 46; // pixels per metre
  const wave = (cx: number, m: number, cls: string, n: number, label: string) => {
    const h = m * px;
    const top = G - h;
    return (
      `<path class="nt-band ${cls}" d="M${cx - 28} ${G} C${cx - 18} ${G - h * 0.4} ${cx - 10} ${top} ${cx + 4} ${top} C${cx + 16} ${top} ${cx + 22} ${top + h * 0.22} ${cx + 16} ${top + h * 0.36} C${cx + 13} ${top + h * 0.44} ${cx + 10} ${top + h * 0.34} ${cx + 12} ${top + h * 0.26} L${cx + 22} ${G} Z"/>` +
      `<text class="nt-lbl nt-lbl-s" x="${cx}" y="${G + 14}" text-anchor="middle">${label}</text>` +
      badge(n, cx - 4, top - 13)
    );
  };
  return (
    wave(42, 0.5, 'l3', 1, w(lang, '< 0.6 m', '< 0.6 m')) +
    wave(108, 0.95, 'l2', 2, '0.6–1.2 m') +
    wave(176, 1.65, 'l1', 3, '1.2–2 m') +
    wave(244, 2.4, 'l0', 4, w(lang, '> 2 m', '> 2 m')) +
    `<path class="nt-ground" d="M8 ${G} H312"/>` +
    `<path class="nt-rule" d="M282 ${G - 1.7 * px} H312"/>` +
    `<g class="nt-man"><circle cx="296" cy="${G - 1.7 * px + 7}" r="7"/><path d="M296 ${G - 1.7 * px + 14} V${G - 0.8 * px} M296 ${G - 0.8 * px} L289 ${G} M296 ${G - 0.8 * px} L303 ${G} M296 ${G - 1.4 * px} L287 ${G - 0.95 * px} M296 ${G - 1.4 * px} L305 ${G - 0.95 * px}"/></g>` +
    `<text class="nt-lbl nt-lbl-s" x="296" y="${G + 14}" text-anchor="middle">1.7 m</text>`
  );
}

export const SURF_FIGS = {
  peak: { vb: '0 0 320 224', art: peakArt },
  sizes: { vb: '0 0 320 176', art: sizesArt },
} satisfies Record<string, Fig>;
