/**
 * FIRST AID drawings: the hot-water soak (a foot in the bucket, the thermometer with its 40 to 45 °C band, the hand
 * test) and the pressure bandage and splint for a cone shell sting. Flat line art like art/water.ts, page tokens only, numbered
 * badges match each figure's marks in sections/aid.ts. Words inside a drawing are short caps labels.
 */
import { badge, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** The hot-water soak. 320 by 212. A foot in a bucket; the healthy hand tests the water first; the thermometer's bands. */
export function soakArt(lang: Lang): string {
  const ty = (t: number) => 150 - (t - 30) * 6; // thermometer: 30 °C at y 150, 50 °C at y 30
  return (
    // the bucket with its handle, the water, a leg and foot standing in it
    '<path class="nt-sea" d="M111.4 112 L122 184 H198 L208.6 112 Z"/>' +
    '<path class="nt-aid-limb" d="M140 20 V150 C140 166 146 172 160 172 H184 C192 172 192 160 184 158 L168 154 V20"/>' +
    '<path d="M108 92 L122 184 H198 L212 92"/><path class="nt-tick" d="M108 92 C112 70 208 70 212 92"/>' +
    '<path class="nt-rule" d="M100 112 H220"/>' +
    // steam, in grey
    '<path class="nt-aid-steam" d="M124 104 c-6 -8 6 -12 0 -22 M196 104 c-6 -8 6 -12 0 -22"/>' +
    // the healthy hand dipping its fingers in first, with a tick
    '<path class="nt-aid-limb" d="M6 50 H40 C46 50 52 52 56 56 L80 76 C84 80 80 84 76 82 L62 72 L66 84 C68 88 62 90 60 86 L52 70 C46 72 40 72 36 70 H6 Z"/>' +
    '<path class="nt-aid-limb" d="M40 50 C44 42 52 42 54 48"/>' +
    '<path class="nt-aid-tick" d="M18 112 l8 8 l14 -16"/>' +
    `<text class="nt-lbl" x="6" y="140">${w(lang, 'YOUR OWN', 'SU PROPIA')}</text><text class="nt-lbl" x="6" y="153">${w(lang, 'HAND FIRST', 'MANO PRIMERO')}</text>` +
    // the thermometer, with its bands named right beside them
    `<rect class="nt-aid-hot" x="256" y="${ty(50)}" width="12" height="${ty(45) - ty(50)}"/>` +
    `<rect class="nt-aid-ok" x="256" y="${ty(45)}" width="12" height="${ty(40) - ty(45)}"/>` +
    `<path d="M256 ${ty(50)} V150 a12 12 0 1 0 12 0 V${ty(50)} a6 6 0 0 0 -12 0"/>` +
    `<circle class="nt-aid-bulb" cx="262" cy="162" r="8"/>` +
    `<path class="nt-tick" d="M268 ${ty(40)} H274 M268 ${ty(45)} H274"/>` +
    `<text class="nt-lbl" x="277" y="${ty(40) + 3.5}">40</text><text class="nt-lbl" x="277" y="${ty(45) + 3.5}">45</text>` +
    `<text class="nt-lbl nt-aid-hotl" x="250" y="${ty(48) + 3.5}" text-anchor="end">${w(lang, 'TOO HOT', 'QUEMA')}</text>` +
    `<text class="nt-lbl" x="296" y="${ty(42.5) + 3.5}">OK</text>` +
    `<text class="nt-lbl nt-lbl-s" x="262" y="20" text-anchor="middle">°C</text>` +
    `<text class="nt-lbl" x="160" y="206" text-anchor="middle">${w(lang, 'HOT, NOT SCALDING', 'CALIENTE, SIN QUEMAR')}</text>` +
    badge(1, 24, 30) + badge(2, 240, ty(42.5)) + badge(3, 154, 40)
  );
}

/** An arm with a firm bandage from the fingers up past the sting, and a splint to keep it still. 320 by 128. */
export function wrapArt(lang: Lang): string {
  let stripes = '';
  for (let x = 58; x < 232; x += 12) stripes += `M${x} 44 L${x + 8} 80 `;
  return (
    // the splint under the arm
    '<rect class="nt-aid-splint" x="24" y="82" width="236" height="10"/>' +
    // the forearm, elbow at the left, and the hand with its fingers to the right
    '<path class="nt-aid-limb" d="M20 44 H236 C250 42 262 40 272 44 L304 46 C308 48 308 52 304 52 L278 52 L304 56 C308 58 308 62 304 62 L278 62 L300 66 C304 68 302 72 298 72 L270 72 C262 80 248 82 236 80 H20 Q8 62 20 44 Z"/>' +
    '<path class="nt-aid-limb" d="M262 42 C266 32 278 30 284 34 L272 44"/>' +
    // the sting, then the bandage over it (the sting shows through)
    '<circle class="nt-aid-sting" cx="140" cy="62" r="6"/>' +
    '<rect class="nt-aid-wrap" x="52" y="44" width="184" height="36"/>' +
    `<path class="nt-aid-wrapl" d="${stripes}"/>` +
    // the ties holding the splint
    '<path class="nt-aid-tie" d="M70 40 V96 M214 40 V96"/>' +
    // which way to wrap: from the hand up toward the elbow
    '<path class="nt-head" d="M232 26 H64"/><path class="nt-head" d="M72 20 L64 26 L72 32"/>' +
    `<text class="nt-lbl" x="148" y="16" text-anchor="middle">${w(lang, 'WRAP FROM THE HAND UP', 'ENVUELVA DESDE LA MANO')}</text>` +
    `<text class="nt-lbl" x="142" y="110" text-anchor="middle">${w(lang, 'SPLINT', 'TABLILLA')}</text>` +
    `<text class="nt-lbl" x="306" y="90" text-anchor="end">${w(lang, 'PINK?', '¿ROSADOS?')}</text>` +
    badge(1, 140, 92) + badge(2, 248, 26) + badge(3, 36, 108) + badge(4, 306, 34)
  );
}

export const AID_FIGS = {
  soak: { vb: '0 0 320 212', art: soakArt },
  wrap: { vb: '0 0 320 124', art: wrapArt },
} satisfies Record<string, Fig>;
