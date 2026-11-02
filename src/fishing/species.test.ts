import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { SPECIES } from './species';

describe('species catalog', () => {
  it('has text for every species and consistent weights and ranges', () => {
    for (const s of SPECIES) {
      expect(`fish.${s.id}` in en).toBe(true);
      expect(s.w.mouth + s.w.reef + s.w.drop).toBeCloseTo(1);
      expect(s.season).toHaveLength(12);
      const [a, b, c, d] = s.depthM;
      expect(a < b && b <= c && c < d).toBe(true);
    }
  });
});

describe('seasonOf', () => {
  it('words the season factor', async () => {
    const { seasonOf } = await import('./species');
    expect(seasonOf(SPECIES[0], 1)).toBe('peak');
    expect(seasonOf({ ...SPECIES[0], season: Array(12).fill(0.9) }, 0)).toBe('good');
    expect(seasonOf({ ...SPECIES[0], season: Array(12).fill(0.7) }, 0)).toBe('off');
  });
});
