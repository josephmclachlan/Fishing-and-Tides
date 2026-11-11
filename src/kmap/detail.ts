/**
 * The old map's finer rows, under the readings (design pass 3, PLAN 7.82). The CONDITIONS panel (Expand data) still
 * works them out for the crosshair, hour and settings; this lifts the ones that matter for each activity out of it, so
 * they read at a glance in Kinetic Plus style instead of only behind Expand data. A row with no value is left out.
 */
import type { FcActivity } from '../forecast/model';
import { L2 } from './dom';
import { RAIN_TOWNS } from '../region';

export interface Detail {
  k: string;
  /** Label, value, unit and the short line under it. */
  l: string;
  v: string;
  u: string;
  s: string;
  /** Rating level for the stripe (0 very poor .. 4 great), null for a plain fact. */
  lv: number | null;
  /** For the rain by town row: each town's amount. */
  towns?: { name: string; v: string }[];
}

interface Spec {
  k: string;
  l: () => string;
  /** The old row's value element. */
  id: string;
  u?: () => string;
  /** The old row giving the short line (its text), or a fixed line. */
  sub?: string | (() => string);
  /** The old row's colour as a level: a verdict (red, plain, green), or only a warning (red, else none). */
  tone?: boolean | 'warn';
  /** Reads the row its own way (value, unit, line) from the old panel's texts. */
  read?: (get: (id: string) => string) => { v: string; u?: string; s?: string } | null;
}

const R = {
  surface: { k: 'surface', l: () => L2('Surface', 'Superficie'), id: 'sb-surf', tone: true },
  wind3: { k: 'wind3', l: () => L2('Wind in 3 h', 'Viento en 3 h'), id: 'sb-trend', tone: true },
  tidefit: { k: 'tidefit', l: () => L2('Tide fit', 'Marea ideal'), id: 'sb-tide', tone: true },
  power: { k: 'power', l: () => L2('Wave power', 'Potencia'), id: 'sz-pow', u: () => 'kW/m', sub: () => L2('Per metre of wave front', 'Por metro de frente') },
  drift: { k: 'drift', l: () => L2('Longshore drift', 'Deriva litoral'), id: 'sz-drift', u: () => 'm/s', sub: () => L2('Along the beach', 'A lo largo de la playa') },
  rips: {
    k: 'rips', l: () => L2('Rip pull', 'Fuerza de resaca'), id: 'sz-rips', tone: true,
    // "MODERATE 0.6" and a reach of "40": the speed big, the word and how far it runs out underneath.
    read: (get) => {
      const m = /^(.*?)\s*([\d.]+)$/.exec(get('sz-rips'));
      if (!m) return null;
      const reach = get('sz-ripl');
      return { v: m[2], u: 'm/s', s: [m[1], EMPTY.test(reach) ? '' : `${L2('reaches', 'alcanza')} ${reach} m`].filter(Boolean).join(' · ') };
    },
  },
  stingers: { k: 'sting', l: () => L2('Stingers', 'Aguamalas'), id: 'dv-sting', tone: 'warn' },
  runoff: { k: 'runoff', l: () => L2('River runoff', 'Escorrentía'), id: 'dv-runoff', tone: 'warn' },
  bestday: {
    k: 'bestday', l: () => L2('Best day', 'Mejor día'), id: 'dv-day', tone: true,
    // "MON 67 07:00–17:00": the day big, its score and hours underneath.
    read: (get) => {
      const m = /^(\S+)\s+(\d+)\s*(.*)$/.exec(get('dv-day'));
      return m ? { v: m[1], s: `${m[2]}/100${m[3] ? ` · ${m[3]}` : ''}` } : null;
    },
  },
  bottom: { k: 'bottom', l: () => L2('Bottom', 'Fondo'), id: 'dbottom', sub: 'dzone' },
  target: { k: 'target', l: () => L2('Target fish', 'Pez objetivo'), id: 'fish-sp', sub: () => L2('Change it in Expand data', 'Cámbielo en Ampliar datos') },
  bitetimes: { k: 'bitetimes', l: () => L2('Bite times', 'Horas de picada'), id: 'fish-times' },
  verdict: { k: 'verdict', l: () => L2('Boat verdict', 'Veredicto bote'), id: 'bv-verdict', sub: 'bv-why', tone: true },
  comfort: { k: 'comfort', l: () => L2('Sea comfort', 'Comodidad'), id: 'ss-comfort', sub: 'ss-detail', tone: true },
  harbour: { k: 'harbour', l: () => L2('Nearest harbour', 'Puerto cercano'), id: 'an-name', sub: 'an-dist' },
  shelter: { k: 'shelter', l: () => L2('Shelter', 'Abrigo'), id: 'an-shelter', sub: 'an-fetch' },
  squall: { k: 'squall', l: () => L2('Squalls 6 h', 'Turbonadas 6 h'), id: 'wx-squall', sub: 'wx-note', tone: true },
  cape: { k: 'cape', l: () => 'CAPE', id: 'wx-cape', u: () => 'J/kg', sub: () => L2('Storm fuel', 'Energía de tormenta') },
  conf: { k: 'conf', l: () => L2('Model agreement', 'Acuerdo de modelos'), id: 'wx-conf', tone: true },
  rain24: { k: 'rain24', l: () => L2('Rain 24 h', 'Lluvia 24 h'), id: 'wx-rain24', u: () => 'mm' },
} satisfies Record<string, Spec>;

