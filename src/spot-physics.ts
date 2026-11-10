/**
 * Spot conditions for every named spot, kept current as the forecast hour, swell, wind and
 * tide change (PLAN 4.2). Runs the physics worker (3.6) and publishes results to the rip
 * overlay and the SURF ZONE readouts. Swell comes from the waves adapter per spot, else the conditions feed.
 */
import { LIMON_BIG_TIDE, LIMON_HARMONICS } from './data/tides-limon';
import type { Conditions } from './mock';
import type { PhysicsClient } from './physics/client';
import { KT_PER_MS } from './physics/flow';
import type { SpotResult } from './physics/spot-model';
import { tideState } from './physics/tide';
import { PLUME_RIVERS, SPOTS } from './region';
import { haversineM } from './geo';
import { SURF_BREAKS, type SurfBreak } from './data/surf-breaks';
import type { SquallLevel } from './physics/safety';
import type { SargLevel } from './physics/drift';
import { surfQuality, type SurfQuality, type Train } from './surf-quality';
import type { ShoreBase } from './physics/swim';

/** Every place we model: the named spots plus catalog surf breaks that aren't one of them. */
export const PLACES: readonly { name: string; lngLat: [number, number]; brk?: SurfBreak }[] = [
  ...SPOTS.map((s) => ({ ...s, brk: SURF_BREAKS.find((b) => b.name === s.name) })),
  ...SURF_BREAKS.filter((b) => !SPOTS.some((s) => s.name === b.name)).map((b) => ({ name: b.name, lngLat: b.lngLat, brk: b })),
];

/** The leading wave train; `total` is the whole sea's Hs (all trains), when known. */
type Sea = { Hs: number; Tp: number; fromDeg: number; total?: number };
type Train0 = { Hs: number; Tp: number; fromDeg: number };

/** A river mouth this close to a place holds a rip channel there, km. */
export const CHANNEL_MOUTH_KM = 1;

/**
 * Places with a fixed rip channel (physics/rip.ts `knownChannel`: score ×1.3, speed ×1.15): a break whose guides list
 * rips as a hazard, or one of the plume rivers' mouths within CHANNEL_MOUTH_KM. The same sites the RIP RISK layer rings.
 */
export function knownChannel(place: { lngLat: [number, number]; brk?: Pick<SurfBreak, 'hazards'> }, mouths: readonly { mouth: [number, number] }[] = PLUME_RIVERS): boolean {
  if (place.brk?.hazards.includes('rip')) return true;
  return mouths.some((m) => haversineM(place.lngLat, m.mouth) / 1000 <= CHANNEL_MOUTH_KM);
}
const KNOWN_CHANNEL = PLACES.map((p) => knownChannel(p));

/** The seafloor's part of a place's shore from its last spot-model run (physics/swim.ts `shoreAt`), or null before one. */
export function shoreBase(st: SpotState): ShoreBase | null {
  const r = st.result;
  if (!r) return null;
  const i = PLACES.findIndex((p) => p.name === st.name);
  const b = r.waves.breaker;
  return {
    HbAll: r.HbAll ?? b.Hb, Hb: b.Hb, hb: b.hb, breakAngleDeg: r.waves.breakAngleDeg, slope: r.waves.slope,
    normalDeg: r.waves.normalDeg, hs0: st.sea.total ?? st.sea.Hs, knownChannel: i >= 0 && KNOWN_CHANNEL[i],
  };
}

/** Per-hour, per-place extras the surf score reads besides the sea and wind (wired in main.ts). */
export interface HourExtras {
  gustMs: number | null;
  /** The wind at the place now, m/s and direction FROM; null falls back to the conditions' wind. */
  wind?: { speedMs: number; fromDeg: number } | null;
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
  /** The sea came from the waves feed; false means the conditions' (mock) swell stood in. */
  liveSea?: boolean;
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
  seaAt: (pin: [number, number]) => (Sea & { others?: Train0[]; swellHs?: number | null; swell2?: Train | null; windSeaHs?: number | null }) | null = () => null,
): SpotPhysics {
  let states: SpotState[] = [];
  const subs = new Set<() => void>();
  const update = () => {
    const c = conditions();
    const ms = validMs();
    const ts = tideState(LIMON_HARMONICS, ms);
    // Position in the cycle (0 low water, 1 high). The gauge correction (metres) lifts the whole curve, highs and
    // lows alike, so it does not move the position; adding it here mixed metres into a 0..1 share.
    const tideLevel = ts.level;
    const tideSize = Math.min(1, ts.range / LIMON_BIG_TIDE.rangeM);
    const sea: Sea = { Hs: c.swellHeightM, Tp: c.swellPeriodS, fromDeg: c.swellDirDeg };
    const wind0 = { speedMs: c.windKt / KT_PER_MS, fromDeg: c.windDirDeg };
    const wxs = PLACES.map((p) => windExtras(ms, p.lngLat, p.name));
    const winds = wxs.map((wx) => wx.wind ?? wind0);
    const seasX = PLACES.map((p) => seaAt(p.lngLat));
    const seas: Sea[] = seasX.map((x) => (x ? { Hs: x.Hs, Tp: x.Tp, fromDeg: x.fromDeg, total: x.total ?? x.Hs } : sea));
    client
      .latestMany(PLACES.map((p, i) => ({ pin: p.lngLat, sea: { Hs: seas[i].Hs, Tp: seas[i].Tp, fromDeg: seas[i].fromDeg }, others: seasX[i]?.others, tideLevel, tideSize, wind: winds[i], knownChannel: KNOWN_CHANNEL[i] })))
      .then((rs) => {
        states = PLACES.map((s, i) => {
          const r = rs[i];
          const wx = wxs[i];
          const wind = winds[i];
          const surf0 = s.brk && r
            ? surfQuality({ brk: s.brk, Hb: r.waves.breaker.Hb, Tp: seas[i].Tp, swellFromDeg: seas[i].fromDeg, windMs: wind.speedMs, windFromDeg: wind.fromDeg, swellHs: seasX[i]?.swellHs, swell2: seasX[i]?.swell2, windSeaHs: seasX[i]?.windSeaHs, tide: { level: ts.level, rising: ts.rising }, gustMs: wx.gustMs, windAhead: wx.ahead, lightning: wx.lightning, squall: wx.squall, rainMmH: wx.rainMmH, sarg: wx.sarg, info: { sstC: wx.sstC, uv: wx.uv } })
            : undefined;
          const surf = surf0 && r ? { ...surf0, ripLevel: r.rip.level } : surf0;
          return { name: s.name, pin: s.lngLat, result: r, sea: seas[i], liveSea: !!seasX[i], surf };
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
