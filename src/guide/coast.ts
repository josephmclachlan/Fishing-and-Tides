/**
 * The COAST DRAWING (PLAN 14.6, option F of the guide rethink; redrawn 2026-11-17 after Joseph's review: "super
 * amateurish line art", "the highlighting of zones completely lacks the artistry, dynamism, and modern design").
 *
 * A cross-section of this coast from the beach out past the reef to the drop-off, filled and lit: sand, water that
 * darkens with depth, light falling through it, and each part's life drawn in that part's colour. Below it, a strip
 * of six square buttons, each directly under its part of the coast, with the part's name and how many species live
 * there. Picking one lights its column like a beam rising from the button, brightens its seabed and its life, and
 * dims the rest; pointing at one previews it. The water moves: waves run, seagrass sways, the school drifts.
 *
 * It sets the guide's habitat filter to that part's habitats, so the shelves, the list, the groups and Flip follow.
 * The drawing is built once and then updated in place (counts and the part showing), so its motion never restarts.
 */
import { t, type Key } from '../i18n';
import { inView, matches, type GdFilter } from './filter';
import type { GdMode } from './route';
import type { Entry, Group, Habitat } from './types';

export const ZONES = ['beach', 'mangrove', 'seagrass', 'reef', 'open', 'deep'] as const;
export type Zone = (typeof ZONES)[number];

/** The habitats each part of the drawing stands for (every habitat in the research is in one part). */
export const ZONE_HABITATS: Record<Zone, readonly Habitat[]> = {
  beach: ['beach'],
  mangrove: ['mangrove', 'estuary'],
  seagrass: ['seagrass', 'sand', 'rubble'],
  reef: ['reef', 'rock'],
  open: ['open-water', 'drift'],
  deep: ['offshore', 'deep'],
};

/** The part of the drawing a habitat filter is, if it is exactly one part. */
export function zoneOf(habitats: readonly Habitat[]): Zone | null {
  return ZONES.find((z) => ZONE_HABITATS[z].length === habitats.length && ZONE_HABITATS[z].every((h) => habitats.includes(h))) ?? null;
}

/** How many species each part holds under the current list, group and other filters. */
export function zoneCounts(list: readonly Entry[], f: GdFilter, mode: GdMode, group: Group | null, hays?: Map<string, string>): Record<Zone, number> {
  const out = Object.fromEntries(ZONES.map((z) => [z, 0])) as Record<Zone, number>;
  for (const z of ZONES) {
    const fz = { ...f, habitats: [...ZONE_HABITATS[z]] };
    for (const e of list) if (inView(e, mode, group) && matches(e, fz, hays?.get(e.id))) out[z]++;
  }
  return out;
}

// ------------------------------------------------------------------ the drawing (1200 by 520, sea level at y 210)

/** Where each part's column starts and ends across the drawing; the strip of buttons uses the same widths. */
export const COLS: Record<Zone, [number, number]> = {
  beach: [0, 180], mangrove: [180, 370], seagrass: [370, 570], reef: [570, 790], open: [790, 1000], deep: [1000, 1200],
};
const W = 1200, H = 520, SL = 210;

/** The seabed, from the dune down through the mangrove mud, the seagrass flat, up over the reef crest, down the
 *  fore-reef and over the drop-off. */
const FLOOR =
  'M0 172 C40 167 92 166 132 177 C154 184 170 198 190 212 C232 234 300 244 370 252 C402 258 432 262 470 263 L560 263 ' +
  'C590 262 610 250 630 238 C650 228 670 225 690 227 C715 230 735 244 760 262 C775 273 786 290 800 300 ' +
  'C860 322 940 346 1000 356 C1013 362 1021 384 1028 420 C1034 458 1038 496 1041 ' + H;

/** A small deterministic random, so the seagrass is the same on every load. */
const rnd = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const f1 = (n: number) => +n.toFixed(1);

