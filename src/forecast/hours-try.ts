/**
 * The new HOUR BY HOUR section of the FORECAST page (Joseph, 2026-11-18: the stacked rows chart is "unreadable and
 * overwhelming"). He tried mockups A and C on live data and picked A with C's sea drawing in place of A's bar ribbon
 * (15:20Z): "keep the date blocks on top like they are in A ... keep the cleanness of A, remove the top and bottom
 * horizontal black lines, and the vertical black lines found in C". A switch in the header still offers the old
 * chart until he signs off on this one.
 *
 * The day buttons, then a big readout of the hour, its rating and the weather, then the four parts that decide the
 * rating, each with a plain verdict and a tap-for-help pop-up. Under them the whole week as one drawing: the sea
 * surface is the tide, the water is coloured by the rating, sky, temperature and wind sit above it, and each day's
 * best time is a green band. It slides under a fixed marker in the middle; the readout matches the marker.
 *
 * The parts, their verdicts and the best window (from the day's real sunrise to sunset) are pure and tested
 * (hours-try.test.ts). The good ranges per part are first guesses for Joseph to check, not the scores' own limits.
 */
import { activeLang, dec } from '../i18n';
import type { FcActivity, Level, TimelineHour } from './model';
import './hours-try.css';

export type HyMode = 'a' | 'chart';
export const HY_MODES: readonly HyMode[] = ['a', 'chart'];
/** The stored choice: the old chart only when picked; anything else (including C, tried on 2026-11-18) is the new view. */
export const hyModeOf = (v: unknown): HyMode => (v === 'chart' ? 'chart' : 'a');
export const isHyMode = (v: unknown): v is HyMode => v === 'chart' || v === 'a';

type Tx = { en: string; es: string };
const T = (en: string, es: string): Tx => ({ en, es });
const L = (x: Tx | string) => (typeof x === 'string' ? x : x[activeLang()]);
const H = 3.6e6;
/** good = 2, fair = 1, poor = 0, no verdict = null */
export type Status = 0 | 1 | 2 | null;

/** good when under g, fair under f (lowGood), or good from g, fair from f. */
export const s3 = (v: number | null | undefined, g: number, f: number, lowGood = true): Status =>
  v == null || !Number.isFinite(v) ? null : lowGood ? (v < g ? 2 : v < f ? 1 : 0) : v >= g ? 2 : v >= f ? 1 : 0;

export interface Part {
  k: string;
  icon: IconName;
  name: Tx;
  /** A number to draw, where the part has one. */
  v?: (h: TimelineHour) => number | null;
  text: (h: TimelineHour, i: number, tl: readonly TimelineHour[]) => string;
  status: (h: TimelineHour, i: number, tl: readonly TimelineHour[]) => Status;
  /** The verdict word for a status. */
  word: (s: Status, h: TimelineHour) => string;
  /** The good range, in the part's unit (shown in the help pop-up). */
  good?: [number, number];
  unit?: string;
  /** Draw the arrow the wind blows along instead of the icon. */
  dir?: boolean;
  help: Tx;
}

const COMP = { en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], es: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] };
export const compass = (deg: number | null) => (deg == null ? '' : COMP[activeLang()][Math.round((((deg % 360) + 360) % 360) / 45) % 8]);
const n0 = (v: number | null | undefined, d = 0) => (v == null || !Number.isFinite(v) ? '–' : dec(v, d));
const words = (p: Tx, f: Tx, g: Tx) => (s: Status) => (s == null ? '' : L([p, f, g][s]));
const fishWhy = (h: TimelineHour) => (h.read.fish?.reasons ?? []) as readonly string[];

