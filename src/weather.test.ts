import { describe, expect, it } from 'vitest';
import { parseWeather } from './adapters/weather';
import { heavyRainSoon, nearestStorm, summarise } from './weather';
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
  it('leaves 24 h rain unknown when the series ends sooner', () => {
    expect(summarise(d, T0 + 10 * 3.6e6)!.rain24Mm).toBeNaN();
  });
  it('is null outside the series', () => {
    expect(summarise(d, 0)).toBeNull();
  });
  it('flags heavy rain only above 10 mm/h', () => {
    expect(heavyRainSoon(d, T0)).toBe(false);
    const wet = parseWeather({ hourly: { time: [T0 / 1000], precipitation_gfs_seamless: [12], cloud_cover_gfs_seamless: [90], uv_index_gfs_seamless: [1], temperature_2m_gfs_seamless: [25] } }, T0);
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
});
