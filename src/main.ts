import '@fontsource/share-tech-mono';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { createMap } from './map';
import { mountHud } from './hud';
import { mockConditions, mockCurrentField, mockWindField } from './mock';
import { createLockFx, mountZoomTiers } from './zoom-fx';
import { createEnhancer } from './enhance';
import { mountSeek } from './seek';
import { createSettings, safeSession, safeStorage, takeView } from './settings';
import { mountSurfBreaks } from './layers/surf-breaks';
import { mountSurfHud } from './surf-hud';
import { createBoatStore } from './boat/store';
import { mountBoatPanel } from './boat-panel';
import { dictFor, setDict } from './i18n';
import { mountLangUi } from './lang-ui';
import { PHONE_QUERY, createSheets, mountSheets } from './sheets';
import { mountSettingsUi } from './settings-ui';
import { mountSettingsPanel } from './settings-panel';
import { fetchSeafloor } from './adapters/seafloor';
import { mountSeafloor } from './layers/seafloor';
import { mountSeafloorHud } from './seafloor-hud';
import { fetchZones, mountZones } from './layers/zones';
import { mountZonesHud } from './zones-hud';
import { fetchMouths, fetchOccurrences, mountFishing } from './layers/fishing';
import { loadSpecies, mountFishingHud } from './fishing-hud';
import { layers } from './layers/registry';
import { bindMapLayers } from './layers/visibility';
import { mountLayersPanel } from './layers-panel';
import { FLOW_STYLE, mountFlow } from './layers/flow';
import type { FlowSource } from './layers/flow-sim';
import { mountFlowHud } from './flow-hud';
import { isWater, sample } from './physics/bathy';
import { createTimeStore } from './time';
import { mountTimeSlider } from './time-slider';
import { KT_PER_MS, sampleField, fromDeg } from './physics/flow';
import { MOCK_FLOW, REGION, SPOTS } from './region';
import { fetchWind, windAt, type WindData } from './adapters/wind';
import { dataAge, describeAge } from './adapters/data-age';
import { createNet } from './net';
import { createPhysicsClient, type PhysicsClient } from './physics/client';
import { tideState } from './physics/tide';
import { LIMON_HARMONICS } from './data/tides-limon';
import { nearest } from './geo';
import type { RipLevel } from './physics/rip';

registerSW({ immediate: true });

// Language first: every panel builds its text once, from the active dictionary.
const settings = createSettings(safeStorage(), navigator.languages ?? [navigator.language], window.matchMedia('(prefers-contrast: more)').matches);
setDict(dictFor(settings.lang()));
document.documentElement.lang = settings.lang();
const map = createMap('map', takeView(safeSession()));
const hud = document.getElementById('hud')!;
// Tiers first: the HUD reads the tier they publish on each move.
mountZoomTiers(map);
const time = createTimeStore();
// Current particles on a mock field until the PLAN 2.5 adapter.
// Past a week no model has skill: the OUTLOOK band shows climatology (the mock's mean pattern, hour 0).
const climatological = () => time.band() === 'outlook';
const windHour = () => (climatological() ? 0 : time.offsetH());
const hoursSinceEpoch = (ms: number) => ms / 3.6e6;
// Real wind (PLAN 2.3) once loaded: forecast grid, then monthly climatology for OUTLOOK. Mock until then, or if none is published.
let wind: WindData | null = null;
const windField = () => (wind && windAt(wind, time.band(), time.validMs())?.field) || mockWindField(windHour());
const flowSources: { wind: FlowSource; current: FlowSource } = {
  wind: { field: windField(), ...FLOW_STYLE.wind },
  current: { field: mockCurrentField(hoursSinceEpoch(time.validMs())), ...FLOW_STYLE.current },
};
// The wind reading comes from the wind field at its reference point, so HUD and particles agree at every hour.
const windAtRef: [number, number] = [0, 0];
// Rip risk at the spot nearest the map centre, from the physics worker (PLAN 3.6) once the seafloor loads.
let spotRip: RipLevel | null = null;
const conditionsAt = () => {
  const c = baseConditions();
  if (spotRip) c.ripRisk = spotRip;
  return c;
};
const baseConditions = () => {
  const c = mockConditions(Date.now(), time.validMs(), climatological());
  if (sampleField(flowSources.wind.field, ...MOCK_FLOW.windRef, windAtRef)) {
    c.windKt = Math.hypot(...windAtRef) * KT_PER_MS;
    c.windDirDeg = fromDeg(...windAtRef);
  }
  return c;
};
// DATA AGE and connectivity for the HUD (PLAN 5.2).
const net = createNet();
mountHud(hud, map, conditionsAt, { age: () => describeAge(dataAge.oldest(), Date.now()), online: net.online });
mountTimeSlider(hud, time);
// The lock-on effect plays only for a picked target, never on scroll/pinch zoom.
const enhancer = createEnhancer(map, createLockFx(map, hud), settings.enhance);
// Phone: panels are drawers, closed until tapped; wide screens start with the LAYERS drawer open.
const sheets = createSheets(window.matchMedia(PHONE_QUERY).matches ? null : 'layers');
mountSeek(hud, (t) => enhancer.go(t), settings, sheets);
// Layer toggles and activity presets; other layers register into `layers` (src/layers/registry.ts).
bindMapLayers(map, layers);
mountSettingsUi(hud, settings);
mountLayersPanel(hud, layers, sheets);
mountLangUi(hud, settings, map);
mountSheets(hud, map, sheets);
// Surf break catalog (PLAN 6.4): markers and BREAK rows.
mountSurfBreaks(map);
mountSurfHud(hud, map);
// Boat mode: GPS track and pin log, kept on the device. Depth at a pin comes from the seafloor grid once it loads.
let depthAt: ((lng: number, lat: number) => number | undefined) | null = null;
mountBoatPanel(hud, map, createBoatStore(safeStorage()), sheets, () => depthAt);
// Last, so SET is the last tab and the settings controls (ENHANCE, SUN, language) are all mounted to be moved into it.
mountSettingsPanel(hud, sheets);

