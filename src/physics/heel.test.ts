import { describe, expect, it } from 'vitest';
import { boomDeg, coastPose, heelDeg, NO_GO_DEG, REEF_HEEL_DEG, sideForce } from './heel';

describe('sideForce', () => {
  it('is all sideways close-hauled and nothing dead downwind', () => {
    expect(sideForce(30)).toBe(1);
    expect(sideForce(45)).toBe(1);
    expect(sideForce(90)).toBeCloseTo(0.75, 6);
    expect(sideForce(135)).toBeCloseTo(0.25, 6);
    expect(sideForce(180)).toBeCloseTo(0, 6);
  });
});

describe('heelDeg', () => {
  it('follows the rule of thumb for a cruising keelboat', () => {
    expect(heelDeg(0, 45)).toBe(0);
    expect(heelDeg(10, 45)).toBeCloseTo(9.0, 0);
    expect(heelDeg(15, 45)).toBeCloseTo(17.7, 0);
    expect(heelDeg(20, 45)).toBeGreaterThan(REEF_HEEL_DEG);
    expect(heelDeg(60, 45)).toBeLessThan(45);
  });
  it('heels less as the wind comes aft', () => {
    expect(heelDeg(15, 90)).toBeLessThan(heelDeg(15, 50));
    expect(heelDeg(15, 135)).toBeLessThan(heelDeg(15, 90));
    expect(heelDeg(15, 180)).toBeCloseTo(0, 6);
  });
});

describe('boomDeg', () => {
  it('is sheeted in upwind and eased out downwind', () => {
    expect(boomDeg(45)).toBeCloseTo(10.2, 1);
    expect(boomDeg(90)).toBeCloseTo(37.2, 1);
    expect(boomDeg(180)).toBe(85);
    expect(boomDeg(20)).toBe(6);
  });
});

describe('coastPose', () => {
  it('takes the leg closer to the wind: ENE trade wind on a 122° coast', () => {
    const p = coastPose(60, 122);
    expect(p.courseDeg).toBe(122);
    expect(p.headingDeg).toBe(122);
    expect(p.twa).toBe(62);
    expect(p.sail).toBe('closeReach');
    expect(p.beat).toBe(false);
    // Wind from 060 is on the port bow of a boat heading 122: port tack, heels to starboard.
    expect(p.tack).toBe('port');
    expect(p.other).toEqual({ courseDeg: 302, twa: 118, sail: 'broadReach' });
  });
  it('beats close-hauled when the coast course is in the no-go zone', () => {
    const p = coastPose(130, 122);
    expect(p.beat).toBe(true);
    expect(p.courseDeg).toBe(122);
    expect(p.twa).toBe(45);
    expect(p.tack).toBe('starboard');
    expect(p.headingDeg).toBe(85);
    const q = coastPose(110, 122);
    expect(q.tack).toBe('port');
    expect(q.headingDeg).toBe(155);
    expect(q.twa).toBeGreaterThanOrEqual(NO_GO_DEG);
  });
  it('a northerly takes the NW leg upwind on the starboard tack', () => {
    const p = coastPose(0, 122);
    expect(p.courseDeg).toBe(302);
    expect(p.twa).toBe(58);
    expect(p.tack).toBe('starboard');
  });
});
