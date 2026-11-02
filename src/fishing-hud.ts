/**
 * Fishing rows in the side panel (PLAN 4.5, extended): the target species (arrows), the REACH
 * highlight (ALL / SHORE / BOAT), the habitat score at the reticle, the BITE score for the slider time
 * (habitat x timing: tide, light, solunar, wind and waves; src/fishing/bite.ts), BEST TIMES for the
 * slider's day as a bar strip with the best windows, and BEST SPOTS nearby with the reasons. The
 * species and reach are remembered on the device.
 */
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { REGION } from './region';
import type { FishingLayer, Reach } from './layers/fishing';
import type { TimeStore } from './time';
import { SPECIES, seasonOf, type SpeciesId } from './fishing/species';
import { bestWindows, bite, type BiteReason } from './fishing/bite';
import { LIMON_HARMONICS } from './data/tides-limon';
import { localDayStart } from './physics/astro';
import { clock } from './astro-hud';

const KEY = 'ft.fishing.species';
const REACH_KEY = 'ft.fishing.reach';
const REACHES: readonly Reach[] = ['all', 'shore', 'boat'];
const SPOT_RADIUS_KM = 15;

export function loadSpecies(): SpeciesId {
  try {
    const v = localStorage.getItem(KEY);
    return SPECIES.find((s) => s.id === v)?.id ?? SPECIES[0].id;
  } catch {
    return SPECIES[0].id;
  }
}

export function loadReach(): Reach {
  try {
    const v = localStorage.getItem(REACH_KEY);
    return REACHES.find((r) => r === v) ?? 'all';
  } catch {
    return 'all';
  }
}

/** Wind (m/s) and waves (m) at the reticle for the slider time, when known. */
export type FishEnv = () => { windMs?: number | null; hsM?: number | null };

const why = (rs: readonly BiteReason[]) => rs.map((r) => t(`bite.r.${r}` as Key)).join(' · ');

