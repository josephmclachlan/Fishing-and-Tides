import { describe, expect, it } from 'vitest';
import { DETAIL_FOR, readDetails, splitValue, toneLevel } from './detail';

/** A stand-in for the old CONDITIONS panel: id → [text, classes]. */
const panel = (rows: Record<string, [string, string?]>) =>
  ({
    querySelector: (sel: string) => {
      const r = rows[sel.slice(1)];
      if (!r) return null;
      const cls = (r[1] ?? '').split(' ').filter(Boolean);
      return { textContent: r[0], classList: { contains: (c: string) => cls.includes(c) } };
    },
  }) as unknown as ParentNode;

describe('in detail rows', () => {
  it('splits a number from its unit, and leaves words whole', () => {
    expect(splitValue('1.4 m/s')).toEqual({ v: '1.4', u: 'm/s' });
    expect(splitValue('  12  ')).toEqual({ v: '12', u: '' });
    expect(splitValue('HIGH · WANTS MID')).toEqual({ v: 'HIGH · WANTS MID', u: '' });
    expect(splitValue('4', 'kW/m')).toEqual({ v: '4', u: 'kW/m' });
  });

  it('reads the old colours as levels', () => {
    expect(toneLevel(['seg', 'red'])).toBe(0);
    expect(toneLevel(['seg', 'sm'])).toBe(2);
    expect(toneLevel(['seg', 'green'])).toBe(4);
  });

  it('lifts the activity rows out of the panel and leaves out the empty ones', () => {
    const root = panel({
      'sz-rips': ['MODERATE 0.6', 'seg sm red'],
      'sz-ripl': ['40'],
      'dv-sting': ['LIKELY', 'seg sm red'],
      'dv-runoff': ['NONE', 'seg sm'],
      'wx-squall': ['--', 'seg sm'],
      'wx-rain24': ['3'],
      'tr-cahuita': ['0.2 MM · 30%'],
      'tr-manzanillo': ['--'],
    });
    const rows = readDetails(root, 'swim');
    expect(rows.map((r) => r.k)).toEqual(['rips', 'sting', 'runoff', 'rain24', 'towns']);
    expect(rows[0]).toMatchObject({ v: '0.6', u: 'm/s', s: 'MODERATE · reaches 40 m', lv: 0 });
    expect(rows[1].lv).toBe(0); // a warning row: red is very poor...
    expect(rows[2].lv).toBeNull(); // ...anything else is a plain fact
    expect(rows[3]).toMatchObject({ v: '3', u: 'mm' });
    expect(rows[4].towns).toEqual([{ name: 'CAHUITA', v: '0.2 MM · 30%' }]);
  });

  it('reads the best day as the day with its score and hours', () => {
    const rows = readDetails(panel({ 'dv-day': ['MON 67 07:00–17:00', 'seg sm green'] }), 'snorkel');
    expect(rows[0]).toMatchObject({ k: 'bestday', v: 'MON', s: '67/100 · 07:00–17:00', lv: 4 });
  });

  it('gives every activity some rows, and none without a panel', () => {
    for (const a of Object.keys(DETAIL_FOR) as (keyof typeof DETAIL_FOR)[]) expect(DETAIL_FOR[a].rows.length).toBeGreaterThan(2);
    expect(readDetails(null, 'fish')).toEqual([]);
  });
});
