/**
 * Drawings for the Cooking and Words tabs (Rules and Seasons use pictograms and heat grids only). Same rules as
 * art/water.ts: flat line art in the page's ink, fills from the page tokens (see notes-misc.css, `.nt-m-*`), words only
 * as short caps labels in both languages, numbered badges match each figure's marks. Each cooking drawing carries its
 * time in a tag. Small animations (steam, bubbles, the descending fish) stop under reduced motion.
 */
import { badge, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** A small ink tag with a time or a temperature, top left of a cooking drawing. */
const tag = (x: number, y: number, t: string) => {
  const wd = Math.round(t.length * 7.1 + 16);
  return `<g class="nt-m-tag"><rect x="${x}" y="${y}" width="${wd}" height="22"/><text class="nt-lbl" x="${x + wd / 2}" y="${y + 15}" text-anchor="middle">${t}</text></g>`;
};
const txt = (x: number, y: number, t: string, anchor = 'middle', cls = 'nt-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

/** A side-on fish with its nose to the left, centred on (x, y). */
const fish = (x: number, y: number, s = 1, cls = 'nt-m-body') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path class="${cls}" d="M-30 0C-20-13 0-14 14-6L30-14V14L14 6C0 14-20 13-30 0Z"/><circle class="nt-m-eye" cx="-20" cy="-2" r="2"/></g>`;

/** Steam: three wavy lines that rise and fade. */
const steam = (x: number, y: number) =>
  [0, 14, 28].map((dx, i) => `<path class="nt-m-steam" style="animation-delay:${i * 0.5}s" d="M${x + dx} ${y} c-5-6 5-10 0-16s5-10 0-16"/>`).join('');
/** Flames under a pan or pot. */
const flames = (x0: number, x1: number, y: number) => {
  let s = '';
  for (let x = x0; x + 14 <= x1; x += 18) s += `<path class="nt-m-fire" d="M${x} ${y} c0-8 6-10 7-18 3 5 7 8 7 18z"/>`;
  return s;
};
const bubbles = (pts: [number, number][]) => pts.map(([x, y], i) => `<circle class="nt-m-bub" style="animation-delay:${i * 0.4}s" cx="${x}" cy="${y}" r="3"/>`).join('');

/** The 63 °C check: a probe in the thickest part of a fillet, and a fork that flakes it. 320 by 150. */
export function tempArt(_lang: Lang): string {
  return (
    '<path class="nt-m-body" d="M20 118C28 88 78 70 140 72C192 74 224 96 234 118Z"/>' +
    '<path class="nt-rule" d="M56 108C88 94 130 92 174 98"/>' +
    '<path class="nt-m-probe" d="M118 34V90"/>' +
    '<rect class="nt-m-dial" x="98" y="8" width="40" height="26"/>' +
    '<text class="nt-lbl nt-m-dialt" x="118" y="25" text-anchor="middle">63 °C</text>' +
    '<path class="nt-ground" d="M10 118H250"/>' +
    '<text class="nt-m-big" x="282" y="62" text-anchor="middle">63 °C</text>' +
    txt(282, 82, '145 °F') +
    '<path class="nt-m-fork" d="M270 146V118M260 118V102M270 118V102M280 118V102M260 118H280"/>' +
    badge(1, 156, 26) + badge(2, 304, 112)
  );
}

/** Ceviche: cubes of fish in a cold bowl set on ice, and limes. 320 by 130. */
export function cevicheArt(lang: Lang): string {
  const cubes = [[92, 66], [110, 70], [128, 64], [146, 70], [164, 65], [182, 69], [100, 82], [120, 84], [140, 80], [160, 84], [180, 82]];
  const ice = [86, 118, 150, 182].map((x) => `<rect class="nt-m-ice" x="${x}" y="104" width="28" height="18"/>`).join('');
  return (
    ice +
    '<path class="nt-m-glass" d="M70 54H214C214 90 192 104 142 104S70 90 70 54Z"/>' +
    cubes.map(([x, y]) => `<rect class="nt-m-cube" x="${x}" y="${y}" width="13" height="13"/>`).join('') +
    '<path class="nt-rule" d="M76 62H208"/>' +
    '<circle class="nt-m-lime" cx="262" cy="78" r="24"/><path d="M262 54V102M238 78H286M245 61L279 95M279 61L245 95"/>' +
    tag(10, 10, w(lang, '15 TO 30 MIN, COLD', '15 A 30 MIN, FRÍO'))
  );
}

/** A frying or simmering pan from the side, with a handle. */
const pan = (x0: number, x1: number, y: number) =>
  `<path class="nt-m-pan" d="M${x0} ${y}H${x1}L${x1 - 4} ${y + 22}C${x1 - 6} ${y + 30} ${x1 - 14} ${y + 32} ${x1 - 22} ${y + 32}H${x0 + 22}C${x0 + 14} ${y + 32} ${x0 + 6} ${y + 30} ${x0 + 4} ${y + 22}Z"/><path class="nt-m-handle" d="M${x1} ${y + 6}H${x1 + 72}"/>`;

/** Whole fish fried: three slashes to the bone, hot oil, 5 to 6 minutes a side. 320 by 130. */
export function friedArt(lang: Lang): string {
  return (
    fish(130, 70, 1.35) +
    '<path class="nt-m-cut" d="M108 56L116 84M126 54L134 84M144 56L150 84"/>' +
    pan(50, 220, 78) +
    bubbles([[82, 92], [176, 90], [200, 94]]) +
    flames(70, 200, 124) +
    tag(10, 10, w(lang, '5 TO 6 MIN A SIDE', '5 A 6 MIN POR LADO')) + tag(10, 38, '63 °C')
  );
}

/** Rondón: a pot of coconut broth with roots and fish, steaming, a coconut beside it. 320 by 130. */
export function rondonArt(lang: Lang): string {
  return (
    steam(100, 52) +
    '<path class="nt-m-pan" d="M60 58H220V104a12 12 0 0 1-12 12H72a12 12 0 0 1-12-12Z"/>' +
    '<path class="nt-m-handle" d="M60 70H44M220 70H236"/>' +
    '<path class="nt-m-milk" d="M60 58C84 46 104 64 128 52S178 48 220 58Z"/>' +
    '<rect class="nt-m-root" x="82" y="46" width="22" height="14"/><rect class="nt-m-root" x="164" y="44" width="20" height="14"/>' +
    '<path class="nt-m-body" d="M118 54C126 44 146 44 154 54C146 62 126 62 118 54Z"/>' +
    flames(76, 204, 130) +
    '<circle class="nt-m-coco" cx="270" cy="82" r="26"/><circle class="nt-m-milk" cx="270" cy="82" r="17"/>' +
    tag(10, 10, w(lang, 'FISH: 8 TO 10 MIN', 'PESCADO: 8 A 10 MIN'))
  );
}

/** Fish in coconut sauce: fillets in a covered pan on low heat. 320 by 130. */
export function sauceArt(lang: Lang): string {
  return (
    steam(96, 50) +
    '<path class="nt-m-milk" d="M62 82C90 74 120 88 150 80S206 76 218 82V100H62Z"/>' +
    '<path class="nt-m-body" d="M84 80C92 68 118 66 128 80C118 90 94 90 84 80Z"/><path class="nt-m-body" d="M146 78C154 66 180 64 190 78C180 88 156 88 146 78Z"/>' +
    '<path class="nt-m-lid" d="M60 74H220"/><path class="nt-m-leaf" d="M200 66c8-4 12-2 14 4"/>' +
    pan(50, 230, 74).replace('nt-m-pan', 'nt-m-pan nt-m-open') +
    flames(90, 190, 124) +
    '<circle class="nt-m-coco" cx="282" cy="40" r="20"/><circle class="nt-m-milk" cx="282" cy="40" r="12"/>' +
    tag(10, 10, w(lang, '8 TO 10 MIN, LOW HEAT', '8 A 10 MIN, FUEGO BAJO')) + tag(10, 38, '63 °C')
  );
}

/** Escabeche: fried fish under hot vinegar with onion, carrot and cucumber, then the fridge. 320 by 130. */
export function escabecheArt(lang: Lang): string {
  return (
    steam(30, 62) +
    '<path class="nt-m-pan" d="M22 66H82V104a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8Z"/>' +
    '<path class="nt-flow" d="M94 88H118"/><path class="nt-head" d="M112 82L120 88L112 94"/>' +
    '<rect class="nt-m-glass" x="126" y="32" width="86" height="84"/><rect class="nt-m-lid" x="132" y="20" width="74" height="12"/>' +
    '<path class="nt-m-body" d="M138 96L190 90M140 78L196 70M138 60L192 52"/><circle class="nt-m-ring" cx="170" cy="104" r="6"/><circle class="nt-m-ring" cx="190" cy="104" r="6"/><circle class="nt-m-root" cx="150" cy="104" r="5"/>' +
    '<rect class="nt-m-glass" x="240" y="30" width="54" height="86"/><path d="M240 62H294M248 44v10M248 80v14"/>' +
    '<path class="nt-flow" d="M216 76H236"/>' +
    txt(267, 128, w(lang, 'FRIDGE', 'NEVERA')) +
    tag(10, 8, w(lang, 'BOIL 3 MIN', 'HIERVA 3 MIN'))
  );
}

/** Whole fish wrapped in banana leaf, tied with string, on hot coals. 320 by 130. */
export function leafArt(lang: Lang): string {
  return (
    flames(70, 250, 122) +
    '<path class="nt-ground" d="M40 98H280"/>' +
    '<path class="nt-m-leaf" d="M64 72C100 50 220 50 256 72C220 94 100 94 64 72Z"/>' +
    '<path d="M76 72H244"/><path class="nt-m-string" d="M126 56V88M194 56V88"/>' +
    '<path d="M64 72L46 62M64 72L46 82M256 72L274 62M256 72L274 82"/>' +
    tag(10, 8, w(lang, '12 TO 15 MIN A SIDE', '12 A 15 MIN POR LADO')) + tag(10, 36, '63 °C')
  );
}

/** Lobster tails in boiling salted water: 8 to 10 minutes, red shell, white meat. 320 by 130. */
export function lobsterArt(lang: Lang): string {
  const segs = [186, 202, 218].map((x) => `<path d="M${x} 52V82"/>`).join('');
  return (
    bubbles([[40, 110], [76, 102], [262, 108], [292, 100]]) +
    '<path d="M122 58L52 28M122 76L48 106"/>' +
    '<path class="nt-m-red" d="M118 66C118 46 146 42 166 50L232 48V84L166 82C146 90 118 86 118 66Z"/>' +
    segs +
    '<path class="nt-m-red" d="M232 48L262 38V94L232 84Z"/>' +
    '<path class="nt-m-red" d="M122 58L98 40C86 34 80 46 90 54L108 64M122 76L98 92C86 98 80 86 90 78L108 68"/>' +
    tag(10, 8, w(lang, '8 TO 10 MIN', '8 A 10 MIN'))
  );
}

/** A live crab boiled 12 to 15 minutes from the return to a boil, shell bright orange-red. 320 by 130. */
export function crabArt(lang: Lang): string {
  return (
    bubbles([[40, 110], [76, 100], [262, 108], [292, 98]]) +
    '<path d="M122 74L88 90M126 84L98 108M198 74L232 90M194 84L222 108M130 62L96 74M190 62L224 74"/>' +
    '<path class="nt-m-red" d="M112 60L90 44C78 34 66 44 76 54M112 60L100 42C100 30 112 30 112 40"/>' +
    '<path class="nt-m-red" d="M208 60L230 44C242 34 254 44 244 54M208 60L220 42C220 30 208 30 208 40"/>' +
    '<ellipse class="nt-m-red" cx="160" cy="72" rx="52" ry="32"/>' +
    '<circle class="nt-m-eye" cx="148" cy="46" r="3"/><circle class="nt-m-eye" cx="172" cy="46" r="3"/>' +
    tag(10, 8, w(lang, '12 TO 15 MIN', '12 A 15 MIN'))
  );
}

/** Octopus: beaten, then simmered gently 45 to 60 minutes. 320 by 130. */
export function octopusArt(lang: Lang): string {
  const arms = [
    'M136 64C118 84 96 82 86 104', 'M146 70C136 92 118 100 116 122', 'M156 72C154 94 144 110 148 124', 'M166 72C170 94 180 108 176 124',
    'M176 70C188 92 206 98 210 120', 'M186 64C206 82 228 80 238 102', 'M130 54C108 62 92 56 80 70', 'M192 54C214 62 230 56 242 70',
  ];
  return (
    arms.map((d) => `<path class="nt-m-arm" d="${d}"/>`).join('') +
    '<path class="nt-m-body" d="M128 56C124 24 196 24 194 56C192 70 130 70 128 56Z"/>' +
    '<circle class="nt-m-eye" cx="148" cy="52" r="3"/><circle class="nt-m-eye" cx="174" cy="52" r="3"/>' +
    tag(10, 8, w(lang, '45 TO 60 MIN, LOW HEAT', '45 A 60 MIN, FUEGO BAJO'))
  );
}

/** Lionfish: the venom is in the spines, the flesh is safe. 320 by 130. */
export function lionfishArt(lang: Lang): string {
  const spines = ['M118 52L96 16', 'M132 48L122 10', 'M146 46L146 8', 'M160 46L170 10', 'M174 48L196 14', 'M188 52L220 22', 'M110 100L96 122', 'M124 104L116 126'];
  return (
    spines.map((d) => `<path class="nt-m-spine" d="${d}"/>`).join('') +
    fish(160, 78, 2.1) +
    '<path class="nt-m-cut" d="M126 62L132 96M146 58L152 98M166 58L172 98"/>' +
    txt(244, 30, w(lang, 'VENOM', 'VENENO'), 'start', 'nt-lbl nt-m-bad') + txt(236, 112, w(lang, 'FLESH: NO VENOM', 'CARNE: SIN VENENO'), 'start')
  );
}

/** A jack with its dorsal fin, scutes and forked tail, and the two lengths measured on it. 320 by 176. */
export function fishArt(_lang: Lang): string {
  return (
    '<path class="nt-m-body" d="M40 90C70 58 140 54 200 74L258 54L240 90L258 126L200 106C140 126 70 122 40 90Z"/>' +
    '<path class="nt-m-body" d="M104 64L116 40L150 44L164 66M168 68L186 52L200 74"/>' +
    '<path d="M176 84v12M184 84v12M192 84v12"/><circle class="nt-m-eye" cx="62" cy="86" r="3"/>' +
    '<path class="nt-rule" d="M40 98V160M240 96V140M258 128V160"/>' +
    '<path d="M40 136H240M40 130V142M240 130V142M40 156H258M40 150V162M258 150V162"/>' +
    badge(1, 134, 26) + badge(2, 184, 120) + badge(3, 278, 90) + badge(4, 140, 136) + badge(5, 150, 156)
  );
}

/** A ray's disc width and a crab's carapace width. 320 by 130. */
export function widthsArt(lang: Lang): string {
  return (
    '<path class="nt-m-body" d="M24 74C56 44 98 40 118 52C138 40 180 44 212 74C180 98 140 98 118 94C98 98 56 98 24 74Z"/><path d="M118 94V122"/>' +
    '<circle class="nt-m-eye" cx="106" cy="66" r="2.5"/><circle class="nt-m-eye" cx="130" cy="66" r="2.5"/>' +
    '<path d="M24 28H212M24 22V34M212 22V34"/>' +
    '<ellipse class="nt-m-red" cx="268" cy="78" rx="34" ry="24"/><path d="M234 78L224 70M302 78L312 70M244 60L240 50M292 60L296 50"/>' +
    '<path d="M234 112H302M234 106V118M302 106V118"/>' +
    badge(1, 118, 28) + badge(2, 268, 112) +
    txt(52, 112, w(lang, 'RAY', 'RAYA'), 'middle', 'nt-lbl nt-lbl-s') + txt(268, 50, w(lang, 'CRAB', 'JAIBA'), 'middle', 'nt-lbl nt-lbl-s')
  );
}

/** Tides across a month: big (spring) near new and full moon, small (neap) near the half moons. A sketch, 320 by 156. */
export function tidesArt(lang: Lang): string {
  // A smooth rise and fall about once a day (this coast is mostly one high and one low a day), its size swelling at new
  // and full moon (spring) and shrinking at the half moons (neap). Moons drawn as seen from here: unlit part dark.
  const x = (d: number) => 20 + (d / 29.5) * 280;
  const amp = (d: number) => 0.6 + 0.4 * Math.cos((4 * Math.PI * d) / 29.5);
  const pts: string[] = [];
  for (let d = 0; d <= 29.5; d += 0.04) pts.push(`${x(d).toFixed(1)} ${(70 - 36 * amp(d) * Math.sin(2 * Math.PI * d)).toFixed(1)}`);
  const env: string[] = [];
  for (let d = 0; d <= 29.5; d += 0.5) env.push(`${x(d).toFixed(1)} ${(70 - 36 * amp(d)).toFixed(1)}`);
  for (let d = 29.5; d >= 0; d -= 0.5) env.push(`${x(d).toFixed(1)} ${(70 + 36 * amp(d)).toFixed(1)}`);
  const Y = 128, R = 8;
  const moon = (d: number, kind: 'new' | 'first' | 'full' | 'last', name: string) => {
    const cx = x(d);
    const lit =
      kind === 'full' ? `<circle class="nt-m-moonf" cx="${cx}" cy="${Y}" r="${R}"/>`
      : kind === 'new' ? ''
      : `<path class="nt-m-moonf" d="M${cx} ${Y - R}A${R} ${R} 0 0 ${kind === 'first' ? 1 : 0} ${cx} ${Y + R}Z"/>`;
    const anchor = d < 1 ? 'start' : d > 28.5 ? 'end' : 'middle';
    const tx = d < 1 ? cx - R : d > 28.5 ? cx + R : cx;
    return `<circle class="nt-m-moon" cx="${cx}" cy="${Y}" r="${R}"/>` + lit + txt(tx, Y + 22, name, anchor);
  };
  const NEW = w(lang, 'NEW', 'NUEVA'), FULL = w(lang, 'FULL', 'LLENA'), HALF = w(lang, 'HALF', 'CUARTO');
  return (
    `<polygon class="nt-m-env" points="${env.join(' ')}"/>` +
    '<path class="nt-rule" d="M16 70H304"/>' +
    `<path class="nt-m-wave" d="M${pts.join('L')}"/>` +
    moon(0.3, 'new', NEW) + moon(7.4, 'first', HALF) + moon(14.75, 'full', FULL) + moon(22.1, 'last', HALF) + moon(29.2, 'new', NEW) +
    txt(x(0.3) - 8, 16, w(lang, 'SPRING', 'VIVA'), 'start') + txt(x(14.75), 16, w(lang, 'SPRING', 'VIVA'), 'middle') + txt(x(29.2) + 8, 16, w(lang, 'SPRING', 'VIVA'), 'end') +
    txt(x(7.4), 16, w(lang, 'NEAP', 'MUERTA'), 'middle') + txt(x(22.1), 16, w(lang, 'NEAP', 'MUERTA'), 'middle') +
    badge(1, x(14.75) - 32, 12) + badge(2, x(22.1) - 26, 12)
  );
}

/** Thermocline: warm water on top, cold below, a thin layer between where fish gather. 320 by 150. */
export function thermoArt(lang: Lang): string {
  return (
    '<rect class="nt-m-warmw" x="0" y="14" width="320" height="58"/>' +
    '<rect class="nt-m-coldw" x="0" y="92" width="320" height="58"/>' +
    '<rect class="nt-m-midw" x="0" y="72" width="320" height="20"/>' +
    '<path class="nt-rule" d="M0 72H320M0 92H320"/>' +
    '<path class="nt-ground" d="M0 14H320"/>' +
    fish(96, 82, 0.6) + fish(176, 80, 0.5) + fish(236, 84, 0.55) +
    txt(14, 38, w(lang, 'WARM', 'TIBIA'), 'start') + txt(14, 128, w(lang, 'COLD', 'FRÍA'), 'start') +
    '<path d="M296 22V138M290 130L296 138L302 130"/>' +
    badge(1, 40, 82)
  );
}

/** A spearfisher on one breath, with the line to the float on the surface. 320 by 176. */
export function floatArt(_lang: Lang): string {
  return (
    '<rect class="nt-sea" x="0" y="44" width="320" height="132"/>' +
    '<path class="nt-ground" d="M0 44H320"/>' +
    '<path d="M70 44V12M70 12L96 20L70 28"/><circle class="nt-m-buoy" cx="70" cy="44" r="12"/>' +
    '<path class="nt-m-line" d="M70 56C70 100 140 112 196 124"/>' +
    fish(122, 100, 0.55) +
    '<g class="nt-man"><circle cx="206" cy="124" r="6"/><path d="M212 124H252M252 124L270 116M252 124L270 134M226 124L242 116"/></g>' +
    badge(1, 100, 20) + badge(2, 56, 90) + badge(3, 232, 146)
  );
}

/** A descender device: a weight on a line sends a fish from the boat back down to the depth where it was caught. 320 by 176. */
export function descendArt(_lang: Lang): string {
  return (
    '<rect class="nt-sea" x="0" y="40" width="320" height="136"/>' +
    '<path class="nt-ground" d="M0 40H320"/>' +
    '<path class="nt-m-boat" d="M40 30H110L100 42H50ZM74 30V8L100 28"/>' +
    '<path class="nt-m-line" d="M96 42C96 90 170 100 170 150"/>' +
    '<path class="nt-flow" d="M170 100V140"/><path class="nt-head" d="M162 134L170 144L178 134"/>' +
    '<path class="nt-m-body" d="M160 150H180L184 166H156Z"/>' +
    fish(214, 152, 0.7) +
    '<path class="nt-rule" d="M16 150H150M200 150H304"/>' +
    badge(1, 150, 120)
  );
}

/** Main line, leader and tippet, then a circle hook and a barbless hook. 320 by 176. */
export function tackleArt(lang: Lang): string {
  return (
    '<path class="nt-m-main" d="M10 40H100"/><path class="nt-m-lead" d="M100 40H190"/><path class="nt-m-tip" d="M190 40H250"/>' +
    '<circle class="nt-m-knot" cx="100" cy="40" r="3.5"/><circle class="nt-m-knot" cx="190" cy="40" r="3.5"/>' +
    '<path d="M250 40C254 40 258 44 258 48V58C258 66 250 66 248 60"/><path d="M262 28C268 28 272 32 272 38"/>' +
    txt(55, 62, w(lang, 'MAIN LINE', 'LÍNEA'), 'middle', 'nt-lbl nt-lbl-s') + txt(145, 62, w(lang, 'LEADER', 'LÍDER'), 'middle', 'nt-lbl nt-lbl-s') + txt(220, 62, w(lang, 'TIPPET', 'TIPPET'), 'middle', 'nt-lbl nt-lbl-s') +
    '<path d="M90 88V140C90 164 52 166 50 142C50 122 74 114 90 128"/><path d="M90 88L84 96M90 88L96 96"/>' +
    '<path d="M250 88V140C250 164 214 166 212 142L222 126"/><path class="nt-m-barb" d="M222 126L214 130"/><path d="M250 88L244 96M250 88L256 96"/>' +
    badge(1, 145, 24) + badge(2, 220, 24) + badge(3, 70, 150) + badge(4, 232, 150)
  );
}

export const MISC_FIGS = {
  temp: { vb: '0 0 320 150', art: tempArt },
  ceviche: { vb: '0 0 320 130', art: cevicheArt },
  fried: { vb: '0 0 320 130', art: friedArt },
  rondon: { vb: '0 0 320 130', art: rondonArt },
  sauce: { vb: '0 0 320 130', art: sauceArt },
  escabeche: { vb: '0 0 320 130', art: escabecheArt },
  leaf: { vb: '0 0 320 130', art: leafArt },
  lobster: { vb: '0 0 320 130', art: lobsterArt },
  crab: { vb: '0 0 320 130', art: crabArt },
  octopus: { vb: '0 0 320 130', art: octopusArt },
  lionfish: { vb: '0 0 320 130', art: lionfishArt },
  fishparts: { vb: '0 0 320 176', art: fishArt },
  widths: { vb: '0 0 320 130', art: widthsArt },
  tides: { vb: '0 0 320 160', art: tidesArt },
  thermo: { vb: '0 0 320 150', art: thermoArt },
  floatline: { vb: '0 0 320 176', art: floatArt },
  descender: { vb: '0 0 320 176', art: descendArt },
  tackle: { vb: '0 0 320 176', art: tackleArt },
} satisfies Record<string, Fig>;
