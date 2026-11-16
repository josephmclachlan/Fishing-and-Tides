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

/** The 63 °C check: a probe at an angle into the thickest part of a fillet, and a fork flaking it. 320 by 150. */
export function tempArt(_lang: Lang): string {
  return (
    '<path class="nt-ground" d="M10 118H300"/>' +
    // a fillet: thick at the head end, tapering to the tail, with its flake lines
    '<path class="nt-m-fillet" d="M20 118C22 98 50 80 104 78C156 76 214 92 252 112L262 118Z"/>' +
    '<path class="nt-m-flk" d="M58 88C52 98 58 108 52 116M86 82C80 94 86 106 80 116M116 80C110 92 116 106 110 116M146 82C140 94 146 106 140 116M176 88C170 98 176 108 170 116"/>' +
    // the thermometer: its dial reads the target, its probe goes in at an angle to the middle of the thickest part
    '<path class="nt-m-probe" d="M64 36L104 98"/>' +
    '<rect class="nt-m-dialok" x="22" y="6" width="80" height="30"/>' +
    '<text class="nt-m-dialt2" x="62" y="28" text-anchor="middle">63 °C</text>' +
    txt(22, 54, '145 °F', 'start') +
    // a fork pressing into the thin end: the flesh separates into flakes
    '<path class="nt-m-fork" d="M206 102L212 84M212 104L218 86M218 106L224 88M210 84L226 90M218 87L246 36"/>' +
    '<path class="nt-m-flake" d="M226 106l10-5 4 6-10 5zM238 100l9-3 3 6-9 3z"/>' +
    badge(1, 118, 20) + badge(2, 270, 96)
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

/** Whole fish fried: three slashes to the bone, lying in shallow hot oil, 5 to 6 minutes a side. 320 by 130. */
export function friedArt(lang: Lang): string {
  return (
    pan(50, 220, 78) +
    fish(135, 90, 1.35) +
    '<path class="nt-m-cut" d="M114 76L120 102M132 74L138 104M150 76L154 102"/>' +
    // the oil, over the lower half of the fish
    '<path class="nt-m-oil" d="M52 94H218L214 100C212 108 206 110 198 110H72C64 110 58 108 56 100Z"/>' +
    '<path d="M50 78H220"/>' +
    bubbles([[80, 100], [178, 98], [200, 102], [100, 104]]).replace(/nt-m-bub/g, 'nt-m-bub nt-m-bubo') +
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

/** Fish in coconut sauce: fillets half under a white coconut sauce in a pan on low heat, rice on a plate beside. 320 by 130. */
export function sauceArt(lang: Lang): string {
  return (
    steam(96, 44) +
    pan(50, 220, 74) +
    '<path class="nt-m-body" d="M78 80C86 68 112 66 122 80C112 90 88 90 78 80Z"/><path class="nt-m-body" d="M140 78C148 66 174 64 184 78C174 88 150 88 140 78Z"/>' +
    '<path class="nt-m-sauce" d="M52 82C76 76 92 88 118 82S164 76 192 82S212 80 218 82L214 96C212 104 206 106 198 106H72C64 106 58 104 56 96Z"/>' +
    '<path class="nt-m-herb" d="M88 86l4-3M140 88l4-3M170 84l4-3M110 92l4-3"/>' +
    flames(90, 190, 124) +
    // rice on a plate
    '<ellipse class="nt-m-plate" cx="282" cy="104" rx="32" ry="8"/><path class="nt-m-rice" d="M258 102C260 86 304 86 306 102Z"/>' +
    '<circle class="nt-m-coco" cx="282" cy="40" r="20"/><circle class="nt-m-milk" cx="282" cy="40" r="12"/>' +
    tag(10, 10, w(lang, '8 TO 10 MIN, LOW HEAT', '8 A 10 MIN, FUEGO BAJO')) + tag(10, 38, '63 °C')
  );
}

/** Escabeche in four steps: fry the slices, boil the vinegar and vegetables, pour over in a jar, keep in the fridge. 320 by 130. */
export function escabecheArt(lang: Lang): string {
  const arrow = (x: number) => `<path class="nt-flow" d="M${x} 84H${x + 14}"/><path class="nt-head" d="M${x + 9} 79L${x + 15} 84L${x + 9} 89"/>`;
  return (
    // 1 fry
    pan(8, 66, 74).split('<path class="nt-m-handle"')[0] +
    '<path class="nt-m-body" d="M18 74l14-4 2 6-14 4zM38 72l14-4 2 6-14 4z"/>' +
    flames(14, 62, 120) + arrow(72) +
    // 2 boil the vinegar with the vegetables
    steam(104, 58) +
    '<path class="nt-m-pan" d="M96 62H146V100a8 8 0 0 1-8 8H104a8 8 0 0 1-8-8Z"/>' +
    '<circle class="nt-m-ring" cx="112" cy="76" r="5"/><circle class="nt-m-root" cx="128" cy="80" r="4"/>' +
    flames(98, 146, 120) + arrow(150) +
    // 3 poured over the fish in a jar
    '<rect class="nt-m-glass" x="172" y="44" width="56" height="70"/><rect class="nt-m-lid" x="176" y="34" width="48" height="10"/>' +
    '<path class="nt-m-body" d="M180 100L220 94M182 82L222 76M180 64L218 58"/><circle class="nt-m-ring" cx="196" cy="106" r="5"/><circle class="nt-m-root" cx="212" cy="106" r="4"/>' +
    arrow(232) +
    // 4 the fridge
    '<rect class="nt-m-glass" x="256" y="30" width="54" height="86"/><path d="M256 62H310M264 44v10M264 80v14"/>' +
    txt(37, 128, w(lang, 'FRY', 'FREÍR'), 'middle', 'nt-lbl nt-lbl-s') + txt(121, 128, w(lang, 'BOIL 3 MIN', 'HERVIR 3 MIN'), 'middle', 'nt-lbl nt-lbl-s') +
    txt(200, 128, w(lang, 'POUR OVER', 'VERTER'), 'middle', 'nt-lbl nt-lbl-s') + txt(283, 128, w(lang, 'FRIDGE', 'NEVERA'), 'middle', 'nt-lbl nt-lbl-s')
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

/** Spiny lobster tails (no claws) in a pot of boiling salted water: 8 to 10 minutes, red shell, white meat. 320 by 130. */
export function lobsterArt(lang: Lang): string {
  /** A lobster tail from above, its fan at the right, starting at (x, y). */
  const tail = (x: number, y: number) =>
    `<path class="nt-m-red" d="M${x} ${y - 9}H${x + 44}L${x + 52} ${y - 14}L${x + 60} ${y - 6}V${y + 6}L${x + 52} ${y + 14}L${x + 44} ${y + 9}H${x}Q${x - 6} ${y} ${x} ${y - 9}Z"/>` +
    [10, 20, 30, 40].map((d) => `<path d="M${x + d} ${y - 9}V${y + 9}"/>`).join('') + `<path d="M${x + 44} ${y - 9}V${y + 9}"/>`;
  return (
    steam(96, 30) +
    '<path class="nt-m-pan" d="M70 40H230V104a12 12 0 0 1-12 12H82a12 12 0 0 1-12-12Z"/>' +
    '<path class="nt-m-handle" d="M70 52H54M230 52H246"/>' +
    '<path class="nt-m-water" d="M72 54H228V104a10 10 0 0 1-10 10H82a10 10 0 0 1-10-10Z"/>' +
    tail(96, 74) + tail(134, 96) +
    bubbles([[90, 100], [206, 70], [214, 100], [120, 106]]) +
    flames(84, 214, 130) +
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
    txt(244, 30, w(lang, 'VENOM', 'VENENO'), 'start', 'nt-lbl nt-m-bad') + txt(312, 112, w(lang, 'FLESH: NO VENOM', 'CARNE: SIN VENENO'), 'end')
  );
}

/** A jack: deep body, blunt head, two dorsal fins, a row of scutes on the narrow tail stalk, a forked tail, and its two lengths. 320 by 176. */
export function fishArt(_lang: Lang): string {
  const scutes = [196, 204, 212, 220, 228].map((x) => `<path class="nt-m-scute" d="M${x} 88L${x + 4} 86L${x + 8} 88L${x + 4} 94Z"/>`).join('');
  return (
    '<path class="nt-m-body" d="M40 92C42 66 76 50 124 52C166 54 204 76 236 88L262 56L250 92L262 128L236 96C204 110 166 128 124 130C76 132 42 118 40 92Z"/>' +
    '<path class="nt-m-body" d="M106 54L112 40L120 42L124 53M132 53L144 40C168 46 194 64 212 78M150 128L164 116C186 108 202 102 212 98"/>' +
    '<path d="M60 84C100 70 150 76 190 90L236 91M84 96C96 98 108 104 116 112M40 92L50 95"/>' + scutes +
    '<circle class="nt-m-eye" cx="58" cy="82" r="3.2"/>' +
    '<path class="nt-rule" d="M40 100V168M250 94V152M262 128V168"/>' +
    '<path d="M40 146H250M40 140V152M250 140V152M40 162H262M40 156V168M262 156V168"/>' +
    badge(1, 150, 28) + badge(2, 212, 112) + badge(3, 286, 92) + badge(4, 140, 146) + badge(5, 150, 162)
  );
}

/** A ray from above (kite-shaped, wing tip to wing tip measured) and a crab (shell measured, spines not counted). 320 by 130. */
export function widthsArt(lang: Lang): string {
  return (
    '<path class="nt-m-body" d="M110 40C124 46 160 64 196 74C160 82 128 96 110 104C92 96 60 82 24 74C60 64 96 46 110 40Z"/>' +
    '<path d="M110 104V128"/><circle class="nt-m-eye" cx="102" cy="58" r="2.5"/><circle class="nt-m-eye" cx="118" cy="58" r="2.5"/>' +
    '<path class="nt-rule" d="M24 22V74M196 22V74"/><path d="M24 22H196M24 16V28M196 16V28"/>' +
    // the crab: shell, a sharp spine at each side, claws and legs
    '<path class="nt-m-red" d="M240 64C250 52 286 52 296 64L310 66L298 72C292 88 244 88 238 72L226 66Z"/>' +
    '<path d="M248 66C240 54 236 46 240 40M288 66C296 54 300 46 296 40M244 80L232 92M250 84L242 98M286 84L294 98M292 80L304 92"/>' +
    '<path class="nt-m-red" d="M240 40C232 38 230 30 236 28L242 34L238 34ZM296 40C304 38 306 30 300 28L294 34L298 34Z"/>' +
    '<path class="nt-rule" d="M238 72V108M298 72V108"/><path d="M238 108H298M238 102V114M298 102V114"/>' +
    badge(1, 110, 22) + badge(2, 268, 108) +
    txt(52, 112, w(lang, 'RAY', 'RAYA'), 'middle', 'nt-lbl') + txt(268, 128, w(lang, 'CRAB', 'JAIBA'), 'middle', 'nt-lbl')
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
    badge(1, x(14.75) + 20, Y) + badge(2, x(22.1) + 20, Y)
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
    txt(14, 40, w(lang, 'WARM', 'TIBIA'), 'start') + txt(14, 128, w(lang, 'COLD', 'FRÍA'), 'start') +
    txt(150, 40, w(lang, 'THERMOCLINE ↓', 'TERMOCLINA ↓'), 'middle') +
    '<path d="M300 22V138M294 130L300 138L306 130"/>' +
    txt(292, 140, w(lang, 'DEPTH', 'PROFUNDIDAD'), 'end') +
    badge(1, 40, 82)
  );
}

/** A spearfisher on one breath, face down with mask, snorkel and speargun, a line up to a float with the dive flag. 320 by 176. */
export function floatArt(_lang: Lang): string {
  return (
    '<rect class="nt-sea" x="0" y="44" width="320" height="132"/>' +
    '<path class="nt-ground" d="M0 44H320"/>' +
    // the float, flying the red dive flag with its white stripe
    '<path d="M70 44V6"/><rect class="nt-m-flag" x="70" y="6" width="34" height="22"/><path class="nt-m-flagd" d="M70 6L104 28"/>' +
    '<circle class="nt-m-buoy" cx="70" cy="44" r="12"/>' +
    '<path class="nt-m-line" d="M70 56C70 100 140 112 200 126"/>' +
    fish(122, 100, 0.55) +
    // the diver, head left: snorkel, mask, body, fins, and the speargun held out in front
    '<path class="nt-m-gun" d="M206 126H150M150 126l-6 -2v4z"/>' +
    '<path class="nt-m-snork" d="M214 116V100Q214 96 210 96"/>' +
    '<path class="nt-m-torso" d="M218 122L250 124"/><path class="nt-m-limb" d="M216 124L206 126M250 124L266 120M250 124L266 128"/>' +
    '<path class="nt-m-finp" d="M264 117L276 112L276 121ZM264 127L276 128L274 134Z"/>' +
    '<circle class="nt-m-head" cx="212" cy="120" r="5"/><rect class="nt-m-mask" x="204" y="119" width="5" height="6" rx="1"/>' +
    badge(1, 120, 20) + badge(2, 56, 90) + badge(3, 236, 150)
  );
}

/** A descender: a weight clipped to a fish's lip takes it from the boat back down to the depth where it was caught. 320 by 176. */
export function descendArt(_lang: Lang): string {
  return (
    '<rect class="nt-sea" x="0" y="40" width="320" height="136"/>' +
    '<path class="nt-ground" d="M0 40H320"/>' +
    '<path class="nt-m-boat" d="M40 30H110L100 42H50ZM74 30V8L100 28"/>' +
    '<path class="nt-m-line" d="M96 42C96 80 170 90 170 126"/>' +
    '<path class="nt-flow" d="M146 80V140"/><path class="nt-head" d="M138 134L146 144L154 134"/>' +
    // the clamp on the lip, the fish hanging from it, the weight under it
    '<path class="nt-m-clip" d="M170 126l-3 6M170 126l3 6"/>' +
    fish(193, 133, 0.7) +
    '<path class="nt-m-line" d="M170 134V142"/><path class="nt-m-wt" d="M163 142H177L175 156H165Z"/>' +
    '<path class="nt-rule" d="M16 162H304"/>' +
    badge(1, 128, 110)
  );
}

/** Main line, leader and tippet, then a circle hook (point turned in, barb showing) and a barbless J hook. 320 by 176. */
export function tackleArt(lang: Lang): string {
  return (
    '<path class="nt-m-main" d="M10 40H100"/><path class="nt-m-lead" d="M100 40H190"/><path class="nt-m-tip" d="M190 40H244"/>' +
    '<circle class="nt-m-knot" cx="100" cy="40" r="3.5"/><circle class="nt-m-knot" cx="190" cy="40" r="3.5"/><circle class="nt-m-hk" cx="248" cy="40" r="4"/>' +
    txt(55, 62, w(lang, 'MAIN LINE', 'LÍNEA'), 'middle', 'nt-lbl nt-lbl-s') + txt(145, 62, w(lang, 'LEADER', 'LÍDER'), 'middle', 'nt-lbl nt-lbl-s') + txt(218, 62, w(lang, 'TIPPET', 'TIPPET'), 'middle', 'nt-lbl nt-lbl-s') +
    // circle hook: the point turns back in toward the shank; its barb is the small tooth
    '<circle class="nt-m-hk" cx="80" cy="88" r="5.5"/><path class="nt-m-hk" d="M80 94V120C80 152 128 152 128 120C128 108 118 102 106 106"/>' +
    '<path class="nt-m-hk" d="M106 106L112 113"/>' +
    txt(140, 92, w(lang, 'BARB', 'LENGÜETA'), 'start', 'nt-lbl nt-lbl-s') + '<path class="nt-tick" d="M138 98L114 110"/>' +
    // barbless J hook: a plain point, no tooth
    '<circle class="nt-m-hk" cx="250" cy="88" r="5.5"/><path class="nt-m-hk" d="M250 94V140C250 164 214 166 212 142V118"/>' +
    txt(206, 126, w(lang, 'NO BARB', 'SIN LENGÜETA'), 'end', 'nt-lbl nt-lbl-s') +
    badge(1, 145, 24) + badge(2, 218, 24) + badge(3, 60, 160) + badge(4, 276, 160)
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
