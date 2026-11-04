/**
 * DIVE & SNORKEL rows in the side panel (PLAN 6.2, 6.9): bed surge at 1, 2, 3, 6 and 12 m for the spot
 * nearest the reticle (CALM / SURGY / DANGEROUS with speed and swing), the water over the reef now
 * (chart depth plus tide), an outing score for the slider hour, the best time today and the best day
 * of the week ahead. SNORKEL scores surge at 2 m, DIVE at 6 m. Forecast hours reuse the spot's
 * shoaling factor from the current run, so they follow the waves, wind, tide and visibility forecasts.
 */
import { condSlot } from './cond-groups';
import type { Map } from 'maplibre-gl';
import { clock } from './astro-hud';
import { nearest } from './geo';
import { panelHeader } from './hud-kit';
import { t, type Key } from './i18n';
import { LIMON_HARMONICS } from './data/tides-limon';
import { localDayStart } from './physics/astro';
import { outingScore, outlook, type OutingReason, type OutingScore } from './physics/outing';
import { OUTING_DEPTHS, surgeAt, surgeProfile } from './physics/surge';
import { tideState } from './physics/tide';
import { REGION, SPOTS } from './region';
import type { SpotPhysics } from './spot-physics';
import type { TimeStore } from './time';

/** What the outing forecast needs from the rest of the app. Each returns null when it has no data. */
export interface DiveEnv {
  /** Offshore sea state at a point and time. */
  seaAt: (lng: number, lat: number, ms: number) => { hs: number; tp: number } | null;
  /** 10 m wind speed, m/s. */
  windMsAt: (lng: number, lat: number, ms: number) => number | null;
  /** Visibility, m. */
  visAt: (lng: number, lat: number, ms: number) => number | null;
  /** Chart depth, m (positive down), or undefined on land or before the depth grid loads. */
  depthAt: (lng: number, lat: number) => number | undefined;
}

type Mode = 'snorkel' | 'dive';
const MODES: readonly Mode[] = ['snorkel', 'dive'];
const MODE_DEPTH: Record<Mode, number> = { snorkel: 2, dive: 6 };
const KEY = 'dive.mode';
const DAYS = 7;
const NOON = 12 * 3.6e6;

