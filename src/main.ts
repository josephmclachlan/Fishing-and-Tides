import '@fontsource/share-tech-mono';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { createMap, STYLE_URL } from './map';
import { mountSyncUi } from './sync-ui';
import { tripJobs } from './offline/jobs';
import { mountPinchGuard } from './pinch-guard';
import { mountHud } from './hud';
import { mockConditions, mockCurrentField, mockWindField } from './mock';
import { createLockFx, mountZoomTiers } from './zoom-fx';
import { createEnhancer } from './enhance';
import { mountSeek } from './seek';
import { createSettings, safeSession, safeStorage, takeView } from './settings';
import { windFetchM, windSide, type WindSide } from './physics/fetch';
import { mountSurfBreaks } from './layers/surf-breaks';
import { mountSurfHud } from './surf-hud';
import { mountLightningHud } from './lightning-hud';
import { mountLightning } from './layers/lightning';
import { fetchLightning } from './adapters/lightning';
import { nearestFlash, STRIKE_ALERT_KM, type Flash } from './lightning';
import { biteWeather, blendedGustKt, nearestStorm, pressureTrend, squallLevel, summarise } from './weather';
import { crestGrid } from './waves-lines';
import { mountWavesLayer } from './layers/waves';
import { mountWeatherHud } from './weather-hud';
import { mountTownRainHud } from './town-rain-hud';
import { fetchTownRain } from './adapters/town-rain';
import { mountRainNowHud } from './rain-now-hud';
import { mountRainLayer } from './layers/rain';
import { fetchRainCells } from './adapters/rain-cells';
import { mountStorms } from './layers/storms';
import { fetchWeather, weatherAt, type WeatherData } from './adapters/weather';
import { LIMON_HARMONICS } from './data/tides-limon';
import { mountWatchPanel } from './watch-panel';
import { mountBoatWindowHud } from './boat-window-hud';
import { debrisAt } from './boat/debris';
import { makeReefLookup, shoalAlert, type ReefAt } from './boat/shoal';
import { REEFISH } from './fishing/cells';
import { fetchStorms, type Storm } from './adapters/storms';
import { mountSeaStateHud, type VerdictSafety } from './sea-state-hud';
import { mountAstroHud } from './astro-hud';
import { mountHarbours } from './layers/harbours';
import { mountHarboursHud } from './harbours-hud';
import type { Grid } from './physics/bathy';
import { createBoatStore } from './boat/store';
import { createCoralStore } from './coral/store';
import { mountCoralPanel } from './coral-panel';
import { mountCoralLogLayer } from './layers/coral-log';
import { mountBoatPanel, type CatchScorer, type OffshoreRead, type RouteDeps, type ShoalRead } from './boat-panel';
import { dictFor, setDict, t } from './i18n';
import { mountLangUi } from './lang-ui';
import { PHONE_QUERY, createSheets, mountSheets } from './sheets';
import { mountSounds } from './sounds';
import { mountSettingsUi } from './settings-ui';
import { mountIntro } from './intro';
import { mountMapExplain } from './map-explain';
import { mountHere } from './here-card';
import { mountSettingsPanel } from './settings-panel';
import { mountGlance } from './glance';
import { mountBestToday } from './best-today';
import type { MetricEnv } from './metrics/registry';
import { activityForPreset, mountCondGroups } from './cond-groups';
import { mountSwellHud } from './swell-hud';
import { mountExplain } from './explain';
import { mountSystemCheck } from './system-check';
import { mountLiveObs } from './live-obs';
import { fetchMetar } from './adapters/metar';
import { fetchHindcast, scoreWeather } from './adapters/weather-skill';
import type { MetarObs } from './adapters/metar-parse';
import { fetchPasses, type PassData } from './adapters/passes';
import { allChecks } from './verify/registry';
import { fetchSeafloor } from './adapters/seafloor';
import { mountSeafloor } from './layers/seafloor';
import { mountSeafloorHud } from './seafloor-hud';
import { fetchZones, mountZones } from './layers/zones';
import { mountZonesHud } from './zones-hud';
import { fetchMouths, fetchOccurrences, mountFishing } from './layers/fishing';
import { loadSpecies, mountFishingHud } from './fishing-hud';
import { layers } from './layers/registry';
import { mountMotionKey } from './layers/motion-key';
import { bindMapLayers } from './layers/visibility';
import { mountLayerNotes } from './layers/layer-notes';
import { createCoralMode } from './coral-mode';
import { mountCoral } from './layers/coral';
import type { CoralData } from './adapters/coral';
import { mountCoralHeat } from './coral-heat-ui';
import { mountCoralSpawning } from './coral-spawn-ui';
import { mountCoralGuide } from './coral-guide-ui';
import { mountCoralConduct } from './coral-conduct-ui';
import type { CoralHistory } from './coral/history';
import { worstSarg, type RiskInputs } from './coral/risks';
import { buildConditions } from './coral/conditions';
import { predictSeries } from './physics/tide';
import { mountLayersPanel } from './layers-panel';
import { FLOW_STYLE, mountFlow } from './layers/flow';
import type { FlowSource } from './layers/flow-sim';
import { mountFlowHud } from './flow-hud';
import { isWater, sample } from './physics/bathy';
import { bandFor, createTimeStore } from './time';
import { mountTimeSlider } from './time-slider';
import { KT_PER_MS, sampleField, fromDeg, type VectorField } from './physics/flow';
import { CORAL_REEFS, MOCK_FLOW, PLUME_RIVERS, REGION, SPOTS } from './region';
import { fetchWind, windAt, type WindData } from './adapters/wind';
import { appliedScale, fetchWindFix, scaleWind } from './adapters/wind-fix';
import { corrections } from './corrections';
import { tideFix } from './physics/tide-fix';
import { currentsAt, fetchCurrents, type CurrentsData } from './adapters/currents';
import { fetchWaves, wavesAt, type SeaState, type WavesData } from './adapters/waves';
import { chlAt, fetchSatellite, sstAt, type SatelliteData } from './adapters/satellite';
import { mountFronts, satelliteFronts } from './layers/fronts';
import { nearestFront, type FrontCell } from './physics/fronts';
import { OFFSHORE, offshoreScore } from './fishing/offshore';
import { sargassumSeeds } from './adapters/sargassum';
import { fetchMld, mldAt, type MldData } from './adapters/mld';
import { mountSst, type SstCoast } from './layers/sst';
import { coastTest, type CoastTest } from './layers/sea-image';
import { coralNow, fetchCoral, nearestReef, type CoralLoaded } from './adapters/coral';
import { runoffRisk } from './physics/outing';
import { clarityAt, mountClarity, mountClarityHud, riverRain, type ClarityContext } from './layers/clarity';
import { fetchCatchmentRain, type CatchmentRain } from './adapters/catchment-rain';
import { fetchRiverFlow, flowRatio, type RiverFlow } from './adapters/river-flow';
import { dataAge, describeAge } from './adapters/data-age';
import { createNet } from './net';
import { createPhysicsClient } from './physics/client';
import { nearest } from './geo';
import { mountVerdictHud } from './verdict-hud';
import type { VerdictInputs } from './verdict';
import { heavyRainSoon, STORM_ALERT_KM } from './weather';
import { seaState as seaComfort } from './physics/sea-state';
import { feedPartitions } from './sea-state-hud';
import { createSpotPhysics, type SpotPhysics } from './spot-physics';
import { mountRip, ripSites } from './layers/rip';
import { SURF_BREAKS } from './data/surf-breaks';
import { mountSurfZoneHud } from './surf-zone-hud';
import { mountDiveHud } from './dive-hud';
import { fetchGauge, type GaugeReading } from './adapters/gauge';
import { mountTideHud } from './tide-hud';
import { mountSpotPage } from './spot-page';
import { fetchSargassum, type SargassumData } from './adapters/sargassum';
import { BEACH_RADIUS_M, beachDay, mountSargassum, mountSargassumHud, sargassumForecast, type SargForecast } from './layers/sargassum';

