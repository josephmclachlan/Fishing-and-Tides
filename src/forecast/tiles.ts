/**
 * Picture tiles for the FORECAST page (PLAN 7.64; Joseph, 2026-11-10: "larger aesthetic tiles, each with a unique
 * image that clearly communicates the condition of that metric for the day"). Pure SVG strings and tip bands, no DOM.
 *
 * Each icon is drawn from the value it stands for (a windsock that lifts with the wind, a thermometer that fills,
 * a moon in its phase, a flag in the rip colour), on a 48 × 48 box centred on 0,0. Parts that move carry `fc-ta`
 * classes; the page animates them only while a tile is hovered, focused or open, and never under reduced motion.
 * `tipBand` picks which tip a tile shows on opening, from the same value, so the words and the picture agree.
 */
import type { Level, WxSky } from './model';

export type TileKind =
  | 'swell' | 'wind' | 'gust' | 'clock' | 'fish' | 'moon' | 'tide' | 'breaker' | 'chop' | 'current' | 'reef'
  | 'uv' | 'stingers' | 'surge' | 'feels' | 'water' | 'rip' | 'boat';

const f1 = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/** One wave line across the box at height y, amplitude a, `n` crests, drawn twice as wide so it can slide. */
const wave = (y: number, a: number, n = 3, cls = 'fc-ti-water') => {
  const w = 48 / n;
  let d = `M-48,${f1(y)}`;
  for (let i = 0; i < n * 2; i++) d += ` q${f1(w / 4)},${f1(-a)} ${f1(w / 2)},0 t${f1(w / 2)},0`;
  return `<path class="${cls}" d="${d}"/>`;
};
const thermo = (frac: number, hot: boolean) => {
  const top = -15, bot = 9, lvl = f1(bot - clamp(frac, 0.05, 1) * (bot - top));
  return `<path class="fc-ti-glass" d="M-3.5,${top} a3.5,3.5 0 0 1 7,0 V9.5 a7,7 0 1 1 -7,0 Z"/>
    <rect class="fc-ti-merc fc-ta fc-ta-rise" x="-1.6" y="${lvl}" width="3.2" height="${f1(15 - lvl)}" rx="1.6"/><circle class="fc-ti-merc" cy="15" r="4.6"/>
    ${hot ? '<g class="fc-ta fc-ta-shimmer"><path class="fc-ti-heat" d="M10,-12 q3,3 0,6 t0,6M15,-10 q3,3 0,6 t0,6"/></g>' : ''}`;
};

