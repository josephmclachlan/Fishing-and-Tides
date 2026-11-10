/**
 * The FORECAST page's readings (PLAN 7.52): one activity at one spot and hour, in the shape the page
 * shows. Pure: no DOM, no timers. It adds no model of its own. Each activity is read from the score the
 * rest of the app already uses, so the page never disagrees with the map:
 *   SURF     the break score (surf-estimate.ts surfDetailAt, the WATCH / BEST TODAY estimate) and its
 *            estimated breaker height
 *   FISH     BITE (fishing/bite.ts) with its reasons, plus the likely local eating fish at the spot
 *   SNORKEL  the DIVE & SNORKEL outing score at 2 m, with its surge and visibility
 *   DIVE     the same at 6 m
 *   SAIL     SEA COMFORT with wind, gusts and squalls (metrics/registry.ts)
 *   SWIM     the beach-day score SWIM (physics/swim.ts via registry swimAt): rip risk and shore break at the
 *            spot from the spot model, UV, feels-like, wind, rain, water
 * The day bubbles are plan.ts planDays for this one spot, so a best day here is WATCH's best day there.
 *
 * Levels 0..4 (very poor to great) use each score's own thresholds: the same cut points as its tone on the
 * map (surf bands, BITE 40/60, outing CAUTION 40 and GO 70, comfort 50/75), with one extra cut each side.
 */
import { daySky, localDayStart, type DaySky } from '../physics/astro';
import { predict, tideState } from '../physics/tide';
import { haversineM } from '../geo';
import { PLUME_RIVERS, SPOT_RENAMES } from '../region';
import { SPECIES, type SpeciesId } from '../fishing/species';
import { seasonFactor } from '../fishing/habitat';
import { waterTerm } from '../fishing/water';
import type { BiteReason } from '../fishing/bite';
import { stingerGuess, type OutingReason, type OutingScore } from '../physics/outing';
import { SNORKEL_SPOTS, type SnorkelAccess } from '../data/snorkel-spots';
import { surgeBand, type SurgeBand } from '../physics/surge';
import { METRIC_BY_ID, biteAt, surfHourFor, swimAt, type MetricEnv, type SwimDetail } from '../metrics/registry';
import { surfDetailAt } from '../metrics/surf-estimate';
import { planDays, spotsFor, type Plan, type PlanActivity } from '../metrics/plan';
import type { Spot } from '../metrics/forecast';
import type { SurfBand, SurfQuality } from '../surf-quality';

export type FcActivity = 'fish' | 'surf' | 'swim' | 'snorkel' | 'dive' | 'sail';
/** In Joseph's order, SWIM (a beach day) beside SURF. */
export const FC_ACTIVITIES: readonly FcActivity[] = ['fish', 'surf', 'swim', 'snorkel', 'dive', 'sail'];
export const isFcActivity = (x: unknown): x is FcActivity => typeof x === 'string' && (FC_ACTIVITIES as readonly string[]).includes(x);
/** plan.ts calls sailing BOAT. */
export const planActivity = (a: FcActivity): PlanActivity => (a === 'sail' ? 'boat' : a);

/** Outing score with its inputs at a spot and hour (dive-hud.ts outingDetail, read at the spot's nearest water). */
export interface OutingRead extends OutingScore {
  surgeMs: number;
  visM: number | null;
  breakerM: number;
  currentMs?: number;
  windMs?: number;
  waterM?: number;
  rip?: 'LOW' | 'MOD' | 'HIGH';
  uv?: number;
}
export type OutingDetailAt = (spot: Spot, mode: 'snorkel' | 'dive', ms: number, localHour: number) => OutingRead | null;

export interface FcDeps {
  env: MetricEnv;
  /** Needed for SNORKEL and DIVE; without it they read no data. */
  outing?: OutingDetailAt;
}

export type Level = 0 | 1 | 2 | 3 | 4;
const H = 3.6e6;
const KT = 1.94384;

