import { describe, expect, it } from 'vitest';
import { destination, paddleFeatures, pushArrow, pushKm, rangeArc } from './paddle-geo';

const AT: [number, number] = [-82.7368, 9.6507];
const km = (a: readonly [number, number], b: readonly [number, number]) => {
  const dx = (b[0] - a[0]) * 111.32 * Math.cos((a[1] * Math.PI) / 180), dy = (b[1] - a[1]) * 110.574;
  return Math.hypot(dx, dy);
};

describe('paddle map geometry', () => {
  it('destination is the right distance and direction', () => {
    const p = destination(AT, 90, 3);
    expect(km(AT, p)).toBeCloseTo(3, 1);
    expect(p[0]).toBeGreaterThan(AT[0]);
    expect(Math.abs(p[1] - AT[1])).toBeLessThan(1e-3);
  });
  it('the range arc lies on the seaward side, at the range, and closes', () => {
    const ring = rangeArc(AT, 38, 3);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const p of ring.slice(1, -1)) expect(km(AT, p)).toBeCloseTo(3, 1);
    const mid = ring[Math.floor(ring.length / 2)];
    expect(km(mid, destination(AT, 38, 3))).toBeLessThan(0.2);
  });
  it('the push arrow grows with the wind and its head points the way it blows', () => {
    expect(pushKm(15)).toBeGreaterThan(pushKm(5));
    const a = pushArrow(AT, 0, 2);
    expect(a.head[0][1]).toBeGreaterThan(a.shaft[1][1]);
  });
  it('marks: no range when told to stay home, no arrow when calm, red arrow only offshore', () => {
    const base = { id: 'a', lngLat: AT, facing: 38, rangeKm: 0, towardDeg: 218, effKt: 10, offshore: true, col: '#f00', danger: '#d00', ink: '#000' };
    const f = paddleFeatures([base]);
    expect(f.some((x) => x.properties.kind === 'range')).toBe(false);
    expect(f.find((x) => x.properties.kind === 'push')?.properties.col).toBe('#d00');
    expect(paddleFeatures([{ ...base, effKt: 2 }]).some((x) => x.properties.kind === 'push')).toBe(false);
    expect(paddleFeatures([{ ...base, rangeKm: 3, offshore: false }]).find((x) => x.properties.kind === 'push')?.properties.col).toBe('#000');
  });
});
