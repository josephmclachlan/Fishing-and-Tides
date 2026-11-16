import { describe, expect, it } from 'vitest';
import { fishKindFor, guideLinkFor, GUIDE_SEARCH } from './guide-link';
import { SPECIES } from './species';
import { parseGuideRoute } from '../guide/route';

describe('fish kind and guide link', () => {
  it('maps guide species to a model kind', () => {
    expect(fishKindFor('Lutjanus griseus')).toBe('snapper');
    expect(fishKindFor('caranx hippos')).toBe('jack');
    expect(fishKindFor('Pterois volitans')).toBe('lionfish');
    expect(fishKindFor('Thunnus albacares')).toBeNull();
  });
  it('has a guide search for every model kind, and the links parse as guide routes', () => {
    for (const s of SPECIES) {
      expect(GUIDE_SEARCH[s.id]).toBeTruthy();
      expect(parseGuideRoute(guideLinkFor(s.id))).toMatchObject({ mode: 'edible', group: s.byHand || s.id === 'squid' ? null : 'fish', q: GUIDE_SEARCH[s.id] });
    }
  });
});
