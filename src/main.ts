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
import { mountWeatherHud } from './weather-hud';
import { mountStorms } from './layers/storms';
import { fetchWeather } from './adapters/weather';
import { fetchStorms } from './adapters/storms';
import { mountSeaStateHud } from './sea-state-hud';
import { mountHarbours } from './layers/harbours';
import { mountHarboursHud } from './harbours-hud';
import type { Grid } from './physics/bathy';
import { createBoatStore } from './boat/store';
import { mountBoatPanel } from './boat-panel';
import { dictFor, setDict } from './i18n';
import { mountLangUi } from './lang-ui';
import { PHONE_QUERY, createSheets, mountSheets } from './sheets';
import { mountSounds } from './sounds';
import { mountSettingsUi } from './settings-ui';
import { mountSettingsPanel } from './settings-panel';
import { mountSystemCheck } from './system-check';
import { allChecks } from './verify/registry';
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
import { fetchWaves, wavesAt, type SeaState, type WavesData } from './adapters/waves';
import { dataAge, describeAge } from './adapters/data-age';
import { createNet } from './net';
import { createPhysicsClient } from './physics/client';
import { nearest } from './geo';
import { createSpotPhysics, type SpotPhysics } from './spot-physics';
import { mountRip } from './layers/rip';
import { mountSurfZoneHud } from './surf-zone-hud';

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
// Rip risk at the spot nearest the map centre, from the physics worker (PLAN 3.6, 4.2) once the seafloor loads.
let spotPhysics: SpotPhysics | null = null;
const conditionsAt = () => {
  const c = baseConditions();
  const centre = map.getCenter();
  const r = spotPhysics?.byName(nearest([centre.lng, centre.lat], SPOTS)!.point.name)?.result;
  if (r) c.ripRisk = r.rip.level;
  return c;
};
const baseConditions = () => {
  const c = mockConditions(Date.now(), time.validMs(), climatological());
  if (sampleField(flowSources.wind.field, ...MOCK_FLOW.windRef, windAtRef)) {
    c.windKt = Math.hypot(...windAtRef) * KT_PER_MS;
    c.windDirDeg = fromDeg(...windAtRef);
  }
  // Swell (PLAN 2.2): the primary swell partition at the map centre, or offshore of Cahuita when the centre is inland.
  const ctr = map.getCenter();
  const sea = seaStateAt(ctr.lng, ctr.lat) ?? seaStateAt(...MOCK_FLOW.windRef);
  if (sea) {
    const swell = Number.isFinite(sea.swellHs);
    c.swellHeightM = swell ? sea.swellHs : sea.hs;
    c.swellPeriodS = swell ? sea.swellT : sea.tm;
    c.swellDirDeg = swell ? sea.swellDir : sea.dir;
  }
  return c;
};
// Real waves once loaded (forecast to day 16, then climatology); the mock swell until then.
let waves: WavesData | null = null;
const seaStateAt = (lng: number, lat: number): SeaState | null => (waves ? wavesAt(waves, time.band(), time.validMs(), lng, lat) : null);
fetchWaves()
  .then((d) => {
    if (!d.forecast && !d.climatology) return console.warn('waves: no forecast or climatology published; using mock');
    waves = d;
    queueSpotPhysics();
  })
  .catch((err) => console.warn('waves unavailable', err));
