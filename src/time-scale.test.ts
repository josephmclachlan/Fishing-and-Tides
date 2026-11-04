import { describe, expect, it } from 'vitest';
import { HORIZON_H } from './time';
import { POS_MAX, buttonStepH, hoursToPos, jumpToDay, posToHours, segmentFor, sliderScale } from './time-scale';

// Wed 4 Nov 2026, 14:00 in Costa Rica (20:00 UTC).
const BASE = Date.UTC(2026, 10, 4, 20);
const segs = sliderScale(BASE, -6);

describe('slider scale', () => {
  it('splits into today, six named days and the far outlook', () => {
    expect(segs.map((s) => s.kind)).toEqual(['today', 'day', 'day', 'day', 'day', 'day', 'day', 'later']);
    expect(segs[0]).toMatchObject({ fromH: 0, toH: 10, weekday: 3 }); // 14:00 to midnight, Wednesday
    expect(segs[1]).toMatchObject({ fromH: 10, toH: 34, weekday: 4 }); // Thursday
    expect(segs[6]).toMatchObject({ weekday: 2 }); // Tuesday
    expect(segs[7]).toMatchObject({ fromH: 154, toH: HORIZON_H });
  });

  it('covers the track end to end without gaps', () => {
    expect(segs[0].fromP).toBe(0);
    expect(segs[segs.length - 1].toP).toBe(POS_MAX);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].fromP).toBeCloseTo(segs[i - 1].toP);
      expect(segs[i].fromH).toBe(segs[i - 1].toH);
    }
  });

  it('gives each hour of today more room than an hour later in the week', () => {
    const today = (segs[0].toP - segs[0].fromP) / (segs[0].toH - segs[0].fromH);
    const day = (segs[1].toP - segs[1].fromP) / 24;
    expect(today).toBeGreaterThan(day * 3);
  });

  it('round-trips hours and positions, and is monotonic', () => {
    for (const h of [0, 1, 5, 9, 10, 33, 100, 153, 154, 400, HORIZON_H]) expect(posToHours(segs, hoursToPos(segs, h))).toBeCloseTo(h);
    let last = -1;
    for (let p = 0; p <= POS_MAX; p += 7) {
      const h = posToHours(segs, p);
      expect(h).toBeGreaterThanOrEqual(last);
      last = h;
    }
    expect(posToHours(segs, POS_MAX)).toBe(HORIZON_H);
  });

  it('keeps a usable today stretch late in the evening', () => {
    const late = sliderScale(Date.UTC(2026, 10, 5, 5), -6); // 23:00 local
    expect(late[0].toH).toBe(1);
    expect(late[0].toP).toBeGreaterThan(100);
  });

  it('steps an hour today, three hours in the week, a day after', () => {
    expect(buttonStepH(segs, 0, 1)).toBe(1);
    expect(buttonStepH(segs, 20, 1)).toBe(3);
    expect(buttonStepH(segs, 10, -1)).toBe(1); // stepping back from Thursday 00:00 into today
    expect(buttonStepH(segs, 200, 1)).toBe(24);
    expect(segmentFor(segs, 9).kind).toBe('today');
  });

  it('jumps to a day at the same local clock hour', () => {
    // Viewing 16:00 today (h = 2): Saturday's tab lands on Saturday 16:00.
    const sat = segs.find((s) => s.weekday === 6)!;
    const h = jumpToDay(segs, sat, 2);
    expect(h).toBe(sat.fromH + 16);
    // Back to today from Saturday 06:00 lands on the first hour still ahead.
    expect(jumpToDay(segs, segs[0], sat.fromH + 6)).toBe(0);
    // Today from Saturday 18:00 lands on today 18:00 (4 h ahead of 14:00).
    expect(jumpToDay(segs, segs[0], sat.fromH + 18)).toBe(4);
  });
});
