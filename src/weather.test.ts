import { describe, expect, it } from 'vitest';
import { parseWeather } from './adapters/weather';
import { biteWeather, uvAt as uvAtWx, uvScale, heavyRainSoon, pressureChange, nearestStorm, squallLevel, squallSoon, summarise, uvBand, uvPeakDay } from './weather';
import { parseStorms } from './adapters/storms-parse';

const T0 = 1_000_000_000;
const hours = 30;
const col = (f: (i: number) => number) => Array.from({ length: hours }, (_, i) => f(i));
const d = parseWeather({
  hourly: {
    time: col((i) => T0 / 1000 + i * 3600),
    precipitation_gfs_seamless: col(() => 1), cloud_cover_gfs_seamless: col(() => 40), uv_index_gfs_seamless: col(() => 6), temperature_2m_gfs_seamless: col(() => 27),
    precipitation_icon_seamless: col(() => 3), cloud_cover_icon_seamless: col(() => 60), uv_index_icon_seamless: col(() => null as unknown as number), temperature_2m_icon_seamless: col(() => 29),
  },
}, T0);

describe('weather summary', () => {
  it('averages the models and reports their spread', () => {
    const s = summarise(d, T0 + 100)!;
    expect(s.models).toBe(2);
    expect(s.rainMmH).toBe(2);
    expect(s.rainSpreadMmH).toBe(2);
    expect(s.cloudPct).toBe(50);
    expect(s.uv).toBe(6);
    expect(s.tempC).toBe(28);
    expect(s.rain24Mm).toBe(48);
  });
  it('pools the ensembles\' chance of rain and derives humidity and real feel (PLAN 7.57)', () => {
    const f = parseWeather({ hourly: {
      time: [T0 / 1000, T0 / 1000 + 3600],
      temperature_2m_ecmwf_ifs: [30, 30], dew_point_2m_ecmwf_ifs: [24, 24], wind_speed_10m_ecmwf_ifs: [0, 0], precipitation_probability_ecmwf_ifs: [0, 100],
      temperature_2m_ukmo_global_deterministic_10km: [30, 30], dew_point_2m_ukmo_global_deterministic_10km: [24, 24], wind_speed_10m_ukmo_global_deterministic_10km: [0, 0], precipitation_probability_ukmo_global_deterministic_10km: [0, 0],
    } }, T0);
    const s = summarise(f, T0)!;
    // 51 ECMWF members all wet, 18 UK members all dry: 51 / 69.
    expect(s.rainChancePct).toBeCloseTo((100 * 51) / 69, 6);
    expect(s.dewC).toBeCloseTo(24, 6);
    expect(s.humidityPct).toBeGreaterThan(68);
    expect(s.humidityPct).toBeLessThan(72);
    expect(s.feelsC).toBeCloseTo(35.9, 0);
  });
  it('leaves 24 h rain unknown when the series ends sooner', () => {
    expect(summarise(d, T0 + 10 * 3.6e6)!.rain24Mm).toBeNaN();
  });
  it('is null outside the series', () => {
    expect(summarise(d, 0)).toBeNull();
  });
  it('flags heavy rain only above 10 mm/h', () => {
    expect(heavyRainSoon(d, T0)).toBe(false);
    // Open-Meteo stamps the hour's rain at its end: 12 mm at T0 + 1 h fell from T0.
    const wet = parseWeather({ hourly: { time: [T0 / 1000, T0 / 1000 + 3600], precipitation_gfs_seamless: [0, 12], cloud_cover_gfs_seamless: [90, 90], uv_index_gfs_seamless: [1, 1], temperature_2m_gfs_seamless: [25, 25] } }, T0);
    expect(heavyRainSoon(wet, T0)).toBe(true);
  });
  it('finds the nearest storm with its category', () => {
    const s = parseStorms({ activeStorms: [
      { id: 'al01', name: 'FAR', intensity: 40, latitudeNumeric: 30, longitudeNumeric: -50 },
      { id: 'al02', name: 'NEAR', intensity: 100, latitudeNumeric: 14, longitudeNumeric: -80 },
    ] }, 0).storms;
    const n = nearestStorm(s)!;
    expect(n.storm.name).toBe('NEAR');
    expect(n.category).toBe(3);
    expect(n.km).toBeGreaterThan(400);
    expect(nearestStorm([])).toBeNull();
  });

  it('squall flag needs unstable air plus gusts or heavy rain', () => {
    expect(squallLevel({ capeJkg: 500, gustKt: 40, rainMmH: 10 })).toBe('none');
    expect(squallLevel({ capeJkg: 1500, gustKt: 10, rainMmH: 1 })).toBe('none');
    expect(squallLevel({ capeJkg: 1500, gustKt: 30, rainMmH: 1 })).toBe('watch');
    expect(squallLevel({ capeJkg: 3000, gustKt: 10, rainMmH: 6 })).toBe('high');
    expect(squallLevel({ capeJkg: NaN, gustKt: 40, rainMmH: 10 })).toBe('none');
  });
  it('looks six hours ahead for the worst level', () => {
    const t0 = 1_000_000_000;
    const col = (f: (i: number) => number) => Array.from({ length: 12 }, (_, i) => f(i));
    const w = parseWeather({ hourly: {
      time: col((i) => t0 / 1000 + i * 3600),
      precipitation_gfs_seamless: col((i) => (i === 4 ? 8 : 0)), cloud_cover_gfs_seamless: col(() => 90), uv_index_gfs_seamless: col(() => 1), temperature_2m_gfs_seamless: col(() => 26),
      wind_gusts_10m_gfs_seamless: col(() => 12), cape_gfs_seamless: col(() => 3000),
    } }, t0);
    expect(squallSoon(w, t0)).toBe('high');
    expect(squallSoon(w, t0 + 6 * 3.6e6)).toBe('none');
  });
});

