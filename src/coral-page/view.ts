/**
 * Pure helpers for the CORAL page (PLAN 7.65): how readings map onto the page's five rating colours, how the
 * HUD's caps text reads as sentences, and dates in Costa Rica time. No DOM, so it is tested directly.
 *
 * Levels are the forecast page's (src/forecast/forecast.css `.l0`..`.l4`): 0 red (worst) … 3 green, 4 teal.
 */
import type { RiskLevel } from '../coral/risks';
import type { CoralSite, CoralStatus } from '../coral/store';
import { overdue } from '../coral/folder-view';

export type Level = 0 | 1 | 2 | 3 | 4;

/** NOAA Coral Reef Watch alert (0 none … 7 alert 5) as a page level: none green, watch amber, warning orange, alert 1+ red. */
export const alertLevelOf = (alert: number | null | undefined): Level | null =>
  alert === null || alert === undefined || !Number.isFinite(alert) ? null : alert >= 3 ? 0 : alert >= 2 ? 1 : alert >= 1 ? 2 : 3;

/** A risk row or MUD WEEKS level as a page level. */
export const riskLevelOf = (l: RiskLevel | 'none' | undefined): Level | null => (l === 'high' ? 0 : l === 'watch' ? 2 : l === 'ok' ? 3 : null);

/** A logged status as a page level (unknown has none). */
export const statusLevelOf = (s: CoralStatus | undefined): Level | null =>
  s === 'healthy' ? 3 : s === 'bleaching' ? 1 : s === 'disease' ? 1 : s === 'dead' ? 0 : null;

/** CSS class for a level: `l0`..`l4`, or `l-none`. */
export const lc = (l: Level | null) => (l === null ? 'l-none' : `l${l}`);

/**
 * How bleached the reef picture looks, 0..1: nothing below DHW 1, fully white at DHW 12 (CRW alert 3), so
 * ALERT 1 (DHW 4) already looks pale and ALERT 2 (DHW 8) mostly white.
 */
export const bleachShare = (dhw: number | null | undefined) => (dhw === null || dhw === undefined || !Number.isFinite(dhw) ? 0 : Math.min(1, Math.max(0, (dhw - 1) / 11)));

/** How murky the picture's water looks, 0..1, from MUD WEEKS (WATCH 2 about half, HIGH 4 and over dark). */
export const murkShare = (mw: number | null | undefined) => (mw === null || mw === undefined || !Number.isFinite(mw) ? 0 : Math.min(1, Math.max(0, mw / 5)));

/** Where a value sits on a gauge from 0 to `max`, as a percentage, clamped. */
export const gaugePct = (v: number, max: number) => (Number.isFinite(v) ? Math.min(100, Math.max(0, (v / max) * 100)) : 0);

/** Words kept in capitals when the HUD's caps text is turned into a sentence. */
const ACRONYMS = ['SINAC', 'SCTLD', 'IUCN', 'DHW', 'CRW', 'NOAA', 'MINAE', 'ICT', 'UCR', 'GPS', 'SST', 'UV', 'MMM', 'ERDDAP', 'GLOFAS', 'CARMABI', 'AGRRA', 'SITADA', 'ACLAC', 'MSL', 'LAT'];
/** Place and proper names, in their written form. */
const PROPER = [
  'Costa Rica', 'Gandoca-Manzanillo', 'Gandoca', 'Manzanillo', 'Cahuita', 'Limón', 'Isla Uvita', 'Punta Uva', 'Punta Mona', 'Cocles', 'Puerto Viejo',
  'Caribbean', 'Caribe', 'Raising Coral', 'Río La Estrella', 'Estrella', 'Sixaola', 'Banano', 'Coral Reef Watch', 'Panamá', 'Panama', 'Secchi', 'Kd490', 'Aug', 'Sept', 'Oct',
];
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ACR_RE = new RegExp(`(^|[^\\p{L}])(${ACRONYMS.map(reEsc).join('|')})(?=$|[^\\p{L}\\d])`, 'giu');
const PROPER_RE = new RegExp(`(^|[^\\p{L}])(${PROPER.map(reEsc).join('|')})(?=$|[^\\p{L}])`, 'giu');
const PROPER_BY = new Map(PROPER.map((p) => [p.toLocaleLowerCase('es'), p]));

/**
 * The HUD's caps ("NO TAKING ANY CORAL IN COSTA RICA (ART. 5).") as a sentence for the page ("No taking any
 * coral in Costa Rica (art. 5)."), keeping acronyms and place names. Text that already has lower case is left alone.
 */
