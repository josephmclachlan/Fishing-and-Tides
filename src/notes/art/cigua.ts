/**
 * Drawings for the CIGUATERA page (graphics review C-1): where the toxin sits in a fish, how it builds up the food
 * chain, and when each symptom shows up. Same rules as the other field notes drawings: flat line art in the page's
 * ink, fills from the page tokens (`.cg-*` in ciguatera.css), short caps labels in both languages, numbered badges
 * that match each figure's marks. Facts are the page's own, from CDC and the 2017 review: toxin is most concentrated
 * in the head, liver, guts and roe; the symptom windows are the ones in the page's table.
 */
import { badge, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
const txt = (x: number, y: number, t: string, anchor = 'middle', cls = 'nt-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

/** A fish with its nose to the left, centred on (cx, cy), `s` half its length. */
const fish = (cx: number, cy: number, s: number, cls = 'cg-fish') => {
  const p = (u: number, v: number) => `${+(cx + u * s).toFixed(1)} ${+(cy + v * s).toFixed(1)}`;
  return (
    `<path class="${cls}" d="M${p(-1, 0)} C${p(-0.6, -0.5)} ${p(0.35, -0.5)} ${p(0.62, 0)} L${p(1, -0.36)} L${p(1, 0.36)} L${p(0.62, 0)} ` +
    `C${p(0.35, 0.5)} ${p(-0.6, 0.5)} ${p(-1, 0)} Z"/><circle class="cg-eye" cx="${+(cx - 0.66 * s).toFixed(1)}" cy="${+(cy - 0.08 * s).toFixed(1)}" r="${Math.max(1.2, 0.07 * s).toFixed(1)}"/>`
  );
};

/** 1 head, liver, guts and roe in red; 2 the fillet in grey: less toxin, not none. */
const parts: Fig = {
  vb: '0 0 360 196',
  art: (lang) =>
    // Fins behind the body.
    '<path class="cg-fin" d="M118 56 L134 34 L230 42 L262 72 Z"/>' +
    '<path class="cg-fin" d="M236 140 L248 162 L278 152 L284 114 Z"/>' +
    // The body is the fillet; the head is drawn over it.
    '<path class="cg-meat" d="M34 100 C44 72 84 54 144 52 C204 50 254 64 292 90 L332 62 L324 100 L332 138 L292 110 C254 134 204 146 144 146 C84 146 44 128 34 100 Z"/>' +
    '<path class="cg-tox" d="M34 100 C44 72 70 58 100 56 C92 80 92 120 100 143 C70 140 44 128 34 100 Z"/>' +
    '<circle class="cg-eye" cx="58" cy="88" r="5"/><path class="cg-ln" d="M34 100 L50 104"/>' +
    // The belly opened: liver, guts and roe inside.
    '<path class="cg-cav" d="M106 104 C140 98 210 100 244 112 C228 134 160 140 108 134 Z"/>' +
    '<path class="cg-tox" d="M110 113 C118 104 138 104 144 113 C140 124 118 126 110 113 Z"/>' +
    '<path class="cg-gut" d="M150 112 C160 104 172 122 182 112 C190 104 198 124 186 128 C176 132 164 122 154 128"/>' +
    '<ellipse class="cg-tox" cx="220" cy="119" rx="18" ry="9"/>' +
    // Labels and leaders.
    `<path class="cg-lead" d="M66 34 V68 M127 162 V122 M170 162 V128 M220 162 V128"/>` +
    txt(66, 28, w(lang, 'HEAD', 'CABEZA')) +
    txt(196, 86, w(lang, 'FILLET', 'FILETE')) +
    txt(116, 176, w(lang, 'LIVER', 'HÍGADO')) +
    txt(170, 190, w(lang, 'GUTS', 'VÍSCERAS')) +
    txt(228, 176, w(lang, 'ROE', 'HUEVAS')) +
    badge(1, 104, 24) +
    badge(2, 238, 82),
};

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
      if (i < 3) s += `<path class="cg-arr" d="M${x + 82} 55 h8 m-4 -4 l4 4 l-4 4"/>`;
      s += txt(x + 40, 118, word[i], 'middle', 'nt-lbl nt-lbl-s');
      s += `<rect class="cg-trk" x="${x + 6}" y="126" width="68" height="8"/><rect class="cg-tbar" x="${x + 6}" y="126" width="${tox[i]}" height="8"/>`;
    });
    // 1 algae: a lump of dead coral with tiny cells on it.
    const a = X[0];
    s += `<path class="cg-rock" d="M${a + 4} 100 C${a + 8} 74 ${a + 28} 66 ${a + 42} 76 C${a + 56} 62 ${a + 74} 72 ${a + 76} 100 Z"/>`;
    for (const [dx, dy] of [[12, 80], [20, 73], [30, 70], [40, 75], [48, 69], [58, 68], [66, 74], [71, 82], [26, 78], [52, 75]])
      s += `<circle class="cg-alg" cx="${a + dx}" cy="${dy - 2}" r="2.6"/>`;
    // 2 a small grazing fish over a bit of reef.
    const b = X[1];
    s += `<path class="cg-rock" d="M${b + 4} 100 C${b + 14} 86 ${b + 30} 84 ${b + 40} 92 C${b + 52} 84 ${b + 68} 86 ${b + 76} 100 Z"/>`;
    s += fish(b + 42, 54, 18);
    // 3 a big fish about to take a small one.
    const c = X[2];
    s += fish(c + 48, 56, 28) + fish(c + 11, 56, 6);
    // 4 a person with the fish on a plate.
    const d = X[3];
    s += `<path class="cg-shirt" d="M${d + 14} 88 L${d + 16} 70 C${d + 18} 57 ${d + 30} 52 ${d + 40} 52 C${d + 50} 52 ${d + 62} 57 ${d + 64} 70 L${d + 66} 88 Z"/>`;
    s += `<circle class="cg-skin" cx="${d + 40}" cy="40" r="12"/><path class="cg-hair" d="M${d + 28} 38 C${d + 28} 26 ${d + 52} 26 ${d + 52} 38 C${d + 46} 32 ${d + 34} 32 ${d + 28} 38 Z"/>`;
    s += `<ellipse class="cg-plate" cx="${d + 40}" cy="86" rx="30" ry="7"/>` + fish(d + 40, 80, 14);
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
