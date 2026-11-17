/**
 * Drawings for the Cooking and Words tabs (Rules and Seasons use pictograms and heat grids only). Same rules as
 * art/water.ts: flat line art in the page's ink, fills from the page tokens (see notes-misc.css, `.nt-m-*`), words only
 * as short caps labels in both languages, numbered badges match each figure's marks. Each cooking drawing carries its
 * time in a tag. Small animations (steam, bubbles, the descending fish) stop under reduced motion.
 */
import { badge, type Fig } from './fig';
import { reefFish } from './fishkit';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** A small ink tag with a time or a temperature, top left of a cooking drawing. */
const tag = (x: number, y: number, t: string) => {
  const wd = Math.round(t.length * 7.1 + 16);
  return `<g class="nt-m-tag"><rect x="${x}" y="${y}" width="${wd}" height="22"/><text class="nt-lbl" x="${x + wd / 2}" y="${y + 15}" text-anchor="middle">${t}</text></g>`;
};
const txt = (x: number, y: number, t: string, anchor = 'middle', cls = 'nt-lbl') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;

/** A rect with its corners cut at 45 degrees by `c`, as path data (the square look: no round corners). */
const cham = (x: number, y: number, wd: number, h: number, c: number) =>
  `M${x + c} ${y}H${x + wd - c}L${x + wd} ${y + c}V${y + h - c}L${x + wd - c} ${y + h}H${x + c}L${x} ${y + h - c}V${y + c}Z`;
/** A pot from the side, (x0, y0) to (x1, y1), its bottom corners cut. */
const pot = (x0: number, x1: number, y0: number, y1: number, c = 8) => `M${x0} ${y0}H${x1}V${y1 - c}L${x1 - c} ${y1}H${x0 + c}L${x0} ${y1 - c}Z`;

/** Steam: three zigzag wisps that rise and fade. */
const steam = (x: number, y: number) =>
  [0, 14, 28].map((dx, i) => `<path class="nt-m-steam" style="animation-delay:${i * 0.5}s" d="M${x + dx} ${y}l-4-5 4-5-4-5 4-5-4-5 4-5"/>`).join('');
/** Flames under a pan or pot: faceted tongues, each flickering on its own beat. */
const flames = (x0: number, x1: number, y: number) => {
  let s = '';
  for (let x = x0, i = 0; x + 14 <= x1; x += 18, i++)
    s += `<path class="nt-m-fire" style="animation-delay:${(i % 3) * -0.27}s" d="M${x} ${y}L${x + 1} ${y - 9}L${x + 5} ${y - 13}L${x + 7} ${y - 19}L${x + 10} ${y - 11}L${x + 13} ${y - 7}L${x + 14} ${y}Z"/>`;
  return s;
};
const bubbles = (pts: [number, number][]) => pts.map(([x, y], i) => `<rect class="nt-m-bub" style="animation-delay:${i * 0.4}s" x="${x - 2.5}" y="${y - 2.5}" width="5" height="5"/>`).join('');

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
    '<path class="nt-m-glass" d="M70 54H214L208 78L192 96L172 104H112L92 96L76 78Z"/>' +
    cubes.map(([x, y]) => `<rect class="nt-m-cube" x="${x}" y="${y}" width="13" height="13"/>`).join('') +
    '<path class="nt-rule" d="M76 62H208"/>' +
    '<circle class="nt-m-lime" cx="262" cy="78" r="24"/><path d="M262 54V102M238 78H286M245 61L279 95M279 61L245 95"/>' +
    tag(10, 10, w(lang, '15 TO 30 MIN, COLD', '15 A 30 MIN, FRÍO'))
  );
}

/** A frying or simmering pan from the side, with a handle. */
const pan = (x0: number, x1: number, y: number) =>
  `<path class="nt-m-pan" d="M${x0} ${y}H${x1}L${x1 - 6} ${y + 24}L${x1 - 14} ${y + 32}H${x0 + 14}L${x0 + 6} ${y + 24}Z"/>` +
  `<path class="nt-m-handle" d="M${x1} ${y + 6}H${x1 + 34}"/><rect class="nt-m-grip" x="${x1 + 34}" y="${y + 2}" width="34" height="8"/>`;