registerSW({ immediate: true });

// Language first: every panel builds its text once, from the active dictionary.
const settings = createSettings(safeStorage(), navigator.languages ?? [navigator.language], window.matchMedia('(prefers-contrast: more)').matches);
setDict(dictFor(settings.lang()));
document.documentElement.lang = settings.lang();
const map = createMap('map', takeView(safeSession()));
mountPinchGuard(map);
const hud = document.getElementById('hud')!;
// Tiers first: the HUD reads the tier they publish on each move.
mountZoomTiers(map);
const time = createTimeStore();
// Past a week no model has skill: the OUTLOOK band shows climatology (the mock's mean pattern, hour 0).
const climatological = () => time.band() === 'outlook';
const windHour = () => (climatological() ? 0 : time.offsetH());
const hoursSinceEpoch = (ms: number) => ms / 3.6e6;
// Real wind (PLAN 2.3) once loaded: forecast grid, then monthly climatology for OUTLOOK. Mock until then, or if none is published.
let wind: WindData | null = null;
const windField = () => (wind && windAt(wind, time.band(), time.validMs())?.field) || mockWindField(windHour());
// Real surface currents (PLAN 2.5): SMOC regional grid with the 1/12° coastal nest, the forecast mean past day 9. Mock until loaded.
let currents: CurrentsData | null = null;
// Declared up here because HUD modules tick as soon as they mount, before the lines that load these feeds.
let riverFlow: RiverFlow | null = null;
const currentField = () => (currents && currentsAt(currents, time.band(), time.validMs())?.field) || mockCurrentField(hoursSinceEpoch(time.validMs()));
const flowSources: { wind: FlowSource; current: FlowSource } = {
  wind: { field: windField(), ...FLOW_STYLE.wind },
  current: { field: currentField(), ...FLOW_STYLE.current },
};
// The wind reading comes from the wind field at its reference point, so HUD and particles agree at every hour.
const windAtRef: [number, number] = [0, 0];
// Rip risk at the spot nearest the map centre, from the physics worker (PLAN 3.6, 4.2) once the seafloor loads.
let spotPhysics: SpotPhysics | null = null;
/** Gusts (weather feed, model mean) now and the wind three hours on, for the surf score (PLAN 7.23 B). */
const uvMean = (ws: readonly { uv: number }[]) => {
  const xs = ws.map((w) => w.uv).filter(Number.isFinite);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
};
const windExtras = (ms: number, pin: [number, number], name: string) => {
  const g = weatherData ? weatherAt(weatherData, ms).map((w) => w.gustKt).filter(Number.isFinite) : [];
  const f = wind ? windAt(wind, time.band(), ms + 3 * 3.6e6)?.field : null;
  const v: [number, number] = [0, 0];
  // The wind at this place, not one reading for the whole coast (audit F): now from the field on the map, and 3 h on.
  const here = sampleField(flowSources.wind.field, pin[0], pin[1], v) ? { speedMs: Math.hypot(...v), fromDeg: fromDeg(...v) } : null;
  const ahead = f && sampleField(f, pin[0], pin[1], v) ? { speedMs: Math.hypot(...v), fromDeg: fromDeg(...v) } : null;
  const near = Math.abs(ms - Date.now()) < 3.6e6 && nearestFlash(flashes, pin[0], pin[1], Date.now());
  const wx = weatherData ? biteWeather(weatherAt(weatherData, ms)) : {};
  return {
    // Gusts blended with the airport-scored weights, as the GUSTS row shows them (audit J).
    gustMs: g.length && weatherData ? blendedGustKt(weatherAt(weatherData, ms), weatherData.skill) / KT_PER_MS : null,
    wind: here,
    ahead,
    lightning: !!near && near.km <= STRIKE_ALERT_KM,
    squall: wx.squall,
    rainMmH: wx.rainMmH ?? null,
    sarg: sargForecast ? beachDay(sargForecast, name, ms)?.level ?? null : null,
    sstC: satellite ? (sstAt(satellite, pin[0], pin[1], ms)?.value ?? null) : null,
    uv: weatherData ? uvMean(weatherAt(weatherData, ms)) : null,
  };
};
const conditionsAt = () => {
  const c = baseConditions();
  const centre = map.getCenter();
  // Rip only from the real sea: on the mock swell it raised a false HIGH RIP alarm before the waves loaded.
  const st = spotPhysics?.byName(nearest([centre.lng, centre.lat], SPOTS)!.point.name);
  if (st?.result && st.liveSea) (c.ripRisk = st.result.rip.level), (c.ripKnown = true);
  return c;
};
const baseConditions = () => {
  const c = mockConditions(Date.now(), time.validMs(), climatological());
  // WIND follows the cross-hair like SWELL and SST (audit F); the reference point only when the centre is off the field.
  const wc = map.getCenter();
  if (sampleField(flowSources.wind.field, wc.lng, wc.lat, windAtRef) || sampleField(flowSources.wind.field, ...MOCK_FLOW.windRef, windAtRef)) {
    c.windKt = Math.hypot(...windAtRef) * KT_PER_MS;
    c.windDirDeg = fromDeg(...windAtRef);
  }
  // Swell (PLAN 2.2): the primary swell partition at the map centre, or offshore of Cahuita when the centre is inland.
  const sea = seaHere();
  if (sea) {
    c.seaLive = true;
    const swell = Number.isFinite(sea.swellHs);
    c.swellHeightM = swell ? sea.swellHs : sea.hs;
    c.swellPeriodS = swell ? sea.swellT : sea.tm;
    c.swellDirDeg = swell ? sea.swellDir : sea.dir;
  }
  // Sea temperature (PLAN 2.4): the newest satellite map at the map centre, or offshore of Cahuita when inland.
  const ctr = map.getCenter();
  const sst = satellite && (sstAt(satellite, ctr.lng, ctr.lat, time.validMs()) ?? sstAt(satellite, ...MOCK_FLOW.windRef, time.validMs()));
  if (sst) c.waterTempC = sst.value;
  return c;
};
// Satellite SST and ocean colour (PLAN 2.4): HUD sea temperature and the WATER TEMP isotherms.
let satellite: SatelliteData | null = null;
let sstLayer: ReturnType<typeof mountSst> | null = null;
let sstCoast: SstCoast | null = null;
/** Where the sea is (the coastline mask, then the 1′ depth grid), once the seafloor data loads: sea-only overlays cut at it. */
let seaCoast: CoastTest | null = null;
const seaFronts = () => (waterMask ? fronts.filter((c) => waterMask!(c.lng, c.lat)) : fronts);
const frontsLayer = mountFronts(map);
let fronts: FrontCell[] = [];
fetchSatellite()
  .then((d) => {
    if (!d.sst && !d.sstCoast) return console.warn('sst: nothing published; using mock');
    satellite = d;
    // Cut at the coastline if its mask is already here; otherwise the seafloor load re-cuts them.
    sstLayer = mountSst(map, d, sstCoast ?? undefined);
    // Fronts (PLAN 7.17): from the newest SST and chlorophyll maps.
    fronts = satelliteFronts(d);
    frontsLayer.setFronts(seaFronts());
    refreshClarity();
  })
  .catch((err) => console.warn('satellite unavailable', err));