/** Seagrass: clumps of blades on the flat, each clump swaying on its own beat. */
function seagrass(): string {
  const r = rnd(7);
  let out = '';
  for (let x = 380; x <= 560; x += 17 + Math.round(r() * 6)) {
    const base = x < 470 ? 262 - (470 - x) * 0.012 : 263;
    let d = '';
    const n = 4 + Math.round(r() * 2);
    for (let i = 0; i < n; i++) {
      const bx = x + i * 2.6 - n * 1.3;
      const h = 16 + r() * 30;
      const lean = (r() - 0.45) * 14;
      d += `M${f1(bx)} ${f1(base)} C${f1(bx + lean * 0.2)} ${f1(base - h * 0.4)} ${f1(bx + lean * 0.7)} ${f1(base - h * 0.7)} ${f1(bx + lean)} ${f1(base - h)} `;
    }
    out += `<path class="gd-cs-sway" style="--sd:${f1(-r() * 4)}s;--sr:${f1(2.2 + r() * 1.6)}deg" d="${d.trim()}"/>`;
  }
  return out;
}

/** A small fish facing left at (x, y), `s` long. */
const fish = (x: number, y: number, s: number) =>
  `M${x} ${y} C${f1(x + s * 0.25)} ${f1(y - s * 0.32)} ${f1(x + s * 0.62)} ${f1(y - s * 0.3)} ${f1(x + s * 0.8)} ${y} L${x + s} ${f1(y - s * 0.24)} L${x + s} ${f1(y + s * 0.24)} L${f1(x + s * 0.8)} ${y} C${f1(x + s * 0.62)} ${f1(y + s * 0.3)} ${f1(x + s * 0.25)} ${f1(y + s * 0.32)} ${x} ${y} Z`;