/** Cut points between levels 0|1, 1|2, 2|3, 3|4 on each headline's own scale. */
export const LEVEL_CUTS: Readonly<Record<Exclude<FcActivity, 'surf'>, readonly [number, number, number, number]>> = {
  fish: [20, 40, 60, 80],
  snorkel: [20, 40, 70, 85],
  dive: [20, 40, 70, 85],
  sail: [25, 50, 75, 90],
  swim: [20, 40, 70, 85],
};
const SURF_LEVEL: Record<SurfBand, Level> = { FLAT: 0, POOR: 1, FAIR: 2, GOOD: 3, EPIC: 4 };

export function levelFor(a: FcActivity, score: number, surfBand?: SurfBand): Level {
  if (a === 'surf') return surfBand ? SURF_LEVEL[surfBand] : 0;
  const c = LEVEL_CUTS[a];
  return (score >= c[3] ? 4 : score >= c[2] ? 3 : score >= c[1] ? 2 : score >= c[0] ? 1 : 0) as Level;
}

/** Plain size words for a breaker height, m, against an adult surfer (about 1.7 m). */
export type SurfSize = 'flat' | 'ankle' | 'knee' | 'waist' | 'chest' | 'head' | 'overhead' | 'double';
export function surfSize(hb: number): SurfSize {
  // Flat below 0.3 m, as the surf score's FLAT band (surf-quality.ts surfBand).
  if (hb < 0.3) return 'flat';
  if (hb < 0.5) return 'ankle';
  if (hb < 0.8) return 'knee';
  if (hb < 1.1) return 'waist';
  if (hb < 1.5) return 'chest';
  if (hb < 2) return 'head';
  if (hb < 3) return 'overhead';
  return 'double';
}
/**
 * The range shown for a breaker height: the estimate is the significant breaker (the mean of the highest third),
 * so the sets run up to about 1.3 times it and the smaller waves down to about 0.75. Rounded to 0.1 m.
 */
export const surfRange = (hb: number): [number, number] => [Math.round(hb * 7.5) / 10, Math.max(Math.round(hb * 7.5) / 10, Math.round(hb * 13) / 10)];

export interface SurfRead {
  hb: number;
  range: [number, number];
  size: SurfSize;
  band: SurfBand;
  windKind: SurfQuality['windKind'];
  /** Main swell train: height m, period s, direction FROM °T. */
  hs: number;
  tp: number;
  dir: number;
  facing: number;
  windKt: number | null;
  windFromDeg: number | null;
  tideKind: SurfQuality['tideKind'];
}
export interface FishRead {
  reasons: BiteReason[];
  /** Likely eating fish at the spot this month, best first (no ciguatera-risk species). */
  species: SpeciesId[];
  moonPhase: number;
  moonIllum: number;
  tideRising: boolean;
  tideLevel: number;
  /** The sun is up at the hour (between the day's sunrise and sunset). */
  daylight: boolean;
}
export interface WaterRead {
  reasons: OutingReason[];
  visM: number | null;
  surgeMs: number;
  surge: SurgeBand;
  depthM: number;
  sstC: number | null;
  /** Surf at the entry, m (the spot model scaled to the hour's swell). */
  breakerM: number;
  /** Surface current, kt; wind, kt; null when that feed has nothing. */
  currentKt: number | null;
  windKt: number | null;
  /** Water over the reef at this hour's tide, m (capped at the activity depth on open water). */
  waterM: number | null;
  rip: 'LOW' | 'MOD' | 'HIGH' | null;
  uv: number | null;
  /** SNORKEL: the catalog spot's access and the on-shore-wind stinger guess (outing.ts stingerGuess). */
  access: SnorkelAccess | null;
  stingers: boolean | null;
}
/** Words for a snorkeller: chop from the wind, drift from the current. */
export type Chop = 'flat' | 'light' | 'choppy' | 'rough';
export const chopFor = (kt: number): Chop => (kt < 6 ? 'flat' : kt < 11 ? 'light' : kt < 16 ? 'choppy' : 'rough');
export type Drift = 'slack' | 'gentle' | 'strong';
export const driftFor = (kt: number): Drift => (kt < 0.3 ? 'slack' : kt < 0.9 ? 'gentle' : 'strong');
export interface SailRead {
  windKt: number | null;
  gustKt: number | null;
  fromDeg: number | null;
  squall: number | null;
  swellM: number | null;
}

