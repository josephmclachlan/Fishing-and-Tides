/**
 * PLAN AHEAD, the colour grid that replaced days 8 to 16 (PLAN 15.5, Joseph 2026-11-17 picked mockup 3).
 *
 * The person picks the readings (the activity's own set to start with, any of the WATCH metrics on top, up to
 * 12) and the days (1 to 16). The grid has one row per reading and one column per three hours, or one column per
 * day at that day's best window, and every cell is filled with its rating colour, the way Windguru's tables
 * read at a glance. Pure: values come from the metric registry and the page's own reading, so this file needs
 * no DOM and is tested in grid.test.ts.
 */
import { METRIC_BY_ID, type MetricEnv } from '../metrics/registry';
import type { Plan } from '../metrics/plan';
import type { Spot } from '../metrics/forecast';
import { localDayStart } from '../physics/astro';
import { skyMemo, type FcActivity, type FcRead, type Level } from './model';

const H = 3.6e6, DAY = 864e5;
const fin = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/** The activity's own rating, the first row; the rest are WATCH metric ids. */
export const RATING = 'rating';
export const GRID_MAX = 12;
/** Days the grid can show (today is day 1); days from LESS_SURE_FROM (day 8) are hatched as less sure. */
export const GRID_DAYS = 16;
export const LESS_SURE_FROM = 7;

export type GridGroup = 'rate' | 'waves' | 'wind' | 'water' | 'sky' | 'sun' | 'tide';
/** Every row a person can pick, grouped as the picker shows them. */
export const GRID_GROUPS: readonly { g: GridGroup; ids: readonly string[] }[] = [
  { g: 'rate', ids: [RATING, 'surfq', 'bite', 'swim', 'paddle', 'comfort'] },
  { g: 'waves', ids: ['swell', 'period', 'shorebreak', 'rip'] },
  { g: 'wind', ids: ['wind', 'gust', 'wdir', 'squall'] },
  { g: 'water', ids: ['clarity', 'sst', 'current', 'sargassum'] },
  { g: 'sky', ids: ['rainpct', 'rain', 'cloud'] },
  { g: 'sun', ids: ['uv', 'air', 'feels', 'humidity'] },
  { g: 'tide', ids: ['tide'] },
];
export const GRID_IDS: readonly string[] = GRID_GROUPS.flatMap((x) => x.ids);
export const groupOf = (id: string): GridGroup => GRID_GROUPS.find((x) => x.ids.includes(id))?.g ?? 'rate';

/** Each activity's starting rows, its own rating first. */
export const GRID_DEFAULTS: Readonly<Record<FcActivity, readonly string[]>> = {
  surf: [RATING, 'swell', 'period', 'wind', 'wdir', 'tide', 'rainpct', 'uv'],
  fish: [RATING, 'tide', 'wind', 'swell', 'rainpct', 'cloud', 'uv'],
  swim: [RATING, 'shorebreak', 'rip', 'wind', 'rainpct', 'uv', 'feels'],
  snorkel: [RATING, 'clarity', 'swell', 'current', 'wind', 'rainpct', 'uv'],
  dive: [RATING, 'clarity', 'swell', 'period', 'current', 'wind', 'rainpct'],
  spear: [RATING, 'clarity', 'swell', 'current', 'wind', 'rainpct'],
  sail: [RATING, 'wind', 'gust', 'wdir', 'swell', 'squall', 'rainpct'],
  paddle: [RATING, 'wind', 'gust', 'wdir', 'swell', 'current', 'uv'],
};

/** The picks kept for an activity, cleaned: known ids only, no repeats, the rating first, at most GRID_MAX. */
export function cleanPicks(act: FcActivity, saved: unknown): string[] {
  const list = Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string' && GRID_IDS.includes(x)) : [];
  const ids = [...new Set(list.length ? list : GRID_DEFAULTS[act])];
  return [RATING, ...ids.filter((x) => x !== RATING)].slice(0, GRID_MAX);
}

