import { describe, expect, it } from 'vitest';
import { mudFromTable, mudQuery, mudNow, mudChecks, type MudData, type MudHistory, type MudLoaded } from './mud';
import { CORAL_REEFS } from '../region';

const DAY = 864e5;
const reefs = [{ id: 'a', kdPixel: [-82.822914, 9.739583] as [number, number] }, { id: 'b', kdPixel: [-82.65625, 9.635411] as [number, number] }];

describe('MUD WEEKS feed', () => {
  it('picks each reef pixel out of a griddap table, dropping fill and out-of-range values', () => {
    const table = {
      columnNames: ['time', 'altitude', 'latitude', 'longitude', 'kd_490'],
      rows: [
        ['2026-10-02T12:00:00Z', 0, 9.739583, -82.822914, 0.5],
        ['2026-10-01T12:00:00Z', 0, 9.739583, -82.822914, 0.31234],
        ['2026-10-01T12:00:00Z', 0, 9.635411, -82.65625, 6.5534],
        ['2026-10-02T12:00:00Z', 0, 9.635411, -82.65625, 0.2],
        ['2026-10-02T12:00:00Z', 0, 9.7, -82.7, 0.9],
      ],
    };
    const d = mudFromTable(table, reefs, 'x', 'lic');
    expect(d.days).toEqual([Date.UTC(2026, 9, 1, 12), Date.UTC(2026, 9, 2, 12)]);
    expect(d.reefs.map((r) => r.kd)).toEqual([[0.3123, 0.5], [null, 0.2]]);
    expect(() => mudFromTable({ columnNames: ['time'], rows: [] }, reefs, '', '')).toThrow();
  });
  it('queries a box around all reef pixels, north to south', () => {
    const u = decodeURIComponent(mudQuery(CORAL_REEFS, 'last-89:1:last'));
    expect(u).toContain('kd_490[last-89:1:last][0][(10.0016):1:(9.6234)][(-83.0224):1:(-82.6026)]');
  });
  it('scores the newest day against the history baseline, else the feed itself', () => {
    const days = Array.from({ length: 90 }, (_, i) => i * DAY);
    const d: MudData = { fetchedAt: 'x', days, licence: '', reefs: [{ id: 'a', pixel: [0, 0], kd: days.map((_, i) => (i >= 60 ? 1.5 : 0.25)) }] };
    const h: MudHistory = { fetchedAt: '', from: '', to: '', years: [2026], method: '', licence: '', reefs: [{ id: 'a', pixel: [0, 0], baselineKd: 0.2, peak: [1], peakDay: [null] }] };
    const withH = mudNow(d, h, 'a', 4);
    // 30 days at ΔKd 1.3/m over 4 m: 99.4% of the light lost each day → 30·0.9945/7.
    expect(withH.mw).toBeCloseTo((30 * (1 - Math.exp(-1.3 * 4))) / 7, 6);
    expect(withH).toMatchObject({ level: 'high', baseKd: 0.2, kd: 1.5, fromHistory: true, day: 89 * DAY });
    expect(withH.trend).toHaveLength(90);
    const noH = mudNow(d, null, 'a', 4);
    expect(noH.fromHistory).toBe(false);
    expect(noH.baseKd).toBe(0.25);
    expect(mudNow(d, h, 'nope').level).toBe('none');
    expect(mudNow(null, h, 'a').mw).toBeNaN();
  });
  it('checks flag thin series and pass a healthy feed', async () => {
    const days = Array.from({ length: 90 }, (_, i) => Date.now() - (99 - i) * DAY);
    const d: MudLoaded = { fetchedAt: new Date().toISOString(), days, licence: '', fromCache: false, reefs: [{ id: 'a', pixel: [0, 0], kd: days.map(() => 0.3) }, { id: 'b', pixel: [0, 0], kd: days.map((_, i) => (i < 10 ? 0.3 : null)) }] };
    const out = await Promise.all(mudChecks(async () => d).map((c) => c.run()));
    expect(out.map((o) => o.status)).toEqual(['warn', 'pass', 'pass', 'pass']);
  });
});
