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
import { compassName } from './spot-charts';
import { panelHeader } from './hud-kit';
import { t, type Key } from './i18n';
import { LIMON_HARMONICS } from './data/tides-limon';
import { localDayStart, sunAltitude } from './physics/astro';
import type { SquallLevel } from './physics/safety';
import { suitFor, type SargLevel, outingScore, outlook, ratingFor, stingerGuess, type OutingReason, type OutingScore } from './physics/outing';
import { SNORKEL_SPOTS } from './data/snorkel-spots';
import { OUTING_DEPTHS, surgeAt, surgeProfile } from './physics/surge';
import { tideState } from './physics/tide';
import { REGION, SPOTS } from './region';
import type { SpotPhysics } from './spot-physics';
import type { TimeStore } from './time';

/** What the outing forecast needs from the rest of the app. Each returns null when it has no data. */
export interface DiveEnv {
  /** Offshore sea state at a point and time. */
  seaAt: (lng: number, lat: number, ms: number) => { hs: number; tp: number } | null;
  /** 10 m wind: speed m/s and the bearing it blows from. */
  windAt: (lng: number, lat: number, ms: number) => { ms: number; fromDeg: number } | null;
  /** Visibility, m. */
  visAt: (lng: number, lat: number, ms: number) => number | null;
  /** Satellite sea temperature, °C, and the sargassum outlook at the nearest beach, for the hour. */
  waterAt: (lng: number, lat: number, ms: number) => { sstC?: number | null; sarg?: SargLevel | null };
  /** Heavy-runoff flag at the point (outing.ts runoffRisk), or null when no flow or rain data. */
  runoffAt: (lng: number, lat: number, ms: number) => boolean | null;
  /** Surface current: speed m/s and the bearing it flows TOWARD. */
  currentAt: (lng: number, lat: number, ms: number) => { ms: number; toDeg: number } | null;
  /** Weather safety and rain for the hour: mean rain, squall flag and a close lightning strike. Empty when no forecast covers it. */
  wxAt: (lng: number, lat: number, ms: number) => { rainMmH?: number; cloudPct?: number; uv?: number; squall?: SquallLevel; lightning?: boolean };
  /** Chart depth, m (positive down), or undefined on land or before the depth grid loads. */
  depthAt: (lng: number, lat: number) => number | undefined;
}

/** The water inputs the score takes, leaving out what is unknown. */
const waterTerms = (w: { sstC?: number | null; sarg?: SargLevel | null }) => ({ ...(typeof w.sstC === 'number' ? { sstC: w.sstC } : {}), ...(w.sarg ? { sarg: w.sarg } : {}) });