/** Thresholds ascending: how many a value reaches (higher is better), or misses (lower is better). */
const up = (v: number, t: readonly number[]): Level => t.reduce((n, x) => n + (v >= x ? 1 : 0), 0) as Level;
const dn = (v: number, t: readonly number[]): Level => (4 - up(v, t)) as Level;

/**
 * A reading's rating level 0 (very poor) to 4 (great), on the forecast's own five colours, or null for readings
 * that are neither good nor bad in themselves (direction, tide, air, cloud, humidity, sea temperature). Some
 * depend on the activity: sailing wants wind, and a surfer wants swell and a long period.
 */
export function levelOf(id: string, v: number | null, act: FcActivity): Level | null {
  if (!fin(v)) return null;
  switch (id) {
    case 'surfq': case 'bite': case 'swim': case 'paddle': case 'comfort': return up(v, [20, 40, 60, 80]);
    case 'swell': return act === 'surf' ? (v > 3 ? 2 : up(v, [0.4, 0.7, 1, 1.4])) : act === 'sail' ? dn(v, [1, 1.5, 2, 3]) : dn(v, [0.4, 0.8, 1.2, 2]);
    case 'period': return act === 'surf' ? up(v, [6, 8, 10, 12]) : null;
    case 'shorebreak': return dn(v, [0.3, 0.6, 1, 1.5]);
    case 'rip': return dn(v, [0.15, 0.25, 0.4, 0.55]);
    case 'wind': return act === 'sail' ? (v < 4 ? 1 : v < 8 ? 2 : v < 12 ? 3 : v <= 18 ? 4 : v < 22 ? 3 : v < 28 ? 2 : 1) : dn(v, [8, 12, 16, 20]);
    case 'gust': return act === 'sail' ? dn(v, [18, 22, 26, 30]) : dn(v, [14, 18, 22, 28]);
    case 'squall': return v >= 2 ? 0 : v >= 1 ? 2 : 4;
    case 'clarity': return up(v, [2, 3, 5, 8]);
    case 'current': return dn(v, [0.5, 1, 1.5, 2]);
    case 'sargassum': return dn(v, [0.001, 0.01, 0.1, 0.5]);
    case 'rainpct': return dn(v, [15, 30, 50, 70]);
    case 'rain': return dn(v, [0.2, 1, 3, 8]);
    case 'uv': return dn(v, [3, 6, 8, 10]);
    case 'feels': return dn(v, [28, 32, 36, 39]);
    default: return null;
  }
}

export interface GridCol {
  ms: number;
  /** Day index from today (0 = today). */
  day: number;
  /** Local hour of the column's start. */
  hour: number;
  night: boolean;
  /** Framed as the best (markBest, from the rating row). */
  best: boolean;
  unsure: boolean;
  /** First column of its day. */
  first: boolean;
}

export interface Range { from: number; to: number }
/** The hours or days the person chose, as columns. Hours: every 3 local hours, skipping those already over today. */
export function gridCols(mode: 'h' | 'd', r: Range, startMs: number, nowMs: number, plan: Plan | null, isDay: (ms: number) => boolean, tz: number): GridCol[] {
  const out: GridCol[] = [];
  const from = Math.max(0, r.from), to = Math.min(GRID_DAYS - 1, Math.max(from, r.to));
  for (let d = from; d <= to; d++) {
    const dayMs = localDayStart(startMs + d * DAY + 12 * H, tz);
    const pd = plan?.days[d] ?? null;
    if (mode === 'd') {
      const ms = pd ? pd.startMs : dayMs + 12 * H;
      if (ms + 3 * H <= nowMs) continue;
      out.push({ ms, day: d, hour: Math.round((ms - dayMs) / H), night: false, best: false, unsure: d >= LESS_SURE_FROM, first: true });
      continue;
    }
    let first = true;
    for (let h = 0; h < 24; h += 3) {
      const ms = dayMs + h * H;
      if (ms + 3 * H <= nowMs) continue;
      out.push({ ms, day: d, hour: h, night: !isDay(ms + 1.5 * H), best: false, unsure: d >= LESS_SURE_FROM, first });
      first = false;
    }
  }
  return out;
}

