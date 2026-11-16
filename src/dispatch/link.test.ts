import { describe, expect, it } from 'vitest';
import { cleanHtml } from '../guide/clean';
import { parseDispatchRoute } from './route';

describe('dispatch link from the guide', () => {
  it('sits above the cleaning diagram in both languages and is a route the page reads', () => {
    for (const lang of ['en', 'es'] as const) {
      const html = cleanHtml('fillet-round', lang, undefined, 'fish');
      const m = /<a class="gd-dispatch" href="(#dispatch)"/.exec(html);
      expect(m).not.toBeNull();
      expect(parseDispatchRoute(m![1])).toEqual({ section: null });
      expect(html.indexOf('gd-dispatch')).toBeLessThan(html.indexOf('<figure'));
    }
  });
});

describe('cleaning steps fit the species', () => {
  it('a jellyfish never gets the fish drawing or the kill-and-bleed link, only its own notes', () => {
    const html = cleanHtml('whole-small', 'en', { en: 'Handle with gloves.', es: 'Use guantes.' }, 'jellies-anemones');
    expect(html).not.toContain('<figure');
    expect(html).not.toContain('gd-dispatch');
    expect(html).toContain('Handle with gloves.');
    expect(cleanHtml('whole-small', 'en', undefined, 'seabirds')).toBe('');
  });
});
