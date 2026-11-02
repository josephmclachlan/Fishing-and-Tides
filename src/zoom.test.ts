import { describe, expect, it } from 'vitest';
import { LOCK_STEPS, RESOLVE_CELL_PX, cellBlockAt, nextTier, pixelBlockAt, tierDirection } from './zoom';

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