/** What each activity lifts out, in order. Town rain is its own row (`towns`). */
export const DETAIL_FOR: Record<FcActivity, { rows: readonly Spec[]; towns?: boolean }> = {
  surf: { rows: [R.surface, R.wind3, R.tidefit, R.rips, R.power, R.drift] },
  fish: { rows: [R.target, R.bitetimes, R.verdict, R.comfort, R.harbour, R.bottom, R.squall] },
  swim: { rows: [R.rips, R.stingers, R.runoff, R.squall, R.rain24], towns: true },
  snorkel: { rows: [R.bestday, R.stingers, R.runoff, R.bottom] },
  dive: { rows: [R.bestday, R.runoff, R.bottom, R.stingers] },
  spear: { rows: [R.bestday, R.runoff, R.bottom] },
  sail: { rows: [R.verdict, R.comfort, R.harbour, R.shelter, R.squall, R.cape, R.conf, R.rain24], towns: true },
};

const EMPTY = /^\s*(--|—|-|)\s*$/;
const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** The old row's colour as a level: red very poor, plain fair, green great. Pure. */
export const toneLevel = (cls: DOMTokenList | readonly string[]): number => {
  const has = (c: string) => ('contains' in cls ? cls.contains(c) : cls.includes(c));
  return has('red') ? 0 : has('green') ? 4 : 2;
};

/** Splits a reading like "1.4 m/s" or "2.1" into value and unit, when the unit is not given. Pure. */
export function splitValue(text: string, unit = ''): { v: string; u: string } {
  const t = clean(text);
  if (unit) return { v: t, u: unit };
  const m = /^([+-]?\d+(?:[.,]\d+)?)\s*([a-zA-Z/°%³²]+)$/.exec(t);
  return m ? { v: m[1], u: m[2] } : { v: t, u: '' };
}

/** The rows for an activity, read from the old CONDITIONS panel under `root`; empty ones are left out. */
export function readDetails(root: ParentNode | null, act: FcActivity): Detail[] {
  if (!root) return [];
  const el = (id: string) => root.querySelector<HTMLElement>(`#${id}`);
  const out: Detail[] = [];
  const spec = DETAIL_FOR[act];
  const get = (id: string) => clean(el(id)?.textContent);
  for (const r of spec.rows) {
    const e = el(r.id);
    const text = clean(e?.textContent);
    if (!e || EMPTY.test(text)) continue;
    const own = r.read?.(get);
    if (r.read && !own) continue;
    const { v, u } = own ? { v: own.v, u: own.u ?? '' } : splitValue(text, r.u?.() ?? '');
    const sub = own?.s ?? (typeof r.sub === 'function' ? r.sub() : r.sub ? get(r.sub) : '');
    const lv = r.tone === 'warn' ? (e.classList.contains('red') ? 0 : null) : r.tone ? toneLevel(e.classList) : null;
    out.push({ k: r.k, l: r.l(), v, u, s: EMPTY.test(sub) ? '' : sub, lv });
  }
  if (spec.towns) {
    const towns = RAIN_TOWNS.map((tw) => ({ name: tw.name, v: clean(el(`tr-${tw.id}`)?.textContent) })).filter((x) => !EMPTY.test(x.v));
    if (towns.length) out.push({ k: 'towns', l: L2('Rain by town · 3 h', 'Lluvia por pueblo · 3 h'), v: '', u: '', s: '', lv: null, towns });
  }
  return out;
}
