import { describe, expect, it } from 'vitest';
import { modesHtml, rowsHtml, tileHtml, tileTags, type Row } from './render';
import type { Entry } from './types';

const e = (o: Partial<Entry>): Entry => ({ id: 'x-y', tier: 'full', group: 'fish', sub: 'snappers', sci: 'X y', en: ['Ex'], es: ['Ex'], ...o }) as unknown as Entry;
const o = { lang: 'en' as const, base: '/', href: (id: string) => `#guide/all/${id}` };

describe('the Atlas home (PLAN 14.2)', () => {
  it('marks a tile by colour: green to eat, amber with a risk, red when it hurts badly or is illegal', () => {
    expect(tileTags(e({ edible: 'yes' }), 'en')).toContain('gd-tg eat"');
    expect(tileTags(e({ edible: 'yes', risks: ['ciguatera'] }), 'en')).toContain('gd-tg eat care');
    expect(tileTags(e({ danger: { level: 3, kinds: ['venom'] } } as Partial<Entry>), 'en')).toContain('gd-tg dz l3');
    const ban = tileTags(e({ edible: 'yes', illegal: true } as Partial<Entry>), 'en');
    expect(ban).toContain('gd-tg ban');
    expect(ban).not.toContain('gd-tg eat');
    expect(tileTags(e({}), 'en')).toBe('');
  });
  it('gives every mark its words for a screen reader', () => {
    expect(tileTags(e({ edible: 'yes' }), 'en')).toMatch(/aria-label="[^"]+"/);
  });
  it('draws a tile with the name, links to the species and shows the drawing when there is no photo', () => {
    const h = tileHtml(e({ en: ['Mahogany snapper'], seen: 'common' }), o);
    expect(h).toContain('href="#guide/all/x-y"');
    expect(h).toContain('Mahogany snapper');
    expect(h).toContain('<svg');
  });
  it('puts each section on its own shelf, and keeps the list when shelves are off', () => {
    const s = { title: 'Snappers', items: [], group: 'fish' } as never;
    const rows: Row[] = [{ k: 'head', s, n: 2 }, { k: 'card', e: e({ id: 'a' }) }, { k: 'card', e: e({ id: 'b' }) }, { k: 'head', s, n: 1 }, { k: 'card', e: e({ id: 'c' }) }];
    const shelf = rowsHtml(rows, { ...o, shelf: true });
    expect(shelf.match(/class="gd-lane"/g)).toHaveLength(2);
    expect(shelf.match(/class="gd-st /g)).toHaveLength(3);
    const list = rowsHtml(rows, o);
    expect(list).not.toContain('gd-lane');
    expect(list.match(/class="gd-card /g)).toHaveLength(3);
  });
  it('leaves Identify out of the list tabs: it has its own wide bar', () => {
    const h = modesHtml('all', { all: 1, identify: 0, edible: 1, danger: 1, saved: 0 });
    expect(h).not.toContain('data-mode="identify"');
    expect(h).toContain('data-mode="edible"');
  });
});