/** A tile's picture for `kind` at value `v` (units as the tile shows them: m, kt, °C, %, the UV index, 0..1 for the moon). */
export function tileIcon(kind: TileKind, v: number | null, opt: { lv?: Level | null; rising?: boolean; waxing?: boolean; from?: number; to?: number } = {}): string {
  const x = fin(v) ? v : 0;
  let body = '';
  switch (kind) {
    case 'swell': {
      // More lines and taller crests as the swell grows (one line under 0.5 m, three from 1.5 m).
      const n = x < 0.5 ? 1 : x < 1.5 ? 2 : 3, a = f1(2 + clamp(x, 0, 3) * 2.2);
      for (let i = 0; i < n; i++) body += `<g class="fc-ta fc-ta-slide" style="animation-delay:${-i * 0.6}s">${wave(10 - i * 9, a)}</g>`;
      break;
    }
    case 'wind':
    case 'chop': {
      if (kind === 'wind') {
        // A windsock: limp at a calm, straight out from 15 kt.
        const lift = clamp(x / 15, 0, 1), ang = f1(75 - lift * 72);
        body = `<path class="fc-ti-pole" d="M-15,-18 V20"/><g transform="translate(-15 -15) rotate(${ang})"><g class="fc-ta fc-ta-flutter"><path class="fc-ti-sock" d="M0,-4 L26,-2.2 L26,2.2 L0,4 Z"/><path class="fc-ti-band" d="M8.5,-3.5 V3.5 M17.5,-2.9 V2.9"/></g></g>`;
      } else {
        // The sea surface: ripples grow with the wind (flat under 5 kt, whitecaps from 15).
        const a = f1(0.6 + clamp(x / 20, 0, 1) * 4.5);
        body = `<g class="fc-ta fc-ta-slide">${wave(-4, a, 4)}</g><g class="fc-ta fc-ta-slide" style="animation-delay:-0.8s">${wave(6, a * 0.8, 4)}</g><g class="fc-ta fc-ta-slide" style="animation-delay:-1.4s">${wave(15, a * 0.6, 4)}</g>${x >= 15 ? '<path class="fc-ti-foam" d="M-9,-7 l3,-2 M5,-6 l3,-2 M-3,4 l3,-2"/>' : ''}`;
      }
      break;
    }
    case 'gust':
      body = `<g class="fc-ta fc-ta-dash"><path class="fc-ti-gust" d="M-18,-8 H8 a5,5 0 1 0 -5,-5"/><path class="fc-ti-gust" d="M-18,1 H14 a5,5 0 1 1 -5,5"/>${x >= 18 ? '<path class="fc-ti-gust" d="M-14,10 H4"/>' : ''}</g>`;
      break;
    case 'clock': {
      // A clock face with the best window as an arc, on a 12-hour dial.
      const a0 = ((opt.from ?? 6) % 12) * 30, a1 = ((opt.to ?? 8) % 12) * 30 + ((opt.to ?? 8) - (opt.from ?? 6) >= 12 ? 359 : 0);
      const pt = (a: number, r: number) => `${f1(Math.sin((a * Math.PI) / 180) * r)},${f1(-Math.cos((a * Math.PI) / 180) * r)}`;
      const sweep = ((a1 - a0 + 360) % 360) || 30;
      body = `<circle class="fc-ti-face" r="17"/><path class="fc-ti-arc" d="M${pt(a0, 13)} A13,13 0 ${sweep > 180 ? 1 : 0} 1 ${pt(a0 + sweep, 13)}"/>
        <g class="fc-ta fc-ta-tick"><path class="fc-ti-hand" d="M0,0 L${pt(a0, 9)}"/></g><circle class="fc-ti-hub" r="1.8"/>`;
      break;
    }
    case 'fish':
      body = `<g class="fc-ta fc-ta-swim"><path class="fc-ti-fish" d="M-14,0 C-8,-9 6,-9 11,0 C6,9 -8,9 -14,0 Z"/><path class="fc-ti-fish fc-ta fc-ta-tail" d="M10,0 L19,-7 L17,0 L19,7 Z"/><circle class="fc-ti-eye" cx="-8" cy="-1.5" r="1.4"/></g>
        <g class="fc-ta fc-ta-bubble"><circle class="fc-ti-bub" cx="-17" cy="-10" r="1.6"/><circle class="fc-ti-bub" cx="-20" cy="-16" r="1.1"/></g>`;
      break;
    case 'moon': {
      // The lit part: a half disc plus an ellipse whose width follows the illuminated fraction.
      const k = clamp(x, 0, 1), r = 14, rx = f1(Math.abs(1 - 2 * k) * r), right = opt.waxing !== false;
      const s = right ? 1 : 0;
      // The terminator bulges into the lit half for a crescent and out of it for a gibbous moon.
      const gib = k > 0.5 ? s : 1 - s;
      body = `<g class="fc-ta fc-ta-glow"><circle class="fc-ti-moondark" r="${r}"/>${k < 0.02 ? '' : `<path class="fc-ti-moonlit" d="M0,-${r} A${r},${r} 0 0 ${s} 0,${r} A${rx},${r} 0 0 ${gib} 0,-${r} Z"/>`}</g>`;
      break;
    }
    case 'tide': {
      const up = opt.rising !== false;
      body = `<g class="fc-ta fc-ta-bob">${wave(8, 2.4, 3)}<path class="fc-ti-fillwater" d="M-24,8 H24 V24 H-24 Z"/></g>
        <path class="fc-ti-arrow" d="${up ? 'M0,-18 L7,-9 H2.5 V2 H-2.5 V-9 H-7 Z' : 'M0,2 L7,-7 H2.5 V-18 H-2.5 V-7 H-7 Z'}"/>`;
      break;
    }
    case 'breaker': {
      // A curling wave whose face grows with the breaker (to scale up to 2 m).
      const h = f1(6 + clamp(x, 0, 2) * 9);
      body = `<g class="fc-ta fc-ta-curl"><path class="fc-ti-face2" d="M-22,14 C-10,14 -2,${f1(14 - h)} 8,${f1(14 - h)} C15,${f1(14 - h)} 18,${f1(18 - h)} 14,${f1(21 - h)} C11,${f1(17 - h)} 6,${f1(18 - h)} 4,${f1(22 - h)} C2,4 10,14 22,14 Z"/></g><path class="fc-ti-sand" d="M-24,16 H24 V24 H-24 Z"/>`;
      break;
    }
    case 'current': {
      const speed = clamp(x / 1.5, 0.15, 1);
      body = `<g class="fc-ta fc-ta-flow" style="animation-duration:${f1(2.4 - speed * 1.6)}s"><path class="fc-ti-stream" d="M-20,-9 H12M-20,0 H16M-20,9 H12"/></g><path class="fc-ti-arrow" d="M14,-6 L21,0 L14,6 Z"/>`;
      break;
    }
    case 'reef': {
      // Water over the reef: the surface sits higher the more water there is (to 3 m).
      const top = f1(12 - clamp(x / 3, 0, 1) * 26);
      body = `<g class="fc-ta fc-ta-bob">${wave(top, 1.6, 3)}<path class="fc-ti-fillwater" d="M-24,${top} H24 V24 H-24 Z"/></g>
        <path class="fc-ti-coral" d="M-20,20 C-20,12 -16,8 -14,14 C-13,6 -8,8 -9,15 C-6,10 -3,12 -4,20 Z M2,20 C1,14 5,10 7,15 C9,9 14,10 12,16 C15,13 19,15 18,20 Z"/>`;
      break;
    }
    case 'uv': {
      // A sun whose rays lengthen with the UV index; the ring takes the UV level's colour.
      const len = f1(3 + clamp(x / 11, 0, 1) * 6), n = 8;
      let rays = '';
      for (let i = 0; i < n; i++) {
        const a = (i * 2 * Math.PI) / n, r0 = 11;
        rays += `M${f1(Math.cos(a) * r0)},${f1(Math.sin(a) * r0)} L${f1(Math.cos(a) * (r0 + len))},${f1(Math.sin(a) * (r0 + len))} `;
      }
      body = `<g class="fc-ta fc-ta-spin"><path class="fc-ti-ray" d="${rays}"/></g><circle class="fc-ti-sun" r="8"/>`;
      break;
    }
    case 'stingers':
      body = `<g class="fc-ta fc-ta-bob${x ? '' : ' fc-ti-faint'}"><path class="fc-ti-jelly" d="M-12,0 a12,11 0 0 1 24,0 Z"/><path class="fc-ti-tent fc-ta fc-ta-sway" d="M-8,1 q-2,6 0,12 M-3,1 q2,7 0,15 M3,1 q-2,7 0,14 M8,1 q2,6 0,11"/></g>`;
      break;
    case 'surge':
      body = `<path class="fc-ti-sand" d="M-24,14 C-12,10 0,16 24,12 V24 H-24 Z"/><g class="fc-ta fc-ta-sway2"><path class="fc-ti-arrow" d="M-18,0 L-10,-6 V-2.5 H10 V-6 L18,0 L10,6 V2.5 H-10 V6 Z"/></g>`;
      break;
    case 'feels':
      // Fills from 20 °C (empty) to 40 °C (full); heat shimmer from 32 °C, the NWS "extreme caution" level.
      body = thermo((x - 20) / 20, x >= 32);
      break;
    case 'water':
      // A drop of sea with its temperature as the level: 22 °C empty, 31 °C full.
      body = `<clipPath id="fc-ti-drop"><path d="M0,-19 C7,-9 13,-2 13,6 a13,13 0 0 1 -26,0 C-13,-2 -7,-9 0,-19 Z"/></clipPath>
        <path class="fc-ti-glass" d="M0,-19 C7,-9 13,-2 13,6 a13,13 0 0 1 -26,0 C-13,-2 -7,-9 0,-19 Z"/>
        <g clip-path="url(#fc-ti-drop)"><g class="fc-ta fc-ta-slide">${wave(f1(16 - clamp((x - 22) / 9, 0.1, 1) * 30), 2, 3, 'fc-ti-water')}<path class="fc-ti-fillwater" d="M-48,${f1(16 - clamp((x - 22) / 9, 0.1, 1) * 30)} H48 V24 H-48 Z"/></g></g>`;
      break;
    case 'rip':
      body = `<path class="fc-ti-pole" d="M-8,-18 V20"/><g class="fc-ta fc-ta-flag"><path class="fc-ti-flag" d="M-8,-18 C0,-21 6,-14 16,-17 V-3 C6,0 0,-7 -8,-4 Z"/></g>${wave(17, 1.6, 3)}`;
      break;
    case 'boat': {
      // Rocks harder the lower the comfort score.
      const amp = f1(2 + (1 - clamp(x / 100, 0, 1)) * 8);
      body = `<g class="fc-ta fc-ta-rock" style="--amp:${amp}deg"><path class="fc-ti-hull" d="M-16,6 H16 L11,13 H-11 Z"/><path class="fc-ti-pole" d="M0,6 V-19"/><path class="fc-ti-sail" d="M1.5,-18 L14,3 H1.5 Z M-1.5,-12 L-11,3 H-1.5 Z"/></g>${wave(15, 1.8, 3)}`;
      break;
    }
  }
  const lv = opt.lv === null || opt.lv === undefined ? '' : ` l${opt.lv}`;
  return `<svg class="fc-ti fc-ti-${kind}${lv}" viewBox="-24 -24 48 48" aria-hidden="true">${body}</svg>`;
}

