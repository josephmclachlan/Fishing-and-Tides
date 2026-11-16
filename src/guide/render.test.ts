import { describe, expect, it } from 'vitest';
import { emergencyHtml, isIllegal, tabsFor } from './render';
import type { Species } from './types';

const base = { id: 'x', tier: 'full', group: 'fish', sci: 'X y', en: 'X', es: 'X' } as unknown as Species;
const sp = (o: Partial<Species>) => ({ ...base, ...o }) as Species;

describe('catch and clean tabs for emergency food', () => {
  it('shows them for edible species, as before', () => {
    expect(tabsFor(sp({ edible: 'yes', eat: { quality: 4 } }))).toContain('catch');
  });
  it('shows them for banned or non-food species that have food notes, under a banner', () => {
    const banned = sp({ edible: 'protected', eat: { howTo: { en: 'a', es: 'a' }, clean: 'shark', illegal: true } });
    expect(tabsFor(banned)).toEqual(expect.arrayContaining(['catch', 'clean']));
    expect(isIllegal(banned)).toBe(true);
    expect(emergencyHtml(banned)).toContain('gd-illegal');
    const odd = sp({ edible: 'no', eat: { cook: { en: 'boil', es: 'hervir' } } });
    expect(tabsFor(odd)).toContain('catch');
    expect(emergencyHtml(odd)).toContain('gd-warn');
  });
  it('leaves them out when a non-food species only has rules', () => {
    expect(tabsFor(sp({ edible: 'protected', eat: { rules: { en: 'Banned', es: 'Prohibido' } } }))).not.toContain('catch');
  });
  it('puts no banner on ordinary food', () => {
    expect(emergencyHtml(sp({ edible: 'yes', eat: {} }))).toBe('');
    expect(emergencyHtml(sp({ edible: 'caution', eat: { illegal: true } }))).toContain('gd-illegal');
  });
});
