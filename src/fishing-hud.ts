/**
 * Fishing rows in the side panel (PLAN 4.5, extended): the target species (arrows), the REACH
 * highlight (ALL / SHORE / BOAT), the habitat score at the reticle, the BITE score for the slider time
 * (habitat x timing x water: tide, light, solunar, wind, waves, rain, cloud, squalls, lightning, and the
 * species' water from clarity, sea temperature, chlorophyll and sargassum;
 * src/fishing/bite.ts), BEST TIMES for the slider's day from the hourly forecast as a bar strip with the best windows, and BEST SPOTS nearby (habitat x water) with the reasons. The
 * species and reach are remembered on the device.
 */
import { condSlot } from './cond-groups';
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { PLUME_RIVERS, RAIN_TOWNS, REGION, SPOTS } from './region';
import { SURF_BREAKS } from './data/surf-breaks';
import { PLACES as HARBOURS } from './data/harbours';
import { nearestName, uniqueMarks } from './fishing/near-name';
import type { FishingLayer, Reach } from './layers/fishing';
import type { TimeStore } from './time';
import { SPECIES, seasonOf, type SpeciesId } from './fishing/species';
import { bestWindows, bite, type BiteReason, type BiteWx } from './fishing/bite';
import { waterTerm, type WaterInputs } from './fishing/water';
import { catchStats, MIN_CATCHES, type CatchPin } from './fishing/catches';
import { speciesById } from './fishing/species';
import { LIMON_HARMONICS } from './data/tides-limon';
import { localDayStart } from './physics/astro';
import { clock } from './astro-hud';

const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const KEY = 'ft.fishing.species';
const REACH_KEY = 'ft.fishing.reach';
const REACHES: readonly Reach[] = ['all', 'shore', 'boat'];
const SPOT_RADIUS_KM = 15;
/** Habitat candidates re-ranked by today's water for BEST SPOTS. */
const SPOT_CANDIDATES = 15;

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

/** The forecast and live hazards at a place and moment (wind, waves, rain, cloud, squall, lightning), as far as they are known. */
export interface FishEnv {
  at(lng: number, lat: number, ms: number): BiteWx;
  /** The water at a place and moment: visibility, sea temperature, chlorophyll, sargassum at the nearest beach. */
  water(lng: number, lat: number, ms: number): WaterInputs;
  /** Changes whenever a feed behind `at` loads or refreshes, so the day's strip is rebuilt. */
  version(): string;
}
const NO_ENV: FishEnv = { at: () => ({}), water: () => ({}), version: () => '' };

const why = (rs: readonly BiteReason[]) => rs.map((r) => t(`bite.r.${r}` as Key)).join(' · ');

