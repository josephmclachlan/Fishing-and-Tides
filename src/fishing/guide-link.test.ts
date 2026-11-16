import { describe, expect, it } from 'vitest';
import { fishKindFor, guideLinkFor, GUIDE_SEARCH } from './guide-link';
import { SPECIES } from './species';
import { OFFSHORE } from './offshore';
import { parseGuideRoute } from '../guide/route';
import { BASE } from '../species/base.gen';
import { KINDS } from '../species/kinds';
import guideIndex from '../../public/data/guide/index.json';
import { DEFAULT_FILTER, matches } from '../guide/filter';
import type { Entry } from '../guide/types';

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
  it('finds the kind\'s own guide species (review 2026-11-16: grouper hit the sea basses, pompano missed palometa)', () => {
    const entries = (guideIndex as unknown as { entries: Entry[] }).entries;
    const found = (k: keyof typeof GUIDE_SEARCH) => entries.filter((e) => matches(e, { ...DEFAULT_FILTER, q: GUIDE_SEARCH[k] })).map((e) => e.sci);
    expect(found('grouper')).toEqual(expect.arrayContaining(['Epinephelus guttatus', 'Mycteroperca bonaci', 'Cephalopholis fulva']));
    expect(found('pompano')).toEqual(expect.arrayContaining(['Trachinotus carolinus', 'Trachinotus goodei']));
    expect(found('lionfish')).toContain('Pterois volitans');
  });
});
