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
import { createBoatStore } from './boat/store';
import { mountBoatPanel } from './boat-panel';
import { dictFor, setDict } from './i18n';
import { mountLangUi } from './lang-ui';
import { PHONE_QUERY, createSheets, mountSheets } from './sheets';
import { mountSettingsUi } from './settings-ui';
import { fetchSeafloor } from './adapters/seafloor';
import { mountSeafloor } from './layers/seafloor';
import { mountSeafloorHud } from './seafloor-hud';
import { fetchZones, mountZones } from './layers/zones';
import { mountZonesHud } from './zones-hud';
import { fetchMouths, mountFishing } from './layers/fishing';
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
import { MOCK_FLOW, REGION } from './region';
import { fetchWind, windAt, type WindData } from './adapters/wind';
import { dataAge } from './adapters/data-age';

registerSW({ immediate: true });

// Language first: every panel builds its text once, from the active dictionary.
const settings = createSettings(safeStorage(), navigator.languages ?? [navigator.language]);
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
const conditionsAt = () => {
  const c = mockConditions(Date.now(), time.validMs(), climatological());
  // DATA AGE: the oldest live feed once any has loaded (src/adapters/data-age.ts).
  c.fetchedAt = dataAge.oldest()?.fetchedAt ?? c.fetchedAt;
  if (sampleField(flowSources.wind.field, ...MOCK_FLOW.windRef, windAtRef)) {
    c.windKt = Math.hypot(...windAtRef) * KT_PER_MS;
    c.windDirDeg = fromDeg(...windAtRef);
  }
  return c;
};
mountHud(hud, map, conditionsAt);
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
// Boat mode: GPS track and pin log, kept on the device. Depth at a pin comes from the seafloor grid once it loads.
let depthAt: ((lng: number, lat: number) => number | undefined) | null = null;
mountBoatPanel(hud, map, createBoatStore(safeStorage()), sheets, () => depthAt);

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

fetchWind()
  .then((d) => {
    if (!d.forecast && !d.climatology) return console.warn('wind: no forecast or climatology published; using mock');
    wind = d;
    flowSources.wind = { ...flowSources.wind, field: windField() };
    flow?.setSource('wind', flowSources.wind);
  })
  .catch((err) => console.warn('wind unavailable', err));

// Protected areas: static outlines, precached for offline use.
fetchZones()
  .then(({ data, geojson }) => {
    mountZonesHud(hud, map, data);
    mountZones(map, geojson);
  })
  .catch((err) => console.warn('protected zones unavailable', err));

// Depth, reefs and seamarks: static assets, precached for offline use.
fetchSeafloor()
  .then(({ data }) => {
    mountSeafloorHud(hud, map, data);
    depthAt = (lng, lat) => {
      const z = sample(data.region, lng, lat);
      return Number.isFinite(z) && z < 0 ? -z : undefined;
    };
    // Shore and kayak habitat score: built from the depth grid, reefs and river mouths.
    fetchMouths()
      .then(({ data: mouths }) => {
        const species = loadSpecies();
        const month = new Date(time.validMs()).getUTCMonth();
        const layer = mountFishing(map, { region: data.region, land: data.land, reefs: data.reefs, mouths, bounds: [REGION.bounds[0][0], REGION.bounds[0][1], REGION.bounds[1][0], REGION.bounds[1][1]] }, { species, month });
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
