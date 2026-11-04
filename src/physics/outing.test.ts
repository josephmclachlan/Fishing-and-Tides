import { describe, expect, it } from 'vitest';
import { bestWindow, lightTerm, outingScore, outlook, type OutingInputs } from './outing';

const good: OutingInputs = { surgeMs: 0.05, visM: 12, windMs: 3, waterM: 2, localHour: 11 };

describe('outing score', () => {
  it('is 100 when everything is ideal and names no reasons', () => {
    expect(outingScore(good)).toEqual({ score: 100, reasons: [] });
  });
  it('one bad term drags the score down and is named first', () => {
    const r = outingScore({ ...good, surgeMs: 0.7 });
    expect(r.score).toBeLessThanOrEqual(30);
    expect(r.reasons[0]).toBe('surge');
  });
  it('flags a reef flat that is too shallow at low tide', () => {
    expect(outingScore({ ...good, waterM: 0.3 }).reasons).toContain('shallow');
    expect(outingScore({ ...good, waterM: 1.5 }).reasons).not.toContain('shallow');
  });
  it('treats missing numbers as unknown, not as perfect or zero', () => {
    const r = outingScore({ ...good, visM: NaN });
    expect(r.score).toBeGreaterThanOrEqual(55);
    expect(r.score).toBeLessThan(100);
  });
  it('light ramps in the morning and out in the afternoon', () => {
    expect(lightTerm(6)).toBe(0);
    expect(lightTerm(8)).toBeCloseTo(0.5);
    expect(lightTerm(12)).toBe(1);
    expect(lightTerm(16)).toBeCloseTo(0.5);
  });
});

describe('best time and best day', () => {
  // Calm only between 09:00 and 12:00 local; chop builds after.
  const at = (_ms: number, h: number) => outingScore({ ...good, windMs: h <= 12 ? 3 : 9, localHour: h });
  it('picks the run of hours near the best', () => {
    const w = bestWindow(at, 0)!;
    expect(w.start).toBe(9 * 3.6e6);
    expect(w.end).toBe(13 * 3.6e6);
    expect(w.peak).toBe(100);
  });
  it('returns null when no hour is usable', () => {
    expect(bestWindow(() => ({ score: 0, reasons: ['surge'] }), 0)).toBeNull();
  });
  it('finds the best day of the week', () => {
    const day = (ms: number) => Math.floor(ms / 864e5);
    const o = outlook((ms, h) => outingScore({ ...good, localHour: h, visM: day(ms) === 3 ? 12 : 4 }), 0, 7);
    expect(o.days).toHaveLength(7);
    expect(o.bestDay).toBe(3);
  });
});
