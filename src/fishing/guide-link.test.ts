import { describe, expect, it } from 'vitest';
import { fishKindFor, guideLinkFor, GUIDE_SEARCH } from './guide-link';
import { SPECIES } from './species';
import { parseGuideRoute } from '../guide/route';
import guideIndex from '../../public/data/guide/index.json';
import { DEFAULT_FILTER, matches } from '../guide/filter';
import type { Entry } from '../guide/types';

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
  it('finds the kind\'s own guide species (review 2026-11-16: grouper hit the sea basses, pompano missed palometa)', () => {
    const entries = (guideIndex as unknown as { entries: Entry[] }).entries;
    const found = (k: keyof typeof GUIDE_SEARCH) => entries.filter((e) => matches(e, { ...DEFAULT_FILTER, q: GUIDE_SEARCH[k] })).map((e) => e.sci);
    expect(found('grouper')).toEqual(expect.arrayContaining(['Epinephelus guttatus', 'Mycteroperca bonaci', 'Cephalopholis fulva']));
    expect(found('pompano')).toEqual(expect.arrayContaining(['Trachinotus carolinus', 'Trachinotus goodei']));
    expect(found('lionfish')).toContain('Pterois volitans');
  });
});
