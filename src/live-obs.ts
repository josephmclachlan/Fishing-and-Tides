/**
 * LIVE OBS (PLAN 2.13): the latest real measurement from every source that observes this coast, as
 * opposed to a model: the Limón tide gauge (IOC, every minute), the Limón airport METAR (hourly by
 * day), the newest satellite SST and chlorophyll passes and the newest ASCAT wind swath just offshore
 * (adapters/passes.ts, PLAN 2.14). Each shows its age
 * with a green/amber/red freshness lamp, in a drawer (tab OBS) and as labels on the map (layer
 * 'obs', style ids `ob-`). The freshness limits follow each source's normal cadence: an airport
 * report 10 h old overnight is normal (amber), a gauge reading 10 h old is a fault (red).
 */
import type { Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { METAR_STATION, TIDE_STATION } from './region';
import type { GaugeReading } from './adapters/gauge';
import type { MetarObs } from './adapters/metar-parse';
import { CLOUDED_OUT, passList, scatMean, type Pass, type PassData } from './adapters/passes';
import type { GridSeries } from './adapters/pack';
import { agoWords } from './adapters/data-age';

const ago = (ms: number) => agoWords(ms, (n, u) => t(`ago.${u}` as Key, { n }));
import { t, type Key } from './i18n';
import { closeButton, type Sheets } from './sheets';
import type { TideFix } from './physics/tide-fix';
import { appliedScale, type WindFix } from './adapters/wind-fix';

export type ObsId = 'gauge' | 'metar' | 'sst-pass' | 'chl-pass' | 'scat-pass';
export type Fresh = 'green' | 'amber' | 'red';

const MIN = 60e3, HOUR = 3.6e6, DAY = 864e5;
/** Age limits per source: green up to `green`, amber up to `amber`, red beyond. */
export const OBS_FRESH: Record<ObsId, { green: number; amber: number }> = {
  // Reports every minute and reaches IOC about 10 minutes late.
  gauge: { green: 30 * MIN, amber: 3 * HOUR },
  // Hourly while the airport is open (about 06–18 local); the overnight gap is normal.
  metar: { green: 90 * MIN, amber: 14 * HOUR },
  // Two passes a day, one to two days late, often clouded out.
  'sst-pass': { green: 48 * HOUR, amber: 4 * DAY },
  // One pass a day, and the coast is usually under cloud at 13:30.
  'chl-pass': { green: 4 * DAY, amber: 8 * DAY },
  // Up to four swaths a day, published as interim daily files, so usually 12 to 36 h old.
  'scat-pass': { green: 36 * HOUR, amber: 4 * DAY },
};

export function freshness(id: ObsId, ageMs: number): Fresh {
  const l = OBS_FRESH[id];
  return !Number.isFinite(ageMs) ? 'red' : ageMs <= l.green ? 'green' : ageMs <= l.amber ? 'amber' : 'red';
}

export interface ObsRow {
  id: ObsId;
  /** When it was measured, epoch ms; null when there is nothing. */
  obsMs: number | null;
  fresh: Fresh;
  /** Where to label it on the map. */
  lngLat: [number, number] | null;
  gauge?: { levelM: number; residualM: number };
  metar?: { windFromDeg: number | null; windKt: number | null; gustKt: number | null; tempC: number | null };
  pass?: { mean: number; clear: number; night: boolean };
  /** Satellite wind: vector-mean direction, mean speed (m/s), share of the box covered, morning or evening pass. */
  scat?: { fromDeg: number; speedMs: number; clear: number; evening: boolean };
}

export interface ObsInputs {
  gauge: readonly GaugeReading[];
  metar: readonly MetarObs[];
  passes: PassData | null;
  /** The corrections learnt from these measurements (PLAN 7.10). */
  fixes?: { tide: TideFix | null; wind: WindFix | null };
}

/** The newest pass that saw at least CLOUDED_OUT of the sea, else the newest pass. */
export function bestPass(list: readonly Pass[]): Pass | null {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].clear >= CLOUDED_OUT) return list[i];
  return list.at(-1) ?? null;
}

