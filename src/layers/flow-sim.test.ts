import { describe, expect, it } from 'vitest';
import { FlowSim, type FlowSource, type FlowView } from './flow-sim';
import { gridField, latOfY, lngOfX, mercX, mercY, worldPx } from '../physics/flow';

/** Seeded LCG so runs repeat. */
function rng(seed = 1) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const view = (zoom = 9, lng = -82.83, lat = 9.79): FlowView => ({ x: mercX(lng), y: mercY(lat), world: worldPx(zoom), w: 400, h: 800 });
const east: FlowSource = { field: gridField([[-86, 7.5], [-79, 13]], 0.5, () => [2, 0]), pxPerMs: 10, fullMs: 4, strongMs: 3 };

const inView = (sim: FlowSim, v: FlowView, i: number) =>
  Math.abs(sim.x[i] - v.x) <= v.w / 2 / v.world + 1e-12 && Math.abs(sim.y[i] - v.y) <= v.h / 2 / v.world + 1e-12;

describe('FlowSim', () => {
  it('seeds every particle inside the view', () => {
    const sim = new FlowSim(500, rng());
    const v = view();
    sim.seed(v, east);
    for (let i = 0; i < sim.n; i++) expect(inView(sim, v, i)).toBe(true);
    expect(sim.alive.every((a) => a === 1)).toBe(true);
  });

  it('moves particles with the flow at the on-screen pace', () => {
    const sim = new FlowSim(50, rng());
    const v = { ...view(), w: 2000, h: 2000 }; // big view so nobody leaves it
    sim.seed(v, east, false);
    const x0 = Float64Array.from(sim.x);
    const y0 = Float64Array.from(sim.y);
    expect(sim.alive.every((a) => a === 1)).toBe(true);
    sim.step(0.1, v, east);
    for (let i = 0; i < sim.n; i++) {
      expect((sim.x[i] - x0[i]) * v.world).toBeCloseTo(2, 6); // 2 m/s × 10 px/(m/s·s) × 0.1 s
      expect(sim.y[i]).toBe(y0[i]);
    }
  });

  it('keeps currents in the sea: particles never live on land', () => {
    const seaEastOf = -82.83;
    const src = { ...east, water: (lng: number) => lng > seaEastOf };
    const sim = new FlowSim(400, rng(7));
    const v = view();
    sim.seed(v, src);
    for (let k = 0; k < 120; k++) {
      sim.step(1 / 60, v, src);
      for (let i = 0; i < sim.n; i++) if (sim.alive[i]) expect(lngOfX(sim.x[i])).toBeGreaterThan(seaEastOf);
    }
    // About half the view is sea, so about half the particles are out at any time.
    const live = sim.alive.reduce((a, b) => a + b, 0) / sim.n;
    expect(live).toBeGreaterThan(0.3);
    expect(live).toBeLessThan(0.7);
  });

  it('respawns particles that drift out of view back inside it, with a new serial', () => {
    const sim = new FlowSim(200, rng(3));
    const v = view();
    sim.seed(v, east);
    const serial0 = Uint16Array.from(sim.serial);
    for (let k = 0; k < 30; k++) sim.step(0.05, v, east);
    let renewed = 0;
    for (let i = 0; i < sim.n; i++) {
      if (sim.alive[i]) expect(inView(sim, v, i)).toBe(true);
      if (sim.serial[i] !== serial0[i]) renewed++;
    }
    expect(renewed).toBeGreaterThan(0);
  });

  it('dies outside the data', () => {
    const tiny: FlowSource = { ...east, field: gridField([[-83, 9.7], [-82.9, 9.8]], 0.05, () => [1, 0]) };
    const sim = new FlowSim(300, rng(5));
    const v = view(7);
    sim.seed(v, tiny);
    for (let i = 0; i < sim.n; i++) {
      if (!sim.alive[i]) continue;
      const lng = lngOfX(sim.x[i]);
      const lat = latOfY(sim.y[i]);
      expect(lng >= -83 && lng <= -82.9 && lat >= 9.7 && lat <= 9.8).toBe(true);
    }
  });

  it('reseeds over the whole view after a zoom out', () => {
    const sim = new FlowSim(300, rng(9));
    sim.seed(view(12), east);
    const out = view(10);
    sim.step(0.016, out, east);
    // Without the reseed every particle would still be in the middle sixteenth of the view.
    const wide = Array.from({ length: sim.n }, (_, i) => Math.abs(sim.x[i] - out.x) * out.world > out.w / 8).filter(Boolean).length;
    expect(wide / sim.n).toBeGreaterThan(0.5);
  });

  it('packs position, brightness, strong flag, serial and fade for the GPU', () => {
    const sim = new FlowSim(3, rng());
    const v = view();
    sim.seed(v, east, false);
    sim.age[0] = 1; // fully faded in
    sim.life[0] = 3;
    sim.alive[2] = 0;
    const buf = new Float32Array(12);
    sim.write(buf, 0.2, 0.4, east);
    expect(buf[0]).toBeCloseTo(sim.x[0] - 0.2, 6);
    expect(buf[1]).toBeCloseTo(sim.y[0] - 0.4, 6);
    expect(buf[2]).toBeCloseTo(0.5, 5); // 2 m/s of fullMs 4: smoothstep(0.5) = 0.5, below strongMs so no +2
    expect(Math.floor(buf[3])).toBe(sim.serial[0]);
    expect(buf[3] - Math.floor(buf[3])).toBeCloseTo(0.99, 5);
    expect(buf[11]).toBe(-1);
  });
});
