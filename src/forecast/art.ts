/**
 * Hero pictures for the FORECAST page (PLAN 7.52): one inline SVG per activity, drawn from the reading so
 * the picture itself carries the number. Pure strings, no DOM. Colours are the page's own CSS variables
 * (forecast.css), so light and dark mode restyle them; motion is CSS keyframes, off under reduced motion.
 *
 *   SURF     the wave face to scale beside a 1.7 m surfer, with knee, waist and head lines
 *   FISH     sky with the moon's real phase over the water, one fish per bite level, the tide arrow
 *   SNORKEL  a snorkeller at the surface: chop from the wind, the reef as deep as the water over it at this
 *            tide, markers fading into the murk past the visibility
 *   DIVE     a diver over the reef: markers at 5 m steps fade past the visibility, the sea fan sways with the surge
 *   SAIL     a boat heeling with the wind, streaks as fast as the wind, chop as high as the swell
 */
import type { FcRead } from './model';

const W = 320, HT = 200;
/**
 * Bleed: backgrounds run this far past the 320×200 frame. The picture is fitted whole (`meet`, so labels at the
 * edges are never cropped) and the box shows the bleed wherever its shape differs from 16:10.
 */
const B = 240;
/** Repeat a relative wave segment across the frame plus the bleed on both sides. */
const across = (seg: string, step: number) => Array.from({ length: Math.ceil((W + 2 * B) / step) + 1 }, () => seg).join(' ');
const f1 = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const svg = (cls: string, body: string, label: string) =>
  `<svg class="fc-art ${cls}" viewBox="0 0 ${W} ${HT}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMax meet">${body}</svg>`;

/** A standing surfer, feet at (x, ground), `h` px tall. */
function person(x: number, ground: number, h: number): string {
  const head = h * 0.13, w = h * 0.24;
  return `<g class="fc-person"><circle cx="${f1(x)}" cy="${f1(ground - h + head / 2)}" r="${f1(head / 2)}"/>
    <rect x="${f1(x - w / 2)}" y="${f1(ground - h + head * 1.08)}" width="${f1(w)}" height="${f1(h * 0.44)}" rx="${f1(w * 0.4)}"/>
    <rect x="${f1(x - w * 0.42)}" y="${f1(ground - h * 0.47)}" width="${f1(w * 0.36)}" height="${f1(h * 0.47)}" rx="${f1(w * 0.18)}"/>
    <rect x="${f1(x + w * 0.06)}" y="${f1(ground - h * 0.47)}" width="${f1(w * 0.36)}" height="${f1(h * 0.47)}" rx="${f1(w * 0.18)}"/>
    <rect class="fc-board" x="${f1(x + w * 0.7)}" y="${f1(ground - h * 1.02)}" width="${f1(w * 0.42)}" height="${f1(h * 1.02)}" rx="${f1(w * 0.21)}"/></g>`;
}

