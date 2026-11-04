import { describe, expect, it } from 'vitest';
import type { RiverFlow } from '../adapters/river-flow';
import { debrisAt } from './debris';

const DAY0 = Date.UTC(2026, 10, 1);
const flow = (q: number[]): RiverFlow => ({ times: q.map((_, i) => DAY0 + i * 864e5), byRiver: { 'RÍO ESTRELLA': { q, median: q.map(() => 100) } }, fetchedAt: 0, fromCache: false });
const rivers = [{ name: 'RÍO ESTRELLA', mouth: [-82.8922, 9.7927] as [number, number] }];
const near: [number, number] = [-82.88, 9.8];
const far: [number, number] = [-82.5, 9.5];

describe('debrisAt', () => {
  it('is none in normal flow, possible at 2.5x and likely at 4x the median', () => {
    expect(debrisAt(flow([100, 120, 150]), ...near, DAY0 + 2 * 864e5, rivers)?.level).toBe('none');
    expect(debrisAt(flow([100, 120, 260]), ...near, DAY0 + 2 * 864e5, rivers)?.level).toBe('possible');
    expect(debrisAt(flow([100, 120, 450]), ...near, DAY0 + 2 * 864e5, rivers)?.level).toBe('likely');
  });
  it('keeps the flag the day after the peak', () => {
    expect(debrisAt(flow([100, 450, 150]), ...near, DAY0 + 2 * 864e5, rivers)?.level).toBe('likely');
    expect(debrisAt(flow([450, 100, 100, 100]), ...near, DAY0 + 3 * 864e5, rivers)?.level).toBe('none');
  });
  it('only applies near a mouth, and is null with no flow for the day', () => {
    expect(debrisAt(flow([450, 450, 450]), ...far, DAY0 + 864e5, rivers)).toBeNull();
    expect(debrisAt(flow([450]), ...near, DAY0 + 20 * 864e5, rivers)).toBeNull();
  });
});
