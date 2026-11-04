import { describe, expect, it } from 'vitest';
import { flowRatio, parseRiverFlow, riverFlowChecks, riverFlowUrl } from './river-flow';
import { PLUME_RIVERS } from '../region';

const DAY0 = Date.UTC(2026, 10, 1) / 1000;
const point = (q: (number | null)[], median: (number | null)[]) => ({ daily: { time: q.map((_, i) => DAY0 + i * 86400), river_discharge: q, river_discharge_median: median } });
const sample = () => PLUME_RIVERS.map((_, k) => point([10 * (k + 1), 30 * (k + 1), null], [10 * (k + 1), 10 * (k + 1), 10]));

describe('river flow (PLAN 7.15)', () => {
  it('asks for every mouth in one call', () => {
    const u = riverFlowUrl();
    expect(u).toContain('flood-api.open-meteo.com');
    expect(u.split('latitude=')[1].split('&')[0].split(',')).toHaveLength(PLUME_RIVERS.length);
  });
  it('parses per river and gives the ratio to the median', () => {
    const d = parseRiverFlow(sample(), 1);
    const r = PLUME_RIVERS[0].name;
    expect(d.times[0]).toBe(DAY0 * 1000);
    expect(flowRatio(d, r, DAY0 * 1000 + 3.6e6)).toBe(1);
    expect(flowRatio(d, r, DAY0 * 1000 + 864e5 + 1)).toBe(3);
    expect(flowRatio(d, r, DAY0 * 1000 + 2 * 864e5)).toBeNull(); // missing flow
    expect(flowRatio(d, r, DAY0 * 1000 - 1)).toBeNull();
    expect(flowRatio(d, 'NOPE', DAY0 * 1000)).toBeNull();
  });
  it('rejects a short answer', () => {
    expect(() => parseRiverFlow([point([1], [1])], 1)).toThrow();
  });
  it('checks pass on sane data and flag a river with no median', async () => {
    const good = riverFlowChecks(async () => parseRiverFlow(sample(), 1));
    for (const c of good) expect((await c.run()).status).toBe('pass');
    const bad = sample();
    bad[0] = point([5, 5, 5], [null, null, null]);
    expect((await riverFlowChecks(async () => parseRiverFlow(bad, 1))[0].run()).status).toBe('warn');
  });
});
