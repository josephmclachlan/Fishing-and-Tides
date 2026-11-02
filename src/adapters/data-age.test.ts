import { describe, expect, it } from 'vitest';
import { ageState, createDataAge } from './data-age';

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
