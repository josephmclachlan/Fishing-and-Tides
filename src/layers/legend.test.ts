import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { LEGEND, legendHtml, legendItemKey, legendWhatKey } from './legend';
import { LAYERS } from './registry';

describe('layer legends', () => {
  it('cover every catalog layer', () => {
    expect(Object.keys(LEGEND).sort()).toEqual(LAYERS.map((l) => l.id).sort());
  });
  it('have text in English and Spanish for the title line and every item', () => {
    for (const l of LAYERS) {
      for (const dict of [en, es] as Record<string, string>[]) {
        expect(dict[legendWhatKey(l.id)], `${l.id} what`).toBeTruthy();
        LEGEND[l.id].forEach((_, i) => expect(dict[legendItemKey(l.id, i + 1)], `${l.id} ${i + 1}`).toBeTruthy());
      }
    }
  });
  it('have no stray item text without a swatch entry', () => {
    for (const l of LAYERS) expect((en as Record<string, string>)[legendItemKey(l.id, LEGEND[l.id].length + 1)], l.id).toBeUndefined();
  });
  it('render the title, swatches and escaped text', () => {
    const h = legendHtml('clarity', (k) => (k.endsWith('.1') ? '<8 m' : 'x'));
    expect(h).toContain('lg-what');
    expect(h).toContain('sw-fill sw-green');
    expect(h).toContain('&lt;8 m');
    expect(legendHtml('seamarks', () => 'x')).not.toContain('lg-list');
  });
});