/** Whole fish fried: three slashes to the bone, lying in shallow hot oil, 5 to 6 minutes a side. 320 by 130. */
export function friedArt(lang: Lang): string {
  return (
    pan(50, 220, 78) +
    // the shared reef fish, golden, three slashes to the bone on its side
    reefFish(88, 64, 0.9, { body: 'nt-m-gold', extra: '<path class="nt-m-score" d="M37 8L33 31M49 7L45 32M61 9L57 31"/>' }) +
    // the oil, over the lower third of the fish
    '<path class="nt-m-oil" d="M53.5 92H216.5L214 102L206 110H64L56 102Z"/>' +
    '<path d="M50 78H220"/>' +
    bubbles([[80, 100], [178, 98], [200, 102], [100, 104]]).replace(/nt-m-bub/g, 'nt-m-bub nt-m-bubo') +
    flames(70, 200, 124) +
    tag(10, 10, w(lang, '5 TO 6 MIN A SIDE', '5 A 6 MIN POR LADO')) + tag(10, 38, '63 °C')
  );
}

/** Rondón: a pot of coconut broth with roots and fish, steaming, a coconut beside it. 320 by 130. */
export function rondonArt(lang: Lang): string {
  return (
    steam(192, 40) +
    `<path class="nt-m-pan" d="${pot(60, 220, 58, 116, 10)}"/>` +
    '<path class="nt-m-handle" d="M60 70H44M220 70H236"/>' +
    // a whole small fish floating in the broth, the roots (yuca, ñame) bobbing beside it
    reefFish(122, 39, 0.36, { plain: true, body: 'nt-m-gold' }) +
    '<path class="nt-m-milk" d="M60 58L76 53L96 57L116 52L136 57L156 52L176 57L196 52L220 58Z"/>' +
    '<rect class="nt-m-root" x="82" y="46" width="22" height="14"/><rect class="nt-m-root" x="168" y="44" width="20" height="14"/>' +
    flames(76, 204, 130) +
    '<circle class="nt-m-coco" cx="270" cy="82" r="26"/><circle class="nt-m-milk" cx="270" cy="82" r="17"/>' +
    tag(10, 10, w(lang, 'FISH: 8 TO 10 MIN', 'PESCADO: 8 A 10 MIN'))
  );
}

/** Fish in coconut sauce: fillets half under a white coconut sauce in a pan on low heat, rice on a plate beside. 320 by 130. */
export function sauceArt(lang: Lang): string {
  return (
    steam(150, 66) +
    pan(50, 220, 74) +
    '<path class="nt-m-fillet" d="M76 84L82 72L100 68L122 74L126 84Z"/><path class="nt-m-fillet" d="M138 82L144 70L162 66L184 72L188 82Z"/>' +
    '<path class="nt-m-flk" d="M92 70L90 82M106 70L104 82M154 68L152 80M168 68L166 80"/>' +
    '<path class="nt-m-sauce" d="M52 82L70 78L88 84L106 78L124 84L142 78L160 84L178 78L196 84L218 82L214 98L206 106H64L56 98Z"/>' +
    '<path class="nt-m-herb" d="M88 86l4-3M140 88l4-3M170 84l4-3M110 92l4-3"/>' +
    flames(90, 190, 124) +
    // rice on a plate
    '<path class="nt-m-rice" d="M266 110L272 100L282 94H294L304 100L310 110Z"/><path class="nt-m-plate" d="M254 110H318L310 118H262Z"/>' +
    '<circle class="nt-m-coco" cx="282" cy="40" r="20"/><circle class="nt-m-milk" cx="282" cy="40" r="12"/>' +
    tag(10, 10, w(lang, '8 TO 10 MIN, LOW HEAT', '8 A 10 MIN, FUEGO BAJO')) + tag(10, 38, '63 °C')
  );
}

