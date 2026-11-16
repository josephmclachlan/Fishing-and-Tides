/**
 * Fishing rows in the side panel (PLAN 4.5, extended): the MODE (EAT or SPORT, PLAN 7.120), the target species of
 * that mode (arrows), the REACH
 * highlight (ALL / SHORE / BOAT), the habitat score at the reticle, the BITE score for the slider time
 * (habitat x timing x water: tide, light, solunar, wind, waves, rain, cloud, squalls, lightning, and the
 * species' water from clarity, sea temperature, chlorophyll and sargassum;
 * src/fishing/bite.ts), BEST TIMES for the slider's day from the hourly forecast as a bar strip with the best windows, and BEST SPOTS nearby (habitat x water) with the reasons. The
 * species and reach are remembered on the device.
 */
import { condSlot } from './cond-groups';
import { UI } from './icons/ui';
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { PLUME_RIVERS, RAIN_TOWNS, REGION, SPOTS } from './region';
import { SURF_BREAKS } from './data/surf-breaks';
import { PLACES as HARBOURS } from './data/harbours';
import { nearestName, uniqueMarks } from './fishing/near-name';
import type { FishingLayer, Reach } from './layers/fishing';
import type { TimeStore } from './time';
import { MODES, SPECIES, seasonOf, speciesIn, type FishMode, type SpeciesId } from './fishing/species';
import { bestWindows, bite, type BiteReason, type BiteWx } from './fishing/bite';
import { waterTerm, type WaterInputs } from './fishing/water';
import { catchStats, MIN_CATCHES, type CatchPin } from './fishing/catches';
import { speciesById } from './fishing/species';
import { OFFSHORE } from './fishing/offshore';
import { ciguaBoatHtml, ciguaNoteHtml } from './fishing/cigua-note';
import { SPEAR_TARGETS } from './fishing/spear';
import { LIMON_HARMONICS } from './data/tides-limon';
import { localDayStart } from './physics/astro';
import { clock } from './astro-hud';

const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const KEY = 'ft.fishing.species';
const REACH_KEY = 'ft.fishing.reach';
const SPEAR_KEY = 'ft.spear.target';
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

/** One of the day's best windows, its clock range and why, in words. */
export interface FishWin { start: number; end: number; range: string; why: string }
/** One BEST SPOTS row: its place name, the score, depth and distance line, and its reasons. */
export interface FishSpotRow { n: number; place: string; line: string; why: string; score: number; lng: number; lat: number; on: boolean }
/** The day's BITE strip: each step's bar height (percent of the day's best) and whether it falls in a best window. */
export interface FishStrip { day: number; bars: readonly { t: number; pct: number; win: boolean }[] }
export interface SpearInfo { target: SpeciesId | null; targets: readonly SpeciesId[]; spots: readonly FishSpotRow[] }
export interface FishInfo { id: SpeciesId; name: string; bite: number | null; wins: readonly FishWin[]; strip: FishStrip; spots: readonly FishSpotRow[] }

const why = (rs: readonly BiteReason[]) => rs.map((r) => t(`bite.r.${r}` as Key)).join(' · ');

