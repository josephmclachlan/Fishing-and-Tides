/**
 * Particle simulation for the wind and current layer (PLAN 1.4). Pure, no DOM or WebGL, so it
 * can be tested and later moved to a worker. Positions are Web Mercator world units (0..1).
 *
 * Each particle lives a few seconds, drifting through the field at a fixed on-screen pace,
 * then respawns somewhere random in the view. Particles that leave the view, reach the edge
 * of the data or (for currents) wash up on land respawn at once, so a pan fills straight
 * away. Zooming out by more than ~half a level reseeds everything so the new edges aren't
 * left empty while the old patch thins out.
 */
import { advect, latOfY, lngOfX, type VectorField, sampleField } from '../physics/flow';

/** What a layer of particles flows through, and how it's drawn. */
export interface FlowSource {
  field: VectorField;
  /** Particles die outside this (currents stay in the sea). */
  water?: (lng: number, lat: number) => boolean;
  /** On-screen pace, px per second for each m/s of flow. */
  pxPerMs: number;
  /** Speed drawn at full brightness, m/s; slower flow is dimmer. */
  fullMs: number;
  /** Speed drawn in red (a warning), m/s. */
  strongMs: number;
}

/** The map view: centre in world units, world size and viewport in CSS px (north-up, no tilt). */
export interface FlowView {
  x: number;
  y: number;
  world: number;
  w: number;
  h: number;
}

/** Particle ids cycle through this many values; the renderer only compares neighbours. */
export const ID_CYCLE = 4096;
const FADE_IN_S = 0.35;
const FADE_OUT_S = 0.6;
const LIFE_MIN_S = 1.6;
const LIFE_SPAN_S = 2.6;
/** Zoom-out (world size ratio) that triggers a full reseed, ~0.4 zoom levels. */
const RESEED_RATIO = 1.3;

const smooth01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class FlowSim {
  readonly n: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly age: Float32Array;
  readonly life: Float32Array;
  /** Speed at the last step, m/s. */
  readonly speed: Float32Array;
  readonly alive: Uint8Array;
  /** Bumped on every respawn so a trail never joins two lives. */
  readonly serial: Uint16Array;
  private mark = 0;
  private readonly v: [number, number] = [0, 0];
  private readonly p: [number, number] = [0, 0];

  constructor(n: number, private readonly rng: () => number = Math.random) {
    this.n = n;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.age = new Float32Array(n);
    this.life = new Float32Array(n);
    this.speed = new Float32Array(n);
    this.alive = new Uint8Array(n);
    this.serial = new Uint16Array(n);
  }

  /** Scatter every particle over the view, at random points in their lives so they don't blink in unison. */
  seed(view: FlowView, src: FlowSource, staggered = true) {
    this.mark = view.world;
    for (let i = 0; i < this.n; i++) {
      this.spawn(i, view, src);
      if (staggered) this.age[i] = this.rng() * this.life[i];
    }
  }

  /**
   * Respawn particle i at a random point in the view. If that point is land (for currents) or
   * off the data, the particle sits out one lifetime and tries again, so the number on screen
   * follows how much of the view has flow: the sea gets the same density as wind over land.
   */
  spawn(i: number, view: FlowView, src: FlowSource): boolean {
    this.serial[i] = (this.serial[i] + 1) % ID_CYCLE;
    this.age[i] = 0;
    this.life[i] = LIFE_MIN_S + this.rng() * LIFE_SPAN_S;
    const x = view.x + ((this.rng() - 0.5) * view.w) / view.world;
    const y = view.y + ((this.rng() - 0.5) * view.h) / view.world;
    const lng = lngOfX(x);
    const lat = latOfY(y);
    this.x[i] = x;
    this.y[i] = y;
    const ok = (!src.water || src.water(lng, lat)) && sampleField(src.field, lng, lat, this.v);
    this.alive[i] = ok ? 1 : 0;
    this.speed[i] = ok ? Math.hypot(this.v[0], this.v[1]) : 0;
    return ok;
  }

  step(dt: number, view: FlowView, src: FlowSource) {
    if (view.world < this.mark / RESEED_RATIO) this.seed(view, src, false);
    else if (view.world > this.mark) this.mark = view.world;
    const hw = view.w / 2 / view.world;
    const hh = view.h / 2 / view.world;
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      // Dead (sitting out after landing on land) or at the end of its life: try a new spot.
      if (!this.alive[i] || this.age[i] >= this.life[i]) {
        if (this.age[i] >= this.life[i]) this.spawn(i, view, src);
        continue;
      }
      if (!sampleField(src.field, lngOfX(this.x[i]), latOfY(this.y[i]), this.v)) {
        this.spawn(i, view, src);
        continue;
      }
      advect(this.x[i], this.y[i], this.v[0], this.v[1], dt, src.pxPerMs, view.world, this.p);
      const [x, y] = this.p;
      if (Math.abs(x - view.x) > hw || Math.abs(y - view.y) > hh || (src.water && !src.water(lngOfX(x), latOfY(y)))) {
        this.spawn(i, view, src);
        continue;
      }
      this.x[i] = x;
      this.y[i] = y;
      this.speed[i] = Math.hypot(this.v[0], this.v[1]);
    }
  }

  /** Opacity from the fade in at birth and out before death, 0..1. */
  lifeAlpha(i: number): number {
    if (!this.alive[i]) return 0;
    return Math.min(1, this.age[i] / FADE_IN_S, (this.life[i] - this.age[i]) / FADE_OUT_S);
  }

  /**
   * One history slot for the GPU, RGBA float per particle:
   *  r, g: position relative to (ox, oy), which keeps float32 precise down to the spot tier;
   *  b: brightness 0..1 from speed, plus 2 when at or above the strong (red) speed;
   *  a: serial + 0.99·opacity, or −1 when dead. The renderer joins two slots into a trail
   *     segment only when their serials (the integer parts) match.
   */
  write(out: Float32Array, ox: number, oy: number, src: FlowSource) {
    for (let i = 0; i < this.n; i++) {
      const o = i * 4;
      out[o] = this.x[i] - ox;
      out[o + 1] = this.y[i] - oy;
      const s = this.speed[i];
      out[o + 2] = smooth01(s / src.fullMs) + (s >= src.strongMs ? 2 : 0);
      out[o + 3] = this.alive[i] ? this.serial[i] + 0.99 * this.lifeAlpha(i) : -1;
    }
  }
}