export function soften(s: string): string {
  if (!s || /\p{Ll}/u.test(s)) return s;
  let out = s.toLocaleLowerCase('es');
  // Capital after the start and after a full stop, a colon or a question mark.
  out = out.replace(/(^|[.:?!]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase('es'));
  out = out.replace(PROPER_RE, (_, a: string, b: string) => a + (PROPER_BY.get(b.toLocaleLowerCase('es')) ?? b));
  out = out.replace(ACR_RE, (_, a: string, b: string) => a + b.toLocaleUpperCase('es'));
  return out;
}

/** "LIMÓN · ISLA UVITA" → "Limón · Isla Uvita"; "BOULDER BRAIN" → "Boulder Brain". */
export const titleCase = (s: string) => s.toLocaleLowerCase('es').replace(/(^|[\s\-·(])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase('es'));

const TZ_NAME = 'America/Costa_Rica';
const fmt = new globalThis.Map<string, Intl.DateTimeFormat>();
const dtf = (lang: string, o: Intl.DateTimeFormatOptions) => {
  const k = lang + JSON.stringify(o);
  let f = fmt.get(k);
  if (!f) fmt.set(k, (f = new Intl.DateTimeFormat(lang === 'es' ? 'es-CR' : 'en-GB', { timeZone: TZ_NAME, ...o })));
  return f;
};
/** "29 Oct" / "29 oct" in Costa Rica time. */
export const shortDate = (ms: number, lang: string) => (Number.isFinite(ms) ? dtf(lang, { day: 'numeric', month: 'short' }).format(ms).replace('.', '') : '--');
/** "Sat 29 Oct". */
export const dayDate = (ms: number, lang: string) => (Number.isFinite(ms) ? dtf(lang, { weekday: 'short', day: 'numeric', month: 'short' }).format(ms).replace(/\./g, '') : '--');
/** "19:40" in Costa Rica time. */
export const clockCR = (ms: number) => (Number.isFinite(ms) ? dtf('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(ms) : '--');
/** "Oct" for axis ticks. */
export const monthName = (ms: number, lang: string) => dtf(lang, { month: 'short' }).format(ms).replace('.', '');

/** Whole days from `a` to `b`, by Costa Rica calendar day (UTC−6, no daylight saving). */
export const daysBetween = (a: number, b: number) => Math.round((Math.floor((b - 6 * 3.6e6) / 864e5) * 864e5 - Math.floor((a - 6 * 3.6e6) / 864e5) * 864e5) / 864e5);

/** Logged sites grouped by their nearest reef, in the order of `reefIds`; sites with no reef at the end under ''. */
export function sitesByReef(sites: readonly CoralSite[], reefOf: (s: CoralSite) => string, reefIds: readonly string[]): { reefId: string; sites: CoralSite[] }[] {
  const by = new globalThis.Map<string, CoralSite[]>();
  for (const s of sites) {
    const id = reefOf(s);
    by.set(id, [...(by.get(id) ?? []), s]);
  }
  const order = [...reefIds, ...[...by.keys()].filter((k) => !reefIds.includes(k))];
  return order.filter((id) => by.has(id)).map((id) => ({ reefId: id, sites: by.get(id)!.sort((a, b) => (a.name || '').localeCompare(b.name || '')) }));
}

/** Open missions across every site, soonest first (so overdue ones lead); `overdue` as the drawer marks it. */
export function upcomingMissions(sites: readonly CoralSite[], nowMs: number) {
  return sites
    .flatMap((s) => s.missions.filter((m) => !m.doneVisitId).map((m) => ({ site: s, mission: m, overdue: overdue(m, nowMs) })))
    .sort((a, b) => a.mission.t - b.mission.t);
}

/** Field log totals for the SITES front: sites by kind, visits in the last 30 days, open and overdue missions. */
export function logTotals(sites: readonly CoralSite[], nowMs: number) {
  const ups = upcomingMissions(sites, nowMs);
  return {
    sites: sites.length,
    reef: sites.filter((s) => s.kind === 'reef').length,
    nursery: sites.filter((s) => s.kind === 'nursery').length,
    garden: sites.filter((s) => s.kind === 'garden').length,
    visits30: sites.reduce((n, s) => n + s.visits.filter((v) => nowMs - v.t <= 30 * 864e5 && v.t <= nowMs).length, 0),
    outplanted: sites.reduce((n, s) => n + s.visits.reduce((k, v) => k + (v.outplanted ?? 0), 0), 0),
    open: ups.length,
    overdue: ups.filter((u) => u.overdue).length,
  };
}
