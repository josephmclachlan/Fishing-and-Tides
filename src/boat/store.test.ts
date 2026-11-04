import { describe, expect, it, vi } from 'vitest';
import { createBoatStore } from './store';

const mem = () => {
  const m: Record<string, string> = {};
  return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v) };
};

describe('boat store', () => {
  it('ignores fixes until recording and filters near-duplicates', () => {
    const s = createBoatStore(mem());
    expect(s.addFix({ t: 1, lng: 0, lat: 0 })).toBe(false);
    s.start();
    expect(s.addFix({ t: 1, lng: 0, lat: 0 })).toBe(true);
    expect(s.addFix({ t: 2, lng: 0, lat: 0.000001 })).toBe(false);
    expect(s.state().points).toHaveLength(1);
  });
  it('persists across a restart, including pins and the recording flag', () => {
    const st = mem();
    const a = createBoatStore(st, 1);
    a.start();
    a.addFix({ t: 1, lng: 0, lat: 0 });
    a.addPin({ lng: 1, lat: 1, t: 5 }, 'catch', { species: 'tuna', depthM: 80 });
    const b = createBoatStore(st);
    expect(b.state().recording).toBe(true);
    expect(b.state().points).toHaveLength(1);
    expect(b.state().pins[0]).toMatchObject({ kind: 'catch', species: 'tuna', depthM: 80 });
  });
  it('removes pins, clears the log and notifies', () => {
    const s = createBoatStore(mem());
    const fn = vi.fn();
    s.subscribe(fn);
    const pin = s.addPin({ lng: 0, lat: 0, t: 1 }, 'mark');
    s.removePin(pin.id);
    expect(s.state().pins).toEqual([]);
    s.addPin({ lng: 0, lat: 0, t: 2 }, 'mark');
    s.clear();
    expect(s.state().pins).toEqual([]);
    expect(fn).toHaveBeenCalledTimes(4);
  });
  it('clear keeps the catch log (PLAN 7.16)', () => {
    const s = createBoatStore(mem());
    s.addPin({ lng: 0, lat: 0, t: 1 }, 'mark');
    s.addPin({ lng: 1, lat: 1, t: 2 }, 'catch', { species: 'snook', bite: 70, biteDay: 50 });
    s.clear();
    expect(s.state().pins).toHaveLength(1);
    expect(s.state().pins[0]).toMatchObject({ kind: 'catch', species: 'snook', bite: 70, biteDay: 50 });
  });
  it('survives corrupt or blocked storage', () => {
    const bad = { getItem: () => '{nope', setItem: () => { throw new Error('full'); } };
    const s = createBoatStore(bad);
    s.start();
    s.addPin({ lng: 0, lat: 0, t: 1 }, 'mark');
    expect(s.state().pins).toHaveLength(1);
  });
});
