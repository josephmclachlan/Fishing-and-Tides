import { describe, expect, it } from 'vitest';
import { pushOf } from './view';
import type { PaddleDetail } from '../metrics/registry';

const base = { craft: 'kayak', effWindKt: 10, windFromDeg: 270, facingDeg: 90 } as unknown as PaddleDetail;

describe('wind push (PADDLE)', () => {
  it('a wind from the land blows out to sea: arrow straight out, offshore', () => {
    const p = pushOf(base);
    expect(p.side).toBe('offshore');
    expect(Math.abs(p.rel!)).toBeLessThan(1);
    expect(p.lv).toBeLessThanOrEqual(2);
  });
  it('a wind from the sea blows toward the beach', () => {
    expect(pushOf({ ...base, windFromDeg: 90 }).side).toBe('onshore');
  });
  it('a wind along the shore is cross', () => {
    expect(pushOf({ ...base, windFromDeg: 0 }).side).toBe('cross');
  });
  it('under 3 kt is calm; no wind direction gives no arrow', () => {
    expect(pushOf({ ...base, effWindKt: 2 }).side).toBe('calm');
    expect(pushOf({ ...base, windFromDeg: null }).rel).toBeNull();
  });
});
