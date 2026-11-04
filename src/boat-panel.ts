/**
 * BOAT drawer (PLAN 4.6): record a GPS track, drop a mark or log a catch, export the trip as GPX.
 * Everything runs on the device with no signal. A top-bar BOAT tab toggles the drawer (a sheet,
 * see sheets.ts, so on a phone it slides over the map like the others). The map layer is in
 * layers/boat.ts.
 */
import type { Map } from 'maplibre-gl';
import { mldLevel } from './adapters/mld';
import { t, type Key } from './i18n';
import { closeButton, type Sheets } from './sheets';
import { BOAT_SPECIES } from './boat/species';
import { createGps, type GpsState } from './boat/gps';
import type { BoatStore } from './boat/store';
import { M_PER_NM, recentSpeedKt, toGPX, trackStats } from './boat/track';
import { mountBoatLayer } from './layers/boat';
import type { Shoal } from './boat/shoal';
import type { MetricEnv } from './metrics/registry';
import type { Vessel } from './settings';
import { clock } from './astro-hud';
import { daySky, localDayStart } from './physics/astro';
import { REGION } from './region';
import { DEFAULT_SPEED_KT, MAX_SPEED_KT, MIN_SPEED_KT, SPEED_STEP_KT, readRoute } from './boat/route';

const hhmm = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** BITE at a catch and the mean BITE of its daylight day there (PLAN 7.16), once the fishing panel is up. */
export type CatchScorer = (lng: number, lat: number, ms: number, species: string) => { bite: number; biteDay: number } | null;

/** Offshore read at a place (PLAN 7.17): nearest front and the boat species' scores, best first. */
export type OffshoreRead = (lng: number, lat: number) => { front: { km: number; bearingDeg: number; kind: 'sst' | 'chl' } | null; mldM: number | null; scores: { id: string; score: number }[] } | null;

/** What the ROUTE tool reads (PLAN 7.23 item 8): the forecast environment, the vessel and the slider time. */
export interface RouteDeps {
  env: MetricEnv;
  vessel: Vessel;
  validMs: number;
}

