/**
 * WATCH (PLAN 7.13): the metric tracker. A top-bar WATCH tab opens a drawer (a sheet, see
 * sheets.ts) where the user picks a region on the map and the metrics to track, then GENERATE
 * opens a 5-day forecast popup: CARDS (main) or TABLE (print and share), with SHARE as an image.
 * The numbers come from `src/metrics/forecast.ts`; this file is only DOM.
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { REGION, SPOTS } from './region';
import { t, type Key } from './i18n';
import { closeButton, type Sheets } from './sheets';
import { METRICS, METRIC_BY_ID, METRIC_PRESETS, MAX_TRACKED, type MetricEnv } from './metrics/registry';
import { buildForecast, spotsIn, type Region, type WatchForecast } from './metrics/forecast';
import { RADII_KM, loadWatch, saveWatch, type WatchState } from './metrics/store';
import { drawForecast, shareCanvas } from './metrics/share-image';

const HOUR = 3.6e6;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A circle as a polygon ring, for the region highlight. */
export function circle(center: [number, number], radiusKm: number, steps = 64): [number, number][] {
  const [lng, lat] = center;
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / steps;
    return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)] as [number, number];
  });
}

export const dayName = (ms: number) => t(`day.${new Date(ms + REGION.tzOffsetH * HOUR).getUTCDay()}` as Key);

const fmt = (v: number | null, decimals: number) => (v === null ? '--' : v.toFixed(decimals));

/** A sparkline over the hourly values, drawn in the card's own colour (currentColor). */
function spark(xs: (number | null)[]): string {
  const ok = xs.filter((x): x is number => x !== null);
  if (ok.length < 2) return '';
  const lo = Math.min(...ok), hi = Math.max(...ok), span = hi - lo || 1;
  const pts = xs.map((x, i) => (x === null ? null : `${((i / (xs.length - 1)) * 100).toFixed(1)},${(26 - ((x - lo) / span) * 24).toFixed(1)}`)).filter(Boolean).join(' ');
  return `<svg class="wt-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`;
}

const tone = (c: string) => (c === 'green' ? ' green' : c === 'red' ? ' red' : '');

export function cardsHtml(f: WatchForecast): string {
  return `<div class="wt-cards">${f.rows
    .map((r) => {
      const first = r.days.find((d) => d.value !== null);
      return `<article class="wt-card"><div class="wt-ct"><span>${esc(t(`metric.${r.id}` as Key))}</span><span class="wt-u">${esc(r.unit)}</span></div>
        <div class="seg${tone(first?.tone ?? 'none')}">${fmt(first?.value ?? null, r.decimals)}</div>
        <div class="wt-at">${first?.spot ? `${t('watch.at')} ${esc(first.spot)}` : t('watch.nodata')}</div>
        ${spark(r.hourly)}
        <div class="wt-days">${r.days.map((d) => `<div class="${tone(d.tone).trim()}">${dayName(d.dayMs)}<b>${fmt(d.value, r.decimals)}</b></div>`).join('')}</div></article>`;
    })
    .join('')}</div>`;
}

