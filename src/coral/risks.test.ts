import { describe, expect, it } from 'vitest';
import { coralRisks, worstSarg } from './risks';

describe('coral risk rows', () => {
  it('rates each risk on its threshold', () => {
    const rows = coralRisks({ alert: 3, flowRatio: 1.6, rainMm: 41, sargassum: 'LOW', hsM: 1.2, lowTideM: -0.22 });
    expect(Object.fromEntries(rows.map((r) => [r.id, r.level]))).toEqual({ heat: 'high', sediment: 'watch', runoff: 'high', sargassum: 'watch', swell: 'ok', lowtide: 'watch' });
    expect(rows.find((r) => r.id === 'sediment')!.value).toBe('1.6×');
  });
  it('shows no reading when a feed is missing', () => {
    const rows = coralRisks({ alert: null, flowRatio: null, rainMm: NaN, sargassum: null, hsM: null, lowTideM: null });
    expect(rows.every((r) => r.level === 'none' && r.value === '')).toBe(true);
  });
  it('a calm day is all clear', () => {
    const rows = coralRisks({ alert: 0, flowRatio: 0.8, rainMm: 2, sargassum: 'NONE', hsM: 0.6, lowTideM: -0.1 });
    expect(rows.every((r) => r.level === 'ok')).toBe(true);
  });
  it('takes the worst sargassum day', () => {
    expect(worstSarg(['NONE', null, 'MODERATE', 'LOW'])).toBe('MODERATE');
    expect(worstSarg([null, null])).toBeNull();
  });
});