// DATA AGE and connectivity for the HUD (PLAN 5.2).
const net = createNet();
let weatherHud: ReturnType<typeof mountWeatherHud> = null;
mountHud(hud, map, conditionsAt, { age: () => describeAge(dataAge.oldest(), Date.now()), online: net.online, alerts: () => weatherHud?.alerts() ?? [] });
mountTimeSlider(hud, time);
// The lock-on effect plays only for a picked target, never on scroll/pinch zoom.
const enhancer = createEnhancer(map, createLockFx(map, hud), settings.enhance);
// Phone: panels are drawers, closed until tapped; wide screens start with the LAYERS drawer open.
const sheets = createSheets(window.matchMedia(PHONE_QUERY).matches ? null : 'layers');
mountSeek(hud, (t) => enhancer.go(t), settings, sheets);
// Layer toggles and activity presets; other layers register into `layers` (src/layers/registry.ts).
bindMapLayers(map, layers);
mountSettingsUi(hud, settings);
mountSounds(document, settings.sound);
mountLayersPanel(hud, layers, sheets);
mountLangUi(hud, settings, map);
mountSheets(hud, map, sheets);
// Surf break catalog (PLAN 6.4): markers and BREAK rows.
const surfBreaks = mountSurfBreaks(map);
const surfHud = mountSurfHud(hud, map, (name) => spotPhysics?.byName(name)?.surf);
mountSeaStateHud(hud, conditionsAt);
// Weather and active tropical storms (PLAN 7.3, 7.5): live feeds, rows stay -- until they load.
weatherHud = mountWeatherHud(hud, { validMs: () => time.validMs() });
time.subscribe(() => weatherHud?.refresh());
const stormLayer = mountStorms(map);
fetchWeather().then((d) => weatherHud?.setWeather(d)).catch((err) => console.warn('weather unavailable', err));
fetchStorms().then((d) => (stormLayer.setStorms(d.storms), weatherHud?.setStorms(d.storms))).catch((err) => console.warn('storms unavailable', err));
mountHarbours(map);
let landGrid: Grid | null = null;
const harboursHud = mountHarboursHud(hud, map, { windFromDeg: () => conditionsAt().windDirDeg, land: () => landGrid });
// Boat mode: GPS track and pin log, kept on the device. Depth at a pin comes from the seafloor grid once it loads.
let depthAt: ((lng: number, lat: number) => number | undefined) | null = null;
mountBoatPanel(hud, map, createBoatStore(safeStorage()), sheets, () => depthAt);
// SYSTEM CHECK: its tab joins the settings controls on a phone.
mountSystemCheck(hud, sheets, { checks: () => allChecks(), net, storage: safeStorage() });
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

// Spot physics off the main thread (refraction, breaking, rip risk) for every named spot: the rip
// overlay, the SURF ZONE readouts and the RIP readout. Sea state from the waves adapter at each
// spot (the mock swell until it loads); tide and wind are live.
const ripLayer = mountRip(map);
/**
 * Offshore sea state for the physics at a shoreline pin. The models give mean, not peak,
 * periods; the swell's mean period stands in for Tp when swell dominates, as it does on this
 * coast most of the year.
 */
const spotSea = (pin: [number, number]) => {
  const w = seaStateAt(...pin);
  if (!w || !Number.isFinite(w.tm)) return null;
  const swellLeads = Number.isFinite(w.swellHs) && Number.isFinite(w.swellT) && w.swellHs >= (Number.isFinite(w.windSeaHs) ? w.windSeaHs : 0);
  return { Hs: w.hs, Tp: swellLeads ? w.swellT : w.tm, fromDeg: swellLeads ? w.swellDir : w.dir };
};
let physicsQueued = false;
const queueSpotPhysics = () => {
  if (physicsQueued || !spotPhysics) return;
  physicsQueued = true;
  requestAnimationFrame(() => {
    physicsQueued = false;
    spotPhysics?.update();
  });
};
time.subscribe(queueSpotPhysics);
setInterval(queueSpotPhysics, 60_000);

// Depth, reefs and seamarks: static assets, precached for offline use.
fetchSeafloor()
  .then(({ data }) => {
    mountSeafloorHud(hud, map, data);
    landGrid = data.land;
    harboursHud?.refresh();
    spotPhysics = createSpotPhysics(createPhysicsClient({ region: data.region, macro: data.macro, land: data.land }), baseConditions, () => time.validMs(), spotSea);
    spotPhysics.subscribe(() => {
      ripLayer.update(spotPhysics!.all());
      surfBreaks.update((name) => spotPhysics!.byName(name)?.surf);
      surfHud.refresh();
    });
    mountSurfZoneHud(hud, map, spotPhysics);
    spotPhysics.update();
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
