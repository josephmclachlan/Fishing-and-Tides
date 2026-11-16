import { describe, expect, it } from 'vitest';
import {
  touchLevel,
  activeCount, DEFAULT_FILTER, flagsOf, fold, groupCounts, haystack, inView, isDanger, matches, modeCounts, nameOf, poisonToEat, riskToEat,
  sections, sizeBand, sortEntries, type GdFilter,
} from './filter';
import type { Entry } from './types';

const E = (o: Partial<Entry> & Pick<Entry, 'id' | 'sci'>): Entry => ({ tier: 'full', group: 'fish', sub: 'snappers', en: [], es: [], ...o });

const schoolmaster = E({
  id: 'lutjanus-apodus', sci: 'Lutjanus apodus', en: ['Schoolmaster'], es: ['Pargo amarillo', 'Pargo de lunar'], local: ['pargo'],
  family: 'Lutjanidae', genus: 'Lutjanus', order: 'Perciformes', familyName: { en: 'Snappers', es: 'Pargos' },
  seen: 'common', size: { common: 30, max: 67, measure: 'TL' }, habitats: ['reef', 'mangrove'], encounter: ['snorkel', 'spear', 'shore-fishing'],
  seenAt: ['day'], feedsAt: ['night', 'twilight'], edible: 'yes', methods: ['handline', 'spear'], risks: ['ciguatera'], iucn: 'LC',
});
const lionfish = E({
  id: 'pterois-volitans', sci: 'Pterois volitans', sub: 'scorpionfishes-lionfish', en: ['Red lionfish'], es: ['Pez león'], family: 'Scorpaenidae',
  seen: 'common', size: { common: 25, max: 47 }, habitats: ['reef'], encounter: ['snorkel', 'dive', 'spear'], edible: 'yes', methods: ['spear'],
  danger: { kinds: ['venom', 'spines'], level: 2 }, origin: 'invasive',
});
const puffer = E({ id: 'sphoeroides-testudineus', sci: 'Sphoeroides testudineus', sub: 'puffers', en: ['Checkered puffer'], es: ['Tamboril'], seen: 'frequent', edible: 'toxic', size: { common: 15 } });
const elkhorn = E({
  id: 'acropora-palmata', sci: 'Acropora palmata', group: 'corals', sub: 'branching-corals', en: ['Elkhorn coral'], es: ['Coral cuerno de alce'],
  seen: 'occasional', size: { max: 2, unit: 'm', measure: 'D' }, iucn: 'CR', cites: 'II', edible: 'no',
});
const goby = E({ id: 'gobiosoma-sp', sci: 'Gobiosoma spilotum', tier: 'list', sub: 'gobies', seen: 'records', size: { max: 30, unit: 'mm' } });
const ALL = [schoolmaster, lionfish, puffer, elkhorn, goby];

const F = (o: Partial<GdFilter> = {}): GdFilter => ({ ...DEFAULT_FILTER, ...o });

describe('names and search', () => {
  it('folds accents and case', () => {
    expect(fold('Tiburón TORO')).toBe('tiburon toro');
  });
  it('shows the name in the reader language, else the other, else Latin', () => {
    expect(nameOf(schoolmaster, 'en')).toBe('Schoolmaster');
    expect(nameOf(schoolmaster, 'es')).toBe('Pargo amarillo');
    expect(nameOf({ en: ['Only English'], es: [], sci: 'X y' }, 'es')).toBe('Only English');
    expect(nameOf(goby, 'en')).toBe('Gobiosoma spilotum');
  });
  it('finds by any name, Latin, family or subgroup, with every word', () => {
    const hay = haystack(schoolmaster);
    for (const q of ['pargo', 'PARGO de lunar', 'lutjanus', 'lutjanidae', 'snappers', 'pargos']) expect(matches(schoolmaster, F({ q }), hay), q).toBe(true);
    expect(matches(schoolmaster, F({ q: 'pargo tiburón' }), hay)).toBe(false);
    expect(matches(lionfish, F({ q: 'pez leon' }))).toBe(true);
  });
  it('hides the one-line records unless asked for or searched', () => {
    expect(matches(goby, F())).toBe(false);
    expect(matches(goby, F({ records: true }))).toBe(true);
    expect(matches(goby, F({ q: 'gobiosoma' }))).toBe(true);
  });
});

