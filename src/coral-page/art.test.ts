/**
 * The CORAL page's reef picture (PLAN 7.69): the scene follows the two readings only, and the canvas paints
 * every state without a NaN.
 */
import { describe, expect, it } from 'vitest';
import { recCtx } from '../forecast/testkit';
import { drawReef, reefScene } from './art';
import { bleachShare, murkShare } from './view';

const INK = [20, 10, 5] as const, FIELD = [240, 150, 60] as const;

describe('reef picture (PLAN 7.69)', () => {
  it('fills the corals by health and thins the fish with murk, from the readings', () => {
    const calm = reefScene(390, 250, { bleach: bleachShare(0), murk: murkShare(0) });
    const hot = reefScene(390, 250, { bleach: bleachShare(12), murk: murkShare(5) });
    expect(calm.fill).toBe(1);
    expect(hot.fill).toBe(0);
    expect(calm.fish).toBe(7);
    expect(hot.fish).toBe(0);
    expect(hot.snow).toBeGreaterThan(calm.snow);
    // DHW 4 (bleaching likely) is about a quarter of the way to fully white.
    expect(reefScene(390, 250, { bleach: bleachShare(4), murk: 0 }).fill).toBeCloseTo(1 - 3 / 11, 9);
    // Fixed illustration: the coral heads sit inside the box.
    for (const c of calm.corals) expect(c.x).toBeGreaterThanOrEqual(0), expect(c.x).toBeLessThanOrEqual(390);
  });
  it('paints clear, hot and murky water at phone and desktop sizes, moving and still, with its captions', () => {
    for (const [w, h] of [[358, 250], [700, 480], [10, 10]])
      for (const bleach of [0, 0.5, 1])
        for (const murk of [0, 0.5, 1])
          for (const reduced of [false, true]) {
            const c = recCtx();
            drawReef(c, w, h, 12.3, { bleach, murk, heat: 'DHW 3.4', mud: 'MUD 4.6', on: INK, field: FIELD, reduced });
            if (w > 20) expect(c.texts).toEqual(['DHW 3.4', 'MUD 4.6']);
          }
  });
  it('leaves the captions out without data', () => {
    const c = recCtx();
    drawReef(c, 358, 250, 0, { bleach: 0, murk: 0, heat: '', mud: '', on: INK, field: FIELD, reduced: true });
    expect(c.texts).toEqual([]);
  });
});
