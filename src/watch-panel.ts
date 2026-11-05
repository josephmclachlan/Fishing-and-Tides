/**
 * WATCH (PLAN 7.13): the metric tracker. A top-bar WATCH tab opens a drawer (a sheet, see
 * sheets.ts) where the user picks a region on the map, the activity the BEST DAY is for (SURF, FISH,
 * SNORKEL, DIVE, BOAT) and the metrics to track, then GENERATE opens a 5-day forecast popup: the
 * activity's best day, time and spot with its score for each day, then CARDS (main) or TABLE (print
 * and share), with SHARE as an image. The best day comes from `src/metrics/plan.ts` and the cards from
 * `src/metrics/forecast.ts`, read at the spot the plan picked each day; this file is only DOM.
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { REGION, SPOTS } from './region';
import { t, type Key } from './i18n';
import { PHONE_QUERY, closeButton, type Sheets } from './sheets';
import { METRICS, METRIC_BY_ID, METRIC_PRESETS, MAX_TRACKED, type MetricEnv } from './metrics/registry';
import { buildForecast, spotsIn, type Region, type WatchForecast } from './metrics/forecast';
import { HEADLINE, PLAN_ACTIVITIES, planDays, type OutingAt, type Plan, type PlanActivity } from './metrics/plan';
import { DEFAULT_STATE, RADII_KM, hasSavedWatch, loadWatch, saveWatch, type WatchState } from './metrics/store';
import { drawForecast, shareCanvas } from './metrics/share-image';
import { claimMapTap } from './here-card';

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

const hhmm = (ms: number) => {
  const m = Math.floor((ms + REGION.tzOffsetH * HOUR) / 60_000) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const tone = (c: string) => (c === 'green' ? ' green' : c === 'red' ? ' red' : '');
const actName = (a: PlanActivity) => t(`watch.preset.${a}` as Key);

/**
 * "BEST DAY FOR SURF: THU · 06:00–08:00 · SALSA BRAVA" (Costa Rica time), or why there is none
 * ("BEST DAY FOR SURF: NO SURF BREAK IN THIS REGION"); `good` is false for the second kind.
 */
export function bestText(p: Plan): { text: string; good: boolean } {
  const head = t('watch.bestFor', { act: actName(p.activity) });
  const b = p.bestDay === null ? null : p.days[p.bestDay];
  if (b) return { text: `${head}: ${dayName(b.dayMs)} · ${hhmm(b.startMs)}–${hhmm(b.endMs)} · ${b.spot}`, good: true };
  const why = p.none === 'nospot' ? (p.activity === 'surf' ? 'watch.none.nospot.surf' : 'watch.none.nospot.reef') : p.none === 'poor' ? 'watch.none.poor' : 'watch.none.nodata';
  return { text: `${head}: ${t(why)}`, good: false };
}

/** "THU, SAT: ABOUT AS GOOD" for the other good days within a whisker of the best, or null. */
export function alikeText(p: Plan): string | null {
  return p.alike.length ? t('watch.alike', { days: p.alike.map((d) => dayName(p.startMs + d * 864e5)).join(', ') }) : null;
}

const fmt = (v: number | null, decimals: number) => (v === null ? '--' : v.toFixed(decimals));

