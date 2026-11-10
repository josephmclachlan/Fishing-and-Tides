import { describe, expect, it } from 'vitest';
import { parseSeen, seenCSV, seenMid, seenStats, seenStore, seenText, SEEN_KEY, type VisSeen } from './vis-seen';

const app = (visM: number, visLo: number, visHi: number) => ({ visM, visLo, visHi, cause: 'clear', confidence: 'MED', satKd: 0.05, plumeKd: 0, resKd: 0.01, satAgeD: 1.2, hs: 0.3, tp: 7, depthM: 4, currentMs: 0.1 });
const e = (seen: string, a: VisSeen['app'], t = 1): VisSeen => ({ id: String(t), t, lng: -82.73, lat: 9.65, ...parseSeen(seen)!, app: a });

describe('parseSeen', () => {
  it('reads a value, a lower bound and a range', () => {
    expect(parseSeen('12')).toEqual({ seenM: 12 });
    expect(parseSeen(' 2,5 m')).toEqual({ seenM: 2.5 });
    expect(parseSeen('15+')).toEqual({ seenM: 15, atLeast: true });
    expect(parseSeen('15-25')).toEqual({ seenM: 15, seenHiM: 25 });
    expect(parseSeen('15 – 25')).toEqual({ seenM: 15, seenHiM: 25 });
    expect(parseSeen('10-10')).toEqual({ seenM: 10 });
  });
  it('rejects anything else', () => {
    for (const s of ['', 'far', '25-15', '0', '200', '5-', '-5']) expect(parseSeen(s), s).toBeNull();
  });
  it('writes it back the same way', () => {
    for (const s of ['12', '15+', '15-25']) expect(seenText(parseSeen(s)!)).toBe(s);
    expect(seenMid({ seenM: 10, seenHiM: 40 })).toBeCloseTo(20);
  });
});

describe('seenStats', () => {
  it('gives the median seen / app factor and how many fell in range', () => {
    const xs = [e('20', app(10, 7, 14)), e('15-25', app(15, 11, 20)), e('15+', app(5, 3, 8)), e('9', null)];
    const s = seenStats(xs)!;
    expect(s.n).toBe(3);
    // ratios 2, √375/15 ≈ 1.29, 3: median 2
    expect(s.factor).toBeCloseTo(2);
    // 20 is outside 7–14; 15–25 overlaps 11–20; 15+ is above 3–8.
    expect(s.inRange).toBe(1);
    expect(seenStats([e('9', null)])).toBeNull();
  });
});

describe('seenCSV and the store', () => {
  it('writes one row per entry, oldest first, blanks for unknowns', () => {
    const csv = seenCSV([e('15+', null, 2e12), e('12', app(9, 7, 11), 1e12)]).trim().split('\n');
    expect(csv[0].split(',')).toHaveLength(19);
    expect(csv[1]).toMatch(/^2001-09-09T01:46:40\.000Z,9\.65000,-82\.73000,12,,0,9\.0,7\.0,11\.0,clear,MED,0\.0500,0\.0000,0\.0100,1\.20,0\.30,7\.0,4\.0,0\.10$/);
    expect(csv[2]).toMatch(/,15,,1,,,,,,,,,,,,,$/);
  });
  it('keeps entries in storage and survives junk or a failing write', () => {
    const mem: Record<string, string> = {};
    const s = seenStore({ getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) });
    s.add(e('12', null));
    s.add(e('15+', null, 2));
    expect(s.list().map(seenText)).toEqual(['12', '15+']);
    mem[SEEN_KEY] = '{bad';
    expect(s.list()).toEqual([]);
    const full = seenStore({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    expect(() => full.add(e('12', null))).not.toThrow();
    expect(seenStore(null).list()).toEqual([]);
  });
});
