import { describe, expect, it } from 'vitest';
import { ratingStrip, rowSvg, rowsFor, skyKind, skyRow, timeAxis } from './charts';
import { FC_ACTIVITIES, type FcRead, type TimelineHour } from './model';

const H = 3.6e6;
const T0 = Date.UTC(2026, 10, 10, 6); // local midnight at UTC-6
const g = { px: 6, tzOffsetH: -6 };
const hour = (i: number, over: Partial<TimelineHour> = {}): TimelineHour => {
  const read: FcRead = { activity: 'surf', ms: T0 + i * H, score: 5, share: 0.5, level: 2, surf: { hb: 0.5 + 0.3 * Math.sin(i / 6), range: [0.4, 0.7], size: 'knee', band: 'FAIR', windKind: 'offshore', hs: 1, tp: 10, dir: 60, facing: 30, windKt: 8, windFromDeg: 240, tideKind: 'mid' } };
  return { ms: T0 + i * H, read, windKt: 8 + (i % 5), windFromDeg: 60, gustKt: 14, rainMmH: i % 7 ? 0 : 3, tideM: 0.2 * Math.sin((i / 12.42) * 2 * Math.PI), airC: 28, cloudPct: 20, squall: 0, rainPct: 10, feelsC: 31, humidityPct: 80, uv: (i % 24) >= 6 && (i % 24) < 18 ? 9 * Math.sin((((i % 24) - 6) / 12) * Math.PI) : 0, day: (i % 24) >= 6 && (i % 24) < 18, ...over };
};
const week = Array.from({ length: 168 }, (_, i) => hour(i));

describe('forecast charts (PLAN 7.52 part 2)', () => {
  it('draws every activity\'s rows on the shared axis without NaN', () => {
    for (const a of FC_ACTIVITIES)
      for (const r of rowsFor(a)) {
        const svg = rowSvg(r, week, g, [{ startMs: T0 + 6 * H, endMs: T0 + 8 * H }]);
        expect(svg).toContain(`width="${168 * 6}"`);
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      }
  });
  it('labels only each day\'s peak, not every bar', () => {
    const svg = rowSvg(rowsFor('surf')[0], week, g);
    expect((svg.match(/fc-c-val/g) ?? []).length).toBe(7);
  });
  it('labels the tide\'s highs and lows: about four a day', () => {
    const svg = rowSvg(rowsFor('surf').find((r) => r.id === 'tide')!, week, g);
    const n = (svg.match(/fc-c-val/g) ?? []).length;
    expect(n).toBeGreaterThanOrEqual(24);
    expect(n).toBeLessThanOrEqual(28);
  });
  it('shades the nights and highlights the best windows', () => {
    const svg = rowSvg(rowsFor('fish')[0], week, g, [{ startMs: T0 + 6 * H, endMs: T0 + 8 * H }]);
    expect((svg.match(/fc-c-night/g) ?? []).length).toBeGreaterThanOrEqual(7);
    expect(svg).toContain('class="fc-c-win" x="36" y="0" width="12"');
  });
  it('leaves gaps where there is no data, rather than zero bars', () => {
    const gaps = week.map((h, i) => (i < 24 ? { ...h, read: { ...h.read, score: null, level: null, surf: undefined } } : h));
    const svg = rowSvg(rowsFor('surf')[0], gaps, g);
    expect((svg.match(/fc-c-bar/g) ?? []).length).toBe(168 - 24);
    expect((ratingStrip(gaps, g).match(/fc-c-lv/g) ?? []).length).toBe(168 - 24);
  });
  it('names the days at midnight', () => {
    const svg = timeAxis(week, g, (_ms, i) => `D${i}`);
    for (let i = 0; i < 7; i++) expect(svg).toContain(`>D${i}<`);
  });
});

describe('UV row', () => {
  it('every activity shows UV, coloured by its WHO band, the day\'s peak labelled', () => {
    for (const a of FC_ACTIVITIES) expect(rowsFor(a).map((r) => r.id)).toContain('uv');
    const svg = rowSvg(rowsFor('fish').find((r) => r.id === 'uv')!, week, g);
    expect(svg).toContain('fc-c-bar l1'); // 8-10: very high
    expect(svg).toContain('fc-c-bar l4'); // 0-2: low
    expect(svg).toContain('>9<');
  });
});

describe('sky row (PLAN 7.52 part 3)', () => {
  const at = (o: Partial<TimelineHour>) => skyKind({ cloudPct: 20, rainMmH: 0, squall: 0, day: true, ...o });
  it('reads the sky from cloud, rain and squall risk, by day and night', () => {
    expect(at({})).toBe('sun');
    expect(at({ day: false })).toBe('moon');
    expect(at({ cloudPct: 50 })).toBe('partly-sun');
    expect(at({ cloudPct: 50, day: false })).toBe('partly-moon');
    expect(at({ cloudPct: 90 })).toBe('cloud');
    expect(at({ rainMmH: 2 })).toBe('rain');
    expect(at({ rainMmH: 2, squall: 1 })).toBe('storm');
    expect(at({ squall: 2 })).toBe('storm');
    expect(at({ cloudPct: null, rainMmH: null })).toBeNull();
  });
  it('draws one icon per 3 h, keeps the worst hour, and nothing before the weather loads', () => {
    expect((skyRow(week, g).match(/class="fc-i /g) ?? []).length).toBe(56);
    const stormy = week.map((h, i) => (i === 13 ? { ...h, rainMmH: 6, squall: 1 } : h));
    expect(skyRow(stormy, g)).toContain('fc-i-storm');
    expect(skyRow(week.map((h) => ({ ...h, cloudPct: null, rainMmH: null })), g)).not.toContain('fc-i ');
    expect(skyRow(week, g)).not.toMatch(/NaN|undefined/);
  });
  it('gives every activity the same weather rows, once each, after its own', () => {
    for (const a of FC_ACTIVITIES) {
      const ids = rowsFor(a).map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      const wx = rowsFor(a).filter((r) => r.wx).map((r) => r.id);
      expect(wx).toEqual(['air', 'feels', 'humidity', 'rainpct', 'rain', 'uv']);
      expect(ids.slice(-wx.length)).toEqual(wx);
    }
  });
});