/** The activity's own score for each day (best window, best spot), the best day marked, and what the score is made of. */
export function planHtml(p: Plan): string {
  const dec = HEADLINE[p.activity].max === 10 ? 1 : 0;
  return `<div class="wt-plan"><div class="wt-days">${p.days
    .map((c, d) => {
      const dayMs = p.startMs + d * 864e5;
      const cls = [c ? tone(c.tone).trim() : '', d === p.bestDay ? 'wt-top' : p.alike.includes(d) ? 'wt-alike' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}"${c ? ` title="${esc(`${c.spot} ${hhmm(c.startMs)}–${hhmm(c.endMs)}`)}"` : ''}>${dayName(dayMs)}<b>${fmt(c?.value ?? null, dec)}</b></div>`;
    })
    .join('')}</div>${alikeText(p) ? `<p class="lbl wt-how">${esc(alikeText(p)!)}</p>` : ''}<p class="lbl wt-how">${esc(t(`watch.how.${p.activity}` as Key))}</p></div>`;
}

/** A sparkline over the hourly values, drawn in the card's own colour (currentColor). */
function spark(xs: (number | null)[]): string {
  const ok = xs.filter((x): x is number => x !== null);
  if (ok.length < 2) return '';
  const lo = Math.min(...ok), hi = Math.max(...ok), span = hi - lo || 1;
  const pts = xs.map((x, i) => (x === null ? null : `${((i / (xs.length - 1)) * 100).toFixed(1)},${(26 - ((x - lo) / span) * 24).toFixed(1)}`)).filter(Boolean).join(' ');
  return `<svg class="wt-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${pts}"/></svg>`;
}

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

export function mountWatchPanel(
  root: HTMLElement,
  map: Map,
  sheets: Sheets,
  store: Pick<globalThis.Storage, 'getItem' | 'setItem'> | undefined,
  getEnv: () => MetricEnv,
  /** The activity picked in CONDITIONS (SNORKEL or DIVE from the dive panel), for a user who has not picked one here. */
  getActivity: () => PlanActivity = () => 'surf',
  /** The DIVE & SNORKEL panel's outing score at any spot and hour, for SNORKEL and DIVE; absent until that panel is up. */
  outingAt: () => OutingAt | undefined = () => undefined,
) {
  let state: WatchState = loadWatch(store);
  // Until the user picks anything, the metrics follow the activity chosen in CONDITIONS (J4).
  let picked = hasSavedWatch(store);
  const persist = () => ((picked = true), saveWatch(store, state));
  // getActivity reads panels mounted after this one, so it is only asked once the drawer has been opened.
  let opened = false;
  const activity = (): PlanActivity | null => state.activity ?? (opened ? getActivity() : null);

  const el = document.createElement('section');
  el.className = 'panel watch';
  el.id = 'watch-panel';
  el.innerHTML = `
    <div class="ph">${t('watch.title')}</div>
    <div class="wt-sec"><span class="lbl">${t('watch.region')}</span>
      <div class="wt-row"><button type="button" class="tab" id="wt-all">${t('watch.all')}</button><button type="button" class="tab" id="wt-pick">${t('watch.pick')}</button></div>
      <div class="wt-row" id="wt-radii">${RADII_KM.map((k) => `<button type="button" class="tab" data-km="${k}">${k} ${t('unit.km')}</button>`).join('')}</div>
      <div class="lbl wt-count" id="wt-count"></div></div>
    <div class="wt-sec"><span class="lbl">${t('watch.for')}</span>
      <div class="wt-row" id="wt-acts">${PLAN_ACTIVITIES.map((p) => `<button type="button" class="tab" data-preset="${p}">${actName(p)}</button>`).join('')}</div></div>
    <div class="wt-sec"><span class="lbl">${t('watch.metrics')} <span id="wt-n"></span> · ${t('watch.max')}</span>
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
    el.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) => {
      const on = b.dataset.preset === activity();
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    drawRing();
  };
  const change = () => (persist(), sync());
  // A first-time user starts on the metrics of the activity picked in CONDITIONS, until they choose their own.
  sheets.subscribe(() => {
    if (!sheets.is('watch')) return;
    opened = true;
    if (picked) return sync();
    const act = activity() ?? 'surf';
    const metrics = METRIC_PRESETS[act] ? [...METRIC_PRESETS[act]] : [...DEFAULT_STATE.metrics];
    if (metrics.join() !== state.metrics.join()) state = { ...state, metrics };
    sync();
  });

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
  // Picking an activity sets what BEST DAY is for, and starts the cards on that activity's set (they can then be changed freely).
  el.querySelector('#wt-acts')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('[data-preset]')?.dataset.preset as PlanActivity | undefined;
    if (p && METRIC_PRESETS[p]) (state = { ...state, activity: p, metrics: [...METRIC_PRESETS[p]] }), change();
  });

  // Pick on the map: close the drawer (on a phone a tap on the map closes sheets anyway), take the next tap as the centre, reopen.
  let picking = false;
  let release: (() => void) | null = null;
  $('wt-pick').addEventListener('click', () => {
    picking = true;
    release ??= claimMapTap();
    $('wt-pick').textContent = t('watch.picking');
    map.getCanvas().style.cursor = 'crosshair';
    if (window.matchMedia(PHONE_QUERY).matches) sheets.close('watch');
  });
  map.on('click', (e) => {
    if (!picking) return;
    picking = false;
    release?.();
    release = null;
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
  let plan: Plan | null = null;
  const best = () => (plan ? bestText(plan) : null);
  const subtitle = () => `${state.region ? '' : t('watch.all') + ' · '}${fc?.spots.join(', ') ?? ''}`;

  const render = () => {
    if (!fc) return;
    pop.innerHTML = `<div class="ph">${t('watch.forecast')}<span class="wt-tabs"><button type="button" class="tab${view === 'cards' ? ' on' : ''}" data-view="cards">${t('watch.cards')}</button><button type="button" class="tab${view === 'table' ? ' on' : ''}" data-view="table">${t('watch.table')}</button><button type="button" class="tab" id="wt-share">${t('watch.share')}</button></span><button type="button" class="sheet-x wt-x" aria-label="${t('watch.close')}">✕</button></div>
      <div class="lbl wt-sub">${esc(subtitle())}</div>${best() ? `<div class="wt-best seg sm wrap${best()!.good ? ' green' : ' poor'}">${best()!.good ? '▶ ' : ''}${esc(best()!.text)}</div>` : ''}
      ${plan ? planHtml(plan) : ''}
      <div class="wt-body">${view === 'cards' ? cardsHtml(fc) : tableHtml(fc)}</div><div class="lbl" id="wt-msg" role="status"></div>`;
    pop.querySelector('.wt-x')!.addEventListener('click', () => (pop.hidden = true));
    pop.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.addEventListener('click', () => ((view = b.dataset.view as 'cards' | 'table'), render())));
    pop.querySelector('#wt-share')!.addEventListener('click', async () => {
      const c = drawForecast(fc!, {
        title: `${t('watch.title')} · ${t('watch.forecast')}`,
        subtitle: subtitle(),
        best: best() ? [best()!.text, plan && alikeText(plan)].filter(Boolean).join(' · ') : null,
        metric: (id) => t(`metric.${id}` as Key),
        day: dayName,
        value: (_id, v, d) => fmt(v, d),
      });
      const r = await shareCanvas(c, 'watch-forecast.png');
      if (r === 'saved') pop.querySelector('#wt-msg')!.textContent = t('watch.saved');
    });
  };
  $('wt-go').addEventListener('click', () => {
    const env = getEnv(), now = Date.now(), spots = inRegion();
    plan = planDays(env, activity() ?? getActivity(), spots, now, 5, outingAt());
    // Every card reads the spot BEST DAY picked that day, so the numbers describe where it sends you.
    // A day with no window (today once it is over) reads the best day's spot, so the cards stay on one place.
    const anchor = (plan.bestDay !== null ? plan.days[plan.bestDay] : null) ?? plan.days.find(Boolean) ?? null;
    const daySpots = plan.days.map((d) => spots.find((s) => s.name === (d ?? anchor)?.spot) ?? null);
    fc = buildForecast(env, state.metrics, spots, now, 5, daySpots);
    pop.hidden = false;
    if (window.matchMedia(PHONE_QUERY).matches) sheets.close('watch');
    render();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && (pop.hidden = true));
  sync();
  return { refresh: sync };
}
