import { describe, expect, it } from 'vitest';
import { parseCoords, parseIssueDate, parseNavWarnings } from './navwarn-parse';

const W = (o: Record<string, unknown>) => ({ msgYear: 2026, msgNumber: 100, navArea: '4', status: 'A', issueDate: '151432Z NOV 2026', text: 'x', ...o });

describe('navwarn', () => {
  it('reads the issue date', () => {
    expect(parseIssueDate('151432Z NOV 2026')).toBe(Date.UTC(2026, 10, 15, 14, 32));
    expect(parseIssueDate('nonsense')).toBeNaN();
  });
  it('reads degrees-minutes pairs with hemispheres', () => {
    const [c] = parseCoords('UNLIT BUOY IN 09-59.5N 083-01.2W.');
    expect(c[0]).toBeCloseTo(-83.02, 3);
    expect(c[1]).toBeCloseTo(9.9917, 3);
  });
  it('keeps a position near the coast and a place name, drops the rest', () => {
    const d = parseNavWarnings({ 'broadcast-warn': [
      W({ msgNumber: 1, text: 'WRECK REPORTED IN 09-59.0N 083-01.0W.' }),
      W({ msgNumber: 2, text: 'PUERTO LIMON PILOT STATION CHANGED.' }),
      W({ msgNumber: 3, text: 'BUOY OFF 25-00.0N 080-00.0W.' }),
      W({ msgNumber: 4, status: 'C', text: 'CANCELLED IN 10-00.0N 083-00.0W.' }),
    ] }, 0);
    expect(d.warnings.map((w) => [w.id, w.match])).toEqual([['1/26', 'position'], ['2/26', 'place']].sort());
  });
  it('rejects a body without the list', () => {
    expect(() => parseNavWarnings({}, 0)).toThrow();
  });
});