/** Escabeche in four steps: fry the slices, boil the vinegar and vegetables, pour over in a jar, keep in the fridge. 320 by 130. */
export function escabecheArt(lang: Lang): string {
  const arrow = (x: number) => `<path class="nt-flow" d="M${x} 84H${x + 14}"/><path class="nt-head" d="M${x + 9} 79L${x + 15} 84L${x + 9} 89"/>`;
  return (
    // 1 fry
    pan(8, 66, 70).split('<path class="nt-m-handle"')[0] +
    '<path class="nt-m-fillet" d="M18 70l14-4 2 6-14 4zM38 68l14-4 2 6-14 4z"/>' +
    flames(14, 62, 118) + arrow(72) +
    // 2 boil the vinegar with the vegetables
    steam(104, 54) +
    `<path class="nt-m-pan" d="${pot(96, 146, 58, 102, 7)}"/>` +
    '<circle class="nt-m-ring" cx="112" cy="72" r="5"/><rect class="nt-m-root" x="124" y="72" width="8" height="8"/>' +
    flames(98, 146, 118) + arrow(150) +
    // 3 poured over the fish in a jar
    '<rect class="nt-m-glass" x="172" y="44" width="56" height="70"/><rect class="nt-m-lid" x="176" y="34" width="48" height="10"/>' +
    '<path class="nt-m-slice" d="M180 100L220 94M182 82L222 76M180 64L218 58"/><circle class="nt-m-ring" cx="196" cy="106" r="5"/><rect class="nt-m-root" x="208" y="102" width="8" height="8"/>' +
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
    flames(150, 296, 128) +
    '<path class="nt-m-grate" d="M136 108H310M150 108V113M190 108V113M230 108V113M270 108V113"/>' +
    // the whole fish, its head and tail out of a parcel of banana leaf tied twice with string
    reefFish(150, 42, 1.3) +
    `<path class="nt-m-leaf" d="${cham(176, 33, 82, 70, 10)}"/>` +
    '<path class="nt-m-vein" d="M176 68H258M186 68L194 38M200 68L208 36M214 68L222 36M228 68L236 36M242 68L250 40M186 68L194 98M200 68L208 100M214 68L222 100M228 68L236 100M242 68L250 96"/>' +
    '<path class="nt-m-fold" d="M176 50L258 46"/>' +
    '<path class="nt-m-string" d="M198 33V103M238 33V103"/>' +
    tag(10, 8, w(lang, '12 TO 15 MIN A SIDE', '12 A 15 MIN POR LADO')) + tag(10, 36, '63 °C')
  );
}

/** Spiny lobster tails (no claws) in a pot of boiling salted water: 8 to 10 minutes, red shell, white meat. 320 by 130. */
export function lobsterArt(lang: Lang): string {
  /** A lobster tail from above, its fan at the right, starting at (x, y). */
  const tail = (x: number, y: number) =>
    `<path class="nt-m-red" d="M${x} ${y - 9}H${x + 44}L${x + 52} ${y - 14}L${x + 60} ${y - 6}V${y + 6}L${x + 52} ${y + 14}L${x + 44} ${y + 9}H${x}L${x - 5} ${y}Z"/>` +
    [10, 20, 30, 40].map((d) => `<path d="M${x + d} ${y - 9}V${y + 9}"/>`).join('') + `<path d="M${x + 44} ${y - 9}V${y + 9}"/>`;
  return (
    steam(150, 34) +
    `<path class="nt-m-pan" d="${pot(70, 230, 40, 116, 10)}"/>` +
    '<path class="nt-m-handle" d="M70 52H54M230 52H246"/>' +
    `<path class="nt-m-water" d="${pot(72, 228, 54, 114, 9)}"/>` +
    tail(96, 74) + tail(134, 96) +
    bubbles([[90, 100], [206, 70], [214, 100], [120, 106]]) +
    flames(84, 214, 130) +
    tag(10, 8, w(lang, '8 TO 10 MIN', '8 A 10 MIN'))
  );
}

/** A live crab boiled 12 to 15 minutes from the return to a boil, shell bright orange-red. 320 by 130. */
export function crabArt(lang: Lang): string {
  // Drawn as its left half and mirrored about x = 180: a faceted shell, angled legs, an arm to a pincer claw.
  const half = (m: boolean) => {
    const t = m ? ' transform="translate(360 0) scale(-1 1)"' : '';
    return (
      `<g${t}>` +
      '<path class="nt-m-leg" d="M142 80L118 88L108 104M146 90L126 102L120 120M154 96L142 110L142 126M140 70L116 70L102 80"/>' +
      // the arm, then the claw: a palm with a fixed finger below and a hinged one above, a gap between them
      '<path class="nt-m-red" d="M140 56L124 48L114 52L118 58L136 64Z"/>' +
      '<g transform="translate(116 55) rotate(-172) scale(1.15)"><path class="nt-m-red" d="M0 -7L18 -10L26 -6V8L18 11L0 7Z"/>' +
      '<path class="nt-m-red" d="M26 2L46 7L43 11L26 8ZM26 -6L48 -10L44 -3L27 -1Z"/></g>' +
      '<rect class="nt-m-eye" x="167" y="24" width="6" height="6"/><path d="M170 30V40"/>' +
      '</g>'
    );
  };
  return (
    bubbles([[40, 110], [76, 100], [270, 112], [300, 98]]) +
    half(false) + half(true) +
    '<path class="nt-m-red" d="M126 70L136 50L158 40H202L224 50L234 70L222 92L200 100H160L138 92Z"/>' +
    '<path class="nt-m-seam" d="M158 40L166 58H194L202 40M166 58L160 80M194 58L200 80M136 50L150 60M224 50L210 60"/>' +
    tag(10, 8, w(lang, '12 TO 15 MIN', '12 A 15 MIN'))
  );
}