/** Each part's life. `back` sits behind the seabed (roots into the mud), `front` on top of it. */
const ART: Record<Zone, { back?: string; front: string }> = {
  beach: {
    front:
      // Palm: a curved trunk with rings, crescent fronds, coconuts.
      '<path class="gd-cs-trunk" d="M84 172 C86 150 91 132 100 117"/>' +
      '<path class="gd-cs-thin" d="M84 162 l6 -1 M85 152 l6 -1 M87 142 l6 -1.5 M90 133 l6 -2 M94 125 l5 -2"/>' +
      '<g class="gd-cs-palm">' +
      '<path class="gd-cs-leaf" d="M100 117 C86 104 70 103 54 114 C70 109 86 111 100 119 Z"/>' +
      '<path class="gd-cs-leaf" d="M100 117 C93 104 82 97 68 97 C82 101 92 108 99 119 Z"/>' +
      '<path class="gd-cs-leaf" d="M100 117 C108 103 120 98 134 100 C121 103 110 109 101 119 Z"/>' +
      '<path class="gd-cs-leaf" d="M100 117 C115 108 130 110 142 122 C129 115 115 114 101 119 Z"/>' +
      '<path class="gd-cs-leaf" d="M100 118 C92 124 87 132 86 142 C91 133 96 126 102 120 Z"/>' +
      '</g><circle class="gd-cs-nut" cx="97" cy="121" r="2.6"/><circle class="gd-cs-nut" cx="103" cy="122" r="2.4"/>' +
      // A ghost crab on the wet sand, and a shell.
      '<path d="M148 188 C148 183 160 183 160 188 C160 190 148 190 148 188 Z M151 184 l-1 -4 M157 184 l1 -4 M148 188 l-5 2 M148 189 l-4 4 M160 188 l5 2 M160 189 l4 4"/>' +
      '<path d="M28 172 c2 -5 9 -5 11 0 Z M31 172 l2 -4 M36 172 l-1 -4"/>',
  },
  mangrove: {
    back:
      // Prop roots arching down into the mud.
      '<path class="gd-cs-root" d="M238 176 C226 184 216 200 211 228 M238 178 C248 188 256 204 260 240 M238 184 C230 196 227 212 226 236 M238 184 C244 198 246 214 246 240 M238 190 C234 204 236 220 236 242"/>' +
      '<path class="gd-cs-root" d="M322 184 C314 192 308 206 306 246 M322 186 C330 196 336 212 338 250 M322 192 C318 204 318 222 320 250"/>',
    front:
      '<path class="gd-cs-trunk" d="M238 190 L238 158 M322 192 L322 166"/>' +
      '<path class="gd-cs-canopy" d="M192 156 C186 140 200 127 215 131 C219 116 242 112 254 125 C269 117 287 128 282 145 C294 149 291 166 276 166 L200 166 C190 166 187 161 192 156 Z"/>' +
      '<path class="gd-cs-canopy" d="M292 166 C288 154 298 146 309 149 C313 138 330 137 337 147 C348 144 357 154 352 165 C358 170 354 176 346 176 L298 176 C291 176 288 171 292 166 Z"/>' +
      '<path class="gd-cs-thin" d="M206 150 c6 -4 12 -4 16 0 M232 132 c6 -3 12 -2 15 2 M258 142 c5 -3 11 -2 14 2 M306 160 c4 -3 9 -3 12 0 M330 152 c4 -3 9 -2 11 1"/>' +
      // Young fish among the roots.
      `<path class="gd-cs-fish" d="${fish(268, 224, 11)} ${fish(286, 232, 9)}"/>` +
      // Birds over the mangrove.
      '<path class="gd-cs-bird" d="M262 104 q7 -7 14 0 q7 -7 14 0"/><path class="gd-cs-bird b2" d="M300 118 q5 -5 10 0 q5 -5 10 0"/>',
  },
  seagrass: {
    front:
      seagrass() +
      // A cushion star and a conch on the flat.
      '<path class="gd-cs-solid" d="M548.0 251.4 L549.9 255.1 L555.1 255.3 L551.0 257.7 L552.4 261.6 L548.0 259.4 L543.6 261.6 L545.0 257.7 L540.9 255.3 L546.1 255.1 Z"/>' +
      '<path class="gd-cs-solid" d="M396 261 C396 253 404 249 412 252 L418 249 L416 256 C416 260 410 262 396 261 Z M402 255 l8 -1"/>' +
      `<path class="gd-cs-fish" d="${fish(486, 236, 12)}"/>`,
  },
  reef: {
    front:
      // Brain coral, elkhorn on the crest, a sea fan, tube sponges; fish over the fore-reef; bubbles.
      '<path class="gd-cs-solid" d="M598 250 C599 236 614 229 627 230 C641 231 651 240 652 250 Z"/>' +
      '<path class="gd-cs-thin" d="M605 246 c4 -6 9 -9 15 -9 M609 249 c5 -6 11 -8 18 -8 c7 0 13 3 17 8 M628 236 c6 1 12 5 15 10"/>' +
      '<path class="gd-cs-coral" d="M672 227 C670 216 662 208 648 203 M670 214 C664 207 656 205 650 207 M673 227 C677 213 690 205 706 203 M684 210 C690 204 698 201 704 196 M676 218 C680 212 688 210 694 211"/>' +
      '<path class="gd-cs-solid" d="M738 252 C724 244 719 222 730 210 C741 202 757 207 760 221 C763 236 752 248 738 252 Z"/>' +
      '<path class="gd-cs-thin" d="M738 252 L736 226 M738 252 L748 220 M738 252 L730 214 M738 252 L756 232 M727 226 L757 222 M724 236 L758 238 M733 214 L752 210"/>' +
      '<path class="gd-cs-solid" d="M768 268 L766 240 L774 239 L775 268 Z M779 268 L780 247 L787 247 L786 270 Z"/>' +
      `<path class="gd-cs-fish" d="${fish(704, 248, 13)} ${fish(780, 284, 11)}"/>` +
      '<g class="gd-cs-bub"><circle cx="694" cy="222" r="1.8"/><circle cx="700" cy="216" r="1.3"/><circle cx="690" cy="214" r="1"/></g>',
  },
  open: {
    front:
      // A school mid-water, a jelly near the surface, drifting sargassum.
      `<g class="gd-cs-school"><path class="gd-cs-fish" d="${[
        [850, 262], [868, 254], [872, 270], [888, 262], [892, 248], [906, 268], [910, 255], [926, 262], [930, 276], [878, 282],
      ]
        .map(([x, y]) => fish(x, y, 11))
        .join(' ')}"/></g>` +
      '<g class="gd-cs-jelly"><path class="gd-cs-solid" d="M952 240 C952 226 974 226 974 240 C970 238 956 238 952 240 Z"/>' +
      '<path class="gd-cs-thin" d="M956 240 c-2 6 2 10 0 16 M962 240 c-2 7 2 12 0 19 M968 240 c2 6 -2 11 0 17"/></g>' +
      '<path class="gd-cs-drift" d="M828 211 c3 -4 8 -4 11 0 c3 -4 8 -4 11 0 M918 211 c3 -4 8 -4 11 0"/>' +
      '<g class="gd-cs-dots"><circle cx="834" cy="214" r="1.6"/><circle cx="845" cy="215" r="1.4"/><circle cx="924" cy="214" r="1.5"/></g>',
  },
  deep: {
    front:
      // A sailfish cruising, a squid lower down, and the odd glint in the dark.
      '<path class="gd-cs-solid" d="M1066 290 C1088 280 1120 279 1142 287 L1162 276 L1156 291 L1162 306 L1142 295 C1120 302 1088 301 1066 293 Z"/>' +
      '<path class="gd-cs-coral" d="M1066 291 L1036 289"/>' +
      '<path class="gd-cs-solid" d="M1082 283 C1086 262 1104 252 1128 258 C1126 268 1124 276 1122 282 Z"/>' +
      '<path class="gd-cs-thin" d="M1088 282 L1092 262 M1098 281 L1104 256 M1110 281 L1116 257 M1092 296 l-8 8 M1076 288 l0 0.1"/>' +
      '<path class="gd-cs-solid" d="M1120 376 C1115 360 1121 346 1130 340 C1139 346 1145 360 1140 376 Z M1124 350 l-8 -4 l2 8 M1136 350 l8 -4 l-2 8"/>' +
      '<path class="gd-cs-thin" d="M1122 376 c-2 10 2 18 -2 28 M1127 376 c-1 10 2 18 0 30 M1133 376 c1 10 -2 18 0 30 M1138 376 c2 10 -2 18 2 28"/>' +
      '<g class="gd-cs-glint"><circle cx="1060" cy="350" r="1.5"/><circle cx="1180" cy="330" r="1.3"/><circle cx="1090" cy="410" r="1.6"/><circle cx="1170" cy="420" r="1.2"/></g>',
  },
};

