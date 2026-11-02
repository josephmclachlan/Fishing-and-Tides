import { describe, expect, it } from 'vitest';
import { parseWeather, rainAccumMm, weatherAt, weatherUrl } from './weather';

const hourly = {
  time: [1000, 1000 + 3600, 1000 + 7200],
  precipitation_gfs_seamless: [1, 2, 3],
  cloud_cover_gfs_seamless: [10, 20, 30],
  uv_index_gfs_seamless: [0, 5, 9],
  temperature_2m_gfs_seamless: [25, 26, 27],
  precipitation_ecmwf_ifs025: [0.5, null, 1],
  cloud_cover_ecmwf_ifs025: [10, null, 30],
  uv_index_ecmwf_ifs025: [null, null, null],
  temperature_2m_ecmwf_ifs025: [24, null, 26],
};

describe('weather', () => {
  const d = parseWeather({ hourly }, 5, false);
  it('parses multi-model columns and leaves absent models out', () => {
    expect(Object.keys(d.models).sort()).toEqual(['ecmwf_ifs025', 'gfs_seamless']);
    expect(d.times[0]).toBe(1_000_000);
    expect(Number.isNaN(d.models.ecmwf_ifs025!.uv_index[0])).toBe(true);
    expect(Number.isNaN(d.models.ecmwf_ifs025!.precipitation[1])).toBe(true);
  });
  it('reads every model that has the hour', () => {
    expect(weatherAt(d, 1_000_000 + 10).map((w) => w.model)).toEqual(['gfs_seamless', 'ecmwf_ifs025']);
    expect(weatherAt(d, 1_000_000 + 3_600_000 + 10).map((w) => w.model)).toEqual(['gfs_seamless']);
    expect(weatherAt(d, 0)).toEqual([]);
  });
  it('sums rain over a window, ignoring missing hours', () => {
    expect(rainAccumMm(d, 'gfs_seamless', 1_000_000, 1_000_000 + 3 * 3_600_000)).toBe(6);
    expect(rainAccumMm(d, 'ecmwf_ifs025', 1_000_000, 1_000_000 + 3 * 3_600_000)).toBe(1.5);
    expect(rainAccumMm(d, 'icon_seamless', 0, 1e12)).toBeNull();
  });
  it('rejects a response with no hourly block', () => {
    expect(() => parseWeather({}, 0)).toThrow();
  });
  it('asks for all three models at the region centre', () => {
    const u = weatherUrl();
    expect(u).toContain('models=gfs_seamless,ecmwf_ifs025,icon_seamless');
    expect(u).toContain('latitude=9.79');
  });
});
