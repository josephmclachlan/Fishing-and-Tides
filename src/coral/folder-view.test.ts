import { describe, expect, it } from 'vitest';
import { conditionRows, dateInputMs, localDay, measureRows, nextMission, overdue, parseTags, photosNewestFirst } from './folder-view';
import { upgradeSite } from './store';

const DAY = 864e5;
const site = (extra: object) => upgradeSite({ id: 's', kind: 'reef', lng: 0, lat: 0, visits: [], ...extra })!;

describe('coral folder view', () => {
  it('lists only the measurements a visit has, with units', () => {
    expect(measureRows({ secchiM: 7.25, bleachPct: 12, outplanted: 20 })).toEqual([['coral.m.bleachPct', '12%'], ['coral.m.secchiM', '7.3 m'], ['coral.m.outplanted', '20']]);
    expect(measureRows({})).toEqual([]);
  });
  it('turns a conditions snapshot into rows, with translatable levels', () => {
    expect(conditionRows({ at: 0, dhw: 4.26, alert: 3, sstC: 30.12, sstAnomalyC: 1.04, flowRatio: 2.35, sargassum: 'LOW' })).toEqual([
      ['coral.c.dhw', '4.3'], ['coral.c.alert', '@coral.alert.alert1'], ['coral.c.sst', '30.1 °C (+1.0)'], ['coral.c.river', '2.4×'], ['coral.c.sargassum', '@sarg.level.LOW'],
    ]);
    expect(conditionRows(undefined)).toEqual([]);
  });
  it('picks the next open mission, else the most overdue, and flags overdue ones', () => {
    const now = 10 * DAY + 3600e3;
    const s = site({ missions: [{ id: 'a', t: 5 * DAY, goal: 'old' }, { id: 'b', t: 8 * DAY, goal: 'late' }, { id: 'c', t: 12 * DAY, goal: 'soon' }, { id: 'd', t: 11 * DAY, goal: 'done', doneVisitId: 'v' }] });
    expect(nextMission(s, now)?.id).toBe('c');
    expect(nextMission(site({ missions: [{ id: 'a', t: 5 * DAY, goal: '' }, { id: 'b', t: 8 * DAY, goal: '' }] }), now)?.id).toBe('b');
    expect(nextMission(site({}), now)).toBeNull();
    expect(overdue(s.missions[0], now)).toBe(true);
    expect(overdue(s.missions[2], now)).toBe(false);
  });
  it('sorts photos newest first by taken time, falling back to added time', () => {
    const s = site({ photos: [{ id: 'a', addedAt: 5 }, { id: 'b', addedAt: 1, takenAt: 9 }, { id: 'c', addedAt: 7 }] });
    expect(photosNewestFirst(s).map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
  it('parses tags and dates, and shows days in Costa Rica time', () => {
    expect(parseTags(' before, colony 3,,before ,after')).toEqual(['before', 'colony 3', 'after']);
    expect(dateInputMs('2026-11-05')).toBe(Date.UTC(2026, 10, 5, 12));
    expect(dateInputMs('5/11/2026')).toBeNull();
    expect(localDay(dateInputMs('2026-11-05')!)).toBe('2026-11-05');
    // 03:00 UTC on the 5th is still the 4th in Costa Rica.
    expect(localDay(Date.UTC(2026, 10, 5, 3))).toBe('2026-11-04');
  });
});