/** The weather tile's large sky picture: sun, sun and cloud, cloud, a light shower, heavy rain or a thunderstorm. */
export function skyIcon(sky: WxSky | null): string {
  const cloud = (cls: string, tx = 0, ty = 0, s = 1) =>
    `<path class="${cls}" transform="translate(${tx} ${ty}) scale(${s})" d="M-13,9 a8,8 0 0 1 1,-16 a10.5,10.5 0 0 1 20,-1.5 a7.8,7.8 0 0 1 4,17.5 Z"/>`;
  const sun = (tx: number, ty: number, s: number) => {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      rays += `M${f1(Math.cos(a) * 12)},${f1(Math.sin(a) * 12)} L${f1(Math.cos(a) * 17)},${f1(Math.sin(a) * 17)} `;
    }
    return `<g transform="translate(${tx} ${ty}) scale(${s})"><g class="fc-ta fc-ta-spin"><path class="fc-ti-ray" d="${rays}"/></g><circle class="fc-ti-sun" r="8.5"/></g>`;
  };
  const drops = (n: number, heavy: boolean) => {
    let d = '';
    for (let i = 0; i < n; i++) d += `<path class="fc-ti-rain fc-ta fc-ta-fall" style="animation-delay:${f1(-i * 0.27)}s" d="M${-9 + i * (18 / Math.max(1, n - 1))},12 l-2,${heavy ? 7 : 5}"/>`;
    return d;
  };
  let body = '';
  switch (sky) {
    case 'sun': body = sun(0, 0, 1.1); break;
    case 'partly': body = `${sun(-6, -6, 0.75)}<g class="fc-ta fc-ta-drift">${cloud('fc-ti-cloud', 3, 4, 0.85)}</g>`; break;
    case 'cloud': body = `<g class="fc-ta fc-ta-drift">${cloud('fc-ti-cloud2', -6, -6, 0.6)}${cloud('fc-ti-cloud', 2, 1)}</g>`; break;
    case 'showers': body = `${sun(-8, -8, 0.6)}<g class="fc-ta fc-ta-drift">${cloud('fc-ti-cloud', 2, -2, 0.85)}</g>${drops(3, false)}`; break;
    case 'rain': body = `<g class="fc-ta fc-ta-drift">${cloud('fc-ti-cloudd', 0, -4)}</g>${drops(5, true)}`; break;
    case 'storm': body = `<g class="fc-ta fc-ta-drift">${cloud('fc-ti-cloudd', 0, -5)}</g>${drops(4, true)}<path class="fc-ti-bolt fc-ta fc-ta-flash" d="M2,4 L-4,14 H1 L-2,22 L7,10 H2 L5,4 Z"/>`; break;
    default: body = `<circle class="fc-ti-face" r="12"/>`;
  }
  return `<svg class="fc-ti fc-ti-sky fc-ti-sky-${sky ?? 'none'}" viewBox="-24 -24 48 48" aria-hidden="true">${body}</svg>`;
}

