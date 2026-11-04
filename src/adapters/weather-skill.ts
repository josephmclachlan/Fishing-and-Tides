/**
 * Model skill at the Limón airport (PLAN 7.4). Fetches what GFS, ECMWF IFS and ICON said for the
 * airport over the last few days (Open-Meteo `past_days`, stitched from each model's latest runs, so
 * close to their short-range error) and scores each against the METAR reports (adapters/metar.ts)
 * with src/blend.ts. Temperature, mean wind and sea-level pressure are scored; the airport's QNH is
 * sea-level pressure since the field is 2 m above the sea. The weights and biases ride on WeatherData
 * as `skill` and src/weather.ts blends with them.
 */
import { METAR_STATION } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { parseModelColumns, WEATHER_MODELS, type WeatherModel } from './weather';
import type { MetarObs } from './metar-parse';
import { MIN_PAIRS, scoreModel, weightsFrom, type ModelScore, type Pair } from '../blend';
import type { Check, Outcome } from '../verify/types';

export const HINDCAST_VARS = ['temperature_2m', 'wind_speed_10m', 'pressure_msl'] as const;
type HindcastVar = (typeof HINDCAST_VARS)[number];
/** Days of past model output scored. The METAR relay keeps 96 h, a little more. */
export const SKILL_PAST_DAYS = 3;

export interface Hindcast {
  times: number[];
  models: Partial<Record<WeatherModel, Record<HindcastVar, number[]>>>;
  fetchedAt: number;
  fromCache: boolean;
}

export const hindcastUrl = (point: readonly [number, number] = METAR_STATION.lngLat) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${point[1]}&longitude=${point[0]}&hourly=${HINDCAST_VARS.join(',')}&models=${WEATHER_MODELS.join(',')}&past_days=${SKILL_PAST_DAYS}&forecast_days=1&timeformat=unixtime&wind_speed_unit=kn`;

export const parseHindcast = (json: unknown, fetchedAt: number, fromCache = false): Hindcast => ({ ...parseModelColumns(json, HINDCAST_VARS), fetchedAt, fromCache });

export async function fetchHindcast(opts: { deps?: Partial<CacheDeps> } = {}): Promise<Hindcast> {
  const r = await cachedFetch(hindcastUrl(), { deps: opts.deps });
  return parseHindcast(await r.response.json(), r.fetchedAt, r.fromCache);
}

export type SkillVar = 'temp' | 'wind' | 'pressure';
const SOURCES: Record<SkillVar, { model: HindcastVar; obs: (o: MetarObs) => number | null; floor: number }> = {
  temp: { model: 'temperature_2m', obs: (o) => o.tempC, floor: 0.5 },
  wind: { model: 'wind_speed_10m', obs: (o) => o.windKt, floor: 2 },
  pressure: { model: 'pressure_msl', obs: (o) => o.pressureHpa, floor: 0.5 },
};
/** σ floors per variable (°C, kt, hPa): a model this good or better is not trusted more, so one lucky run cannot take the blend. */
export const SKILL_FLOORS: Record<SkillVar, number> = { temp: SOURCES.temp.floor, wind: SOURCES.wind.floor, pressure: SOURCES.pressure.floor };

export interface WeatherSkill {
  /** Per variable, each model's score against the airport (n = 0 when it had no matching hours). */
  scores: Record<SkillVar, Record<WeatherModel, ModelScore>>;
  /** Per variable, normalised blend weights over all three models. */
  weights: Record<SkillVar, Record<WeatherModel, number>>;
  /** Epoch ms the scores were made. */
  atMs: number;
}

/** Score every model against the airport reports up to `nowMs`. Models absent from the hindcast score n = 0 and keep an average weight. */
export function scoreWeather(h: Hindcast, obs: readonly MetarObs[], nowMs: number): WeatherSkill {
  const scores = {} as WeatherSkill['scores'];
  const weights = {} as WeatherSkill['weights'];
  for (const k of Object.keys(SOURCES) as SkillVar[]) {
    const src = SOURCES[k];
    const pairs: Pair[] = obs.flatMap((o) => {
      const x = src.obs(o);
      return x !== null && o.t <= nowMs ? [{ t: o.t, obs: x }] : [];
    });
    const s = {} as Record<WeatherModel, ModelScore>;
    for (const m of WEATHER_MODELS) {
      const series = h.models[m]?.[src.model];
      s[m] = series ? scoreModel(h.times, series, pairs) : { n: 0, bias: 0, sigma: NaN };
    }
    scores[k] = s;
    weights[k] = weightsFrom(s, src.floor) as Record<WeatherModel, number>;
  }
  return { scores, weights, atMs: nowMs };
}

/** Models with enough matched hours to count for a variable. */
export const scoredModels = (sk: WeatherSkill, v: SkillVar) => WEATHER_MODELS.filter((m) => sk.scores[v][m].n >= MIN_PAIRS && Number.isFinite(sk.scores[v][m].sigma));

export const MODEL_SHORT: Record<WeatherModel, string> = { gfs_seamless: 'GFS', ecmwf_ifs025: 'ECMWF', icon_seamless: 'ICON' };

/** The highest-weighted model for a variable and its share, or null while the weights are equal. */
export function leadModel(sk: WeatherSkill | undefined, v: SkillVar): { model: WeatherModel; share: number } | null {
  if (!sk || scoredModels(sk, v).length < 2) return null;
  const w = sk.weights[v];
  const model = WEATHER_MODELS.reduce((a, m) => (w[m] > w[a] ? m : a), WEATHER_MODELS[0]);
  return { model, share: w[model] };
}

const fmtScore = (sk: WeatherSkill, v: SkillVar, unit: string) =>
  WEATHER_MODELS.map((m) => {
    const s = sk.scores[v][m];
    return s.n ? `${MODEL_SHORT[m]} ${s.bias >= 0 ? '+' : ''}${s.bias.toFixed(1)}±${s.sigma.toFixed(1)}${unit} ${Math.round(100 * sk.weights[v][m])}%` : `${MODEL_SHORT[m]} unscored`;
  }).join(', ');

/**
 * Verify check: the blend has at least two models scored on temperature and wind. Amber, not red,
 * when it does not (the airport sends nothing overnight and the panel then falls back to equal weights).
 */
export function weatherSkillChecks(loadHindcast: () => Promise<Hindcast>, loadObs: () => Promise<{ obs: MetarObs[] }>): Check[] {
  return [
    { feed: 'weather', kind: 'agree', label: `Models scored against ${METAR_STATION.icao} (bias ± error, weight)`, run: async (): Promise<Outcome> => {
      const [h, m] = await Promise.all([loadHindcast(), loadObs()]);
      const sk = scoreWeather(h, m.obs, Date.now());
      const t = scoredModels(sk, 'temp').length, w = scoredModels(sk, 'wind').length;
      const detail = `temp: ${fmtScore(sk, 'temp', '°C')}; wind: ${fmtScore(sk, 'wind', 'kt')}`;
      return { status: t >= 2 && w >= 2 ? 'pass' : 'warn', detail: t >= 2 && w >= 2 ? detail : `fewer than two models scored, equal weights; ${detail}` };
    } },
  ];
}