// Mixed-layer depth (PLAN 7.18) for the offshore read; optional, the score renormalises without it.
let mld: MldData | null = null;
fetchMld().then((d) => (mld = d.series ? d : null)).catch((err) => console.warn('mld unavailable', err));
// Real waves once loaded (forecast to day 16, then climatology); the mock swell until then.
let waves: WavesData | null = null;
const seaStateAt = (lng: number, lat: number): SeaState | null => (waves ? wavesAt(waves, time.band(), time.validMs(), lng, lat) : null);
/** Sea state at the map centre, or offshore of Cahuita when the centre is inland. */
const seaHere = () => {
  const c = map.getCenter();
  return seaStateAt(c.lng, c.lat) ?? seaStateAt(...MOCK_FLOW.windRef);
};
// Wave crest lines (PLAN 6.9): rebuilt for the slider's valid time, when waves load and when the coastline mask arrives.
const wavesLayer = mountWavesLayer(map);
let waterMask: ((lng: number, lat: number) => boolean) | undefined;
const rebuildCrests = () => wavesLayer.setCrests(waves ? crestGrid(REGION.bounds, 0.04, seaStateAt, waterMask) : []);
fetchWaves()
  .then((d) => {
    if (!d.forecast && !d.climatology) return console.warn('waves: no forecast or climatology published; using mock');
    waves = d;
    rebuildCrests();
    queueSpotPhysics();
    refreshClarity();
  })
  .catch((err) => console.warn('waves unavailable', err));
// DATA AGE and connectivity for the HUD (PLAN 5.2).
const net = createNet();
let weatherHud: ReturnType<typeof mountWeatherHud> = null;
let lightningHud: ReturnType<typeof mountLightningHud> = null;
let rainNowHud: ReturnType<typeof mountRainNowHud> = null;
mountHud(hud, map, conditionsAt, { age: () => describeAge(dataAge.oldest(), Date.now()), online: net.online, alerts: () => [...(weatherHud?.alerts() ?? []), ...(rainNowHud?.alerts() ?? []), ...(lightningHud?.alerts() ?? [])] });
// CONDITIONS groups: core always shown, the rest opened by activity (SURF, FISH, DIVE, BOAT) or by hand.
const condGroups = mountCondGroups(hud, safeStorage());
mountSwellHud(hud, seaHere);
mountTimeSlider(hud, time);
// Tide chart (PLAN 4.1): the slider's day at Limón, with the live gauge (PLAN 2.11) drawn over it.
let gauge: GaugeReading[] = [];
const tideHud = mountTideHud(hud, time, () => gauge);
const loadGauge = () =>
  fetchGauge({ hours: 30 })
    // The gauge also corrects the predicted tide (PLAN 7.10): its last 24 h minus the prediction, fading over the days ahead.
    .then((d) => ((gauge = d.readings), corrections.setTide(tideFix(d.readings, Date.now())), tideHud?.refresh(), spotPage.refresh(), liveObs?.refresh()))
    .catch((err) => console.warn('tide gauge unavailable', err));
// The lock-on effect plays only for a picked target, never on scroll/pinch zoom.
const enhancer = createEnhancer(map, createLockFx(map, hud), settings.enhance);
// Phone: panels are drawers, closed until tapped; wide screens start with the LAYERS drawer open.
const sheets = createSheets(window.matchMedia(PHONE_QUERY).matches ? null : 'layers');
mountSeek(hud, (t) => enhancer.go(t), settings, sheets);
// Layer toggles and activity presets; other layers register into `layers` (src/layers/registry.ts).
bindMapLayers(map, layers);
// Say why a switched-on layer shows nothing (clarity review CL15 to CL17).
mountLayerNotes(hud, map, layers, () => (satellite ? baseConditions().waterTempC : null));
mountSettingsUi(hud, settings);
mountIntro(hud, safeStorage());
// Which moving lines are which, while two or more are on (clarity review CL5).
mountMotionKey(hud, layers, () => sheets.open('layers'));
mountSounds(document, settings.sound);
// CORAL overlay (PLAN 7.31): its own switch in LAYERS, apart from the activities; reef heat stress marks.
const coralMode = createCoralMode(layers, safeStorage());
mountLayersPanel(hud, layers, sheets, coralMode);
const coralLayer = mountCoral(map, CORAL_REEFS);
coralLayer.setVisible(coralMode.isOn());
coralMode.subscribe((on) => coralLayer.setVisible(on));
let coralHeat: CoralData | null = null;
let coralHistory: CoralHistory | null = null;
let coralHeatUi: { refresh(): void } | null = null;
fetchCoral()
  .then((d) => ((coralHeat = d), coralLayer.setHeat(d), coralHeatUi?.refresh()))
  .catch((err) => console.warn('coral heat stress unavailable', err));
mountLangUi(hud, settings, map);
mountSheets(hud, map, sheets);
// Surf break catalog (PLAN 6.4): markers and BREAK rows.
const surfBreaks = mountSurfBreaks(map);
const surfHud = mountSurfHud(hud, map, (name) => spotPhysics?.byName(name)?.surf);
// BOAT verdict inputs besides wind and sea (PLAN 7.23); filled in once weather, storms and lightning are declared below.
let boatSafety: () => VerdictSafety = () => ({});
// The current reading is wired below, once currentVecAt exists: the HUD ticks as soon as it mounts.
let seaCurrent: () => readonly [number, number] | null = () => null;
// Onshore / offshore at the reticle, from the land mask (filled in further down once it loads).
let windSideHere: () => WindSide | null = () => null;
mountSeaStateHud(hud, conditionsAt, seaHere, { vessel: settings.vessel, safety: () => boatSafety(), current: () => seaCurrent(), windSide: () => windSideHere() });
// Weather and active tropical storms (PLAN 7.3, 7.5): live feeds, rows stay -- until they load.
weatherHud = mountWeatherHud(hud, { validMs: () => time.validMs() });
time.subscribe(() => weatherHud?.refresh());
// RAIN BY TOWN (PLAN 7.24): the four towns from the sharpest models, next 3 h from the slider.
const townRainHud = mountTownRainHud(hud, { validMs: () => time.validMs() });
time.subscribe(() => townRainHud?.refresh());
fetchTownRain().then((d) => townRainHud?.set(d)).catch((err) => console.warn('town rain unavailable', err));
// RAIN CELLS (PLAN 7.24): satellite rain-cell nowcast per town and RAIN NOW on the map, refreshed every 5 minutes.
rainNowHud = mountRainNowHud(hud);
const rainLayer = mountRainLayer(map);
time.subscribe(() => rainLayer.setTime(time.validMs()));
const loadRainCells = () =>
  fetchRainCells()
    .then((d) => (d ? (rainNowHud?.set(d), rainLayer.set(d), rainLayer.setTime(time.validMs())) : rainNowHud?.setFailed()))
    .catch((err) => (console.warn('rain cells unavailable', err), rainNowHud?.setFailed()));
loadRainCells();
setInterval(loadRainCells, 5 * 60000);
const stormLayer = mountStorms(map);
// Lightning (PLAN 7.6): GOES GLM flashes from the collector workflow, refreshed every 5 minutes.
lightningHud = mountLightningHud(hud, map);
const lightningLayer = mountLightning(map);
let flashes: readonly Flash[] = [];
let flashesAt = 0;
const loadLightning = () =>
  fetchLightning()
    .then((d) => {
      if (!d) return lightningHud?.setFailed();
      flashes = d.flashes;
      flashesAt = d.fetchedAt;
      lightningLayer.setFlashes(d.flashes);
      lightningHud?.setFlashes(d.flashes, d.fetchedAt);
      diveHud?.refresh();
    })
    .catch((err) => (console.warn('lightning unavailable', err), lightningHud?.setFailed()));