/**
 * Which tip a tile gives when it opens, a band of its value. Bands follow the page's own scales: Beaufort-ish wind words,
 * the WHO UV bands, the NWS heat-index levels (32 and 39 °C), wetsuit habits for water. Surge and rip tips follow
 * their own bands (surge.ts, rip.ts), so the page picks those by name.
 */
export function tipBand(kind: TileKind | 'rainpct' | 'humidity', v: number | null): string | null {
  if (!fin(v)) return null;
  switch (kind) {
    case 'uv': return v >= 10.5 ? 'extreme' : v >= 7.5 ? 'vhigh' : v >= 5.5 ? 'high' : v >= 2.5 ? 'mod' : 'low';
    case 'feels': return v >= 39 ? 'danger' : v >= 32 ? 'hot' : v >= 26 ? 'warm' : 'mild';
    case 'water': return v >= 28 ? 'bath' : v >= 26 ? 'warm' : v >= 24 ? 'fresh' : 'cool';
    case 'wind': case 'chop': return v >= 20 ? 'strong' : v >= 12 ? 'breezy' : v >= 5 ? 'light' : 'calm';
    case 'gust': return v >= 25 ? 'strong' : v >= 18 ? 'gusty' : 'steady';
    case 'swell': return v >= 2 ? 'big' : v >= 1 ? 'solid' : v >= 0.5 ? 'fun' : 'small';
    case 'breaker': return v > 1.3 ? 'dump' : v >= 0.6 ? 'time' : 'easy';
    case 'current': return v >= 1 ? 'strong' : v >= 0.5 ? 'mod' : 'easy';
    case 'reef': return v < 0.8 ? 'shallow' : 'ok';
    case 'boat': return v >= 75 ? 'smooth' : v >= 50 ? 'lively' : 'rough';
    case 'moon': return v >= 0.85 || v <= 0.15 ? 'spring' : 'neap';
    case 'stingers': return v ? 'maybe' : 'low';
    case 'rainpct': return v >= 80 ? 'wet' : v >= 50 ? 'likely' : v >= 20 ? 'chance' : 'dry';
    case 'humidity': return v >= 80 ? 'muggy' : v >= 65 ? 'humid' : 'comfy';
    default: return null;
  }
}

