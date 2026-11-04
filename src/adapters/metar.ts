/**
 * Limón airport METAR adapter (PLAN 2.11): the latest real wind, temperature and pressure on the
 * coast, relayed by the data build (scripts/forecast/metar.ts). The airport reports roughly
 * 12:00 to 00:00 UTC (06:00 to 18:00 local), so overnight the newest report is hours old; the
 * LIVE OBS panel shows its age.
 */
import { METAR_STATION } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { FORECAST_DIR } from './series';
import { latestWind, type MetarFile } from './metar-parse';
import { freshness, inRange, type Check, type Outcome } from '../verify/types';
import { windAt, type WindData } from './wind';
import { KT_PER_MS, sampleField } from '../physics/flow';

export interface MetarData extends MetarFile {
  fromCache: boolean;
}

export async function fetchMetar(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<MetarData> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}metar.json`, { deps });
  const d = (await r.response.json()) as MetarFile;
  if (!Array.isArray(d.obs) || !Date.parse(d.fetchedAt)) throw new Error('metar: malformed file');
  dataAge.report('metar', Date.parse(d.fetchedAt), r.fromCache);
  return { ...d, fromCache: r.fromCache };
}

/**
 * Verify checks. Freshness uses a 6 h cadence (amber past 12 h, red past a day) because the
 * airport is closed overnight. The cross-check compares the latest reported wind with the
 * model's wind at the airport for the same hour: amber past 8 kt apart, red past 16 kt (an
 * airport anemometer sees local land and sea breezes the 0.25° model smooths out).
 */
export function metarChecks(load: () => Promise<MetarData>, loadWind?: () => Promise<WindData>): Check[] {
  let cached: Promise<MetarData> | null = null;
  const data = () => (cached ??= load());
  const checks: Check[] = [
    { feed: 'metar', kind: 'fresh', label: `${METAR_STATION.icao} report within 12 h`, run: async () => {
      const d = await data();
      if (!d.obs.length) return { status: 'fail', detail: 'no reports in 96 h' };
      return freshness(Date.now() - d.obs[0].t, 6 * 3.6e6);
    } },
    { feed: 'metar', kind: 'range', label: 'Wind 0..120 kt, temperature 10..40 °C', run: async () => {
      const d = await data();
      const w = inRange(d.obs.map((o) => o.windKt ?? NaN), 0, 120, 'kt', 0.9);
      const t = inRange(d.obs.map((o) => o.tempC ?? NaN), 10, 40, '°C', 0.9);
      return w.status === 'pass' ? t : w;
    } },
  ];
  if (loadWind)
    checks.push({ feed: 'metar', kind: 'agree', label: 'Airport wind vs forecast wind', run: async (): Promise<Outcome> => {
      const [d, w] = await Promise.all([data(), loadWind()]);
      const o = latestWind(d.obs);
      if (!o || o.windKt === null) return { status: 'warn', detail: 'no recent wind report' };
      const f = windAt(w, 'forecast', o.t);
      const uv: [number, number] = [0, 0];
      if (!f || !sampleField(f.field, ...METAR_STATION.lngLat, uv)) return { status: 'warn', detail: 'no forecast for that hour' };
      const rad = Math.PI / 180;
      const obs: [number, number] = o.windFromDeg === null ? [0, 0] : [-o.windKt * Math.sin(o.windFromDeg * rad), -o.windKt * Math.cos(o.windFromDeg * rad)];
      const diff = Math.hypot(obs[0] - uv[0] * KT_PER_MS, obs[1] - uv[1] * KT_PER_MS);
      const detail = `${o.windKt} kt reported vs ${(Math.hypot(...uv) * KT_PER_MS).toFixed(0)} kt forecast, ${diff.toFixed(0)} kt apart`;
      return { status: diff > 16 ? 'fail' : diff > 8 ? 'warn' : 'pass', detail };
    } });
  return checks;
}
