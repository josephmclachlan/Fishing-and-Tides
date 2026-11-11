/**
 * Sun, moon and solunar times, computed on the device so they work with no signal (PLAN 7.7). Pure
 * functions, no DOM; angles in degrees, times in epoch ms (UTC), latitude north and longitude east positive.
 *
 * Sun: the low-precision Meeus / NOAA series (Astronomical Algorithms ch. 25), good to about a minute of
 * time for rise and set. Moon: Paul Schlyter's "How to compute planetary positions" series with its main
 * perturbation terms, good to a couple of arc minutes, so rise, set and transit land within a few minutes
 * (checked against PyEphem in astro.test.ts). Rise and set use the geometric centre with the usual horizon
 * dips: -0.833° for the sun (refraction plus its radius) and +0.125° for the moon (parallax less refraction
 * and radius, at mean distance).
 *
 * Solunar windows follow the traditional rule: a MAJOR period of two hours centred on the moon passing
 * overhead and underfoot, a MINOR period of one hour centred on moonrise and moonset. That rule is folklore,
 * not physics; the astronomy underneath it is exact. The day rating is a heuristic (see `solunarRating`).
 */
const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const MIN_MS = 60_000;
const J2000_MS = Date.UTC(2000, 0, 1, 12);

const sin = (d: number) => Math.sin(d * RAD);
const cos = (d: number) => Math.cos(d * RAD);
/** Degrees into [0, 360). */
export const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Degrees into [-180, 180). */
export const norm180 = (d: number) => norm360(d + 180) - 180;

/** Days since J2000.0 (2000-01-01 12:00 UTC). */
const daysSince = (ms: number) => (ms - J2000_MS) / DAY_MS;

interface Equatorial {
  /** Right ascension, degrees. */
  ra: number;
  dec: number;
}

/** Greenwich mean sidereal time, degrees. */
const gmst = (n: number) => norm360(280.46061837 + 360.98564736629 * n);

function eclipticToEquatorial(lon: number, lat: number, obliquity: number): Equatorial {
  const x = cos(lat) * cos(lon);
  const y = cos(lat) * sin(lon) * cos(obliquity) - sin(lat) * sin(obliquity);
  const z = cos(lat) * sin(lon) * sin(obliquity) + sin(lat) * cos(obliquity);
  return { ra: norm360(Math.atan2(y, x) / RAD), dec: Math.asin(z) / RAD };
}

/** Sun's ecliptic longitude (degrees) and equatorial position. */
export function sunPosition(ms: number): Equatorial & { lon: number } {
  const n = daysSince(ms);
  const L = 280.46 + 0.9856474 * n;
  const g = 357.528 + 0.9856003 * n;
  const lon = norm360(L + 1.915 * sin(g) + 0.02 * sin(2 * g));
  return { lon, ...eclipticToEquatorial(lon, 0, 23.439 - 0.0000004 * n) };
}

/** Moon's ecliptic longitude (degrees) and geocentric equatorial position (Schlyter). */
export function moonPosition(ms: number): Equatorial & { lon: number } {
  const n = daysSince(ms);
  const d = n + 1.5; // days since 2000 Jan 0.0
  const N = 125.1228 - 0.0529538083 * d;
  const i = 5.1454;
  const w = 318.0634 + 0.1643573223 * d;
  const a = 60.2666;
  const e = 0.0549;
  const M = norm360(115.3654 + 13.0649929509 * d);
  const Ms = norm360(356.047 + 0.9856002585 * d);
  const Ls = Ms + 282.9404 + 4.70935e-5 * d;
  const Lm = M + w + N;
  const D = Lm - Ls;
  const F = Lm - N;
  // Kepler's equation for the eccentric anomaly, two iterations.
  let E = M + (e / RAD) * sin(M) * (1 + e * cos(M));
  E = E - (E - (e / RAD) * sin(E) - M) / (1 - e * cos(E));
  const xv = a * (cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * sin(E);
  const v = Math.atan2(yv, xv) / RAD;
  const r = Math.hypot(xv, yv);
  const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
  const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
  const zh = r * sin(v + w) * sin(i);
  let lon = Math.atan2(yh, xh) / RAD;
  let lat = Math.atan2(zh, Math.hypot(xh, yh)) / RAD;
  lon +=
    -1.274 * sin(M - 2 * D) + 0.658 * sin(2 * D) - 0.186 * sin(Ms) - 0.059 * sin(2 * M - 2 * D) - 0.057 * sin(M - 2 * D + Ms) +
    0.053 * sin(M + 2 * D) + 0.046 * sin(2 * D - Ms) + 0.041 * sin(M - Ms) - 0.035 * sin(D) - 0.031 * sin(M + Ms) - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(M - 4 * D);
  lat += -0.173 * sin(F - 2 * D) - 0.055 * sin(M - F - 2 * D) - 0.046 * sin(M + F - 2 * D) + 0.033 * sin(F + 2 * D) + 0.017 * sin(2 * M + F);
  lon = norm360(lon);
  return { lon, ...eclipticToEquatorial(lon, lat, 23.4393 - 3.563e-7 * d) };
}

/** Hour angle of a body (degrees west of the meridian, -180..180) for an observer at longitude `lng`. */
const hourAngle = (ms: number, ra: number, lng: number) => norm180(gmst(daysSince(ms)) + lng - ra);

/** Altitude above the horizon, degrees, for hour angle `ha`, declination `dec`, latitude `lat`. */
const altitudeOf = (ha: number, dec: number, lat: number) => Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(ha)) / RAD;