const windPart = (g: number, f: number): Part => ({
  k: 'wind', icon: 'wind', name: T('Wind', 'Viento'), v: (h) => h.windKt, dir: true, good: [0, g], unit: 'kt',
  text: (h) => `${n0(h.windKt)} kt ${compass(h.windFromDeg)}`,
  status: (h) => s3(h.windKt, g, f),
  word: words(T('Strong', 'Fuerte'), T('Breezy', 'Brisa'), T('Light', 'Suave')),
  help: T(`Wind under ${g} knots keeps the water calm. Over ${f} knots it gets rough.`, `Viento de menos de ${g} nudos mantiene el agua tranquila. Más de ${f} nudos la pone agitada.`),
});
const tideRising = (i: number, tl: readonly TimelineHour[]) => (tl[i + 1]?.tideM ?? tl[i].tideM) >= tl[i].tideM;
const waterParts = (): Part[] => [
  { k: 'vis', icon: 'eye', name: T('Visibility', 'Visibilidad'), v: (h) => h.read.water?.visM ?? null, good: [8, 30], unit: 'm',
    text: (h) => `${n0(h.read.water?.visM)} m`, status: (h) => s3(h.read.water?.visM, 8, 4, false),
    word: words(T('Murky', 'Turbia'), T('Hazy', 'Regular'), T('Clear', 'Clara')),
    help: T('How far you can see underwater. 8 m or more is clear; under 4 m you see little.', 'Cuánto ve bajo el agua. 8 m o más es clara; con menos de 4 m ve poco.') },
  { k: 'surge', icon: 'surge', name: T('Surge', 'Vaivén'), v: (h) => h.read.water?.surgeMs ?? null, good: [0, 0.2], unit: 'm/s',
    text: (h) => `${n0(h.read.water?.surgeMs, 1)} m/s`, status: (h) => s3(h.read.water?.surgeMs, 0.2, 0.5),
    word: words(T('Dangerous', 'Peligroso'), T('Pushy', 'Empuja'), T('Gentle', 'Suave')),
    help: T('The back and forth push of the waves near the bottom. Strong surge can throw you onto the coral.', 'El empuje de ida y vuelta de las olas cerca del fondo. Si es fuerte lo puede tirar contra el coral.') },
  { k: 'entry', icon: 'brk', name: T('Getting in', 'Entrada'), v: (h) => h.read.water?.breakerM ?? null, good: [0, 0.5], unit: 'm',
    text: (h) => `${n0(h.read.water?.breakerM, 1)} m`, status: (h) => s3(h.read.water?.breakerM, 0.5, 0.9),
    word: words(T('Heavy', 'Fuerte'), T('Medium', 'Media'), T('Easy', 'Fácil')),
    help: T('Waves breaking where you get in and out of the water.', 'Olas que rompen donde entra y sale del agua.') },
  { k: 'cur', icon: 'current', name: T('Current', 'Corriente'), v: (h) => h.read.water?.currentKt ?? null, good: [0, 0.5], unit: 'kt',
    text: (h) => `${n0(h.read.water?.currentKt, 1)} kt`, status: (h) => s3(h.read.water?.currentKt, 0.5, 1),
    word: words(T('Strong', 'Fuerte'), T('Moderate', 'Media'), T('Weak', 'Débil')),
    help: T('Water moving along the coast. Over 1 knot is hard to swim against.', 'Agua que corre por la costa. Más de 1 nudo cuesta nadar en contra.') },
];

