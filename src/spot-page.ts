/**
 * Spot pages (PLAN 4.1): everything for one named spot on one screen, at the time on the slider.
 * The day's tide chart and the next tides, sun and moon, then the spot's own physics: breaker,
 * rip, surf quality (catalog breaks) and dive surge. Opened from the SPOT tab (the spot nearest
 * the map centre) or the TARGET row; ‹ › steps through the spots. A sheet (sheets.ts), so on a
 * phone it is a drawer like the others.
 */
import type { Map } from 'maplibre-gl';
import { nearest } from './geo';
import { t, type Key } from './i18n';
import { daySky, localDayStart } from './physics/astro';
import { surgeProfile } from './physics/surge';
import { REGION, SPOTS } from './region';
import { closeButton, type Sheets } from './sheets';
import type { SpotPhysics } from './spot-physics';
import type { Target } from './target';
import { localClock, nextTides } from './tide-chart';
import { tideBlock, tideWhen, type Observed } from './tide-hud';
import type { TimeStore } from './time';
import { clock } from './astro-hud';

/** Local "TUE 02 14:00" for the slider time. */
function localWhen(ms: number): string {
  const d = new Date(ms + REGION.tzOffsetH * 3.6e6);
  return `${t(`day.${d.getUTCDay()}` as Key)} ${String(d.getUTCDate()).padStart(2, '0')} ${localClock(ms)}`;
}

export interface SpotPageDeps {
  time: TimeStore;
  sheets: Sheets;
  physics: () => SpotPhysics | null;
  observed: Observed;
  /** Fly the map to the spot (the enhance fly-to). */
  go: (target: Target) => void;
}