/** The sea surface: a long wave line that runs sideways forever, clipped to the open sea. */
const WAVE = (y: number, amp: number) => {
  let d = `M100 ${y}`;
  for (let x = 100; x < 1280; x += 20) d += ` q10 ${-amp} 20 0`;
  return d;
};

const lbl = (z: Zone) => t(`gd.coast.${z}` as Key);

export function coastHtml(on: Zone | null, counts: Record<Zone, number>): string {
  const beams = ZONES.map((z) => {
    const [a, b] = COLS[z];
    return `<linearGradient id="gd-cs-bm-${z}" class="z-${z}" x1="0" y1="1" x2="0" y2="0"><stop class="b0" offset="0"/><stop class="b1" offset="0.45"/><stop class="b2" offset="1"/></linearGradient>
      <clipPath id="gd-cs-cl-${z}"><rect x="${a}" y="0" width="${b - a}" height="${H}"/></clipPath>`;
  }).join('');
  // The seabed's edge, each part's stretch in its own colour (hard stops at the column edges).
  const edge = ZONES.map((z) => {
    const [a, b] = COLS[z];
    return `<stop class="z-${z}" offset="${a / W}"/><stop class="z-${z}" offset="${b / W}"/>`;
  }).join('');
  const zoneArt = (k: 'back' | 'front') =>
    ZONES.map((z) => (ART[z][k] ? `<g class="gd-ca z-${z}${z === on ? ' on' : ''}" data-z="${z}">${ART[z][k]}</g>` : '')).join('');
  const svg = `<svg class="gd-coast-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="gd-cs-water" x1="0" y1="${SL}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop class="w0" offset="0"/><stop class="w1" offset="0.35"/><stop class="w2" offset="1"/></linearGradient>
      <linearGradient id="gd-cs-far" x1="960" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop class="f0" offset="0"/><stop class="f1" offset="1"/></linearGradient>
      <linearGradient id="gd-cs-sand" x1="0" y1="160" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop class="s0" offset="0"/><stop class="s1" offset="0.4"/><stop class="s2" offset="1"/></linearGradient>
      <clipPath id="gd-cs-ground"><path d="${FLOOR} L0 ${H} Z"/></clipPath>
      <linearGradient id="gd-cs-edge" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">${edge}</linearGradient>
      <linearGradient id="gd-cs-ray" x1="0" y1="${SL}" x2="0" y2="440" gradientUnits="userSpaceOnUse"><stop class="r0" offset="0"/><stop class="r1" offset="1"/></linearGradient>
      <linearGradient id="gd-cs-sky" x1="0" y1="0" x2="0" y2="${SL}" gradientUnits="userSpaceOnUse"><stop class="k0" offset="0"/><stop class="k1" offset="1"/></linearGradient>
      <clipPath id="gd-cs-sea"><rect x="330" y="${SL - 30}" width="${W - 330}" height="60"/></clipPath>
      <path id="gd-cs-floor" d="${FLOOR}"/>
      ${beams}
    </defs>
    <rect class="gd-cs-skyf" x="0" y="0" width="${W}" height="${SL}" fill="url(#gd-cs-sky)"/>
    <g class="gd-cs-sun"><circle cx="1100" cy="150" r="20"/><circle class="halo" cx="1100" cy="150" r="30"/></g>
    <rect x="150" y="${SL}" width="${W - 150}" height="${H - SL}" fill="url(#gd-cs-water)"/>
    <rect x="960" y="${SL}" width="${W - 960}" height="${H - SL}" fill="url(#gd-cs-far)"/>
    <g class="gd-cs-rays"><path d="M420 ${SL} L452 ${SL} L520 430 L456 430 Z"/><path d="M596 ${SL} L620 ${SL} L676 400 L628 400 Z"/><path d="M838 ${SL} L880 ${SL} L960 440 L880 440 Z"/><path class="r4" d="M1040 ${SL} L1068 ${SL} L1120 420 L1070 420 Z"/></g>
    ${zoneArt('back')}
    <path class="gd-cs-bed" d="${FLOOR} L0 ${H} Z" fill="url(#gd-cs-sand)"/>
    <g class="gd-cs-strata" clip-path="url(#gd-cs-ground)">${[16, 38, 68, 108].map((d, i) => `<use href="#gd-cs-floor" transform="translate(0 ${d})" style="opacity:${(0.5 - i * 0.1).toFixed(2)}"/>`).join('')}</g>
    <use class="gd-cs-edge" href="#gd-cs-floor" stroke="url(#gd-cs-edge)"/>
    ${ZONES.map((z) => `<use class="gd-cedge z-${z}${z === on ? ' on' : ''}" data-z="${z}" href="#gd-cs-floor" clip-path="url(#gd-cs-cl-${z})"/>`).join('')}
    ${zoneArt('front')}
    ${ZONES.map((z) => `<rect class="gd-cbeam z-${z}${z === on ? ' on' : ''}" data-z="${z}" x="${COLS[z][0]}" y="0" width="${COLS[z][1] - COLS[z][0]}" height="${H}" fill="url(#gd-cs-bm-${z})"/><path class="gd-cbeam-e z-${z}${z === on ? ' on' : ''}" data-z="${z}" d="M${COLS[z][0]} 0 V${H} M${COLS[z][1]} 0 V${H}"/>`).join('')}
    <path class="gd-cs-calm" d="M186 ${SL} C230 ${SL - 1.5} 280 ${SL + 1.5} 330 ${SL}"/>
    <g clip-path="url(#gd-cs-sea)"><path class="gd-cs-wave w2" d="${WAVE(SL + 5, 2.2)}"/><path class="gd-cs-wave" d="${WAVE(SL, 3.6)}"/></g>
    <path class="gd-cs-foam" d="M636 ${SL - 2} q7 -5 14 0 M656 ${SL - 3} q8 -7 16 0 q8 -7 16 0 M694 ${SL - 2} q6 -4 12 0"/><path class="gd-cs-foam f2" d="M646 ${SL + 4} h10 M668 ${SL + 5} h14 M692 ${SL + 4} h8"/>
    <path class="gd-cs-glow" d="M1084 ${SL + 6} h32 M1090 ${SL + 12} h20 M1096 ${SL + 18} h8"/>
    ${ZONES.map((z) => `<rect class="gd-czh" data-zone="${z}" data-z="${z}" x="${COLS[z][0]}" y="0" width="${COLS[z][1] - COLS[z][0]}" height="${H}"/>`).join('')}
  </svg>`;
  const strip = ZONES.map(
    (z) =>
      `<button type="button" class="gd-cz z-${z}${z === on ? ' on' : ''}" data-zone="${z}" data-z="${z}" aria-pressed="${z === on}"><b>${lbl(z)}</b><span class="gd-cz-n fc-mono">${counts[z]}</span></button>`,
  ).join('');
  const cols = ZONES.map((z) => `${COLS[z][1] - COLS[z][0]}fr`).join(' ');
  return `<div class="gd-cs-art${on ? ' has-on' : ''}" data-on="${on ?? ''}">${svg}</div><div class="gd-cs-strip" role="group" aria-label="${t('gd.coast.title')}" style="grid-template-columns:${cols}">${strip}</div>`;
}