export function mountFishingHud(root: HTMLElement, map: Map, layer: FishingLayer, time: TimeStore, initial: SpeciesId, env: FishEnv = NO_ENV, catches: () => readonly CatchPin[] = () => [], onMode: (m: FishMode) => void = () => {}, onInfo: () => void = () => {}) {
  const side = condSlot(root, 'fishing', 10);
  if (!side) return null;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast fish-rows">
      <div class="ro fish-reach fish-mode"><span class="lbl">${t('fish.mode')}</span><span class="seg sm" id="fish-mode">${MODES.map((m) => `<button type="button" class="tab" data-mode="${m}">${t(`fish.mode.${m}` as Key)}</button>`).join('')}</span></div>
      <div class="ro" id="fish-sport" hidden><span class="lbl">${t('fish.sport')}</span></div>
      <div class="ro fish-pick"><span class="lbl">${t('fish.target')}</span>
        <button type="button" class="tab" id="fish-prev" aria-label="${t('fish.prev')}">${UI.prev}</button>
        <span class="seg sm green" id="fish-sp">--</span>
        <button type="button" class="tab" id="fish-next" aria-label="${t('fish.next')}">${UI.next}</button></div>
      <div class="ro fish-cig" id="fish-cig" hidden></div>
      <div class="ro" id="fish-low" hidden><span class="lbl" id="fish-low-t">${t('fish.low')}</span></div>
      <div class="ro" id="fish-hand" hidden><span class="lbl">${t('fish.byhand')}</span></div>
      <div class="ro fish-reach"><span class="lbl">${t('fish.reach')}</span><span class="seg sm" id="fish-reach">${REACHES.map((r) => `<button type="button" class="tab" data-reach="${r}">${t(`fish.reach.${r}` as Key)}</button>`).join('')}</span></div>
      <div class="ro fish-cig" id="fish-cig-boat" hidden></div>
      <div class="ro"><span class="lbl">${t('fish.score')}</span><span class="seg sm green" id="fish-score">--</span></div>
      <div class="ro"><span class="lbl">${t('fish.bite')}</span><span class="seg sm green" id="fish-bite">--</span></div>
      <div class="ro fish-bite-why" hidden><span class="lbl">${t('fish.biteWhy')}</span><span class="seg sm" id="fish-bite-why"></span></div>
      <div class="ro"><span class="lbl">${t('fish.times')}</span><span class="seg sm" id="fish-times">--</span></div>
      <div class="bite-strip" id="fish-strip" aria-hidden="true"></div>
      <div class="bite-wins" id="fish-wins"></div>
      <details class="fishx" open><summary><span class="lbl">${t('fish.spots')}</span></summary><div id="fish-spots" class="fish-spots"></div></details>
      <div class="ro"><span class="lbl">${t('fish.yours')}</span><span class="seg sm" id="fish-yours">--</span></div>
      <div class="ro"><a class="lbl fish-link" href="#dispatch" title="${t('dp.linkSub')}">${t('dp.link')} ${UI.next}</a></div>
      <div class="ro"><a class="lbl fish-link" href="#notes?for=fish" title="${t('nt.linkSub')}">${t('nt.link')} ${UI.next}</a></div>
      <div class="ro"><span class="lbl note" id="fish-note">${t('fish.note')}</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  let i = Math.max(0, SPECIES.findIndex((s) => s.id === initial));
  let reach: Reach = loadReach();
  const tabs = [...side.querySelectorAll<HTMLButtonElement>('#fish-reach [data-reach]')];
  const modeTabs = [...side.querySelectorAll<HTMLButtonElement>('#fish-mode [data-mode]')];

  const month = () => new Date(time.validMs()).getUTCMonth();
  let queued = false;
  let heavyKey = '';
  let cigKey = '';
  const update = () => {
    queued = false;
    const sp = SPECIES[i];
    $('fish-sp').textContent = t(`fish.${sp.id}` as Key);
    // Ciguatera (fishing/cigua.ts): the picked fish, and with the boat in reach the mode's boat fish that carry it.
    if (cigKey !== `${sp.id}|${reach}`) {
      cigKey = `${sp.id}|${reach}`;
      const cig = ciguaNoteHtml(sp.id, sp.ciguatera);
      $('fish-cig').innerHTML = cig;
      $('fish-cig').hidden = !cig;
      const boatCig = reach === 'shore' ? '' : ciguaBoatHtml(OFFSHORE.filter((o) => o.mode === sp.mode && o.ciguatera).map((o) => o.id));
      $('fish-cig-boat').innerHTML = boatCig;
      $('fish-cig-boat').hidden = !boatCig;
    }
    $('fish-low').hidden = sp.confidence !== 'low';
    $('fish-low-t').textContent = t(sp.noLocalRecord ? (`fish.low.${sp.id}` as Key) : 'fish.low');
    $('fish-hand').hidden = !sp.byHand;
    $('fish-sport').hidden = sp.mode !== 'sport';
    $('fish-note').textContent = t(sp.mode === 'sport' ? 'fish.note.sport' : 'fish.note');
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
    // The score out of 100 on its own, its reasons on the next line (persona review J7).
    $('fish-bite').textContent = `${now.bite}/100`;
    const reasons = why(now.reasons);
    $('fish-bite-why').textContent = reasons;
    $('fish-bite-why').parentElement!.hidden = !reasons;
    $('fish-bite').className = 'seg sm ' + (now.bite >= 60 ? 'green' : '');
    lastBite = now.bite;

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
      lastStrip = { day, bars: series.map((x) => ({ t: x.t, pct: Math.max(6, Math.round((x.bite / top) * 100)), win: inWin(x.t) })) };
      lastWins = windows.map((w) => ({ start: w.start, end: w.end, range: `${clock(w.start)}–${clock(w.end)}`, why: why(w.reasons) }));
      $('fish-times').textContent = windows.length ? windows.map((w) => `${clock(w.start)}–${clock(w.end)}`).slice(0, 1).join('') : '--';
      $('fish-wins').innerHTML = windows.map((w) => `<div><span class="seg sm green">${clock(w.start)}–${clock(w.end)}</span> <span class="lbl">${why(w.reasons)}</span></div>`).join('');
    }
    const nowEl = $('fish-strip').querySelector<HTMLElement>('.bite-now');
    if (nowEl) nowEl.style.left = `${Math.min(100, Math.max(0, ((time.validMs() - day) / 864e5) * 100))}%`;

    $('fish-spots').innerHTML = spotsHtml();
    yours();
    onInfo();
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
  /** What the map's fish bar shows (PLAN 7.143): the same windows and spots as these rows. */
  let lastBite: number | null = null;
  let lastWins: FishWin[] = [];
  let lastStrip: FishStrip = { day: 0, bars: [] };
  let lastRows: FishSpotRow[] = [];
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
    lastRows = spots.map((s, n) => {
      const km = Math.hypot((s.lng - c.lng) * Math.cos((c.lat * Math.PI) / 180), s.lat - c.lat) * 111.32;
      const near = nearestName(s.lng, s.lat, marks);
      const place = near ? t(near.at ? 'fish.spot.at' : 'fish.spot.near', { name: near.name, km: near.km.toFixed(1) }) : '';
      const line = t('fish.spot.line', { score: Math.round(s.score * 100), depth: s.depthM.toFixed(0), km: km.toFixed(1) });
      const why = [...s.why.map((w) => t(`fish.why.${w}` as Key)), ...s.water.map((w) => t(`bite.r.${w}` as Key))].join(' · ');
      return { n, place, line, why, score: Math.round(s.score * 100), lng: s.lng, lat: s.lat, on: frozen?.n === n };
    });
    if (!spots.length) return `<div class="lbl note">${t('fish.nospots')}</div>`;
    return lastRows
      .map((r) => `<button type="button" class="spot${r.on ? ' on' : ''}" data-n="${r.n}" data-lng="${r.lng}" data-lat="${r.lat}"><span class="seg sm green">${r.n + 1}</span> <span class="spot-name">${esc(r.place)}</span> <span class="lbl">${r.line}</span> <span class="lbl note">${r.why}</span></button>`)
      .join('');
  };
  const queue = () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  };
  let shownMode = SPECIES[i].mode, shownReach = reach;
  const apply = () => {
    // EAT or SPORT, or the reach, changed here (the MODE and REACH rows, SHOW ON MAP): tell the map's switches and spot card.
    if (SPECIES[i].mode !== shownMode || reach !== shownReach) onMode(((shownReach = reach), (shownMode = SPECIES[i].mode)));
    layer.setSpecies(SPECIES[i].id);
    layer.setMonth(month());
    layer.setReach(reach);
    tabs.forEach((b) => b.classList.toggle('on', b.dataset.reach === reach));
    modeTabs.forEach((b) => b.classList.toggle('on', b.dataset.mode === SPECIES[i].mode));
    heavyKey = '';
    try {
      localStorage.setItem(KEY, SPECIES[i].id);
      localStorage.setItem(REACH_KEY, reach);
    } catch {
      /* private mode */
    }
    update();
  };
  // The arrows step through the current mode's fish only.
  const step = (d: number) => {
    const list = speciesIn(SPECIES[i].mode), k = list.findIndex((s) => s.id === SPECIES[i].id);
    i = SPECIES.indexOf(list[(k + d + list.length) % list.length]);
    apply();
  };
  /** EAT or SPORT: back to the fish last picked in that mode, else its first. */
  const lastOf: Partial<Record<FishMode, SpeciesId>> = { [SPECIES[i].mode]: SPECIES[i].id };
  const setMode = (m: FishMode) => {
    if (m === SPECIES[i].mode) return;
    lastOf[SPECIES[i].mode] = SPECIES[i].id;
    const id = lastOf[m] ?? speciesIn(m)[0].id;
    i = SPECIES.findIndex((s) => s.id === id);
    apply();
  };
  modeTabs.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as FishMode)));
  $('fish-prev').addEventListener('click', () => step(-1));
  $('fish-next').addEventListener('click', () => step(1));
  tabs.forEach((b) => b.addEventListener('click', () => ((reach = b.dataset.reach as Reach), apply())));
  /** Fly to BEST SPOTS row n; the list keeps its order and distances from where the user was until they move the map. */
  const flySpot = (n: number) => {
    const r = lastRows[n];
    if (!r) return;
    const c = frozen ?? map.getCenter();
    frozen = { lng: c.lng, lat: c.lat, n };
    map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 1200 });
  };
  $('fish-spots').addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('.spot');
    if (b) flySpot(Number(b.dataset.n));
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
  /** Switch the target species from outside (the guide's SHOW ON MAP). */
  const setSpecies = (id: SpeciesId) => {
    const k = SPECIES.findIndex((s) => s.id === id);
    if (k >= 0 && k !== i) ((i = k), apply());
  };
  /** ALL, SHORE or BOAT from outside (the map's switch over the fish map). */
  const setReach = (r: Reach) => {
    if (r !== reach && REACHES.includes(r)) ((reach = r), apply());
  };
  /**
   * SPEAR (PLAN 7.143): the picked target, remembered on the device (null: every spear fish), and the best open water for it
   * near the crosshair, named as BEST SPOTS names its rows. Lobster in its closed season falls back to every spear fish.
   */
  let spearT: SpeciesId | null = null;
  try {
    const v = localStorage.getItem(SPEAR_KEY) as SpeciesId | null;
    spearT = v && SPEAR_TARGETS.includes(v) ? v : null;
  } catch {
    /* private mode */
  }
  const spearOpen = (id: SpeciesId) => speciesById(id).season[month()] > 0;
  const spearTarget = () => (spearT && spearOpen(spearT) ? spearT : null);
  const setSpearTarget = (id: SpeciesId | null) => {
    spearT = id;
    layer.setSpearTarget(spearTarget());
    try {
      if (id) localStorage.setItem(SPEAR_KEY, id);
      else localStorage.removeItem(SPEAR_KEY);
    } catch {
      /* private mode */
    }
  };
  layer.setSpearTarget(spearTarget());
  time.subscribe(() => layer.setSpearTarget(spearTarget()));
  const spearInfo = () => {
    const c = map.getCenter();
    const rows: FishSpotRow[] = layer.spearSpots(5, { lng: c.lng, lat: c.lat }, SPOT_RADIUS_KM).map((s, n) => {
      const km = Math.hypot((s.lng - c.lng) * Math.cos((c.lat * Math.PI) / 180), s.lat - c.lat) * 111.32;
      const near = nearestName(s.lng, s.lat, marks);
      const place = near ? t(near.at ? 'fish.spot.at' : 'fish.spot.near', { name: near.name, km: near.km.toFixed(1) }) : '';
      const line = t('fish.spot.line', { score: Math.round(s.score * 100), depth: s.depthM.toFixed(0), km: km.toFixed(1) });
      return { n, place, line, why: s.why.map((w) => t(`fish.why.${w}` as Key)).join(' · '), score: Math.round(s.score * 100), lng: s.lng, lat: s.lat, on: false };
    });
    return { target: spearTarget(), targets: SPEAR_TARGETS.filter(spearOpen), spots: rows };
  };
  /** The map's fish bar (PLAN 7.143): the fish, its BITE, the day's best windows and the best spots near the crosshair. */
  const info = (): FishInfo => ({ id: SPECIES[i].id, name: t(`fish.${SPECIES[i].id}` as Key), bite: lastBite, wins: lastWins, strip: lastStrip, spots: lastRows });
  const flyTo = (lng: number, lat: number) => map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 12.5), duration: 1200 });
  return { scoreCatch, refresh: queue, setSpecies, setMode, mode: () => SPECIES[i].mode, setReach, reach: () => reach, step, info, flySpot, spearInfo, setSpearTarget, flyTo };
}
