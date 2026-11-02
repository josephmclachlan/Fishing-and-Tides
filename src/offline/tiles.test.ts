import { describe, expect, it } from 'vitest';
import { countRange, eachTile, latToY, lonToX, tileKey, tilesIn, tileUrl, tripPlan } from './tiles';
import { REGION } from '../region';

describe('tile maths', () => {
  it('matches known tiles', () => {
    // Limón (−83.03, 9.99) at z14: x = 0.26936·16384 = 4413.2, y = 0.47211·16384 = 7735.0 (worked by hand).
    expect(lonToX(-83.03, 14)).toBe(4413);
    expect(latToY(9.99, 14)).toBe(7735);
    expect([lonToX(0, 1), latToY(0.0001, 1), latToY(-0.0001, 1)]).toEqual([1, 0, 1]);
    expect([lonToX(-180, 3), lonToX(180, 3), latToY(89.9, 3), latToY(-89.9, 3)]).toEqual([0, 7, 0, 7]);
  });

  it('covers the bounds with an inclusive range', () => {
    const r = tilesIn(REGION.bounds, 12);
    expect(r.x0).toBeLessThanOrEqual(r.x1);
    expect(r.y0).toBeLessThanOrEqual(r.y1);
    expect([...eachTile(r)].length).toBe(countRange(r));
    for (const [lng, lat] of [REGION.bounds[0], REGION.bounds[1]]) {
      const x = lonToX(lng, 12);
      const y = latToY(lat, 12);
      expect(x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1).toBe(true);
    }
  });
});

describe('trip plan', () => {
  it('runs z0 to z14 once each and stays a phone-sized download', () => {
    const plan = tripPlan();
    expect(plan.map((r) => r.z)).toEqual([...Array(15).keys()]);
    const total = plan.reduce((s, r) => s + countRange(r), 0);
    expect(total).toBeGreaterThan(1500);
    expect(total).toBeLessThan(3000);
    expect(countRange(plan[0])).toBe(1);
  });
});

describe('tileKey', () => {
  it('folds the weekly planet folder out of vector tile URLs', () => {
    const a = 'https://tiles.openfreemap.org/planet/20261025_080012_pt/14/4413/7735.pbf';
    const b = 'https://tiles.openfreemap.org/planet/20261101_080010_pt/14/4413/7735.pbf';
    expect(tileKey(a)).toBe('https://tiles.openfreemap.org/planet/v/14/4413/7735.pbf');
    expect(tileKey(a)).toBe(tileKey(b));
  });
  it('leaves everything else alone', () => {
    for (const u of ['https://tiles.openfreemap.org/planet', 'https://tiles.openfreemap.org/natural_earth/ne2sr/3/2/1.png', 'https://tiles.openfreemap.org/styles/dark'])
      expect(tileKey(u)).toBe(u);
  });
  it('fills a template', () => {
    expect(tileUrl('https://x/{z}/{x}/{y}.png', 3, 2, 1)).toBe('https://x/3/2/1.png');
  });
});
