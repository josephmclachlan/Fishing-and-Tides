import { describe, expect, it } from 'vitest';
import { groupByFeed, lastRunAt, loadResults, saveResults } from './report';
import type { CheckResult } from './types';

const r = (feed: string, status: CheckResult['status'], label = 'x', at = 1000): CheckResult => ({ feed, kind: 'fresh', label, status, detail: 'd', at });
const mem = () => {
  const m: Record<string, string> = {};
  return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v) };
};

describe('groupByFeed', () => {
  it('takes the worst status per feed and sorts failures first, keeping first-seen order otherwise', () => {
    const g = groupByFeed([r('wind', 'pass'), r('obis', 'pass'), r('wind', 'warn', 'stale'), r('gbif', 'fail', 'down'), r('obis', 'pass')]);
    expect(g.map((x) => [x.feed, x.status])).toEqual([['gbif', 'fail'], ['wind', 'warn'], ['obis', 'pass']]);
    expect(g[1].passed).toBe(1);
    expect(g[1].worst?.label).toBe('stale');
    expect(g[2].worst).toBeNull();
  });
  it('is empty for no results', () => {
    expect(groupByFeed([])).toEqual([]);
  });
});

describe('stored results', () => {
  it('round-trips and reports when the run happened', () => {
    const s = mem();
    const rs = [r('wind', 'pass', 'a', 5000), r('obis', 'fail', 'b', 3000)];
    saveResults(s, rs);
    expect(loadResults(s)).toEqual(rs);
    expect(lastRunAt(rs)).toBe(3000);
    expect(lastRunAt([])).toBeNull();
  });
  it('drops junk, bad JSON and missing storage', () => {
    const s = mem();
    s.setItem('ft.check', JSON.stringify([r('wind', 'pass'), { feed: 'x' }, { ...r('a', 'pass'), status: 'green' }]));
    expect(loadResults(s)).toHaveLength(1);
    s.setItem('ft.check', '{oops');
    expect(loadResults(s)).toEqual([]);
    expect(loadResults(undefined)).toEqual([]);
  });
});
