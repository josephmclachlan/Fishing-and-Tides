/**
 * What a coral site folder shows (PLAN 7.37), as label-key/value pairs, so the panel only lays them
 * out. Pure: no DOM, no translation (keys are i18n keys the panel passes to `t`).
 */
import type { Conditions, CoralSite, Measurements, MeasureId, Mission, Photo, Visit } from './store';
import { MEASURES } from './store';
import { REGION } from '../region';

export type Row = [key: string, value: string];

const UNIT: Record<MeasureId, string> = { bleachPct: '%', sedimentPct: '%', secchiM: ' m', trapMgCm2Day: ' mg/cm²/d', waterTempC: ' °C', outplanted: '' };
const DIGITS: Record<MeasureId, number> = { bleachPct: 0, sedimentPct: 0, secchiM: 1, trapMgCm2Day: 1, waterTempC: 1, outplanted: 0 };
const num = (x: number, d: number) => (d ? x.toFixed(d) : String(Math.round(x)));

/** The measurements a visit has, in MEASURES order. */
export const measureRows = (m: Measurements): Row[] =>
  MEASURES.filter((k) => m[k] !== undefined).map((k) => [`coral.m.${k}`, `${num(m[k]!, DIGITS[k])}${UNIT[k]}`]);

const ALERT_KEYS = ['none', 'watch', 'warning', 'alert1', 'alert2', 'alert3', 'alert4', 'alert5'];

/** A frozen conditions snapshot as rows; `alert` values are i18n keys (prefixed `@`) for the panel to translate. */
export function conditionRows(c: Conditions | undefined): Row[] {
  if (!c) return [];
  const rows: Row[] = [];
  if (c.dhw !== undefined) rows.push(['coral.c.dhw', c.dhw.toFixed(1)]);
  if (c.alert !== undefined && ALERT_KEYS[c.alert]) rows.push(['coral.c.alert', `@coral.alert.${ALERT_KEYS[c.alert]}`]);
  if (c.sstC !== undefined) rows.push(['coral.c.sst', `${c.sstC.toFixed(1)} °C${c.sstAnomalyC !== undefined ? ` (${c.sstAnomalyC >= 0 ? '+' : ''}${c.sstAnomalyC.toFixed(1)})` : ''}`]);
  if (c.flowRatio !== undefined) rows.push(['coral.c.river', `${c.flowRatio.toFixed(1)}×`]);
  if (c.rainMm !== undefined) rows.push(['coral.c.rain', `${Math.round(c.rainMm)} mm`]);
  if (c.hsM !== undefined) rows.push(['coral.c.swell', `${c.hsM.toFixed(1)} m`]);
  if (c.lowTideM !== undefined) rows.push(['coral.c.lowtide', `${c.lowTideM.toFixed(2)} m`]);
  if (c.sargassum) rows.push(['coral.c.sargassum', `@sarg.level.${c.sargassum}`]);
  return rows;
}

/** When a photo was taken, else when it was added. */
export const photoTime = (p: Photo) => p.takenAt ?? p.addedAt;

/** All of a site's photos, newest first. */
export const photosNewestFirst = (s: CoralSite) => [...s.photos].sort((a, b) => photoTime(b) - photoTime(a));

/** The next open mission on or after `now`'s day, else the most overdue one, else null. */
export function nextMission(s: CoralSite, now: number): Mission | null {
  const open = s.missions.filter((m) => !m.doneVisitId);
  const day0 = Math.floor(now / 864e5) * 864e5;
  return open.find((m) => m.t >= day0) ?? open[open.length - 1] ?? null;
}

/** True when the mission's planned day is before today. */
export const overdue = (m: Mission, now: number) => !m.doneVisitId && m.t < Math.floor(now / 864e5) * 864e5;

/** The newest visit, or null. */
export const lastVisit = (s: CoralSite): Visit | null => s.visits[s.visits.length - 1] ?? null;

/** Parse a comma-separated tag field: trimmed, no empties, no repeats, at most 12. */
export const parseTags = (s: string) => [...new Set(s.split(',').map((x) => x.trim()).filter(Boolean))].slice(0, 12);

/** A yyyy-mm-dd date input's value as noon UTC that day (so time zones never move it), or null. */
export function dateInputMs(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null;
}

/** yyyy-mm-dd of a moment in Costa Rica time (the app's one clock). */
export const localDay = (ms: number, tzOffsetH = REGION.tzOffsetH) => new Date(ms + tzOffsetH * 3.6e6).toISOString().slice(0, 10);