describe('filters', () => {
  it('matches any chosen value in each filter, and every filter', () => {
    expect(ALL.filter((e) => matches(e, F({ encounter: ['spear'] }))).map((e) => e.id)).toEqual(['lutjanus-apodus', 'pterois-volitans']);
    expect(ALL.filter((e) => matches(e, F({ habitats: ['mangrove', 'sand'] }))).map((e) => e.id)).toEqual(['lutjanus-apodus']);
    expect(ALL.filter((e) => matches(e, F({ seen: ['frequent', 'occasional'] }))).map((e) => e.id)).toEqual(['sphoeroides-testudineus', 'acropora-palmata']);
    expect(ALL.filter((e) => matches(e, F({ encounter: ['snorkel'], habitats: ['mangrove'] }))).map((e) => e.id)).toEqual(['lutjanus-apodus']);
  });
  it('matches a time when it is seen or feeds then', () => {
    expect(matches(schoolmaster, F({ times: ['night'] }))).toBe(true);
    expect(matches(lionfish, F({ times: ['night'] }))).toBe(false);
  });
  it('puts sizes in bands by the usual size, in any unit', () => {
    expect(sizeBand(schoolmaster)).toBe('m');
    expect(sizeBand(goby)).toBe('xs');
    expect(sizeBand(elkhorn)).toBe('xl');
    expect(sizeBand(E({ id: 'a', sci: 'A b' }))).toBeNull();
    expect(ALL.filter((e) => matches(e, F({ sizes: ['s'], records: true }))).map((e) => e.id)).toEqual(['sphoeroides-testudineus']);
  });
  it('flags threatened, protected and introduced species', () => {
    expect(flagsOf(elkhorn)).toEqual(['threatened', 'protected']);
    expect(flagsOf(lionfish)).toEqual(['introduced']);
    expect(flagsOf(schoolmaster)).toEqual([]);
    expect(ALL.filter((e) => matches(e, F({ flags: ['introduced'] }))).map((e) => e.id)).toEqual(['pterois-volitans']);
  });
  it('counts the filters that are on', () => {
    expect(activeCount(F())).toBe(0);
    expect(activeCount(F({ q: 'x', sort: 'name', encounter: ['dive', 'snorkel'], sizes: ['s'], records: true }))).toBe(4);
  });
});

describe('modes', () => {
  it('splits edible and dangerous', () => {
    expect(ALL.filter((e) => inView(e, 'edible', null)).map((e) => e.id)).toEqual(['lutjanus-apodus', 'pterois-volitans']);
    expect(ALL.filter((e) => inView(e, 'danger', null)).map((e) => e.id)).toEqual(['lutjanus-apodus', 'pterois-volitans', 'sphoeroides-testudineus']);
    expect(ALL.filter((e) => inView(e, 'all', 'corals')).map((e) => e.id)).toEqual(['acropora-palmata']);
    expect(poisonToEat(puffer)).toBe(true);
    // A food fish whose only eating danger is ciguatera shows the ciguatera risk, not "poisonous to eat".
    const cig = { edible: 'caution' as const, risks: ['ciguatera' as const], danger: { kinds: ['toxic-to-eat' as const], level: 2 as const } };
    expect(poisonToEat(cig)).toBe(false);
    expect(riskToEat(cig)).toBe(true);
    expect(poisonToEat({ ...cig, danger: { ...cig.danger, level: 3 as const } })).toBe(true);
    expect(poisonToEat({ ...cig, edible: 'no' as const })).toBe(true);
    expect(riskToEat(schoolmaster)).toBe(true);
    expect(isDanger(elkhorn)).toBe(false);
  });
  it('counts per group and per mode', () => {
    expect(groupCounts(ALL, F(), 'all')).toMatchObject({ fish: 3, corals: 1, crustaceans: 0 });
    expect(groupCounts(ALL, F(), 'edible')).toMatchObject({ fish: 2, corals: 0 });
    expect(modeCounts(ALL, F(), null)).toMatchObject({ all: 4, edible: 2, danger: 3 });
    expect(modeCounts(ALL, F({ records: true }), 'fish')).toMatchObject({ all: 4, edible: 2, danger: 3 });
  });
});

