import { describe, expect, it } from 'vitest';
import { pickExplain, TAPPABLE } from './map-explain';
import { helpKey } from './explain';
import { en } from './i18n/en';
import { es } from './i18n/es';

describe('pickExplain', () => {
  it('tells a fresh flash from an old one', () => {
    expect(pickExplain('lt-dot', { fresh: true })?.id).toBe('lightningNew');
    expect(pickExplain('lt-dot', { fresh: false })?.id).toBe('lightningOld');
  });
  it('titles a storm and an observation with their label, first line only', () => {
    expect(pickExplain('st-label', { label: 'RAFAEL CAT 2' })).toMatchObject({ title: 'RAFAEL CAT 2', id: 'stormMark' });
    expect(pickExplain('ob-dot', { label: 'TIDE +0.17 m\n2 min ago' })).toMatchObject({ title: 'TIDE +0.17 m', id: 'obsMark' });
  });
  it('shows the wave height on a crest line and flags high seas', () => {
    expect(pickExplain('wv-crest', { hs: 1.24 })).toMatchObject({ title: 'WAVES/SWELL 1.2 m', id: 'crest' });
    expect(pickExplain('wv-crest', { hs: 2.5 })?.id).toBe('crestHigh');
  });
  it('ignores other layers', () => {
    expect(pickExplain('sf-reef-area', {})).toBeNull();
  });
  it('only ever names cards that exist in English and Spanish', () => {
    const ids = ['lightningNew', 'lightningOld', 'stormMark', 'obsMark', 'crest', 'crestHigh'];
    for (const id of ids) for (const d of [en, es] as Record<string, string>[]) expect(d[helpKey(id)], id).toBeTruthy();
    expect(TAPPABLE.length).toBeGreaterThan(0);
  });
});
