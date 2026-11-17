import { describe, expect, it } from 'vitest';
import { fits, groupsOf, guessLook, identify, idScore, noAnswers, stepsFor, subsOf, type IdAnswers } from './identify';
import type { Entry } from './types';

const E = (id: string, o: Partial<Entry>): Entry => ({ id, tier: 'full', sci: id, group: 'fish', sub: 'snappers', en: [id], es: [], ...o }) as Entry;
const porkfish = E('porkfish', { size: { common: 25, unit: 'cm' }, seen: 'frequent', look: { colors: ['yellow', 'black', 'silver'], pattern: ['bars', 'stripes'], position: ['reef'] } });
const tarpon = E('tarpon', { size: { common: 150, unit: 'cm' }, seen: 'occasional', look: { colors: ['silver'], pattern: ['plain'], position: ['midwater'] } });
const nurse = E('nurse', { group: 'sharks-rays', sub: 'sharks', size: { common: 230, unit: 'cm' }, look: { colors: ['brown'], pattern: ['plain'], position: ['bottom'] } });
const stingray = E('stingray', { group: 'sharks-rays', sub: 'rays', size: { common: 90, unit: 'cm' } });
const grass = E('turtle-grass', { group: 'plants-algae', sub: 'seagrass', look: { colors: ['green'], pattern: ['plain'], position: ['attached'] } });
const LIST = [porkfish, tarpon, nurse, stingray, grass];
const A = (o: Partial<IdAnswers>): IdAnswers => ({ ...noAnswers(), ...o });

describe('identify', () => {
  it('keeps animals and plants apart and holds to the group', () => {
    expect(idScore(grass, A({ kind: 'animal' }))).toBeNull();
    expect(idScore(porkfish, A({ kind: 'plant' }))).toBeNull();
    expect(idScore(nurse, A({ group: 'fish' }))).toBeNull();
    expect(identify(LIST, A({ kind: 'plant' })).map((r) => r.e.id)).toEqual(['turtle-grass']);
  });
  it('ranks by size, colour, marks and place', () => {
    const r = identify(LIST, A({ kind: 'animal', group: 'fish', size: 'm', colors: ['yellow'], pattern: ['bars'], position: ['reef'] }));
    expect(r[0].e.id).toBe('porkfish');
    expect(fits(r).map((x) => x.e.id)).toEqual(['porkfish']);
  });
  it('does not punish a species with no look described', () => {
    expect(idScore(stingray, A({ colors: ['brown'] }))).toBe(0);
  });
  it('asks the kind only where a group has a few', () => {
    expect(subsOf(LIST, 'sharks-rays')).toEqual(['sharks', 'rays']);
    expect(subsOf(LIST, 'fish')).toEqual([]);
    expect(stepsFor(LIST, A({ kind: 'animal', group: 'sharks-rays' }))).toContain('sub');
    // Joseph 2026-11-17: the first question is what kind of thing it was (fish, shark, turtle, plant, coral...).
    expect(stepsFor(LIST, A({}))[0]).toBe('group');
    expect(stepsFor(LIST, A({}))).not.toContain('kind' as never);
  });
});

describe('the first question', () => {
  it('offers every group, plants included, in one grid', () => {
    expect(groupsOf()).toContain('plants-algae');
    expect(groupsOf()).toContain('reptiles-mammals');
    expect(groupsOf().length).toBe(12);
  });
  it('holds plants to their own group', () => {
    expect(identify(LIST, A({ group: 'plants-algae' })).map((r) => r.e.id)).toEqual(['turtle-grass']);
  });
});

describe('guessLook', () => {
  it('reads colours and marks from the ID text', () => {
    const l = guessLook('Silvery with five dark vertical bars and a yellow tail; juveniles spotted.', ['reef', 'sand'], 'fish')!;
    expect(l.colors).toEqual(['yellow', 'silver']);
    expect(l.pattern).toEqual(['bars', 'spots']);
    expect(l.position).toEqual(['reef', 'bottom']);
    expect(l.guessed).toBe(true);
  });
  it('puts corals and plants in place, and says nothing when it knows nothing', () => {
    expect(guessLook('', ['reef'], 'corals')!.position).toEqual(['attached', 'reef']);
    expect(guessLook('', [], 'fish')).toBeUndefined();
  });
});
