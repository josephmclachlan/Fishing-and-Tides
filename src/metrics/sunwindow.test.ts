import { describe, expect, it } from 'vitest';
import { daySky } from '../physics/astro';
import { sunHours } from './forecast';
import { bestWindow } from '../physics/outing';

const DAY0 = Date.UTC(2026, 10, 4, 6); // local midnight at UTC-6
const LNG = -82.75, LAT = 9.65;

describe('best windows follow the sun (Joseph, 2026-11-11)', () => {
  it('sunHours is sunrise to sunset in whole hours, wider by the pad', () => {
    const sun = daySky(DAY0, LAT, LNG).sun;
    const r = sunHours(DAY0, LAT, LNG);
    expect(r.fromH).toBe(Math.round((sun.sunrise! - DAY0) / 3.6e6));
    expect(r.toH).toBe(Math.round((sun.sunset! - DAY0) / 3.6e6));
    expect(r.fromH).toBeGreaterThanOrEqual(5);
    expect(r.toH).toBeLessThanOrEqual(18);
    expect(sunHours(DAY0, LAT, LNG, 1)).toEqual({ fromH: r.fromH - 1, toH: r.toH + 1 });
  });
  it('the outing search reads only the hours between sunrise and sunset', () => {
    const seen: number[] = [];
    bestWindow((_ms, h) => (seen.push(h), { score: 50, reasons: [] }), DAY0, { fromH: 6, toH: 17 });
    expect(seen[0]).toBe(6);
    expect(seen[seen.length - 1]).toBe(16);
  });
});