/** The four parts that decide each activity's rating, most important first. */
export function partsFor(a: FcActivity): Part[] {
  switch (a) {
    case 'fish':
      return [
        { k: 'tide', icon: 'tide', name: T('Tide', 'Marea'), v: (h) => h.tideM,
          text: (h, i, tl) => L(!fishWhy(h).includes('tide') ? T('Slack', 'Parada') : tideRising(i, tl) ? T('Rising', 'Subiendo') : T('Falling', 'Bajando')),
          status: (h) => (fishWhy(h).includes('tide') ? 2 : 1), word: words(T('', ''), T('Slow bite', 'Pican poco'), T('Bite on', 'Pican')),
          help: T('Fish feed most while the tide is moving. Around high and low tide the water goes slack and the bite slows.', 'Los peces comen más mientras la marea se mueve. Cerca de la alta y la baja el agua se para y la picada baja.') },
        { k: 'light', icon: 'light', name: T('Light', 'Luz'),
          text: (h) => { const r = fishWhy(h); return L(r.includes('golden') || r.includes('dawn') || r.includes('dusk') ? T('Golden light', 'Luz dorada') : r.includes('midday') ? T('Midday sun', 'Sol del mediodía') : r.includes('brightmoon') ? T('Bright moon', 'Luna clara') : r.includes('darknight') ? T('Dark night', 'Noche oscura') : h.day ? T('Daylight', 'De día') : T('Night', 'Noche')); },
          status: (h) => { const r = fishWhy(h); return r.includes('golden') || r.includes('dawn') || r.includes('dusk') ? 2 : r.includes('midday') ? 0 : 1; },
          word: words(T('Harsh', 'Fuerte'), T('OK', 'Normal'), T('Best', 'La mejor')),
          help: T('Dawn and dusk are the best light. In strong midday sun fish move deeper and hide.', 'El amanecer y el atardecer son la mejor luz. Con sol fuerte al mediodía los peces bajan y se esconden.') },
        { k: 'feed', icon: 'clock', name: T('Feeding time', 'Hora de comer'),
          text: (h) => { const r = fishWhy(h); return L(r.includes('major') ? T('Big one', 'Grande') : r.includes('minor') ? T('Small one', 'Pequeña') : T('None', 'Ninguna')); },
          status: (h) => { const r = fishWhy(h); return r.includes('major') ? 2 : r.includes('minor') ? 1 : null; },
          word: words(T('', ''), T('Small', 'Pequeña'), T('Big', 'Grande')),
          help: T('Times set by the moon when fish tend to feed. The big one lasts about two hours, the small one about one.', 'Horas marcadas por la luna en que los peces suelen comer. La grande dura unas dos horas, la pequeña una.') },
        windPart(10, 15),
      ];
    case 'surf': {
      const SIZE: Record<string, Tx> = { flat: T('Flat', 'Plano'), ankle: T('Ankle', 'Tobillo'), knee: T('Knee', 'Rodilla'), waist: T('Waist', 'Cintura'), chest: T('Chest', 'Pecho'), head: T('Head', 'Cabeza'), overhead: T('Overhead', 'Más alto'), double: T('Double', 'Doble') };
      const WK: Record<string, Tx> = { offshore: T('Offshore', 'Terral'), calm: T('Glassy', 'Sin viento'), cross: T('Side-on', 'Cruzado'), onshore: T('Onshore', 'Del mar') };
      const TK: Record<string, Tx> = { high: T('High', 'Alta'), mid: T('Mid', 'Media'), low: T('Low', 'Baja') };
      return [
        { k: 'waves', icon: 'brk', name: T('Waves', 'Olas'), v: (h) => h.read.surf?.hb ?? null, good: [1, 3], unit: 'm',
          text: (h) => `${n0(h.read.surf?.hb, 1)} m`, status: (h) => s3(h.read.surf?.hb, 1, 0.6, false),
          word: (_s, h) => (h.read.surf ? L(SIZE[h.read.surf.size] ?? '') : ''),
          help: T('Wave height at the break. Waist high or bigger is worth paddling out for.', 'Altura de ola en el pico. Desde la cintura para arriba vale la pena entrar.') },
        { k: 'wind', icon: 'wind', name: T('Wind', 'Viento'), v: (h) => h.windKt, dir: true,
          text: (h) => `${n0(h.windKt)} kt ${compass(h.windFromDeg)}`,
          status: (h) => (({ offshore: 2, calm: 2, cross: 1, onshore: 0 }) as Record<string, Status>)[h.read.surf?.windKind ?? ''] ?? null,
          word: (_s, h) => L(WK[h.read.surf?.windKind ?? ''] ?? ''),
          help: T('Wind from the land (offshore) holds waves up clean. Wind from the sea (onshore) makes them messy.', 'El viento de tierra (terral) deja las olas limpias. El viento del mar las desordena.') },
        { k: 'period', icon: 'period', name: T('Wave gap', 'Intervalo'), v: (h) => h.read.surf?.tp ?? null, good: [10, 20], unit: 's',
          text: (h) => `${n0(h.read.surf?.tp)} s`, status: (h) => s3(h.read.surf?.tp, 10, 8, false),
          word: words(T('Weak', 'Débil'), T('OK', 'Normal'), T('Strong', 'Fuerte')),
          help: T('Seconds between waves. 10 seconds or more means stronger, cleaner waves. Under 8 is weak wind swell.', 'Segundos entre olas. 10 o más da olas más fuertes y limpias. Menos de 8 es mar de viento débil.') },
        { k: 'tide', icon: 'tide', name: T('Tide', 'Marea'), v: (h) => h.tideM,
          text: (h) => L(TK[h.read.surf?.tideKind ?? ''] ?? '–'), status: () => null, word: () => '',
          help: T('Water level. Each break works best at its own tide.', 'Nivel del agua. Cada pico funciona mejor con su propia marea.') },
      ];
    }
    case 'swim': {
      const RIP: Record<string, Tx> = { LOW: T('Low', 'Baja'), MOD: T('Some', 'Media'), HIGH: T('High', 'Alta') };
      return [
        { k: 'rip', icon: 'rip', name: T('Rip risk', 'Resaca'), text: (h) => L(RIP[h.read.swim?.rip ?? ''] ?? '–'),
          status: (h) => (({ LOW: 2, MOD: 1, HIGH: 0 }) as Record<string, Status>)[h.read.swim?.rip ?? ''] ?? null,
          word: words(T('Danger', 'Peligro'), T('Careful', 'Cuidado'), T('Low', 'Baja')),
          help: T('Rip currents pull swimmers out to sea. When it is high, swim near a lifeguard and away from river mouths.', 'La resaca arrastra al nadador mar adentro. Si está alta, nade cerca del salvavidas y lejos de las bocas de río.') },
        { k: 'shore', icon: 'brk', name: T('Shore break', 'Rompiente'), v: (h) => h.read.swim?.breakerM ?? null, good: [0, 0.5], unit: 'm',
          text: (h) => `${n0(h.read.swim?.breakerM, 1)} m`, status: (h) => s3(h.read.swim?.breakerM, 0.5, 0.9),
          word: words(T('Heavy', 'Fuerte'), T('Medium', 'Media'), T('Small', 'Pequeña')),
          help: T('Waves breaking at the water’s edge. Under half a metre is easy to walk through.', 'Olas que rompen en la orilla. Menos de medio metro se pasa caminando.') },
        { k: 'sun', icon: 'sun', name: T('Sun', 'Sol'), v: (h) => h.uv,
          text: (h) => (h.day ? `UV ${n0(h.uv)}` : L(T('Dark', 'Oscuro'))), status: (h) => (!h.day ? 0 : (h.uv ?? 0) >= 8 ? 1 : 2),
          word: words(T('Dark', 'De noche'), T('Burning', 'Quema'), T('Fine', 'Bien')),
          help: T('UV 8 or more burns skin in about 15 minutes. Cover up. After dark, stay out of the water.', 'Con UV 8 o más la piel se quema en unos 15 minutos. Cúbrase. De noche no se meta al agua.') },
        windPart(10, 15),
      ];
    }
    case 'snorkel':
    case 'dive':
    case 'spear':
      return waterParts();
    case 'sail':
      return [
        { k: 'wind', icon: 'wind', name: T('Wind', 'Viento'), v: (h) => h.windKt, dir: true, good: [8, 18], unit: 'kt',
          text: (h) => `${n0(h.windKt)} kt ${compass(h.windFromDeg)}`,
          status: (h) => { const v = h.windKt; return v == null ? null : v >= 8 && v <= 18 ? 2 : v >= 5 && v <= 22 ? 1 : 0; },
          word: (_s, h) => { const v = h.windKt; return v == null ? '' : L(v < 5 ? T('Too light', 'Muy flojo') : v < 8 ? T('Light', 'Flojo') : v <= 18 ? T('Good', 'Bueno') : v <= 22 ? T('Fresh', 'Fresco') : T('Too strong', 'Muy fuerte')); },
          help: T('8 to 18 knots is a good sailing breeze. Under 5 you drift; over 22, reef early.', 'De 8 a 18 nudos es buena brisa. Con menos de 5 se queda quieto; con más de 22, rice temprano.') },
        { k: 'swell', icon: 'swell', name: T('Sea', 'Mar'), v: (h) => h.read.sail?.swellM ?? null, good: [0, 1], unit: 'm',
          text: (h) => `${n0(h.read.sail?.swellM, 1)} m`, status: (h) => s3(h.read.sail?.swellM, 1, 1.5),
          word: words(T('Rough', 'Agitado'), T('Lumpy', 'Movido'), T('Smooth', 'Tranquilo')),
          help: T('Wave height out at sea. Under one metre is a comfortable ride.', 'Altura de ola mar adentro. Menos de un metro es cómodo.') },
        { k: 'squall', icon: 'storm', name: T('Squalls', 'Chubascos'),
          text: (h) => L([T('None', 'No'), T('Possible', 'Posibles'), T('Likely', 'Probables')][Math.round(h.squall ?? 0)] ?? T('Likely', 'Probables')),
          status: (h) => ([2, 1, 0] as const)[Math.min(2, Math.round(h.squall ?? 0))],
          word: words(T('Likely', 'Probables'), T('Possible', 'Posibles'), T('None', 'No')),
          help: T('Sudden storms with strong gusts. Watch the sky to the east.', 'Tormentas repentinas con ráfagas fuertes. Mire el cielo al este.') },
        { k: 'tide', icon: 'tide', name: T('Tide', 'Marea'), v: (h) => h.tideM,
          text: (h) => `${h.tideM >= 0 ? '+' : ''}${dec(h.tideM, 2)} m`, status: () => null, word: () => '',
          help: T('Water level over the reef at the harbour mouth.', 'Nivel del agua sobre el arrecife a la salida del puerto.') },
      ];
    case 'paddle':
      return [
        windPart(8, 12),
        { k: 'off', icon: 'off', name: T('Wind out to sea', 'Viento hacia afuera'), v: (h) => h.read.paddle?.offshoreKt ?? null, good: [0, 3], unit: 'kt',
          text: (h) => `${n0(h.read.paddle?.offshoreKt)} kt`, status: (h) => s3(h.read.paddle?.offshoreKt, 3, 6),
          word: words(T('Pushes out', 'Le empuja'), T('Some push', 'Algo'), T('Little', 'Poco')),
          help: T('The part of the wind blowing from land to sea. It makes the trip back harder.', 'La parte del viento que sopla de tierra al mar. Hace más difícil la vuelta.') },
        { k: 'waves', icon: 'swell', name: T('Waves', 'Olas'), v: (h) => h.read.paddle?.hsM ?? null, good: [0, 0.6], unit: 'm',
          text: (h) => `${n0(h.read.paddle?.hsM, 1)} m`, status: (h) => s3(h.read.paddle?.hsM, 0.6, 1),
          word: words(T('Big', 'Grandes'), T('Medium', 'Medianas'), T('Small', 'Pequeñas')),
          help: T('Wave height outside the break. Under 0.6 m is easy paddling.', 'Altura de ola afuera de la rompiente. Menos de 0,6 m se rema fácil.') },
        { k: 'launch', icon: 'brk', name: T('Launch', 'Salida'), v: (h) => h.read.paddle?.breakerM ?? null, good: [0, 0.5], unit: 'm',
          text: (h) => `${n0(h.read.paddle?.breakerM, 1)} m`, status: (h) => s3(h.read.paddle?.breakerM, 0.5, 0.9),
          word: words(T('Heavy', 'Fuerte'), T('Medium', 'Media'), T('Easy', 'Fácil')),
          help: T('Waves breaking where you launch and land. Over 0.9 m can flip a kayak.', 'Olas donde sale y llega. Más de 0,9 m puede voltear un kayak.') },
      ];
  }
}

