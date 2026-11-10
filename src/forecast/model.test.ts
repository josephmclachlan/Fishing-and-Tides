import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import type { MetricEnv } from '../metrics/registry';
import { METRIC_BY_ID } from '../metrics/registry';
import { planDays } from '../metrics/plan';
import type { SeaState } from '../adapters/waves';
import { PLUME_RIVERS, SPOTS } from '../region';
import { daySky } from '../physics/astro';
import {
  FC_ACTIVITIES, beaufort, dayUvPeaks, daysAt, uvLevel, hoursOf, levelFor, likelyFish, parseRoute, readAt, routeHash, spotSlug, spotsForActivity, surfRange, surfSize,
  type FcDeps, type OutingRead,
  dayWeather, wxSky, type TimelineHour,
} from './model';
import { heroArt } from './art';

const H = 3.6e6;
const DAY0 = Date.UTC(2026, 10, 4, 6); // local midnight at UTC-6
const spot = (name: string) => SPOTS.find((s) => s.name === name)!;
const sea = (hs: number, t: number): SeaState => ({ hs, tm: t, dir: 60, swellHs: hs, swellT: t, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast' });
const env = (over: Partial<MetricEnv> = {}): MetricEnv => ({
  windMs: () => 3,
  windDirDeg: () => 220,
  sea: () => sea(1.2, 11),
  weather: () => [{ model: 'gfs_seamless', rainMmH: 0, cloudPct: 30, uv: 5, tempC: 28, gustKt: 12, capeJkg: 0, pressureHpa: 1012, windKt: 6 }],
  clarityM: () => 10,
  sstC: () => 28.5,
  sargassumKm2: () => 0,
  tide: LIMON_HARMONICS,
  tzOffsetH: -6,
  ...over,
});
const outing = (score: number): FcDeps['outing'] => (_s, _m, _ms, _h): OutingRead => ({ score, reasons: score < 70 ? ['surge'] : [], surgeMs: 0.1, visM: 12, breakerM: 0.4 });

describe('forecast page readings agree with the map (PLAN 7.52)', () => {
  it('reads SURF from the break score, with a breaker height range around the estimate', () => {
    const r = readAt({ env: env() }, 'surf', spot('SALSA BRAVA'), DAY0 + 8 * H);
    expect(r.score).not.toBeNull();
    const metric = METRIC_BY_ID.get('surfq')!.at({ env: env(), spot: 'SALSA BRAVA', lng: spot('SALSA BRAVA').lngLat[0], lat: spot('SALSA BRAVA').lngLat[1], ms: DAY0 + 8 * H, sky: daySky(DAY0, 9.65, -82.75) });
    expect(r.score).toBeCloseTo(metric!, 6);
    expect(r.surf!.range[0]).toBeLessThanOrEqual(r.surf!.hb);
    expect(r.surf!.range[1]).toBeGreaterThanOrEqual(r.surf!.hb);
    expect(r.share).toBeCloseTo(r.score! / 10, 9);
  });
  it('reads FISH as the BITE metric and lists only eating fish without a ciguatera warning', () => {
    const r = readAt({ env: env() }, 'fish', spot('PUNTA UVA'), DAY0 + 6 * H);
    const bite = METRIC_BY_ID.get('bite')!.at({ env: env(), spot: 'PUNTA UVA', lng: spot('PUNTA UVA').lngLat[0], lat: spot('PUNTA UVA').lngLat[1], ms: DAY0 + 6 * H, sky: daySky(DAY0, spot('PUNTA UVA').lngLat[1], spot('PUNTA UVA').lngLat[0]) });
    expect(r.score).toBeCloseTo(bite!, 6);
    expect(r.fish!.species.length).toBe(3);
    expect(r.fish!.species).not.toContain('grouper');
    expect(r.fish!.species).not.toContain('barracuda');
  });
  it('reads SNORKEL and DIVE from the outing score, and nothing without it', () => {
    const deps = { env: env(), outing: outing(80) };
    const r = readAt(deps, 'snorkel', spot('PUNTA CAHUITA'), DAY0 + 10 * H);
    expect(r.score).toBe(80);
    expect(r.level).toBe(3);
    expect(r.water!.visM).toBe(12);
    expect(r.water!.depthM).toBe(2);
    expect(readAt(deps, 'dive', spot('PUNTA CAHUITA'), DAY0 + 10 * H).water!.depthM).toBe(6);
    expect(readAt({ env: env() }, 'dive', spot('PUNTA CAHUITA'), DAY0 + 10 * H).score).toBeNull();
  });
  it('reads SAIL from sea comfort, with wind in knots', () => {
    const r = readAt({ env: env() }, 'sail', spot('PLAYA COCLES'), DAY0 + 10 * H);
    expect(r.score).not.toBeNull();
    expect(r.sail!.windKt).toBeCloseTo(3 * 1.94384, 3);
  });
  it('reads nothing (not zero) before the feeds load', () => {
    const empty = env({ sea: () => null, windMs: () => null, weather: () => [] });
    for (const a of ['surf', 'sail'] as const) expect(readAt({ env: empty }, a, spot('SALSA BRAVA'), DAY0 + 10 * H).score).toBeNull();
  });
  it('gives the day bubbles WATCH\'s own best day at this spot', () => {
    const deps = { env: env() };
    const now = DAY0 + 6 * H;
    const p = daysAt(deps, 'surf', spot('SALSA BRAVA'), now, 5);
    const watch = planDays(env(), 'surf', [spot('SALSA BRAVA')], now, 5);
    expect(p.bestDay).toBe(watch.bestDay);
    expect(p.days.map((d) => d?.startMs)).toEqual(watch.days.map((d) => d?.startMs));
  });
  it('gives 24 hours a day', () => {
    expect(hoursOf({ env: env() }, 'fish', spot('PUNTA CAHUITA'), DAY0)).toHaveLength(24);
  });
});

describe('levels and words', () => {
  it('cuts at the map\'s own tone thresholds', () => {
    expect(levelFor('fish', 59)).toBe(2);
    expect(levelFor('fish', 60)).toBe(3);
    expect(levelFor('snorkel', 69)).toBe(2);
    expect(levelFor('snorkel', 70)).toBe(3);
    expect(levelFor('sail', 75)).toBe(3);
    expect(levelFor('surf', 9, 'FLAT')).toBe(0);
    expect(levelFor('surf', 9, 'EPIC')).toBe(4);
  });
  it('sizes surf against a surfer and calls it flat where the score does', () => {
    expect(surfSize(0.29)).toBe('flat');
    expect(surfSize(0.7)).toBe('knee');
    expect(surfSize(1.8)).toBe('head');
    const [lo, hi] = surfRange(1);
    expect(lo).toBeLessThan(1);
    expect(hi).toBeGreaterThan(1);
  });
  it('prefers mouth feeders by a river mouth', () => {
    const atMouth = likelyFish(PLUME_RIVERS[0].mouth, 9, { visM: 2, sstC: 28 });
    expect(atMouth[0]).toBe('snook');
  });
});

describe('spots and links', () => {
  it('forecasts surf at the surf breaks and snorkel at the snorkel spots only', () => {
    expect(spotsForActivity('surf', SPOTS).map((s) => s.name)).toContain('SALSA BRAVA');
    expect(spotsForActivity('surf', SPOTS).map((s) => s.name)).not.toContain('PUNTA UVA');
    expect(spotsForActivity('fish', SPOTS)).toHaveLength(SPOTS.length);
  });
  it('round-trips the link', () => {
    expect(spotSlug('LIMÓN')).toBe('limon');
    for (const s of SPOTS) for (const a of FC_ACTIVITIES) expect(parseRoute(routeHash(s.name, a), SPOTS)).toEqual({ spot: s.name, activity: a });
    expect(parseRoute('#forecast', SPOTS)).toEqual({ spot: null, activity: null });
    expect(parseRoute('#forecast/nowhere/kite', SPOTS)).toEqual({ spot: null, activity: null });
    // The spot split in PLAN 7.62: an old Playa Chiquita link opens the west half.
    expect(parseRoute('#forecast/playa-chiquita/snorkel', SPOTS)).toEqual({ spot: 'PLAYA CHIQUITA WEST', activity: 'snorkel' });
    expect(parseRoute('', SPOTS)).toBeNull();
    expect(parseRoute('#map', SPOTS)).toBeNull();
  });
});

describe('hero pictures', () => {
  it('draws every activity without NaN, with and without data', () => {
    const deps = { env: env(), outing: outing(55) };
    const none = { env: env({ sea: () => null, windMs: () => null, weather: () => [], clarityM: () => null }) };
    for (const a of FC_ACTIVITIES)
      for (const d of [deps, none]) {
        const svg = heroArt(readAt(d, a, spot('PUNTA CAHUITA'), DAY0 + 10 * H), 'x');
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      }
  });
  it('fades the reef past the visibility', () => {
    const clear = heroArt(readAt({ env: env(), outing: (...a) => ({ ...outing(80)!(...a)!, visM: 20 }) }, 'snorkel', spot('PUNTA CAHUITA'), DAY0 + 10 * H), 'x');
    const murky = heroArt(readAt({ env: env(), outing: (...a) => ({ ...outing(80)!(...a)!, visM: 3 }) }, 'snorkel', spot('PUNTA CAHUITA'), DAY0 + 10 * H), 'x');
    const x = (s: string) => Number(/class="fc-vis-line" x1="([\d.]+)"/.exec(s)![1]);
    expect(x(murky)).toBeLessThan(x(clear));
  });
});
void H;

describe('Beaufort words for sailing', () => {
  it('cuts at the WMO knot bounds', () => {
    expect(beaufort(0.4)).toBe(0);
    expect(beaufort(1)).toBe(1);
    expect(beaufort(2)).toBe(1);
    expect(beaufort(7)).toBe(3);
    expect(beaufort(10.4)).toBe(3);
    expect(beaufort(11)).toBe(4);
    expect(beaufort(25)).toBe(6);
    expect(beaufort(45)).toBe(8);
  });
});

describe('UV', () => {
  it('uses the WHO bands', () => {
    expect([1, 3, 5, 6, 7, 8, 10, 11, 13].map(uvLevel)).toEqual([4, 3, 3, 2, 2, 1, 1, 0, 0]);
  });
  it('gives each day\'s peak at the spot, and nothing before the weather loads', () => {
    const sunny = env({ weather: (ms) => {
      const h = (((ms / H - 6) % 24) + 24) % 24;
      return [{ model: 'gfs_seamless', rainMmH: 0, cloudPct: 30, uv: h >= 6 && h <= 18 ? 11 * Math.sin(((h - 6) / 12) * Math.PI) : 0, tempC: 28, gustKt: 12, capeJkg: 0, pressureHpa: 1012, windKt: 6 }];
    } });
    const p = dayUvPeaks(sunny, spot('PUNTA CAHUITA'), DAY0, 3);
    expect(p).toHaveLength(3);
    for (const v of p) expect(v).toBeCloseTo(11, 6);
    expect(dayUvPeaks(env({ weather: () => [] }), spot('PUNTA CAHUITA'), DAY0, 2)).toEqual([null, null]);
  });
});

describe('SWIM: a beach day', () => {
  const rip = (level: 'LOW' | 'MOD' | 'HIGH', score: number) => ({ score, level, speedMs: 0.3, strength: 'WEAK' as const, lengthM: 60, length: 'SHORT' as const, factors: { height: 1, period: 1, angle: 1, tide: 1, wind: 1, channel: 1 } });
  const shore = (level: 'LOW' | 'MOD' | 'HIGH') => () => ({ breakerM: 0.4, rip: rip(level, level === 'LOW' ? 0.1 : level === 'MOD' ? 0.4 : 0.7) });
  const noon = DAY0 + 18 * H; // 12:00 local
  it('reads the swim score from the spot\'s shore, the weather and the water, and nothing before the spot model runs', () => {
    const r = readAt({ env: env({ shore: shore('LOW') }) }, 'swim', spot('PLAYA COCLES'), noon);
    expect(r.score).not.toBeNull();
    expect(r.swim!.rip).toBe('LOW');
    expect(r.swim!.breakerM).toBe(0.4);
    expect(r.swim!.uv).toBe(5);
    expect(r.swim!.sstC).toBe(28.5);
    expect(readAt({ env: env() }, 'swim', spot('PLAYA COCLES'), noon).score).toBeNull();
  });
  it('rates a high rip risk poor and a night zero', () => {
    expect(readAt({ env: env({ shore: shore('HIGH') }) }, 'swim', spot('PLAYA COCLES'), noon).level).toBe(0);
    expect(readAt({ env: env({ shore: shore('LOW') }) }, 'swim', spot('PLAYA COCLES'), DAY0 + 2 * H).score).toBe(0);
  });
  it('plans the week at every spot, as WATCH does', () => {
    const p = daysAt({ env: env({ shore: shore('LOW') }) }, 'swim', spot('PLAYA COCLES'), DAY0 + 6 * H, 5);
    expect(p.days.filter(Boolean).length).toBeGreaterThan(0);
    expect(spotsForActivity('swim', SPOTS)).toHaveLength(SPOTS.length);
  });
});

describe('day weather (the weather tile)', () => {
  const T0 = Date.UTC(2026, 10, 12, 6);
  const hour = (i: number, o: Partial<TimelineHour> = {}): TimelineHour => ({
    ms: T0 + i * 3.6e6, read: { activity: 'swim', ms: T0, score: null, share: null, level: null },
    windKt: 6 + (i % 4), windFromDeg: 80, gustKt: 12, rainMmH: 0, tideM: 0, airC: 24 + Math.sin(((i - 9) / 24) * 2 * Math.PI) * 4,
    cloudPct: 20, squall: 0, uv: i >= 6 && i < 18 ? 9 * Math.sin(((i - 6) / 12) * Math.PI) : 0, rainPct: 5, feelsC: 30, humidityPct: 75,
    day: i >= 6 && i < 18, ...o,
  });
  const day = (o: (i: number) => Partial<TimelineHour> = () => ({})) => Array.from({ length: 24 }, (_, i) => hour(i, o(i)));
  it('sums the rain, finds the high and low, the peak UV and the wettest hour', () => {
    const d = dayWeather(day((i) => (i === 15 ? { rainMmH: 3, rainPct: 70 } : {})));
    expect(d.rainMm).toBeCloseTo(3, 9);
    expect(d.hiC).toBeCloseTo(28, 0);
    expect(d.loC).toBeCloseTo(20, 0);
    expect(d.uvMax).toBeCloseTo(9, 0);
    expect(d.rainPct).toBe(70);
    expect(d.wettestMs).toBe(T0 + 15 * 3.6e6);
    expect(d.sky).toBe('showers');
  });
  it('calls the sky from rain, squalls and cloud', () => {
    expect(dayWeather(day()).sky).toBe('sun');
    expect(dayWeather(day(() => ({ cloudPct: 50 }))).sky).toBe('partly');
    expect(dayWeather(day(() => ({ cloudPct: 90 }))).sky).toBe('cloud');
    expect(dayWeather(day((i) => ({ rainMmH: i < 4 ? 3 : 0 }))).sky).toBe('rain');
    expect(dayWeather(day((i) => ({ rainMmH: i === 14 ? 3 : 0, squall: i === 14 ? 1 : 0 }))).sky).toBe('storm');
    expect(wxSky({ rainMm: null, rainPct: null, cloudPct: null, squall: null })).toBeNull();
  });
  it('reads nothing before the weather loads', () => {
    const d = dayWeather(day(() => ({ airC: null, rainMmH: null, cloudPct: null, uv: null, rainPct: null, feelsC: null, humidityPct: null, windKt: null, gustKt: null, squall: null })));
    expect(d).toMatchObject({ sky: null, hiC: null, rainMm: null, uvMax: null, humidityPct: null });
  });
});