loadLightning();
setInterval(loadLightning, 5 * 60000);
let weatherData: WeatherData | null = null;
const weatherLoad = fetchWeather();
weatherLoad.then((d) => ((weatherData = d), weatherHud?.setWeather(d), diveHud?.refresh())).catch((err) => console.warn('weather unavailable', err));
let stormList: readonly Storm[] = [];
boatSafety = () => {
  const c = map.getCenter();
  const w = weatherData ? summarise(weatherData, time.validMs()) : null;
  const near = nearestFlash(flashes, c.lng, c.lat, Date.now());
  return {
    gustKt: w && Number.isFinite(w.gustKt) ? w.gustKt : undefined,
    squall: w ? squallLevel(w) : undefined,
    lightning: !!near && near.km <= STRIKE_ALERT_KM,
    stormKm: nearestStorm(stormList)?.km ?? null,
    rainMmH: w && Number.isFinite(w.rainMmH) ? w.rainMmH : undefined,
    debris: riverFlow ? debrisAt(riverFlow, c.lng, c.lat, time.validMs())?.level : undefined,
  };
};
fetchStorms().then((d) => ((stormList = d.storms), stormLayer.setStorms(d.storms), weatherHud?.setStorms(d.storms))).catch((err) => console.warn('storms unavailable', err));
mountAstroHud(hud, map, time);
mountHarbours(map);
let landGrid: Grid | null = null;
windSideHere = () => {
  if (!landGrid) return null;
  const c = map.getCenter();
  const land = landGrid;
  return windSide((deg) => windFetchM(land, c.lng, c.lat, deg, 10_000, 250), conditionsAt().windDirDeg);
};
const harboursHud = mountHarboursHud(hud, map, { windFromDeg: () => conditionsAt().windDirDeg, land: () => landGrid });
// Boat mode: GPS track and pin log, kept on the device. Depth at a pin comes from the seafloor grid once it loads.
let depthAt: ((lng: number, lat: number) => number | undefined) | null = null;
// Spot pages (PLAN 4.1): tide, sky and the spot's physics on one sheet; its tab sits before BOAT.
const spotPage = mountSpotPage(hud, map, {
  time, sheets, physics: () => spotPhysics, observed: () => gauge, go: (t) => enhancer.go(t),
  // Read at render time: metricEnv and the feeds are defined further down this file.
  metricEnv: () => metricEnv(),
  stripEnv: () => ({
    sea: (lng, lat, ms) => (waves ? wavesAt(waves, bandAt(ms), ms, lng, lat) : null),
    wind: (lng, lat, ms) => {
      const v = windVecAt(lng, lat, ms);
      return v ? { ms: Math.hypot(...v), fromDeg: fromDeg(...v) } : null;
    },
    tide: LIMON_HARMONICS,
  }),
});
loadGauge();
setInterval(loadGauge, 10 * 60_000);
const boatStore = createBoatStore(safeStorage());
// Catches logged in the BOAT drawer store their BITE once the fishing panel is up (PLAN 7.16).
let scoreCatch: CatchScorer | null = null;
// Offshore read for the BOAT drawer (PLAN 7.17): depth and ledge from the seafloor grids, satellite
// temperature, chlorophyll and fronts, and floating sargassum, scored per boat species.
let offshoreDepth: ((lng: number, lat: number) => number | null) | null = null;
const offshoreRead: OffshoreRead = (lng, lat) => {
  const dAt = offshoreDepth;
  const depthM = dAt?.(lng, lat) ?? null;
  if (depthM === null) return null;
  const e = 0.01, kmE = e * 111.32;
  const around = [dAt!(lng + e, lat), dAt!(lng - e, lat), dAt!(lng, lat + e), dAt!(lng, lat - e)].filter((x): x is number => x !== null);
  const slopeMPerKm = around.length ? Math.max(...around.map((x) => Math.abs(x - depthM))) / kmE : null;
  const ms = Date.now();
  const front = nearestFront(fronts, lng, lat);
  const weed = nearest([lng, lat], sargassumSeeds(sargassum?.series ?? null, ms).map((s) => ({ lngLat: [s.lng, s.lat] as [number, number] })));
  const inputs = {
    depthM, slopeMPerKm,
    sstC: satellite ? (sstAt(satellite, lng, lat, ms)?.value ?? null) : null,
    chl: satellite ? (chlAt(satellite, lng, lat, ms)?.value ?? null) : null,
    frontKm: front?.km ?? null,
    weedKm: weed ? weed.distanceM / 1000 : null,
    mldM: mldAt(mld, lng, lat, ms),
  };
  const scores = OFFSHORE.map((s) => ({ id: s.id, score: offshoreScore(s, inputs) ?? 0 })).sort((a, b) => b.score - a.score);
  return { front: front && { km: front.km, bearingDeg: front.bearingDeg, kind: front.front.kind }, mldM: inputs.mldM, scores };
};
let routeDeps: () => RouteDeps | null = () => null;
let reefLookup: ReefAt | null = null;
const shoalRead: ShoalRead = (lng, lat) => (depthAt ? shoalAlert((x, y) => depthAt?.(x, y), reefLookup, lng, lat, settings.vessel()) : null);
mountBoatPanel(hud, map, boatStore, sheets, () => depthAt, () => scoreCatch, () => (offshoreDepth ? offshoreRead : null), () => shoalRead, () => routeDeps());
const coralStore = createCoralStore(safeStorage());
// Reef stresses at a CRW reef: the CORAL drawer's risk rows and the conditions frozen with each logged visit (PLAN 7.36).
const reefRisks = (id: string): Omit<RiskInputs, 'alert'> => {
  const reef = CORAL_REEFS.find((r) => r.id === id);
  if (!reef) return { flowRatio: null, rainMm: null, sargassum: null, hsM: null, lowTideM: null };
  const now = Date.now();
  const beach = nearest(reef.lngLat, SPOTS)?.point.name;
  const lows = predictSeries(LIMON_HARMONICS, now, now + 24 * 3.6e6, 10 * 60e3).h;
  return {
    flowRatio: riverFlow ? flowRatio(riverFlow, reef.river, now) : null,
    rainMm: catchmentRain ? (riverRain(catchmentRain, now, undefined, riverFlow).find((r) => r.name === reef.river)?.rainMm ?? null) : null,
    sargassum: sargForecast && beach ? worstSarg([0, 1, 2].map((k) => beachDay(sargForecast!, beach, now + k * 864e5)?.level ?? null)) : null,
    hsM: waves ? (wavesAt(waves, time.band(), now, ...reef.lngLat)?.hs ?? null) : null,
    lowTideM: lows.length ? Math.min(...lows) : null,
  };
};
const coralConditions = (lng: number, lat: number) => {
  const reef = coralHeat ? nearestReef(coralHeat, [lng, lat]) : null;
  return buildConditions(Date.now(), coralHeat && reef ? coralNow(coralHeat, reef) : null, reef ? reefRisks(reef.id) : null);
};
mountCoralPanel(hud, map, coralStore, sheets, () => depthAt, coralConditions);
mountCoralLogLayer(map, coralStore);
// Reef heat, history since 1985 and today's stresses at the top of the CORAL drawer (PLAN 7.32), for the reef nearest the map centre.
fetch(`${import.meta.env.BASE_URL}data/climatology/coral-history.json`)
  .then((r) => (r.ok ? (r.json() as Promise<CoralHistory>) : null))
  .then((h) => ((coralHistory = h), coralHeatUi?.refresh()))
  .catch((err) => console.warn('coral history unavailable', err));