/** Centre of what a pass saw: the mean position of its clear cells. */
export function seenCentre(s: GridSeries, v: string, obsMs: number): [number, number] | null {
  const k = s.meta.times.indexOf(obsMs);
  const f = k >= 0 ? s.values[v][k] : null;
  if (!f) return null;
  const g = s.meta.grid;
  let n = 0, x = 0, y = 0;
  for (let i = 0; i < f.length; i++)
    if (Number.isFinite(f[i])) (n++, (x += g.lon0 + (i % g.cols) * g.dlon), (y += g.lat0 - Math.floor(i / g.cols) * g.dlat));
  return n ? [x / n, y / n] : null;
}

/** One row per source, in a fixed order, with its freshness at `now`. */
export function obsRows(d: ObsInputs, now = Date.now()): ObsRow[] {
  const rows: ObsRow[] = [];
  const g = d.gauge.at(-1);
  rows.push({
    id: 'gauge', obsMs: g?.t ?? null, fresh: freshness('gauge', g ? now - g.t : NaN), lngLat: [...TIDE_STATION.lngLat],
    gauge: g ? { levelM: g.levelM, residualM: g.levelM - g.tideM } : undefined,
  });
  const m = d.metar[0];
  rows.push({
    id: 'metar', obsMs: m?.t ?? null, fresh: freshness('metar', m ? now - m.t : NaN), lngLat: [...METAR_STATION.lngLat],
    metar: m ? { windFromDeg: m.windFromDeg, windKt: m.windKt, gustKt: m.gustKt, tempC: m.tempC } : undefined,
  });
  for (const [id, v, s] of [['sst-pass', 'sst', d.passes?.sst ?? null], ['chl-pass', 'chl', d.passes?.chl ?? null]] as const) {
    const p = bestPass(passList(s, v));
    rows.push({
      id, obsMs: p?.obsMs ?? null, fresh: freshness(id, p ? now - p.obsMs : NaN),
      lngLat: p && s ? seenCentre(s, v, p.obsMs) : null,
      pass: p ? { mean: p.mean, clear: p.clear, night: /night/i.test(p.source) } : undefined,
    });
  }
  const scat = d.passes?.scat ?? null;
  const sp = bestPass(passList(scat, 'u'));
  const sm = sp && scat ? scatMean(scat, scat.meta.times.indexOf(sp.obsMs)) : null;
  rows.push({
    id: 'scat-pass', obsMs: sp?.obsMs ?? null, fresh: freshness('scat-pass', sp ? now - sp.obsMs : NaN),
    lngLat: sp && scat ? seenCentre(scat, 'u', sp.obsMs) : null,
    scat: sp && sm ? { fromDeg: sm.fromDeg, speedMs: sm.speed, clear: sp.clear, evening: /evening/i.test(sp.source) } : undefined,
  });
  return rows;
}

const RANK: Record<Fresh, number> = { red: 0, amber: 1, green: 2 };
export const worstFresh = (rows: readonly ObsRow[]): Fresh => rows.reduce<Fresh>((w, r) => (RANK[r.fresh] < RANK[w] ? r.fresh : w), 'green');

const sign = (x: number, d = 2) => `${x >= 0 ? '+' : ''}${x.toFixed(d)}`;
const KT_PER_MS = 3600 / 1852;
const pad3 = (x: number) => String(Math.round(x) % 360).padStart(3, '0');