const flow = mountFlow(map, flowSources);
if (flow) {
  layers.register('wind', { setVisible: (on) => flow.setVisible('wind', on) });
  layers.register('currents', { setVisible: (on) => flow.setVisible('current', on) });
}
const flowHud = mountFlowHud(hud, map, () => flowSources.current);

// New forecast hour: rebuild both fields. Scrubbing fires many times a frame, so do it once per frame.
let fieldsQueued = false;
time.subscribe(() => {
  if (fieldsQueued) return;
  fieldsQueued = true;
  requestAnimationFrame(() => {
    fieldsQueued = false;
    flowSources.wind = { ...flowSources.wind, field: windField() };
    flowSources.current = { ...flowSources.current, field: mockCurrentField(hoursSinceEpoch(time.validMs())) };
    flow?.setSource('wind', flowSources.wind);
    flow?.setSource('current', flowSources.current);
    flowHud?.refresh();
  });
});

// Wind: load at start, and again when the network returns or the app comes back to the front after a while,
// so a phone that was offline picks up fresh data without a reload. Offline, the cached copy loads; with nothing
// cached the mock field stays (DATA AGE then reads SIM).
let windLoading = false;
const loadWind = () => {
  if (windLoading) return;
  windLoading = true;
  fetchWind()
    .then((d) => {
      if (!d.forecast && !d.climatology) return console.warn('wind: no forecast or climatology published; using mock');
      wind = d;
      flowSources.wind = { ...flowSources.wind, field: windField() };
      flow?.setSource('wind', flowSources.wind);
    })
    .catch((err) => console.warn('wind unavailable', err))
    .finally(() => (windLoading = false));
};
const REFRESH_AFTER_MS = 3 * 3.6e6;
const refreshIfStale = () => {
  const o = dataAge.oldest();
  if (net.online() && (!o || o.fromCache || Date.now() - o.fetchedAt > REFRESH_AFTER_MS)) loadWind();
};
loadWind();
net.subscribe(refreshIfStale);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refreshIfStale());

// Protected areas: static outlines, precached for offline use.
fetchZones()
  .then(({ data, geojson }) => {
    mountZonesHud(hud, map, data);
    mountZones(map, geojson);
  })
  .catch((err) => console.warn('protected zones unavailable', err));

// Spot physics off the main thread: refraction, breaking and rip risk for the nearest spot.
// Swell is the mock reading until the waves adapter (PLAN 2.2); tide and wind are live.
let physics: PhysicsClient | null = null;
const updateSpotPhysics = () => {
  if (!physics) return;
  const c = baseConditions();
  const ms = time.validMs();
  const centre = map.getCenter();
  const pin = nearest([centre.lng, centre.lat], SPOTS)!.point.lngLat;
  physics
    .latest({
      pin,
      sea: { Hs: c.swellHeightM, Tp: c.swellPeriodS, fromDeg: c.swellDirDeg },
      tideLevel: tideState(LIMON_HARMONICS, ms).level,
      wind: { speedMs: c.windKt / KT_PER_MS, fromDeg: c.windDirDeg },
    })
    .then((r) => (spotRip = r ? r.rip.level : null))
    .catch((err) => console.warn('spot physics failed', err));
};
let physicsQueued = false;
const queueSpotPhysics = () => {
  if (physicsQueued) return;
  physicsQueued = true;
  requestAnimationFrame(() => {
    physicsQueued = false;
    updateSpotPhysics();
  });
};
time.subscribe(queueSpotPhysics);
map.on('moveend', queueSpotPhysics);
setInterval(updateSpotPhysics, 60_000);

// Depth, reefs and seamarks: static assets, precached for offline use.
fetchSeafloor()
  .then(({ data }) => {
    mountSeafloorHud(hud, map, data);
    physics = createPhysicsClient({ region: data.region, macro: data.macro, land: data.land });
    updateSpotPhysics();
    depthAt = (lng, lat) => {
      const z = sample(data.region, lng, lat);
      return Number.isFinite(z) && z < 0 ? -z : undefined;
    };
    // Shore and kayak habitat score: built from the depth grid, reefs and river mouths.
    Promise.all([fetchMouths(), fetchOccurrences()])
      .then(([{ data: mouths }, occurrences]) => {
        const species = loadSpecies();
        const month = new Date(time.validMs()).getUTCMonth();
        const layer = mountFishing(map, { region: data.region, land: data.land, reefs: data.reefs, mouths, bounds: [REGION.bounds[0][0], REGION.bounds[0][1], REGION.bounds[1][0], REGION.bounds[1][1]] }, { species, month }, occurrences);
        mountFishingHud(hud, map, layer, time, species);
      })
      .catch((err) => console.warn('fishing layer unavailable', err));
    // Currents stay in the sea once the coastline mask is here.
    const current = { ...flowSources.current, water: (lng: number, lat: number) => isWater(data.land, data.macro, lng, lat) };
    flowSources.current = current;
    flow?.setSource('current', current);
    flowHud?.refresh();
    return mountSeafloor(map, data);
  })
  .catch((err) => console.warn('seafloor layer unavailable', err));
