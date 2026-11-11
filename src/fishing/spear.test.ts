import { describe, expect, it } from 'vitest';
import { SPEAR_SPECIES, spearScore, spearWindow } from './spear';

describe('spear areas', () => {
  it('targets only edible reef fish, no barracuda, mackerel or snook', () => {
    expect([...SPEAR_SPECIES].sort()).toEqual(['grouper', 'jack', 'lionfish', 'snapper']);
  });
  it('has a working depth window of 3 to 15 m', () => {
    expect(spearWindow(1)).toBe(0);
    expect(spearWindow(3)).toBe(1);
    expect(spearWindow(10)).toBe(1);
    expect(spearWindow(15)).toBe(1);
    expect(spearWindow(18.5)).toBeCloseTo(0.5);
    expect(spearWindow(30)).toBe(0);
    expect(spearWindow(NaN)).toBe(0);
  });
  it('scores the best target, ignoring species that are not spear targets', () => {
    expect(spearScore({ lionfish: 0.8, snapper: 0.5, snook: 0.99 } as never, 8)).toBeCloseTo(0.8);
    expect(spearScore({ lionfish: 0.8 }, 25)).toBe(0);
    expect(spearScore({}, 8)).toBe(0);
  });
});