export interface GridCell { v: number | null; lv: Level | null; text: string; deg: number | null }
export interface GridRow { id: string; group: GridGroup; unit: string; cells: GridCell[] }

/** How a value reads in its cell: the metric's own decimals, the tide signed, no unit (the row label has it). */
export function cellText(id: string, v: number | null): string {
  if (!fin(v)) return '–';
  if (id === RATING) return String(Math.round(v));
  if (id === 'tide') return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
  if (id === 'squall') return ['0', '!', '!!'][Math.max(0, Math.min(2, Math.round(v)))];
  const m = METRIC_BY_ID.get(id);
  const d = m?.decimals ?? 0;
  if (id === 'sargassum') return v < 0.005 ? '0' : v.toFixed(2);
  return d ? v.toFixed(Math.min(d, 1)) : String(Math.round(v));
}

/** The rows for the chosen columns: the rating from the page's own reading, the rest from the metric registry at the spot. */
export function gridRows(ids: readonly string[], cols: readonly GridCol[], act: FcActivity, spot: Spot, env: MetricEnv, read: (ms: number) => FcRead): GridRow[] {
  const sky = skyMemo(env.tzOffsetH);
  const [lng, lat] = spot.lngLat;
  return ids.map((id) => {
    if (id === RATING) {
      const cells = cols.map((c) => { const r = read(c.ms); return { v: r.score, lv: r.level, text: cellText(RATING, r.score), deg: null }; });
      return { id, group: 'rate' as const, unit: '/100', cells };
    }
    const m = METRIC_BY_ID.get(id);
    if (!m) return { id, group: groupOf(id), unit: '', cells: cols.map(() => ({ v: null, lv: null, text: '–', deg: null })) };
    const cells = cols.map((c): GridCell => {
      // A daily reading (visibility, sea temperature, sargassum) is read at its own hour of the column's day.
      const ms = m.hours ? localDayStart(c.ms, env.tzOffsetH) + m.hours[0] * H : c.ms;
      let v: number | null = null;
      try {
        v = m.at({ env, spot: spot.name, lng, lat, ms, sky: sky(ms, lat, lng) });
      } catch {
        v = null;
      }
      v = fin(v) ? v : null;
      return { v, lv: levelOf(id, v, act), text: cellText(id, v), deg: id === 'wdir' && v !== null ? v : null };
    });
    return { id, group: groupOf(id), unit: m.unit, cells };
  });
}

/**
 * Frame the best columns by the rating the grid shows, so the frame always sits on the numbers a person reads.
 * Hours: in each day, the best daylight cell and its neighbours in a run within BEST_SLACK of it. Days: the best day.
 * Days with no rating, or a best below fair, get no frame.
 */
export const BEST_SLACK = 5;
export function markBest(cols: readonly GridCol[], rating: GridRow | undefined, mode: 'h' | 'd'): GridCol[] {
  const out = cols.map((c) => ({ ...c, best: false }));
  if (!rating) return out;
  const sc = (i: number) => (mode === 'h' && out[i].night ? null : rating.cells[i]?.v ?? null);
  const groups = mode === 'd' ? [out.map((_, i) => i)] : [...new Set(out.map((c) => c.day))].map((d) => out.flatMap((c, i) => (c.day === d ? [i] : [])));
  for (const g of groups) {
    let top = -1;
    for (const i of g) { const v = sc(i); if (v !== null && (top < 0 || v > sc(top)!)) top = i; }
    if (top < 0 || (rating.cells[top].lv ?? 0) < 2) continue;
    const max = sc(top)!;
    out[top].best = true;
    if (mode === 'd') continue;
    const k = g.indexOf(top);
    for (let j = k - 1; j >= 0 && (sc(g[j]) ?? -1) >= max - BEST_SLACK; j--) out[g[j]].best = true;
    for (let j = k + 1; j < g.length && (sc(g[j]) ?? -1) >= max - BEST_SLACK; j++) out[g[j]].best = true;
  }
  return out;
}