/**
 * The best stretch of a day: daylight hours only, from that day's real sunrise to its sunset (Joseph 2026-11-16,
 * never a fixed hour range). The top-scoring hour and its neighbours within 4 points, if the top hour is at least
 * FAIR; the ends are clipped to sunrise and sunset. `d0` is the index of the day's first hour.
 */
export interface Best { a: number; b: number; startMs: number; endMs: number; level: Level; peak: number }
export function bestOfDay(tl: readonly TimelineHour[], d0: number): Best | null {
  const end = Math.min(tl.length, d0 + 24);
  const ok0 = (i: number) => tl[i].day && tl[i].read.score != null && tl[i].read.level != null;
  let bi = -1;
  for (let i = d0; i < end; i++) if (ok0(i) && (bi < 0 || tl[i].read.score! > tl[bi].read.score!)) bi = i;
  if (bi < 0 || tl[bi].read.level! < 2) return null;
  const top = tl[bi].read.score!;
  const ok = (i: number) => i >= d0 && i < end && ok0(i) && tl[i].read.score! >= top - 4 && tl[i].read.level! >= 2;
  let a = bi, b = bi;
  while (ok(a - 1)) a--;
  while (ok(b + 1)) b++;
  const rise = tl[bi].sunriseMs ?? null, set = tl[bi].sunsetMs ?? null;
  return { a, b, startMs: Math.max(tl[a].ms, rise ?? -Infinity), endMs: Math.min(tl[b].ms + H, set ?? Infinity), level: tl[bi].read.level!, peak: bi };
}

