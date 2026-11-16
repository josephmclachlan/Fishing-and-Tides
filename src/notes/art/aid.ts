/**
 * FIRST AID drawings: the hot-water soak (the limb in the bucket, the thermometer with its 40 to 45 °C band, the hand
 * test) and the pressure bandage for a cone shell sting. Flat line art like art/water.ts, page tokens only, numbered
 * badges match each figure's marks in sections/aid.ts. Words inside a drawing are short caps labels.
 */
import { badge, type Fig } from './fig';

type Lang = 'en' | 'es';
const w = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** The hot-water soak. 320 by 212. Steam runs up from the bucket; the band on the thermometer is the safe range. */
export function soakArt(lang: Lang): string {
  const ty = (t: number) => 150 - (t - 30) * 6; // thermometer: 30 °C at y 150, 50 °C at y 30
  return (
    // the bucket, the water in it, the limb standing in it
    '<path class="nt-sea" d="M109.8 100 L122 184 H198 L210.2 100 Z"/>' +
    '<path class="nt-aid-limb" d="M148 24 V140 a15 15 0 0 0 30 0 V24"/>' +
    '<path d="M108 88 L122 184 H198 L212 88"/>' +
    '<path class="nt-rule" d="M96 100 H224"/>' +
    // steam
    '<path class="nt-flow" d="M126 84 c-6 -8 6 -12 0 -22"/><path class="nt-flow" d="M198 84 c-6 -8 6 -12 0 -22"/>' +
    // the hand testing the water before the limb goes in
    '<path d="M8 70 H38"/><path d="M38 61 H62 V79 H38 Z"/><path d="M62 64 H76 M62 69 H78 M62 74 H76 M62 79 H73"/>' +
    '<path class="nt-flow" d="M84 74 C96 76 104 90 112 100"/><path class="nt-head" d="M104 98 L113 101 L111 91"/>' +
    `<text class="nt-lbl nt-lbl-s" x="8" y="104">${w(lang, 'HAND TEST', 'PRUEBA CON MANO')}</text>` +
    // the thermometer, with the 40 to 45 band
    `<rect class="nt-aid-hot" x="256" y="${ty(50)}" width="12" height="${ty(45) - ty(50)}"/>` +
    `<rect class="nt-aid-ok" x="256" y="${ty(45)}" width="12" height="${ty(40) - ty(45)}"/>` +
    `<path d="M256 ${ty(50)} V150 a12 12 0 1 0 12 0 V${ty(50)} a6 6 0 0 0 -12 0"/>` +
    `<circle class="nt-aid-bulb" cx="262" cy="162" r="8"/>` +
    `<path class="nt-tick" d="M268 ${ty(40)} H276 M268 ${ty(45)} H276"/>` +
    `<text class="nt-lbl" x="279" y="${ty(40) + 3.5}">40</text><text class="nt-lbl" x="279" y="${ty(45) + 3.5}">45</text>` +
    `<text class="nt-lbl nt-lbl-s" x="262" y="20" text-anchor="middle">°C</text>` +
    `<text class="nt-lbl nt-lbl-s" x="228" y="${ty(47.5) + 3}" text-anchor="end">${w(lang, 'TOO HOT', 'MUY CALIENTE')}</text>` +
    `<text class="nt-lbl" x="160" y="206" text-anchor="middle">${w(lang, 'HOT, NOT SCALDING', 'CALIENTE, SIN QUEMAR')}</text>` +
    badge(1, 24, 44) + badge(2, 234, ty(42.5)) + badge(3, 163, 52)
  );
}

/** A limb with a firm pressure bandage over the sting and along the limb. 320 by 112. */
export function wrapArt(lang: Lang): string {
  let stripes = '';
  for (let x = 118; x < 288; x += 14) stripes += `M${x} 38 L${x + 10} 82 `;
  return (
    '<path d="M18 38 H300 M18 82 H300"/><path d="M18 38 Q2 60 18 82"/>' +
    '<rect class="nt-aid-wrap" x="108" y="38" width="184" height="44"/>' +
    `<path class="nt-tick" d="${stripes}"/>` +
    '<circle class="nt-aid-sting" cx="196" cy="60" r="6"/>' +
    `<text class="nt-lbl nt-lbl-s" x="292" y="104" text-anchor="end">${w(lang, 'PRESSURE BANDAGE', 'VENDAJE DE PRESIÓN')}</text>` +
    badge(1, 196, 20) + badge(2, 112, 20)
  );
}

export const AID_FIGS = {
  soak: { vb: '0 0 320 212', art: soakArt },
  wrap: { vb: '0 0 320 112', art: wrapArt },
} satisfies Record<string, Fig>;