export const sunAltitude = (ms: number, lat: number, lng: number) => {
  const p = sunPosition(ms);
  return altitudeOf(hourAngle(ms, p.ra, lng), p.dec, lat);
};
export const moonAltitude = (ms: number, lat: number, lng: number) => {
  const p = moonPosition(ms);
  return altitudeOf(hourAngle(ms, p.ra, lng), p.dec, lat);
};

/** Altitudes (degrees) at which the sun's centre defines each event. */
export const SUN_ALT = { rise: -0.833, civil: -6, goldenLow: -4, goldenHigh: 6 } as const;
export const MOON_RISE_ALT = 0.125;

/** Times where `f` crosses zero going up and going down inside [from, to], refined by bisection to the second. */
function crossings(f: (ms: number) => number, from: number, to: number, step = 6 * MIN_MS) {
  const up: number[] = [];
  const down: number[] = [];
  const refine = (a: number, b: number) => {
    const rising = f(a) < 0;
    for (let k = 0; k < 22 && b - a > 500; k++) {
      const m = (a + b) / 2;
      if (f(m) < 0 === rising) a = m;
      else b = m;
    }
    return Math.round((a + b) / 2);
  };
  let t0 = from;
  let f0 = f(t0);
  for (let t1 = from + step; t1 <= to + step - 1; t1 += step) {
    const t = Math.min(t1, to);
    const f1 = f(t);
    if (f0 < 0 && f1 >= 0) up.push(refine(t0, t));
    else if (f0 >= 0 && f1 < 0) down.push(refine(t0, t));
    t0 = t;
    f0 = f1;
    if (t >= to) break;
  }
  return { up, down };
}

/** Local civil day containing `ms` for a fixed UTC offset (Costa Rica is UTC-6 all year): its start in epoch ms. */
export function localDayStart(ms: number, tzOffsetH: number): number {
  const off = tzOffsetH * 3.6e6;
  return Math.floor((ms + off) / DAY_MS) * DAY_MS - off;
}

export interface SunTimes {
  sunrise: number | null;
  sunset: number | null;
  solarNoon: number | null;
  /** Civil twilight begins / ends (sun 6° below the horizon). */
  firstLight: number | null;
  lastLight: number | null;
  /** Golden hour: sun between 4° below and 6° above the horizon. */
  goldenAm: [number, number] | null;
  goldenPm: [number, number] | null;
}

const first = (xs: number[]) => (xs.length ? xs[0] : null);

/** Sun events within the 24 h from `dayStart`. A null means the event does not happen in that window. */
export function sunTimes(dayStart: number, lat: number, lng: number): SunTimes {
  const end = dayStart + DAY_MS;
  const at = (alt: number) => crossings((t) => sunAltitude(t, lat, lng) - alt, dayStart, end);
  const horizon = at(SUN_ALT.rise);
  const civil = at(SUN_ALT.civil);
  const low = at(SUN_ALT.goldenLow);
  const high = at(SUN_ALT.goldenHigh);
  const transit = crossings((t) => hourAngle(t, sunPosition(t).ra, lng), dayStart, end).up;
  const span = (a: number | null, b: number | null): [number, number] | null => (a !== null && b !== null && b > a ? [a, b] : null);
  return {
    sunrise: first(horizon.up),
    sunset: first(horizon.down),
    solarNoon: first(transit),
    firstLight: first(civil.up),
    lastLight: first(civil.down),
    goldenAm: span(first(low.up), first(high.up)),
    goldenPm: span(first(high.down), first(low.down)),
  };
}

export interface MoonTimes {
  moonrise: number | null;
  moonset: number | null;
  /** Moon due south or north of the observer (highest). */
  transit: number | null;
  /** Moon on the far side of the Earth, directly underfoot. */
  underfoot: number | null;
}

