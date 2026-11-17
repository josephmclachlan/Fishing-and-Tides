/**
 * The DISPATCH drawings: one per way of doing it right (numbered to match each method's list of marks, content.ts
 * `METHODS[].marks`), and one small picture per science step. Flat line art in the page's ink, cuts and blood in its
 * red, water and ice in its sea colours. Pure strings; the styles are in dispatch.css (`.dp-art`).
 * Graphics review D-4, D-5, D-6, D-9, D-11, D-12: one fish with fins, a forked tail, a gill cover and a mouth; the cut
 * drawn solid with its badge on it; blood as clouds; the ikejime spot shown as a zone in a close-up of the head.
 */
import type { Lang, MethodId } from './content';

const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
const badge = (n: number, x: number, y: number) =>
  `<g class="dp-bd"><circle cx="${x}" cy="${y}" r="8"/><text x="${x}" y="${y + 3.6}" text-anchor="middle">${n}</text></g>`;
const lbl = (x: number, y: number, t: string, anchor = 'middle') => `<text class="dp-lbl" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

/** The fish lying head left, 16 to 204 across and 14 to 80 down: fins, forked tail, gill cover, mouth and eye. */
const FISH =
  '<path class="dp-fin" d="M86 28 L100 14 L142 22 L152 35"/>' +
  '<path class="dp-fin" d="M128 69 L138 80 L158 73 L162 63"/>' +
  '<path class="dp-skin" d="M16 50 C30 30 80 24 126 30 C150 33 168 40 180 46 L204 28 L196 50 L204 72 L180 54 C168 60 150 67 126 70 C80 76 30 70 16 50 Z"/>' +
  '<path class="dp-line" d="M60 32 C52 42 52 58 60 68"/>' +
  '<path class="dp-line" d="M16 50 L28 53"/>' +
  '<path class="dp-fin" d="M68 52 L90 60 L72 60 Z"/>' +
  '<circle class="dp-eye" cx="36" cy="44" r="4.5"/>';

/** A solid red slash just behind the gill cover. */
const GILL_CUT = '<path class="dp-cut" d="M66 31 C58 42 58 58 66 69"/>';

function ikejime(lang: Lang): string {
  return (
    FISH +
    GILL_CUT +
    '<path class="dp-cut" d="M178 42 L178 58"/>' +
    '<path class="dp-wire" d="M178 50 L48 40"/>' +
    // where the spike goes, marked on the whole fish, then shown up close below
    '<circle class="dp-zone" cx="46" cy="36" r="5"/>' +
    badge(1, 30, 22) + badge(2, 72, 78) + badge(3, 190, 62) + badge(4, 116, 45) +
    // the close-up of the head: eye, gill cover, the brain as a zone, the spike going in from the top toward it
    '<rect class="dp-inset" x="6" y="88" width="208" height="64"/>' +
    '<path class="dp-skin" d="M20 128 C32 108 78 98 150 96 L212 96 L212 150 L150 150 C78 150 32 146 20 128 Z"/>' +
    '<path class="dp-line" d="M118 99 C104 112 104 134 118 148"/><path class="dp-line" d="M20 128 L40 134"/>' +
    '<circle class="dp-eye" cx="58" cy="120" r="7"/>' +
    '<ellipse class="dp-brain" cx="84" cy="110" rx="15" ry="7"/>' +
    '<path class="dp-spike" d="M112 78 L90 106"/><path class="dp-arrow" d="M90 106 L91 98 M90 106 L97 102"/>' +
    lbl(84, 128, w(lang, 'BRAIN', 'CEREBRO')) +
    lbl(208, 112, w(lang, 'CLOSE-UP', 'DE CERCA'), 'end') +
    lbl(58, 142, w(lang, 'EYE', 'OJO'))
  );
}

/** A club coming down from above onto the top of the head, the strike marked, then the gill cut. */
function club(): string {
  return (
    FISH +
    GILL_CUT +
    '<path class="dp-club" d="M74 2 L58 16"/>' +
    '<path class="dp-clubhead" d="M60 13 L46 27"/>' +
    '<path class="dp-hit" d="M36 30 L28 24 M56 32 L64 28 M46 32 L46 31"/>' +
    badge(1, 22, 22) + badge(2, 72, 78)
  );
}

/** A bucket of seawater with the whole fish head down under the water, the gill cut open, blood drifting out. */
function bleed(lang: Lang): string {
  return (
    '<path class="dp-sea" d="M55 24 L65 106 L155 106 L165 24 Z"/>' +
    '<path class="dp-line" d="M52 16 L64 106 L156 106 L168 16"/>' +
    '<path class="dp-line" d="M46 16 L174 16"/>' +
    '<path class="dp-water" d="M55 24 C66 19 74 29 86 24 C98 19 106 29 118 24 C130 19 138 29 150 24 L165 24"/>' +
    // the fish, head down: its own outline turned, small enough to sit under the water line
    '<g transform="translate(80 106.4) rotate(-90) scale(0.4)">' + FISH + GILL_CUT + '</g>' +
    // blood: soft clouds drifting out of the gills
    '<ellipse class="dp-blood" cx="122" cy="80" rx="10" ry="6"/><ellipse class="dp-blood" cx="134" cy="66" rx="8" ry="5"/>' +
    '<ellipse class="dp-blood" cx="80" cy="88" rx="8" ry="5"/><ellipse class="dp-blood" cx="140" cy="50" rx="6" ry="4"/>' +
    '<text class="dp-clock" x="178" y="46">3 min</text>' +
    '<path class="dp-line" d="M190 66 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M190 66 L190 59 M190 66 L196 69"/>' +
    lbl(110, 10, w(lang, 'SEAWATER', 'AGUA DE MAR')) +
    badge(1, 118, 96) + badge(2, 190, 92)
  );
}

/** A cooler about half full of ice in seawater, the fish under it, a wet cloth over the top; below, ice in a big fish's belly. */
function slurry(lang: Lang): string {
  const cube = (x: number, y: number, r = 0) =>
    `<rect class="dp-cube" x="${x}" y="${y}" width="12" height="12" rx="1.5" transform="rotate(${r} ${x + 6} ${y + 6})"/>`;
  const back: [number, number, number][] = [[28, 50, -10], [46, 46, 6], [150, 48, -6], [168, 52, 10], [184, 46, -4], [96, 46, 8], [120, 50, -8], [70, 48, 4]];
  const front: [number, number, number][] = [
    [26, 92, 8], [40, 82, -6], [54, 94, 12], [70, 88, -10], [88, 94, 4], [106, 90, -8], [124, 94, 10], [142, 88, -4],
    [158, 94, 6], [174, 86, -12], [184, 96, 8], [32, 68, 4], [176, 68, -6], [164, 76, 12],
  ];
  return (
    '<path class="dp-sea" d="M22 40 L22 108 L198 108 L198 40 Z"/>' +
    back.map(([x, y, r]) => cube(x, y, r)).join('') +
    '<g transform="translate(48 52) scale(0.6)">' + FISH + '</g>' +
    front.map(([x, y, r]) => cube(x, y, r)).join('') +
    '<path class="dp-water" d="M22 42 C40 37 50 47 70 42 C90 37 100 47 120 42 C140 37 150 47 170 42 L198 42"/>' +
    '<path class="dp-line" d="M20 30 L20 108 L200 108 L200 30"/>' +
    // a wet cloth laid over the top, keeping the sun off
    '<path class="dp-cloth" d="M12 30 C40 24 70 34 100 28 C130 22 160 32 208 26 L208 34 C160 40 130 30 100 36 C70 42 40 32 12 38 Z"/>' +
    '<text class="dp-clock" x="208" y="16" text-anchor="end">≈ 0 °C / 32 °F</text>' +
    lbl(12, 16, w(lang, 'COVERED', 'CUBIERTO'), 'start') +
    badge(1, 32, 86) + badge(2, 100, 22) +
    // big fish: guts out, belly packed with ice
    '<g transform="translate(20 118) scale(0.5)">' + FISH + '</g>' +
    '<path class="dp-belly" d="M50 150 C62 157 86 157 98 150 C86 145 62 145 50 150 Z"/>' +
    cube(54, 144, -6) + cube(68, 146, 8) + cube(82, 144, -4) +
    lbl(140, 138, w(lang, 'BIG FISH:', 'PEZ GRANDE:'), 'start') +
    lbl(140, 150, w(lang, 'ICE IN', 'HIELO EN'), 'start') +
    lbl(140, 162, w(lang, 'THE BELLY', 'LA PANZA'), 'start') +
    badge(3, 122, 156)
  );
}

export function methodArt(id: MethodId, lang: Lang = 'en'): string {
  switch (id) {
    case 'ikejime': return ikejime(lang);
    case 'club': return club();
    case 'bleed': return bleed(lang);
    case 'slurry': return slurry(lang);
  }
}

/** Each drawing's viewBox: the ikejime adds a close-up of the head, the slurry a big fish with ice in its belly. */
export const ART_VB: Record<MethodId, string> = { ikejime: '0 0 220 156', club: '0 0 220 88', bleed: '0 0 220 112', slurry: '0 0 220 168' };

/** How many numbered marks each drawing carries, for the tests that keep them in step with the lists. */
export const ART_MARKS: Record<MethodId, number> = { ikejime: 4, club: 2, bleed: 2, slurry: 3 };

/** One small picture per science step (content.ts STEPS ids), in a 160 by 64 box. */
export function scienceArt(id: string, lang: Lang): string {
  switch (id) {
    case 'stress': {
      // two fuel gauges: a calm fish starts full, a fish that fought starts nearly empty
      const g = (x: number, fill: number, word: string) =>
        `<rect class="dp-gauge" x="${x}" y="14" width="60" height="18"/><rect class="dp-fuel" x="${x + 2}" y="16" width="${Math.round(56 * fill)}" height="14"/>` + lbl(x + 30, 50, word);
      return g(10, 1, w(lang, 'CALM', 'TRANQUILO')) + g(90, 0.15, w(lang, 'FOUGHT', 'LUCHÓ')) + lbl(80, 10, w(lang, 'FUEL LEFT', 'COMBUSTIBLE'));
    }
    case 'acid': {
      // a pH ruler from 7.0 down to 6.4: rested fish barely move, stressed fish drop five times as far in 3 hours
      const x = (ph: number) => 16 + ((7 - ph) / 0.6) * 90;
      let s = `<path class="dp-line" d="M${x(7)} 32 H${x(6.4)}"/>`;
      for (const p of [7, 6.8, 6.6, 6.4]) s += `<path class="dp-line" d="M${x(p)} 28 V36"/>` + lbl(x(p), 45, p.toFixed(1));
      s += `<path class="dp-good" d="M${x(7)} 20 H${x(6.9)}"/><path class="dp-bad" d="M${x(7)} 53 H${x(6.5)}"/>`;
      s += lbl(x(6.9) + 4, 23, w(lang, 'RESTED', 'DESCANSADO'), 'start') + lbl(x(6.5) + 4, 56, w(lang, 'STRESSED', 'ESTRESADO'), 'start');
      return s + lbl(158, 30, 'pH', 'end') + lbl(158, 42, w(lang, 'IN 3 H', 'EN 3 H'), 'end');
    }
    case 'rigor':
      // how soon a cod starts to stiffen: half an hour hot after a fight, 14 hours calm on ice
      return (
        `<rect class="dp-bad-f" x="10" y="12" width="6" height="14"/>` + lbl(22, 23, w(lang, 'HOT, FOUGHT: 30 MIN', 'CALOR, LUCHÓ: 30 MIN'), 'start') +
        `<rect class="dp-good-f" x="10" y="36" width="140" height="14"/>` + lbl(14, 62, w(lang, 'ICE, CALM: 14 H', 'HIELO, TRANQUILO: 14 H'), 'start')
      );
    case 'blood': {
      // two fillets: a bled one is clean, an unbled one is spotted and dark
      const fillet = (x: number, cls: string) => `<path class="${cls}" d="M${x} 30 C${x + 10} 14 ${x + 50} 12 ${x + 64} 24 L${x + 64} 36 C${x + 50} 48 ${x + 10} 46 ${x} 30 Z"/>`;
      const spots = [[96, 26], [108, 32], [120, 22], [130, 34], [112, 40], [140, 28]].map(([cx, cy]) => `<circle class="dp-spot" cx="${cx}" cy="${cy}" r="3"/>`).join('');
      return fillet(8, 'dp-meat') + fillet(88, 'dp-meat dp-dark') + spots + lbl(40, 58, w(lang, 'BLED', 'DESANGRADO')) + lbl(120, 58, w(lang, 'NOT BLED', 'CON SANGRE'));
    }
    case 'k': {
      // the flavour fades step by step: tasty, then flat, then bitter
      const words = lang === 'es' ? ['SABROSO', 'PLANO', 'AMARGO'] : ['TASTY', 'FLAT', 'BITTER'];
      return [0, 1, 2].map((i) => `<circle class="dp-taste t${i}" cx="${28 + i * 52}" cy="26" r="${14 - i * 3}"/>` + lbl(28 + i * 52, 56, words[i])).join('') +
        '<path class="dp-arrow" d="M46 26 H62 M58 22 L62 26 L58 30 M98 26 H116 M112 22 L116 26 L112 30"/>';
    }
    case 'bacteria': {
      // bacteria in a day: a few on ice, many in the heat
      const dots = (x0: number, n: number) => Array.from({ length: n }, (_, i) => `<circle class="dp-bug" cx="${x0 + (i % 8) * 7}" cy="${16 + Math.floor(i / 8) * 7}" r="2.4"/>`).join('');
      return dots(36, 1) + lbl(40, 58, w(lang, 'ON ICE', 'EN HIELO')) + dots(96, 28) + lbl(122, 58, '28–30 °C') + '<path class="dp-line" d="M80 8 V60"/>';
    }
  }
  return '';
}
