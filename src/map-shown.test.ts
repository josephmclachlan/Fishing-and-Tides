import { afterEach, describe, expect, it } from 'vitest';
import { holdMapWork, mapWorkHeld, onMapWork, releaseMapWork, resetMapWork, whenMapShown } from './map-shown';

describe('map work held until the map is shown', () => {
  afterEach(resetMapWork);
  it('runs at once when nothing holds it', () => {
    const ran: string[] = [];
    whenMapShown('a', () => ran.push('a'));
    expect(ran).toEqual(['a']);
  });
  it('waits while held, keeps only the newest job per key, then runs them in order', () => {
    const ran: string[] = [];
    holdMapWork();
    expect(mapWorkHeld()).toBe(true);
    whenMapShown('sst', () => ran.push('sst 1'));
    whenMapShown('rip', () => ran.push('rip'));
    whenMapShown('sst', () => ran.push('sst 2'));
    expect(ran).toEqual([]);
    const tasks: (() => void)[] = [];
    releaseMapWork((fn) => tasks.push(fn));
    while (tasks.length) tasks.shift()!();
    expect(ran).toEqual(['sst 2', 'rip']);
    // Once shown, jobs run straight away and holding again does nothing.
    holdMapWork();
    whenMapShown('x', () => ran.push('x'));
    expect(ran.at(-1)).toBe('x');
  });
  it('keeps going when a job throws', () => {
    const ran: string[] = [];
    holdMapWork();
    whenMapShown('bad', () => {
      throw new Error('boom');
    });
    whenMapShown('good', () => ran.push('good'));
    const tasks: (() => void)[] = [];
    releaseMapWork((fn) => tasks.push(fn));
    while (tasks.length) tasks.shift()!();
    expect(ran).toEqual(['good']);
  });
  it('reports progress to the map loader, at once for a late watcher', () => {
    holdMapWork();
    whenMapShown('a', () => {});
    whenMapShown('b', () => {});
    const seen: string[] = [];
    onMapWork((d, t) => seen.push(`${d}/${t}`));
    const tasks: (() => void)[] = [];
    releaseMapWork((fn) => tasks.push(fn));
    while (tasks.length) tasks.shift()!();
    expect(seen).toEqual(['0/2', '1/2', '2/2']);
    const late: string[] = [];
    onMapWork((d, t) => late.push(`${d}/${t}`));
    expect(late).toEqual(['2/2']);
  });
});