export function mountFishingHud(root: HTMLElement, map: Map, layer: FishingLayer, time: TimeStore, initial: SpeciesId, env: FishEnv = NO_ENV, catches: () => readonly CatchPin[] = () => []) {
  const side = condSlot(root, 'fishing', 10);
  if (!side) return null;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast fish-rows">
      <div class="ro fish-pick"><span class="lbl">${t('fish.target')}</span>
        <button type="button" class="tab" id="fish-prev" aria-label="${t('fish.prev')}">‹</button>
        <span class="seg sm green" id="fish-sp">--</span>
        <button type="button" class="tab" id="fish-next" aria-label="${t('fish.next')}">›</button></div>
      <div class="ro" id="fish-warn" hidden><span class="lbl red">${t('fish.ciguatera')}</span></div>
      <div class="ro" id="fish-care" hidden><span class="lbl">${t('fish.ciguateraCare')}</span></div>
      <div class="ro fish-reach"><span class="lbl">${t('fish.reach')}</span><span class="seg sm" id="fish-reach">${REACHES.map((r) => `<button type="button" class="tab" data-reach="${r}">${t(`fish.reach.${r}` as Key)}</button>`).join('')}</span></div>
      <div class="ro"><span class="lbl">${t('fish.score')}</span><span class="seg sm green" id="fish-score">--</span></div>
      <div class="ro"><span class="lbl">${t('fish.bite')}</span><span class="seg sm green" id="fish-bite">--</span></div>
      <div class="ro"><span class="lbl">${t('fish.times')}</span><span class="seg sm" id="fish-times">--</span></div>
      <div class="bite-strip" id="fish-strip" aria-hidden="true"></div>
      <div class="bite-wins" id="fish-wins"></div>
      <details class="fishx" open><summary><span class="lbl">${t('fish.spots')}</span></summary><div id="fish-spots" class="fish-spots"></div></details>
      <div class="ro"><span class="lbl">${t('fish.yours')}</span><span class="seg sm" id="fish-yours">--</span></div>
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
    $('fish-warn').hidden = sp.ciguatera !== true;
    $('fish-care').hidden = sp.ciguatera !== 'caution';
    const season = t(`season.${seasonOf(sp, month())}` as Key);
    const c = map.getCenter();
    const score = layer.scoreAt(c.lng, c.lat);
    // "63% GOOD": habitat at the reticle, then how the forecast month suits the species.
    $('fish-score').textContent = score === null ? `-- ${season}` : `${Math.round(score * 100)}% ${season}`;
    $('fish-score').className = 'seg sm ' + (score !== null && score >= 0.5 ? 'green' : '');

    // Water changes over days, not hours: one reading at the slider time serves the whole strip.
    const water = waterTerm(sp, env.water(c.lng, c.lat, time.validMs()));
    const base = { lat: c.lat, lng: c.lng, tide: LIMON_HARMONICS, tzOffsetH: REGION.tzOffsetH, water };
    const now = bite({ ...base, ...env.at(c.lng, c.lat, time.validMs()), tMs: time.validMs(), habitat: score });
    $('fish-bite').textContent = `${now.bite} ${why(now.reasons)}`.trim();
    $('fish-bite').className = 'seg sm ' + (now.bite >= 60 ? 'green' : '');

    // The day's strip and best windows: timing plus each hour's forecast wind, waves, rain, cloud and squalls.
    const day = localDayStart(time.validMs(), REGION.tzOffsetH);
    const key = `${day}|${Math.round(c.lat * 10)}|${Math.round(c.lng * 10)}|${score === null ? 'n' : Math.round(score * 10)}|${Math.round(water.factor * 20)}|${env.version()}`;
    if (key !== heavyKey) {
      heavyKey = key;
      const hours = new globalThis.Map<number, BiteWx>();
      const wxAt = (ms: number) => {
        const h = Math.floor(ms / 3.6e6);
        let w = hours.get(h);
        if (!w) hours.set(h, (w = env.at(c.lng, c.lat, h * 3.6e6 + 1.8e6)));
        return w;
      };
      const { series, windows } = bestWindows({ ...base, habitat: score }, day, 3, 0.8, wxAt);
      const inWin = (tt: number) => windows.some((w) => tt >= w.start && tt < w.end);
      const top = Math.max(1, ...series.map((s) => s.bite));
      $('fish-strip').innerHTML = series.map((s) => `<i class="${inWin(s.t) ? 'win' : ''}" style="height:${Math.max(6, Math.round((s.bite / top) * 100))}%"></i>`).join('') + '<b class="bite-now"></b>';
      $('fish-times').textContent = windows.length ? windows.map((w) => `${clock(w.start)}–${clock(w.end)}`).slice(0, 1).join('') : '--';
      $('fish-wins').innerHTML = windows.map((w) => `<div><span class="seg sm green">${clock(w.start)}–${clock(w.end)}</span> <span class="lbl">${why(w.reasons)}</span></div>`).join('');
    }
    const nowEl = $('fish-strip').querySelector<HTMLElement>('.bite-now');
    if (nowEl) nowEl.style.left = `${Math.min(100, Math.max(0, ((time.validMs() - day) / 864e5) * 100))}%`;

    $('fish-spots').innerHTML = spotsHtml();
    yours();
  };
  // YOUR CATCHES (PLAN 7.16): BITE at your logged catches of this species against their days' means.
  const yours = () => {
    const st = catchStats(catches(), SPECIES[i].id);
    $('fish-yours').textContent = !st ? t('fish.yours.none') : st.n < MIN_CATCHES ? t('fish.yours.few', { n: st.n }) : t('fish.yours.line', { n: st.n, bite: Math.round(st.bite), day: Math.round(st.day) });
    $('fish-yours').className = 'seg sm ' + (st && st.n >= MIN_CATCHES && st.bite > st.day ? 'green' : '');
  };
  // Names for the unnamed spots: the nearest beach, town, break, river mouth or harbour (J5).
  const marks = uniqueMarks(SPOTS, RAIN_TOWNS, SURF_BREAKS, PLUME_RIVERS.map((r) => ({ name: r.name, lngLat: r.mouth })), HARBOURS.filter((h) => !/APPROX/.test(h.name)));
  // While the map flies to a tapped spot the list keeps its order and distances from where the user was.
  let frozen: { lng: number; lat: number; n: number } | null = null;
  let lastList: (ReturnType<FishingLayer["bestSpots"]>[number] & { water: string[] })[] | null = null;
  const spotsHtml = () => {
    const c = frozen ?? map.getCenter();
    // Habitat picks the candidates; the water there today (clarity, temperature, chlorophyll, sargassum) re-ranks them.
    const sp = SPECIES[i];
    const ms = time.validMs();
    const spots = frozen && lastList ? lastList : layer
      .bestSpots(SPOT_CANDIDATES, { lng: c.lng, lat: c.lat }, SPOT_RADIUS_KM)
      .map((s) => {
        const w = waterTerm(sp, env.water(s.lng, s.lat, ms));
        return { ...s, score: Math.min(1, s.score * w.factor), water: w.reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    lastList = spots;
    if (!spots.length) return `<div class="lbl note">${t('fish.nospots')}</div>`;
    return spots
      .map((s, n) => {
        const km = Math.hypot((s.lng - c.lng) * Math.cos((c.lat * Math.PI) / 180), s.lat - c.lat) * 111.32;
        const near = nearestName(s.lng, s.lat, marks);
        const place = near ? t(near.at ? 'fish.spot.at' : 'fish.spot.near', { name: near.name, km: near.km.toFixed(1) }) : '';
        const line = t('fish.spot.line', { score: Math.round(s.score * 100), depth: s.depthM.toFixed(0), km: km.toFixed(1) });
        const why = [...s.why.map((w) => t(`fish.why.${w}` as Key)), ...s.water.map((w) => t(`bite.r.${w}` as Key))].join(' · ');
        const on = frozen?.n === n ? ' on' : '';
        return `<button type="button" class="spot${on}" data-n="${n}" data-lng="${s.lng}" data-lat="${s.lat}"><span class="seg sm green">${n + 1}</span> <span class="spot-name">${esc(place)}</span> <span class="lbl">${line}</span> <span class="lbl note">${why}</span></button>`;
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
    if (!b) return;
    const c = frozen ?? map.getCenter();
    frozen = { lng: c.lng, lat: c.lat, n: Number(b.dataset.n) };
    map.flyTo({ center: [Number(b.dataset.lng), Number(b.dataset.lat)], zoom: Math.max(map.getZoom(), 12.5), duration: 1200 });
  });
  // A drag, pinch or search by the user lets the list follow the map again.
  map.on('movestart', (e) => {
    if ((e as { originalEvent?: unknown }).originalEvent) frozen = null;
  });
  map.on('dragstart', () => (frozen = null));
  map.on('moveend', queue);
  map.on('move', () => {
    // Cheap rows follow the reticle while panning; the list and strip wait for moveend.
    const c = map.getCenter();
    const s = layer.scoreAt(c.lng, c.lat);
    $('fish-score').textContent = s === null ? `-- ${t(`season.${seasonOf(SPECIES[i], month())}` as Key)}` : `${Math.round(s * 100)}% ${t(`season.${seasonOf(SPECIES[i], month())}` as Key)}`;
  });
  time.subscribe(() => ((frozen = null), layer.setMonth(month()), queue()));
  // Feeds load after the panel and lightning refreshes every few minutes: pick them up.
  setInterval(queue, 60_000);
  apply();

  /** BITE at a catch with that species' habitat and water, and the mean over that day's daylight there (local 06 to 18). */
  const scoreCatch = (lng: number, lat: number, ms: number, id: string) => {
    const sp = SPECIES.find((s) => s.id === id);
    const habitat = sp ? layer.scoreFor(sp.id, lng, lat) : null;
    const water = sp ? waterTerm(speciesById(sp.id), env.water(lng, lat, ms)) : null;
    const base = { lat, lng, tide: LIMON_HARMONICS, tzOffsetH: REGION.tzOffsetH, water, habitat };
    const now = bite({ ...base, ...env.at(lng, lat, ms), tMs: ms }).bite;
    const day = localDayStart(ms, REGION.tzOffsetH);
    const hours = new globalThis.Map<number, BiteWx>();
    const wxAt = (t: number) => {
      const h = Math.floor(t / 3.6e6);
      let w = hours.get(h);
      if (!w) hours.set(h, (w = env.at(lng, lat, h * 3.6e6 + 1.8e6)));
      return w;
    };
    const light = bestWindows(base, day, 1, 0.8, wxAt).series.filter((s) => s.t >= day + 6 * 3.6e6 && s.t < day + 18 * 3.6e6);
    const biteDay = light.reduce((a, s) => a + s.bite, 0) / Math.max(1, light.length);
    return { bite: now, biteDay: Math.round(biteDay) };
  };
  return { scoreCatch, refresh: queue };
}
