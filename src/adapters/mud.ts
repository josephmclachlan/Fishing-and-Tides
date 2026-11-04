/**
 * MUD WEEKS adapter (PLAN 7.39): the relayed daily Kd490 at each reef (data/forecast/mud.json) and the
 * committed history (data/climatology/mud-history.json: baselines and yearly peaks). The score itself
 * is src/physics/mud.ts.
 *
 *   const now = mudNow(data, history, 'cahuita'); // now.mw, now.level, now.day
 */
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { FORECAST_DIR } from './series';
import { freshness, inRange, type Check } from '../verify/types';
import { baselineKd, lastWithValue, mudLevel, mudWeeksSeries, MUD_WINDOW_D, REEF_DEPTH_M, type MudLevel } from '../physics/mud';
import { KD_RANGE, type MudData, type MudHistory } from './mud-parse';

export * from './mud-parse';

export interface MudLoaded extends MudData {
  fromCache: boolean;
}

export async function fetchMud(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<MudLoaded> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}mud.json`, { deps });
  const d = (await r.response.json()) as MudData;
  if (!Array.isArray(d.reefs) || !Array.isArray(d.days) || !Date.parse(d.fetchedAt)) throw new Error('mud: malformed file');
  dataAge.report('mud', Date.parse(d.fetchedAt), r.fromCache);
  return { ...d, fromCache: r.fromCache };
}

export interface MudNow {
  /** MUD WEEKS on the newest day with data; NaN if none. */
  mw: number;
  level: MudLevel;
  /** That day, epoch ms (NaN if none). */
  day: number;
  /** Kd490 that day and the baseline used, 1/m. */
  kd: number;
  baseKd: number;
  /** MUD WEEKS for each day of the feed, for the trend chart (null where missing). */
  trend: (number | null)[];
  depthM: number;
}

/**
 * MUD WEEKS for a reef at a depth. The baseline comes from the history file (the whole record);
 * without it, from the feed's own ~90 days, which overstates the baseline in a wet spell (so it
 * understates MUD WEEKS) and is marked by `fromHistory: false`.
 */
export function mudNow(d: MudData | null, h: MudHistory | null, reefId: string, depthM = REEF_DEPTH_M): MudNow & { fromHistory: boolean } {
  const reef = d?.reefs.find((r) => r.id === reefId);
  const hist = h?.reefs.find((r) => r.id === reefId);
  const none = { mw: NaN, level: 'none' as MudLevel, day: NaN, kd: NaN, baseKd: NaN, trend: [], depthM, fromHistory: !!hist };
  if (!d || !reef) return none;
  const baseKd = hist && hist.baselineKd > 0 ? hist.baselineKd : baselineKd(reef.kd);
  const series = mudWeeksSeries(d.days, reef.kd, baseKd, depthM);
  const i = lastWithValue(reef.kd);
  if (i < 0) return { ...none, baseKd };
  const mw = series[i];
  return { mw, level: mudLevel(mw), day: d.days[i], kd: reef.kd[i]!, baseKd, trend: series.map((v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null)), depthM, fromHistory: !!hist };
}

const DAY = 864e5;

export function mudChecks(load: () => Promise<MudLoaded>): Check[] {
  let cached: Promise<MudLoaded> | null = null;
  const data = () => (cached ??= load());
  return [
    { feed: 'mud', kind: 'schema', label: `Every reef has Kd490 on most of the last ${MUD_WINDOW_D} days`, run: async () => {
      const d = await data();
      const thin = d.reefs.filter((r) => r.kd.filter((x) => x !== null).length < Math.min(d.days.length, MUD_WINDOW_D) * 0.6).map((r) => r.id);
      return thin.length ? { status: 'warn', detail: `few days for ${thin.join(', ')}` } : { status: 'pass', detail: `${d.reefs.length} reefs, ${d.days.length} days` };
    } },
    { feed: 'mud', kind: 'range', label: `Kd490 within ${KD_RANGE[0]}..${KD_RANGE[1]} 1/m`, run: async () => inRange((await data()).reefs.flatMap((r) => r.kd.map((x) => (x === null ? NaN : x))), KD_RANGE[0], KD_RANGE[1], '1/m', 0.5) },
    { feed: 'mud', kind: 'fresh', label: 'Relayed within the last 2 days', run: async () => freshness(Date.now() - Date.parse((await data()).fetchedAt), DAY) },
    // Science-quality Kd490 runs about 10 days behind: warn past 20 days, fail past 40.
    { feed: 'mud', kind: 'fresh', label: 'Newest Kd490 day about 10 days old', run: async () => {
      const d = await data();
      return freshness(Date.now() - d.days[d.days.length - 1], 10 * DAY);
    } },
  ];
}
