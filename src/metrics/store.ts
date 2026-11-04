/** WATCH selection (PLAN 7.13): which metrics are tracked and the chosen region, kept on the device. */
import { MAX_TRACKED, METRIC_BY_ID } from './registry';
import type { Region } from './forecast';

export interface WatchState {
  metrics: string[];
  /** null = every named spot on the coast. */
  region: Region | null;
}

export const KEY = 'watch.v1';
export const DEFAULT_STATE: WatchState = { metrics: ['swell', 'wind', 'rain', 'tide'], region: null };
export const RADII_KM = [5, 10, 20, 40] as const;

/** Read the saved state, repairing anything unknown or out of range; defaults when nothing usable is stored. */
export function loadWatch(store: Pick<Storage, 'getItem'> | undefined): WatchState {
  try {
    const raw = JSON.parse(store?.getItem(KEY) ?? 'null');
    const metrics = Array.isArray(raw?.metrics) ? [...new Set(raw.metrics as unknown[])].filter((id): id is string => typeof id === 'string' && METRIC_BY_ID.has(id)).slice(0, MAX_TRACKED) : DEFAULT_STATE.metrics;
    const r = raw?.region;
    const region = r && Array.isArray(r.center) && r.center.length === 2 && r.center.every(Number.isFinite) && Number.isFinite(r.radiusKm) && r.radiusKm > 0 ? ({ center: [r.center[0], r.center[1]], radiusKm: Math.min(100, r.radiusKm) } as Region) : null;
    return { metrics, region };
  } catch {
    return { ...DEFAULT_STATE, metrics: [...DEFAULT_STATE.metrics] };
  }
}

export function saveWatch(store: Pick<Storage, 'setItem'> | undefined, s: WatchState): void {
  try {
    store?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode or full: the selection just isn't remembered */
  }
}