export interface FcRead {
  activity: FcActivity;
  ms: number;
  /** The headline score on its own scale (surf /10, the rest /100), or null without data. */
  score: number | null;
  /** score as 0..1 of its scale. */
  share: number | null;
  level: Level | null;
  surf?: SurfRead;
  fish?: FishRead;
  water?: WaterRead;
  sail?: SailRead;
  swim?: SwimDetail;
}

const localHour = (ms: number, tz: number) => ((((ms + tz * H) % 864e5) + 864e5) % 864e5) / H;
const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/** A per-day sky memo: daySky is a few hundred µs and a week of hours asks for it 168 times. */
export function skyMemo(tz: number) {
  const m = new Map<string, DaySky>();
  return (ms: number, lat: number, lng: number): DaySky => {
    const d = localDayStart(ms, tz);
    const k = `${d}|${lat}|${lng}`;
    let s = m.get(k);
    if (!s) m.set(k, (s = daySky(d, lat, lng)));
    return s;
  };
}

/**
 * Eating fish likely at a spot in a month: season × how well the water suits it (fishing/water.ts) × the spot's
 * structure (a river mouth within 3 km favours mouth feeders, otherwise reef and drop-off feeders). A rule of
 * thumb for the hero line, not the habitat map. Species with a ciguatera warning are left out of it.
 */