const coralPanelEl = document.getElementById('coral-panel');
if (coralPanelEl) {
  coralHeatUi = mountCoralHeat(coralPanelEl, {
    heat: () => coralHeat,
    history: () => coralHistory,
    reef: () => {
      const c = map.getCenter();
      return coralHeat ? nearestReef(coralHeat, [c.lng, c.lat]) : null;
    },
    risks: reefRisks,
  });
  // Spawning calendar (PLAN 7.33), worked out on the device; redone once a day.
  const spawnUi = mountCoralSpawning(coralPanelEl);
  // Species guide and disease cards (PLAN 7.34), folded.
  mountCoralGuide(coralPanelEl);
  mountCoralConduct(coralPanelEl);
  map.on('moveend', () => coralHeatUi?.refresh());
  sheets.subscribe(() => sheets.is('coral') && (coralHeatUi?.refresh(), spawnUi.refresh()));
}
// WATCH (PLAN 7.13): the metric tracker reads the same wind, wave, weather and tide data as the HUD, at any hour of the next days.
const watchSea = new globalThis.Map<string, [number, number] | null>();
const hourWind = new globalThis.Map<number, ReturnType<typeof windAt>>();
let hourWindFor: WindData | null = null;
/** Forecast wind speed, m/s, at any place and hour (one wind frame per hour, cached); shared by WATCH and fishing. */
const windVecAt = (lng: number, lat: number, ms: number): [number, number] | null => {
  if (!wind) return null;
  if (hourWindFor !== wind) (hourWind.clear(), (hourWindFor = wind));
  const h = Math.floor(ms / 3.6e6);
  if (!hourWind.has(h)) hourWind.set(h, windAt(wind, bandAt(ms), ms));
  const f = hourWind.get(h);
  const out: [number, number] = [0, 0];
  return f && sampleField(f.field, lng, lat, out) ? out : null;
};
const windMsAt = (lng: number, lat: number, ms: number): number | null => {
  const v = windVecAt(lng, lat, ms);
  return v ? Math.hypot(...v) : null;
};
const hourCurr = new globalThis.Map<number, VectorField | null>();
let hourCurrFor: CurrentsData | null = null;
/** Forecast surface current vector, m/s, at any place and hour (one field per hour, cached). */
const currentVecAt = (lng: number, lat: number, ms: number): [number, number] | null => {
  if (!currents) return null;
  if (hourCurrFor !== currents) (hourCurr.clear(), (hourCurrFor = currents));
  const h = Math.floor(ms / 3.6e6);
  if (!hourCurr.has(h)) hourCurr.set(h, currentsAt(currents, bandAt(ms), ms)?.field ?? null);
  const f = hourCurr.get(h);
  const out: [number, number] = [0, 0];
  return f && sampleField(f, lng, lat, out) ? out : null;
};
/** The nearest water point within ~1.8 km of a shore pin (cached per spot): clarity and sea temperature are sea values. */
const watchWater = (lng: number, lat: number, c: ClarityContext): [number, number] | null => {
  const key = `${lng},${lat}`;
  let at = watchSea.get(key);
  if (at === undefined) {
    at = null;
    search: for (const r of [0.004, 0.008, 0.016])
      for (let k = 0; k < 8; k++) {
        const p: [number, number] = [lng + r * Math.cos((k * Math.PI) / 4), lat + r * Math.sin((k * Math.PI) / 4)];
        if (clarityAt(c, p[0], p[1])) {
          at = p;
          break search;
        }
      }
    watchSea.set(key, at);
  }
  return at;
};
routeDeps = () => ({ env: metricEnv(), vessel: settings.vessel(), validMs: time.validMs() });
seaCurrent = () => {
  const c = map.getCenter();
  return currentVecAt(c.lng, c.lat, time.validMs());
};
const metricEnv = (): MetricEnv => ({
  windMs: windMsAt,
  windDirDeg: (lng, lat, ms) => {
    const v = windVecAt(lng, lat, ms);
    return v ? fromDeg(...v) : null;
  },
  currentVec: currentVecAt,
  currentMs: (lng, lat, ms) => {
    const v = currentVecAt(lng, lat, ms);
    return v ? Math.hypot(...v) : null;
  },
  sea: (lng, lat, ms) => (waves ? wavesAt(waves, bandAt(ms), ms, lng, lat) : null),
  weather: (ms) => (weatherData ? weatherAt(weatherData, ms) : []),
  weatherSkill: () => weatherData?.skill,
  // Clarity is a sea value and the spot pins sit on the shore: read it at the nearest water within ~1.8 km (cached per spot).
  clarityM: (lng, lat, ms) => {
    const c = clarityCtx();
    const at = c && watchWater(lng, lat, c);
    return at ? clarityAt({ ...c, ms }, at[0], at[1])?.visM ?? null : null;
  },
  sstC: (lng, lat, ms) => {
    const c = clarityCtx();
    const at = c && satellite && watchWater(lng, lat, c);
    return at && satellite ? sstAt(satellite, at[0], at[1], ms)?.value ?? null : null;
  },
  sargassumKm2: (spot, ms) => (sargForecast ? beachDay(sargForecast, spot, ms)?.km2 ?? null : null),
  tide: LIMON_HARMONICS,
  tzOffsetH: REGION.tzOffsetH,
});
mountWatchPanel(hud, map, sheets, safeStorage(), metricEnv, () => condGroups.activity());
// SYSTEM CHECK: its tab joins the settings controls on a phone.
mountSystemCheck(hud, sheets, { checks: () => allChecks(), net, storage: safeStorage() });
// LIVE OBS (PLAN 2.13): the newest real reading from the gauge, the airport and the satellite passes, with ages.
let metarObs: MetarObs[] = [];
let passes: PassData | null = null;
const liveObs = mountLiveObs(hud, map, sheets, () => ({ gauge, metar: metarObs, passes, fixes: { tide: corrections.tide(), wind: corrections.wind() } }));
const metarLoad = fetchMetar();
metarLoad.then((d) => ((metarObs = d.obs), liveObs.refresh())).catch((err) => console.warn('metar unavailable', err));
// Ensemble blend (PLAN 7.4): score the weather models against the airport, then re-show the weather blended by that skill.
Promise.all([weatherLoad, metarLoad, fetchHindcast()])
  .then(([w, m, h]) => ((weatherData = { ...w, skill: scoreWeather(h, m.obs, Date.now()) }), weatherHud?.setWeather(weatherData), diveHud?.refresh()))
  .catch((err) => console.warn('weather scoring unavailable, equal model weights', err));
fetchPasses()
  .then((d) => {
    passes = d;
    liveObs.refresh();
    // Fit the wind map's speed to the satellite passes (PLAN 7.10), then reshow the wind scaled.
    return fetchWindFix(d.scat).then((f) => (corrections.setWind(f), applyWind(), liveObs.refresh()));
  })
  .catch((err) => console.warn('satellite passes or wind correction unavailable', err));
// Last, so SET is the last tab and the settings controls (ENHANCE, SUN, language) are all mounted to be moved into it.
mountSettingsPanel(hud, sheets);
// Phone glance strip (the few values that matter per activity) and tap-a-label explainers.
// The strip and the CONDITIONS panel share the activity: cycling one moves the other, and a LAYERS preset moves both.
const glance = mountGlance(hud, safeStorage(), (m) => condGroups.setActivity(m));
condGroups.subscribe((a) => a !== 'all' && glance?.setMode(a));
// BEST TIME TODAY for the current activity (the CONDITIONS picker's, or the glance strip's while that is ALL).
const bestToday = mountBestToday(hud, map, time, metricEnv, () => {
  const a = condGroups.activity();
  return a === 'all' ? (glance?.mode() ?? 'surf') : a;
});
condGroups.subscribe(() => bestToday.refresh());
let lastPreset = layers.activity();
layers.subscribe(() => {
  const p = layers.activity();
  if (p === lastPreset) return;
  lastPreset = p;
  const a = activityForPreset(p);
  if (a) condGroups.setActivity(a);
});
const explain = mountExplain(hud);

