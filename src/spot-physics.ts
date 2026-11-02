/**
 * Spot conditions for every named spot, kept current as the forecast hour, swell, wind and
 * tide change (PLAN 4.2). Runs the physics worker (3.6) and publishes results to the rip
 * overlay and the SURF ZONE readouts. Swell comes from the waves adapter per spot, else the conditions feed.
 */
import { LIMON_HARMONICS } from './data/tides-limon';
import type { Conditions } from './mock';
import type { PhysicsClient } from './physics/client';
import { KT_PER_MS } from './physics/flow';
import type { SpotResult } from './physics/spot-model';
import { tideState } from './physics/tide';
import { SPOTS } from './region';

export interface SpotState {
  name: string;
  pin: [number, number];
  result: SpotResult | null;
}

export interface SpotPhysics {
  /** Latest results, one per SPOTS entry, in SPOTS order (empty until the first run finishes). */
  all(): SpotState[];
  byName(name: string): SpotState | undefined;
  /** Recompute (coalesced; call as often as you like). */
  update(): void;
  subscribe(fn: () => void): () => void;
}

/**
 * `seaAt` gives the offshore sea state for a spot pin (the waves adapter, PLAN 2.2); when it
 * returns null (not loaded yet, or no data that hour) the spot uses the conditions' swell.
 */
export function createSpotPhysics(
  client: PhysicsClient,
  conditions: () => Conditions,
  validMs: () => number,
  seaAt: (pin: [number, number]) => { Hs: number; Tp: number; fromDeg: number } | null = () => null,
): SpotPhysics {
  let states: SpotState[] = [];
  const subs = new Set<() => void>();
  const update = () => {
    const c = conditions();
    const ms = validMs();
    const tideLevel = tideState(LIMON_HARMONICS, ms).level;
    const sea = { Hs: c.swellHeightM, Tp: c.swellPeriodS, fromDeg: c.swellDirDeg };
    const wind = { speedMs: c.windKt / KT_PER_MS, fromDeg: c.windDirDeg };
    client
      .latestMany(SPOTS.map((s) => ({ pin: s.lngLat, sea: seaAt(s.lngLat) ?? sea, tideLevel, wind })))
      .then((rs) => {
        states = SPOTS.map((s, i) => ({ name: s.name, pin: s.lngLat, result: rs[i] }));
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
