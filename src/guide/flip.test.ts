import { describe, expect, it } from 'vitest';
import { flipCardHtml, flipDeckHtml } from './flip';
import { rowsHtml, type Row } from './render';
import type { Entry } from './types';

const e = (id: string, o: object = {}): Entry => ({ id, tier: 'full', group: 'fish', sub: 'snappers', sci: id, en: [id], es: [id], ...o }) as unknown as Entry;
const o = { lang: 'en' as const, base: '/', href: (id: string) => `#guide/fish/${id}` };

describe('Flip (PLAN 14.4)', () => {
  it('puts the name, the key marks (no citation markers) and a link to the full page on a card', () => {
    const h = flipCardHtml(e('a', { look: { marks: { en: 'A black spot[^3].', es: 'x' }, colors: [], pattern: [], position: [] } }), o, 0, 5);
    expect(h).toContain('A black spot.');
    expect(h).not.toContain('[^');
    expect(h).toContain('href="#guide/fish/a"');
    expect(h).toContain('1 / 5');
  });
  it('deals one card per species, in order', () => {
    const h = flipDeckHtml([e('a'), e('b'), e('c')], o);
    expect(h.match(/class="gd-fc /g)).toHaveLength(3);
    expect(h.indexOf('data-id="a"')).toBeLessThan(h.indexOf('data-id="c"'));
  });
  it('gives every shelf of two or more a Flip button named by its first species', () => {
    const s = { title: 'Snappers', items: [], group: 'fish' } as never;
    const rows: Row[] = [{ k: 'head', s, n: 2 }, { k: 'card', e: e('a') }, { k: 'card', e: e('b') }, { k: 'head', s, n: 1 }, { k: 'card', e: e('c') }];
    const h = rowsHtml(rows, { ...o, shelf: true });
    expect(h).toContain('data-flip-at="a"');
    expect(h).not.toContain('data-flip-at="c"');
    expect(rowsHtml(rows, o)).not.toContain('data-flip-at');
  });
});
