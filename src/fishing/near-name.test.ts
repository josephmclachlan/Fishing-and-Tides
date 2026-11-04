import { describe, expect, it } from 'vitest';
import { nearestName, uniqueMarks } from './near-name';

const marks = [
  { name: 'CAHUITA', lngLat: [-82.84, 9.7397] as [number, number] },
  { name: 'RÍO ESTRELLA', lngLat: [-82.8922, 9.7927] as [number, number] },
];

describe('nearestName (J5)', () => {
  it('names the closest landmark and says how far', () => {
    const n = nearestName(-82.88, 9.78, marks)!;
    expect(n.name).toBe('RÍO ESTRELLA');
    expect(n.km).toBeGreaterThan(1);
    expect(n.km).toBeLessThan(2.5);
    expect(n.at).toBe(false);
  });
  it('is AT a landmark a few hundred metres away', () => {
    expect(nearestName(-82.841, 9.741, marks)!.at).toBe(true);
  });
  it('is null with no landmarks', () => {
    expect(nearestName(0, 0, [])).toBeNull();
  });
  it('drops repeated names', () => {
    expect(uniqueMarks(marks, [{ name: 'CAHUITA', lngLat: [0, 0] }]).map((m) => m.name)).toEqual(['CAHUITA', 'RÍO ESTRELLA']);
  });
});