/** Octopus: beaten, then simmered gently 45 to 60 minutes. 320 by 130. */
export function octopusArt(lang: Lang): string {
  const arms = [
    'M172 58L150 54L134 58L124 50L128 44', 'M176 66L150 78L132 76L118 88L122 98', 'M182 70L166 92L146 100L140 118L148 122', 'M192 72L188 96L176 110L180 124',
    'M206 72L210 98L204 112L210 124', 'M214 72L222 96L236 108L234 122', 'M222 70L240 88L260 94L266 112L258 116', 'M228 64L252 72L270 68L284 80L280 90',
  ];
  return (
    arms.map((d) => `<path class="nt-m-arm" d="${d}"/>`).join('') +
    '<path class="nt-m-body" d="M168 62L172 40L186 30H214L228 40L232 62L222 72H178Z"/>' +
    '<path class="nt-m-seam" d="M180 40L190 34H210"/>' +
    '<rect class="nt-m-eye" x="184" y="54" width="5" height="5"/><rect class="nt-m-eye" x="211" y="54" width="5" height="5"/>' +
    tag(10, 8, w(lang, '45 TO 60 MIN, LOW HEAT', '45 A 60 MIN, FUEGO BAJO'))
  );
}

/**
 * Lionfish: the venom is in the spines, the flesh is safe. 320 by 130. Its own shape, not the reef fish: a long head
 * with a tentacle over the eye, thirteen tall separate dorsal spines joined low by membrane (red: venomous), a soft
 * dorsal and a round fan of a tail, huge fan pectorals of free rays, and venomous pelvic and anal spines. Zebra stripes.
 */
