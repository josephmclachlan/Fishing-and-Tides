/**
 * WATER SAFETY drawings: the rip current seen from above (animated: the water running out and a swimmer getting out
 * of it), the shore break against a standing adult, and the depths the scores and dive certificates mean.
 * Flat line art in the page's ink, the sea and the rating colours from the page's tokens. Numbered badges match each
 * figure's list of marks in sections/water.ts. Words inside a drawing are short labels only.
 */
import { badge, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);


/** A row of breaking waves: small curls from x0 to x1 along y. */
const breakers = (x0: number, x1: number, y: number) => {
  let d = `M${x0} ${y}`;
  for (let x = x0; x + 16 <= x1; x += 16) d += ` q8 -7 16 0`;
  return `<path class="nt-brk" d="${d}"/>`;
};

/** The swimmer's way out: pulled out by the rip, across it parallel to the beach, then back in with the waves. */
export const RIP_TRACK = { out: 'M160 150 L160 104', across: 'M160 104 L236 104', back: 'M236 104 L266 168' };

/** The rip from above: sea at the top, beach at the bottom, the gap in the breaking waves in the middle. 320 by 236. */
export function ripArt(lang: Lang): string {
  const flow = (d: string, cls = 'nt-flow') => `<path class="${cls}" d="${d}"/>`;
  return (
    '<rect class="nt-sea" x="0" y="0" width="320" height="182"/>' +
    '<path class="nt-ch" d="M138 178 C141 146 143 116 141 84 C118 70 118 40 160 34 C202 40 202 70 179 84 C177 116 179 146 182 178 Z"/>' +
    '<path class="nt-sand" d="M0 178 C80 170 240 170 320 178 L320 236 L0 236 Z"/>' +
    breakers(8, 128, 92) + breakers(192, 312, 92) + breakers(16, 128, 112) + breakers(192, 304, 112) + breakers(8, 124, 132) + breakers(196, 312, 132) +
    // feeder currents along the shore, into the channel
    flow('M30 160 L122 160', 'nt-flow nt-feed') + flow('M290 160 L198 160', 'nt-flow nt-feed') +
    '<path class="nt-head" d="M116 155 L124 160 L116 165 M204 155 L196 160 L204 165"/>' +
    // the rip itself, running out to sea
    flow('M160 170 L160 50') + flow('M149 168 C149 124 147 92 140 62') + flow('M171 168 C171 124 173 92 180 62') +
    '<path class="nt-head nt-hot" d="M153 58 L160 46 L167 58 M134 70 L138 58 L147 63 M186 70 L182 58 L173 63"/>' +
    // the way out
    `<path class="nt-trk nt-t-out" d="${RIP_TRACK.out}"/><path class="nt-trk nt-t-across" d="${RIP_TRACK.across}"/><path class="nt-trk nt-t-back" d="${RIP_TRACK.back}"/>` +
    '<path class="nt-head nt-go" d="M258 160 L266 168 L268 157"/>' +
    `<g class="nt-swimmer"><circle r="6.5"/><animateMotion dur="9s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;0.25;0.66;1;1" keyTimes="0;0.06;0.22;0.62;0.94;1" path="${RIP_TRACK.out} L236 104 L266 168"/></g>` +
    '<circle class="nt-swim0" cx="160" cy="150" r="6.5"/>' +
    `<text class="nt-lbl nt-lbl-in" x="160" y="150" text-anchor="middle">${w(lang, 'RIP', 'RESACA')}</text>` +
    `<text class="nt-lbl" x="160" y="214" text-anchor="middle">${w(lang, 'BEACH', 'PLAYA')}</text>` +
    `<text class="nt-lbl nt-lbl-s" x="10" y="20">${w(lang, 'SEA', 'MAR')}</text>` +
    badge(1, 108, 54) + badge(2, 214, 90) + badge(3, 284, 140)
  );
}

