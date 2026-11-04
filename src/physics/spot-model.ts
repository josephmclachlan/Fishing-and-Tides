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
import { defaultSpread, spotGeometry, spotRefraction, spotWavesFrom, type SeaState, type SpotGeometry, type SpotWaves } from './surf-zone';

export interface SpotRequest {
  pin: [number, number];
  sea: SeaState;
  /** 0 = low water, 1 = high water (3.1 tideState().level). */
  tideLevel: number;
  /** Wind speed (m/s) and direction it blows FROM, if known. */
  wind?: { speedMs: number; fromDeg: number };
  knownChannel?: boolean;
}

export interface SpotResult {
  waves: SpotWaves;
  rip: Rip;
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
      const rip = ripRisk({
        Hb: waves.breaker.Hb,
        hb: waves.breaker.hb,
        Tp,
        // The rip drivers (Lushine, Dusek and Seim) are about the angle of the breakers, not of the waves offshore.
        angleDeg: waves.breakAngleDeg,
        slope: waves.slope,
        tideLevel: req.tideLevel,
        onshoreWindMs: req.wind ? onshoreWind(req.wind.speedMs, req.wind.fromDeg, geom.normalDeg) : 0,
        knownChannel: req.knownChannel,
      });
      return { waves, rip };
    },
    cacheSize: () => refr.size,
  };
}

export const spotModelFromGrids = (g: SeafloorGrids, opts?: { fanStepDeg?: number }) => createSpotModel(seafloorDepth(g.region, g.macro, g.land), opts);