/** The reading in one line, e.g. "+0.12 M", "070° 12 KT G18", "29.4 °C". */
export function valueText(r: ObsRow): string {
  if (r.gauge) return `${sign(r.gauge.levelM)} ${t('unit.m')}`;
  if (r.metar) {
    const m = r.metar;
    if (m.windKt === null) return '--';
    if (m.windKt === 0) return t('obs.calm');
    return `${m.windFromDeg === null ? t('obs.vrb') : `${pad3(m.windFromDeg)}°`} ${Math.round(m.windKt)} ${t('unit.kt')}${m.gustKt ? ` G${Math.round(m.gustKt)}` : ''}`;
  }
  if (r.scat) return `${pad3(r.scat.fromDeg)}° ${Math.round(r.scat.speedMs * KT_PER_MS)} ${t('unit.kt')}`;
  if (r.pass && Number.isFinite(r.pass.mean)) return r.id === 'sst-pass' ? `${r.pass.mean.toFixed(1)} ${t('unit.degC')}` : `${r.pass.mean.toFixed(2)} ${t('obs.mgm3')}`;
  return '--';
}

/** The second line: what else matters about it. */
export function detailText(r: ObsRow): string {
  if (r.gauge) return t('obs.vsTide', { d: sign(r.gauge.residualM) });
  if (r.metar) return r.metar.tempC === null ? '' : `${t('obs.air')} ${Math.round(r.metar.tempC)} ${t('unit.degC')}`;
  if (r.scat) return `${t(r.scat.evening ? 'obs.evening' : 'obs.morning')} · ${t('obs.covered', { p: Math.round(100 * r.scat.clear) })}`;
  if (r.pass) return `${r.id === 'sst-pass' ? t(r.pass.night ? 'obs.night' : 'obs.day') + ' · ' : ''}${t('obs.clear', { p: Math.round(100 * r.pass.clear) })}`;
  return t('obs.none');
}

const TONE: Record<Fresh, string> = { green: 'green', amber: '', red: 'red' };
// LOW is amber, not red: a weak correction is not a fault.
const CONF_TONE = { HIGH: 'green', MED: '', LOW: '' } as const;

/** The MODEL CORRECTIONS lines (PLAN 7.10): what was learnt, how sure, and what it rests on. */
export function fixRows(f: ObsInputs['fixes']): { name: string; value: string; detail: string; tone: string }[] {
  const w = f?.wind, tf = f?.tide;
  return [
    w
      ? { name: t('obs.fix.wind'), value: `×${w.scale.toFixed(2)}`, tone: CONF_TONE[w.confidence],
          detail: `${t('obs.fix.windDetail', { c: t(`wx.conf.${w.confidence}` as Key), n: w.passes, a: Math.round(w.rmsBefore * KT_PER_MS), b: Math.round(w.rmsAfter * KT_PER_MS) })}${appliedScale(w) === 1 && w.scale !== 1 ? ` · ${t('obs.fix.notApplied')}` : ''}` }
      : { name: t('obs.fix.wind'), value: '--', tone: '', detail: t('obs.fix.none') },
    tf
      ? { name: t('obs.fix.tide'), value: `${sign(tf.offsetM)} ${t('unit.m')}`, tone: CONF_TONE[tf.confidence],
          detail: t('obs.fix.tideDetail', { c: t(`wx.conf.${tf.confidence}` as Key), h: tf.hours, s: tf.sigmaM.toFixed(2) }) }
      : { name: t('obs.fix.tide'), value: '--', tone: '', detail: t('obs.fix.none') },
  ];
}
const LAMP: Record<Fresh, string> = { green: 'pass', amber: 'warn', red: 'fail' };

export interface LiveObs {
  refresh(): void;
}

