import { describe, expect, it } from 'vitest';
import { coastHtml, COLS, ZONE_HABITATS, zoneCounts, zoneOf, ZONES } from './coast';
import { DEFAULT_FILTER } from './filter';
import { HABITATS, type Entry } from './types';

const e = (id: string, habitats: string[]): Entry => ({ id, tier: 'full', group: 'fish', sub: 'x', sci: id, en: [id], es: [id], rec: 'here', habitats }) as unknown as Entry;

describe('the coast drawing (PLAN 14.6)', () => {
  it('puts every habitat of the research in exactly one part of the coast', () => {
    for (const h of HABITATS) expect(ZONES.filter((z) => ZONE_HABITATS[z].includes(h))).toHaveLength(1);
  });
  it('knows which part a habitat filter is, and none for anything else', () => {
    expect(zoneOf(['rock', 'reef'])).toBe('reef');
    expect(zoneOf(['reef'])).toBeNull();
    expect(zoneOf([])).toBeNull();
  });
  it('counts a species in every part it lives in, under the other filters', () => {
    const list = [e('a', ['reef', 'seagrass']), e('b', ['beach']), e('c', ['offshore'])];
    const n = zoneCounts(list, { ...DEFAULT_FILTER }, 'all', null);
    expect(n).toMatchObject({ reef: 1, seagrass: 1, beach: 1, deep: 1, open: 0, mangrove: 0 });
  });
  it('marks the part showing and gives every part its count', () => {
    const h = coastHtml('reef', { beach: 1, mangrove: 2, seagrass: 3, reef: 4, open: 5, deep: 6 });
    // Six buttons in the strip (each with its count), and six tap areas in the picture.
    expect(h.match(/<button[^>]*data-zone=/g)).toHaveLength(6);
    expect(h.match(/class="gd-czh" data-zone=/g)).toHaveLength(6);
    expect(h).toMatch(/class="gd-cz z-reef on" data-zone="reef" data-z="reef" aria-pressed="true"/);
    expect(h).toMatch(/data-zone="deep"[^>]*aria-pressed="false"><b>[^<]+<\/b><span class="gd-cz-n fc-mono">6</);
    expect(h).toMatch(/data-on="reef"/);
  });
  it('lines the strip up under the picture: its columns are the parts\' widths across the drawing', () => {
    const h = coastHtml(null, { beach: 0, mangrove: 0, seagrass: 0, reef: 0, open: 0, deep: 0 });
    expect(h).toContain(`grid-template-columns:${ZONES.map((z) => `${COLS[z][1] - COLS[z][0]}fr`).join(' ')}`);
    expect(COLS.beach[0]).toBe(0);
    ZONES.slice(1).forEach((z, i) => expect(COLS[z][0]).toBe(COLS[ZONES[i]][1]));
    expect(COLS.deep[1]).toBe(1200);
  });
});
