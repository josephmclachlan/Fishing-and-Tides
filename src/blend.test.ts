import { describe, expect, it } from 'vitest';
import { blend, capWeights, confidence, scoreModel, weightsFrom, MAX_WEIGHT, MIN_PAIRS, SHRINK_N } from './blend';
import { parseHindcast, scoreWeather, scoredModels, leadModel, hindcastUrl } from './adapters/weather-skill';
import { parseWeather } from './adapters/weather';
import { summarise, biteWeather, blendedTempC } from './weather';
import type { MetarObs } from './adapters/metar-parse';

const H = 3.6e6;
const T0 = Date.UTC(2026, 10, 1);
const times = Array.from({ length: 72 }, (_, i) => T0 + i * H);
/** A diurnal "truth" with a little deterministic noise. */
const truth = (i: number) => 27 + 3 * Math.sin((2 * Math.PI * i) / 24);
const noise = (i: number, k: number) => (((i * 7919 + k * 104729) % 13) - 6) / 6;

describe('scoreModel', () => {
  it('finds a constant offset, shrinks it, and has no error left', () => {
    const obs = times.map((t, i) => ({ t: t + 5 * 60e3, obs: truth(i) }));
    const s = scoreModel(times, times.map((_, i) => truth(i) + 2), obs);
    expect(s.n).toBe(72);
    expect(s.bias).toBeCloseTo(2 * (72 / (72 + SHRINK_N)));
    expect(s.sigma).toBeCloseTo(0);
  });
  it('skips reports off the hour, outside the series and where the model has no value', () => {
    const vals = times.map((_, i) => (i === 3 ? NaN : 25));
    const obs = [
      { t: T0 + 3 * H, obs: 24 }, // model NaN
      { t: T0 + 4 * H + 40 * 60e3, obs: 24 }, // pairs with hour 5 (nearest), 20 min away
      { t: T0 - 2 * H, obs: 24 }, // before the series
      { t: T0 + 10 * H, obs: NaN },
    ];
    const s = scoreModel(times, vals, obs);
    expect(s.n).toBe(1);
    expect(scoreModel(times, vals, []).n).toBe(0);
  });
});

describe('weights', () => {
  it('weights by inverse error variance, with a floor and a cap', () => {
    const w = weightsFrom({ a: { n: 20, bias: 0, sigma: 1 }, b: { n: 20, bias: 0, sigma: 2 } }, 0.1);
    expect(w.a).toBeCloseTo(0.7); // 0.8 by 1/σ², capped at 0.7
    expect(w.b).toBeCloseTo(0.3);
    const floored = weightsFrom({ a: { n: 20, bias: 0, sigma: 0.01 }, b: { n: 20, bias: 0, sigma: 0.5 }, c: { n: 20, bias: 0, sigma: 0.5 } }, 0.5);
    expect(floored.a).toBeCloseTo(1 / 3);
  });
  it('keeps equal weights until two models are scored, and gives an unscored model the average', () => {
    expect(weightsFrom({ a: { n: MIN_PAIRS - 1, bias: 0, sigma: 1 }, b: { n: 30, bias: 0, sigma: 3 } }, 0.1)).toEqual({ a: 0.5, b: 0.5 });
    const w = weightsFrom({ a: { n: 30, bias: 0, sigma: 1 }, b: { n: 30, bias: 0, sigma: 1 }, c: { n: 0, bias: 0, sigma: NaN } }, 0.1);
    expect(w.c).toBeCloseTo(1 / 3);
  });
  it('caps and shares the excess by size', () => {
    const w = capWeights({ a: 90, b: 6, c: 4 }, MAX_WEIGHT);
    expect(w.a).toBeCloseTo(0.7);
    expect(w.b / w.c).toBeCloseTo(1.5);
    expect(w.a + w.b + w.c).toBeCloseTo(1);
  });
});

describe('blend', () => {
  it('removes each bias, weights, and reports spread plus expected error', () => {
    const b = blend({ a: 30, b: 26 }, { a: 0.5, b: 0.5 }, { a: { n: 20, bias: 2, sigma: 1 }, b: { n: 20, bias: 0, sigma: 1 } })!;
    expect(b.value).toBeCloseTo(27);
    expect(b.spread).toBeCloseTo(1);
    expect(b.sigma).toBeCloseTo(Math.sqrt(1 + 0.5));
    expect(b.models).toBe(2);
  });
  it('drops absent models and renormalises', () => {
    expect(blend({ a: NaN, b: 26 }, { a: 0.9, b: 0.1 })!.value).toBe(26);
    expect(blend({ a: NaN }, { a: 1 })).toBeNull();
  });
  it('turns the expected error into a confidence', () => {
    expect(confidence(0.8, 1, 2)).toBe('HIGH');
    expect(confidence(1.5, 1, 2)).toBe('MED');
    expect(confidence(3, 1, 2)).toBe('LOW');
    expect(confidence(NaN, 1, 2)).toBe('LOW');
  });
});