export function mountFishingHud(root: HTMLElement, map: Map, layer: FishingLayer, time: TimeStore, initial: SpeciesId, env: FishEnv = () => ({})) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast fish-rows">
      <div class="ro fish-pick"><span class="lbl">${t('fish.target')}</span>
        <button type="button" class="tab" id="fish-prev" aria-label="${t('fish.prev')}">‹</button>
        <span class="seg sm green" id="fish-sp">--</span>
        <button type="button" class="tab" id="fish-next" aria-label="${t('fish.next')}">›</button></div>
      <div class="ro fish-reach"><span class="lbl">${t('fish.reach')}</span><span class="seg sm" id="fish-reach">${REACHES.map((r) => `<button type="button" class="tab" data-reach="${r}">${t(`fish.reach.${r}` as Key)}</button>`).join('')}</span></div>
      <div class="ro"><span class="lbl">${t('fish.score')}</span><span class="seg sm green" id="fish-score">--</span></div>
      <div class="ro"><span class="lbl">${t('fish.bite')}</span><span class="seg sm green" id="fish-bite">--</span></div>
      <div class="ro"><span class="lbl">${t('fish.times')}</span><span class="seg sm" id="fish-times">--</span></div>
      <div class="bite-strip" id="fish-strip" aria-hidden="true"></div>
      <div class="bite-wins" id="fish-wins"></div>
      <details class="fishx"><summary><span class="lbl">${t('fish.spots')}</span></summary><div id="fish-spots" class="fish-spots"></div></details>
      <div class="ro"><span class="lbl note">${t('fish.note')}</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let i = Math.max(0, SPECIES.findIndex((s) => s.id === initial));
  let reach: Reach = loadReach();
  const tabs = [...side.querySelectorAll<HTMLButtonElement>('#fish-reach [data-reach]')];

  const month = () => new Date(time.validMs()).getUTCMonth();
  let queued = false;
  let heavyKey = '';
  const update = () => {
    queued = false;
    const sp = SPECIES[i];
    $('fish-sp').textContent = t(`fish.${sp.id}` as Key);
    const season = t(`season.${seasonOf(sp, month())}` as Key);
    const c = map.getCenter();
    const score = layer.scoreAt(c.lng, c.lat);
    // "63% GOOD": habitat at the reticle, then how the forecast month suits the species.
    $('fish-score').textContent = score === null ? `-- ${season}` : `${Math.round(score * 100)}% ${season}`;
    $('fish-score').className = 'seg sm ' + (score !== null && score >= 0.5 ? 'green' : '');

    const e = env();
    const base = { lat: c.lat, lng: c.lng, tide: LIMON_HARMONICS, tzOffsetH: REGION.tzOffsetH };
    const now = bite({ ...base, tMs: time.validMs(), windMs: e.windMs, hsM: e.hsM, habitat: score });
    $('fish-bite').textContent = `${now.bite} ${why(now.reasons)}`.trim();
    $('fish-bite').className = 'seg sm ' + (now.bite >= 60 ? 'green' : '');

    // The day's strip and best windows: timing only (the forecast wind and waves are for the slider hour, not the day).
    const day = localDayStart(time.validMs(), REGION.tzOffsetH);
    const key = `${day}|${Math.round(c.lat * 10)}|${Math.round(c.lng * 10)}|${score === null ? 'n' : Math.round(score * 10)}`;
    if (key !== heavyKey) {
      heavyKey = key;
      const { series, windows } = bestWindows({ ...base, habitat: score }, day, 3);
      const inWin = (tt: number) => windows.some((w) => tt >= w.start && tt < w.end);
      const top = Math.max(1, ...series.map((s) => s.bite));
      $('fish-strip').innerHTML = series.map((s) => `<i class="${inWin(s.t) ? 'win' : ''}" style="height:${Math.max(6, Math.round((s.bite / top) * 100))}%"></i>`).join('') + '<b class="bite-now"></b>';
      $('fish-times').textContent = windows.length ? windows.map((w) => `${clock(w.start)}–${clock(w.end)}`).slice(0, 1).join('') : '--';
      $('fish-wins').innerHTML = windows.map((w) => `<div><span class="seg sm green">${clock(w.start)}–${clock(w.end)}</span> <span class="lbl">${why(w.reasons)}</span></div>`).join('');
    }
    const nowEl = $('fish-strip').querySelector<HTMLElement>('.bite-now');
    if (nowEl) nowEl.style.left = `${Math.min(100, Math.max(0, ((time.validMs() - day) / 864e5) * 100))}%`;

    $('fish-spots').innerHTML = spotsHtml();
  };
  const spotsHtml = () => {
    const c = map.getCenter();
    const spots = layer.bestSpots(5, { lng: c.lng, lat: c.lat }, SPOT_RADIUS_KM);
    if (!spots.length) return `<div class="lbl note">${t('fish.nospots')}</div>`;
    return spots
      .map((s, n) => {
        const km = Math.hypot((s.lng - c.lng) * Math.cos((c.lat * Math.PI) / 180), s.lat - c.lat) * 111.32;
        const line = t('fish.spot.line', { score: Math.round(s.score * 100), depth: s.depthM.toFixed(0), km: km.toFixed(1) });
        return `<button type="button" class="spot" data-n="${n}" data-lng="${s.lng}" data-lat="${s.lat}"><span class="seg sm green">${n + 1}</span> <span class="lbl">${line}</span> <span class="lbl note">${s.why.map((w) => t(`fish.why.${w}` as Key)).join(' · ')}</span></button>`;
      })
      .join('');
  };
  const queue = () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  };
  const apply = () => {
    layer.setSpecies(SPECIES[i].id);
    layer.setMonth(month());
    layer.setReach(reach);
    tabs.forEach((b) => b.classList.toggle('on', b.dataset.reach === reach));
    heavyKey = '';
    try {
      localStorage.setItem(KEY, SPECIES[i].id);
      localStorage.setItem(REACH_KEY, reach);
    } catch {
      /* private mode */
    }
    update();
  };
  const step = (d: number) => ((i = (i + d + SPECIES.length) % SPECIES.length), apply());
  $('fish-prev').addEventListener('click', () => step(-1));
  $('fish-next').addEventListener('click', () => step(1));
  tabs.forEach((b) => b.addEventListener('click', () => ((reach = b.dataset.reach as Reach), apply())));
  $('fish-spots').addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('.spot');
    if (b) map.flyTo({ center: [Number(b.dataset.lng), Number(b.dataset.lat)], zoom: Math.max(map.getZoom(), 12.5), duration: 1200 });
  });
  map.on('moveend', queue);
  map.on('move', () => {
    // Cheap rows follow the reticle while panning; the list and strip wait for moveend.
    const c = map.getCenter();
    const s = layer.scoreAt(c.lng, c.lat);
    $('fish-score').textContent = s === null ? `-- ${t(`season.${seasonOf(SPECIES[i], month())}` as Key)}` : `${Math.round(s * 100)}% ${t(`season.${seasonOf(SPECIES[i], month())}` as Key)}`;
  });
  time.subscribe(() => (layer.setMonth(month()), queue()));
  apply();
}