/** Shore break bands against a standing adult (1.7 m): easy under 0.5 m, wait for a lull to 1.3 m, stay out above. 320 by 168. */
export function shoreArt(lang: Lang): string {
  const y = (m: number) => 150 - m * 60; // 1 m = 60 px, ground at y 150
  const band = (cls: string, a: number, b: number, label: string) =>
    `<rect class="nt-band ${cls}" x="56" y="${y(b)}" width="176" height="${y(a) - y(b)}"/><text class="nt-blbl ${cls}" x="144" y="${(y(a) + y(b)) / 2 + 4}" text-anchor="middle">${label}</text>`;
  return (
    band('l3', 0, 0.5, w(lang, 'EASY', 'FÁCIL')) +
    band('l2', 0.5, 1.3, w(lang, 'WAIT FOR A LULL', 'ESPERE UNA PAUSA')) +
    band('l0', 1.3, 2.25, w(lang, 'STAY OUT', 'NO ENTRE')) +
    `<path class="nt-rule" d="M48 ${y(0.5)} H300 M48 ${y(1.3)} H300"/>` +
    `<path class="nt-ground" d="M10 150 H310"/>` +
    `<text class="nt-lbl" x="44" y="${y(0.5) + 4}" text-anchor="end">0.5 m</text>` +
    `<text class="nt-lbl" x="44" y="${y(1.3) + 4}" text-anchor="end">1.3 m</text>` +
    // an adult, 1.7 m
    `<g class="nt-man"><circle cx="272" cy="${y(1.7) + 8}" r="8"/><path d="M272 ${y(1.7) + 16} V${y(0.8)} M272 ${y(0.8)} L263 150 M272 ${y(0.8)} L281 150 M272 ${y(1.4)} L261 ${y(0.95)} M272 ${y(1.4)} L283 ${y(0.95)}"/></g>` +
    `<text class="nt-lbl nt-lbl-s" x="272" y="164" text-anchor="middle">1.7 m</text>` +
    badge(1, 218, y(0.25)) + badge(2, 218, y(0.9)) + badge(3, 218, y(1.8))
  );
}

/** Depths: what the SNORKEL and DIVE scores look at, and how deep each first dive certificate goes. 320 by 252. */
export function depthArt(lang: Lang): string {
  const y = (m: number) => 22 + m * 7.2;
  const ticks = [0, 5, 10, 15, 20, 25, 30].map((m) => `<path class="nt-tick" d="M38 ${y(m)} H46"/><text class="nt-lbl nt-lbl-s" x="34" y="${y(m) + 3.5}" text-anchor="end">${m}</text>`).join('');
  const line = (m: number, label: string, n: number, cls = '') =>
    `<path class="nt-rule ${cls}" d="M46 ${y(m)} H296"/><text class="nt-lbl ${cls}" x="292" y="${y(m) - 5}" text-anchor="end">${label}</text>` + badge(n, 64, y(m));
  return (
    `<rect class="nt-sea" x="46" y="${y(0)}" width="270" height="${y(31) - y(0)}"/>` +
    `<path class="nt-ground" d="M46 ${y(0)} H316"/>` +
    `<path class="nt-floor" d="M46 ${y(31)} C120 ${y(30.4)} 200 ${y(31.6)} 316 ${y(30.8)}"/>` +
    `<path class="nt-tick" d="M42 ${y(0)} V${y(30)}"/>` + ticks +
    `<text class="nt-lbl nt-lbl-s" x="6" y="12">m</text>` +
    // a snorkeller face down at the surface, a diver with a tank lower down
    `<g class="nt-man"><path d="M96 ${y(0) + 2} H120"/><circle cx="92" cy="${y(0) + 2}" r="4"/></g>` +
    `<g class="nt-man"><path d="M100 ${y(6)} H124"/><circle cx="96" cy="${y(6)}" r="4"/><rect x="104" y="${y(6) - 7}" width="12" height="4"/></g>` +
    line(2, w(lang, 'SNORKEL SCORE · 2 m', 'NOTA SNORKEL · 2 m'), 1, 'nt-score') +
    line(6, w(lang, 'DIVE SCORE · 6 m', 'NOTA BUCEO · 6 m'), 2, 'nt-score') +
    line(18, w(lang, 'OPEN WATER · 18 m', 'OPEN WATER · 18 m'), 3) +
    line(30, w(lang, 'ADVANCED · 30 m', 'AVANZADO · 30 m'), 4)
  );
}

export const WATER_FIGS = {
  rip: { vb: '0 0 320 236', art: ripArt },
  shore: { vb: '0 0 320 168', art: shoreArt },
  depth: { vb: '0 0 320 252', art: depthArt },
} satisfies Record<string, Fig>;