export function mountSpotPage(root: HTMLElement, map: Map, deps: SpotPageDeps) {
  const { time, sheets } = deps;
  let i = 0;
  const el = document.createElement('section');
  el.className = 'panel spot-page';
  el.id = 'spot-page';
  const row = (label: string, id: string) => `<div class="ro"><span class="lbl">${label}</span><span class="seg sm" id="${id}">--</span></div>`;
  el.innerHTML = `
    <div class="ph">${t('spot.title')} <span class="tag" id="sp-when">--</span></div>
    <div class="sp-pick">
      <button type="button" class="tab" id="sp-prev" aria-label="${t('spot.prev')}">‹</button>
      <span class="seg green" id="sp-name">--</span>
      <button type="button" class="tab" id="sp-next" aria-label="${t('spot.next')}">›</button>
    </div>
    <div class="sp-sec lbl">${t('spot.tides')}</div>
    <div class="tc-host"></div>
    <ul class="sp-tides" id="sp-tides"></ul>
    <div class="sp-sec lbl">${t('spot.sky')}</div>
    ${row(t('astro.sun'), 'sp-sun')}
    ${row(t('spot.moon'), 'sp-moon')}
    <div class="sp-sec lbl">${t('spot.water')}</div>
    ${row(t('sz.breaker'), 'sp-hb')}
    ${row(t('cond.rip'), 'sp-rip')}
    ${row(t('sz.drift'), 'sp-drift')}
    ${row(t('surf.q'), 'sp-surf')}
    ${row(t('dive.at', { d: 6 }), 'sp-dive')}
    <button type="button" class="tab sp-go" id="sp-go">${t('spot.go')}</button>
    <p class="rules-advice">${t('spot.note')}</p>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('spot')));
  root.appendChild(el);
  const $ = (id: string) => el.querySelector<HTMLElement>('#' + id)!;
  const chart = tideBlock(el.querySelector<HTMLElement>('.tc-host')!, time, deps.observed, { width: 320, height: 96 });

  const set = (id: string, text: string, tone: '' | 'green' | 'red' = '') => {
    $(id).textContent = text;
    $(id).className = `seg sm ${tone}`;
  };

  const render = () => {
    if (!sheets.is('spot')) return;
    const spot = SPOTS[i];
    const now = time.validMs();
    $('sp-name').textContent = spot.name;
    $('sp-when').textContent = localWhen(now);
    chart.render();
    $('sp-tides').innerHTML = nextTides(now)
      .map((e) => `<li><span class="lbl">${e.type === 'high' ? '▲ ' + t('tide.high') : '▼ ' + t('tide.low')}</span><span class="seg sm">${tideWhen(e)}</span></li>`)
      .join('');
    const sky = daySky(localDayStart(now, REGION.tzOffsetH), spot.lngLat[1], spot.lngLat[0]);
    set('sp-sun', `${clock(sky.sun.sunrise)} / ${clock(sky.sun.sunset)}`);
    set('sp-moon', `${t(`astro.moon.${sky.phase.name}` as Key)} ${Math.round(sky.phase.illumination * 100)}%`);

    const st = deps.physics()?.byName(spot.name);
    const r = st?.result;
    if (!st || !r) {
      for (const id of ['sp-hb', 'sp-rip', 'sp-drift', 'sp-surf', 'sp-dive']) set(id, '--');
      return;
    }
    const b = r.waves.breaker;
    set('sp-hb', `${b.Hb.toFixed(1)} ${t('unit.m')}${b.type ? ' ' + t(`sz.type.${b.type}` as Key) : ''}`);
    set('sp-rip', `${t(`rip.${r.rip.level}` as Key)} · ${t(`rip.str.${r.rip.strength}` as Key)} ${r.rip.speedMs.toFixed(1)} ${t('unit.ms')}`, r.rip.level === 'HIGH' ? 'red' : r.rip.level === 'MOD' ? '' : 'green');
    set('sp-drift', `${Math.abs(b.longshoreMs).toFixed(1)} ${t('unit.ms')}`);
    const q = st.surf;
    set('sp-surf', q ? `${t(`surf.band.${q.band}` as Key)} ${q.score.toFixed(1)}` : t('spot.noBreak'), q && (q.band === 'GOOD' || q.band === 'EPIC') ? 'green' : '');
    const s6 = surgeProfile(st.sea.Hs, st.sea.Tp, r.waves.refraction.K, r.waves.refraction.depth, [6])[0];
    set('sp-dive', s6 ? `${t(`dive.band.${s6.band}` as Key)} ${s6.uMs.toFixed(1)} ${t('unit.ms')}` : '--', !s6 ? '' : s6.band === 'DANGEROUS' ? 'red' : s6.band === 'SURGY' ? '' : 'green');
  };

  /** Open the page on a spot by name, or the one nearest the map centre. */
  const show = (name?: string) => {
    const c = map.getCenter();
    const want = name ?? nearest([c.lng, c.lat], SPOTS)!.point.name;
    i = Math.max(0, SPOTS.findIndex((s) => s.name === want));
    sheets.open('spot');
    render();
  };
  const step = (d: number) => ((i = (i + d + SPOTS.length) % SPOTS.length), render());
  $('sp-prev').addEventListener('click', () => step(-1));
  $('sp-next').addEventListener('click', () => step(1));
  $('sp-go').addEventListener('click', () => {
    const spot = SPOTS[i];
    sheets.close('spot');
    deps.go(spot);
  });

  // The top-bar tab.
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab spot-open';
  tab.textContent = t('spot.tab');
  tab.setAttribute('aria-controls', el.id);
  root.querySelector('.top-tabs')?.appendChild(tab);
  tab.addEventListener('click', () => (sheets.is('spot') ? sheets.close('spot') : show()));

  // TARGET row (spot tier): open the page for the spot under the reticle.
  const tgt = root.querySelector<HTMLElement>('#tgt')?.closest<HTMLElement>('.ro');
  if (tgt) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab sp-open';
    b.textContent = t('spot.open');
    b.addEventListener('click', () => show());
    tgt.appendChild(b);
  }

  const sync = () => {
    const v = sheets.is('spot');
    el.classList.toggle('open', v);
    tab.classList.toggle('on', v);
    tab.setAttribute('aria-expanded', String(v));
    render();
  };
  sheets.subscribe(sync);
  time.subscribe(render);
  setInterval(render, 60_000);
  sync();
  return { show, refresh: render };
}
