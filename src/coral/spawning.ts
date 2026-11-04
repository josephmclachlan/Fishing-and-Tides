/**
 * Coral spawning calendar (PLAN 7.33). Caribbean broadcast-spawning corals release eggs and sperm a set
 * number of nights after the August to October full moons, a set time after sunset. Windows here
 * come from the regional predictions (CARMABI southern Caribbean calendars 2023–2026, AGRRA/Reef
 * Resilience spawning guides) and are PREDICTED: spawning can slip a month, and local sightings beat
 * them. The one local record so far: Acropora palmata at Cahuita on 5 Sep 2023 (Raising Coral with SINAC), the
 * 6th evening after the full moon of 19:36 local time on 30 Aug, which sits inside the window below.
 * Nights count local evenings after the full moon's local day; some calendars count from the UTC date,
 * one night fewer when the moon is full in the local evening.
 *
 * Pure: full moons from the astro module (moon–sun elongation crossing 180°), sunset from sunTimes.
 */
import { localDayStart, moonPhase, sunTimes } from '../physics/astro';

export interface Spawner {
  id: string;
  /** Scientific name; common names are i18n `spawn.<id>`. */
  name: string;
  /** Full-moon months (1..12, local time) the species spawns after. */
  months: readonly number[];
  /** Nights after the full moon, inclusive (night 1 = the evening after the full moon). */
  nights: readonly [number, number];
  /** Minutes after sunset, inclusive. */
  minutes: readonly [number, number];
}

export const SPAWNERS: readonly Spawner[] = [
  { id: 'apal', name: 'Acropora palmata', months: [8, 9], nights: [2, 6], minutes: [140, 190] },
  { id: 'acer', name: 'Acropora cervicornis', months: [8, 9], nights: [2, 6], minutes: [120, 190] },
  { id: 'ofav', name: 'Orbicella faveolata', months: [8, 9, 10], nights: [5, 8], minutes: [185, 255] },
  { id: 'oann', name: 'Orbicella annularis', months: [8, 9, 10], nights: [5, 8], minutes: [185, 250] },
  { id: 'mcav', name: 'Montastraea cavernosa', months: [8, 9], nights: [5, 9], minutes: [60, 150] },
  { id: 'cnat', name: 'Colpophyllia natans', months: [8, 9], nights: [5, 9], minutes: [100, 170] },
  { id: 'pstr', name: 'Pseudodiploria strigosa', months: [8, 9], nights: [6, 9], minutes: [230, 330] },
];

/** Local sightings on this coast; shown above the predictions. */
export const SIGHTINGS: readonly { id: string; day: string; place: string; source: string }[] = [
  { id: 'apal', day: '2023-09-05', place: 'CAHUITA', source: 'Raising Coral, SINAC' },
];

const DAY = 864e5;
/** Costa Rica: UTC−6 all year. */
export const TZ = -6;

/** Full moons (epoch ms, within a few minutes) between two times, by bisection on the elongation. */
export function fullMoons(fromMs: number, toMs: number): number[] {
  const f = (t: number) => {
    const e = moonPhase(t).elongation - 180;
    return e;
  };
  const out: number[] = [];
  const step = 6 * 3.6e6;
  let t0 = fromMs, f0 = f(t0);
  for (let t1 = fromMs + step; t1 <= toMs + step; t1 += step) {
    const f1 = f(t1);
    // Elongation rises through 180 at full moon; skip the 360→0 wrap at new moon.
    if (f0 < 0 && f1 >= 0 && f1 - f0 < 90) {
      let a = t0, b = t1;
      for (let i = 0; i < 30; i++) {
        const m = (a + b) / 2;
        if (f(m) < 0) a = m;
        else b = m;
      }
      const t = (a + b) / 2;
      if (t >= fromMs && t <= toMs) out.push(Math.round(t));
    }
    t0 = t1;
    f0 = f1;
  }
  return out;
}

export interface SpawnWindow {
  id: string;
  /** Full moon it follows, epoch ms. */
  fullMoon: number;
  /** Night number after the full moon. */
  night: number;
  /** Window start and end, epoch ms. */
  from: number;
  to: number;
}

/**
 * Predicted windows from `fromMs` for the next `days`, at a place (for sunset). Night k is the local
 * evening k days after the local day of the full moon. Windows that ended before `fromMs` are dropped.
 */
export function spawnWindows(fromMs: number, days: number, lat: number, lng: number, spawners: readonly Spawner[] = SPAWNERS): SpawnWindow[] {
  const out: SpawnWindow[] = [];
  const maxNight = Math.max(...spawners.map((s) => s.nights[1]));
  for (const fm of fullMoons(fromMs - (maxNight + 1) * DAY, fromMs + days * DAY)) {
    const month = new Date(fm + TZ * 3.6e6).getUTCMonth() + 1;
    const fmDay = localDayStart(fm, TZ);
    for (const s of spawners) {
      if (!s.months.includes(month)) continue;
      for (let k = s.nights[0]; k <= s.nights[1]; k++) {
        const dayStart = fmDay + k * DAY;
        const sunset = sunTimes(dayStart, lat, lng).sunset;
        if (sunset === null) continue;
        const w = { id: s.id, fullMoon: fm, night: k, from: sunset + s.minutes[0] * 60e3, to: sunset + s.minutes[1] * 60e3 };
        if (w.to >= fromMs) out.push(w);
      }
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

export interface SpawnSeason {
  id: string;
  /** First and last night of the next run of windows (after one full moon), epoch ms. */
  first: SpawnWindow;
  last: SpawnWindow;
  /** A window is open now. */
  now: boolean;
}

/** For each species, its next run of windows (the earliest full moon it has windows after). */
export function nextSeasons(windows: readonly SpawnWindow[], nowMs: number): SpawnSeason[] {
  const by = new Map<string, SpawnWindow[]>();
  for (const w of windows) {
    const list = by.get(w.id) ?? [];
    if (!list.length || list[0].fullMoon === w.fullMoon) list.push(w);
    by.set(w.id, list);
  }
  return [...by.entries()]
    .map(([id, ws]) => ({ id, first: ws[0], last: ws[ws.length - 1], now: ws.some((w) => w.from <= nowMs && nowMs <= w.to) }))
    .sort((a, b) => a.first.from - b.first.from);
}
