import { describe, expect, it } from 'vitest';
import { parseSpotWind, spotWindAt, spotWindPoint, spotWindUrl } from './spot-wind';
import { SPOTS } from '../region';

const t0 = 1_800_000_000;
const pts = [{ name: 'A', lngLat: [-82.75, 9.66] as [number, number] }, { name: 'B', lngLat: [-82.6, 9.6] as [number, number] }];
const block = (ecmwf: [number, number], gfs: [number, number]) => ({
  hourly: {
    time: [t0, t0 + 3600],
    wind_speed_10m_ecmwf_ifs: [ecmwf[0], null], wind_direction_10m_ecmwf_ifs: [ecmwf[1], null],
    wind_speed_10m_gfs_seamless: [gfs[0], gfs[0]], wind_direction_10m_gfs_seamless: [gfs[1], gfs[1]],
  },
});

describe('spot wind (PLAN 7.58a)', () => {
  const d = parseSpotWind([block([6, 90], [4, 90]), block([5, 350], [5, 10])], 0, false, pts);
  it('asks for the sea cell in front of every spot with the four models', () => {
    const u = spotWindUrl();
    expect(u).toContain('cell_selection=sea');
    expect(u).toContain('models=ecmwf_ifs,ukmo_global_deterministic_10km,icon_seamless,gfs_seamless');
    expect(u).toContain(`latitude=${SPOTS.map((s) => s.sea[1]).join(',')}`);
  });
  it('reads only near a spot', () => {
    expect(spotWindPoint(d, -82.751, 9.661)!.name).toBe('A');
    expect(spotWindPoint(d, -82.4, 9.9)).toBeNull();
    expect(spotWindAt(d, -82.4, 9.9, t0 * 1000)).toBeNull();
  });
  it('averages speeds and takes the mean vector\'s direction', () => {
    const a = spotWindAt(d, -82.75, 9.66, t0 * 1000)!;
    expect(a.speedMs).toBeCloseTo(5, 6);
    expect(a.fromDeg).toBeCloseTo(90, 6);
    // From the east, so it travels west: negative east component.
    expect(a.vec[0]).toBeCloseTo(-5, 6);
    expect(a.vec[1]).toBeCloseTo(0, 6);
    // 350° and 10° average to north, not to 180°.
    const b = spotWindAt(d, -82.6, 9.6, t0 * 1000)!;
    expect(Math.min(b.fromDeg, 360 - b.fromDeg)).toBeLessThan(1e-6);
    expect(b.speedMs).toBeCloseTo(5, 6);
  });
  it('weights the models and drops ones without the hour', () => {
    const w = spotWindAt(d, -82.75, 9.66, t0 * 1000, { ecmwf_ifs: 0.75, gfs_seamless: 0.25 })!;
    expect(w.speedMs).toBeCloseTo(5.5, 6);
    const later = spotWindAt(d, -82.75, 9.66, t0 * 1000 + 3.6e6 + 10)!;
    expect(later.models).toBe(1);
    expect(later.speedMs).toBe(4);
  });
  it('rejects the wrong number of points', () => {
    expect(() => parseSpotWind([block([1, 1], [1, 1])], 0, false, pts)).toThrow();
  });
});
