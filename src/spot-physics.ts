/**
 * Spot conditions for every named spot, kept current as the forecast hour, swell, wind and
 * tide change (PLAN 4.2). Runs the physics worker (3.6) and publishes results to the rip
 * overlay and the SURF ZONE readouts. Swell comes from the conditions feed (mock until 2.2).
 */
import { LIMON_HARMONICS } from './data/tides-limon';
import type { Conditions } from './mock';
import type { PhysicsClient } from './physics/client';
import { KT_PER_MS } from './physics/flow';
import type { SpotResult } from './physics/spot-model';
import { tideState } from './physics/tide';
import { SPOTS } from './region';
import { SURF_BREAKS, type SurfBreak } from './data/surf-breaks';
import { surfQuality, type SurfQuality } from './surf-quality';

/** Every place we model: the named spots plus catalog surf breaks that aren't one of them. */
export const PLACES: readonly { name: string; lngLat: [number, number]; brk?: SurfBreak }[] = [
  ...SPOTS.map((s) => ({ ...s, brk: SURF_BREAKS.find((b) => b.name === s.name) })),
  ...SURF_BREAKS.filter((b) => !SPOTS.some((s) => s.name === b.name)).map((b) => ({ name: b.name, lngLat: b.lngLat, brk: b })),
];

export interface SpotState {
  name: string;
  pin: [number, number];
  result: SpotResult | null;
  /** Surf quality (PLAN 6.3), for catalog breaks. */
  surf?: SurfQuality;
}

export interface SpotPhysics {
  /** Latest results, one per PLACES entry, in PLACES order (empty until the first run finishes). */
  all(): SpotState[];
  byName(name: string): SpotState | undefined;
  /** Recompute (coalesced; call as often as you like). */
  update(): void;
  subscribe(fn: () => void): () => void;
}

export function createSpotPhysics(client: PhysicsClient, conditions: () => Conditions, validMs: () => number): SpotPhysics {
  let states: SpotState[] = [];
  const subs = new Set<() => void>();
  const update = () => {
    const c = conditions();
    const ms = validMs();
    const tideLevel = tideState(LIMON_HARMONICS, ms).level;
    const sea = { Hs: c.swellHeightM, Tp: c.swellPeriodS, fromDeg: c.swellDirDeg };
    const wind = { speedMs: c.windKt / KT_PER_MS, fromDeg: c.windDirDeg };
    client
      .latestMany(PLACES.map((s) => ({ pin: s.lngLat, sea, tideLevel, wind })))
      .then((rs) => {
        states = PLACES.map((s, i) => {
          const r = rs[i];
          const surf = s.brk && r
            ? surfQuality({ brk: s.brk, Hb: r.waves.breaker.Hb, Tp: sea.Tp, swellFromDeg: sea.fromDeg, windMs: wind.speedMs, windFromDeg: wind.fromDeg })
            : undefined;
          return { name: s.name, pin: s.lngLat, result: r, surf };
        });
        subs.forEach((fn) => fn());
      })
      .catch((err) => console.warn('spot physics failed', err));
  };
  return {
    all: () => states,
    byName: (name) => states.find((s) => s.name === name),
    update,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
