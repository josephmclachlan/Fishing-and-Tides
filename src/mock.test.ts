import { describe, expect, it } from 'vitest';
import { mockConditions, mockCurrentField, mockWindField } from './mock';
import { KT_PER_MS, fromDeg, sampleField, towardDeg } from './physics/flow';
import { MOCK_FLOW, SPOTS } from './region';

const at = (f: ReturnType<typeof mockWindField>, lng: number, lat: number) => {
  const v: [number, number] = [0, 0];
  expect(sampleField(f, lng, lat, v)).toBe(true);
  return { kt: Math.hypot(v[0], v[1]) * KT_PER_MS, from: fromDeg(v[0], v[1]), toward: towardDeg(v[0], v[1]) };
};

describe('mock wind', () => {
  const f = mockWindField();
  it('agrees with the HUD reading at the reference point', () => {
    const ref = mockConditions(0);
    const w = at(f, ...MOCK_FLOW.windRef);
    expect(w.kt).toBeCloseTo(ref.windKt, 0);
    expect(w.from).toBeCloseTo(ref.windDirDeg, 0);
  });
  it('is a north-east trade wind, stronger offshore to the north-east', () => {
    const near = at(f, -82.8, 9.8);
    const far = at(f, -79.5, 12.5);
    expect(near.from).toBeGreaterThan(30);
    expect(near.from).toBeLessThan(110);
    expect(far.kt).toBeGreaterThan(near.kt);
  });
  it('moves with the forecast hour', () => {
    expect(at(mockWindField(12), -81, 11).from).not.toBeCloseTo(at(f, -81, 11).from, 1);
  });
});

describe('mock current', () => {
  const f = mockCurrentField();
  it('runs south-east along the Cahuita–Gandoca shore at a plausible speed', () => {
    const cahuita = SPOTS.find((s) => s.name === 'PUNTA CAHUITA')!.lngLat;
    const c = at(f, cahuita[0] + 0.05, cahuita[1] + 0.05); // a few km offshore
    expect(c.toward).toBeGreaterThan(100);
    expect(c.toward).toBeLessThan(200);
    expect(c.kt).toBeGreaterThan(0.3);
    expect(c.kt).toBeLessThan(2);
  });
  it('has a westward Caribbean Current in the north of the view', () => {
    const c = at(f, -80, 12.8);
    expect(c.toward).toBeGreaterThan(225);
    expect(c.toward).toBeLessThan(330);
  });
});
