import { describe, expect, it } from 'vitest';
import { agreement, freshness, inRange, runChecks, worstOf } from './types';

const H = 3.6e6;

describe('verify helpers', () => {
  it('grades freshness against the cadence', () => {
    expect(freshness(1 * H, 6 * H).status).toBe('pass');
    expect(freshness(13 * H, 6 * H).status).toBe('warn');
    expect(freshness(25 * H, 6 * H).status).toBe('fail');
    expect(freshness(NaN, H).status).toBe('fail');
  });
  it('checks physical ranges, ignoring NaN up to a limit', () => {
    expect(inRange([0.5, 1.2, NaN], 0, 8, 'm').status).toBe('pass');
    expect(inRange([0.5, 12], 0, 8, 'm')).toMatchObject({ status: 'fail' });
    expect(inRange([NaN, NaN], 0, 8, 'm').status).toBe('fail');
    expect(inRange([1, NaN, NaN, NaN], 0, 8, 'm', 0.5).status).toBe('warn');
  });
  it('compares two sources', () => {
    expect(agreement([1, 2, 3], [1.01, 2, 2.99], 0.05, 'm').status).toBe('pass');
    expect(agreement([1, 2, 3], [1.1, 2.1, 3.1], 0.05, 'm').status).toBe('fail');
    expect(agreement([1], [NaN], 0.05, 'm').status).toBe('warn');
  });
  it('turns a throwing check into a red result', async () => {
    const r = await runChecks([
      { feed: 'a', kind: 'reach', label: 'up', run: async () => ({ status: 'pass', detail: 'ok' }) },
      { feed: 'b', kind: 'reach', label: 'up', run: async () => { throw new Error('boom'); } },
    ], () => 7);
    expect(r[1]).toMatchObject({ feed: 'b', status: 'fail', detail: 'boom', at: 7 });
    expect(worstOf(r)).toBe('fail');
  });
});
