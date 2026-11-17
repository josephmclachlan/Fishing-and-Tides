import { describe, expect, it } from 'vitest';
import { sliceAt, wheelGeom } from './wheel';

describe('activity wheel geometry', () => {
  const g = wheelGeom(412, 70, 9);
  it('fits a phone and hangs under the bar', () => {
    expect(g.cx).toBe(206);
    expect(g.cx - g.r1).toBeGreaterThanOrEqual(8);
    expect(g.r0).toBeLessThan(g.r1);
  });
  it('reads the slice under a thumb, east to west', () => {
    const at = (i: number) => {
      const a = g.a0 + ((i + 0.5) * (g.a1 - g.a0)) / g.n, r = (g.r0 + g.r1) / 2;
      return sliceAt(g.cx + r * Math.cos(a), g.cy + r * Math.sin(a), g);
    };
    for (let i = 0; i < 9; i++) expect(at(i)).toBe(i);
  });
  it('ignores the hub, the bar above and far off', () => {
    expect(sliceAt(g.cx, g.cy + 5, g)).toBeNull();
    expect(sliceAt(g.cx, g.cy - 40, g)).toBeNull();
    expect(sliceAt(g.cx, g.cy + g.r1 + 80, g)).toBeNull();
  });
  it('counts a small overshoot past the rim', () => {
    expect(sliceAt(g.cx, g.cy + g.r1 + 15, g)).toBe(4);
  });
});
