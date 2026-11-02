import { describe, expect, it } from 'vitest';
import { MAX_ACC_M, MIN_GAP_MS, recentSpeedKt, shouldKeep, thin, toGPX, trackStats, type Pin, type TrackPoint } from './track';

const p = (t: number, lng: number, lat: number, acc?: number): TrackPoint => ({ t, lng, lat, acc });

describe('shouldKeep', () => {
  const a = p(0, -82.8, 9.74);
  it('keeps the first fix unless it is inaccurate', () => {
    expect(shouldKeep(undefined, p(0, 0, 0))).toBe(true);
    expect(shouldKeep(undefined, p(0, 0, 0, MAX_ACC_M + 1))).toBe(false);
  });
  it('drops fixes that barely moved, keeps moves and long gaps', () => {
    expect(shouldKeep(a, p(5_000, -82.8, 9.74001))).toBe(false); // ~1 m
    expect(shouldKeep(a, p(5_000, -82.8, 9.7402))).toBe(true); // ~22 m
    expect(shouldKeep(a, p(MIN_GAP_MS, -82.8, 9.74001))).toBe(true); // time
  });
  it('drops fixes that are not newer', () => {
    expect(shouldKeep(p(10, 0, 0), p(10, 1, 1))).toBe(false);
  });
});

describe('stats', () => {
  const line = [p(0, 0, 0), p(60_000, 0, 1852 / 110574), p(120_000, 0, (2 * 1852) / 110574)];
  it('sums distance and duration', () => {
    const s = trackStats(line);
    expect(s.distanceM).toBeGreaterThan(3600);
    expect(s.distanceM).toBeLessThan(3800);
    expect(s.durationMs).toBe(120_000);
    expect(trackStats([])).toEqual({ distanceM: 0, durationMs: 0 });
  });
  it('speed over the last minute is about 60 kt for 1 NM a minute', () => {
    expect(recentSpeedKt(line, 60_000, 130_000)).toBeCloseTo(60, -1);
    expect(recentSpeedKt(line, 60_000, 400_000)).toBeNull(); // stale
    expect(recentSpeedKt([p(0, 0, 0)])).toBeNull();
  });
});

describe('thin', () => {
  it('leaves short tracks alone and halves the old part of long ones', () => {
    const pts = Array.from({ length: 100 }, (_, i) => p(i, 0, i / 1e5));
    expect(thin(pts, 200)).toBe(pts);
    const t = thin(pts, 50);
    expect(t).toHaveLength(25 + 50);
    expect(t.at(-1)).toBe(pts.at(-1));
  });
});

describe('GPX', () => {
  it('writes track points and escaped waypoints', () => {
    const pins: Pin[] = [{ id: 'x', t: 0, lng: -82.7, lat: 9.7, kind: 'catch', species: 'mahi & co', depthM: 120 }];
    const g = toGPX([p(0, -82.8, 9.74)], pins, 'Trip <1>');
    expect(g).toContain('<trkpt lat="9.740000" lon="-82.800000">');
    expect(g).toContain('<name>CATCH mahi &amp; co</name>');
    expect(g).toContain('Trip &lt;1&gt;');
    expect(g).toContain('depth 120 m');
  });
});