const flow = mountFlow(map, flowSources);
if (flow) {
  layers.register('wind', { setVisible: (on) => flow.setVisible('wind', on) });
  layers.register('currents', { setVisible: (on) => flow.setVisible('current', on) });
}
const flowHud = mountFlowHud(hud, map, () => flowSources.current);

// Water clarity (PLAN 6.1, 7.2): satellite optics carried forward from the newest map, plus river plumes after
// catchment rain, drifting with the current, and waves stirring the bottom, from the forecast at the slider's hour
// (or the hour asked for: the VIS DAYS row). Needs the depth grid, so it starts once that loads.
let catchmentRain: CatchmentRain | null = null;
let clarityElevation: Grid | null = null;
let clarityLand: Grid | null = null;
const clarityLayer = mountClarity(map);
const bandAt = (ms: number) => bandFor((ms - time.baseMs()) / 3.6e6).id;
const currentOut: [number, number] = [0, 0];
let coral: CoralLoaded | null = null;
fetchCoral()
  .then((d) => ((coral = d), diveHud?.refresh()))
  .catch((err) => console.warn('coral heat stress unavailable', err));
const clarityCtx = (): ClarityContext | null =>
  clarityElevation && {
    satellite, rain: catchmentRain, flow: riverFlow, elevation: clarityElevation, land: clarityLand, ms: time.validMs(),
    currentAt: (lng, lat, ms) => {
      const f = currents && currentsAt(currents, bandAt(ms), ms)?.field;
      return f && sampleField(f, lng, lat, currentOut) ? [currentOut[0], currentOut[1]] : null;
    },
    seaAt: (lng, lat, ms) => {
      const s = ms === undefined ? seaStateAt(lng, lat) : waves && wavesAt(waves, bandAt(ms), ms, lng, lat);
      if (!s) return null;
      const swell = Number.isFinite(s.swellHs) && Number.isFinite(s.swellT);
      return { hs: s.hs, tp: swell ? s.swellT : s.tm };
    },
  };
const clarityHud = mountClarityHud(hud, map, clarityCtx);
let diveHud: NonNullable<ReturnType<typeof mountDiveHud>> | null = null;
const diveWind: [number, number] = [0, 0];
const refreshClarity = () => {
  const c = clarityCtx();
  if (c) clarityLayer.update(c);
  clarityHud?.refresh();
  diveHud?.refresh();
};
time.subscribe(refreshClarity);
// River flow at the mouths (PLAN 7.15): GloFAS discharge against its median, for fishing near the mouths.
fetchRiverFlow()
  .then((d) => ((riverFlow = d), refreshClarity()))
  .catch((err) => console.warn('river flow unavailable', err));
// BOAT daylight, pressure, next GO window and flood debris (PLAN 7.23 items 4, 5).
mountBoatWindowHud(hud, map, { env: metricEnv, vessel: settings.vessel, validMs: () => time.validMs(), riverFlow: () => riverFlow });
fetchCatchmentRain()
  .then((d) => ((catchmentRain = d), refreshClarity()))
  .catch((err) => console.warn('catchment rain unavailable', err));

// Sargassum (PLAN 7.1): the newest satellite sightings drifted with the current and 1–3% of the wind into a
// 5-day landing outlook per beach. Needs the detections, the current forecast and the coastline; rerun as each loads.
let sargassum: SargassumData | null = null;
let sargForecast: SargForecast | null = null;
const sargLayer = mountSargassum(map, () => seaCoast);
const sargHud = mountSargassumHud(hud, map, () => ({ f: sargForecast, ms: time.validMs() }));
const showSargassum = () => {
  if (sargForecast) sargLayer.update(sargForecast, time.validMs());
  sargHud?.refresh();
};
const runSargassum = () => {
  if (!sargassum?.series || !currents?.forecast || !waterMask) return;
  sargForecast = sargassumForecast({ data: sargassum, currents, wind, isWater: waterMask, now: Date.now() });
  showSargassum();
  diveHud?.refresh();
};
time.subscribe(showSargassum);
fetchSargassum()
  .then((d) => ((sargassum = d), runSargassum()))
  .catch((err) => console.warn('sargassum unavailable', err));

// New forecast hour: rebuild both fields. Scrubbing fires many times a frame, so do it once per frame.
let fieldsQueued = false;
time.subscribe(() => {
  if (fieldsQueued) return;
  fieldsQueued = true;
  requestAnimationFrame(() => {
    fieldsQueued = false;
    flowSources.wind = { ...flowSources.wind, field: windField() };
    flowSources.current = { ...flowSources.current, field: currentField() };
    flow?.setSource('wind', flowSources.wind);
    flow?.setSource('current', flowSources.current);
    flowHud?.refresh();
    rebuildCrests();
  });
});