/** The folded section's little picture: the coast in one line, its seabed in the six parts' colours. */
export function coastGlyph(): string {
  const bed: Record<Zone, string> = {
    beach: 'M2 13 C6 12 9 12 12 15', mangrove: 'M12 15 C15 18 18 19 22 20', seagrass: 'M22 20 H31',
    reef: 'M31 20 C33 17 36 16 38 17 C40 18 41 20 42 22', open: 'M42 22 L51 24', deep: 'M51 24 C52 26 53 29 54 31',
  };
  return `<svg class="gd-coast-gl" viewBox="0 0 64 32" aria-hidden="true" focusable="false"><path class="gd-coast-gl-w" d="M12 15 q2.6 -2 5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0 t5.2 0 t4 0"/><circle class="gd-coast-gl-s" cx="55" cy="7" r="3"/>${ZONES.map((z) => `<path class="z-${z}" d="${bed[z]}"/>`).join('')}</svg>`;
}

/** Bring a drawn coast up to date without rebuilding it (its motion keeps running): counts and the part showing.
 *  Rebuilds only when it is empty or the language changed. */
export function updateCoast(root: HTMLElement, on: Zone | null, counts: Record<Zone, number>): void {
  const lang = t('gd.coast.title');
  if (!root.firstElementChild || root.dataset.l !== lang) {
    root.innerHTML = coastHtml(on, counts);
    root.dataset.l = lang;
    return;
  }
  const art = root.querySelector<HTMLElement>('.gd-cs-art')!;
  art.dataset.on = on ?? '';
  art.classList.toggle('has-on', !!on);
  root.querySelectorAll<Element>('[data-z]').forEach((x) => x.classList.toggle('on', (x as HTMLElement).dataset.z === on));
  root.querySelectorAll<HTMLElement>('button.gd-cz').forEach((b) => {
    const z = b.dataset.zone as Zone;
    b.setAttribute('aria-pressed', String(z === on));
    const n = b.querySelector('.gd-cz-n')!;
    if (n.textContent !== String(counts[z])) n.textContent = String(counts[z]);
  });
}

/** Pointing at a part (in the drawing or the strip) previews it: its column, life and button light up. */
export function wireCoast(root: HTMLElement): void {
  let hov: string | null = null;
  const set = (z: string | null) => {
    if (z === hov) return;
    hov = z;
    root.querySelector('.gd-cs-art')?.classList.toggle('has-hov', !!z);
    root.querySelectorAll<HTMLElement>('[data-z]').forEach((x) => x.classList.toggle('hov', x.dataset.z === z));
  };
  root.addEventListener('pointerover', (e) => {
    if ((e as PointerEvent).pointerType === 'touch') return;
    set((e.target as Element).closest<HTMLElement>('[data-z]')?.dataset.z ?? null);
  });
  root.addEventListener('pointerleave', () => set(null));
  root.addEventListener('focusin', (e) => set((e.target as Element).closest<HTMLElement>('[data-z]')?.dataset.z ?? null));
  root.addEventListener('focusout', () => set(null));
}