describe('biteWeather', () => {
  const w = (rainMmH: number, cloudPct: number, capeJkg = 0, gustKt = 0) => ({ model: 'gfs_seamless' as const, rainMmH, cloudPct, uv: 0, tempC: 27, gustKt, capeJkg, pressureHpa: 1012, windKt: 10 });
  it('averages the models and flags squalls', () => {
    expect(biteWeather([])).toEqual({});
    const b = biteWeather([w(4, 80), w(8, 100)]);
    expect(b.rainMmH).toBe(6);
    expect(b.cloudPct).toBe(90);
    expect(b.squall).toBe('none');
    expect(biteWeather([w(6, 100, 3000, 30)]).squall).toBe('high');
  });
});

describe('pressureChange', () => {
  const w = (model: 'gfs_seamless' | 'icon_seamless', pressureHpa: number) => ({ model, rainMmH: 0, cloudPct: 0, uv: 0, tempC: 27, gustKt: 0, capeJkg: 0, pressureHpa, windKt: 10 });
  it('means the change over models present at both ends', () => {
    expect(pressureChange([w('gfs_seamless', 1008), w('icon_seamless', 1009)], [w('gfs_seamless', 1011), w('icon_seamless', 1011)])).toBeCloseTo(-2.5);
    expect(pressureChange([w('gfs_seamless', 1008)], [w('icon_seamless', 1011)])).toBeNull();
    expect(pressureChange([w('gfs_seamless', NaN)], [w('gfs_seamless', 1011)])).toBeNull();
  });
});

describe('UV peak of the day (PLAN 7.53)', () => {
  // A local day at UTC-6: midnight is 06:00 UTC. UV rises to 11 at local noon.
  const day0 = Date.UTC(2026, 10, 10, 6);
  const n = 48;
  const uvAt = (i: number) => {
    const h = i % 24;
    return h >= 6 && h <= 18 ? Math.round(11 * Math.sin(((h - 6) / 12) * Math.PI) * 10) / 10 : 0;
  };
  const wx = parseWeather({
    hourly: {
      time: Array.from({ length: n }, (_, i) => day0 / 1000 + i * 3600),
      precipitation_gfs_seamless: Array.from({ length: n }, () => 0),
      uv_index_gfs_seamless: Array.from({ length: n }, (_, i) => uvAt(i)),
      uv_index_icon_seamless: Array.from({ length: n }, (_, i) => uvAt(i) - 1),
      precipitation_icon_seamless: Array.from({ length: n }, () => 0),
    },
  }, day0);
  it('takes the highest hour of the local day, at local noon (GFS alone without CAMS)', () => {
    const p = uvPeakDay(wx, day0 + 20 * 3.6e6, -6)!;
    expect(p.uv).toBeCloseTo(11, 6);
    expect(p.atMs).toBe(day0 + 12 * 3.6e6);
  });
  it('reads CAMS where it reaches and scales GFS past it by the clear-sky ratio (PLAN 7.57)', () => {
    const clear = (i: number) => uvAt(i);
    const g = parseWeather({ hourly: {
      time: Array.from({ length: n }, (_, i) => day0 / 1000 + i * 3600),
      temperature_2m_gfs_seamless: Array.from({ length: n }, () => 28),
      uv_index_gfs_seamless: Array.from({ length: n }, (_, i) => 0.5 * clear(i)),
      uv_index_clear_sky_gfs_seamless: Array.from({ length: n }, (_, i) => clear(i)),
    } }, day0);
    // CAMS covers the first day only and its clear sky is 1.3 times GFS's.
    const cams = { times: Array.from({ length: 24 }, (_, i) => day0 + i * 3.6e6), uv: Array.from({ length: 24 }, (_, i) => 1.2 * clear(i)), clear: Array.from({ length: 24 }, (_, i) => 1.3 * clear(i)), fetchedAt: day0, fromCache: false };
    const d = { ...g, uv: cams };
    expect(uvScale(d)).toBeCloseTo(1.3, 6);
    expect(uvAtWx(d, day0 + 12 * 3.6e6)).toBeCloseTo(1.2 * 11, 6);
    expect(uvAtWx(d, day0 + 36 * 3.6e6)).toBeCloseTo(0.5 * 11 * 1.3, 6);
    expect(uvAtWx(g, day0 + 36 * 3.6e6)).toBeCloseTo(0.5 * 11, 6);
  });
  it('is null for a day the forecast does not reach', () => {
    expect(uvPeakDay(wx, day0 + 5 * 864e5, -6)).toBeNull();
  });
  it('uses the WHO bands', () => {
    expect([0, 2.4, 3, 5, 6, 7, 8, 10, 11].map(uvBand)).toEqual(['low', 'low', 'moderate', 'moderate', 'high', 'high', 'vhigh', 'vhigh', 'extreme']);
  });
});