/** Breaker height `hb` m drawn against a 1.7 m surfer. */
export function surfArt(r: FcRead, label: string, guides: { knee: string; waist: string; head: string } = { knee: 'Knee', waist: 'Waist', head: 'Head' }): string {
  const s = r.surf;
  const ground = 176, personH = 92, pxPerM = personH / 1.7;
  const hb = s ? s.hb : 0;
  const face = clamp(hb * pxPerM, 3, ground - 14);
  const lines = [
    { m: 0.5, k: 'knee' },
    { m: 1.0, k: 'waist' },
    { m: 1.7, k: 'head' },
  ];
  const top = ground - face;
  // A plunging crest: the face rises from the right, curls over to the left.
  const x0 = 150, x1 = 304;
  const lip = Math.min(40, face * 0.55);
  const wave = `M${W + B},${ground} L${W + B},${f1(ground - face * 0.25)} L${x1 + 16},${f1(ground - face * 0.25)} C${x1 - 10},${f1(ground - face * 0.4)} ${x0 + 70},${f1(top - 2)} ${x0 + 30},${f1(top)}
    C${x0 + 10},${f1(top + 1)} ${x0 - 4},${f1(top + lip * 0.35)} ${f1(x0 - lip * 0.25)},${f1(top + lip * 0.8)}
    C${x0 + 10},${f1(top + lip * 0.6)} ${x0 + 22},${f1(top + lip * 0.9)} ${x0 + 18},${f1(ground - face * 0.35)}
    C${x0 + 10},${f1(ground - face * 0.12)} ${x0 - 30},${ground} ${x0 - 60},${ground} Z`;
  const body = `
    <defs><linearGradient id="fc-sea-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fc-sea-top"/><stop offset="1" class="fc-sea-deep"/></linearGradient></defs>
    <rect class="fc-sky" x="${-B}" y="${-B}" width="${W + 2 * B}" height="${HT + B}"/>
    <g class="fc-guides">${lines
      .map((l) => `<line x1="12" x2="${W - 8}" y1="${f1(ground - l.m * pxPerM)}" y2="${f1(ground - l.m * pxPerM)}"/><text x="${W - 10}" y="${f1(ground - l.m * pxPerM - 4)}" text-anchor="end">${guides[l.k as 'knee' | 'waist' | 'head']}</text>`)
      .join('')}</g>
    <g class="fc-swell-anim"><path class="fc-wave" d="${wave}" fill="url(#fc-sea-g)"/>
      <path class="fc-foam" d="M${f1(x0 - lip * 0.25)},${f1(top + lip * 0.8)} C${x0 + 4},${f1(top + lip * 0.3)} ${x0 + 18},${f1(top)} ${x0 + 34},${f1(top)}" fill="none"/></g>
    <rect class="fc-shore" x="${-B}" y="${ground}" width="${W + 2 * B}" height="${HT - ground + B}"/>
    ${person(64, ground, personH)}`;
  return svg('fc-art-surf', body, label);
}

/** Moon disc of illumination `k` (0..1), waxing lit on the right. */
function moon(cx: number, cy: number, r: number, k: number, waxing: boolean): string {
  // Terminator: an ellipse of half-width |1-2k|·r; the lit side is a half disc plus or minus it.
  const e = f1(Math.abs(1 - 2 * k) * r);
  const sweepHalf = waxing ? 1 : 0;
  // From the bottom back to the top: a gibbous moon's terminator bulges into the dark half, a crescent's into the lit half.
  const bulge = k > 0.5 ? sweepHalf : 1 - sweepHalf;
  const lit = k < 0.02 ? '' : k > 0.98 ? `<circle class="fc-moon-lit" cx="${cx}" cy="${cy}" r="${r}"/>` :
    `<path class="fc-moon-lit" d="M${cx},${cy - r} A${r},${r} 0 0 ${sweepHalf} ${cx},${cy + r} A${e},${r} 0 0 ${bulge} ${cx},${cy - r} Z"/>`;
  return `<circle class="fc-moon-dark" cx="${cx}" cy="${cy}" r="${r}"/>${lit}`;
}

const fishPath = (x: number, y: number, s: number) =>
  `M${f1(x)},${f1(y)} c${f1(6 * s)},${f1(-6 * s)} ${f1(18 * s)},${f1(-7 * s)} ${f1(26 * s)},0 l${f1(8 * s)},${f1(-6 * s)} l0,${f1(12 * s)} l${f1(-8 * s)},${f1(-6 * s)} c${f1(-8 * s)},${f1(7 * s)} ${f1(-20 * s)},${f1(6 * s)} ${f1(-26 * s)},0 Z`;

