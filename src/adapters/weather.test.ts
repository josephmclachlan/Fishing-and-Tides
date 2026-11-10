import { describe, expect, it } from 'vitest';
import { parseWeather, pointNear, rainAccumMm, toHourStart, weatherAt, weatherUrl } from './weather';
import { SPOTS } from '../region';

const t0 = 1000;
// Open-Meteo stamps rain at the end of its hour: the 2 at t0+1h fell in the hour starting t0.
const hourly = (wet: number) => ({
  time: [t0, t0 + 3600, t0 + 7200, t0 + 10800],
  precipitation_gfs_seamless: [0, 1 * wet, 2 * wet, 3 * wet],
  precipitation_probability_gfs_seamless: [0, 40, 60, 80],
  cloud_cover_gfs_seamless: [10, 20, 30, 40],
  uv_index_gfs_seamless: [0, 5, 9, 4],
  temperature_2m_gfs_seamless: [25, 26, 27, 27],
  dew_point_2m_gfs_seamless: [23, 23, 24, 24],
  precipitation_ecmwf_ifs: [0, 0.5, null, 1],
  cloud_cover_ecmwf_ifs: [10, 10, null, 30],
  uv_index_ecmwf_ifs: [null, null, null, null],
  temperature_2m_ecmwf_ifs: [24, null, null, 26],
});
const pts = [{ name: 'A', lngLat: [-82.85, 9.74] as [number, number] }, { name: 'B', lngLat: [-82.6, 9.6] as [number, number] }];

describe('weather', () => {
  const d = parseWeather([{ hourly: hourly(1) }, { hourly: hourly(10) }], 5, false, pts);
  it('parses one point per spot and leaves absent models out', () => {
    expect(d.points.map((p) => p.name)).toEqual(['A', 'B']);
    expect(Object.keys(d.points[0].models).sort()).toEqual(['ecmwf_ifs', 'gfs_seamless']);
    expect(d.times[0]).toBe(1_000_000);
    expect(Number.isNaN(d.points[0].models.ecmwf_ifs!.uv_index[0])).toBe(true);
  });
  it('moves rain and its chance to the hour they fell in', () => {
    expect(toHourStart([0, 1, 2])).toEqual([1, 2, NaN]);
    const g = d.points[0].models.gfs_seamless!;
    expect(g.precipitation.slice(0, 3)).toEqual([1, 2, 3]);
    expect(g.precipitation_probability[0]).toBe(40);
    // Instant values stay where they are.
    expect(g.temperature_2m[0]).toBe(25);
  });
  it('reads the spot nearest the place asked', () => {
    expect(pointNear(d, [-82.62, 9.61])!.name).toBe('B');
    expect(weatherAt(d, 1_000_000 + 10, [-82.62, 9.61]).find((w) => w.model === 'gfs_seamless')!.rainMmH).toBe(10);
    expect(weatherAt(d, 1_000_000 + 10, [-82.84, 9.74]).find((w) => w.model === 'gfs_seamless')!.rainMmH).toBe(1);
  });
  it('reads every model that has the hour, with dew point and chance of rain', () => {
    const now = weatherAt(d, 1_000_000 + 10, pts[0].lngLat);
    expect(now.map((w) => w.model)).toEqual(['ecmwf_ifs', 'gfs_seamless']);
    expect(now[1].dewC).toBe(23);
    expect(now[1].rainChancePct).toBe(40);
    expect(weatherAt(d, 1_000_000 + 3_600_000 + 10, pts[0].lngLat).map((w) => w.model)).toEqual(['gfs_seamless']);
    expect(weatherAt(d, 0)).toEqual([]);
  });
  it('sums rain over a window, ignoring missing hours', () => {
    expect(rainAccumMm(d, 'gfs_seamless', 1_000_000, 1_000_000 + 3 * 3_600_000, pts[0].lngLat)).toBe(6);
    expect(rainAccumMm(d, 'ecmwf_ifs', 1_000_000, 1_000_000 + 3 * 3_600_000, pts[0].lngLat)).toBe(1.5);
    expect(rainAccumMm(d, 'icon_seamless', 0, 1e12)).toBeNull();
  });
  it('rejects a response with no hourly block', () => {
    expect(() => parseWeather({}, 0)).toThrow();
  });
  it('asks for the four models at every spot', () => {
    const u = weatherUrl();
    expect(u).toContain('models=ecmwf_ifs,ukmo_global_deterministic_10km,icon_seamless,gfs_seamless');
    expect(u).toContain('dew_point_2m');
    expect(u).toContain('precipitation_probability');
    // A day back, so the creek mouths can read the last 6 h of rain at any hour (PLAN 7.63).
    expect(u).toContain('past_days=1');
    expect(u.split('latitude=')[1].split('&')[0].split(',')).toHaveLength(SPOTS.length);
  });
});
