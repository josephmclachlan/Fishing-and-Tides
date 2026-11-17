/**
 * Small animal pictures for the First aid tab, so a reader can match what hurt them to a heading: each one is drawn the
 * way the animal looks, with the one feature that tells it apart (the man o' war's blue float, the lionfish's fans, the
 * urchin's long spines, the ray's tail spine). 64 by 48 each, page tokens only (classes `nt-an-` in notes-aid.css).
 */

/** Wavy tentacles hanging from x positions along y0, `len` long. */
const tentacles = (xs: number[], y0: number, len: number) =>
  xs.map((x, i) => `M${x} ${y0} q${i % 2 ? 3 : -3} ${len / 4} 0 ${len / 2} t0 ${len / 2}`).join(' ');

/** Lines radiating from (cx, cy), from radius r0 to r1, `n` of them. */
const rays = (cx: number, cy: number, r0: number, r1: number, n: number, from = 0, to = 2 * Math.PI) =>
  Array.from({ length: n }, (_, i) => {
    const a = from + ((to - from) * (i + 0.5)) / n;
    const p = (r: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    return `M${p(r0)} L${p(r1)}`;
  }).join(' ');

export const ANIMALS = {
  jelly:
    '<path class="nt-an-jel" d="M14 22 C14 8 50 8 50 22 C44 24 20 24 14 22 Z"/>' +
    `<path class="nt-an-ten" d="${tentacles([18, 24, 40, 46], 23, 22)}"/>` +
    '<path class="nt-an-arm" d="M28 23 c-2 6 2 10 -1 18 M32 23 c2 6 -2 12 1 20 M36 23 c-2 6 2 10 -1 16"/>',
  manowar:
    '<path class="nt-an-float" d="M8 20 C8 10 18 6 34 8 C46 9 56 14 56 20 C46 24 18 24 8 20 Z"/>' +
    '<path class="nt-an-crest" d="M16 12 C22 2 30 6 34 3 C38 6 44 2 48 12"/>' +
    `<path class="nt-an-ten" d="${tentacles([14, 20, 26, 32, 38, 44, 50], 22, 26)}"/>`,
  firecoral:
    '<path class="nt-an-fire" d="M10 46 L12 28 L8 16 L14 14 L18 26 L20 10 L26 8 L26 24 L30 18 L34 20 L30 46 Z M34 46 L36 30 L34 18 L40 14 L44 24 L46 12 L52 12 L50 30 L54 26 L56 30 L52 46 Z"/>',
  sealice:
    '<path class="nt-an-suit" d="M20 4 L24 4 C26 12 38 12 40 4 L44 4 L46 18 C46 30 44 34 40 44 C36 40 28 40 24 44 C20 34 18 30 18 18 Z"/>' +
    '<g class="nt-an-dots"><circle cx="26" cy="20" r="1.6"/><circle cx="34" cy="24" r="1.6"/><circle cx="28" cy="30" r="1.6"/><circle cx="38" cy="32" r="1.6"/><circle cx="31" cy="16" r="1.6"/><circle cx="24" cy="26" r="1.6"/><circle cx="36" cy="18" r="1.6"/></g>',
  urchin:
    `<path class="nt-an-spn" d="${rays(32, 30, 10, 24, 22, Math.PI, 2 * Math.PI)} ${rays(32, 30, 10, 16, 6, 0, Math.PI)}"/>` +
    '<circle class="nt-an-ball" cx="32" cy="30" r="11"/><path class="nt-an-bed" d="M2 46 H62"/>',
  lionfish:
    '<path class="nt-an-fan" d="M24 28 C26 40 32 46 40 46 C46 42 50 36 50 30 C40 32 30 30 24 28 Z"/>' +
    '<path class="nt-an-fan2" d="M28 30 L36 45 M30 30 L44 42 M34 30 L49 34"/>' +
    '<path class="nt-an-body" d="M6 26 C12 18 26 16 40 18 C48 19 52 22 54 24 C52 28 46 32 38 32 C24 33 12 32 6 26 Z"/>' +
    '<path class="nt-an-strp" d="M16 20 V31 M22 18 V32 M28 18 V32 M34 18 V32 M40 19 V31 M46 21 V29"/>' +
    '<path class="nt-an-ven" d="M18 19 L14 4 M22 18 L20 2 M26 18 L26 2 M30 18 L32 3 M34 18 L37 5 M38 18 L42 8"/>' +
    '<path class="nt-an-tail" d="M54 24 L62 18 V30 Z"/><circle class="nt-an-eye" cx="11" cy="24" r="1.6"/>',
  scorpion:
    '<path class="nt-an-rock" d="M2 46 C8 38 20 36 32 38 C44 36 56 38 62 46 Z"/>' +
    '<path class="nt-an-mott" d="M6 32 C8 22 20 18 34 20 C44 21 52 26 56 30 C50 34 40 36 30 36 C18 36 8 36 6 32 Z"/>' +
    '<path class="nt-an-ven" d="M20 21 L18 11 M25 20 L24 9 M30 20 L31 10 M35 20 L37 11 M40 21 L43 13"/>' +
    '<path class="nt-an-blot" d="M16 26 l4 2 l-3 3 Z M30 24 l5 3 l-4 3 Z M42 27 l4 2 l-3 2 Z"/><path class="nt-an-tail" d="M56 30 L62 25 V36 Z"/><circle class="nt-an-eye" cx="12" cy="27" r="1.8"/>',
  catfish:
    '<path class="nt-an-body" d="M8 28 C12 20 26 18 40 20 C48 21 52 24 54 26 C52 30 46 33 38 33 C24 34 12 33 8 28 Z"/>' +
    '<path class="nt-an-ven" d="M24 19 L22 6 M14 30 L10 40"/>' +
    '<path class="nt-an-whisk" d="M8 27 C2 24 0 18 2 14 M8 29 C2 30 0 36 2 40 M9 30 C6 34 6 38 8 42"/>' +
    '<path class="nt-an-tail" d="M54 26 L62 19 V33 Z"/><circle class="nt-an-eye" cx="13" cy="25" r="1.6"/>',
  stingray:
    '<path class="nt-an-ray" d="M6 24 C12 18 20 8 28 4 C32 12 40 20 44 24 C40 28 32 36 28 44 C20 40 12 30 6 24 Z"/>' +
    '<path class="nt-an-tl" d="M44 24 C50 24 56 25 63 28"/><path class="nt-an-ven" d="M47 24 L54 20"/>' +
    '<circle class="nt-an-eye" cx="14" cy="21" r="1.5"/><circle class="nt-an-eye" cx="14" cy="27" r="1.5"/>',
  cone:
    '<path class="nt-an-cone" d="M6 22 L40 8 C50 6 58 12 58 22 C58 32 50 38 40 36 Z"/>' +
    '<path class="nt-an-tent" d="M14 20 l3 -4 l3 4 Z M22 16 l3 -4 l3 4 Z M30 13 l3 -4 l3 4 Z M20 26 l3 -4 l3 4 Z M28 22 l3 -4 l3 4 Z M36 18 l3 -4 l3 4 Z M30 30 l3 -4 l3 4 Z M38 26 l3 -4 l3 4 Z M44 20 l3 -4 l3 4 Z"/>' +
    '<path class="nt-an-spire" d="M48 10 C54 12 58 16 58 22"/><path class="nt-an-ven" d="M6 22 L-0 26"/>',
  moray:
    // An eel coming out of a crack in angular rock, jaws open with teeth, the fin running unbroken along its back.
    '<path class="nt-an-rock" d="M2 46 V22 L8 10 L20 5 L31 12 L33 46 Z M42 46 L45 34 L54 30 L62 35 V46 Z"/>' +
    '<path class="nt-an-fin" d="M30 35 C32.6 25.4 38.6 19 47.4 16 L48.6 18.6 C40.6 21.4 35 27.4 32.8 37 Z"/>' +
    '<path class="nt-an-eel" d="M29 44 C30.6 33 36.4 24.6 46.4 20 L55.4 17.8 L61.6 21 L54.6 23.2 L60.6 26.2 L54 28.4 C46.6 30.6 40.6 35 37.8 44 Z"/>' +
    '<path class="nt-an-teeth" d="M55.4 19.4 l1 1.6 l1 -1.2 l1 1.4 M55.6 26.8 l1 -1.6 l1 1.2 l1 -1.4"/>' +
    '<rect class="nt-an-blot" x="46" y="23.6" width="2.6" height="2.6"/><circle class="nt-an-eye" cx="52" cy="20.4" r="1.5"/>',
  barracuda:
    // Long and slim, the lower jaw sticking out past the upper with a row of teeth, two dorsal fins far apart, dark bars, forked tail.
    '<path class="nt-an-baracuda" d="M0 26.8 L9 23 C14 20.4 24 19.4 36 19.6 C46 19.8 52 21 55 22.6 L62 16 L59.6 25.4 L62 34 L55 28.4 C51 30 44 31.2 34 31.4 C22 31.6 13 30.8 8 29 Z"/>' +
    '<path class="nt-an-teeth" d="M1 26.6 L11 25.4 M3 26.4 l1 -1.4 l1 1.3 l1 -1.4 l1 1.3 l1 -1.4 l1 1.2"/>' +
    '<path class="nt-an-blot" d="M22 20.4 h3 l-1 5 h-3 Z M30 20 h3 l-1 5.4 h-3 Z M38 20.2 h3 l-1 5 h-3 Z M46 21 h3 l-1 4 h-3 Z"/>' +
    '<path class="nt-an-fin" d="M26 19.8 L29.4 12.6 L33.4 19.6 M45 20.2 L47.6 14.8 L50 20.8 M44.6 31 L47.4 36.4 L49.6 30.4 M28 31.6 L30 35.6 L32.4 31.6 M15.6 25.4 L23 26.8 L15.6 28.2"/>' +
    '<circle class="nt-an-eye" cx="12.4" cy="23.6" r="1.7"/>',
  shark:
    '<path class="nt-an-shark" d="M2 28 C10 20 26 18 40 20 L44 8 L48 21 C52 22 54 23 56 24 L62 14 L60 28 L63 40 L55 32 C46 36 30 38 16 34 C10 33 4 31 2 28 Z"/>' +
    '<path class="nt-an-fin" d="M24 33 L20 42 L30 35 M14 27 l2 4 M17 26 l2 4 M20 25.5 l2 4"/><circle class="nt-an-eye" cx="10" cy="26" r="1.6"/>',
  crab:
    '<path class="nt-an-crab" d="M16 26 C16 16 48 16 48 26 C48 34 16 34 16 26 Z"/>' +
    '<path class="nt-an-leg" d="M18 30 L8 38 M20 32 L12 42 M24 33 L18 44 M46 30 L56 38 M44 32 L52 42 M40 33 L46 44 M22 20 L14 12 M42 20 L50 12"/>' +
    '<path class="nt-an-claw" d="M14 12 C6 12 6 4 12 4 L16 8 L12 8 Z M50 12 C58 12 58 4 52 4 L48 8 L52 8 Z"/>' +
    '<circle class="nt-an-eye" cx="28" cy="18" r="1.8"/><circle class="nt-an-eye" cx="36" cy="18" r="1.8"/>',
  coral:
    '<path class="nt-an-coral" d="M30 46 V30 M30 34 L18 22 M18 22 V10 M18 22 L10 16 M30 30 L42 18 M42 18 V6 M42 18 L52 14 M30 30 V14 M24 40 L12 34 M36 40 L50 34 M50 34 L56 26"/>' +
    '<path class="nt-an-bed" d="M2 46 H62"/>',
  oyster:
    '<path class="nt-an-oys" d="M6 30 C4 18 16 8 30 8 C46 8 60 16 58 28 C56 38 44 42 30 42 C16 42 8 38 6 30 Z"/>' +
    '<path class="nt-an-ridge" d="M12 24 C20 18 40 16 54 22 M10 30 C22 26 42 26 56 28 M14 36 C24 34 40 34 52 34"/>',
  sponge:
    '<path class="nt-an-sponge" d="M14 46 C12 34 10 20 14 8 H30 C32 20 30 34 28 46 Z M34 46 C34 36 32 26 36 16 H50 C54 26 52 36 50 46 Z"/>' +
    '<ellipse class="nt-an-hole" cx="22" cy="8" rx="8" ry="2.6"/><ellipse class="nt-an-hole" cx="43" cy="16" rx="7" ry="2.4"/>' +
    '<g class="nt-an-dots"><circle cx="18" cy="24" r="1"/><circle cx="25" cy="32" r="1"/><circle cx="20" cy="38" r="1"/><circle cx="40" cy="30" r="1"/><circle cx="46" cy="38" r="1"/></g>',
  plate:
    '<ellipse class="nt-an-plate" cx="32" cy="34" rx="28" ry="9"/>' +
    '<path class="nt-an-body" d="M12 30 C18 24 30 22 42 25 L50 20 L49 29 L51 36 L42 32 C30 36 18 35 12 30 Z"/><circle class="nt-an-eye" cx="17" cy="29" r="1.5"/>' +
    '<path class="nt-an-steam" d="M24 18 c-3 -4 3 -6 0 -10 M34 18 c-3 -4 3 -6 0 -10"/>',
} as const;

export type AnimalId = keyof typeof ANIMALS;

/** One animal picture as a standalone svg. */
export const animalSvg = (id: AnimalId, cls = 'nt-an') => `<svg class="${cls}" viewBox="0 0 64 48" aria-hidden="true">${ANIMALS[id]}</svg>`;