/** Small glyphs for the weather tile's facts (rain, humidity, water, UV, wind), 20 × 20. */
export function miniIcon(kind: 'rain' | 'humid' | 'water' | 'uv' | 'wind' | 'feels'): string {
  const d: Record<typeof kind, string> = {
    rain: '<path class="fc-ti-umb" d="M-8,0 a8,7 0 0 1 16,0 Z"/><path class="fc-ti-pole" d="M0,0 V6 a2,2 0 0 1 -4,0"/>',
    humid: '<path class="fc-ti-glass" d="M0,-8 C3,-4 6,-1 6,2.5 a6,6 0 0 1 -12,0 C-6,-1 -3,-4 0,-8 Z"/><path class="fc-ti-fillwater" d="M-5.6,3 H5.6 a5.6,5.6 0 0 1 -11.2,0 Z"/>',
    water: '<path class="fc-ti-water" d="M-9,-2 q2.25,-3 4.5,0 t4.5,0 t4.5,0 t4.5,0M-9,4 q2.25,-3 4.5,0 t4.5,0 t4.5,0 t4.5,0"/>',
    uv: '<circle class="fc-ti-sun" r="4"/><path class="fc-ti-ray" d="M0,-9V-6.5M0,6.5V9M-9,0H-6.5M6.5,0H9M-6.4,-6.4l1.8,1.8M4.6,4.6l1.8,1.8M-6.4,6.4l1.8,-1.8M4.6,-4.6l1.8,-1.8"/>',
    wind: '<path class="fc-ti-gust" d="M-8,-2 H4 a3,3 0 1 0 -3,-3 M-8,3 H6 a3,3 0 1 1 -3,3"/>',
    feels: '<path class="fc-ti-glass" d="M-1.8,-8 a1.8,1.8 0 0 1 3.6,0 V3 a3.8,3.8 0 1 1 -3.6,0 Z"/><circle class="fc-ti-merc" cy="6" r="2.2"/>',
  };
  return `<svg class="fc-mi" viewBox="-10 -10 20 20" aria-hidden="true">${d[kind]}</svg>`;
}
