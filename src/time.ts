/**
 * Forecast-time state (PLAN 1.5). Pure: no DOM, no timers.
 *
 * One store holds how many whole hours ahead of NOW the HUD is showing. Everything that varies
 * with time (particles, tide and condition readouts, later every adapter) subscribes here and
 * asks for `validMs()`, so the slider is the single source of truth for "what time am I looking at".
 */
import { REGION } from './region';
import { t, type Key } from './i18n';

/**
 * The slider reaches 30 days, in three bands of decreasing certainty:
 *  - FORECAST (0 to 7 d): numerical model output, hourly.
 *  - LOW CONF (7 to 16 d): models still run but skill is poor; shown dimmed, 3 h steps.
 *  - OUTLOOK (16 to 30 d): no weather skill left, so ocean fields fall back to climatology
 *    (historical averages) and the display says so, 1 day steps.
 * Tides are harmonic, so they stay exact in every band.
 */
export const HORIZON_H = 720;
export type Band = 'forecast' | 'lowconf' | 'outlook';
export const BANDS: readonly { id: Band; fromH: number; stepH: number }[] = [
  { id: 'forecast', fromH: 0, stepH: 1 },
  { id: 'lowconf', fromH: 168, stepH: 3 },
  { id: 'outlook', fromH: 384, stepH: 24 },
];
const HOUR_MS = 3.6e6;

export function bandFor(offsetH: number) {
  let b = BANDS[0];
  for (const x of BANDS) if (offsetH >= x.fromH) b = x;
  return b;
}

export interface TimeStore {
  /** Whole hours ahead of NOW, 0..HORIZON_H, snapped to the band's step. */
  offsetH(): number;
  /** The anchor: the hour boundary at or before the moment the app loaded. */
  baseMs(): number;
  /** Epoch ms of the time being viewed. */
  validMs(): number;
  /** True while viewing a forecast hour rather than now. */
  isForecast(): boolean;
  band(): Band;
  set(offsetH: number): void;
  step(deltaH: number): void;
  /** Back to NOW. */
  reset(): void;
  subscribe(fn: () => void): () => void;
}

export function createTimeStore(nowMs = Date.now()): TimeStore {
  const base = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  let offset = 0;
  const subs = new Set<() => void>();
  const set = (h: number) => {
    const clamped = Number.isFinite(h) ? Math.min(HORIZON_H, Math.max(0, Math.round(h))) : 0;
    const { stepH, fromH } = bandFor(clamped);
    const next = fromH + Math.round((clamped - fromH) / stepH) * stepH;
    if (next === offset) return;
    offset = next;
    subs.forEach((fn) => fn());
  };
  return {
    offsetH: () => offset,
    baseMs: () => base,
    validMs: () => base + offset * HOUR_MS,
    isForecast: () => offset > 0,
    band: () => bandFor(offset).id,
    set,
    step: (d) => set(offset + d * bandFor(offset + (d < 0 ? -1 : 0)).stepH),
    reset: () => set(0),
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** "+06H" style offset label for the segmented display. */
export function offsetLabel(offsetH: number): string {
  return offsetH <= 0 ? t('time.now') : `+${String(offsetH).padStart(2, '0')}H`;
}

/** Day, date and hour of a valid time in Costa Rica time (REGION.tzOffsetH), e.g. "MON 02 08:00". */
export function validLabel(ms: number, tzOffsetH: number = REGION.tzOffsetH): string {
  const d = new Date(ms + tzOffsetH * 3_600_000);
  return `${t(`day.${d.getUTCDay()}` as Key)} ${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:00`;
}