/** Open-Meteo-shaped hindcast: GFS runs 1.5 °C warm and noisy, ECMWF close, ICON 1 °C cold. */
const hourly: Record<string, number[]> = { time: times.map((t) => t / 1000) };
const models = { gfs_seamless: [1.5, 2.5], ecmwf_ifs: [0, 0.3], icon_seamless: [-1, 1.5] } as const;
for (const [m, [off, amp]] of Object.entries(models)) {
  hourly[`temperature_2m_${m}`] = times.map((_, i) => truth(i) + off + amp * noise(i, 1));
  hourly[`wind_speed_10m_${m}`] = times.map((_, i) => 10 + 3 * amp * noise(i, 2));
  hourly[`pressure_msl_${m}`] = times.map(() => 1012 + off);
}
// The airport reports daytime only (12 to 23 UTC), with gusts only sometimes.
const obs: MetarObs[] = times.flatMap((t, i) =>
  new Date(t).getUTCHours() >= 12 ? [{ t, windFromDeg: 60, windKt: 10, gustKt: null, tempC: truth(i), dewC: 23, pressureHpa: 1012, raw: '' }] : [],
);

describe('model skill at the airport', () => {
  const sk = scoreWeather(parseHindcast({ hourly }, T0), obs, T0 + 80 * H);
  it('asks Open-Meteo for the airport with past days', () => {
    expect(hindcastUrl()).toContain('past_days=3');
    expect(hindcastUrl()).toContain('latitude=9.961');
  });
  it('learns each model\'s bias and favours the steadiest', () => {
    expect(scoredModels(sk, 'temp')).toHaveLength(3);
    expect(sk.scores.temp.gfs_seamless.bias).toBeGreaterThan(1.2);
    expect(sk.scores.temp.icon_seamless.bias).toBeLessThan(-0.7);
    expect(sk.weights.temp.ecmwf_ifs).toBeGreaterThan(sk.weights.temp.icon_seamless);
    expect(sk.weights.temp.icon_seamless).toBeGreaterThan(sk.weights.temp.gfs_seamless);
    expect(leadModel(sk, 'wind')!.model).toBe('ecmwf_ifs');
  });
  it('ignores reports after now and keeps equal weights with too few', () => {
    const early = scoreWeather(parseHindcast({ hourly }, T0), obs, T0 + 14 * H);
    expect(scoredModels(early, 'temp')).toHaveLength(0);
    expect(early.weights.temp.gfs_seamless).toBeCloseTo(1 / 4);
    expect(leadModel(early, 'wind')).toBeNull();
  });
  it('blends the forecast with the skill: corrected temperature, a confidence and the lead model', () => {
    const f = parseWeather({ hourly: {
      time: [T0 / 1000 + 100 * 3600],
      temperature_2m_gfs_seamless: [30], temperature_2m_ecmwf_ifs: [28.5], temperature_2m_icon_seamless: [27.5],
      precipitation_gfs_seamless: [0], precipitation_ecmwf_ifs: [0], precipitation_icon_seamless: [0],
      wind_speed_10m_gfs_seamless: [10], wind_speed_10m_ecmwf_ifs: [11], wind_speed_10m_icon_seamless: [10],
      wind_gusts_10m_gfs_seamless: [30], wind_gusts_10m_ecmwf_ifs: [16], wind_gusts_10m_icon_seamless: [20],
    } }, T0);
    const plain = summarise(f, T0 + 100 * H)!;
    expect(plain.tempC).toBeCloseTo(28.667, 2);
    expect(plain.lead).toBeNull();
    const s = summarise({ ...f, skill: sk }, T0 + 100 * H)!;
    // After removing the biases all three say about 28.5.
    expect(s.tempC).toBeCloseTo(28.5, 0);
    expect(s.tempSigmaC).toBeLessThan(1);
    expect(s.confidence).toBe('HIGH');
    expect(s.lead!.model).toBe('ecmwf_ifs');
    // Gusts lean toward ECMWF's 16 kt.
    expect(s.gustKt).toBeLessThan(plain.gustKt);
    expect(blendedTempC([], sk)).toBeNaN();
    expect(biteWeather([], sk)).toEqual({});
  });
  it('is LOW when the models disagree widely', () => {
    const f = parseWeather({ hourly: {
      time: [T0 / 1000], temperature_2m_gfs_seamless: [24], temperature_2m_icon_seamless: [31],
      precipitation_gfs_seamless: [0], precipitation_icon_seamless: [0],
    } }, T0);
    expect(summarise(f, T0)!.confidence).toBe('LOW');
  });
});