describe('sorting and sections', () => {
  it('sorts most seen first, then by name; records last', () => {
    expect(sortEntries(ALL, 'seen', 'en').map((e) => e.id)).toEqual(['pterois-volitans', 'lutjanus-apodus', 'sphoeroides-testudineus', 'acropora-palmata', 'gobiosoma-sp']);
    expect(sortEntries(ALL, 'size', 'en')[0].id).toBe('acropora-palmata');
    expect(sortEntries(ALL, 'name', 'es').map((e) => e.id).slice(0, 2)).toEqual(['acropora-palmata', 'lutjanus-apodus']);
  });
  it('groups by subgroup in the guide order, groups first', () => {
    const s = sections(ALL, 'sub', 'seen', 'en');
    expect(s.map((x) => x.key)).toEqual(['fish/snappers', 'fish/scorpionfishes-lionfish', 'fish/puffers', 'fish/gobies', 'corals/branching-corals']);
    expect(s[0]).toMatchObject({ title: 'Snappers', sub: 'Lutjanidae', group: 'fish' });
  });
  it('groups by family, genus and order with Latin titles', () => {
    expect(sections([schoolmaster], 'family', 'seen', 'es')[0]).toMatchObject({ title: 'Pargos', sub: 'Lutjanidae' });
    expect(sections([schoolmaster], 'genus', 'seen', 'en')[0]).toMatchObject({ title: 'Lutjanus', sub: 'Snappers', latin: true });
    expect(sections([schoolmaster], 'order', 'seen', 'en')[0]).toMatchObject({ title: 'Perciformes', latin: true });
    expect(sections(ALL, 'none', 'seen', 'en')).toHaveLength(1);
    expect(sections([], 'none', 'seen', 'en')).toHaveLength(0);
  });
  it('splits the danger list by how it hurts, worst first', () => {
    const s = sections(ALL.filter((e) => isDanger(e)), 'risk', 'seen', 'en');
    expect(s.map((x) => [x.key, x.items.map((e) => e.id)])).toEqual([
      ['touch-2', ['pterois-volitans']],
      ['eat-poison', ['sphoeroides-testudineus']],
      ['eat-risk', ['lutjanus-apodus']],
    ]);
  });
});

describe('touchLevel', () => {
  it('ranks spines on a fish that kills when eaten as painful, a venomous one as it is', () => {
    expect(touchLevel({ danger: { kinds: ['toxic-to-eat', 'spines'], level: 3 } })).toBe(1);
    expect(touchLevel({ danger: { kinds: ['toxic-to-eat', 'skin-toxin', 'irritant'], level: 3 } })).toBe(2);
    expect(touchLevel({ danger: { kinds: ['sting', 'venom'], level: 3 } })).toBe(3);
    expect(touchLevel({ danger: { kinds: ['bite', 'toxic-to-eat'], level: 2 } })).toBe(2);
  });
});

describe('expanded species', () => {
  it('hides species not recorded between Gandoca and Cahuita unless expanded or searched for', () => {
    const e = { ...ALL[0], rec: 'none' as const };
    expect(matches(e, F())).toBe(false);
    expect(matches(e, F({ expanded: true }))).toBe(true);
    expect(matches({ ...e, rec: 'here' }, F())).toBe(true);
    expect(matches({ ...e, rec: undefined }, F())).toBe(true);
  });
});
