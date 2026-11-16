import { describe, expect, it } from 'vitest';
import { fishKindFor, guideLinkFor, GUIDE_SEARCH } from './guide-link';
import { SPECIES } from './species';
import { OFFSHORE } from './offshore';
import { parseGuideRoute } from '../guide/route';
import { BASE } from '../species/base.gen';
import { KINDS } from '../species/kinds';

describe('fish kind and guide link', () => {
  it('maps guide species to a model kind, shore or boat', () => {
    expect(fishKindFor('Lutjanus griseus')).toBe('snapper');
    expect(fishKindFor('caranx hippos')).toBe('jack');
    expect(fishKindFor('Pterois volitans')).toBe('lionfish');
    expect(fishKindFor('Thunnus albacares')).toBe('tuna');
    expect(fishKindFor('Lutjanus vivanus')).toBe('silksnapper');
    expect(fishKindFor('Epinephelus itajara')).toBeNull();
  });
  it('links every kind into the guide: a one-species kind to its page, the rest to a search', () => {
    for (const s of [...SPECIES, ...OFFSHORE]) {
      const e = KINDS[s.id];
      const r = parseGuideRoute(guideLinkFor(s.id));
      expect(GUIDE_SEARCH[s.id]).toBeTruthy();
      expect(r).toMatchObject({ mode: 'edible', group: 'notFish' in e ? null : 'fish' });
      if (e.taxa.length === 1) expect(r).toMatchObject({ id: BASE[e.taxa[0]].id, q: null });
      else expect(r).toMatchObject({ id: null, q: GUIDE_SEARCH[s.id] });
    }
    expect(guideLinkFor('permit')).toBe('#guide/edible-fish/trachinotus-falcatus');
    expect(guideLinkFor('squid')).toBe('#guide/edible/sepioteuthis-sepioidea');
  });
});
