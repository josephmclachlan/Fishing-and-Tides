/**
 * Drawings for the CIGUATERA page (graphics review C-1): where the toxin sits in a fish, how it builds up the food
 * chain, and when each symptom shows up. Same rules as the other field notes drawings: flat line art in the page's
 * ink, fills from the page tokens (`.cg-*` in ciguatera.css), short caps labels in both languages, numbered badges
 * that match each figure's marks. Facts are the page's own, from CDC and the 2017 review: toxin is most concentrated
 * in the head, liver, guts and roe; the symptom windows are the ones in the page's table.
 */
import { badge, type Fig } from './fig';
import { reefFish } from './fishkit';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
const txt = (x: number, y: number, t: string, anchor = 'middle', cls = 'nt-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
const r1 = (v: number) => +v.toFixed(1);

/**
 * 1 head, liver, guts and roe in red; 2 the fillet in grey: less toxin, not none. The shared reef fish (fishkit.ts) at
 * 2.8 times its 100 by 40 box, its belly opened: the head and the organs are drawn in the fish's own frame, so they sit
 * on its outline (gill cover at u = 22, eye at (12.6, 14.4)); labels and leaders are placed through `px` and `py`.
 */
const PS = 2.8, PX = 40, PY = 40;
const px = (u: number) => r1(PX + PS * u);
const py = (v: number) => r1(PY + PS * v);
/** The head: the body outline from the gill cover forward (the top curve split where it crosses u = 22). */
const HEAD = 'M22 4.46 C17 12.6 17 26 22 34.2 C14 32.4 7 29.2 3 26 L5.6 24.4 L0 23 L2 20.6 L8 13 C11.9 8.79 16.41 6.04 22 4.46 Z';
/** A leader: a small square where it leaves the part, then square corners to its label. */
const lead = (x: number, y: number, d: string) => `<rect class="cg-dot" x="${x - 2}" y="${y - 2}" width="4" height="4"/><path class="cg-lead" d="M${x} ${y}${d}"/>`;
const parts: Fig = {
  vb: '0 0 360 196',
  art: (lang) =>
    reefFish(PX, PY, PS, { body: 'cg-meat', cls: 'cg-open' }) +
    `<g transform="translate(${PX} ${PY}) scale(${PS})">` +
    `<path class="cg-tox cg-ns" d="${HEAD}"/>` +
    '<path class="cg-gill cg-ns" d="M22 4.6 C17 12.6 17 26 22 34.2 M1.4 23.4 L9.6 23 L12 21.4"/>' +
    '<circle class="cg-eye" cx="12.6" cy="14.4" r="3.2"/><rect class="cg-glint" x="12.8" y="12.2" width="1.6" height="1.6"/>' +
    // The belly opened: liver, guts and roe inside the cavity, each a hard-edged shape.
    '<path class="cg-cav cg-ns" d="M26 23.4 L40 22 L58 22 L68 23.4 L74 27 L68 31.6 L56 33.8 L40 34 L28 32.6 L25 28 Z"/>' +
    '<path class="cg-tox cg-ns" d="M27 26 L32.6 24 L39.6 24.6 L41 28 L36.6 32 L29.6 31.6 Z"/>' +
    '<path class="cg-gut cg-ns" d="M42.6 27.2 L44.2 30.8 L45.8 26.4 L47.4 30.8 L49 26.4 L50.6 30.8 L52.2 26.4 L53.4 29"/>' +
    '<path class="cg-tox cg-ns" d="M54.6 27 L59 24.8 L65 24.8 L69.6 27.6 L65.6 31 L57.2 31.4 Z"/><path class="cg-seam cg-ns" d="M56.6 28 H67.6"/>' +
    '</g>' +
    // Head label above, fillet label on the flank, organ labels below (leaders drop between the pelvic and anal fins).
    badge(1, 26, 22) + txt(40, 26, w(lang, 'HEAD', 'CABEZA'), 'start') + lead(56, py(20), 'V32') +
    txt(px(46), 91, w(lang, 'FILLET', 'FILETE')) + badge(2, px(46) + 36, 87) +
    lead(px(39), py(29), 'V174 H140') + txt(136, 178, w(lang, 'LIVER', 'HÍGADO'), 'end') +
    lead(px(48), py(29.6), 'V182') + txt(px(48), 192, w(lang, 'GUTS', 'VÍSCERAS')) +
    lead(px(57), py(29.6), 'V174 H206') + txt(210, 178, w(lang, 'ROE', 'HUEVAS'), 'start'),
};

/** A rect with its corners cut at 45 degrees by `c`, as a path. */
const cham = (x: number, y: number, wd: number, h: number, c: number) =>
  `M${x + c} ${y}H${x + wd - c}L${x + wd} ${y + c}V${y + h - c}L${x + wd - c} ${y + h}H${x + c}L${x} ${y + h - c}V${y + c}Z`;
/** Toxic algae cells on dead coral: small hard diamonds. */
const cells = (pts: [number, number][]) => pts.map(([x, y]) => `<path class="cg-alg" d="M${x} ${y - 2.8}L${x + 2.8} ${y}L${x} ${y + 2.8}L${x - 2.8} ${y}Z"/>`).join('');

/** 1 algae on dead coral, 2 a small fish eats them, 3 a big fish eats small fish, 4 you eat the big fish. Toxin grows. */
const chain: Fig = {
  vb: '0 0 360 158',
  art: (lang) => {
    const X = [4, 94, 184, 274];
    const tox = [8, 20, 62, 62];
    const word = [w(lang, 'ALGAE', 'ALGAS'), w(lang, 'SMALL FISH', 'PEZ PEQUEÑO'), w(lang, 'BIG FISH', 'PEZ GRANDE'), w(lang, 'YOU', 'USTED')];
    let s = '';
    X.forEach((x, i) => {
      s += `<rect class="cg-pan" x="${x}" y="8" width="80" height="94"/>`;
      if (i < 3) s += `<path class="cg-arr" d="M${x + 82} 55 h7 M${x + 86} 51 l4 4 l-4 4"/>`;
      s += txt(x + 40, 118, word[i], 'middle', 'nt-lbl nt-lbl-s');
      s += `<rect class="cg-trk" x="${x + 6}" y="126" width="68" height="8"/><rect class="cg-tbar" style="animation-delay:${0.2 + i * 0.35}s" x="${x + 6}" y="126" width="${tox[i]}" height="8"/>`;
    });
    // 1 algae: a block of dead branching coral, its stubs furred with toxic algae cells.
    const a = X[0];
    s += `<path class="cg-rock" d="M${a + 4} 102 L${a + 8} 86 L${a + 16} 82 L${a + 20} 68 L${a + 28} 66 L${a + 32} 76 L${a + 42} 72 L${a + 46} 58 L${a + 54} 56 L${a + 58} 68 L${a + 68} 72 L${a + 72} 84 L${a + 76} 102 Z"/>`;
    s += `<path class="cg-crk" d="M${a + 24} 72 L${a + 26} 92 M${a + 50} 62 L${a + 48} 86 L${a + 56} 96 M${a + 12} 90 L${a + 18} 98"/>`;
    s += cells([[a + 10, 81], [a + 18, 63], [a + 26, 61], [a + 36, 70], [a + 44, 53], [a + 52, 51], [a + 62, 66], [a + 72, 78], [a + 30, 68], [a + 59, 60]]);
    // 2 a small grazing fish over a bit of reef.
    const b = X[1];
    s += `<path class="cg-rock" d="M${b + 4} 102 L${b + 10} 90 L${b + 22} 86 L${b + 28} 92 L${b + 40} 82 L${b + 54} 84 L${b + 62} 90 L${b + 70} 90 L${b + 76} 102 Z"/>`;
    s += cells([[b + 16, 85], [b + 34, 83], [b + 46, 79], [b + 58, 84]]);
    s += reefFish(b + 12, 44, 0.54, { plain: true, body: 'cg-t1' });
    // 3 a big fish about to take a small one.
    const c = X[2];
    s += reefFish(c + 19, 43, 0.58, { body: 'cg-t2' }) + reefFish(c + 6, 52.6, 0.12, { plain: true, body: 'cg-t1' });
    // 4 a person at a table with the big fish on a plate.
    const d = X[3];
    s += `<path class="cg-shirt" d="M${d + 10} 102 L${d + 12} 70 L${d + 24} 58 H${d + 56} L${d + 68} 70 L${d + 70} 102 Z"/><path class="cg-ln" d="M${d + 34} 58 L${d + 40} 66 L${d + 46} 58"/>`;
    s += `<path class="cg-skin" d="${cham(d + 29, 28, 22, 26, 6)}"/>`;
    s += `<path class="cg-hair" d="M${d + 28} 40 V32 L${d + 34} 26 H${d + 46} L${d + 52} 32 V40 L${d + 48} 34 H${d + 32} Z"/>`;
    s += `<path class="cg-table" d="M${d} 90 H${d + 80} V102 H${d} Z"/>`;
    s += reefFish(d + 18, 70, 0.44, { plain: true, body: 'cg-t2' });
    s += `<path class="cg-plate" d="M${d + 8} 86 H${d + 72} L${d + 66} 92 H${d + 14} Z"/>`;
    s += txt(180, 152, w(lang, 'TOXIN (RED BAR) BUILDS UP AT EACH STEP', 'LA TOXINA (BARRA ROJA) SE ACUMULA EN CADA PASO'), 'middle', 'nt-lbl nt-lbl-s');
    return s + X.map((x, i) => badge(i + 1, x + 12, 20)).join('');
  },
};

/** When each symptom shows up after the meal, on a stretched time line (hours, days, weeks, months). */
const TICKS: [number, number][] = [[0, 108], [6, 146], [24, 180], [48, 206], [168, 242], [720, 282], [4320, 350]];
export const timeX = (h: number): number => {
  for (let i = 1; i < TICKS.length; i++) {
    const [h0, x0] = TICKS[i - 1], [h1, x1] = TICKS[i];
    if (h <= h1) return +(x0 + ((Math.max(h, h0) - h0) / (h1 - h0)) * (x1 - x0)).toFixed(1);
  }
  return TICKS[TICKS.length - 1][1];
};
const timeline: Fig = {
  vb: '0 0 360 182',
  art: (lang) => {
    const lanes: { en: string; es: string; from: number; to: number; cls: string }[] = [
      { en: 'STOMACH', es: 'ESTÓMAGO', from: 3, to: 96, cls: 'cg-b-warn' },
      { en: 'TINGLING', es: 'HORMIGUEO', from: 2, to: 48, cls: 'cg-b-warn' },
      { en: 'HOT/COLD', es: 'FRÍO/CALOR', from: 24, to: 96, cls: 'cg-b-warn' },
      { en: 'HEART', es: 'CORAZÓN', from: 6, to: 96, cls: 'cg-b-stop' },
      { en: 'TIRED', es: 'CANSANCIO', from: 168, to: 4320, cls: 'cg-b-long' },
    ];
    let s = `<path class="cg-meal" d="M${timeX(0)} 18 V150"/>` + txt(timeX(0) + 4, 14, w(lang, 'AFTER THE MEAL →', 'DESPUÉS DE COMER →'), 'start', 'nt-lbl nt-lbl-s');
    s += TICKS.slice(1).map(([, x]) => `<path class="cg-grid" d="M${x} 22 V150"/>`).join('');
    lanes.forEach((l, i) => {
      const y = 34 + i * 25;
      const x0 = timeX(l.from), x1 = timeX(l.to);
      s += badge(i + 1, 10, y) + txt(23, y + 4, w(lang, l.en, l.es), 'start', 'nt-lbl nt-lbl-s');
      s += `<rect class="cg-bar ${l.cls}" x="${x0}" y="${y - 7}" width="${+(x1 - x0).toFixed(1)}" height="14"/>`;
    });
    // No word at 2 days: it sits too close to 1 day to read; its grid line stays.
    const tl = lang === 'es' ? ['6 H', '1 DÍA', '', '1 SEM', '1 MES', '6 MESES'] : ['6 H', '1 DAY', '', '1 WEEK', '1 MO', '6 MO'];
    s += `<path class="cg-axis" d="M${timeX(0)} 152 H${timeX(4320)}"/>`;
    s += txt(timeX(0), 168, '0', 'middle', 'nt-lbl nt-lbl-s');
    TICKS.slice(1).forEach(([, x], i) => (s += !tl[i] ? '' : txt(x, 168, tl[i], i === tl.length - 1 ? 'end' : 'middle', 'nt-lbl nt-lbl-s')));
    return s;
  },
};

export const CIGUA_FIGS = { cgParts: parts, cgChain: chain, cgTime: timeline } satisfies Record<string, Fig>;
