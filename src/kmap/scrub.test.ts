import { describe, expect, it } from 'vitest';
import { runSpread } from './scrub';

describe('time bar forecast runs', () => {
  it('stay tight over the forecast week and fan out after it', () => {
    expect(runSpread(0)).toBeLessThan(0.2);
    expect(runSpread(167)).toBeLessThan(0.2);
    expect(runSpread(300)).toBeGreaterThan(runSpread(168));
    expect(runSpread(720)).toBe(1);
    for (let o = 0; o < 720; o += 7) expect(runSpread(o + 7)).toBeGreaterThanOrEqual(runSpread(o));
  });
});