type Mode = 'snorkel' | 'dive';
const MODES: readonly Mode[] = ['snorkel', 'dive'];
const MODE_DEPTH: Record<Mode, number> = { snorkel: 2, dive: 6 };
const KEY = 'dive.mode';
const DAYS = 7;
/** How close the reticle must be to a catalog spot to show its card, km. */
const SPOT_KM = 4;
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
      <div class="ro"><span class="lbl">${t('dive.current')}</span><span class="seg sm" id="dv-current">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.sst')}</span><span class="seg sm" id="dv-sst">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.uv')}</span><span class="seg sm" id="dv-uv">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.score')}</span><span class="seg sm" id="dv-score">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.time')}</span><span class="seg sm" id="dv-time">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.day')}</span><span class="seg sm" id="dv-day">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.week')}</span><span class="seg sm" id="dv-week">--</span></div>
      <div class="ro"><span class="lbl">${t('snk.spot')}</span><span class="seg sm" id="dv-spot">--</span></div>
      <div class="ro"><span class="lbl">${t('snk.rating')}</span><span class="seg sm" id="dv-rate">--</span></div>
      <div class="ro"><span class="lbl">${t('dive.runoff')}</span><span class="seg sm" id="dv-runoff">--</span></div>
      <div class="ro"><span class="lbl">${t('snk.stingers')}</span><span class="seg sm" id="dv-sting">--</span></div>
      <div class="lbl note" id="dv-note"></div>
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
    const cur = env.currentAt(c.lng, c.lat, time.validMs());
    $('current').textContent = cur ? `${cur.ms.toFixed(2)} ${t('unit.ms')} → ${compassName(cur.toDeg)}` : '--';
    $('current').className = 'seg sm ' + (!cur ? '' : cur.ms >= 0.45 ? 'red' : cur.ms >= 0.15 ? '' : 'green');
    const sst = env.waterAt(c.lng, c.lat, time.validMs()).sstC;
    $('sst').textContent = typeof sst === 'number' ? `${sst.toFixed(1)} ${t('unit.degC')} · ${t(`dive.suit.${suitFor(sst)}` as Key)}` : '--';
    $('sst').className = 'seg sm ' + (typeof sst !== 'number' ? '' : sst >= 26 ? 'green' : sst >= 22 ? '' : 'red');
    const uv = env.wxAt(c.lng, c.lat, time.validMs()).uv;
    $('uv').textContent = typeof uv === 'number' ? `${uv.toFixed(0)} · ${uv >= 8 ? t('dive.uv.cover') : uv >= 6 ? t('dive.uv.high') : t('dive.uv.ok')}` : '--';
    $('uv').className = 'seg sm ' + (typeof uv !== 'number' ? '' : uv >= 8 ? 'red' : uv >= 6 ? '' : 'green');
    heavy();
  };

  /** Score for one hour at the reticle's spot; null when the sea or wind forecast has nothing for it. */
  const scoreAt = (ms: number, localHour: number, vis: number | null, at?: [number, number], m: Mode = mode): OutingScore | null => {
    const { c, st } = at ? { c: { lng: at[0], lat: at[1] }, st: spots.byName(nearest(at, SPOTS)!.point.name) } : spotAt();
    const r = st?.result;
    const sea = env.seaAt(st?.pin[0] ?? c.lng, st?.pin[1] ?? c.lat, ms);
    const w = env.windAt(c.lng, c.lat, ms);
    const wind = w ? w.ms : null;
    if (!r || !sea || wind === null) return null;
    const depth = MODE_DEPTH[m];
    const u = surgeAt(sea.hs * r.waves.refraction.K, r.waves.refraction.depth, sea.tp, depth).uMs;
    const chart = env.depthAt(c.lng, c.lat);
    // Open water or unknown depth: use the activity depth so only a real reef flat can read as too shallow.
    const waterM = chart === undefined || chart > depth ? depth : chart + tideM(ms);
    const runoff = env.runoffAt(c.lng, c.lat, ms);
    return outingScore({ surgeMs: u, visM: vis ?? NaN, windMs: wind, waterM, localHour, sunAltDeg: sunAltitude(ms, c.lat, c.lng), currentMs: env.currentAt(c.lng, c.lat, ms)?.ms, ...(runoff === null ? {} : { runoff }), ...waterTerms(env.waterAt(c.lng, c.lat, ms)), ...env.wxAt(c.lng, c.lat, ms) });
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

  /** The catalog spot within SPOT_KM of the reticle: access, live rating, stinger guess and the guides' note. */
  const spotCard = () => {
    const c = map.getCenter();
    const hit = nearest([c.lng, c.lat], SNORKEL_SPOTS.map((s) => ({ name: s.id, lngLat: s.lngLat })))!;
    const sp = SNORKEL_SPOTS.find((s) => s.id === hit.point.name)!;
    const near = hit.distanceM / 1000 <= SPOT_KM;
    $('spot').textContent = near ? `${sp.id.toUpperCase().replace('-', ' ')} · ${t(`snk.access.${sp.access}` as Key)}${sp.confidence === 'check' ? ` · ${t('snk.check')}` : ''}` : '--';
    $('note').textContent = near ? t(`snk.${sp.id}.note` as Key) : '';
    const ms = time.validMs();
    const h = (((ms + REGION.tzOffsetH * 3.6e6) % 864e5) + 864e5) % 864e5 / 3.6e6;
    const s = near ? scoreAt(ms, h, env.visAt(sp.lngLat[0], sp.lngLat[1], ms), sp.lngLat) : null;
    const rate = s ? ratingFor(s.score) : null;
    $('rate').textContent = rate ? `${t(`snk.rating.${rate}` as Key)} ${s!.score}` : '--';
    $('rate').className = 'seg sm ' + (rate === 'GO' ? 'green' : rate === 'AVOID' ? 'red' : '');
    const ro = env.runoffAt(c.lng, c.lat, ms);
    $('runoff').textContent = ro === null ? '--' : ro ? t('dive.runoff.yes') : t('dive.runoff.no');
    $('runoff').className = 'seg sm ' + (ro ? 'red' : '');
    const w = near ? env.windAt(sp.lngLat[0], sp.lngLat[1], ms) : null;
    const sting = w ? stingerGuess(w.ms, w.fromDeg, sp.facing) : null;
    $('sting').textContent = sting === null ? '--' : sting ? t('snk.stingers.maybe') : t('snk.stingers.low');
    $('sting').className = 'seg sm ' + (sting ? 'red' : '');
  };
  const refresh = () => (update(), nowScore(), spotCard());
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
  // The verdict chips (verdict-hud.ts, PLAN 7.8) read the score for the slider hour, and set the mode.
  const now = (m: Mode): OutingScore | null => {
    const ms = time.validMs();
    const c = map.getCenter();
    return scoreAt(ms, (((ms + REGION.tzOffsetH * 3.6e6) % 864e5) + 864e5) % 864e5 / 3.6e6, env.visAt(c.lng, c.lat, ms), undefined, m);
  };
  return { refresh: () => ((heavyKey = ''), refresh()), now, mode: () => mode, setMode: (m: Mode) => ((mode = m), apply()) };
}
