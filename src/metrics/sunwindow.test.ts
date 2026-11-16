import { describe, expect, it } from 'vitest';
import { daySky } from '../physics/astro';
import { daylightHours, sunHours } from './forecast';
import { bestWindow } from '../physics/outing';

const DAY0 = Date.UTC(2026, 10, 4, 6); // local midnight at UTC-6
const LNG = -82.75, LAT = 9.65;

describe('best windows follow the sun (Joseph, 2026-11-11)', () => {
  it('sunHours is sunrise to sunset in whole hours, wider by the pad', () => {
    const sun = daySky(DAY0, LAT, LNG).sun;
    const r = sunHours(DAY0, LAT, LNG);
    expect(r.fromH).toBe(Math.ceil((sun.sunrise! - DAY0) / 3.6e6));
    expect(r.toH).toBe(Math.floor((sun.sunset! - DAY0) / 3.6e6));
    // Never before sunrise or after sunset (a 05:00 surf window with a 05:25 sunrise, review 2026-11-16).
    expect(DAY0 + r.fromH * 3.6e6).toBeGreaterThanOrEqual(sun.sunrise!);
    expect(DAY0 + r.toH * 3.6e6).toBeLessThanOrEqual(sun.sunset!);
    const p = sunHours(DAY0, LAT, LNG, 1);
    expect(p).toEqual({ fromH: Math.round((sun.sunrise! - DAY0) / 3.6e6 - 1), toH: Math.round((sun.sunset! - DAY0) / 3.6e6 + 1) });
  });
  it('the outing search reads only hours it is given, the day daylight', () => {
    const seen: number[] = [];
    bestWindow((_ms, h) => (seen.push(h), { score: 50, reasons: [] }), DAY0, { fromH: 6, toH: 17 });
    expect(seen[0]).toBe(6);
    expect(seen[seen.length - 1]).toBe(16);
  });
});

import { bestWindow as ribbonBest } from '../spot-charts';
import { todayOver } from './best-today';

describe('snorkel and dive windows start after sunrise and end by sunset', () => {
  it('daylightHours sits inside sunrise and sunset', () => {
    const sun = daySky(DAY0, LAT, LNG).sun;
    const r = daylightHours(DAY0, LAT, LNG);
    expect(r.fromH * 3.6e6 + DAY0).toBeGreaterThanOrEqual(sun.sunrise! + 0.5 * 3.6e6 - 1);
    expect(r.toH * 3.6e6 + DAY0).toBeLessThanOrEqual(sun.sunset!);
  });
});

describe('the map follows the sun too', () => {
  it('the spot ribbon searches only the span it is given', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h === 5 || h === 18 ? 1 : 0.5));
    expect(ribbonBest(scores, { fromH: 6, toH: 18 })).toEqual({ from: 6, to: 8 });
    expect(ribbonBest(scores)?.from).toBe(5);
  });
  it('today is over once the last window before sunset has started (an hour after for fishing)', () => {
    const sun = sunHours(DAY0, LAT, LNG);
    const last = DAY0 + (sun.toH - 1) * 3.6e6; // 2 h windows: the last starts toH - 2, so this hour has started it
    expect(todayOver(-6, last + 1, 'surf', [LNG, LAT])).toBe(true);
    expect(todayOver(-6, DAY0 + (sun.toH - 2) * 3.6e6 - 1, 'surf', [LNG, LAT])).toBe(false);
    expect(todayOver(-6, last + 1, 'fish', [LNG, LAT])).toBe(false);
  });
});