export function lionfishArt(lang: Lang): string {
  /** The body's top and bottom edges, as straight runs (x, y). */
  const TOP: [number, number][] = [[78, 78], [88, 64], [104, 56], [128, 52], [170, 54], [204, 62], [230, 72], [238, 76]];
  const BOT: [number, number][] = [[78, 78], [88, 90], [106, 98], [128, 102], [170, 100], [204, 92], [230, 82], [238, 76]];
  const yAt = (e: [number, number][], x: number) => {
    for (let i = 1; i < e.length; i++) if (x <= e[i][0]) return +(e[i - 1][1] + ((x - e[i - 1][0]) / (e[i][0] - e[i - 1][0])) * (e[i][1] - e[i - 1][1])).toFixed(1);
    return e[e.length - 1][1];
  };
  const body = 'M' + TOP.map(([x, y]) => `${x} ${y}`).join('L') + 'L' + BOT.slice(0, -1).reverse().map(([x, y]) => `${x} ${y}`).join('L') + 'Z';
  // spiny dorsal: 13 spines, tallest in the middle, leaning back; the membrane joins them halfway up, deeply notched
  const sx = Array.from({ length: 13 }, (_, i) => 104 + i * 7.5);
  const tipY = (i: number) => 26 - 14 * Math.sin((Math.PI * (i + 1)) / 14);
  let spines = '', memb = `M${sx[0]} ${yAt(TOP, sx[0])}`;
  sx.forEach((x, i) => {
    const y0 = yAt(TOP, x), x1 = x + 10, y1 = +tipY(i).toFixed(1);
    spines += `M${x} ${y0}L${x1} ${y1}`;
    memb += `L${+(x + 5).toFixed(1)} ${+(y0 + (y1 - y0) * 0.5).toFixed(1)}L${+(x + 6.8).toFixed(1)} ${+(y0 + (y1 - y0) * 0.26).toFixed(1)}`;
  });
  const xe = sx[12] + 6;
  memb += `L${xe} ${yAt(TOP, xe)}Z`;
  // zebra stripes, clipped to the body by its own edges
  let stripes = '';
  for (let x = 114; x <= 226; x += 12) stripes += `M${x} ${yAt(TOP, x) + 2}L${x - 3} ${yAt(BOT, x - 3) - 2}`;
  // the pectoral fan: free rays from behind the gill, the membrane notched between their tips
  const pb: [number, number] = [120, 80];
  const tips: [number, number][] = [[200, 96], [196, 106], [186, 113], [172, 117], [156, 118], [142, 116], [130, 110]];
  let fan = `M${pb[0]} ${pb[1]}`, rays = '';
  tips.forEach(([x, y], i) => {
    fan += `L${x} ${y}`;
    if (i < tips.length - 1) fan += `L${+((x + tips[i + 1][0]) / 2 - (x - pb[0]) * 0.06).toFixed(1)} ${+((y + tips[i + 1][1]) / 2 - (y - pb[1]) * 0.2).toFixed(1)}`;
    rays += `M${pb[0]} ${pb[1]}L${x} ${y}`;
  });
  return (
    // fins behind the body: soft dorsal, the tail fan, soft anal fin
    '<path class="nt-m-memb" d="M206 63L214 46L230 54L234 74Z"/><path class="nt-m-ray" d="M210 62L216 48M218 66L224 51M226 70L230 54"/>' +
    '<path class="nt-m-memb" d="M236 76L250 62L262 64L268 76L262 88L250 90Z"/><path class="nt-m-ray" d="M238 76L250 63M238 76L262 66M238 76H267M238 76L262 86M238 76L250 89"/>' +
    '<path class="nt-m-memb" d="M206 92L230 82L228 100L214 104Z"/>' +
    `<path class="nt-m-memb" d="${memb}"/>` +
    `<path class="nt-m-lion" d="${body}"/>` +
    `<path class="nt-m-stripe" d="${stripes}"/>` +
    // head: gill cover, mouth, eye with its tentacle
    '<path d="M120 54L112 78L120 99M78 78L92 80"/>' +
    '<path class="nt-m-stripe" d="M106 57L103 97"/>' +
    '<circle class="nt-m-eye" cx="97" cy="70" r="3.6"/><path class="nt-m-memb" d="M95 66L97 56L100 65Z"/>' +
    `<path class="nt-m-memb" d="${fan}"/><path class="nt-m-ray" d="${rays}"/>` +
    // venomous spines in red: the dorsal, the two pelvic and the three anal
    `<path class="nt-m-spine" d="${spines}M110 98L100 122M118 100L112 124M204 92L208 112M210 90L216 110M216 87L224 106"/>` +
    txt(244, 30, w(lang, 'VENOM', 'VENENO'), 'start', 'nt-lbl nt-m-bad') + '<path class="nt-m-lead" d="M240 26H204"/>' +
    txt(314, 124, w(lang, 'FLESH: NO VENOM', 'CARNE: SIN VENENO'), 'end')
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
    reefFish(80, 75, 0.3, { plain: true, body: 'nt-m-sf' }) + reefFish(160, 74, 0.27, { plain: true, flip: true, body: 'nt-m-sf' }) + reefFish(222, 76, 0.3, { plain: true, body: 'nt-m-sf' }) +
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
    reefFish(102, 92, 0.4, { plain: true, body: 'nt-m-sf' }) +
    // the diver, head left: snorkel, mask, body, fins, and the speargun held out in front
    '<path class="nt-m-gun" d="M206 126H150M150 126l-6 -2v4z"/>' +
    '<path class="nt-m-snork" d="M214 116V98H209"/>' +
    '<path class="nt-m-torso" d="M218 122L250 124"/><path class="nt-m-limb" d="M216 124L206 126M250 124L266 120M250 124L266 128"/>' +
    '<path class="nt-m-finp" d="M264 117L276 112L276 121ZM264 127L276 128L274 134Z"/>' +
    '<circle class="nt-m-head" cx="212" cy="120" r="5"/><rect class="nt-m-mask" x="204" y="119" width="5" height="6"/>' +
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
    reefFish(172, 123.3, 0.42, { plain: true, body: 'nt-m-sf' }) +
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
