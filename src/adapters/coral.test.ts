import { describe, expect, it } from 'vitest';
import { alertLevel, coralChecks, coralFromTables, coralNow, nearestReef, type CoralLoaded, type ErddapTable } from './coral';

const T0 = Date.UTC(2026, 9, 30, 12), D = 864e5;
const iso = (ms: number) => new Date(ms).toISOString().replace('.000', '');
/** A 2×2 pixel table over two days; the north-west pixel is land (no values). */
function table(v: string, val: (day: number, lat: number, lng: number) => number | null, days = 2): ErddapTable {
  const rows: unknown[][] = [];
  for (let d = 0; d < days; d++) for (const lat of [9.675, 9.625]) for (const lng of [-82.725, -82.675]) {
    const x = lat === 9.675 && lng === -82.725 ? null : val(d, lat, lng);
    rows.push([iso(T0 + d * D), lat, lng, x]);
  }
  return { columnNames: ['time', 'latitude', 'longitude', v], rows };
}
const tables = () => ({
  dhw: table('degree_heating_week', (d, lat) => (lat > 9.65 ? 5 : 2) + d * 0.123),
  hotspot: table('hotspot', (d) => 0.5 + d),
  sstAnomaly: table('sea_surface_temperature_anomaly', () => 1.2),
  sst: table('analysed_sst', () => 29.6),
  // The 7-day alert is published one day further than DHW here.
  baa: table('bleaching_alert_area', () => 3, 3),
});
const REEFS = [
  { id: 'a', name: 'A', lngLat: [-82.72, 9.67] as [number, number] }, // nearest pixel is land: takes the next one
  { id: 'b', name: 'B', lngLat: [-82.67, 9.62] as [number, number] },
  { id: 'far', name: 'FAR', lngLat: [-83.5, 10.5] as [number, number] }, // no pixel within 0.1°: dropped
];

describe('coral heat stress (CRW)', () => {
  it('alert levels follow the CRW v3.1 definitions', () => {
    expect([alertLevel(-0.5, 9), alertLevel(0, 9), alertLevel(0.5, 9), alertLevel(1, 0), alertLevel(1, 3.99), alertLevel(1.2, 4), alertLevel(2, 7.9), alertLevel(1, 8)]).toEqual([0, 0, 1, 2, 2, 3, 3, 4]);
  });

  it('picks the nearest sea pixel per reef and aligns every product on the union of days', () => {
    const d = coralFromTables(tables(), REEFS, '2026-11-04T00:00:00Z', 'x');
    expect(d.days).toEqual([T0, T0 + D, T0 + 2 * D]);
    expect(d.reefs.map((r) => r.id)).toEqual(['a', 'b']);
    const [a, b] = d.reefs;
    expect(a.pixel).not.toEqual([-82.725, 9.675]);
    expect(b.pixel).toEqual([-82.675, 9.625]);
    expect(b.dhw).toEqual([2, 2.12, null]);
    expect(b.baa).toEqual([3, 3, 3]);
  });

  it('reads each product at its own newest day', () => {
    const d = coralFromTables(tables(), REEFS, '2026-11-04T00:00:00Z', 'x');
    const now = coralNow(d, d.reefs[1]);
    expect([now.dhw, now.dhwDay, now.alert, now.alertDay, now.hotspot, now.sst]).toEqual([2.12, T0 + D, 3, T0 + 2 * D, 1.5, 29.6]);
    expect(now.peakDhw).toBe(2.12);
    expect(nearestReef(d, [-82.66, 9.6])?.id).toBe('b');
  });

  it('fails loudly when no reef has data or a column is missing', () => {
    expect(() => coralFromTables(tables(), [REEFS[2]], 'x', 'x')).toThrow(/no reef/);
    expect(() => coralFromTables({ ...tables(), sst: table('wrong', () => 1) }, REEFS, 'x', 'x')).toThrow(/analysed_sst/);
  });

  it('checks pass on a fresh, well-formed feed', async () => {
    const now = Date.now();
    const d = coralFromTables(tables(), REEFS, new Date(now).toISOString(), 'x');
    const shifted = { ...d, days: d.days.map((t) => t - T0 + now - 3 * D), fromCache: false } as CoralLoaded;
    const out = await Promise.all(coralChecks(async () => shifted).map((c) => c.run()));
    expect(out.map((o) => o.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'pass']);
  });
});
