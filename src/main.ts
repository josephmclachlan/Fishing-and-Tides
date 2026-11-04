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
import { mountSurfBreaks } from './layers/surf-breaks';
import { mountSurfHud } from './surf-hud';
import { mountLightningHud } from './lightning-hud';
import { mountLightning } from './layers/lightning';
import { fetchLightning } from './adapters/lightning';
import { nearestFlash, STRIKE_ALERT_KM, type Flash } from './lightning';
import { biteWeather, nearestStorm, pressureTrend, squallLevel, summarise } from './weather';
import { crestGrid } from './waves-lines';
import { mountWavesLayer } from './layers/waves';
import { mountWeatherHud } from './weather-hud';
import { mountStorms } from './layers/storms';
import { fetchWeather, weatherAt, type WeatherData } from './adapters/weather';
import { LIMON_HARMONICS } from './data/tides-limon';
import { mountWatchPanel } from './watch-panel';
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
import { mountBoatPanel, type CatchScorer, type OffshoreRead } from './boat-panel';
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
import { bindMapLayers } from './layers/visibility';
import { mountLayersPanel } from './layers-panel';
import { FLOW_STYLE, mountFlow } from './layers/flow';
import type { FlowSource } from './layers/flow-sim';
import { mountFlowHud } from './flow-hud';
import { isWater, sample } from './physics/bathy';
import { bandFor, createTimeStore } from './time';
import { mountTimeSlider } from './time-slider';
import { KT_PER_MS, sampleField, fromDeg } from './physics/flow';
import { MOCK_FLOW, PLUME_RIVERS, REGION, SPOTS } from './region';
import { fetchWind, windAt, type WindData } from './adapters/wind';
import { currentsAt, fetchCurrents, type CurrentsData } from './adapters/currents';
import { fetchWaves, wavesAt, type SeaState, type WavesData } from './adapters/waves';
import { chlAt, fetchSatellite, sstAt, type SatelliteData } from './adapters/satellite';
import { mountFronts, satelliteFronts } from './layers/fronts';
import { nearestFront, type FrontCell } from './physics/fronts';
import { OFFSHORE, offshoreScore } from './fishing/offshore';
import { sargassumSeeds } from './adapters/sargassum';
import { fetchMld, mldAt, type MldData } from './adapters/mld';
import { effortCells, fetchEffort } from './adapters/effort';
import { mountEffort } from './layers/effort';
import { mountSst } from './layers/sst';
import { clarityAt, mountClarity, mountClarityHud, type ClarityContext } from './layers/clarity';
import { fetchCatchmentRain, type CatchmentRain } from './adapters/catchment-rain';
import { fetchRiverFlow, flowRatio, type RiverFlow } from './adapters/river-flow';
import { dataAge, describeAge } from './adapters/data-age';
import { createNet } from './net';
import { createPhysicsClient } from './physics/client';
import { nearest } from './geo';
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
const windExtras = (ms: number) => {
  const g = weatherData ? weatherAt(weatherData, ms).map((w) => w.gustKt).filter(Number.isFinite) : [];
  const f = wind ? windAt(wind, time.band(), ms + 3 * 3.6e6)?.field : null;
  const v: [number, number] = [0, 0];
  const ahead = f && sampleField(f, ...MOCK_FLOW.windRef, v) ? { speedMs: Math.hypot(...v), fromDeg: fromDeg(...v) } : null;
  return { gustMs: g.length ? g.reduce((a, b) => a + b, 0) / g.length / KT_PER_MS : null, ahead };
};
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
  const sea = seaHere();
  if (sea) {
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
const frontsLayer = mountFronts(map);
let fronts: FrontCell[] = [];
fetchSatellite()
  .then((d) => {
    if (!d.sst && !d.sstCoast) return console.warn('sst: nothing published; using mock');
    satellite = d;
    mountSst(map, d);
    // Fronts (PLAN 7.17): from the newest SST and chlorophyll maps.
    fronts = satelliteFronts(d);
    frontsLayer.setFronts(fronts);
    refreshClarity();
  })
  .catch((err) => console.warn('satellite unavailable', err));
// Mixed-layer depth (PLAN 7.18) for the offshore read; optional, the score renormalises without it.
let mld: MldData | null = null;
fetchMld().then((d) => (mld = d.series ? d : null)).catch((err) => console.warn('mld unavailable', err));
// FISHING BOATS (PLAN 7.19): a year of Global Fishing Watch effort; published only once the GFW_TOKEN secret is set.
const effortLayer = mountEffort(map);
fetchEffort().then((d) => d.series && effortLayer.setCells(effortCells(d.series), d.series.meta.grid.dlon)).catch((err) => console.warn('effort unavailable', err));
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
mountHud(hud, map, conditionsAt, { age: () => describeAge(dataAge.oldest(), Date.now()), online: net.online, alerts: () => [...(weatherHud?.alerts() ?? []), ...(lightningHud?.alerts() ?? [])] });
// CONDITIONS groups: core always shown, the rest opened by activity (SURF, FISH, DIVE, BOAT) or by hand.
const condGroups = mountCondGroups(hud, safeStorage());
mountSwellHud(hud, seaHere);
mountTimeSlider(hud, time);
// Tide chart (PLAN 4.1): the slider's day at Limón, with the live gauge (PLAN 2.11) drawn over it.
let gauge: GaugeReading[] = [];
const tideHud = mountTideHud(hud, time, () => gauge);
const loadGauge = () =>
  fetchGauge({ hours: 30 })
    .then((d) => ((gauge = d.readings), tideHud?.refresh(), spotPage.refresh(), liveObs?.refresh()))
    .catch((err) => console.warn('tide gauge unavailable', err));
// The lock-on effect plays only for a picked target, never on scroll/pinch zoom.
const enhancer = createEnhancer(map, createLockFx(map, hud), settings.enhance);
// Phone: panels are drawers, closed until tapped; wide screens start with the LAYERS drawer open.
const sheets = createSheets(window.matchMedia(PHONE_QUERY).matches ? null : 'layers');
mountSeek(hud, (t) => enhancer.go(t), settings, sheets);
// Layer toggles and activity presets; other layers register into `layers` (src/layers/registry.ts).
bindMapLayers(map, layers);
mountSettingsUi(hud, settings);
mountIntro(hud, safeStorage());
mountSounds(document, settings.sound);
mountLayersPanel(hud, layers, sheets);
mountLangUi(hud, settings, map);
mountSheets(hud, map, sheets);
// Surf break catalog (PLAN 6.4): markers and BREAK rows.
const surfBreaks = mountSurfBreaks(map);
const surfHud = mountSurfHud(hud, map, (name) => spotPhysics?.byName(name)?.surf);
// BOAT verdict inputs besides wind and sea (PLAN 7.23); filled in once weather, storms and lightning are declared below.
let boatSafety: () => VerdictSafety = () => ({});
mountSeaStateHud(hud, conditionsAt, seaHere, { vessel: settings.vessel, safety: () => boatSafety() });
// Weather and active tropical storms (PLAN 7.3, 7.5): live feeds, rows stay -- until they load.
weatherHud = mountWeatherHud(hud, { validMs: () => time.validMs() });
time.subscribe(() => weatherHud?.refresh());
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
fetchWeather().then((d) => ((weatherData = d), weatherHud?.setWeather(d), diveHud?.refresh())).catch((err) => console.warn('weather unavailable', err));
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
  };
};
fetchStorms().then((d) => ((stormList = d.storms), stormLayer.setStorms(d.storms), weatherHud?.setStorms(d.storms))).catch((err) => console.warn('storms unavailable', err));
mountAstroHud(hud, map, time);
mountHarbours(map);
let landGrid: Grid | null = null;
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
mountBoatPanel(hud, map, boatStore, sheets, () => depthAt, () => scoreCatch, () => (offshoreDepth ? offshoreRead : null));
const coralStore = createCoralStore(safeStorage());
mountCoralPanel(hud, map, coralStore, sheets, () => depthAt);
mountCoralLogLayer(map, coralStore);
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
const metricEnv = (): MetricEnv => ({
  windMs: windMsAt,
  sea: (lng, lat, ms) => (waves ? wavesAt(waves, bandAt(ms), ms, lng, lat) : null),
  weather: (ms) => (weatherData ? weatherAt(weatherData, ms) : []),
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
mountWatchPanel(hud, map, sheets, safeStorage(), metricEnv);
// SYSTEM CHECK: its tab joins the settings controls on a phone.
mountSystemCheck(hud, sheets, { checks: () => allChecks(), net, storage: safeStorage() });
// LIVE OBS (PLAN 2.13): the newest real reading from the gauge, the airport and the satellite passes, with ages.
let metarObs: MetarObs[] = [];
let passes: PassData | null = null;
const liveObs = mountLiveObs(hud, map, sheets, () => ({ gauge, metar: metarObs, passes }));
fetchMetar()
  .then((d) => ((metarObs = d.obs), liveObs.refresh()))
  .catch((err) => console.warn('metar unavailable', err));
fetchPasses()
  .then((d) => ((passes = d), liveObs.refresh()))
  .catch((err) => console.warn('satellite passes unavailable', err));
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
const clarityLayer = mountClarity(map);
const bandAt = (ms: number) => bandFor((ms - time.baseMs()) / 3.6e6).id;
const currentOut: [number, number] = [0, 0];
const clarityCtx = (): ClarityContext | null =>
  clarityElevation && {
    satellite, rain: catchmentRain, elevation: clarityElevation, ms: time.validMs(),
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
let diveHud: { refresh: () => void } | null = null;
const diveWind: [number, number] = [0, 0];
const refreshClarity = () => {
  const c = clarityCtx();
  if (c) clarityLayer.update(c);
  clarityHud?.refresh();
  diveHud?.refresh();
};
time.subscribe(refreshClarity);
// River flow at the mouths (PLAN 7.15): GloFAS discharge against its median, for fishing near the mouths.
let riverFlow: RiverFlow | null = null;
fetchRiverFlow()
  .then((d) => (riverFlow = d))
  .catch((err) => console.warn('river flow unavailable', err));
fetchCatchmentRain()
  .then((d) => ((catchmentRain = d), refreshClarity()))
  .catch((err) => console.warn('catchment rain unavailable', err));

// Sargassum (PLAN 7.1): the newest satellite sightings drifted with the current and 1–3% of the wind into a
// 5-day landing outlook per beach. Needs the detections, the current forecast and the coastline; rerun as each loads.
let sargassum: SargassumData | null = null;
let sargForecast: SargForecast | null = null;
const sargLayer = mountSargassum(map);
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
      wind = d;
      runSargassum();
      flowSources.wind = { ...flowSources.wind, field: windField() };
      flow?.setSource('wind', flowSources.wind);
      diveHud?.refresh();
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
 * Offshore sea state for the physics at a shoreline pin. The models give mean, not peak,
 * periods; the swell's mean period stands in for Tp when swell dominates, as it does on this
 * coast most of the year.
 */
const spotSea = (pin: [number, number]) => {
  const w = seaStateAt(...pin);
  if (!w || !Number.isFinite(w.tm)) return null;
  const swellLeads = Number.isFinite(w.swellHs) && Number.isFinite(w.swellT) && w.swellHs >= (Number.isFinite(w.windSeaHs) ? w.windSeaHs : 0);
  const part = (hs: number, T: number, dir: number) => (Number.isFinite(hs) && Number.isFinite(T) && Number.isFinite(dir) && hs >= 0.1 ? { Hs: hs, Tp: T, fromDeg: dir } : null);
  return {
    Hs: w.hs,
    Tp: swellLeads ? w.swellT : w.tm,
    fromDeg: swellLeads ? w.swellDir : w.dir,
    swellHs: swellLeads ? w.swellHs : w.hs,
    swell2: part(w.swell2Hs, w.swell2T, w.swell2Dir),
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
    refreshClarity();
    spotPhysics = createSpotPhysics(createPhysicsClient({ region: data.region, macro: data.macro, land: data.land }), baseConditions, () => time.validMs(), windExtras, spotSea);
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
        const w = weatherData ? biteWeather(weatherAt(weatherData, ms)) : {};
        return { rainMmH: w.rainMmH, squall: w.squall, lightning: !!near && near.km <= STRIKE_ALERT_KM };
      },
      depthAt: (lng, lat) => depthAt?.(lng, lat),
    }) ?? null;
    spotPhysics.update();
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
              ...(weatherData ? biteWeather(weatherAt(weatherData, ms)) : {}),
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
              visM: c ? (clarityAt({ ...c, ms }, lng, lat)?.visM ?? null) : null,
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
    // Currents stay in the sea once the coastline mask is here.
    waterMask = (lng, lat) => isWater(data.land, data.macro, lng, lat);
    runSargassum();
    rebuildCrests();
    const current = { ...flowSources.current, water: waterMask };
    flowSources.current = current;
    flow?.setSource('current', current);
    flowHud?.refresh();
    return mountSeafloor(map, data);
  })
  .catch((err) => console.warn('seafloor layer unavailable', err));
