import { describe, expect, it } from 'vitest';
import { SPOTS } from '../region';
import { createPhysicsClient } from './client';
import { land, macro, realDepth, region } from './fixtures/seafloor';
import { createSpotModel } from './spot-model';
import { spotWaves } from './surf-zone';

const cahuita = SPOTS.find((s) => s.name === 'CAHUITA')!.lngLat;
const sea = { Hs: 1.4, Tp: 11, fromDeg: 40 };

describe('spot model', () => {
  it('matches the uncached physics and caches refraction', () => {
    const m = createSpotModel(realDepth, { fanStepDeg: 1 });
    const r = m.spot({ pin: cahuita, sea, tideLevel: 0.5 })!;
    const direct = spotWaves(realDepth, cahuita, sea, { fanStepDeg: 1 })!;
    expect(r.waves.breaker.Hb).toBeCloseTo(direct.breaker.Hb, 9);
    expect(m.cacheSize()).toBe(1);
    // Height, tide and wind changes reuse the refraction.
    const t0 = performance.now();
    const big = m.spot({ pin: cahuita, sea: { ...sea, Hs: 2.5 }, tideLevel: 0, wind: { speedMs: 9, fromDeg: 40 } })!;
    expect(performance.now() - t0).toBeLessThan(20);
    expect(m.cacheSize()).toBe(1);
    expect(big.waves.breaker.Hb).toBeGreaterThan(r.waves.breaker.Hb);
    expect(big.rip.score).toBeGreaterThan(r.rip.score);
    // A new direction is a new ray fan.
    m.spot({ pin: cahuita, sea: { ...sea, fromDeg: 80 }, tideLevel: 0.5 });
    expect(m.cacheSize()).toBe(2);
  });

  it('adds the other trains to the breaker height the rip reads (audit G)', () => {
    const m = createSpotModel(realDepth, { fanStepDeg: 1 });
    const one = m.spot({ pin: cahuita, sea, tideLevel: 0.5 })!;
    expect(one.HbAll).toBeCloseTo(one.waves.breaker.Hb, 12);
    const two = m.spot({ pin: cahuita, sea, tideLevel: 0.5, others: [{ Hs: 0.8, Tp: 5, fromDeg: 60 }] })!;
    expect(two.waves.breaker.Hb).toBeCloseTo(one.waves.breaker.Hb, 12);
    expect(two.HbAll).toBeGreaterThan(one.HbAll);
    expect(two.HbAll).toBeLessThan(one.HbAll + 0.8);
    expect(two.rip.score).toBeGreaterThanOrEqual(one.rip.score);
  });

  it('returns null inland', () => {
    const m = createSpotModel(() => 0);
    expect(m.spot({ pin: cahuita, sea, tideLevel: 0.5 })).toBeNull();
  });
});

describe('physics client (in-thread fallback without Worker)', () => {
  it('answers spot requests and coalesces a burst to the newest', async () => {
    const c = createPhysicsClient({ region, macro, land });
    const first = c.latest({ pin: cahuita, sea, tideLevel: 0.5 });
    const mid = c.latest({ pin: cahuita, sea: { ...sea, Hs: 1 }, tideLevel: 0.5 });
    const last = c.latest({ pin: cahuita, sea: { ...sea, Hs: 2 }, tideLevel: 0.5 });
    const [a, b, d] = await Promise.all([first, mid, last]);
    expect(a!.waves.breaker.Hb).toBeGreaterThan(0);
    // The skipped middle request resolves with the newest answer.
    expect(b!.waves.breaker.Hb).toBe(d!.waves.breaker.Hb);
    expect(d!.waves.breaker.Hb).toBeGreaterThan(a!.waves.breaker.Hb);
    c.dispose();
  }, 20_000);
});
