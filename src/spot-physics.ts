/**
 * Spot conditions for every named spot, kept current as the forecast hour, swell, wind and
 * tide change (PLAN 4.2). Runs the physics worker (3.6) and publishes results to the rip
 * overlay and the SURF ZONE readouts. Swell comes from the waves adapter per spot, else the conditions feed.
 */
import { LIMON_HARMONICS } from './data/tides-limon';
import { tideFixNow } from './corrections';
import type { Conditions } from './mock';
import type { PhysicsClient } from './physics/client';
import { KT_PER_MS } from './physics/flow';
import type { SpotResult } from './physics/spot-model';
import { tideState } from './physics/tide';
import { SPOTS } from './region';
import { SURF_BREAKS, type SurfBreak } from './data/surf-breaks';
import type { SquallLevel } from './physics/safety';
import type { SargLevel } from './physics/drift';
import { surfQuality, type SurfQuality, type Train } from './surf-quality';

/** Every place we model: the named spots plus catalog surf breaks that aren't one of them. */
export const PLACES: readonly { name: string; lngLat: [number, number]; brk?: SurfBreak }[] = [
  ...SPOTS.map((s) => ({ ...s, brk: SURF_BREAKS.find((b) => b.name === s.name) })),
  ...SURF_BREAKS.filter((b) => !SPOTS.some((s) => s.name === b.name)).map((b) => ({ name: b.name, lngLat: b.lngLat, brk: b })),
];

type Sea = { Hs: number; Tp: number; fromDeg: number };

/** Per-hour, per-place extras the surf score reads besides the sea and wind (wired in main.ts). */
export interface HourExtras {
  gustMs: number | null;
  ahead: { speedMs: number; fromDeg: number } | null;
  lightning?: boolean;
  squall?: SquallLevel;
  rainMmH?: number | null;
  sarg?: SargLevel | null;
  /** Sea temperature °C and UV index for the readout (not scored). */
  sstC?: number | null;
  uv?: number | null;
}

export interface SpotState {
  name: string;
  pin: [number, number];
  result: SpotResult | null;
  /** Offshore sea state the result was computed for. */
  sea: Sea;
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

/**
 * `seaAt` gives the offshore sea state for a spot pin (the waves adapter, PLAN 2.2); when it
 * returns null (not loaded yet, or no data that hour) the spot uses the conditions' swell.
 */
export function createSpotPhysics(
  client: PhysicsClient,
  conditions: () => Conditions,
  validMs: () => number,
  windExtras: (ms: number, pin: [number, number], name: string) => HourExtras = () => ({ gustMs: null, ahead: null }),
  seaAt: (pin: [number, number]) => (Sea & { swellHs?: number | null; swell2?: Train | null; windSeaHs?: number | null }) | null = () => null,
): SpotPhysics {
  let states: SpotState[] = [];
  const subs = new Set<() => void>();
  const update = () => {
    const c = conditions();
    const ms = validMs();
    const ts = tideState(LIMON_HARMONICS, ms);
    const tideLevel = ts.level + tideFixNow(ms);
    const sea: Sea = { Hs: c.swellHeightM, Tp: c.swellPeriodS, fromDeg: c.swellDirDeg };
    const wind = { speedMs: c.windKt / KT_PER_MS, fromDeg: c.windDirDeg };
        const seasX = PLACES.map((p) => seaAt(p.lngLat));
    const seas: Sea[] = seasX.map((x) => (x ? { Hs: x.Hs, Tp: x.Tp, fromDeg: x.fromDeg } : sea));
    client
      .latestMany(PLACES.map((p, i) => ({ pin: p.lngLat, sea: seas[i], tideLevel, wind })))
      .then((rs) => {
        states = PLACES.map((s, i) => {
          const r = rs[i];
          const wx = windExtras(ms, s.lngLat, s.name);
          const surf0 = s.brk && r
            ? surfQuality({ brk: s.brk, Hb: r.waves.breaker.Hb, Tp: seas[i].Tp, swellFromDeg: seas[i].fromDeg, windMs: wind.speedMs, windFromDeg: wind.fromDeg, swellHs: seasX[i]?.swellHs, swell2: seasX[i]?.swell2, windSeaHs: seasX[i]?.windSeaHs, tide: { level: ts.level, rising: ts.rising }, gustMs: wx.gustMs, windAhead: wx.ahead, lightning: wx.lightning, squall: wx.squall, rainMmH: wx.rainMmH, sarg: wx.sarg, info: { sstC: wx.sstC, uv: wx.uv } })
            : undefined;
          const surf = surf0 && r ? { ...surf0, ripLevel: r.rip.level } : surf0;
          return { name: s.name, pin: s.lngLat, result: r, sea: seas[i], surf };
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