export function fishArt(r: FcRead, label: string): string {
  const f = r.fish;
  const lvl = r.level ?? 0;
  const waterY = 78;
  const n = r.level === null ? 0 : lvl + 1;
  const spots = [
    [70, 120, 1], [196, 104, 0.8], [130, 150, 1.15], [240, 156, 0.9], [36, 168, 0.75],
  ] as const;
  const fish = spots
    .slice(0, n)
    .map(([x, y, s], i) => `<path class="fc-fish fc-swim-${i % 3}" d="${fishPath(x, y, s)}"/>`)
    .join('');
  const phase = f?.moonPhase ?? 0;
  const tide = f ? `<g class="fc-tide-ico" transform="translate(286 ${waterY - 22})"><path d="${f.tideRising ? 'M0,10 L8,0 L16,10 Z' : 'M0,0 L8,10 L16,0 Z'}"/></g>` : '';
  const body = `
    <defs><linearGradient id="fc-deep-g" gradientUnits="userSpaceOnUse" x1="0" y1="${waterY}" x2="0" y2="${HT}"><stop offset="0" class="fc-sea-top"/><stop offset="1" class="fc-sea-deep"/></linearGradient></defs>
    <rect class="${f?.daylight === false ? 'fc-night' : 'fc-sky'}" x="${-B}" y="${-B}" width="${W + 2 * B}" height="${waterY + B}"/>
    ${moon(60, 38, 20, f?.moonIllum ?? 0, phase >= 1 && phase <= 3)}
    ${tide}
    <rect x="${-B}" y="${waterY}" width="${W + 2 * B}" height="${HT - waterY + B}" fill="url(#fc-deep-g)"/>
    <path class="fc-surface" d="M${-B},${waterY} q20,-5 40,0 ${across('t40,0', 40)}" fill="none"/>
    <line class="fc-line" x1="160" y1="0" x2="160" y2="${waterY + 52}"/><path class="fc-hook" d="M160,${waterY + 52} q0,9 -7,6" fill="none"/>
    ${fish}`;
  return svg('fc-art-fish', body, label);
}

/** Looking along the reef: markers every 5 m out to 25 m, faded past the visibility. Surge sways the sea fan. */
export function waterArt(r: FcRead, label: string): string {
  const w = r.water;
  const vis = w?.visM ?? null;
  const x0 = 64, maxM = 25, pxPerM = (W - x0 - 16) / maxM;
  const visX = vis === null ? W : x0 + clamp(vis, 0, maxM) * pxPerM;
  const floor = 172;
  const diver = `<g class="fc-diver fc-float"><ellipse cx="34" cy="104" rx="22" ry="7"/><circle cx="57" cy="101" r="7"/><rect x="18" y="94" width="20" height="6" rx="3"/><path d="M12,104 l-10,-6 l0,12 Z"/></g>`;
  const marks = [5, 10, 15, 20, 25]
    .map((m) => {
      const x = x0 + m * pxPerM;
      return `<g class="fc-mark"><path class="fc-coral" d="M${f1(x - 9)},${floor} q2,-16 9,-22 q7,6 9,22 Z"/><text x="${f1(x)}" y="${floor + 18}" text-anchor="middle">${m} m</text></g>`;
    })
    .join('');
  // Sway amplitude: the bed swings ±excursion; drawn as a sea-fan rotation of up to 18° at 0.6 m/s (DANGEROUS).
  const amp = clamp(((w?.surgeMs ?? 0) / 0.6) * 18, 2, 18);
  const body = `
    <defs>
      <linearGradient id="fc-uw-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${HT}"><stop offset="0" class="fc-sea-top"/><stop offset="1" class="fc-sea-deep"/></linearGradient>
      <linearGradient id="fc-murk-g" gradientUnits="userSpaceOnUse" x1="${f1(Math.max(x0, visX - 40))}" y1="0" x2="${W}" y2="0"><stop offset="0" class="fc-murk-0"/><stop offset="1" class="fc-murk-1"/></linearGradient>
    </defs>
    <rect x="${-B}" y="${-B}" width="${W + 2 * B}" height="${HT + 2 * B}" fill="url(#fc-uw-g)"/>
    <g class="fc-rays"><path d="M70,0 L40,${floor} L60,${floor} L90,0 Z"/><path d="M170,0 L150,${floor} L166,${floor} L184,0 Z"/></g>
    <path class="fc-bed" d="M${-B},${floor} q40,-6 80,0 ${across('t80,0', 80)} L${W + B},${HT + B} L${-B},${HT + B} Z"/>
    ${marks}
    <g class="fc-fan" style="--amp:${f1(amp)}deg"><path d="M${x0 - 34},${floor} l0,-34 m0,10 l-8,-10 m8,18 l8,-12"/></g>
    ${diver}
    <rect class="fc-murk" x="${f1(Math.max(x0, visX - 40))}" y="${-B}" width="${f1(W - Math.max(x0, visX - 40) + B)}" height="${floor + 2 + B}" fill="url(#fc-murk-g)"/>
    ${vis === null ? '' : `<line class="fc-vis-line" x1="${f1(visX)}" x2="${f1(visX)}" y1="18" y2="${floor}"/>`}`;
  return svg(`fc-art-water fc-art-${r.activity}`, body, label);
}

