import { describe, expect, it } from 'vitest';
import { bestWindow, lightTerm, outingScore, outlook, suitFor, type OutingInputs } from './outing';

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

import { ratingFor, stingerGuess } from './outing';

describe('rating and stinger guess', () => {
  it('bands the score', () => {
    expect([ratingFor(85), ratingFor(70), ratingFor(69), ratingFor(40), ratingFor(39)]).toEqual(['GO', 'GO', 'CAUTION', 'CAUTION', 'AVOID']);
  });
  it('flags only fresh on-shore wind', () => {
    expect(stingerGuess(6, 40, 40)).toBe(true);
    expect(stingerGuess(6, 90, 40)).toBe(true); // 50° off
    expect(stingerGuess(6, 200, 40)).toBe(false); // off-shore
    expect(stingerGuess(3, 40, 40)).toBe(false); // too light
    expect(stingerGuess(6, 350, 20)).toBe(true); // wraps through north
    expect(stingerGuess(NaN, 40, 40)).toBe(false);
  });
});

describe('weather safety and rain', () => {
  it('leaves the score alone when there is no weather', () => {
    expect(outingScore({ ...good, squall: 'none', lightning: false }).score).toBe(outingScore(good).score);
  });
  it('caps by squall level and says why', () => {
    const base = outingScore(good).score;
    const watch = outingScore({ ...good, squall: 'watch' });
    const high = outingScore({ ...good, squall: 'high' });
    expect(watch.score).toBe(Math.round(base * 0.7));
    expect(high.score).toBe(Math.round(base * 0.25));
    expect(high.reasons[0]).toBe('storm');
  });
  it('lightning leaves at most 10', () => {
    const r = outingScore({ ...good, lightning: true });
    expect(r.score).toBeLessThanOrEqual(10);
    expect(r.reasons[0]).toBe('storm');
  });
  it('heavy rain lowers the score; light rain does not', () => {
    expect(outingScore({ ...good, rainMmH: 1 }).score).toBe(outingScore(good).score);
    const heavy = outingScore({ ...good, rainMmH: 10 });
    expect(heavy.score).toBeLessThan(outingScore(good).score);
    expect(heavy.reasons).toContain('rain');
  });
});

describe('current', () => {
  it('slow drift costs nothing, a strong current does', () => {
    expect(outingScore({ ...good, currentMs: 0.1 }).score).toBe(outingScore(good).score);
    const strong = outingScore({ ...good, currentMs: 0.6 });
    expect(strong.score).toBeLessThan(30);
    expect(strong.reasons[0]).toBe('current');
  });
  it('an unknown current is ignored', () => {
    expect(outingScore({ ...good, currentMs: NaN }).score).toBe(outingScore(good).score);
  });
});

describe('water temperature and sargassum', () => {
  it('warm water and no sargassum change nothing', () => {
    expect(outingScore({ ...good, sstC: 28.5, sarg: 'LOW' }).score).toBe(outingScore(good).score);
  });
  it('cold water lowers the score and says so', () => {
    const cold = outingScore({ ...good, sstC: 20 });
    expect(cold.score).toBeLessThan(outingScore(good).score);
    expect(cold.reasons).toContain('cold');
  });
  it('sargassum on the beach lowers it by level', () => {
    const mod = outingScore({ ...good, sarg: 'MODERATE' }).score;
    const high = outingScore({ ...good, sarg: 'HIGH' });
    expect(high.score).toBeLessThan(mod);
    expect(mod).toBeLessThan(outingScore(good).score);
    expect(high.reasons[0]).toBe('sargassum');
  });
  it('suggests a suit by temperature', () => {
    expect([29, 26, 23, 19].map(suitFor)).toEqual(['lycra', 'shorty', 'wet3', 'wet5']);
  });
});
