import { describe, expect, it } from 'vitest';
import { catchRecords, catchStats } from './catches';

const pins = [
  { kind: 'catch', lng: 1, lat: 2, t: 1, species: 'snook', bite: 70, biteDay: 50 },
  { kind: 'catch', lng: 3, lat: 4, t: 2, species: 'snook', bite: 60, biteDay: 40 },
  { kind: 'catch', lng: 5, lat: 6, t: 3, species: 'mahi' },
  { kind: 'mark', lng: 7, lat: 8, t: 4 },
];

describe('your catches (PLAN 7.16)', () => {
  it('turns catch pins into records per species', () => {
    expect(catchRecords(pins, 'snook')).toEqual([[1, 2, 1970], [3, 4, 1970]]);
    expect(catchRecords(pins, 'jack')).toEqual([]);
  });
  it('compares BITE at the catch with its day', () => {
    expect(catchStats(pins)).toEqual({ n: 2, bite: 65, day: 45 });
    expect(catchStats(pins, 'mahi')).toBeNull();
    expect(catchStats([])).toBeNull();
  });
});