export function likelyFish(lngLat: [number, number], month: number, water: { visM?: number | null; sstC?: number | null }, n = 3): SpeciesId[] {
  const mouthKm = Math.min(...PLUME_RIVERS.map((r) => haversineM(lngLat, r.mouth) / 1000));
  const nearMouth = mouthKm <= 3;
  return SPECIES.filter((s) => s.ciguatera !== true)
    .map((s) => ({ id: s.id, v: seasonFactor(s, month) * waterTerm(s, water).factor * (0.5 + 0.5 * (nearMouth ? s.w.mouth : s.w.reef + s.w.drop)) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map((x) => x.id);
}

/** One activity at one spot and hour. */
export function readAt(deps: FcDeps, a: FcActivity, spot: Spot, ms: number, sky = skyMemo(deps.env.tzOffsetH)): FcRead {
  const env = deps.env;
  const [lng, lat] = spot.lngLat;
  const base = { activity: a, ms };
  const none: FcRead = { ...base, score: null, share: null, level: null };
  if (a === 'surf') {
    const h = surfHourFor({ env, spot: spot.name, lng, lat, ms });
    const d = h && surfDetailAt(h);
    if (!h || !d) return none;
    const windMs = h.windMs;
    return {
      ...base, score: d.q.score, share: d.q.score / 10, level: levelFor('surf', d.q.score, d.q.band),
      surf: {
        hb: d.Hb, range: surfRange(d.Hb), size: surfSize(d.Hb), band: d.q.band, windKind: d.q.windKind,
        hs: d.hs, tp: d.tp, dir: d.dir, facing: h.brk.facing,
        windKt: fin(windMs) ? windMs * KT : null, windFromDeg: h.windFromDeg, tideKind: d.q.tideKind,
      },
    };
  }
  if (a === 'fish') {
    const s = sky(ms, lat, lng);
    const b = biteAt({ env, spot: spot.name, lng, lat, ms, sky: s });
    if (!fin(b.bite)) return none;
    const ts = tideState(env.tide, ms);
    const month = new Date(ms + env.tzOffsetH * H).getUTCMonth();
    return {
      ...base, score: b.bite, share: b.bite / 100, level: levelFor('fish', b.bite),
      fish: {
        reasons: b.reasons,
        species: likelyFish(spot.lngLat, month, { visM: env.clarityM(lng, lat, ms), sstC: env.sstC?.(lng, lat, ms) ?? null }),
        moonPhase: s.phase.name, moonIllum: s.phase.illumination, tideRising: ts.rising, tideLevel: ts.level,
        daylight: s.sun.sunrise !== null && s.sun.sunset !== null && ms >= s.sun.sunrise && ms < s.sun.sunset,
      },
    };
  }
  if (a === 'snorkel' || a === 'dive') {
    const o = deps.outing?.(spot, a, ms, localHour(ms, env.tzOffsetH));
    const snk = a === 'snorkel' ? SNORKEL_SPOTS.find((x) => x.spot === spot.name) ?? null : null;
    const windFrom = env.windDirDeg?.(lng, lat, ms) ?? null;
    if (!o || !fin(o.score)) return none;
    return {
      ...base, score: o.score, share: o.score / 100, level: levelFor(a, o.score),
      water: {
        reasons: o.reasons, visM: fin(o.visM) ? o.visM : null, surgeMs: o.surgeMs, surge: surgeBand(o.surgeMs), depthM: a === 'snorkel' ? 2 : 6, sstC: env.sstC?.(lng, lat, ms) ?? null,
        breakerM: o.breakerM, currentKt: fin(o.currentMs) ? o.currentMs * KT : null, windKt: fin(o.windMs) ? o.windMs * KT : null,
        waterM: fin(o.waterM) ? o.waterM : null, rip: o.rip ?? null, uv: fin(o.uv) ? o.uv : null,
        access: snk?.access ?? null,
        stingers: snk && fin(o.windMs) && fin(windFrom) ? stingerGuess(o.windMs, windFrom, snk.facing) : null,
      },
    };
  }
  if (a === 'swim') {
    const d = swimAt({ env, spot: spot.name, lng, lat, ms, sky: sky(ms, lat, lng) });
    if (!d) return none;
    return { ...base, score: d.score, share: d.score / 100, level: levelFor('swim', d.score), swim: d };
  }
  // SAIL: sea comfort is the headline; wind, gusts and squalls ride along.
  const s = sky(ms, lat, lng);
  const args = { env, spot: spot.name, lng, lat, ms, sky: s };
  const val = (id: string) => METRIC_BY_ID.get(id)!.at(args);
  const comfort = val('comfort');
  const sail: SailRead = { windKt: val('wind'), gustKt: val('gust'), fromDeg: val('wdir'), squall: val('squall'), swellM: val('swell') };
  if (!fin(comfort)) return { ...none, sail };
  return { ...base, score: comfort, share: comfort / 100, level: levelFor('sail', comfort), sail };
}

/** The 24 local hours of the day starting `dayStartMs`. */
export function hoursOf(deps: FcDeps, a: FcActivity, spot: Spot, dayStartMs: number): FcRead[] {
  const sky = skyMemo(deps.env.tzOffsetH);
  return Array.from({ length: 24 }, (_, h) => readAt(deps, a, spot, dayStartMs + h * H, sky));
}

/** The spots an activity is forecast at (surf breaks for SURF, catalog snorkel spots for SNORKEL and DIVE). */
export const spotsForActivity = (a: FcActivity, spots: readonly Spot[]): Spot[] => spotsFor(planActivity(a), spots);

/** Each day's best window at this one spot, as WATCH's BEST DAY FOR finds it. */
export function daysAt(deps: FcDeps, a: FcActivity, spot: Spot, nowMs: number, days = 7): Plan {
  const outingAt = deps.outing ? (s: Spot, m: 'snorkel' | 'dive', ms: number, h: number) => deps.outing!(s, m, ms, h)?.score ?? null : undefined;
  return planDays(deps.env, planActivity(a), [spot], nowMs, days, outingAt);
}

/** URL-safe name for a spot ("PLAYA COCLES" → "playa-cocles", accents dropped). */
export const spotSlug = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface Route { spot: string | null; activity: FcActivity | null }
/** `#forecast`, `#forecast/playa-cocles`, `#forecast/playa-cocles/surf`; null for any other hash. */
export function parseRoute(hash: string, spots: readonly Spot[]): Route | null {
  const m = /^#forecast(?:\/([^/]*))?(?:\/([^/]*))?\/?$/.exec(hash);
  if (!m) return null;
  // A renamed spot's old link still opens it (SPOT_RENAMES, e.g. #forecast/playa-chiquita).
  const old = m[1] ? Object.entries(SPOT_RENAMES).find(([from]) => spotSlug(from) === m[1])?.[1] : undefined;
  const spot = m[1] ? spots.find((s) => spotSlug(s.name) === m[1] || s.name === old)?.name ?? null : null;
  return { spot, activity: isFcActivity(m[2]) ? m[2] : null };
}
export const routeHash = (spot: string, a: FcActivity) => `#forecast/${spotSlug(spot)}/${a}`;

/** The map's own link (PLAN 7.65): the forecast is the main page, the map a page under it. */
export const MAP_HASH = '#map';
/**
 * Which page a link opens (Joseph, 2026-11-10: "make the main page the spot forecast and the map is a sub page").
 * No hash, the bare app address that old bookmarks and the installed app use, opens the forecast. `#map` opens the
 * map. `#forecast...` opens the forecast at its spot and activity. Any other hash, from an old map link, opens the map.
 */
export function landing(hash: string): 'forecast' | 'map' {
  if (hash === '' || hash === '#' || /^#forecast(?:\/|$)/.test(hash)) return 'forecast';
  return 'map';
}

/** UV index on the page's five levels, worst (extreme, 11+) to best (low, 0-2), the WHO bands. */
export const uvLevel = (uv: number): Level => {
  const u = Math.round(uv);
  return u >= 11 ? 0 : u >= 8 ? 1 : u >= 6 ? 2 : u >= 3 ? 3 : 4;
};

/** Each day's peak UV index at a spot (06:00-18:00 local), null where the weather does not reach. */
export function dayUvPeaks(env: MetricEnv, spot: Spot, startMs: number, days = 7): (number | null)[] {
  const uv = METRIC_BY_ID.get('uv')!;
  const [lng, lat] = spot.lngLat;
  const sky = skyMemo(env.tzOffsetH);
  return Array.from({ length: days }, (_, d) => {
    let best: number | null = null;
    for (let h = 6; h <= 18; h++) {
      const ms = startMs + d * 864e5 + h * H;
      const v = uv.at({ env, spot: spot.name, lng, lat, ms, sky: sky(ms, lat, lng) });
      if (v !== null && Number.isFinite(v) && (best === null || v > best)) best = v;
    }
    return best;
  });
}

/** Beaufort force from the mean wind in knots (WMO: force 0 under 1 kt, then tops 3, 6, 10, 16, 21, 27, 33 kt), capped at 8. */
export function beaufort(kt: number): number {
  const tops = [0, 3, 6, 10, 16, 21, 27, 33];
  const k = Math.round(kt);
  const i = tops.findIndex((x) => k <= x);
  return i < 0 ? 8 : i;
}

/** One hour of the page's timeline: the activity's reading plus the shared rows (wind, gusts, rain, tide, air). */
export interface TimelineHour {
  ms: number;
  read: FcRead;
  windKt: number | null;
  windFromDeg: number | null;
  gustKt: number | null;
  rainMmH: number | null;
  tideM: number;
  airC: number | null;
  /** Cloud cover, %, the mean of the weather models; null before they load. */
  cloudPct: number | null;
  /** Squall risk 0..2 (the SQUALL metric). */
  squall: number | null;
  /** UV index (the UV metric: CAMS, else scaled GFS). */
  uv: number | null;
  /** Chance of rain in the hour, % (the RAIN CHANCE metric: four ensembles pooled; PLAN 7.57). */
  rainPct: number | null;
  /** Real feel in the shade, °C, and relative humidity, % (the FEELS and HUMIDITY metrics). */
  feelsC: number | null;
  humidityPct: number | null;
  /** The sun is up. */
  day: boolean;
}

/**
 * `hours` hours from `startMs` (a local midnight): what the page's hour-by-hour charts draw. The tide is the
 * harmonic prediction (exact in every band), the rest the same metric reads as the WATCH tracker's.
 */
export function timeline(deps: FcDeps, a: FcActivity, spot: Spot, startMs: number, hours = 7 * 24): TimelineHour[] {
  const env = deps.env;
  const sky = skyMemo(env.tzOffsetH);
  const [lng, lat] = spot.lngLat;
  return Array.from({ length: hours }, (_, i) => {
    const ms = startMs + i * H;
    const s = sky(ms, lat, lng);
    const args = { env, spot: spot.name, lng, lat, ms, sky: s };
    const val = (id: string) => METRIC_BY_ID.get(id)!.at(args);
    return {
      ms,
      read: readAt(deps, a, spot, ms, sky),
      windKt: val('wind'),
      windFromDeg: val('wdir'),
      gustKt: val('gust'),
      rainMmH: val('rain'),
      tideM: predict(env.tide, ms),
      airC: val('air'),
      cloudPct: val('cloud'),
      squall: val('squall'),
      uv: val('uv'),
      rainPct: val('rainpct'),
      feelsC: val('feels'),
      humidityPct: val('humidity'),
      day: s.sun.sunrise !== null && s.sun.sunset !== null && ms + H / 2 >= s.sun.sunrise && ms + H / 2 < s.sun.sunset,
    };
  });
}

/** The day's sky in one word, for the weather tile's picture (Joseph, 2026-11-10: "sunny, light rain cloud, heavy rain cloud"). */
export type WxSky = 'sun' | 'partly' | 'cloud' | 'showers' | 'rain' | 'storm';

/** A traditional day forecast at a spot, from the page's timeline hours (PLAN 7.64). Nulls where the weather has not loaded. */
export interface DayWeather {
  sky: WxSky | null;
  hiC: number | null;
  loC: number | null;
  /** Highest real feel of the day, °C. */
  feelsMaxC: number | null;
  /** Mean relative humidity in daylight, %. */
  humidityPct: number | null;
  /** Highest hourly chance of rain, %, and the local hour it peaks. */
  rainPct: number | null;
  rainPeakMs: number | null;
  /** Rain over the 24 hours, mm, and the wettest hour. */
  rainMm: number | null;
  wettestMs: number | null;
  /** Mean cloud in daylight, %. */
  cloudPct: number | null;
  uvMax: number | null;
  /** Strongest mean wind and gust in daylight, kt. */
  windKt: number | null;
  gustKt: number | null;
  /** Squall risk 0..2 at its worst. */
  squall: number | null;
}

const vals = (hs: readonly TimelineHour[], f: (h: TimelineHour) => number | null) => hs.map(f).filter(fin);
const maxOf = (xs: number[]) => (xs.length ? Math.max(...xs) : null);
const minOf = (xs: number[]) => (xs.length ? Math.min(...xs) : null);
const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const argMax = (hs: readonly TimelineHour[], f: (h: TimelineHour) => number | null) => {
  let best: TimelineHour | null = null;
  for (const h of hs) {
    const v = f(h);
    if (fin(v) && v > 0 && (best === null || v > f(best)!)) best = h;
  }
  return best?.ms ?? null;
};

/**
 * The sky word for a day: thunderstorms when a squall is likely (or rain with a squall watch); rain from 10 mm in
 * the day or 4 mm in an hour; showers from 1 mm, or a 50 % chance in any hour; else the daylight cloud (cloudy from
 * 75 %, partly from 35 %).
 */
export function wxSky(d: Pick<DayWeather, 'rainMm' | 'rainPct' | 'cloudPct' | 'squall'> & { wettestMmH?: number | null }): WxSky | null {
  if (d.rainMm === null && d.cloudPct === null) return null;
  const mm = d.rainMm ?? 0, sq = d.squall ?? 0;
  if (sq >= 2 || (sq >= 1 && mm >= 2)) return 'storm';
  if (mm >= 10 || (d.wettestMmH ?? 0) >= 4) return 'rain';
  if (mm >= 1 || (d.rainPct ?? 0) >= 50) return 'showers';
  const c = d.cloudPct ?? 0;
  return c >= 75 ? 'cloud' : c >= 35 ? 'partly' : 'sun';
}

export function dayWeather(day: readonly TimelineHour[]): DayWeather {
  const lit = day.some((h) => h.day) ? day.filter((h) => h.day) : day;
  const rain = vals(day, (h) => h.rainMmH);
  const d: DayWeather = {
    sky: null,
    hiC: maxOf(vals(day, (h) => h.airC)),
    loC: minOf(vals(day, (h) => h.airC)),
    feelsMaxC: maxOf(vals(day, (h) => h.feelsC)),
    humidityPct: avgOf(vals(lit, (h) => h.humidityPct)),
    rainPct: maxOf(vals(day, (h) => h.rainPct)),
    rainPeakMs: argMax(day, (h) => h.rainPct),
    rainMm: rain.length ? rain.reduce((a, b) => a + b, 0) : null,
    wettestMs: argMax(day, (h) => h.rainMmH),
    cloudPct: avgOf(vals(lit, (h) => h.cloudPct)),
    uvMax: maxOf(vals(lit, (h) => h.uv)),
    windKt: maxOf(vals(lit, (h) => h.windKt)),
    gustKt: maxOf(vals(lit, (h) => h.gustKt)),
    squall: maxOf(vals(day, (h) => h.squall)),
  };
  d.sky = wxSky({ ...d, wettestMmH: maxOf(rain) });
  return d;
}

/** Sea temperature at a spot around midday, °C (the SST metric), for the weather tile. */
export function waterAt(env: MetricEnv, spot: Spot, dayStartMs: number): number | null {
  const [lng, lat] = spot.lngLat;
  const ms = dayStartMs + 12 * H;
  const v = METRIC_BY_ID.get('sst')!.at({ env, spot: spot.name, lng, lat, ms, sky: skyMemo(env.tzOffsetH)(ms, lat, lng) });
  return fin(v) ? v : null;
}

/** The weather at one spot and hour, for the spot cards: the sky word, air temperature and chance of rain. */
export function hourWeather(env: MetricEnv, spot: Spot, ms: number): { airC: number | null; rainPct: number | null; cloudPct: number | null; rainMmH: number | null; squall: number | null; day: boolean } {
  const [lng, lat] = spot.lngLat;
  const s = skyMemo(env.tzOffsetH)(ms, lat, lng);
  const args = { env, spot: spot.name, lng, lat, ms, sky: s };
  const val = (id: string) => { const v = METRIC_BY_ID.get(id)!.at(args); return fin(v) ? v : null; };
  return {
    airC: val('air'), rainPct: val('rainpct'), cloudPct: val('cloud'), rainMmH: val('rain'), squall: val('squall'),
    day: s.sun.sunrise !== null && s.sun.sunset !== null && ms + H / 2 >= s.sun.sunrise && ms + H / 2 < s.sun.sunset,
  };
}
