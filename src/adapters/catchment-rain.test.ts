import { describe, expect, it } from 'vitest';
import { rainImergChecks, withSatellite, type CatchmentRain } from './catchment-rain';
import type { RainImerg } from './imerg-parse';

const H = 3.6e6;
const t0 = Date.UTC(2026, 10, 10);
const model = (): CatchmentRain => ({ times: [0, 1, 2, 3].map((k) => t0 + k * H), byRiver: { A: [1, 1, 1, 1], B: [2, 2, 2, 2] }, fetchedAt: t0, fromCache: false });

describe('withSatellite', () => {
  it('uses the satellite for the whole hours it has and the model for the rest', () => {
    // Hour 0 complete, hour 1 complete for A only, hour 2 half.
    const sat = { times: [0, 1, 2, 3, 4].map((k) => t0 + k * 1800e3), byRiver: { A: [6, 8, 0, 0, 5], B: [3, 3, null, 4, null] } };
    const r = withSatellite(model(), sat);
    expect(r.byRiver.A).toEqual([7, 0, 1, 1]);
    expect(r.byRiver.B).toEqual([3, 2, 2, 2]);
    expect(r.satHours).toEqual({ A: 2, B: 1 });
    expect(r.satUntil).toBe(t0 + 2 * H);
  });

  it('is the model alone without satellite hours', () => {
    const m = model();
    expect(withSatellite(m, null)).toBe(m);
    expect(withSatellite(m, { times: [t0 - 5 * H], byRiver: { A: [9] } })).toBe(m);
  });
});

describe('rainImergChecks', () => {
  const feed = (fetchedAgoH: number, newestAgoH: number, x: number | null = 0.4): RainImerg => ({
    feed: 'rain-imerg', fetchedAt: new Date(Date.now() - fetchedAgoH * H).toISOString(), source: { id: 'x', name: 'x' }, licence: '', cells: { A: 1 },
    times: [Date.now() - newestAgoH * H - 1800e3], byRiver: { A: [x] },
  });

  it('passes a fresh, physical feed', async () => {
    const r = await Promise.all(rainImergChecks(async () => feed(0.5, 5)).map((c) => c.run()));
    expect(r.map((o) => o.status)).toEqual(['pass', 'pass', 'pass']);
  });

  it('flags a stalled satellite and impossible rates', async () => {
    const r = await Promise.all(rainImergChecks(async () => feed(0.5, 20, 400)).map((c) => c.run()));
    expect(r.map((o) => o.status)).toEqual(['pass', 'fail', 'fail']);
  });
});
