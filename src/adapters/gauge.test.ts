import { describe, expect, it } from 'vitest';
import { gaugeChecks, latest, parseIoc, type GaugeData } from './gauge';
import { runChecks } from '../verify/types';
import { predict } from '../physics/tide';
import { LIMON_HARMONICS } from '../data/tides-limon';

const stime = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

describe('parseIoc', () => {
  it('keeps one sensor, puts it on MSL, sorts, and attaches the prediction', () => {
    const t = Date.UTC(2026, 10, 2, 12);
    const rows = [
      { slevel: 6.7, stime: stime(t + 60e3), sensor: 'rad' },
      { slevel: 6.65, stime: stime(t), sensor: 'rad' },
      { slevel: 1.6, stime: stime(t), sensor: 'prs' },
      { slevel: 'x', stime: stime(t), sensor: 'rad' },
    ];
    const r = parseIoc(rows, 'rad', 6.6);
    expect(r).toHaveLength(2);
    expect(r[0].t).toBe(t);
    expect(r[0].levelM).toBeCloseTo(0.05);
    expect(r[0].tideM).toBeCloseTo(predict(LIMON_HARMONICS, t));
    expect(() => parseIoc({})).toThrow();
  });
});

describe('gauge checks', () => {
  const now = Date.now();
  const readings = [...Array(24 * 6)].map((_, i) => {
    const t = now - (24 * 6 - i) * 10 * 60e3;
    const tideM = predict(LIMON_HARMONICS, t);
    return { t, tideM, levelM: tideM + 0.1 + 0.01 * Math.sin(i) };
  });
  const d: GaugeData = { readings, fetchedAt: now, fromCache: false };
  it('passes a gauge that follows the tide with a modest offset', async () => {
    const r = await runChecks(gaugeChecks(async () => d));
    expect(r.map((x) => x.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass']);
    expect(latest(d)!.residualM).toBeCloseTo(0.1, 1);
  });
  it('flags a datum jump and an empty feed', async () => {
    const jumped = { ...d, readings: readings.map((r) => ({ ...r, levelM: r.levelM + 0.5 })) };
    expect((await runChecks(gaugeChecks(async () => jumped)))[4].status).toBe('fail');
    const empty = await runChecks(gaugeChecks(async () => ({ ...d, readings: [] })));
    expect(empty.every((x) => x.status === 'fail')).toBe(true);
  });
});