/** Shoal read at a place (PLAN 7.23 item 7). */
export type ShoalRead = (lng: number, lat: number) => Shoal | null;

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function mountBoatPanel(root: HTMLElement, map: Map, store: BoatStore, sheets: Sheets, depthAt: () => ((lng: number, lat: number) => number | undefined) | null, scoreCatch: () => CatchScorer | null = () => null, offshore: () => OffshoreRead | null = () => null, shoal: () => ShoalRead | null = () => null, routeDeps: () => RouteDeps | null = () => null) {
  const gps = createGps(
    (p) => {
      store.addFix(p);
      update();
    },
    () => update(),
  );
  const layer = mountBoatLayer(map, store, () => {
    const p = gps.last();
    return p && gps.state() === 'ok' ? [p.lng, p.lat] : null;
  });

  const el = document.createElement('section');
  el.className = 'panel boat';
  el.id = 'boat-panel';
  el.innerHTML = `
    <div class="ph">${t('boat.title')} <span class="tag">${t('boat.tag')}</span></div>
    <div class="ro"><span class="lbl">${t('boat.gps')}</span><span class="seg sm" id="b-gps">--</span></div>
    <div class="ro"><span class="lbl">${t('boat.dist')}</span><span class="seg" id="b-dist">0.0</span><span class="unit">${t('unit.nm')}</span></div>
    <div class="ro"><span class="lbl">${t('boat.time')}</span><span class="seg" id="b-time">00:00</span></div>
    <div class="ro"><span class="lbl">${t('boat.speed')}</span><span class="seg" id="b-spd">--</span><span class="unit">${t('unit.kt')}</span></div>
    <div class="ro"><span class="lbl">${t('boat.pins')}</span><span class="seg" id="b-pins">0</span></div>
    <div class="ro"><span class="lbl">${t('boat.depth')}</span><span class="seg sm" id="b-depth">--</span></div>
    <div class="ro"><span class="lbl">${t('boat.front')}</span><span class="seg sm" id="b-front">--</span></div>
    <div class="ro"><span class="lbl">${t('boat.mld')}</span><span class="seg sm" id="b-mld">--</span></div>
    <div class="ro"><span class="lbl">${t('boat.offshore')}</span><span class="seg sm" id="b-off">--</span></div>
    <div class="ro"><span class="lbl">${t('route.title')}</span><span class="seg sm" id="rt-leg">--</span></div>
    <div class="ro"><span class="lbl">${t('route.time')}</span><span class="seg sm" id="rt-eta">--</span></div>
    <div class="ro"><span class="lbl">${t('route.sail')}</span><span class="seg sm" id="rt-sail">--</span></div>
    <div class="ro"><span class="lbl">${t('route.worst')}</span><span class="seg sm" id="rt-worst">--</span></div>
    <div class="boat-btns">
      <button type="button" class="tab" id="rt-start">${t('route.start')}</button>
      <button type="button" class="tab" id="rt-end">${t('route.end')}</button>
      <button type="button" class="tab" id="rt-slow" aria-label="${t('route.slower')}">‹</button>
      <span class="seg sm green" id="rt-spd">--</span>
      <button type="button" class="tab" id="rt-fast" aria-label="${t('route.faster')}">›</button>
      <button type="button" class="tab" id="rt-clear">${t('route.clear')}</button>
    </div>
    <div class="boat-btns">
      <button type="button" class="tab" id="b-rec"></button>
      <button type="button" class="tab" id="b-mark">${t('boat.mark')}</button>
    </div>
    <div class="boat-btns">
      <button type="button" class="tab" id="b-prev" aria-label="${t('boat.prev')}">‹</button>
      <span class="seg sm green" id="b-sp">--</span>
      <button type="button" class="tab" id="b-next" aria-label="${t('boat.next')}">›</button>
      <button type="button" class="tab" id="b-catch">${t('boat.catch')}</button>
    </div>
    <div class="boat-btns">
      <button type="button" class="tab" id="b-export">${t('boat.export')}</button>
      <button type="button" class="tab" id="b-clear">${t('boat.clear')}</button>
    </div>
    <div class="seek-msg" id="b-msg" role="status"></div>
    <ul class="boat-pins" id="b-list"></ul>
    <p class="rules-advice">${t('boat.note')}</p>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('boat')));
  root.appendChild(el);

  // The top-bar tab.
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab boat-open';
  tab.textContent = t('boat.tab');
  tab.setAttribute('aria-controls', el.id);
  root.querySelector('.top-tabs')?.appendChild(tab);
  tab.addEventListener('click', () => sheets.toggle('boat'));
  const syncOpen = () => {
    const v = sheets.is('boat');
    el.classList.toggle('open', v);
    tab.classList.toggle('on', v);
    tab.setAttribute('aria-expanded', String(v));
  };
  sheets.subscribe(syncOpen);
  syncOpen();

  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  let sp = 0;
  let clearArmed = 0;
  const say = (m: string) => {
    $('b-msg').textContent = m;
    setTimeout(() => $('b-msg').textContent === m && ($('b-msg').textContent = ''), 3000);
  };

  // ROUTE (PLAN 7.23 item 8): start and end are points the skipper marks at the boat or the map centre.
  let rStart: [number, number] | null = null;
  let rEnd: [number, number] | null = null;
  let rSpeed: number | null = null;
  const speedFor = (v: Vessel) => rSpeed ?? DEFAULT_SPEED_KT[v];
  function renderRoute() {
    const d = routeDeps();
    const sp = d ? speedFor(d.vessel) : rSpeed ?? DEFAULT_SPEED_KT.small;
    $('rt-spd').textContent = `${sp} ${t('unit.kt')}`;
    layer.setRoute(rStart && rEnd ? [rStart, rEnd] : []);
    const clear = () => ['rt-leg', 'rt-eta', 'rt-sail', 'rt-worst'].forEach((id) => (($(id).textContent = '--'), ($(id).className = 'seg sm')));
    if (!rStart || !rEnd || !d) return clear();
    const r = readRoute(d.env, d.vessel, rStart, rEnd, sp, d.validMs);
    $('rt-leg').textContent = `${r.leg.distanceNm.toFixed(1)} ${t('unit.nm')} · ${String(Math.round(r.leg.bearingDeg)).padStart(3, '0')}°`;
    const min = Math.round(r.durationMs / 60000);
    const sunset = daySky(localDayStart(d.validMs, REGION.tzOffsetH), rStart[1], rStart[0]).sun.sunset;
    const dark = sunset !== null && r.arriveMs > sunset;
    $('rt-eta').textContent = `${Math.floor(min / 60)}H ${String(min % 60).padStart(2, '0')}M · ${t('route.arrive', { at: clock(r.arriveMs) })}${dark ? ' · ' + t('route.dark') : ''}`;
    $('rt-eta').className = 'seg sm ' + (dark ? 'red' : '');
    $('rt-sail').textContent = r.sail ? `${t(`route.sail.${r.sail.sail}` as Key)} · ${Math.round(r.sail.twa)}°` : '--';
    $('rt-sail').className = 'seg sm ' + (r.sail?.sail === 'headToWind' && d.vessel === 'yacht' ? 'red' : '');
    $('rt-worst').textContent = r.worst ? `${t(`verdict.${r.worst.verdict}` as Key)}${r.worst.verdict !== 'go' ? ` · ${clock(r.worst.atMs)}` : ''}${r.worst.windKt !== null ? ` · ${Math.round(r.worst.windKt)} ${t('unit.kt')}` : ''}${r.worst.hsM !== null ? ` · ${r.worst.hsM.toFixed(1)} ${t('unit.m')}` : ''}` : '--';
    $('rt-worst').className = 'seg sm ' + (r.worst?.verdict === 'nogo' ? 'red' : r.worst?.verdict === 'go' ? 'green' : '');
  }

  function update() {
    const s = store.state();
    const { distanceM, durationMs } = trackStats(s.points);
    const g = gps.state();
    $('b-gps').textContent = t(`boat.gps.${g}` as Key);
    $('b-gps').className = 'seg sm ' + (g === 'ok' ? 'green' : g === 'denied' || g === 'unavailable' ? 'red' : '');
    $('b-dist').textContent = (distanceM / M_PER_NM).toFixed(1);
    $('b-time').textContent = hhmm(durationMs);
    const kt = recentSpeedKt(s.points);
    $('b-spd').textContent = kt === null ? '--' : kt.toFixed(1);
    $('b-pins').textContent = String(s.pins.length);
    $('b-rec').textContent = s.recording ? t('boat.stop') : t('boat.rec');
    $('b-rec').classList.toggle('on', s.recording);
    $('b-sp').textContent = t(`boat.sp.${BOAT_SPECIES[sp]}` as Key);
    // Offshore read at the boat, or at the map centre with no fix (PLAN 7.17).
    const at = gps.state() === 'ok' ? gps.last() : null;
    const c = at ?? map.getCenter();
    const sh = shoal()?.(c.lng, c.lat);
    $('b-depth').textContent = !sh ? '--' : `${sh.depthM === null ? '--' : Math.round(sh.depthM * 10) / 10} ${t('unit.m')} · ${t(`boat.shoal.${sh.level}` as Key)}${sh.level !== 'clear' && sh.minM !== null && sh.minBearingDeg !== null ? ` · ${Math.round(sh.minM * 10) / 10} ${t('unit.m')} ${COMPASS[Math.round(sh.minBearingDeg / 45) % 8]}` : ''}${sh.reef ? ` · ${t('boat.shoal.reef')}` : ''}`;
    $('b-depth').className = 'seg sm ' + (sh?.level === 'danger' ? 'red' : sh?.level === 'clear' ? 'green' : '');
    const o = offshore()?.(c.lng, c.lat);
    $('b-front').textContent = !o ? '--' : o.front ? `${o.front.km.toFixed(1)} ${t('unit.km')} ${COMPASS[Math.round(o.front.bearingDeg / 45) % 8]} · ${t(`boat.front.${o.front.kind}` as Key)}` : t('boat.front.none');
    $('b-mld').textContent = !o || o.mldM === null ? '--' : `${Math.round(o.mldM)} ${t('unit.m')} · ${t(`boat.mld.${mldLevel(o.mldM)}` as Key)}`;
    $('b-off').innerHTML = !o || !o.scores.length ? '--' : o.scores.slice(0, 2).map((s) => `<span class="${s.score >= 0.6 ? 'green' : ''}">${t(`boat.sp.${s.id}` as Key)} ${Math.round(s.score * 100)}</span>`).join(' · ');
    renderRoute();
    $('b-list').innerHTML = s.pins
      .slice(-5)
      .reverse()
      .map((p) => `<li data-id="${p.id}"><button type="button" class="tab pin-go">${new Date(p.t).toISOString().slice(11, 16)} ${p.kind === 'catch' ? t(`boat.sp.${p.species ?? 'other'}` as Key) : t('boat.mark')}${p.depthM !== undefined ? ` ${Math.round(p.depthM)}${t('unit.m')}` : ''}</button><button type="button" class="tab pin-x" aria-label="${t('boat.remove')}">✕</button></li>`)
      .join('');
  }

  // Recording resumes after a reload if it was on.
  if (store.state().recording) gps.start();
  store.subscribe(update);
  update();

  const pin = (kind: 'mark' | 'catch') => {
    let f: { lng: number; lat: number } | null = gps.last();
    if (!f || gps.state() !== 'ok') {
      // A catch can be logged from the shore without GPS: at the map centre, said so (PLAN 7.16).
      if (kind !== 'catch') return say(t('boat.noFix'));
      const c = map.getCenter();
      f = { lng: c.lng, lat: c.lat };
      say(t('boat.atCentre'));
    }
    const now = Date.now();
    const depth = depthAt()?.(f.lng, f.lat);
    const species = kind === 'catch' ? BOAT_SPECIES[sp] : undefined;
    const scored = species ? scoreCatch()?.(f.lng, f.lat, now, species) : null;
    store.addPin({ lng: f.lng, lat: f.lat, t: now }, kind, { species, depthM: depth, ...(scored ?? {}) });
  };
  const here = (): [number, number] => {
    const g = gps.state() === 'ok' ? gps.last() : null;
    const c = g ?? map.getCenter();
    return [c.lng, c.lat];
  };
  $('rt-start').addEventListener('click', () => ((rStart = here()), renderRoute()));
  $('rt-end').addEventListener('click', () => ((rEnd = [map.getCenter().lng, map.getCenter().lat]), renderRoute()));
  $('rt-clear').addEventListener('click', () => ((rStart = rEnd = null), renderRoute()));
  const bump = (dir: number) => {
    const d = routeDeps();
    rSpeed = Math.min(MAX_SPEED_KT, Math.max(MIN_SPEED_KT, speedFor(d?.vessel ?? 'small') + dir * SPEED_STEP_KT));
    renderRoute();
  };
  $('rt-slow').addEventListener('click', () => bump(-1));
  $('rt-fast').addEventListener('click', () => bump(1));
  $('b-rec').addEventListener('click', () => {
    if (store.state().recording) {
      store.stop();
      gps.stop();
    } else {
      store.start();
      gps.start();
    }
  });
  $('b-mark').addEventListener('click', () => pin('mark'));
  $('b-catch').addEventListener('click', () => pin('catch'));
  $('b-prev').addEventListener('click', () => ((sp = (sp + BOAT_SPECIES.length - 1) % BOAT_SPECIES.length), update()));
  $('b-next').addEventListener('click', () => ((sp = (sp + 1) % BOAT_SPECIES.length), update()));
  $('b-export').addEventListener('click', () => {
    const s = store.state();
    if (!s.points.length && !s.pins.length) return say(t('boat.exportEmpty'));
    const day = new Date(s.points[0]?.t ?? s.pins[0].t).toISOString().slice(0, 10);
    const blob = new Blob([toGPX(s.points, s.pins, `${t('boat.trip')} ${day}`)], { type: 'application/gpx+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fishing-and-tides-${day}.gpx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  });
  // Two taps to clear, so a stray touch cannot wipe a day's track.
  $('b-clear').addEventListener('click', () => {
    if (Date.now() - clearArmed < 3000) {
      store.clear();
      clearArmed = 0;
      $('b-clear').textContent = t('boat.clear');
    } else {
      clearArmed = Date.now();
      $('b-clear').textContent = t('boat.clearSure');
      setTimeout(() => ($('b-clear').textContent = t('boat.clear')), 3000);
    }
  });
  $('b-list').addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li');
    const pinData = store.state().pins.find((p) => p.id === li?.dataset.id);
    if (!li || !pinData) return;
    if ((e.target as HTMLElement).closest('.pin-x')) store.removePin(pinData.id);
    else map.easeTo({ center: [pinData.lng, pinData.lat], zoom: Math.max(map.getZoom(), 13), duration: 1200 });
  });

  window.addEventListener('pagehide', () => store.flush());
  map.on('moveend', () => sheets.is('boat') && update());
  sheets.subscribe(() => sheets.is('boat') && update());
  void layer;
  return { gps };
}

export type { GpsState };