/** Moon events within the 24 h from `dayStart` (the moon's day is about 24 h 50 min, so one may be missing). */
export function moonTimes(dayStart: number, lat: number, lng: number): MoonTimes {
  const end = dayStart + DAY_MS;
  const rs = crossings((t) => moonAltitude(t, lat, lng) - MOON_RISE_ALT, dayStart, end);
  const ha = (t: number) => hourAngle(t, moonPosition(t).ra, lng);
  return {
    moonrise: first(rs.up),
    moonset: first(rs.down),
    transit: first(crossings(ha, dayStart, end).up),
    underfoot: first(crossings((t) => norm180(ha(t) - 180), dayStart, end).up),
  };
}

export type MoonPhaseName = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface MoonPhase {
  /** Moon minus sun ecliptic longitude, 0..360: 0 new, 90 first quarter, 180 full, 270 last quarter. */
  elongation: number;
  /** Lit fraction of the disc, 0..1. */
  illumination: number;
  /** 0 new, 1 waxing crescent, 2 first quarter, 3 waxing gibbous, 4 full, 5 waning gibbous, 6 last quarter, 7 waning crescent. */
  name: MoonPhaseName;
}

export function moonPhase(ms: number): MoonPhase {
  const elongation = norm360(moonPosition(ms).lon - sunPosition(ms).lon);
  return { elongation, illumination: (1 - cos(elongation)) / 2, name: (Math.floor(norm360(elongation + 22.5) / 45) % 8) as MoonPhaseName };
}

export interface SolunarWindow {
  kind: 'major' | 'minor';
  /** The moon event it is centred on. */
  centre: number;
  start: number;
  end: number;
}

export const MAJOR_HALF_MS = 60 * MIN_MS;
export const MINOR_HALF_MS = 30 * MIN_MS;

/** Major (±1 h around moon overhead and underfoot) and minor (±30 min around moonrise and set) windows, in time order. */
export function solunarWindows(m: MoonTimes): SolunarWindow[] {
  const w = (kind: SolunarWindow['kind'], centre: number | null, half: number): SolunarWindow[] => (centre === null ? [] : [{ kind, centre, start: centre - half, end: centre + half }]);
  return [...w('major', m.transit, MAJOR_HALF_MS), ...w('major', m.underfoot, MAJOR_HALF_MS), ...w('minor', m.moonrise, MINOR_HALF_MS), ...w('minor', m.moonset, MINOR_HALF_MS)].sort((a, b) => a.start - b.start);
}

/**
 * Day rating 0 to 4 (a heuristic, as solunar tables use): new and full moon score highest (tides run strongest),
 * and a major window that overlaps sunrise or sunset adds to it.
 */
export function solunarRating(phase: MoonPhase, sun: SunTimes, windows: readonly SolunarWindow[]): 0 | 1 | 2 | 3 | 4 {
  const phaseTerm = Math.abs(cos(phase.elongation)); // 1 at new and full, 0 at the quarters
  const near = (t: number | null) => t !== null && windows.some((w) => w.kind === 'major' && t >= w.start - 30 * MIN_MS && t <= w.end + 30 * MIN_MS);
  const overlap = near(sun.sunrise) || near(sun.sunset) ? 1 : 0;
  return Math.max(0, Math.min(4, Math.round((0.65 * phaseTerm + 0.35 * overlap) * 4))) as 0 | 1 | 2 | 3 | 4;
}

export interface DaySky {
  sun: SunTimes;
  moon: MoonTimes;
  phase: MoonPhase;
  windows: SolunarWindow[];
  rating: 0 | 1 | 2 | 3 | 4;
}

/**
 * Everything for one local day at a place. The phase is taken at local noon. Each hour of a page asks for its day,
 * so days already worked out are kept (the result is shared: treat it as read-only).
 */
export function daySky(dayStart: number, lat: number, lng: number): DaySky {
  const k = `${dayStart},${lat},${lng}`;
  let d = skies.get(k);
  if (!d) {
    if (skies.size >= SKY_MEMO) skies.delete(skies.keys().next().value!);
    skies.set(k, (d = skyFor(dayStart, lat, lng)));
  }
  return d;
}

const skies = new Map<string, DaySky>();
/** A month of days at every spot. */
const SKY_MEMO = 600;

function skyFor(dayStart: number, lat: number, lng: number): DaySky {
  const sun = sunTimes(dayStart, lat, lng);
  const moon = moonTimes(dayStart, lat, lng);
  const phase = moonPhase(dayStart + DAY_MS / 2);
  const windows = solunarWindows(moon);
  return { sun, moon, phase, windows, rating: solunarRating(phase, sun, windows) };
}
