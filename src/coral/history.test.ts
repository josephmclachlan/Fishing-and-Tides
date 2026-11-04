import { describe, expect, it } from 'vitest';
import { peakFor, yearPeaks, type CoralHistory } from './history';

describe('coral heat history', () => {
  it('keeps each reef pixel’s highest DHW of the year and its day', () => {
    const table = { columnNames: ['time', 'latitude', 'longitude', 'degree_heating_week'], rows: [
      ['2023-08-01T12:00:00Z', 9.725, -82.825, 4.2], ['2023-11-19T12:00:00Z', 9.725, -82.825, 16.61], ['2023-12-01T12:00:00Z', 9.725, -82.825, null],
      ['2023-11-19T12:00:00Z', 9.775, -82.825, 99], // another pixel, not wanted
    ] };
    const p = yearPeaks(table, [{ id: 'cahuita', pixel: [-82.825, 9.725] }, { id: 'twin', pixel: [-82.825, 9.725] }, { id: 'gone', pixel: [-80, 9] }]);
    expect(p).toEqual({ cahuita: { peak: 16.61, day: '2023-11-19' }, twin: { peak: 16.61, day: '2023-11-19' }, gone: null });
  });
  it('tops up the current year from the live window', () => {
    const h: CoralHistory = { fetchedAt: '', licence: '', years: [2024, 2025], reefs: [{ id: 'a', pixel: [0, 0], peak: [15.4, 6.25], peakDay: ['', ''] }] };
    expect(peakFor(h, 'a', 2024)).toBe(15.4);
    expect(peakFor(h, 'a', 2025, { peak: 7, year: 2025 })).toBe(7);
    expect(peakFor(h, 'a', 2026, { peak: 3.8, year: 2026 })).toBe(3.8);
    expect(peakFor(null, 'a', 2026)).toBeNull();
  });
});