/**
 * SNORKEL: seen from beside a snorkeller floating at the surface. The surface chops with the wind, the reef tops
 * sit as far below as the water over the reef at this tide (40 px per metre), and markers along the reef fade
 * past the visibility.
 */
export function snorkelArt(r: FcRead, label: string): string {
  const w = r.water;
  const surf = 52, pxPerM = 40;
  const over = clamp(w?.waterM ?? 2, 0.4, 3.2);
  const reefTop = surf + over * pxPerM;
  const vis = w?.visM ?? null;
  const x0 = 70, maxM = 25, pxPerVisM = (W - x0 - 12) / maxM;
  const visX = vis === null ? W : x0 + clamp(vis, 0, maxM) * pxPerVisM;
  const chop = clamp(((w?.windKt ?? 4) / 16) * 7, 1, 7);
  const waves = across(`q16,${f1(-chop)} 32,0`, 32);
  // The reef: a rubble bed with rounded brain-coral heads and a few branching corals on top.
  const bed = `<path class="fc-bed" d="M${-B},${f1(reefTop + 12)} q40,-8 80,0 ${across('t80,0', 80)} L${W + B},${HT + B} L${-B},${HT + B} Z"/>`;
  const heads = [[26, 16], [74, 11], [128, 18], [182, 12], [232, 16], [286, 13]]
    .map(([x, ry], i) => `<ellipse class="fc-coral${i % 2 ? ' fc-coral-b' : ''}" cx="${x}" cy="${f1(reefTop + 12)}" rx="${ry + 6}" ry="${ry}"/>`)
    .join('');
  const branches = [52, 156, 258]
    .map((x) => `<path class="fc-branch" d="M${x},${f1(reefTop + 12)} l0,-16 m0,6 l-7,-8 m7,14 l7,-10"/>`)
    .join('');
  const marks = [5, 10, 15, 20]
    .map((m) => `<g class="fc-mark"><text x="${f1(x0 + m * pxPerVisM)}" y="${f1(Math.min(HT - 6, reefTop + 2))}" text-anchor="middle">${m} m</text></g>`)
    .join('');
  const fish = [[120, surf + 26], [196, surf + 40], [240, surf + 22]]
    .map(([x, y], i) => `<path class="fc-fish fc-swim-${i}" d="${fishPath(x, y, 0.55)}"/>`)
    .join('');
  const body = `
    <defs>
      <linearGradient id="fc-sn-g" gradientUnits="userSpaceOnUse" x1="0" y1="${surf}" x2="0" y2="${HT}"><stop offset="0" class="fc-sea-top"/><stop offset="1" class="fc-sea-deep"/></linearGradient>
      <linearGradient id="fc-murk2-g" gradientUnits="userSpaceOnUse" x1="${f1(Math.max(x0, visX - 40))}" y1="0" x2="${W}" y2="0"><stop offset="0" class="fc-murk-0"/><stop offset="1" class="fc-murk-1"/></linearGradient>
    </defs>
    <rect class="fc-sky" x="${-B}" y="${-B}" width="${W + 2 * B}" height="${surf + B}"/>
    <circle class="fc-sun" cx="272" cy="24" r="12"/>
    <rect x="${-B}" y="${surf}" width="${W + 2 * B}" height="${HT - surf + B}" fill="url(#fc-sn-g)"/>
    <g class="fc-rays"><path d="M110,${surf} L84,${HT} L104,${HT} L128,${surf} Z"/><path d="M210,${surf} L194,${HT} L210,${HT} L226,${surf} Z"/></g>
    ${fish}
    ${bed}${heads}${branches}
    ${marks}
    <g class="fc-chop-anim"><path class="fc-surface-fill" d="M${-B},${surf} ${waves} L${W + B},${-B} L${-B},${-B} Z"/><path class="fc-surface" d="M${-B},${surf} ${waves}" fill="none"/></g>
    <g class="fc-diver fc-float"><ellipse cx="44" cy="${surf + 5}" rx="24" ry="5.5"/><circle cx="70" cy="${surf + 3}" r="6"/><rect x="72" y="${surf - 16}" width="3" height="16" rx="1.5"/><path d="M20,${surf + 5} l-12,-5 l0,10 Z"/></g>
    <rect class="fc-murk" x="${f1(Math.max(x0, visX - 40))}" y="${surf + 2}" width="${f1(W - Math.max(x0, visX - 40) + B)}" height="${HT - surf + B}" fill="url(#fc-murk2-g)"/>
    ${vis === null ? '' : `<line class="fc-vis-line" x1="${f1(visX)}" x2="${f1(visX)}" y1="${surf + 8}" y2="${f1(reefTop)}"/>`}
    <g class="fc-depth"><line x1="300" x2="300" y1="${surf + 2}" y2="${f1(reefTop)}"/><text x="294" y="${f1((surf + reefTop) / 2 + 4)}" text-anchor="end">${w?.waterM ? `${f1(w.waterM)} m` : ''}</text></g>`;
  return svg('fc-art-snorkel', body, label);
}