/** The OBS drawer and its tab (lamp = the stalest source), plus the map labels. */
export function mountLiveObs(root: HTMLElement, map: Map, sheets: Sheets, data: () => ObsInputs, now: () => number = Date.now): LiveObs {
  const el = document.createElement('section');
  el.className = 'panel check obs';
  el.id = 'obs-panel';
  el.innerHTML = `<div class="ph"><span>${t('obs.title')} <span class="tag" id="ob-all">--</span></span></div>
    <div class="ck-list" id="ob-list"></div>
    <div class="lbl ob-fix-h">${t('obs.fixes')}</div>
    <div class="ck-list" id="ob-fix"></div>
    <p class="rules-advice">${t('obs.note')} ${t('obs.fixNote')}</p>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('obs')));
  root.appendChild(el);
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab check-open';
  tab.setAttribute('aria-controls', el.id);
  root.querySelector('.top-tabs')?.appendChild(tab);
  tab.addEventListener('click', () => sheets.toggle('obs'));

  const colours = () => {
    const css = (n: string, f: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
    return { green: css('--green', '#39ff7a'), amber: css('--amber', '#ffb000'), red: css('--red', '#ff3b2f') };
  };
  const geo = (rows: ObsRow[]): FeatureCollection => ({
    type: 'FeatureCollection',
    features: rows.filter((r) => r.lngLat && r.obsMs !== null).map((r) => ({
      type: 'Feature',
      properties: { fresh: r.fresh, label: `${t(`obs.short.${r.id}` as Key)} ${valueText(r)}\n${ago(now() - r.obsMs!)}` },
      geometry: { type: 'Point', coordinates: r.lngLat! },
    })),
  });
  const ensureLayer = (fc: FeatureCollection) => {
    const src = map.getSource('ob') as { setData?: (d: FeatureCollection) => void } | undefined;
    if (src?.setData) return src.setData(fc);
    if (!(map.isStyleLoaded() || map.getLayer('grat-macro'))) return;
    const c = colours();
    const colour = ['match', ['get', 'fresh'], 'green', c.green, 'red', c.red, c.amber] as unknown as string;
    map.addSource('ob', { type: 'geojson', data: fc });
    map.addLayer({ id: 'ob-dot', type: 'circle', source: 'ob', minzoom: 7.5, paint: { 'circle-radius': 4, 'circle-color': '#000', 'circle-stroke-width': 1.5, 'circle-stroke-color': colour } });
    map.addLayer({
      id: 'ob-label', type: 'symbol', source: 'ob', minzoom: 7.5,
      layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-justify': 'left', 'text-letter-spacing': 0.08 },
      paint: { 'text-color': colour, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };

  const render = () => {
    const rows = obsRows(data(), now());
    const worst = worstFresh(rows);
    const open = sheets.is('obs');
    el.classList.toggle('open', open);
    tab.classList.toggle('on', open);
    tab.setAttribute('aria-expanded', String(open));
    tab.innerHTML = `${t('obs.open')}<i class="lamp ${LAMP[worst]}" aria-hidden="true"></i>`;
    tab.setAttribute('aria-label', t('obs.title'));
    const tag = el.querySelector<HTMLElement>('#ob-all')!;
    tag.textContent = t(`obs.state.${worst}` as Key);
    tag.className = `tag ${TONE[worst]}`;
    el.querySelector('#ob-list')!.innerHTML = rows
      .map((r) => `<div class="ck-feed ${LAMP[r.fresh]}"><div class="ob-row">
        <span class="ck-lamp ${TONE[r.fresh]}" aria-hidden="true">●</span><span class="ck-name">${t(`obs.name.${r.id}` as Key)}</span>
        <span class="ck-age seg sm ${TONE[r.fresh]}">${r.obsMs === null ? '--' : ago(now() - r.obsMs)}</span>
        <span class="ob-val seg">${valueText(r)}</span><span class="ck-worst dim">${detailText(r)}</span></div></div>`)
      .join('');
    el.querySelector('#ob-fix')!.innerHTML = fixRows(data().fixes)
      .map((f) => `<div class="ck-feed"><div class="ob-row">
        <span class="ck-lamp ${f.tone}" aria-hidden="true">●</span><span class="ck-name">${f.name}</span><span class="ck-age"></span>
        <span class="ob-val seg ${f.tone}">${f.value}</span><span class="ck-worst dim">${f.detail}</span></div></div>`)
      .join('');
    ensureLayer(geo(rows));
  };
  sheets.subscribe(render);
  map.on('style.load', render);
  render();
  setInterval(render, 60_000);
  return { refresh: render };
}
