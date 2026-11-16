import { describe, expect, it } from 'vitest';
import { SPEAR_HAND, SPEAR_SPECIES, SPEAR_TARGETS, spearScore, spearWindow } from './spear';
import { speciesById } from './species';

describe('spear areas', () => {
  it('targets only edible reef fish, no barracuda, mackerel or snook', () => {
    expect([...SPEAR_SPECIES].sort()).toEqual(['flounder', 'grouper', 'jack', 'lionfish', 'snapper', 'spadefish', 'squirrelfish']);
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
  it('narrows to one picked target, lobster and octopus by hand included', () => {
    expect(spearScore({ lionfish: 0.8, lobster: 0.6 }, 8, ['lobster'])).toBeCloseTo(0.6);
    expect(spearScore({ lionfish: 0.8, lobster: 0.6 }, 8)).toBeCloseTo(0.8);
    expect([...SPEAR_TARGETS]).toEqual([...SPEAR_SPECIES, ...SPEAR_HAND]);
    for (const id of SPEAR_HAND) expect(speciesById(id).byHand).toBe(true);
  });
});
