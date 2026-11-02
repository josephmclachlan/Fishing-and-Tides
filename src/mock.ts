import { MOCK_FLOW, REGION } from './region';
import { KT_PER_MS, fromSpeedDir, gridField, nearestOnLine, vortexSpeed, type VectorField } from './physics/flow';

/** Mock conditions until Phase 2 adapters land. Shape mirrors what adapters will return. */
export interface Conditions {
  fetchedAt: number;
  swellHeightM: number;
  swellPeriodS: number;
  swellDirDeg: number;
  windKt: number;
  windDirDeg: number;
  waterTempC: number;
  tideM: number;
  tideRising: boolean;
  ripRisk: 'LOW' | 'MOD' | 'HIGH';
}

/**
 * `now` stamps the data age; `at` is the time being viewed (the PLAN 1.5 slider), default now.
 * Wind and swell drift slowly with `at` so scrubbing the slider changes the readouts.
 * `climatology` (the slider's OUTLOOK band) drops that drift: only the tide, which is
 * harmonic, still varies, because nothing else is predictable that far out.
 */
export function mockConditions(now = Date.now(), at = now, climatology = false): Conditions {
  // Fake semidiurnal-ish tide so the readout moves.
  const t = at / 3.6e6;
  const swell = 1.4 + (climatology ? 0 : 0.35) * Math.sin((2 * Math.PI * (t - now / 3.6e6)) / 40);
  const tide = 0.18 * Math.sin((2 * Math.PI * t) / 12.42) + 0.06 * Math.sin((2 * Math.PI * t) / 24);
  const tideNext = 0.18 * Math.sin((2 * Math.PI * (t + 0.1)) / 12.42) + 0.06 * Math.sin((2 * Math.PI * (t + 0.1)) / 24);
  return {
    fetchedAt: now - 3 * 3.6e6,
    swellHeightM: swell,
    swellPeriodS: 11,
    swellDirDeg: 40,
    windKt: 12,
    windDirDeg: 70,
    waterTempC: 28.6,
    tideM: tide,
    tideRising: tideNext > tide,
    ripRisk: 'MOD',
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Mock wind field over the macro view (PLAN 1.4) until the wind adapter (PLAN 2.3).
 * North-east trades that strengthen toward the Caribbean low-level jet (north-east of the
 * view), ease toward the Pacific side, and meander a little; scaled so the field at
 * MOCK_FLOW.windRef matches the HUD's mock wind reading at hour 0. `hour` (hours after NOW)
 * shifts the pattern so the time slider (PLAN 1.5) has something to scrub.
 */
export function mockWindField(hour = 0): VectorField {
  const [rx, ry] = MOCK_FLOW.windRef;
  const raw = (lng: number, lat: number, h: number): [number, number] => [
    Math.max(1, 6.2 + 1.2 * (lat - ry) + 0.6 * (lng - rx) + 0.9 * Math.sin(lng * 3.1 + lat * 2.3 + h * 0.13) + 0.6 * Math.sin(lat * 5.3 - lng * 4.1 - h * 0.21)),
    14 * Math.sin(lng * 1.3 + lat * 0.9 + h * 0.05) + 8 * Math.sin(lat * 2.1 - lng * 0.7 - h * 0.08),
  ];
  // Normalised at hour 0, so the reference point reads the HUD's mock wind at NOW and drifts after.
  const ref = mockConditions(0);
  const [s0, d0] = raw(rx, ry, 0);
  const scale = ref.windKt / KT_PER_MS / s0;
  return gridField(REGION.maxBounds, 0.1, (lng, lat) => {
    const [s, d] = raw(lng, lat, hour);
    return fromSpeedDir(s * scale, ref.windDirDeg + d - d0);
  });
}

/**
 * Mock surface current field (PLAN 1.4). `hour` is hours since the epoch, so the coastal jet's
 * tide phase matches `mockConditions`' tide at the same instant (PLAN 1.5) until the currents adapter (PLAN 2.5). Not masked
 * to the sea: particles test the coastline themselves at full resolution.
 *  - Caribbean Current: westward across the north of the view, turning north-west near Nicaragua.
 *  - Panama–Colombia Gyre: anticlockwise, so near this coast the flow runs south-east.
 *  - A coastal current along MOCK_FLOW.coast, fading out ~25 km offshore, nudged by the tide.
 *  - A few offshore eddies.
 */
export function mockCurrentField(hour = 0): VectorField {
  const { coast, gyre, eddies } = MOCK_FLOW;
  const tide = 1 + 0.15 * Math.sin((2 * Math.PI * hour) / 12.42);
  return gridField(REGION.maxBounds, 0.05, (lng, lat) => {
    const cc = 0.4 * smoothstep(10.8, 12.6, lat);
    let u = -cc;
    let v = 0.6 * cc * smoothstep(-81.5, -83.5, lng);
    const k = Math.cos((lat * Math.PI) / 180);
    for (const e of [gyre, ...eddies]) {
      const dx = (lng - e.center[0]) * k;
      const dy = lat - e.center[1];
      const r = Math.hypot(dx, dy);
      if (r < 1e-6) continue;
      const s = vortexSpeed(r, e.radiusDeg, e.speedMs) / r; // anticlockwise tangent is (−dy, dx)/r
      u -= s * dy;
      v += s * dx;
    }
    const { km, tangent } = nearestOnLine([lng, lat], coast);
    const jet = 0.35 * tide * Math.exp(-km / 25);
    return [u + jet * tangent[0], v + jet * tangent[1]];
  });
}