const weekday = (ms: number) => new Intl.DateTimeFormat(document.documentElement.lang || 'en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(ms + REGION.tzOffsetH * 3.6e6)).toUpperCase().replace('.', '');
const why = (rs: readonly OutingReason[]) => rs.slice(0, 2).map((r) => t(`dive.r.${r}` as Key)).join(' · ');

export function mountDiveHud(root: HTMLElement, map: Map, spots: SpotPhysics, time: TimeStore, env: DiveEnv) {
  const side = condSlot(root, 'water', 40);
  if (!side) return;
  let mode: Mode = 'snorkel';
  try {
    const m = localStorage.getItem(KEY);
    if (m === 'dive' || m === 'snorkel') mode = m;
  } catch {
    /* private mode */
  }
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-spot">
      ${panelHeader(t('dive.title'))}
      <div class="ro"><span class="lbl">${t('dive.mode')}</span><span class="seg sm" id="dv-mode">${MODES.map((m) => `<button type="button" class="tab" data-mode="${m}">${t(`dive.mode.${m}` as Key)}</button>`).join('')}</span></div>
      ${OUTING_DEPTHS.map((d) => `<div class="ro"><span class="lbl">${t('dive.at', { d })}</span><span class="seg sm" id="dv-${d}">--</span></div>`).join('')}
      <div class="ro"><span class="lbl">${t('dive.water')}</span><span class="seg sm" id="dv-water">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.score')}</span><span class="seg sm" id="dv-score">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.time')}</span><span class="seg sm" id="dv-time">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.day')}</span><span class="seg sm" id="dv-day">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.week')}</span><span class="seg sm" id="dv-week">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>(`#dv-${id}`)!;
  const tabs = [...side.querySelectorAll<HTMLElement>('#dv-mode .tab')];

  /** Spot nearest the reticle, with its latest run. */
  const spotAt = () => {
    const c = map.getCenter();
    const sp = nearest([c.lng, c.lat], SPOTS)!.point;
    return { c, sp, st: spots.byName(sp.name) };
  };
  const tideM = (ms: number) => tideState(LIMON_HARMONICS, ms).level;

  const update = () => {
    const { c, st } = spotAt();
    const r = st?.result;
    const profile = r ? surgeProfile(st!.sea.Hs, st!.sea.Tp, r.waves.refraction.K, r.waves.refraction.depth, OUTING_DEPTHS) : null;
    OUTING_DEPTHS.forEach((d, i) => {
      const s = profile?.[i];
      const el = $(String(d));
      el.textContent = s ? `${t(`dive.band.${s.band}` as Key)} ${s.uMs.toFixed(1)} ${t('unit.ms')} ±${s.excursionM.toFixed(1)}${t('unit.m')}` : '--';
      el.className = 'seg sm ' + (!s ? '' : s.band === 'DANGEROUS' ? 'red' : s.band === 'SURGY' ? '' : 'green');
    });
    const chart = env.depthAt(c.lng, c.lat);
    const water = chart === undefined ? null : chart + tideM(time.validMs());
    $('water').textContent = water === null ? '--' : `${water.toFixed(1)} ${t('unit.m')}`;
    $('water').className = 'seg sm ' + (water === null ? '' : water < 0.5 ? 'red' : water < 1.5 ? '' : 'green');
    heavy();
  };

  /** Score for one hour at the reticle's spot; null when the sea or wind forecast has nothing for it. */
  const scoreAt = (ms: number, localHour: number, vis: number | null): OutingScore | null => {
    const { c, st } = spotAt();
    const r = st?.result;
    const sea = env.seaAt(st?.pin[0] ?? c.lng, st?.pin[1] ?? c.lat, ms);
    const wind = env.windMsAt(c.lng, c.lat, ms);
    if (!r || !sea || wind === null) return null;
    const depth = MODE_DEPTH[mode];
    const u = surgeAt(sea.hs * r.waves.refraction.K, r.waves.refraction.depth, sea.tp, depth).uMs;
    const chart = env.depthAt(c.lng, c.lat);
    // Open water or unknown depth: use the activity depth so only a real reef flat can read as too shallow.
    const waterM = chart === undefined || chart > depth ? depth : chart + tideM(ms);
    return outingScore({ surgeMs: u, visM: vis ?? NaN, windMs: wind, waterM, localHour });
  };

  let heavyKey = '';
  const heavy = () => {
    const { c, sp, st } = spotAt();
    const nowMs = time.baseMs();
    const day0 = localDayStart(nowMs, REGION.tzOffsetH);
    const key = `${mode}|${sp.name}|${Math.round(c.lat * 20)}|${Math.round(c.lng * 20)}|${day0}|${st?.result ? 1 : 0}|${st?.sea.Hs}|${st?.sea.Tp}`;
    if (key === heavyKey) return;
    heavyKey = key;
    // Visibility moves slowly: one midday value per day stands for its hours.
    const visFor: Record<number, number | null> = {};
    const vis = (ms: number) => {
      const d = localDayStart(ms, REGION.tzOffsetH);
      if (!(d in visFor)) visFor[d] = env.visAt(c.lng, c.lat, d + NOON);
      return visFor[d];
    };
    const o = outlook((ms, h) => scoreAt(ms, h, vis(ms)) ?? { score: 0, reasons: [] }, day0, DAYS);
    const today = o.days[0]?.best;
    $('time').textContent = today ? `${clock(today.start)}–${clock(today.end)}` : '--';
    const best = o.bestDay >= 0 ? o.days[o.bestDay] : null;
    $('day').textContent = best?.best ? `${weekday(best.dayStart + NOON)} ${best.best.peak} ${clock(best.best.start)}–${clock(best.best.end)}` : '--';
    $('day').className = 'seg sm ' + (best ? 'green' : '');
    $('week').innerHTML = o.days.map((d, k) => `<span class="${k === o.bestDay ? 'green' : ''}">${weekday(d.dayStart + NOON)} ${d.best ? d.best.peak : '--'}</span>`).join(' ');
  };

  const nowScore = () => {
    const ms = time.validMs();
    const h = (((ms + REGION.tzOffsetH * 3.6e6) % 864e5) + 864e5) % 864e5 / 3.6e6;
    const s = scoreAt(ms, h, env.visAt(map.getCenter().lng, map.getCenter().lat, ms));
    $('score').textContent = s ? `${s.score} ${why(s.reasons)}`.trim() : '--';
    $('score').className = 'seg sm ' + (s && s.score >= 70 ? 'green' : s && s.score < 40 ? 'red' : '');
  };

  const refresh = () => (update(), nowScore());
  const apply = () => {
    tabs.forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    heavyKey = '';
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* private mode */
    }
    refresh();
  };
  tabs.forEach((b) => b.addEventListener('click', () => ((mode = b.dataset.mode as Mode), apply())));
  spots.subscribe(refresh);
  time.subscribe(refresh);
  let queued = false;
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(() => ((queued = false), refresh()));
  });
  apply();
  // Forecast feeds arrive after the first draw; recheck when they have.
  return { refresh: () => ((heavyKey = ''), refresh()) };
}