// Wind: load at start, and again when the network returns or the app comes back to the front after a while,
// so a phone that was offline picks up fresh data without a reload. Offline, the cached copy loads; with nothing
// cached the mock field stays (DATA AGE then reads SIM).
let windLoading = false;
// The wind as published, and as shown: scaled by the satellite correction (PLAN 7.10) once it is fitted.
let rawWind: WindData | null = null;
const applyWind = () => {
  if (!rawWind) return;
  wind = scaleWind(rawWind, appliedScale(corrections.wind()));
  runSargassum();
  flowSources.wind = { ...flowSources.wind, field: windField() };
  flow?.setSource('wind', flowSources.wind);
  flowHud?.refresh();
  diveHud?.refresh();
};
const loadWind = () => {
  if (windLoading) return;
  windLoading = true;
  fetchCurrents()
  .then((d) => {
    if (!d.forecast) return console.warn('currents: no forecast published; using mock');
    currents = d;
    runSargassum();
    diveHud?.refresh();
    flowSources.current = { ...flowSources.current, field: currentField() };
    flow?.setSource('current', flowSources.current);
    flowHud?.refresh();
  })
  .catch((err) => console.warn('currents unavailable', err));

fetchWind()
    .then((d) => {
      if (!d.forecast && !d.climatology) return console.warn('wind: no forecast or climatology published; using mock');
      rawWind = d;
      applyWind();
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
// SYNC FOR TRIP (PLAN 5.1): the region's map, forecasts and live feeds stored for use with no signal; reload what is shown after.
mountSyncUi(hud, {
  net, storage: safeStorage(), styleUrl: STYLE_URL, base: import.meta.env.BASE_URL, jobs: () => tripJobs(),
  onDone: () => (loadWind(), loadGauge(), loadLightning()),
});
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
// Fixed rip sites: river mouths and the breaks whose guides list rips. Tap a site or the shaded shore to read what it means.
fetchMouths()
  .then(({ data }) => ripLayer.setSites(ripSites(data, SURF_BREAKS)))
  .catch((err) => console.warn('rip sites unavailable', err));
// Tap a lightning flash, storm, observation or wave crest for what it is (registered first so the rip and sargassum cards below win where marks overlap).
mountMapExplain(map, (title, id, at) => explain.show(title, id, at));
// Bare map: a "what's here" card with the sea, wind, depth and visibility at the tap, for the slider's hour.
mountHere(map, (lng, lat) => {
  const ms = time.validMs();
  const s = seaStateAt(lng, lat);
  const wf = wind && windAt(wind, bandAt(ms), ms)?.field;
  const w = wf && sampleField(wf, lng, lat, diveWind) ? { ms: Math.hypot(...diveWind), fromDeg: fromDeg(...diveWind) } : null;
  const depth = depthAt?.(lng, lat);
  const c = clarityCtx();
  return {
    land: depth === undefined && !!waterMask && !waterMask(lng, lat),
    depthM: depth,
    swell: s && Number.isFinite(s.swellHs) ? { hs: s.swellHs, tp: s.swellT, fromDeg: s.swellDir } : null,
    sea: s ? { hs: s.hs, tm: s.tm } : null,
    wind: w,
    visM: c ? (clarityAt(c, lng, lat)?.visM ?? null) : null,
  };
}, (title, rows, at) => explain.showRows(title, rows, at));
map.on('click', 'rp-site', (e) => {
  const f = e.features?.[0]?.properties;
  if (f) explain.show(`${f.name}`, f.site === 'mouth' ? 'ripMouth' : 'ripBreak', e.point);
});
map.on('click', 'sg-mat', (e) => explain.show(t('sarg.short'), 'sargMat', e.point));
map.on('click', 'sg-beach', (e) => explain.show(t('sarg.short'), 'sargBeach', e.point));
map.on('click', 'rp-coast', (e) => {
  // A site ring sits on the shaded shore: the ring's own explainer wins.
  if (!map.queryRenderedFeatures(e.point, { layers: ['rp-site'] }).length) explain.show(t('layer.rip'), 'ripCoast', e.point);
});
/**
 * Offshore sea state for the physics at a shoreline pin. The ray model breaks the leading train (the swell, else
 * the wind sea) on its own period and direction; the other trains go in `others` and are broken on their own
 * periods, then added by energy (audit G). The models give mean, not peak, periods. Without partitions the total
 * sea goes in alone.
 */
const spotSea = (pin: [number, number]) => {
  const w = seaStateAt(...pin);
  if (!w || !Number.isFinite(w.tm)) return null;
  const part = (hs: number, T: number, dir: number) => (Number.isFinite(hs) && Number.isFinite(T) && Number.isFinite(dir) && hs >= 0.1 ? { Hs: hs, Tp: T, fromDeg: dir } : null);
  const swell = part(w.swellHs, w.swellT, w.swellDir);
  const swell2 = part(w.swell2Hs, w.swell2T, w.swell2Dir);
  const windSea = part(w.windSeaHs, w.windSeaT, w.windSeaDir);
  const swellLeads = !!swell && swell.Hs >= (windSea?.Hs ?? 0);
  const main = swellLeads ? swell : windSea ?? { Hs: w.hs, Tp: w.tm, fromDeg: w.dir };
  const others = [swellLeads ? null : swell, swell2, swellLeads ? windSea : null].filter((x): x is NonNullable<typeof x> => !!x);
  return {
    ...main,
    total: w.hs,
    others,
    swellHs: swellLeads ? w.swellHs : w.hs,
    swell2,
    windSeaHs: Number.isFinite(w.windSeaHs) ? w.windSeaHs : null,
  };
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
    clarityElevation = data.region;
    clarityLand = data.land;
    refreshClarity();
    spotPhysics = createSpotPhysics(createPhysicsClient({ region: data.region, macro: data.macro, land: data.land }), baseConditions, () => time.validMs(), windExtras, spotSea);
    spotPhysics.subscribe(() => queueVerdict());
    spotPhysics.subscribe(() => {
      ripLayer.update(spotPhysics!.all(), data.land);
      surfBreaks.update((name) => spotPhysics!.byName(name)?.surf);
      surfHud.refresh();
      spotPage.refresh();
    });
    mountSurfZoneHud(hud, map, spotPhysics);
    diveHud = mountDiveHud(hud, map, spotPhysics, time, {
      seaAt: (lng, lat, ms) => {
        const s = waves && wavesAt(waves, bandAt(ms), ms, lng, lat);
        if (!s) return null;
        const swell = Number.isFinite(s.swellHs) && Number.isFinite(s.swellT);
        return { hs: s.hs, tp: swell ? s.swellT : s.tm };
      },
      windAt: (lng, lat, ms) => {
        const f = wind && windAt(wind, bandAt(ms), ms)?.field;
        return f && sampleField(f, lng, lat, diveWind) ? { ms: Math.hypot(...diveWind), fromDeg: fromDeg(...diveWind) } : null;
      },
      // Sea temperature and the sargassum outlook at the nearest beach (same reads as fishing).
      waterAt: (lng, lat, ms) => {
        const beach = sargForecast ? nearest([lng, lat], SPOTS) : null;
        return {
          sstC: satellite ? (sstAt(satellite, lng, lat, ms)?.value ?? null) : null,
          sarg: sargForecast && beach && beach.distanceM <= BEACH_RADIUS_M ? (beachDay(sargForecast, beach.point.name, ms)?.level ?? null) : null,
        };
      },
      // Runoff near a river mouth after heavy rain or a high river: a rule of thumb for water quality, not a measurement.
      runoffAt: (lng, lat, ms) => {
        const m = nearest([lng, lat], PLUME_RIVERS.map((r) => ({ name: r.name, lngLat: r.mouth })));
        if (!m) return null;
        const ratio = riverFlow ? flowRatio(riverFlow, m.point.name, ms) : null;
        const rainMm = catchmentRain ? (riverRain(catchmentRain, ms).find((r) => r.name === m.point.name)?.rainMm ?? null) : null;
        return runoffRisk(m.distanceM / 1000, ratio, rainMm);
      },
      // Coral heat stress (NOAA Coral Reef Watch, newest day) at the nearest reef.
      coralAt: (lng, lat) => {
        const reef = coral && nearestReef(coral, [lng, lat]);
        const now = coral && reef && coralNow(coral, reef);
        return now ? { name: now.reef.name.toUpperCase(), dhw: now.dhw, alert: now.alert, day: now.dhwDay } : null;
      },
      currentAt: (lng, lat, ms) => {
        const f = currents && currentsAt(currents, bandAt(ms), ms)?.field;
        if (!f || !sampleField(f, lng, lat, currentOut)) return null;
        return { ms: Math.hypot(currentOut[0], currentOut[1]), toDeg: (fromDeg(currentOut[0], currentOut[1]) + 180) % 360 };
      },
      visAt: (lng, lat, ms) => {
        const c = clarityCtx();
        return c ? (clarityAt({ ...c, ms }, lng, lat)?.visM ?? null) : null;
      },
      // Rain, squall and live lightning for the hour, the same cap fishing uses (physics/safety.ts).
      wxAt: (lng, lat, ms) => {
        const near = Math.abs(ms - Date.now()) < 3.6e6 && nearestFlash(flashes, lng, lat, Date.now());
        const now = weatherData ? weatherAt(weatherData, ms) : [];
        const w = biteWeather(now, weatherData?.skill);
        const uvs = now.map((x) => x.uv).filter((x) => Number.isFinite(x));
        return { rainMmH: w.rainMmH, cloudPct: w.cloudPct, uv: uvs.length ? uvs.reduce((a, b) => a + b, 0) / uvs.length : undefined, squall: w.squall, lightning: !!near && near.km <= STRIKE_ALERT_KM };
      },
      depthAt: (lng, lat) => depthAt?.(lng, lat),
    }) ?? null;
    spotPhysics.update();
    reefLookup = makeReefLookup(data.reefs, REEFISH);
    depthAt = (lng, lat) => {
      const z = sample(data.region, lng, lat);
      return Number.isFinite(z) && z < 0 ? -z : undefined;
    };
    // Offshore depth: the fine region grid, then the macro grid beyond it.
    offshoreDepth = (lng, lat) => {
      const r = sample(data.region, lng, lat);
      const z = Number.isFinite(r) ? r : sample(data.macro, lng, lat);
      return Number.isFinite(z) && z < 0 ? -z : null;
    };
    // Shore and kayak habitat score: built from the depth grid, reefs and river mouths.
    Promise.all([fetchMouths(), fetchOccurrences()])
      .then(([{ data: mouths }, occurrences]) => {
        const species = loadSpecies();
        const month = new Date(time.validMs()).getUTCMonth();
        const layer = mountFishing(map, { region: data.region, land: data.land, reefs: data.reefs, mouths, bounds: [REGION.bounds[0][0], REGION.bounds[0][1], REGION.bounds[1][0], REGION.bounds[1][1]] }, { species, month }, occurrences);
        // The nearest big river mouth and its GloFAS flow against the median (PLAN 7.15).
        const riverAt = (lng: number, lat: number, ms: number) => {
          if (!riverFlow) return null;
          const m = nearest([lng, lat], PLUME_RIVERS.map((r) => ({ name: r.name, lngLat: r.mouth })));
          const ratio = m && flowRatio(riverFlow, m.point.name, ms);
          return m && ratio !== null ? { km: m.distanceM / 1000, ratio } : null;
        };
        // Live gauge minus the predicted tide, for the hours around now, from a reading under an hour old.
        const surgeNear = (ms: number) => {
          const g = gauge.at(-1);
          return g && Math.abs(ms - Date.now()) < 3 * 3.6e6 && Date.now() - g.t < 3.6e6 ? g.levelM - g.tideM : null;
        };
        // BITE reads the hourly forecast (wind, waves, rain, cloud, squalls) at any hour of the day, and live lightning for the hour around now.
        const fishEnv = {
          at: (lng: number, lat: number, ms: number) => {
            const near = Math.abs(ms - Date.now()) < 3.6e6 && nearestFlash(flashes, lng, lat, Date.now());
            return {
              windMs: windMsAt(lng, lat, ms),
              hsM: (waves && wavesAt(waves, bandAt(ms), ms, lng, lat)?.hs) ?? null,
              ...(weatherData ? biteWeather(weatherAt(weatherData, ms), weatherData.skill) : {}),
              lightning: !!near && near.km <= STRIKE_ALERT_KM,
              pressureTrend: weatherData ? pressureTrend(weatherData, ms) : null,
              surgeM: surgeNear(ms),
            };
          },
          // The water for the species: clarity forecast, satellite temperature and chlorophyll, and the sargassum outlook at the nearest beach.
          water: (lng: number, lat: number, ms: number) => {
            const c = clarityCtx();
            const beach = sargForecast ? nearest([lng, lat], SPOTS) : null;
            return {
              // Clarity without the river-flow plume: fishing counts the river's flow once, in its own `river` term below (physics/clarity flowPlumeMm).
              visM: c ? (clarityAt({ ...c, ms, flow: null }, lng, lat)?.visM ?? null) : null,
              sstC: satellite ? (sstAt(satellite, lng, lat, ms)?.value ?? null) : null,
              chl: satellite ? (chlAt(satellite, lng, lat, ms)?.value ?? null) : null,
              river: riverAt(lng, lat, ms),
              sarg: sargForecast && beach && beach.distanceM <= BEACH_RADIUS_M ? (beachDay(sargForecast, beach.point.name, ms)?.level ?? null) : null,
            };
          },
          version: () => `${wind ? 1 : 0}${waves ? 1 : 0}${weatherData ? 1 : 0}${satellite ? 1 : 0}${catchmentRain ? 1 : 0}${sargForecast ? 1 : 0}${riverFlow ? 1 : 0}|${flashesAt}|${gauge.at(-1)?.t ?? 0}`,
        };
        // Your logged catches join the habitat fit and the YOUR CATCHES check (PLAN 7.16).
        const pins = () => boatStore.state().pins;
        layer.setCatches(pins());
        const fishHud = mountFishingHud(hud, map, layer, time, species, fishEnv, pins);
        scoreCatch = fishHud?.scoreCatch ?? null;
        boatStore.subscribe(() => (layer.setCatches(pins()), fishHud?.refresh()));
      })
      .catch((err) => console.warn('fishing layer unavailable', err));
    // Currents, wave crests and isotherms stay in the sea once the coastline mask is here.
    waterMask = (lng, lat) => isWater(data.land, data.macro, lng, lat);
    runSargassum();
    rebuildCrests();
    seaCoast = coastTest(data.land, data.macro);
    sstCoast = { water: waterMask, coast: seaCoast };
    sstLayer?.setCoast(sstCoast);
    frontsLayer.setFronts(seaFronts());
    const current = { ...flowSources.current, water: waterMask };
    flowSources.current = current;
    flow?.setSource('current', current);
    flowHud?.refresh();
    coralLayer.setReefPolygons([data.marks, data.reefs]);
    return mountSeafloor(map, data);
  })
  .catch((err) => console.warn('seafloor layer unavailable', err));

// GO / NO-GO per activity (PLAN 7.8): the inputs at the cross-hair for the slider's hour, judged in verdict.ts.
// Where a panel already judges something (the dive score, the BITE number, the boat verdict) it is read, not redone.
const verdictInputs = (): VerdictInputs => {
  const c = map.getCenter();
  const ms = time.validMs();
  const now = Date.now();
  const cond = conditionsAt();
  const parts = feedPartitions(seaHere());
  const brk = spotPhysics?.byName(nearest([c.lng, c.lat], SURF_BREAKS)!.point.name);
  const wx = weatherData ? biteWeather(weatherAt(weatherData, ms)) : null;
  const storm = nearestStorm(stormList);
  const flash = flashes.length ? nearestFlash(flashes, c.lng, c.lat, now) : null;
  const biteNum = parseInt(hud.querySelector('#fish-bite')?.textContent ?? '', 10);
  return {
    lightningKm: flash && flash.km <= STRIKE_ALERT_KM ? flash.km : null,
    squall: wx?.squall ?? null,
    heavyRain: weatherData ? heavyRainSoon(weatherData, ms) : null,
    stormKm: storm && storm.km <= STORM_ALERT_KM ? storm.km : null,
    windKt: cond.windKt,
    hsM: seaHere()?.hs ?? cond.swellHeightM,
    comfort: parts ? seaComfort(parts).comfort : null,
    bite: Number.isFinite(biteNum) ? biteNum : null,
    rip: cond.ripKnown ? cond.ripRisk : null,
    surf: brk?.surf?.band ?? null,
    breakerM: brk?.result?.waves.breaker.Hb ?? null,
    outing: { snorkel: diveHud?.now('snorkel') ?? null, dive: diveHud?.now('dive') ?? null },
    band: time.band(),
    leadH: (ms - now) / 3.6e6,
  };
};
const verdictHud = mountVerdictHud(hud, verdictInputs, condGroups, () => diveHud);
let vdQueued = false;
/** Re-judge once per frame at most: on the slider, a map move, new spot physics (subscribed where it is built) and every 30 s. */
function queueVerdict() {
  if (vdQueued || !verdictHud) return;
  vdQueued = true;
  requestAnimationFrame(() => ((vdQueued = false), verdictHud.refresh()));
}
time.subscribe(queueVerdict);
map.on('moveend', queueVerdict);
setInterval(queueVerdict, 30_000);
queueVerdict();
