import { describe, expect, it } from 'vitest';
import { ageState, createDataAge, describeAge, formatAge } from './data-age';

describe('data age', () => {
  it('reports the oldest feed and notifies', () => {
    const a = createDataAge();
    let n = 0;
    a.subscribe(() => n++);
    expect(a.oldest()).toBeUndefined();
    a.report('wind', 500);
    a.report('tide', 100, true);
    a.report('waves', 300);
    a.report('bad', NaN);
    expect(a.oldest()).toEqual({ feed: 'tide', fetchedAt: 100, fromCache: true });
    expect(a.all()).toHaveLength(3);
    expect(n).toBe(3);
  });
  it('colours by DESIGN §7 thresholds', () => {
    expect(ageState(11.9 * 3.6e6)).toBe('fresh');
    expect(ageState(12 * 3.6e6)).toBe('aging');
    expect(ageState(48 * 3.6e6)).toBe('stale');
  });
});

describe('formatAge', () => {
  it('shows hours and minutes, then days and hours', () => {
    expect(formatAge(0)).toBe('00H00');
    expect(formatAge(3 * 3.6e6 + 7 * 60000)).toBe('03H07');
    expect(formatAge(99.9 * 3.6e6)).toBe('99H54');
    expect(formatAge(100 * 3.6e6)).toBe('04D04H');
    expect(formatAge(30 * 24 * 3.6e6)).toBe('30D00H');
  });
  it('never goes negative or NaN', () => {
    expect(formatAge(-5000)).toBe('00H00');
    expect(formatAge(NaN)).toBe('00H00');
  });
});

describe('describeAge', () => {
  const now = 1_000_000_000_000;
  it('has no state until a feed has loaded', () => {
    expect(describeAge(undefined, now)).toEqual({ state: 'none', text: '', fromCache: false });
  });
  it('colours and flags the stored copy', () => {
    expect(describeAge({ feed: 'wind', fetchedAt: now - 2 * 3.6e6, fromCache: false }, now)).toEqual({ state: 'fresh', text: '02H00', fromCache: false });
    expect(describeAge({ feed: 'wind', fetchedAt: now - 20 * 3.6e6, fromCache: true }, now)).toMatchObject({ state: 'aging', fromCache: true });
    expect(describeAge({ feed: 'wind', fetchedAt: now - 60 * 3.6e6, fromCache: true }, now).state).toBe('stale');
  });
});
