import { describe, expect, it } from 'vitest';
import { catchmentRainUrl, memberMean, parseCatchmentRain, rainImergChecks, rainPoints, withSatellite, type CatchmentRain } from './catchment-rain';
import { PLUME_RIVERS } from '../region';
import { mudAt } from '../layers/clarity';
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

describe('model members (PLAN 7.58b)', () => {
  const pts = rainPoints();
  // Open-Meteo stamps rain at the hour's end, so values sit one place later than the hour they belong to.
  const body = pts.map(() => ({ hourly: { time: [0, 3600, 7200], precipitation_ecmwf_ifs: [null, 4, 0], precipitation_gfs_seamless: [null, 0, null] } }));
  it('keeps each model as a member and averages them for the readouts', () => {
    const d = parseCatchmentRain(body, 0);
    expect(catchmentRainUrl()).toContain('models=ecmwf_ifs,ukmo_global_deterministic_10km,icon_seamless,gfs_seamless');
    const r = PLUME_RIVERS[0].name;
    expect(d.members![r]).toHaveLength(2);
    expect(d.byRiver[r][0]).toBe(2);
    // GFS has no hour 1: the mean is ECMWF's alone.
    expect(d.byRiver[r][1]).toBe(0);
    expect(memberMean([[1, NaN], [3, NaN]], 2)).toEqual([2, NaN]);
  });
  it('gives every member the satellite past', () => {
    const d: CatchmentRain = { ...model(), members: { A: [[1, 1, 1, 1], [5, 5, 5, 5]], B: [[2, 2, 2, 2]] } };
    const r = withSatellite(d, { times: [t0, t0 + 1800e3], byRiver: { A: [9, 9], B: [null, null] } });
    expect(r.members!.A.map((m) => m[0])).toEqual([9, 9]);
    expect(r.members!.A.map((m) => m[1])).toEqual([1, 5]);
  });
  it('runs each model through the runoff on its own, so one model\'s burst is not averaged flat', () => {
    const n = 48;
    const burst = Array.from({ length: n }, (_, i) => (i >= 6 && i < 9 ? 20 : 0));
    const dry = Array.from({ length: n }, () => 0);
    const times = Array.from({ length: n }, (_, i) => t0 + i * H);
    const r = PLUME_RIVERS[0];
    const split: CatchmentRain = { times, byRiver: { [r.name]: burst.map((x) => x / 2) }, members: { [r.name]: [burst, dry] }, fetchedAt: t0, fromCache: false };
    const meanRain: CatchmentRain = { times, byRiver: { [r.name]: burst.map((x) => x / 2) }, fetchedAt: t0, fromCache: false };
    const at = t0 + 20 * H;
    expect(mudAt(split, r.name, r.catchmentKm2, at).strength).toBeGreaterThan(mudAt(meanRain, r.name, r.catchmentKm2, at).strength);
  });
});
