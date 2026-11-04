import { describe, expect, it } from 'vitest';
import { OFFSHORE, offshoreScore, termFits } from './offshore';

const sp = (id: string) => OFFSHORE.find((s) => s.id === id)!;

describe('offshore scoring (PLAN 7.17)', () => {
  it('needs depth and is zero outside the species range', () => {
    expect(offshoreScore(sp('mahi'), {})).toBeNull();
    expect(offshoreScore(sp('mahi'), { depthM: 10 })).toBe(0);
    expect(offshoreScore(sp('kingfish'), { depthM: 500 })).toBe(0);
  });
  it('mahi likes fronts and weed lines', () => {
    const blue = { depthM: 800, sstC: 28, chl: 0.2 };
    const near = offshoreScore(sp('mahi'), { ...blue, frontKm: 1, weedKm: 0.5 })!;
    const far = offshoreScore(sp('mahi'), { ...blue, frontKm: 30, weedKm: 30 })!;
    expect(near).toBeGreaterThan(0.9);
    expect(far).toBeLessThan(0.5);
  });
  it('silk snapper only cares about depth and ledges', () => {
    expect(offshoreScore(sp('silksnapper'), { depthM: 150, slopeMPerKm: 60, sstC: 10 })).toBeCloseTo(1);
    expect(offshoreScore(sp('silksnapper'), { depthM: 150, slopeMPerKm: 0 })).toBe(0);
    expect(offshoreScore(sp('silksnapper'), { depthM: 40, slopeMPerKm: 60 })).toBe(0);
  });
  it('fits are 0..1 and absent when unknown', () => {
    const f = termFits(sp('tuna'), { sstC: 35, frontKm: 0 });
    expect(f.temp).toBeCloseTo(0.3);
    expect(f.front).toBe(1);
    expect(f.chl).toBeUndefined();
  });
});
