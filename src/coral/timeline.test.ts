import { describe, expect, it } from 'vitest';
import { timelineSvg, yearRows } from './timeline';
import { upgradeSite } from './store';

const DAY = 864e5;
describe('coral site timeline', () => {
  const days = Array.from({ length: 84 }, (_, i) => Date.UTC(2026, 7, 1) + i * DAY);
  const heat = { days, values: days.map((_, i) => i / 10), watch: 4, high: 8, label: 'DHW' };
  const mud = { days, values: days.map((_, i) => (i % 3 ? 1 : null)), watch: 2, high: 4, label: 'MUD' };
  it('draws one panel per series, coloured by the latest value, with visit ticks inside the range only', () => {
    const svg = timelineSvg([heat, mud], [{ t: days[10], status: 'bleaching' }, { t: days[0] - 30 * DAY, status: 'healthy' }], days[0], days[83]);
    expect((svg.match(/<polyline/g) ?? []).length).toBe(2);
    expect(svg).toContain('stroke:var(--red);stroke-width:2"'); // DHW ends at 8.3, past 8
    expect(svg).toContain('stroke:var(--green);stroke-width:2"'); // MUD ends at 1
    expect(svg).toContain('stroke:var(--red);stroke-width:2;opacity:.85'); // bleaching visit tick
    expect((svg.match(/opacity:.85/g) ?? []).length).toBe(1);
    expect(svg).toContain('>DHW<');
    expect(svg).not.toMatch(/#[0-9a-f]{3,6}|rgba?\(/i);
  });
  it('rows per year, newest first, with the worst status logged', () => {
    const s = upgradeSite({ id: 's', kind: 'reef', lng: 0, lat: 0, visits: [
      { id: 'a', t: Date.UTC(2025, 2, 1), status: 'healthy' },
      { id: 'b', t: Date.UTC(2025, 9, 1), status: 'bleaching' },
      { id: 'c', t: Date.UTC(2026, 1, 1), status: 'unknown' },
    ] })!;
    const rows = yearRows(s, 2024, 2026, (y) => (y === 2025 ? 6.3 : null), () => 1.5);
    expect(rows).toEqual([
      { year: 2026, heat: null, mud: 1.5, visits: 1, worst: 'unknown' },
      { year: 2025, heat: 6.3, mud: 1.5, visits: 2, worst: 'bleaching' },
      { year: 2024, heat: null, mud: 1.5, visits: 0, worst: null },
    ]);
  });
});