/** High and low tides: each local turn of the hourly curve, its time refined by a parabola through three hours. */
export interface Turn { ms: number; m: number; high: boolean }
export function tideTurns(tl: readonly TimelineHour[]): Turn[] {
  const out: Turn[] = [];
  for (let i = 1; i < tl.length - 1; i++) {
    const a = tl[i - 1].tideM, b = tl[i].tideM, c = tl[i + 1].tideM;
    const high = b > a && b >= c, low = b < a && b <= c;
    if (!high && !low) continue;
    const den = a - 2 * b + c, off = den ? (0.5 * (a - c)) / den : 0;
    out.push({ ms: tl[i].ms + off * H, m: b - (0.25 * (a - c) * off), high });
  }
  return out;
}

/* ---------- icons (24 grid, square caps) */
const IC = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  moon: '<path d="M16.5 3.5A8.5 8.5 0 1 0 20.5 16 7 7 0 0 1 16.5 3.5z"/>',
  cloud: '<path d="M6.5 19h11a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 10.2 4.4 4.4 0 0 0 6.5 19z"/>',
  psun: '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.8M1.5 8h1.8M3.4 3.4l1.3 1.3M12.6 3.4l-1.3 1.3"/><path d="M8.5 21h9a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.6 13.2 3.9 3.9 0 0 0 8.5 21z"/>',
  pmoon: '<path d="M10 2.5A5.5 5.5 0 1 0 13 11 4.5 4.5 0 0 1 10 2.5z"/><path d="M8.5 21h9a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.6 13.2 3.9 3.9 0 0 0 8.5 21z"/>',
  rain: '<path d="M6.5 15h11a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 6.2 4.4 4.4 0 0 0 6.5 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  storm: '<path d="M6.5 15h11a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 6.2 4.4 4.4 0 0 0 6.5 15z"/><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>',
  tide: '<path d="M2 18c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M12 3v9M8.5 6.5L12 3l3.5 3.5"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  surge: '<path d="M3 9h15M14 5l4 4-4 4"/><path d="M21 15H6M10 11l-4 4 4 4"/>',
  current: '<path d="M3 7h13M13 4l3 3-3 3M3 12h17M17 9l3 3-3 3M3 17h11M11 14l3 3-3 3"/>',
  rip: '<path d="M2 20h20"/><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16.5c1.5-1 2.5-1 4 0M16 16.5c1.5-1 2.5-1 4 0"/>',
  brk: '<path d="M2 20h20"/><path d="M3 20c0-7 5-11 11-11 3 0 5 2 5 4.5 0 2-1.5 3.5-3.5 3.5-1.8 0-3-1.2-3-3"/>',
  period: '<path d="M2 7c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 12.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 18c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
  light: '<path d="M2 18h20M6 18a6 6 0 0 1 12 0M12 5v3M4.2 9.2l2 2M19.8 9.2l-2 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  swell: '<path d="M2 16c3 0 4-7 7-7s4 7 7 7 3-3 6-3"/><path d="M2 20h20"/>',
  off: '<path d="M2 20h8l3-4h9"/><path d="M5 9h13M14 5l4 4-4 4"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  arrow: '<path d="M12 3v18M5 14l7 7 7-7"/>',
  rise: '<path d="M2 19h20M6 19a6 6 0 0 1 12 0M12 4v7M9 7l3-3 3 3"/>',
  set: '<path d="M2 19h20M6 19a6 6 0 0 1 12 0M12 4v7M9 8l3 3 3-3"/>',
} as const;
export type IconName = keyof typeof IC;
const ic = (n: IconName, style = '') => `<svg class="hy-ic" viewBox="0 0 24 24" aria-hidden="true"${style ? ` style="${style}"` : ''}>${IC[n]}</svg>`;
const arrowIc = (deg: number | null) => ic('arrow', `transform:rotate(${Math.round(deg ?? 0)}deg)`);
const sic = (n: IconName, x: number, y: number, s: number) =>
  `<g transform="translate(${x.toFixed(1)},${y}) scale(${(s / 24).toFixed(3)})" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="square" stroke-linejoin="miter">${IC[n]}</g>`;

/** The sky drawn for an hour: storm, rain, cloud, part cloud, or a clear sun or moon. */
export function skyIcon(h: Pick<TimelineHour, 'cloudPct' | 'rainMmH' | 'rainPct' | 'squall' | 'day'>): IconName {
  const cl = h.cloudPct ?? 0, rn = h.rainMmH ?? 0, rp = h.rainPct ?? 0;
  if ((h.squall ?? 0) >= 2) return 'storm';
  if (rn >= 0.5 || (rp >= 60 && rn >= 0.2)) return 'rain';
  if (cl >= 75) return 'cloud';
  if (cl >= 35) return h.day ? 'psun' : 'pmoon';
  return h.day ? 'sun' : 'moon';
}
const skyCol = (k: IconName) => (k === 'sun' || k === 'psun' ? 'var(--fc-c-sun)' : k === 'rain' || k === 'storm' ? 'var(--fc-c-acc)' : 'var(--fc-ink2)');

