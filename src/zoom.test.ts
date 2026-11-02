import { describe, expect, it } from 'vitest';
import { LOCK_STEPS, plainFlyMs, MAX_BLOCK, RESOLVE_CELL_PX, cellBlockAt, nextTier, pixelBlockAt, planHops, tierDirection, steppedEase, zoomBlock, zoomOutToFit } from './zoom';

describe('nextTier', () => {
  it('switches tiers once zoom clears the edge by the hysteresis band', () => {
    expect(nextTier('MACRO', 8.2)).toBe('COAST');
    expect(nextTier('COAST', 12.2)).toBe('SPOT');
    expect(nextTier('SPOT', 11.8)).toBe('COAST');
  });
  it('holds the current tier inside the band so a hovering pinch does not flap', () => {
    expect(nextTier('MACRO', 8.1)).toBe('MACRO');
    expect(nextTier('COAST', 7.9)).toBe('COAST');
    expect(nextTier('SPOT', 11.9)).toBe('SPOT');
  });
  it('jumps straight to the right tier on a big move', () => {
    expect(nextTier('MACRO', 14)).toBe('SPOT');
    expect(nextTier('SPOT', 5)).toBe('MACRO');
  });
});

describe('tierDirection', () => {
  it('is +1 zooming in, -1 zooming out', () => {
    expect(tierDirection('MACRO', 'SPOT')).toBe(1);
    expect(tierDirection('SPOT', 'COAST')).toBe(-1);
    expect(tierDirection('COAST', 'COAST')).toBe(0);
  });
});

describe('pixel lock-on', () => {
  it('starts coarse and ends sharp', () => {
    expect(pixelBlockAt(0)).toBe(LOCK_STEPS[0]);
    expect(pixelBlockAt(1)).toBe(1);
    expect(pixelBlockAt(-1)).toBe(LOCK_STEPS[0]);
    expect(pixelBlockAt(2)).toBe(1);
    expect(pixelBlockAt(NaN)).toBe(1);
  });
  it('never gets coarser as t rises', () => {
    let prev = Infinity;
    for (let t = 0; t <= 1; t += 0.01) {
      expect(pixelBlockAt(t)).toBeLessThanOrEqual(prev);
      prev = pixelBlockAt(t);
    }
  });
  it('every block size tiles a resolve cell exactly', () => {
    for (const b of LOCK_STEPS) expect(RESOLVE_CELL_PX % b).toBe(0);
  });
  it('a cell stays coarse until its delay, then resolves within its span', () => {
    expect(cellBlockAt(0.3, 0.4)).toBe(LOCK_STEPS[0]);
    expect(cellBlockAt(0.8, 0.4)).toBe(1);
    expect(cellBlockAt(0.6, 0.4)).toBeLessThan(LOCK_STEPS[0]);
    // Latest-starting cell is sharp by t = 1.
    expect(cellBlockAt(1, 0.6)).toBe(1);
  });
});

describe('planHops', () => {
  it('splits a long zoom into even hops no bigger than the max step', () => {
    const hops = planHops(9, 14);
    expect(hops).toEqual([11.5, 14]);
    const far = planHops(6, 14);
    expect(far).toHaveLength(4);
    expect(far.at(-1)).toBe(14);
    for (let i = 1; i < far.length; i++) expect(far[i] - far[i - 1]).toBeCloseTo(2, 9);
  });
  it('caps the hop count', () => {
    expect(planHops(0, 14)).toHaveLength(4);
  });
  it('is a single hop when already close or past the target zoom', () => {
    expect(planHops(13.9, 14)).toEqual([14]);
    expect(planHops(15, 14)).toEqual([14]);
    expect(planHops(12, 14)).toEqual([14]);
  });
});

describe('zoomBlock', () => {
  it('is sharp at the start of the zoom and coarsest on arrival', () => {
    expect(zoomBlock(9, 9, 11.5)).toBe(1);
    expect(zoomBlock(11.5, 9, 11.5)).toBe(MAX_BLOCK);
  });
  it('grows in equal ratios for equal zoom travelled', () => {
    // 32 = 2^5, so each fifth of the way doubles the block.
    const sizes = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => zoomBlock(10 + 2.5 * f, 10, 12.5));
    expect(sizes).toEqual([1, 2, 4, 8, 16, 32]);
  });
  it('never shrinks as zoom rises and clamps outside the range', () => {
    let prev = 0;
    for (let z = 8; z <= 15; z += 0.05) {
      const b = zoomBlock(z, 9, 14);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
    expect(zoomBlock(5, 9, 14)).toBe(1);
    expect(zoomBlock(20, 9, 14)).toBe(MAX_BLOCK);
  });
});

describe('zoomOutToFit', () => {
  it('is 0 when the point is already well inside the view', () => {
    expect(zoomOutToFit(50, -40, 400, 800)).toBe(0);
  });
  it('pulls back just enough to bring an off-screen point inside the margin', () => {
    // 800 px right of centre on a 400 px wide view: allowed 0.8 * 200 = 160 px -> 5x -> log2(5).
    expect(zoomOutToFit(800, 0, 400, 800)).toBeCloseTo(Math.log2(5), 12);
    // The tighter axis wins.
    expect(zoomOutToFit(100, -1280, 400, 800)).toBeCloseTo(Math.log2(4), 12);
  });
});

describe('steppedEase', () => {
  it('moves in n held steps and lands on 1', () => {
    const e = steppedEase(4);
    expect([0, 0.1, 0.25, 0.49, 0.5, 0.99, 1].map(e)).toEqual([0, 0, 0.25, 0.25, 0.5, 0.75, 1]);
  });
});

describe('plainFlyMs', () => {
  it('grows with distance and zoom change, within clamps', () => {
    expect(plainFlyMs(0, 0)).toBe(2000);
    expect(plainFlyMs(10_000, 2)).toBeGreaterThan(plainFlyMs(10_000, 0));
    expect(plainFlyMs(60_000, 3)).toBeGreaterThan(plainFlyMs(1_000, 3));
    expect(plainFlyMs(1e9, 20)).toBe(6000);
  });
});