export function sailArt(r: FcRead, label: string): string {
  const s = r.sail;
  const kt = s?.windKt ?? 0;
  const heel = clamp(kt * 1.1, 0, 28);
  const chop = clamp((s?.swellM ?? 0.3) * 6, 1.5, 9);
  const speed = clamp(8 - kt * 0.25, 1.2, 8);
  const waterY = 140;
  const streaks = [40, 66, 92, 112]
    .map((y, i) => `<line class="fc-streak" x1="${20 + i * 30}" x2="${70 + i * 30}" y1="${y}" y2="${y}" style="animation-duration:${f1(speed + i * 0.4)}s"/>`)
    .join('');
  const waves = across(`q20,${f1(-chop)} 40,0`, 40);
  const body = `
    <defs><linearGradient id="fc-sea2-g" gradientUnits="userSpaceOnUse" x1="0" y1="${waterY}" x2="0" y2="${HT}"><stop offset="0" class="fc-sea-top"/><stop offset="1" class="fc-sea-deep"/></linearGradient></defs>
    <rect class="fc-sky" x="${-B}" y="${-B}" width="${W + 2 * B}" height="${HT + 2 * B}"/>
    ${streaks}
    <g class="fc-boat-bob"><g transform="rotate(${f1(heel)} 180 ${waterY})">
      <path class="fc-hull" d="M128,${waterY - 6} L234,${waterY - 6} L220,${waterY + 8} L140,${waterY + 8} Z"/>
      <rect class="fc-mast" x="178" y="${waterY - 104}" width="3" height="98"/>
      <path class="fc-sail" d="M183,${waterY - 100} L183,${waterY - 12} L236,${waterY - 12} Z"/>
      <path class="fc-sail fc-jib" d="M176,${waterY - 92} L176,${waterY - 12} L136,${waterY - 12} Z"/>
    </g></g>
    <path class="fc-chop" d="M${-B},${waterY + 4} ${waves} L${W + B},${HT + B} L${-B},${HT + B} Z" fill="url(#fc-sea2-g)"/>`;
  return svg('fc-art-sail', body, label);
}

export function heroArt(r: FcRead, label: string, guides?: { knee: string; waist: string; head: string }): string {
  switch (r.activity) {
    case 'surf': return surfArt(r, label, guides);
    case 'fish': return fishArt(r, label);
    case 'snorkel': return snorkelArt(r, label);
    case 'dive': return waterArt(r, label);
    case 'sail': return sailArt(r, label);
  }
}
