import { describe, expect, it } from 'vitest';
import { cleanHtml } from '../guide/clean';
import { parseDispatchRoute } from './route';

describe('dispatch link from the guide', () => {
  it('sits above the cleaning diagram in both languages and is a route the page reads', () => {
    for (const lang of ['en', 'es'] as const) {
      const html = cleanHtml('fillet-round', lang);
      const m = /<a class="gd-dispatch" href="(#dispatch)"/.exec(html);
      expect(m).not.toBeNull();
      expect(parseDispatchRoute(m![1])).toEqual({ section: null });
      expect(html.indexOf('gd-dispatch')).toBeLessThan(html.indexOf('<figure'));
    }
  });
});
