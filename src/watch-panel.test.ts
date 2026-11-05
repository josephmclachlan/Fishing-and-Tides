import { describe, expect, it } from 'vitest';
import { alikeText, bestText, cardsHtml, circle, planHtml, tableHtml } from './watch-panel';
import type { Plan } from './metrics/plan';
import type { WatchForecast } from './metrics/forecast';
import { haversineM } from './geo';

const f: WatchForecast = {
  startMs: Date.UTC(2026, 10, 4, 6), days: 2, spots: ['CAHUITA'],
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

const plan: Plan = {
  activity: 'surf', startMs: Date.UTC(2026, 10, 4, 6), bestDay: 1, alike: [], none: null,
  days: [
    { day: 0, dayMs: Date.UTC(2026, 10, 4, 6), spot: 'PLAYA COCLES', startMs: Date.UTC(2026, 10, 4, 15), endMs: Date.UTC(2026, 10, 4, 17), value: 2.4, tone: 'red', good: false, rank: -0.9 },
    { day: 1, dayMs: Date.UTC(2026, 10, 5, 6), spot: 'SALSA BRAVA', startMs: Date.UTC(2026, 10, 5, 12), endMs: Date.UTC(2026, 10, 5, 14), value: 7.1, tone: 'green', good: true, rank: 1.36 },
    null,
  ],
};

describe('bestText', () => {
  it('names the activity, the best day, its two local hours and the spot', () => {
    expect(bestText(plan)).toEqual({ text: 'BEST DAY FOR SURF: THU · 06:00–08:00 · SALSA BRAVA', good: true });
  });
  it('says why there is no best day', () => {
    expect(bestText({ ...plan, bestDay: null, none: 'poor' }).text).toBe('BEST DAY FOR SURF: NO GOOD WINDOW IN THE NEXT 5 DAYS');
    expect(bestText({ ...plan, bestDay: null, none: 'nospot' }).text).toBe('BEST DAY FOR SURF: NO SURF BREAK IN THIS REGION');
    expect(bestText({ ...plan, activity: 'snorkel', bestDay: null, none: 'nospot' }).text).toBe('BEST DAY FOR SNORKEL: NO SNORKEL OR DIVE SPOT IN THIS REGION');
    expect(bestText({ ...plan, bestDay: null, none: 'nodata' })).toEqual({ text: 'BEST DAY FOR SURF: NO DATA YET', good: false });
  });
});

describe('planHtml', () => {
  it("shows the activity's score for each day, marks the best one and says what is scored", () => {
    const h = planHtml(plan);
    expect(h).toContain('WED<b>2.4</b>');
    expect(h).toContain('class="green wt-top"');
    expect(h).toContain('THU<b>7.1</b>');
    expect(h).toContain('FRI<b>--</b>');
    expect(h).toContain('SURF SCORE /10');
    expect(h).not.toContain('ABOUT AS GOOD');
  });
  it('lists the days about as good as the best one', () => {
    const p: Plan = { ...plan, days: [{ ...plan.days[1]!, day: 0, dayMs: plan.startMs }, plan.days[1], null], alike: [0] };
    expect(alikeText(p)).toBe('WED: ABOUT AS GOOD');
    expect(planHtml(p)).toContain('class="green wt-alike"');
  });
});
