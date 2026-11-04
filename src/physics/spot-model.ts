/**
 * Spot conditions with caching (PLAN 3.6): what the physics worker runs. Pure, no DOM.
 *
 * Geometry is cached per pin and refraction per (pin, period, direction, spread), rounded
 * to what the forecasts resolve (0.5 s, 5°), so scrubbing the time slider or changing
 * height or tide only re-runs the cheap breaker and rip formulas.
 */
import type { Grid } from './bathy';
import { seafloorDepth, type DepthFn, type RefractionResult } from './refraction';
import { ripRisk, onshoreWind, type Rip } from './rip';
import { breakerHeight, combinedBreaker, obliqueKr } from './breaking';
import { defaultSpread, spotGeometry, spotRefraction, spotWavesFrom, type SeaState, type SpotGeometry, type SpotWaves } from './surf-zone';

export interface SpotRequest {
  pin: [number, number];
  sea: SeaState;
  /** 0 = low water, 1 = high water (3.1 tideState().level). */
  tideLevel: number;
  /** Size of this tide, 0..1 (see RipInput.tideSize). */
  tideSize?: number;
  /** Wind speed (m/s) and direction it blows FROM, if known. */
  wind?: { speedMs: number; fromDeg: number };
  knownChannel?: boolean;
  /** The other wave trains at the spot (second swell, wind sea, or the swells when the wind sea leads), each broken on its own period. */
  others?: readonly { Hs: number; Tp: number; fromDeg: number }[];
}

export interface SpotResult {
  waves: SpotWaves;
  rip: Rip;
  /** Breaker height of every train together (the main train's from the ray model, the others estimated), m. */
  HbAll: number;
}

export interface SeafloorGrids { region: Grid; macro: Grid; land?: Grid }

export function createSpotModel(depth: DepthFn, opts: { fanStepDeg?: number; maxCache?: number } = {}) {
  const geoms = new Map<string, SpotGeometry | null>();
  const refr = new Map<string, RefractionResult>();
  const maxCache = opts.maxCache ?? 500;
  const pinKey = (p: [number, number]) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;

  const geometry = (pin: [number, number]) => {
    const k = pinKey(pin);
    if (!geoms.has(k)) geoms.set(k, spotGeometry(depth, pin));
    return geoms.get(k)!;
  };

  return {
    /** Conditions at a shoreline pin, or null where there's no sea nearby. */
    spot(req: SpotRequest): SpotResult | null {
      const geom = geometry(req.pin);
      if (!geom) return null;
      const Tp = Math.max(1, Math.round(req.sea.Tp * 2) / 2);
      const fromDeg = (Math.round(req.sea.fromDeg / 5) * 5) % 360;
      const spreadDeg = Math.round(req.sea.spreadDeg ?? defaultSpread(Tp));
      const k = `${pinKey(req.pin)}|${Tp}|${fromDeg}|${spreadDeg}`;
      let r = refr.get(k);
      if (!r) {
        if (refr.size >= maxCache) refr.delete(refr.keys().next().value!);
        r = spotRefraction(depth, geom, { ...req.sea, Tp, fromDeg, spreadDeg }, { fanStepDeg: opts.fanStepDeg });
        refr.set(k, r);
      }
      const sea = { ...req.sea, Tp };
      const waves = spotWavesFrom(geom, r, sea);
      // Other trains: estimated refraction from their angle to the shore, own period; energies add (audit G).
      const HbAll = combinedBreaker([waves.breaker.Hb, ...(req.others ?? []).map((o) => breakerHeight(o.Hs * obliqueKr(o.fromDeg - geom.normalDeg), o.Tp))]);
      const grow = waves.breaker.Hb > 0 ? HbAll / waves.breaker.Hb : 1;
      const rip = ripRisk({
        Hb: HbAll,
        hb: waves.breaker.hb * grow,
        Tp,
        // The rip drivers (Lushine, Dusek and Seim) are about the angle of the breakers, not of the waves offshore.
        angleDeg: waves.breakAngleDeg,
        slope: waves.slope,
        tideLevel: req.tideLevel,
        tideSize: req.tideSize,
        onshoreWindMs: req.wind ? onshoreWind(req.wind.speedMs, req.wind.fromDeg, geom.normalDeg) : 0,
        knownChannel: req.knownChannel,
      });
      return { waves, rip, HbAll };
    },
    cacheSize: () => refr.size,
  };
}

export const spotModelFromGrids = (g: SeafloorGrids, opts?: { fanStepDeg?: number }) => createSpotModel(seafloorDepth(g.region, g.macro, g.land), opts);
