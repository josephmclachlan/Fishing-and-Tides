import { describe, expect, it } from 'vitest';
import { makeReefLookup, shoalAlert } from './shoal';

const deep = () => 20;
const reefBox = { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: { cls: 'REEF CREST' }, geometry: { type: 'Polygon' as const, coordinates: [[[0.001, -0.0005], [0.002, -0.0005], [0.002, 0.0005], [0.001, 0.0005], [0.001, -0.0005]]] } }] };
const reef = makeReefLookup(reefBox, new Set(['REEF CREST']))!;

describe('shoalAlert', () => {
  it('is clear in deep water', () => {
    expect(shoalAlert(deep, null, 0, 0, 'yacht')).toMatchObject({ level: 'clear', depthM: 20, minM: 20, reef: false });
  });
  it('compares the shallowest point around with the draft of the vessel', () => {
    // 3 m of water east of 55 m: the first ring point to see it is the north-east one.
    const east = (lng: number) => (lng > 0.0005 ? 3 : 20);
    expect(shoalAlert(east, null, 0, 0, 'small')).toMatchObject({ level: 'clear', minM: 3 });
    expect(shoalAlert(east, null, 0, 0, 'yacht')).toMatchObject({ level: 'caution', minM: 3, minBearingDeg: 45 });
    expect(shoalAlert(() => 2.2, null, 0, 0, 'yacht').level).toBe('danger');
  });
  it('flags a reef within reach and standing on one', () => {
    expect(shoalAlert(deep, reef, 0.0005, 0, 'small')).toMatchObject({ level: 'caution', reef: true }); // reef ~55 m east
    expect(shoalAlert(deep, reef, 0.0015, 0, 'small').level).toBe('danger'); // on the reef
    expect(shoalAlert(deep, reef, 0.05, 0, 'small').reef).toBe(false);
  });
  it('treats land and missing depth as no reading, not as a shoal', () => {
    const r = shoalAlert((lng) => (lng > 0.0005 ? undefined : 20), null, 0, 0, 'yacht');
    expect(r.level).toBe('clear');
    expect(shoalAlert(() => undefined, null, 0, 0, 'yacht')).toMatchObject({ level: 'clear', depthM: null, minM: null });
  });
});