export function tableHtml(f: WatchForecast): string {
  return `<table class="wt-table"><thead><tr><th></th>${f.rows[0]?.days.map((d) => `<th>${dayName(d.dayMs)}</th>`).join('') ?? ''}</tr></thead><tbody>${f.rows
    .map((r) => `<tr><th scope="row">${esc(t(`metric.${r.id}` as Key))}<small>${esc(r.unit)}</small></th>${r.days.map((d) => `<td class="${tone(d.tone).trim()}">${fmt(d.value, r.decimals)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

export function mountWatchPanel(root: HTMLElement, map: Map, sheets: Sheets, store: Pick<globalThis.Storage, 'getItem' | 'setItem'> | undefined, getEnv: () => MetricEnv) {
  let state: WatchState = loadWatch(store);
  const persist = () => saveWatch(store, state);

  const el = document.createElement('section');
  el.className = 'panel watch';
  el.id = 'watch-panel';
  el.innerHTML = `
    <div class="ph">${t('watch.title')}</div>
    <div class="wt-sec"><span class="lbl">${t('watch.region')}</span>
      <div class="wt-row"><button type="button" class="tab" id="wt-all">${t('watch.all')}</button><button type="button" class="tab" id="wt-pick">${t('watch.pick')}</button></div>
      <div class="wt-row" id="wt-radii">${RADII_KM.map((k) => `<button type="button" class="tab" data-km="${k}">${k} ${t('unit.km')}</button>`).join('')}</div>
      <div class="lbl wt-count" id="wt-count"></div></div>
    <div class="wt-sec"><span class="lbl">${t('watch.metrics')} <span id="wt-n"></span> · ${t('watch.max')}</span>
      <div class="wt-row">${(['surf', 'fish', 'dive', 'boat'] as const).map((p) => `<button type="button" class="tab" data-preset="${p}">${t(`watch.preset.${p}` as Key)}</button>`).join('')}</div>
      <div class="wt-chips" id="wt-chips">${METRICS.map((m) => `<button type="button" class="tab" data-m="${m.id}">${t(`metric.${m.id}` as Key)}</button>`).join('')}</div></div>
    <button type="button" class="tab wt-go" id="wt-go">${t('watch.generate')}</button>
    <p class="rules-advice">${t('watch.note')}</p>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('watch')));
  root.appendChild(el);

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab watch-open';
  tab.textContent = t('watch.tab');
  tab.setAttribute('aria-controls', el.id);
  root.querySelector('.top-tabs')?.appendChild(tab);
  tab.addEventListener('click', () => sheets.toggle('watch'));
  const syncOpen = () => {
    const v = sheets.is('watch');
    el.classList.toggle('open', v);
    tab.classList.toggle('on', v);
    tab.setAttribute('aria-expanded', String(v));
  };
  sheets.subscribe(syncOpen);
  syncOpen();

  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  const region = (): Region | null => state.region;
  const inRegion = () => (state.region ? spotsIn(SPOTS, state.region) : [...SPOTS]);

  // Region highlight on the map: an amber ring and a faint fill, only while a region is set.
  const ring = (): FeatureCollection => ({
    type: 'FeatureCollection',
    features: region() ? [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circle(region()!.center, region()!.radiusKm)] } }] : [],
  });
  const drawRing = () => {
    if (!map.isStyleLoaded() && !map.getSource('wt-region')) return map.once('idle', drawRing), undefined;
    const src = map.getSource('wt-region') as GeoJSONSource | undefined;
    if (src) return src.setData(ring()), undefined;
    const amber = getComputedStyle(document.documentElement).getPropertyValue('--amber').trim() || '#ffb000';
    map.addSource('wt-region', { type: 'geojson', data: ring() });
    map.addLayer({ id: 'wt-region-fill', type: 'fill', source: 'wt-region', paint: { 'fill-color': amber, 'fill-opacity': 0.08 } });
    map.addLayer({ id: 'wt-region-line', type: 'line', source: 'wt-region', paint: { 'line-color': amber, 'line-width': 2, 'line-dasharray': [3, 2] } });
    return undefined;
  };
  map.on('style.load', drawRing);

  const sync = () => {
    $('wt-all').classList.toggle('on', !state.region);
    el.querySelectorAll<HTMLElement>('#wt-radii [data-km]').forEach((b) => {
      b.classList.toggle('on', !!state.region && state.region.radiusKm === Number(b.dataset.km));
      (b as HTMLButtonElement).disabled = !state.region;
    });
    const n = inRegion().length;
    $('wt-count').textContent = n ? `${t('watch.spots')}: ${n} (${inRegion().map((s) => s.name).join(', ')})` : t('watch.empty');
    $('wt-n').textContent = `${state.metrics.length}/${MAX_TRACKED}`;
    el.querySelectorAll<HTMLElement>('#wt-chips [data-m]').forEach((b) => {
      const on = state.metrics.includes(b.dataset.m!);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    ($('wt-go') as HTMLButtonElement).disabled = !n || !state.metrics.length;
    drawRing();
  };
  const change = () => (persist(), sync());

  $('wt-all').addEventListener('click', () => ((state = { ...state, region: null }), change()));
  el.querySelector('#wt-radii')!.addEventListener('click', (e) => {
    const km = Number((e.target as HTMLElement).closest<HTMLElement>('[data-km]')?.dataset.km);
    if (km && state.region) (state = { ...state, region: { ...state.region, radiusKm: km } }), change();
  });
  el.querySelector('#wt-chips')!.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-m]')?.dataset.m;
    if (!id || !METRIC_BY_ID.has(id)) return;
    const has = state.metrics.includes(id);
    if (!has && state.metrics.length >= MAX_TRACKED) return;
    state = { ...state, metrics: has ? state.metrics.filter((m) => m !== id) : [...state.metrics, id] };
    change();
  });
  el.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('[data-preset]')?.dataset.preset as keyof typeof METRIC_PRESETS | undefined;
    if (p && METRIC_PRESETS[p]) (state = { ...state, metrics: [...METRIC_PRESETS[p]] }), change();
  });

  // Pick on the map: close the drawer (on a phone a tap on the map closes sheets anyway), take the next tap as the centre, reopen.
  let picking = false;
  $('wt-pick').addEventListener('click', () => {
    picking = true;
    $('wt-pick').textContent = t('watch.picking');
    map.getCanvas().style.cursor = 'crosshair';
    if (window.matchMedia('(max-width: 600px)').matches) sheets.close('watch');
  });
  map.on('click', (e) => {
    if (!picking) return;
    picking = false;
    map.getCanvas().style.cursor = '';
    $('wt-pick').textContent = t('watch.pick');
    state = { ...state, region: { center: [e.lngLat.lng, e.lngLat.lat], radiusKm: state.region?.radiusKm ?? 10 } };
    change();
    sheets.open('watch');
  });

  // The forecast popup.
  const pop = document.createElement('aside');
  pop.className = 'panel watch-pop';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  root.appendChild(pop);
  let view: 'cards' | 'table' = 'cards';
  let fc: WatchForecast | null = null;
  const bestText = () => (fc && fc.bestDay !== null ? `${t('watch.best')}: ${dayName(fc.startMs + fc.bestDay * 864e5)}` : null);
  const subtitle = () => `${state.region ? '' : t('watch.all') + ' · '}${fc?.spots.join(', ') ?? ''}`;

  const render = () => {
    if (!fc) return;
    pop.innerHTML = `<div class="ph">${t('watch.forecast')}<span class="wt-tabs"><button type="button" class="tab${view === 'cards' ? ' on' : ''}" data-view="cards">${t('watch.cards')}</button><button type="button" class="tab${view === 'table' ? ' on' : ''}" data-view="table">${t('watch.table')}</button><button type="button" class="tab" id="wt-share">${t('watch.share')}</button></span><button type="button" class="sheet-x wt-x" aria-label="${t('watch.close')}">✕</button></div>
      <div class="lbl wt-sub">${esc(subtitle())}</div>${bestText() ? `<div class="wt-best seg sm green">▶ ${esc(bestText()!)}</div>` : ''}
      <div class="wt-body">${view === 'cards' ? cardsHtml(fc) : tableHtml(fc)}</div><div class="lbl" id="wt-msg" role="status"></div>`;
    pop.querySelector('.wt-x')!.addEventListener('click', () => (pop.hidden = true));
    pop.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.addEventListener('click', () => ((view = b.dataset.view as 'cards' | 'table'), render())));
    pop.querySelector('#wt-share')!.addEventListener('click', async () => {
      const c = drawForecast(fc!, {
        title: `${t('watch.title')} · ${t('watch.forecast')}`,
        subtitle: subtitle(),
        best: bestText(),
        metric: (id) => t(`metric.${id}` as Key),
        day: dayName,
        value: (_id, v, d) => fmt(v, d),
      });
      const r = await shareCanvas(c, 'watch-forecast.png');
      if (r === 'saved') pop.querySelector('#wt-msg')!.textContent = t('watch.saved');
    });
  };
  $('wt-go').addEventListener('click', () => {
    fc = buildForecast(getEnv(), state.metrics, inRegion(), Date.now(), 5);
    pop.hidden = false;
    if (window.matchMedia('(max-width: 600px)').matches) sheets.close('watch');
    render();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && (pop.hidden = true));
  sync();
  return { refresh: sync };
}