/* ---------- words */
const W = {
  best: T('Best time', 'Mejor hora'), noBest: T('No good time this day', 'Hoy no hay buena hora'), now: T('NOW', 'AHORA'), feels: T('feels', 'sensación'),
  dragC: T('Slide the picture under the needle', 'Deslice el dibujo bajo la aguja'),
  more: T('Each part, hour by hour', 'Cada parte, hora por hora'), goodWhen: T('Good when', 'Bueno cuando'), high: T('HIGH', 'ALTA'), low: T('LOW', 'BAJA'),
  water: T('Water colour = rating', 'Color del agua = calificación'), tide: T('Sea level = tide', 'Nivel del mar = marea'), 
  days: { en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], es: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] },
  lvl: { en: ['Very poor', 'Poor', 'Fair', 'Good', 'Great'], es: ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'] },
  close: T('Close', 'Cerrar'), sea: T('The week as a picture', 'La semana en un dibujo'),
};
const lvWord = (l: Level | null) => (l == null ? '–' : W.lvl[activeLang()][l]);

/* ---------- time */
const pad = (n: number) => String(n).padStart(2, '0');
const lt = (ms: number, tz: number) => new Date(ms + tz * H);
export const hm = (ms: number, tz: number) => { const d = lt(ms, tz); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const hh = (ms: number, tz: number) => pad(lt(ms, tz).getUTCHours());
const dayName = (ms: number, tz: number) => W.days[activeLang()][lt(ms, tz).getUTCDay()];
const dayNum = (ms: number, tz: number) => lt(ms, tz).getUTCDate();
const lvC = (l: Level | null | undefined) => (l == null ? 'hn' : `h${l}`);
const stC = (s: Status) => (s == null ? 'hn' : `hs${s}`);

/* ---------- shared pieces */
export interface HyCtx {
  tl: readonly TimelineHour[];
  act: FcActivity;
  tz: number;
  /** The hour shown (an index into tl) and the hour now. */
  cur: number;
  now: number;
}
function wx(h: TimelineHour) {
  return `<div class="hy-wx"><span>${ic(skyIcon(h))} ${n0(h.airC)}°</span><span>${L(W.feels)} ${n0(h.feelsC)}°</span><span>${ic('drop')} ${n0(h.rainPct)}%</span><span>UV ${n0(h.uv)}</span><span>${arrowIc(h.windFromDeg)} ${n0(h.windKt)} kt</span></div>`;
}
export function readoutHtml(c: HyCtx, extra = ''): string {
  const h = c.tl[c.cur];
  if (!h) return '';
  const l = h.read.level;
  return `<div class="hy-ro ${lvC(l)}"><div class="hy-ro-row"><div><div class="hy-ro-t">${hh(h.ms, c.tz)}:00</div><div class="hy-ro-d">${dayName(h.ms, c.tz)} ${dayNum(h.ms, c.tz)}${c.cur === c.now ? ' · ' + L(W.now) : ''}</div></div>
    <div class="hy-ro-r"><b>${lvWord(l)}</b><span>${h.read.score == null ? '–' : Math.round(h.read.score)} / 100</span></div></div>${extra}${wx(h)}</div>`;
}
const partIcon = (p: Part, h: TimelineHour) => (p.dir ? arrowIc(h.windFromDeg) : ic(p.icon));
export function popHtml(p: Part, c: HyCtx): string {
  const h = c.tl[c.cur];
  const g = p.good ? `<div class="hy-good"><span>${L(W.goodWhen)}: ${p.good[0] === 0 ? '< ' + dec(p.good[1], p.good[1] < 2 ? 1 : 0) : '≥ ' + dec(p.good[0], p.good[0] < 2 ? 1 : 0)} ${p.unit ?? ''}</span></div>` : '';
  return `<h4><span>${L(p.name)} · ${p.text(h, c.cur, c.tl)}</span><button type="button" class="hy-x" data-hy-close aria-label="${L(W.close)}">✕</button></h4><p>${L(p.help)}</p>${g}`;
}
export const partAt = (act: FcActivity, k: number): Part | undefined => partsFor(act)[k];

/* ---------- A: day ribbon */
const dayStart = (c: HyCtx) => Math.floor(c.cur / 24) * 24;
export function daysHtml(c: HyCtx): string {
  const d0 = dayStart(c);
  let s = '<div class="hy-days">';
  for (let d = 0; d * 24 < c.tl.length; d++) {
    let mb = '';
    for (let i = d * 24; i < Math.min(c.tl.length, d * 24 + 24); i++) mb += `<i class="${lvC(c.tl[i].read.level)}${c.tl[i].day ? '' : ' nt'}"></i>`;
    const ms = c.tl[d * 24].ms + 12 * H;
    s += `<button type="button" class="hy-dy" data-hy-day="${d}" aria-pressed="${d * 24 === d0}"><b>${dayName(ms, c.tz)}</b><span>${dayNum(ms, c.tz)}</span><span class="hy-mb">${mb}</span></button>`;
  }
  return s + '</div>';
}
export function tilesHtml(c: HyCtx): string {
  const h = c.tl[c.cur];
  return `<div class="hy-fx">${partsFor(c.act).map((p, k) => { const s = p.status(h, c.cur, c.tl); return `<button type="button" class="hy-ft ${stC(s)}" data-hy-part="${k}">${partIcon(p, h)}<span class="n">${L(p.name)}</span><span class="v"><b>${p.text(h, c.cur, c.tl)}</b><em>${p.word(s, h)}</em></span></button>`; }).join('')}</div>`;
}
export function stripsHtml(c: HyCtx): string {
  const d0 = dayStart(c);
  return partsFor(c.act).map((p) => { let cells = ''; for (let i = d0; i < Math.min(c.tl.length, d0 + 24); i++) cells += `<i class="${stC(p.status(c.tl[i], i, c.tl))}${i === c.cur ? ' on' : ''}"></i>`; return `<div class="hy-strip"><span>${L(p.name)}</span><div class="hy-cells">${cells}</div></div>`; }).join('');
}
export function bestBtnHtml(c: HyCtx): string {
  const b = bestOfDay(c.tl, dayStart(c));
  return b
    ? `<button type="button" class="hy-best" data-hy-go="${b.peak}"><b>${L(W.best)}</b><span>${hm(b.startMs, c.tz)}–${hm(b.endMs, c.tz)} · ${lvWord(b.level)}</span></button>`
    : `<div class="hy-best none"><b>${L(W.noBest)}</b></div>`;
}
/* ---------- the sea picture */
export const PXC = 26;
export const SEA_PAD = 179;
export function seaSvg(c: HyCtx): string {
  const tl = c.tl, n = tl.length, Wt = n * PXC + SEA_PAD * 2, Hh = 262, WB = 226, t0 = tl[0].ms;
  const X = (i: number) => SEA_PAD + i * PXC, xm = (ms: number) => SEA_PAD + ((ms - t0) / H) * PXC;
  let lo = Infinity, hi = -Infinity;
  for (const h of tl) (lo = Math.min(lo, h.tideM)), (hi = Math.max(hi, h.tideM));
  const span = Math.max(0.3, hi - lo), yT = (v: number) => 186 - ((v - lo) / span) * 70;
  // Each day's best time: a green band behind the sky and sea, and a green bar with its times under the sea.
  let under = '', over = '';
  for (let d0 = 0; d0 < n; d0 += 24) {
    const b = bestOfDay(tl, d0);
    if (!b) continue;
    const a = xm(b.startMs).toFixed(1), w = (xm(b.endMs) - xm(b.startMs)).toFixed(1);
    under += `<rect class="hy-bestband" x="${a}" y="22" width="${w}" height="${WB - 22}"/>`;
    over += `<rect class="hy-bestbar" x="${a}" y="${WB + 3}" width="${w}" height="8"/><text x="${(xm(b.endMs) + 4).toFixed(1)}" y="${WB + 11}" class="hy-dn hy-sm2">${L(W.best).toUpperCase()} ${hm(b.startMs, c.tz)}–${hm(b.endMs, c.tz)}</text>`;
  }
  let s = `<svg width="${Wt}" height="${Hh}" viewBox="0 0 ${Wt} ${Hh}" role="img" aria-label="${L(W.sea)}">`;
  // Runs of like hours are drawn as one block, so see-through dark-mode fills show no seams between hours.
  const runs = (key: (i: number) => unknown, draw: (a: number, b: number) => string) => {
    let out = '';
    for (let a = 0, b = 1; a < n; a = b, b = a + 1) { while (b < n && key(b) === key(a)) b++; out += draw(a, b); }
    return out;
  };
  s += runs((i) => tl[i].day, (a, b) => `<rect x="${X(a)}" y="22" width="${(b - a) * PXC}" height="${WB - 22}" fill="${tl[a].day ? 'var(--hy-day)' : 'var(--fc-c-night)'}"/>`);
  s += under;
  let path = `M${X(0)} ${yT(tl[0].tideM).toFixed(1)}`;
  for (let i = 0; i < n; i++) path += ` L${X(i) + PXC / 2} ${yT(tl[i].tideM).toFixed(1)}`;
  path += ` L${X(n)} ${yT(tl[n - 1].tideM).toFixed(1)} L${X(n)} ${WB} L${X(0)} ${WB} Z`;
  s += `<defs><clipPath id="fc-hy-wcl"><path d="${path}"/></clipPath></defs><g clip-path="url(#fc-hy-wcl)">`;
  s += runs((i) => lvC(tl[i].read.level), (a, b) => `<rect class="${lvC(tl[a].read.level)} hy-water" x="${X(a)}" y="100" width="${(b - a) * PXC}" height="${WB - 100}"/>`);
  s += '</g>';
  for (let i = 0; i < n - 1; i++) s += `<line class="${lvC(tl[i].read.level)} hy-surf" x1="${X(i) + PXC / 2}" y1="${yT(tl[i].tideM).toFixed(1)}" x2="${X(i + 1) + PXC / 2}" y2="${yT(tl[i + 1].tideM).toFixed(1)}"/>`;
  for (const tt of tideTurns(tl)) {
    const xx = xm(tt.ms), yy = yT(tt.m);
    s += `<rect x="${(xx - 4).toFixed(1)}" y="${(yy - 4).toFixed(1)}" width="8" height="8" fill="var(--fc-bg)" stroke="var(--fc-ink)" stroke-width="2"/>`;
    s += `<text x="${xx.toFixed(1)}" y="${(tt.high ? yy - 10 : yy + 19).toFixed(1)}" text-anchor="middle" class="hy-tx hy-b">${L(tt.high ? W.high : W.low)} ${hm(tt.ms, c.tz)}</text>`;
  }
  for (let i = 1; i < n; i += 3) {
    const h = tl[i], k = skyIcon(h), cx = X(i) + PXC / 2, w = h.windKt ?? 0, len = 8 + Math.min(w, 20) * 0.9;
    s += `<g style="color:${skyCol(k)}">${sic(k, cx - 10, 26, 20)}</g><text x="${cx}" y="62" text-anchor="middle" class="hy-tx">${n0(h.airC)}°</text>`;
    s += `<g transform="translate(${cx},86) rotate(${Math.round(h.windFromDeg ?? 0)})"><path d="M0 ${(-len / 2).toFixed(1)}V${(len / 2).toFixed(1)}M-4 ${(len / 2 - 5).toFixed(1)}L0 ${(len / 2).toFixed(1)}L4 ${(len / 2 - 5).toFixed(1)}" fill="none" stroke="var(--fc-ink2)" stroke-width="2" stroke-linecap="square"/></g>`;
    s += `<text x="${cx}" y="108" text-anchor="middle" class="hy-tx2 hy-sm">${n0(w)}</text>`;
    if ((h.rainPct ?? 0) >= 30) s += `<g stroke="var(--fc-c-acc)" stroke-width="2">${[-6, 0, 6].map((dx) => `<line x1="${cx + dx}" y1="46" x2="${cx + dx - 2}" y2="52"/>`).join('')}</g>`;
  }
  // Day names and sunrise and sunset; no dividing lines (Joseph: keep it clean, the nights already split the days).
  for (let d0 = 0; d0 < n; d0 += 24) {
    const mid = tl[Math.min(n - 1, d0 + 12)];
    s += `<text x="${X(d0) + 5}" y="16" class="hy-dn">${dayName(mid.ms, c.tz)} ${dayNum(mid.ms, c.tz)}</text>`;
    for (const [ms, nm] of [[mid.sunriseMs, 'rise'], [mid.sunsetMs, 'set']] as const) {
      if (ms == null) continue;
      const xx = xm(ms);
      s += `<line x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}" y1="22" y2="${WB}" stroke="var(--fc-c-sun)" stroke-width="1.5" stroke-dasharray="3 3"/><g style="color:var(--fc-c-sun)">${sic(nm, xx - 15, 3, 13)}</g><text x="${xx.toFixed(1)}" y="15" class="hy-tx2">${hm(ms, c.tz)}</text>`;
    }
  }
  for (let i = 0; i < n; i++) { const hr = +hh(tl[i].ms, c.tz); if (hr % 6) continue; s += `<text x="${X(i)}" y="${Hh - 4}" text-anchor="middle" class="hy-tx2">${pad(hr)}</text>`; }
  if (c.now >= 0 && c.now < n) { const nx = X(c.now) + PXC / 2; s += `<path d="M${nx - 5} ${WB}L${nx} ${WB - 7}L${nx + 5} ${WB}Z" fill="var(--fc-ink)"/><text x="${nx}" y="${WB - 10}" text-anchor="middle" class="hy-tx hy-b hy-sm">${L(W.now)}</text>`; }
  return s + over + '</svg>';
}
/** The whole section; the page swaps its parts in place while the picture slides. */
export function viewHtml(c: HyCtx, moreOpen: boolean): string {
  return `<div data-hy="days">${daysHtml(c)}</div><div data-hy="ro">${readoutHtml(c)}</div><div data-hy="fx">${tilesHtml(c)}</div>
    <div class="hy-cview"><div class="hy-cs" id="fc-hy-cs">${seaSvg(c)}</div><div class="hy-needle"></div></div>
    <p class="hy-hint">↔ ${L(W.dragC)}</p><div data-hy="best">${bestBtnHtml(c)}</div>
    <div class="hy-key"><span><i class="h3"></i><i class="h2"></i><i class="h0"></i> ${L(W.water)}</span><span>${ic('tide')} ${L(W.tide)}</span><span><i class="win"></i> ${L(W.best)}</span></div>
    <details class="hy-more" id="fc-hy-more"${moreOpen ? ' open' : ''}><summary>${L(W.more)}</summary><div class="hy-strips" data-hy="strips">${stripsHtml(c)}</div></details>`;
}

/** The section header's switch. */
export function switchHtml(mode: HyMode): string {
  const lab: Record<HyMode, Tx> = { a: T('New', 'Nuevo'), chart: T('Old chart', 'Gráfico anterior') };
  return HY_MODES.map((m) => `<button type="button" data-hy-mode="${m}" aria-pressed="${m === mode}">${L(lab[m])}</button>`).join('');
}
