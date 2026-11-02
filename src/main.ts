import '@fontsource/share-tech-mono';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { createMap } from './map';
import { mountHud } from './hud';
import { mockConditions, mockCurrentField, mockWindField } from './mock';
import { createLockFx, mountZoomTiers } from './zoom-fx';
import { createEnhancer } from './enhance';
import { mountSeek } from './seek';
import { createSettings, safeStorage } from './settings';
import { mountSettingsUi } from './settings-ui';
import { fetchSeafloor } from './adapters/seafloor';
import { mountSeafloor } from './layers/seafloor';
import { mountSeafloorHud } from './seafloor-hud';
import { layers } from './layers/registry';
import { bindMapLayers } from './layers/visibility';
import { mountLayersPanel } from './layers-panel';
import { FLOW_STYLE, mountFlow } from './layers/flow';
import type { FlowSource } from './layers/flow-sim';
import { mountFlowHud } from './flow-hud';
import { isWater } from './physics/bathy';
import { createTimeStore } from './time';
import { mountTimeSlider } from './time-slider';
import { KT_PER_MS, sampleField, fromDeg } from './physics/flow';
import { MOCK_FLOW } from './region';

registerSW({ immediate: true });

const map = createMap('map');
const hud = document.getElementById('hud')!;
// Tiers first: the HUD reads the tier they publish on each move.
mountZoomTiers(map);
const time = createTimeStore();
// Wind and current particles on mock fields until the PLAN 2.3 / 2.5 adapters.
// Past a week no model has skill: the OUTLOOK band shows climatology (the mock's mean pattern, hour 0).
const climatological = () => time.band() === 'outlook';
const windHour = () => (climatological() ? 0 : time.offsetH());
const hoursSinceEpoch = (ms: number) => ms / 3.6e6;
const flowSources: { wind: FlowSource; current: FlowSource } = {
  wind: { field: mockWindField(windHour()), ...FLOW_STYLE.wind },
  current: { field: mockCurrentField(hoursSinceEpoch(time.validMs())), ...FLOW_STYLE.current },
};
// The wind reading comes from the wind field at its reference point, so HUD and particles agree at every hour.
const windAtRef: [number, number] = [0, 0];
const conditionsAt = () => {
  const c = mockConditions(Date.now(), time.validMs(), climatological());
  if (sampleField(flowSources.wind.field, ...MOCK_FLOW.windRef, windAtRef)) {
    c.windKt = Math.hypot(...windAtRef) * KT_PER_MS;
    c.windDirDeg = fromDeg(...windAtRef);
  }
  return c;
};
mountHud(hud, map, conditionsAt);
mountTimeSlider(hud, time);
// The lock-on effect plays only for a picked target, never on scroll/pinch zoom.
const settings = createSettings(safeStorage());
const enhancer = createEnhancer(map, createLockFx(map, hud), settings.enhance);
mountSeek(hud, (t) => enhancer.go(t), settings);
// Layer toggles and activity presets; other layers register into `layers` (src/layers/registry.ts).
bindMapLayers(map, layers);
mountLayersPanel(hud, layers);
mountSettingsUi(hud, settings);

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
    flowSources.wind = { ...flowSources.wind, field: mockWindField(windHour()) };
    flowSources.current = { ...flowSources.current, field: mockCurrentField(hoursSinceEpoch(time.validMs())) };
    flow?.setSource('wind', flowSources.wind);
    flow?.setSource('current', flowSources.current);
    flowHud?.refresh();
  });
});

// Depth, reefs and seamarks: static assets, precached for offline use.
fetchSeafloor()
  .then(({ data }) => {
    mountSeafloorHud(hud, map, data);
    // Currents stay in the sea once the coastline mask is here.
    const current = { ...flowSources.current, water: (lng: number, lat: number) => isWater(data.land, data.macro, lng, lat) };
    flowSources.current = current;
    flow?.setSource('current', current);
    flowHud?.refresh();
    return mountSeafloor(map, data);
  })
  .catch((err) => console.warn('seafloor layer unavailable', err));
