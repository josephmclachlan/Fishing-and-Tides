import { describe, expect, it } from 'vitest';
import { cardsHtml, circle, tableHtml } from './watch-panel';
import type { WatchForecast } from './metrics/forecast';
import { haversineM } from './geo';

const f: WatchForecast = {
  startMs: Date.UTC(2026, 10, 4, 6), days: 2, spots: ['CAHUITA'], bestDay: 0,
  rows: [{ id: 'swell', unit: 'm', decimals: 1, hourly: [1, 1.2, 1.4], days: [{ dayMs: Date.UTC(2026, 10, 4, 6), value: 1.2, tone: 'green', spot: 'CAHUITA' }, { dayMs: Date.UTC(2026, 10, 5, 6), value: null, tone: 'none', spot: null }] }],
};

describe('watch popup views', () => {
  it('draws a card per metric with the best spot and every day', () => {
    const h = cardsHtml(f);
    expect(h).toContain('SWELL');
    expect(h).toContain('CAHUITA');
    expect(h).toContain('1.2');
    expect(h).toContain('--');
  });
  it('draws a table with a row per metric and a column per day', () => {
    const h = tableHtml(f);
    expect(h.match(/<tr>/g)).toHaveLength(2);
    expect(h.match(/<td/g)).toHaveLength(2);
  });
  it('escapes spot names', () => {
    expect(cardsHtml({ ...f, rows: [{ ...f.rows[0], days: [{ ...f.rows[0].days[0], spot: '<b>' }, f.rows[0].days[1]] }] })).toContain('AT &lt;b&gt;');
  });
});

describe('circle', () => {
  it('is closed and about the radius from its centre', () => {
    const c = circle([-82.7, 9.65], 10);
    expect(c[0]).toEqual(c[c.length - 1]);
    for (const p of c) expect(haversineM([-82.7, 9.65], p) / 1000).toBeGreaterThan(9.8), expect(haversineM([-82.7, 9.65], p) / 1000).toBeLessThan(10.2);
  });
});
