import { describe, expect, it } from 'vitest';
import { BASE } from '../species/base.gen';
import { ciguaSpecies, strictestCm } from './cigua';
import { ciguaBoatHtml, ciguaNoteHtml } from './cigua-note';
import { OCCURRENCE_TAXA } from '../species/kinds';
import { OFFSHORE } from './offshore';
import { SPECIES } from './species';

const KINDS = [...SPECIES.map((s) => ({ id: s.id as string, tier: s.ciguatera })), ...OFFSHORE.map((o) => ({ id: o.id as string, tier: o.ciguatera }))];
/** Species the #ciguatera page rates HIGH (ciguatera/content.ts, Species and size table). */
const PAGE_HIGH = ['Caranx latus', 'Lutjanus cyanopterus', 'Lutjanus jocu', 'Mycteroperca bonaci', 'Mycteroperca tigris', 'Epinephelus guttatus', 'Epinephelus adscensionis', 'Epinephelus morio'];

describe('ciguatera agrees across the map, forecast and guide', () => {
  it('every fish the guide says can carry ciguatera has a warning on the map', () => {
    for (const k of KINDS) {
      const risky = (OCCURRENCE_TAXA[k.id] ?? []).some((s) => BASE[s]?.cigua);
      expect(!!k.tier, k.id).toBe(risky);
    }
  });
  it('a fish the guide rates toxic is never-eat; a kind with a HIGH species on the ciguatera page is red', () => {
    for (const k of KINDS) {
      const scis = OCCURRENCE_TAXA[k.id] ?? [];
      if (scis.some((s) => BASE[s]?.edible === 'toxic')) expect(k.tier, k.id).toBe('never');
      else if (scis.some((s) => PAGE_HIGH.includes(s))) expect(k.tier, k.id).toBe('high');
    }
  });
  it('kingfish and cero carry the warning (audit 2026-11-16)', () => {
    expect(OFFSHORE.find((o) => o.id === 'kingfish')!.ciguatera).toBe('listed');
    expect(SPECIES.find((s) => s.id === 'mackerel')!.ciguatera).toBe('listed');
    expect(ciguaSpecies('mackerel').map((s) => s.sci)).toEqual(['Scomberomorus regalis']);
  });
  it('uses the guide sizes: horse-eye jack 42 cm is the strictest jack', () => {
    expect(ciguaSpecies('jack').find((s) => s.sci === 'Caranx latus')!.size).toEqual({ basis: 'published', cm: 42, kg: 1 });
    expect(strictestCm('jack')).toBe(42);
    expect(strictestCm('kingfish')).toBe(75);
    expect(strictestCm('wahoo')).toBe(90);
  });
  it('draws a bar per species, red for the high tier, and the boat chart', () => {
    const html = ciguaNoteHtml('jack', 'high');
    expect(html).toContain('cz-red');
    expect(html.match(/cz-row/g)!.length).toBe(5);
    expect(html).toContain('42 cm');
    expect(ciguaNoteHtml('snook', undefined)).toBe('');
    expect(ciguaBoatHtml(['kingfish', 'wahoo'])).toContain('75 cm');
  });
});

describe('forecast ciguatera line', () => {
  it('gives the strictest size for each listed fish that carries it', async () => {
    const { ciguaLine } = await import('../forecast/view');
    const [line] = ciguaLine(['snook', 'jack', 'grouper']);
    expect(line).toMatch(/42 cm/);
    expect(line).toMatch(/33 cm/);
    expect(ciguaLine(['snook', 'mullet'])).toEqual([]);
  });
});
