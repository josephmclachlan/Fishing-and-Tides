/**
 * The Kinetic Plus map (PLAN 7.70; Joseph approved mockup G on 2026-11-11): the MODERN theme's map. A fundamental
 * restructure of the map's chrome around the forecast page's ideas, over the same map, layers and data:
 *
 * 1. One activity switch shared with the FORECAST page (surf, fish, swim, snorkel, dive, sail) plus CORAL.
 * 2. A layer composer: only the layers that are on, in draw order, each with legend, source and age; every one of
 *    the old map's layers can be added; changes are kept per activity, one Reset from the preset.
 * 3. The coast carries the rating: a ribbon along each beach and a tile on each spot (coast.ts).
 * 4. Readings under the crosshair for the layers on the map, tide and UV always (tiles.ts); ALL READINGS opens every
 *    group of the old CONDITIONS panel, so no data is lost (Joseph 2026-11-11: "the same data depth as the old map").
 * 5. The time slider is the selected spot's 30-day rating (scrub.ts).
 * 6. The spot sheet is the forecast hero, following the slider.
 * 7. CORAL mode: its own layers, a reef card with heat, mud weeks and spawning, private sites only as 5 km cells.
 * 8. Less chrome: back to Forecast, the tabs, data age, language, light or dark, settings. Every old tool (WATCH,
 *    BOAT, CORAL SITES, LIVE OBS, SYSTEM CHECK, SYNC FOR TRIP) opens from Settings, restyled.
 *
 * The map itself stays full-screen under this shell; its padding is set to the stage, so `map.getCenter()` is the
 * crosshair and every old reading module keeps reading the right point.
 */
import { bandCss, FIELD_STEPS, FIELD_TICKS, onFieldSteps, rampCss, type FieldKind } from '../layers/bands';
import { HEAT_STEPS } from '../layers/fishing';
import type { Map as MlMap } from 'maplibre-gl';
import type { Plan } from '../metrics/plan';
import type { Spot as FcSpot } from '../metrics/forecast';
import { bestTimeView, headline, heroWords, sentence } from '../forecast/view';
import { hourlyVerdicts, nextWindow } from '../boat/window';
import { daysAt, readAt, skyMemo, spotsForActivity, type FcActivity, type FcDeps, type FcRead, type Level } from '../forecast/model';
import { shoreBand } from '../physics/shorebreak';
import { extrema, predictSeries, tideState } from '../physics/tide';
import { tideFixNow } from '../corrections';
import { localDayStart, moonPhase, sunAltitude, sunTimes } from '../physics/astro';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { REGION, SPOTS } from '../region';
import { LAYERS, type LayerId, type LayerStore } from '../layers/registry';
import { GLYPH_PAINT, LEGEND, glyphSwatch, legendItemKey, legendWhatKey, type LegendItem } from '../layers/legend';
import { glyphSvg } from '../icons/glyphs';
import { sprigSvg } from '../layers/sargassum-glyph';
import { SST_BANDS } from '../layers/sst';
import { CLARITY_BANDS } from '../physics/clarity';
import type { CoralMode } from '../coral-mode';
import type { Sheets, SheetId } from '../sheets';
import type { Settings } from '../settings';
import { dataAge, ageState } from '../adapters/data-age';
import { resolveTarget, type Target } from '../target';
import { nextSeasons, spawnWindows } from '../coral/spawning';
import { ALERT_KEYS, alertForDhw } from '../adapters/coral-parse';
import { alertLevelOf } from '../coral-page/view';
import { t, type Key } from '../i18n';
import { saveScheme, currentScheme, storedScheme } from '../theme';
import { BANDS } from '../time';
import type { TimeStore } from '../time';
import {
  GROUPS, MODES, OLD_PRESET, isCustom, isMode, isOwnLayer, layerDef, loadOrders, moveLayer, offered, orderOf, saveOrders, toggleLayer,
  type KmGroup, type KmLayer, type Mask, type Mode,
} from './model';
import { ARROW, BACK, CLOSE, GRIP, ICON, L2, LOCK, PLUS, compass, esc, fin, levelWord, modeName, resetTokens, setKmLang, svg } from './dom';
import { mountCoast, type PinData } from './coast';
import { readDetails, type Detail } from './detail';
import { mountScrub } from './scrub';
import { barHTML, drawTiles, tileHTML, type Reading } from './tiles';
import { citer, type SourceId } from '../sources';
import { isNtAct, notesHash, type NtAct } from '../notes/route';
import { styleBaseMap } from './basemap';
import { emitSchemeChange, roleSnapshot, schemeSwap } from '../layers/paint';
import { SYNC_EVENT, type SyncStatus } from '../sync-ui';
import { loadSummary } from '../offline/sync';
import type { FishInfo, SpearInfo } from '../fishing-hud';
import type { SpeciesId } from '../fishing/species';

type Spot = (typeof SPOTS)[number];
const asSpot = (s: FcSpot | undefined): Spot => (s ? (SPOTS.find((x) => x.name === s.name) ?? SPOTS[0]) : SPOTS[0]);
const H = 3.6e6;

/** Labels that draw over everything, the place names included (PLAN 7.85). */
const ON_TOP = ['fh-zone-label', 'sp-zone-label'] as const;

/** What is under a point at an hour: everything the old CONDITIONS panel and "what's here" card read. */

export interface Here {
  land: boolean;
  depthM: number | null;
  swell: { hs: number; tp: number; fromDeg: number; trains: { hs: number; tp: number; deg: number }[] } | null;
  wind: { kt: number; fromDeg: number; gustKt: number | null } | null;
  current: { kt: number; toDeg: number } | null;
  sstC: number | null;
  /** Chlorophyll-a, mg/m³ (satellite). */
  chl: number | null;
  visM: number | null;
  rain: { mmH: number | null; pct: number | null } | null;
  lightningKm: number | null;
  rip: { level: 'LOW' | 'MOD' | 'HIGH'; spot: string } | null;
  sarg: { level: string; beach: string } | null;
  uv: number | null;
  zone: string | null;
  heat: { reef: string; dhw: number; alert: number } | null;
  airC: number | null;
  /** The old map's weather rows (weather-hud.ts): real feel in the shade, humidity, cloud, squall risk in the next 6 h. */
  feelsC?: number | null;
  humidityPct?: number | null;
  cloudPct?: number | null;
  /** Bed surge at 1, 2, 3, 6 and 12 m at the spot within 4 km (dive-hud.ts), for the slider hour. */
  surge?: { depth: number; uMs: number; excursionM: number; band: 'CALM' | 'SURGY' | 'DANGEROUS' }[] | null;
  /** The surf a swimmer meets at the water's edge there, m (the breaker, cut by any reef flat in front). */
  entryM?: number | null;
}

export interface ReefNow { id: string; name: string; lngLat: [number, number]; dhw: number | null; alert: number | null; sstC: number | null; anomaly: number | null; mudWeeks: number | null; day: number | null }

export interface KmDeps {
  map: MlMap;
  time: TimeStore;
  layers: LayerStore;
  coralMode: CoralMode;
  sheets: Sheets;
  settings: Settings;
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined;
  fc: FcDeps;
  here: (lng: number, lat: number, ms: number) => Here;
  reefs: () => ReefNow[];
  coralLayer: { setVisible(on: boolean): void };
  coralSites: () => readonly { lng: number; lat: number }[];
  onCoralSites: (fn: () => void) => void;
  forecast: { open(o?: { spot?: string; activity?: FcActivity }): void; isOpen(): boolean; where(): { spot: string; activity: FcActivity } };
  openCoralPage: (reef: string) => void;
  /** The species guide (PLAN 7.91). */
  openGuide?: (mode?: 'identify' | 'edible') => void;
  /** What the fish map shows (PLAN 7.120): EAT, fish to keep and eat, or SPORT, fish to catch and release. */
  fishMode?: {
    get(): 'eat' | 'sport';
    set(m: 'eat' | 'sport'): void;
    /** ALL, SHORE or BOAT: which water the fish map highlights. */
    reach?(): 'all' | 'shore' | 'boat';
    setReach?(r: 'all' | 'shore' | 'boat'): void;
    subscribe?(fn: () => void): void;
    /** The fish bar (PLAN 7.143): step the fish, its best windows and spots, fly to a spot, log a catch. */
    step?(d: number): void;
    info?(): FishInfo | null;
    flySpot?(n: number): void;
    onInfo?(fn: () => void): void;
    logCatch?(at: { lng: number; lat: number }, as?: string): { id: string; species: string };
    /** SPEAR's bar: its picked target and the best open water near the crosshair. */
    spearInfo?(): SpearInfo | null;
    setSpearTarget?(id: SpeciesId | null): void;
    flyTo?(lng: number, lat: number): void;
    undoCatch?(id: string): void;
  };
  explain: (title: string, id: string) => void;
  go: (t: Target) => void;
  /** Reload keeping the view (language, theme and scheme are applied at load). */
  reload: () => void;
  setLang: (l: 'en' | 'es') => void;
  /** A stamp that changes when any feed the ratings read changes. */
  version: () => string;
  /** The old drawers, opened restyled from Settings; SYNC runs the trip download. */
  tools: { id: SheetId | 'sync'; label: string; sub: string }[];
  /** The mode changed: the old CONDITIONS groups follow it. */
  onMode?: (m: Mode) => void;
}

const ACT_KEY = 'ft.fcActivity';
const SPOT_KEY = 'ft.fcSpot';
const CORAL_KEY = 'ft.km.coral';
const REEF_KEY = 'ft.km.reef';
/** The desktop layers rail folded to a slim bar (Joseph 2026-11-11: it should not take the whole left side). */
const LCOL_KEY = 'ft.km.lcol';
const get = (s: Pick<Storage, 'getItem'> | undefined, k: string) => {
  try {
    return s?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const put = (s: Pick<Storage, 'setItem'> | undefined, k: string, v: string) => {
  try {
    s?.setItem(k, v);
  } catch {
    /* private mode */
  }
};

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s·-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
const n1 = (x: number) => x.toFixed(1);
const n0 = (x: number) => String(Math.round(x));

export function mountKineticMap(d: KmDeps) {
  const { map, time, layers, settings, storage } = d;
  setKmLang(settings.lang());
  const root = document.documentElement;
  const WIDE = window.matchMedia('(min-width: 1100px)');
  const tz = REGION.tzOffsetH;
  const sky = skyMemo(tz);

  /* ---------- state ---------- */
  const where = d.forecast.where();
  const S = {
    act: (isMode(get(storage, ACT_KEY)) && get(storage, ACT_KEY) !== 'coral' ? get(storage, ACT_KEY) : where.activity) as FcActivity,
    coral: get(storage, CORAL_KEY) === '1',
    spot: get(storage, SPOT_KEY) ?? where.spot,
    reef: get(storage, REEF_KEY) ?? 'cahuita',
    sheet: null as string | null,
    playing: 0,
  };
  const mode = (): Mode => (S.coral ? 'coral' : S.act);
  let orders = loadOrders(storage);
  let lcol = get(storage, LCOL_KEY) !== '0';
  const order = () => orderOf(orders, mode());
  const on = (id: KmLayer) => order().includes(id);

  /* ---------- DOM ---------- */
  document.body.classList.add('km-on');
  const app = document.createElement('div');
  app.className = 'k-app';
  app.innerHTML = `
  <header class="k-top">
    <button type="button" class="k-back" id="k-back">${BACK}<span class="k-bt"><span class="k-b1">${L2('Forecast', 'Pronóstico')}</span><span class="k-b2" id="k-backsub"></span></span></button>
    <div class="k-ttl"><p class="k-brand k-mono"><span class="k-hide-s">Fishing and Tides · </span>Caribe Sur</p><h1>${L2('Map', 'Mapa')} <em id="k-ttlact"></em></h1></div>
    <nav class="k-tabs" id="k-tabs" role="tablist" aria-label="${L2('Activity', 'Actividad')}"><span class="k-tab-bar" id="k-tabbar"></span></nav>
    <div class="k-ctrls">
      <button type="button" class="k-band k-age" id="k-age"><i></i><span></span></button>
      <div class="k-lang" role="group" aria-label="${L2('Language', 'Idioma')}"><button type="button" data-lang="en">EN</button><button type="button" data-lang="es">ES</button></div>
      <button type="button" class="k-ib k-themeb" id="k-scheme" aria-label="${L2('Light or dark', 'Claro u oscuro')}">${svg('<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>', '0 0 20 20')}</button>
      <button type="button" class="k-ib" id="k-set" aria-label="${L2('Settings', 'Ajustes')}">${svg('<path d="M3 5h14M3 10h14M3 15h14"/><rect x="5" y="3" width="3" height="4" fill="currentColor" stroke="none"/><rect x="12" y="8" width="3" height="4" fill="currentColor" stroke="none"/><rect x="7" y="13" width="3" height="4" fill="currentColor" stroke="none"/>', '0 0 20 20')}</button>
    </div>
  </header>
  <aside class="k-rail k-rail-l" id="k-raill" aria-label="${L2('Layers', 'Capas')}"></aside>
  <main class="k-stage" id="k-stage" aria-label="${L2('Map', 'Mapa')}">
    <div class="k-confveil" aria-hidden="true"></div>
    <div class="k-xh" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div>
    <button type="button" class="k-readbar" id="k-readbar" aria-label="${L2('Readings under the crosshair', 'Lecturas bajo la mira')}"></button>
    <div class="k-fishsw" id="k-fishsw" hidden></div>
    <div class="k-legmini" id="k-legmini" aria-hidden="true"></div>
    <div class="k-views" role="group" aria-label="${L2('Prepared views', 'Vistas')}"><button type="button" data-view="coast">${L2('Coast', 'Costa')}</button><button type="button" data-view="spot" id="k-vspot"></button></div>
    <div class="k-mapbtns">
      <div class="k-zoom"><button type="button" id="k-zin" aria-label="${L2('Zoom in', 'Acercar')}">${svg('<path d="M8 2v12M2 8h12"/>', '0 0 16 16')}</button><button type="button" id="k-zout" aria-label="${L2('Zoom out', 'Alejar')}">${svg('<path d="M2 8h12"/>', '0 0 16 16')}</button></div>
      <button type="button" class="k-fab" id="k-tools" aria-haspopup="dialog">${svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>')}<span>${L2('Tools', 'Herramientas')}</span></button>
      <button type="button" class="k-fab" id="k-find">${svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>')}<span>${L2('Find', 'Buscar')}</span></button>
      <button type="button" class="k-fab k-pri k-lay" id="k-laybtn">${svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>')}<span>${L2('Layers', 'Capas')}</span><span class="k-cnt" id="k-laycnt"></span></button>
    </div>
  </main>
  <aside class="k-rail k-rail-r" id="k-railr" aria-label="${L2('Spot and readings', 'Spot y lecturas')}"></aside>
  <section class="k-dock" id="k-dock" aria-label="${L2('Time', 'Hora')}">
    <button type="button" class="k-dk-spot" id="k-dkspot"></button>
    <div class="k-dk-time">
      <div class="k-dk-when"><span class="k-h" id="k-thour"></span><span class="k-d" id="k-tday"></span></div>
      <div class="k-dk-meta"><span class="k-band" id="k-tband"><i></i><span></span></span><span class="k-uvp" id="k-tuv"></span></div>
      <div class="k-dk-btns"><button type="button" class="k-best" id="k-best">${L2('Best', 'Mejor')}</button><button type="button" id="k-now">${L2('Now', 'Ahora')}</button><button type="button" id="k-play" aria-label="${L2('Play', 'Reproducir')}"></button></div>
    </div>
    <div class="k-scrub" id="k-scrub" tabindex="0" role="slider" aria-label="${L2('Forecast time, 30 days', 'Hora del pronóstico, 30 días')}" aria-valuemin="0" aria-valuemax="720"></div>
  </section>
  <div class="k-scrim" id="k-scrim"></div>
  <div class="k-sheet" id="k-sheet" role="dialog" aria-modal="false" aria-labelledby="k-shtitle">
    <div class="k-sh-grab"></div>
    <div class="k-sh-head"><h2 id="k-shtitle"></h2><button type="button" class="k-ib" id="k-shclose" aria-label="${L2('Close', 'Cerrar')}">${CLOSE}</button></div>
    <div class="k-sh-body" id="k-shbody"></div>
  </div>`;
  document.body.appendChild(app);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => app.querySelector<T>(`#${id}`)!;
  const stage = $('k-stage'), railL = $('k-raill'), railR = $('k-railr'), sheet = $('k-sheet'), shBody = $('k-shbody'), shTitle = $('k-shtitle'), scrim = $('k-scrim');

  /* ---------- map padding: the stage is the map ---------- */
  const pad = () => {
    if (d.forecast.isOpen()) return;
    const s = stage.getBoundingClientRect(), m = map.getContainer().getBoundingClientRect();
    const p = { left: Math.max(0, s.left - m.left), top: Math.max(0, s.top - m.top), right: Math.max(0, m.right - s.right), bottom: Math.max(0, m.bottom - s.bottom) };
    const o = map.getPadding();
    if (o.left !== p.left || o.top !== p.top || o.right !== p.right || o.bottom !== p.bottom) map.setPadding(p);
  };
  new ResizeObserver(() => pad()).observe(stage);
  window.addEventListener('fc-hide', () => setTimeout(pad, 0));

  /* ---------- ratings, cached per data version ---------- */
  let cacheV = '';
  const cache = new Map<string, FcRead>();
  const spotByName = (n: string) => SPOTS.find((s) => s.name === n);
  const rate = (a: FcActivity, s: Spot, ms: number): FcRead => {
    const v = d.version();
    if (v !== cacheV) (cache.clear(), (cacheV = v));
    const k = `${a}|${s.name}|${ms}`;
    let r = cache.get(k);
    if (!r) {
      try {
        r = readAt(d.fc, a, s, ms, sky);
      } catch {
        r = { activity: a, ms, score: null, share: null, level: null };
      }
      cache.set(k, r);
    }
    return r;
  };
  const actSpots = (): Spot[] => spotsForActivity(S.act, SPOTS).map(asSpot);
  const spot = (): Spot => {
    const list = actSpots();
    return list.find((s) => s.name === S.spot) ?? list.find((s) => s.name === 'PLAYA COCLES') ?? list[0] ?? SPOTS[0];
  };
  const reefList = () => d.reefs();
  const reef = () => reefList().find((r) => r.id === S.reef) ?? reefList()[0] ?? null;
  /**
   * A reef's heat as NOAA Coral Reef Watch's own alert (the 7-day maximum the feed carries), in the coral page's colours
   * (coral-page/view.ts alertLevelOf), so a reef reads the same on the map and the coral page (review 2026-11-16: the map
   * said WATCH from its own DHW cut-offs where the coral page said ALERT 1). Only with no alert in the feed does the DHW
   * stand in, through CRW's own DHW thresholds.
   */
  const reefAlert = (r: ReefNow | null): number | null =>
    r?.alert !== null && r?.alert !== undefined && Number.isFinite(r.alert) ? r.alert : r?.dhw === null || r?.dhw === undefined || !Number.isFinite(r.dhw) ? null : r.dhw > 0 ? alertForDhw(r.dhw) : 0;
  const reefLevel = (r: ReefNow | null): Level | null => alertLevelOf(reefAlert(r));
  const heatWord = (r: ReefNow | null) => {
    const a = reefAlert(r);
    return a === null ? L2('No data', 'Sin datos') : titleCase(t(`coral.alert.${ALERT_KEYS[Math.min(a, ALERT_KEYS.length - 1)]}` as Key));
  };
  /** The spot whose water conditions stand for a reef visit: the nearest snorkel spot. */
  const reefSpot = (r: ReefNow | null) => {
    const list = spotsForActivity('snorkel', SPOTS).map(asSpot);
    const at = r?.lngLat ?? spot().lngLat;
    return list.reduce((b, s) => (Math.hypot(s.lngLat[0] - at[0], s.lngLat[1] - at[1]) < Math.hypot(b.lngLat[0] - at[0], b.lngLat[1] - at[1]) ? s : b), list[0] ?? SPOTS[0]);
  };
  const ms = () => time.validMs();
  const offMs = (o: number) => time.baseMs() + o * H;
  const local = (t: number) => new Date(t + tz * H);
  const DN = () => (settings.lang() === 'es' ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const dateOf = (t: number) => {
    const x = local(t);
    return { wd: DN()[x.getUTCDay()], n: x.getUTCDate(), hh: x.getUTCHours() };
  };
  const hhmm = (t: number) => `${String(dateOf(t).hh).padStart(2, '0')}:00`;

  /* ---------- tabs ---------- */
  const tabs = $('k-tabs'), tabBar = $('k-tabbar');
  for (const m of MODES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `k-tab${m === 'coral' ? ' k-coral' : ''}`;
    b.setAttribute('role', 'tab');
    b.dataset.id = m;
    b.innerHTML = `${svg(ICON[m])}<span>${modeName(m)}</span>`;
    b.addEventListener('click', () => (m === 'coral' ? setCoral(!S.coral) : setAct(m)));
    tabs.appendChild(b);
  }
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = [...tabs.querySelectorAll<HTMLButtonElement>('.k-tab')], i = bs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
    n.focus();
    n.click();
    e.preventDefault();
  });
  const placeBar = () => {
    const tb = tabs.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tb) return;
    tabBar.style.width = `${tb.offsetWidth}px`;
    tabBar.style.transform = `translate(${tb.offsetLeft}px, ${tb.offsetTop + tb.offsetHeight - 5}px)`;
  };
  new ResizeObserver(() => placeBar()).observe(tabs);
  const renderTabs = () => {
    tabs.querySelectorAll<HTMLElement>('.k-tab').forEach((b) => b.setAttribute('aria-selected', String(S.coral ? b.dataset.id === 'coral' : b.dataset.id === S.act)));
    root.dataset.act = S.act;
    if (S.coral) root.dataset.coral = '1';
    else delete root.dataset.coral;
    requestAnimationFrame(placeBar);
  };
  function setAct(a: FcActivity) {
    S.act = a;
    put(storage, ACT_KEY, a);
    if (S.coral) setCoral(false, true);
    else modeChanged();
  }
  function setCoral(onC: boolean, quiet = false) {
    S.coral = onC;
    put(storage, CORAL_KEY, onC ? '1' : '0');
    quietCoral(onC);
    modeChanged();
    if (onC && !quiet && WIDE.matches === false) openSheet('coral');
  }

  /* ---------- layers ---------- */
  /** Every MapLibre style layer a catalogue layer controls, bottom to top as they are now. */
  const styleIds = (id: LayerId) => {
    const def = layersCatalog().find((l) => l.id === id) ?? null;
    const pre = def?.mapPrefixes ?? [];
    return (map.getStyle()?.layers ?? []).map((l) => l.id).filter((x) => pre.some((p) => x.startsWith(p)));
  };
  const catalog = LAYERS as readonly { id: LayerId; mapPrefixes?: readonly string[] }[];
  const layersCatalog = () => catalog;
  let applying = false;
  /** The old CORAL switch moves the registry's layers itself; the composer's list for the mode wins, so hush it. */
  function quietCoral(on: boolean) {
    applying = true;
    try {
      d.coralMode.set(on);
    } finally {
      applying = false;
    }
  }
  const applyLayers = () => {
    const o = order();
    applying = true;
    layers.setOn(o.filter((x): x is LayerId => !isOwnLayer(x)));
    applying = false;
    coast.setVisible(!S.coral && o.includes('rating'));
    d.coralLayer.setVisible(S.coral && o.includes('heat'));
    coast.setCellsVisible(S.coral && o.includes('private'));
    applyOrder();
  };
  /** Draw order: the composer's top layer draws over the rest, all under the place labels (but the zone names, ON_TOP). */
  const applyOrder = () => {
    if (!map.isStyleLoaded()) return;
    const lbl = map.getStyle().layers?.find((l) => l.type === 'symbol' && !l.id.startsWith('km-') && (l as { source?: string }).source === 'openmaptiles')?.id;
    const o = order().slice().reverse();
    try {
      for (const id of o) {
        if (isOwnLayer(id)) continue;
        for (const sid of styleIds(id)) map.moveLayer(sid, lbl);
      }
      for (const sid of ['km-coast-case', 'km-coast']) if (map.getLayer(sid)) map.moveLayer(sid, lbl);
      // Zone names go over the place names, so they're placed first and never knocked out by a town or reef label (PLAN 7.85).
      for (const sid of ON_TOP) if (map.getLayer(sid)) map.moveLayer(sid);
    } catch {
      /* a layer mid-rebuild: the next change reorders */
    }
  };
  map.on('styledata', () => setTimeout(applyOrder, 0));
  // Someone else changed the layers (an old drawer, a link from the forecast): keep the list in step.
  layers.subscribe(() => {
    if (applying) return;
    const want = order();
    const regOn = new Set(layers.onIds());
    const next = [...want.filter((x) => isOwnLayer(x) || regOn.has(x as LayerId)), ...[...regOn].filter((x) => !want.includes(x))];
    if (next.length !== want.length || next.some((x, i) => x !== want[i])) {
      orders = { ...orders, [mode()]: next };
      saveOrders(storage, orders);
      renderComposer();
      renderReadouts();
    }
  });
  const setOrder = (next: KmLayer[]) => {
    orders = { ...orders, [mode()]: next };
    saveOrders(storage, orders);
    applyLayers();
    renderComposer();
    renderLegMini();
    renderReadouts();
  };

  const groupName = (g: KmGroup) =>
    ({ core: L2('Ratings', 'Calificación'), ocean: L2('Ocean', 'Océano'), water: L2('Water', 'Agua'), weather: L2('Weather', 'Tiempo'), beach: L2('Beach and fishing', 'Playa y pesca'), seafloor: L2('Seafloor', 'Fondo'), rules: L2('Rules and places', 'Reglas y lugares'), coral: L2('Coral', 'Coral') })[g];
  /** Mockup G's layer names where they say more than the old map's short labels. */
  const KM_NAMES: Partial<Record<KmLayer, [string, string]>> = {
    rating: ['Beach ratings', 'Calificación de playas'], obs: ['Live observations', 'Observaciones en vivo'], heat: ['Heat stress', 'Estrés térmico'], private: ['Private sites', 'Sitios privados'],
    waves: ['Swell crests', 'Crestas del oleaje'], currents: ['Current', 'Corriente'], weather: ['Rain and storms', 'Lluvia y tormentas'],
    fishing: ['Fishing spots', 'Zonas de pesca'], depth: ['Seafloor depth', 'Profundidad'], zones: ['Zones and rules', 'Zonas y reglas'],
    seamarks: ['Seamarks and wrecks', 'Balizas y naufragios'], anchorages: ['Harbours', 'Puertos y fondeaderos'], ais: ['Ships (AIS)', 'Barcos (AIS)'],
  };
  const layerName = (id: KmLayer) => {
    const n = KM_NAMES[id];
    return n ? L2(...n) : titleCase(t(`layer.${id}` as Key));
  };
  const ageOf = (id: KmLayer) => {
    const feeds = layerDef(id).feeds;
    if (!feeds.length) return { txt: L2('Static', 'Estático'), cls: 'k-ok' };
    const got = feeds.map((f) => dataAge.get(f)).filter((x): x is NonNullable<typeof x> => !!x);
    if (!got.length) return { txt: L2('Loading', 'Cargando'), cls: '' };
    const newest = Math.max(...got.map((g) => g.fetchedAt));
    const a = Date.now() - newest, st = ageState(a);
    const h = a / H;
    return { txt: h < 1 ? `${Math.max(1, Math.round(a / 6e4))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`, cls: st === 'fresh' ? 'k-ok' : 'k-warn' };
  };
  const keys = (items: [string, string, string?][]) => `<div class="k-keys">${items.map(([c, l, k]) => `<span><i class="${k ?? ''}" style="--k:var(--${c})"></i>${esc(l)}</span>`).join('')}</div>`;
  const ownLegend = (id: KmLayer) =>
    id === 'rating'
      ? keys([['lv0', levelWord(0)], ['lv1', levelWord(1)], ['lv2', levelWord(2)], ['lv3', levelWord(3)], ['lv4', levelWord(4)]])
      : id === 'heat'
        ? keys([['lv3', L2('No stress', 'Sin estrés')], ['lv2', L2('Watch', 'Vigilancia')], ['lv1', L2('Warning', 'Aviso')], ['lv0', L2('Alert 1 or higher', 'Alerta 1 o más')]])
        : id === 'private'
          ? `<div class="k-keys"><span><i class="k-glyph">${glyphSvg('lock', GLYPH_PAINT.ink, 14)}</i>${esc(L2('5 km cell with your sites', 'Celda de 5 km con sus sitios'))}</span></div><p class="k-lgnote">${L2('Your logged sites never show exactly on this map.', 'Sus sitios nunca se muestran exactos en este mapa.')}</p>`
          : '';
  /**
   * The key under each layer: the old map's legend items (layers/legend.ts), each with a swatch in the colour the layer
   * actually paints (layers/paint.ts), so a green wash on the map is a green chip here. Items with no mark of their own
   * (notes such as "nothing drawn: low risk") stay in the "?" explainer.
   */
  // 'dim' is the old map's faded amber (--amber-dim): the faint wash of the same colour, as the layers paint it.
  /** A key's swatch: a CSS chip, or the drawn mark itself where the layer draws a glyph (the sargassum sprig). */
  const keySw = (it: LegendItem) =>
    it.sw === 'glyph'
      ? `<i class="k-sw-glyph${it.dim ? ' k-dimg' : ''}">${glyphSwatch(it, 16)}</i>`
      : `<i class="k-sw-${it.sw}" style="--k:${SW_TONE[it.tone]}">${it.sw === 'weed' ? sprigSvg(18) : ''}</i>`;
  const SW_TONE = {
    amber: 'var(--paint-amber)', green: 'var(--paint-green)', red: 'var(--paint-red)', dim: 'color-mix(in srgb, var(--paint-amber) 40%, transparent)',
    surf: 'var(--t-surf)', rain0: 'var(--r-rain0)', rain2: 'var(--r-rain2)', rain4: 'var(--r-rain4)', sarg: 'var(--m-sarg)',
  } as const;
  /**
   * A painted field's key (mockup G's ramp keys): the layer's bands in its colours, equal widths, a few edges written
   * under them and the unit at the end (layers/bands.ts), so a band on the sea is a band here.
   */
  const FIELD_OF: Partial<Record<KmLayer, FieldKind>> = { sst: 'sst', clarity: 'vis', chl: 'chl' };
  const fieldKey = (kind: FieldKind) => {
    const cols = bandCss(kind), n = cols.length, { at, unit } = FIELD_TICKS[kind];
    const num = (x: number) => String(x);
    return `<div class="k-rampw"><div class="k-ramp" aria-hidden="true">${cols.map((c) => `<i style="--k:${c}"></i>`).join('')}</div><em class="k-mono">${esc(unit)}</em><div class="k-rampl k-mono">${at.map((x) => `<span style="left:${((FIELD_STEPS[kind].indexOf(x) + 1) * 100) / n}%">${esc(num(x))}</span>`).join('')}</div></div>`;
  };
  /** Layers whose key uses short labels (`legend.<id>.key.<n>`, 2 to 4 words); their full item text moves to the "?" explainer. */
  const SHORT_KEY = new Set<KmLayer>(['spear']);
  const legend = (id: KmLayer) => {
    if (isOwnLayer(id)) return ownLegend(id);
    // A painted field: its band key, then any line marks of its own (the sea temperature's amber isotherms).
    const fk = FIELD_OF[id];
    // The fishing water: its bands in the beach rating's colours (layers/fishing.ts), then the zone chips.
    if (id === 'fishing') {
      const cols = rampCss(['--lv2', '--lv3', '--ac4'], HEAT_STEPS.length), n = cols.length;
      const ticks = [[0, L2('Fair', 'Regular')], [Math.round(n / 2), L2('Good', 'Buena')], [n, L2('Best', 'Mejor')]] as const;
      const zs = LEGEND.fishing.map((it, i) => ({ ...it, l: t(legendItemKey(id, i + 1) as Key) })).filter((it) => it.sw === 'zone');
      return `<div class="k-rampw"><div class="k-ramp" aria-hidden="true">${cols.map((c) => `<i style="--k:${c}"></i>`).join('')}</div><em class="k-mono"></em><div class="k-rampl k-rampl-ends k-mono">${ticks.map(([k, l]) => `<span style="left:${(k * 100) / n}%">${esc(l)}</span>`).join('')}</div></div>${zs.length ? `<ul class="k-lkeys">${zs.map((it) => `<li>${keySw(it)}<span>${esc(it.l)}</span></li>`).join('')}</ul>` : ''}`;
    }
    if (fk) {
      const ls = LEGEND[id as LayerId].map((it, i) => ({ ...it, l: t(legendItemKey(id, i + 1) as Key) })).filter((it) => it.sw === 'line');
      return fieldKey(fk) + (ls.length ? `<ul class="k-lkeys">${ls.map((it) => `<li>${keySw(it)}<span>${esc(it.l)}</span></li>`).join('')}</ul>` : '');
    }
    const items = LEGEND[id].map((it, i) => ({ ...it, l: t((SHORT_KEY.has(id) ? `legend.${id}.key.${i + 1}` : legendItemKey(id, i + 1)) as Key) })).filter((it) => it.sw !== 'none');
    return items.length ? `<ul class="k-lkeys">${items.map((it) => `<li>${keySw(it)}<span>${esc(it.l)}</span></li>`).join('')}</ul>` : '';
  };
  const explainLayer = (id: KmLayer) => {
    if (isOwnLayer(id)) return `<p class="k-lgnote">${esc(id === 'rating' ? L2('Each beach in the rating colour of the chosen activity, for the hour on the slider: the same score as the forecast page. Each beach carries a small chip with its headline number, and the chosen beach also shows its name; tap one for the spot card. Beaches too close together for their chips show as dots until you zoom in.', 'Cada playa en el color de su calificación para la actividad y la hora elegidas, igual que la página de pronóstico. Cada playa lleva una pequeña ficha con su número, y la playa elegida también su nombre; toque una para ver el spot. Las playas demasiado juntas se ven como puntos hasta que acerque el mapa.') : id === 'heat' ? L2('Each tracked reef in the colour of its NOAA Coral Reef Watch alert, the same as on the coral page. The number is the degree heating weeks: heat built up over 12 weeks. Alert 1 means bleaching is likely.', 'Cada arrecife en el color de su alerta de NOAA Coral Reef Watch, igual que en la página de coral. El número son las semanas-grado de calor: el calor acumulado en 12 semanas. Alerta 1 significa blanqueo probable.') : L2('Restoration sites in your private field log, drawn only as the 5 km cell they fall in, so nobody can read an exact site off the screen.', 'Sitios de restauración de su bitácora privada, dibujados solo como la celda de 5 km, para que nadie lea un sitio exacto en la pantalla.'))}</p>`;
    // What the layer is, plus its notes with no mark of their own; the marks themselves are the key under the row.
    // A painted field's colour meanings (its fills are bands on the key, not chips) join the notes.
    const notes = LEGEND[id].map((it, i) => (it.sw === 'none' || SHORT_KEY.has(id) || ((FIELD_OF[id] || id === 'fishing') && it.sw === 'fill') ? t(legendItemKey(id, i + 1) as Key) : '')).filter(Boolean);
    return `<div class="k-lgfull"><p>${esc(t(legendWhatKey(id) as Key))}</p>${notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>`;
  };
  const openInfo = new Set<KmLayer>();
  const composerHTML = () => {
    const o = order(), m = mode();
    const rest = offered(m).filter((x) => !o.includes(x));
    const cite = citer(settings.lang());
    return cite.finish(`<div class="k-preset"><div class="k-pl"><span class="k-pv">${esc(modeName(m))}</span><span class="k-pc">${isCustom(orders, m) ? L2('Mine', 'Mía') : L2('Standard', 'Estándar')}</span></div><button type="button" class="k-tbtn" data-reset ${isCustom(orders, m) ? '' : 'disabled'}>${L2('Reset', 'Restablecer')}</button></div>
    <p class="k-lc-cap k-mono"><span>${o.length} ${L2('on', 'activas')}</span><span>${L2('Top layer is drawn over the rest', 'La de arriba se dibuja encima')}</span></p>
    <ol class="k-lrows">${o
      .map((id, i) => {
        const a = ageOf(id), lg = legend(id);
        return `<li class="k-lrow" data-id="${id}"><button type="button" class="k-hdl" data-move="${id}" aria-label="${L2('Move', 'Mover')} ${esc(layerName(id))}: ${L2('arrow keys', 'flechas')}">${GRIP}</button><div class="k-lb"><div class="k-ln"><span class="k-ix">${String(i + 1).padStart(2, '0')}</span>${esc(layerName(id))}<button type="button" class="k-q" data-info="${id}" aria-expanded="${openInfo.has(id)}" aria-label="${L2('What this shows', 'Qué muestra')}">?</button></div><p class="k-lsrc k-mono">${esc(L2(layerDef(id).src.en, layerDef(id).src.es))}${cite.mark(...layerDef(id).cite)} · <span class="${a.cls}">${esc(a.txt)}</span></p>${lg ? `<div class="k-lg">${lg}</div>` : ''}${openInfo.has(id) ? `<div class="k-linfo">${explainLayer(id)}</div>` : ''}</div><button type="button" class="k-sw" role="switch" aria-checked="true" data-off="${id}" aria-label="${L2('Turn off', 'Apagar')} ${esc(layerName(id))}"></button></li>`;
      })
      .join('')}</ol>
    <div class="k-addh"><b>${L2('Add a layer', 'Añadir capa')}</b><span class="k-mono">${rest.length}</span></div>
    ${GROUPS.map((g) => {
      const ls = rest.filter((x) => layerDef(x).group === g);
      return ls.length ? `<p class="k-addg k-mono">${esc(groupName(g))}</p><div class="k-adds">${ls.map((x) => `<button type="button" class="k-addc" data-add="${x}">${PLUS}${esc(layerName(x))}</button>`).join('')}</div>` : '';
    }).join('')}`, L2('SOURCES', 'FUENTES'));
  };
  const bindComposer = (el: HTMLElement) => {
    el.querySelector('[data-reset]')?.addEventListener('click', () => {
      const { [mode()]: _drop, ...rest } = orders;
      orders = rest;
      saveOrders(storage, orders);
      applyLayers();
      renderComposer();
      renderReadouts();
    });
    el.querySelectorAll<HTMLElement>('[data-off]').forEach((b) => b.addEventListener('click', () => setOrder(toggleLayer(order(), b.dataset.off as KmLayer))));
    el.querySelectorAll<HTMLElement>('[data-add]').forEach((b) => b.addEventListener('click', () => setOrder(toggleLayer(order(), b.dataset.add as KmLayer))));
    el.querySelectorAll<HTMLElement>('[data-info]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.info as KmLayer;
        if (openInfo.has(id)) openInfo.delete(id);
        else openInfo.add(id);
        renderComposer();
      }),
    );
    // Reorder: drag the grip, or focus it and use the arrow keys.
    el.querySelectorAll<HTMLElement>('[data-move]').forEach((g) => {
      const id = g.dataset.move as KmLayer;
      g.addEventListener('keydown', (e) => {
        const by = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        if (!by) return;
        e.preventDefault();
        setOrder(moveLayer(order(), id, by));
        requestAnimationFrame(() => (document.querySelector(`.k-app [data-move="${id}"]`) as HTMLElement | null)?.focus());
      });
      g.addEventListener('pointerdown', (e) => {
        const row = g.closest<HTMLElement>('.k-lrow')!, list = row.parentElement!;
        const rows = [...list.children] as HTMLElement[];
        const tops = rows.map((r) => r.getBoundingClientRect());
        const i0 = rows.indexOf(row), y0 = e.clientY;
        let to = i0;
        g.setPointerCapture(e.pointerId);
        row.classList.add('k-dragging');
        const move = (ev: PointerEvent) => {
          const dy = ev.clientY - y0;
          row.style.transform = `translateY(${dy}px)`;
          const mid = tops[i0].top + tops[i0].height / 2 + dy;
          to = tops.findIndex((r) => mid < r.bottom);
          if (to < 0) to = rows.length - 1;
          rows.forEach((r, k) => {
            if (r === row) return;
            const shift = k > i0 && k <= to ? -tops[i0].height - 6 : k < i0 && k >= to ? tops[i0].height + 6 : 0;
            r.style.transform = shift ? `translateY(${shift}px)` : '';
          });
        };
        const up = () => {
          g.removeEventListener('pointermove', move);
          g.removeEventListener('pointerup', up);
          g.removeEventListener('pointercancel', up);
          rows.forEach((r) => (r.style.transform = ''));
          row.classList.remove('k-dragging');
          if (to !== i0) setOrder(moveLayer(order(), id, to - i0));
        };
        g.addEventListener('pointermove', move);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointercancel', up);
      });
    });
  };
  const renderComposer = () => {
    $('k-laycnt').textContent = String(order().length);
    if (WIDE.matches) {
      app.classList.toggle('k-lcol', lcol);
      railL.innerHTML = lcol
        ? `<button type="button" class="k-lfold" data-fold aria-expanded="false" aria-label="${L2('Show layers', 'Mostrar capas')}"><b aria-hidden="true">»</b><span>${L2('Layers', 'Capas')}</span><em>${order().length}</em></button>`
        : `<div class="k-sec-head"><h2>${L2('Layers', 'Capas')}</h2><p class="k-mono">${order().length} ${L2('on', 'activas')}</p><button type="button" class="k-lfoldx" data-fold aria-expanded="true" aria-label="${L2('Hide layers', 'Ocultar capas')}">«</button></div><div class="k-comp">${composerHTML()}</div>`;
      railL.querySelector('[data-fold]')?.addEventListener('click', () => {
        lcol = !lcol;
        put(storage, LCOL_KEY, lcol ? '1' : '0');
        renderComposer();
        renderLegMini();
        (railL.querySelector('[data-fold]') as HTMLElement | null)?.focus();
      });
      if (!lcol) bindComposer(railL);
    }
    if (S.sheet === 'layers') {
      shBody.innerHTML = `<div class="k-comp">${composerHTML()}</div>`;
      bindComposer(shBody);
    }
  };
  /**
   * The map key (Joseph 2026-11-16): on a desktop, one line for every layer drawn, so "what are these yellow dots" is answered
   * without a tap; on a phone the top layer's key, and a tap on any mark names it (tapKey below).
   */
  /** One line of the desktop key: the layer's marks as small swatches, its name, and what it shows (in full on hover). */
  const OWN_WHAT: Record<string, [string, string]> = {
    rating: ['Each beach in its rating colour for this activity', 'Cada playa en el color de su calificación'],
    heat: ['Each reef in its coral heat alert colour', 'Cada arrecife en el color de su alerta de calor'],
    private: ['Your logged sites, as 5 km cells', 'Sus sitios, como celdas de 5 km'],
  };
  const keyLine = (id: KmLayer) => {
    const lv = (ns: number[]) => ns.map((n) => `<i class="k-lmlv" style="--k:var(--lv${n})"></i>`).join('');
    let sw = '', what = '';
    if (isOwnLayer(id)) {
      sw = id === 'rating' ? lv([0, 1, 2, 3, 4]) : id === 'heat' ? lv([3, 2, 1, 0]) : `<i class="k-sw-glyph">${glyphSvg('lock', GLYPH_PAINT.ink, 14)}</i>`;
      what = L2(...(OWN_WHAT[id] ?? ['', '']));
    } else {
      const fk = FIELD_OF[id];
      const ramp = (cols: readonly string[]) => `<i class="k-lmramp" style="background:linear-gradient(90deg,${cols.join(',')})"></i>`;
      const marks = LEGEND[id].filter((it) => it.sw !== 'none' && !((fk || id === 'fishing') && it.sw === 'fill')).slice(0, 3).map(keySw).join('');
      sw = (fk ? ramp(bandCss(fk)) : id === 'fishing' ? ramp(rampCss(['--lv2', '--lv3', '--ac4'], 6)) : '') + marks;
      what = t(legendWhatKey(id) as Key);
    }
    const short = what.split(/(?<=[a-z0-9)])[.:;](\s|$)/i)[0];
    return `<li title="${esc(what)}"><span class="k-lkeys k-lmsw">${sw}</span><b>${esc(layerName(id))}</b><span class="k-lmwhat">${esc(short)}</span></li>`;
  };
  const renderLegMini = () => {
    const el = $('k-legmini');
    const on = order();
    if (WIDE.matches) {
      const ids = on.filter((id) => legend(id));
      el.hidden = !lcol || !ids.length;
      el.classList.add('k-legall');
      el.innerHTML = `<span class="k-mono">${L2('Key · every layer on', 'Clave · cada capa activa')}</span><ul class="k-lmall">${ids.map(keyLine).join('')}</ul>`;
      return;
    }
    el.classList.remove('k-legall');
    // SPEAR shows its own key alone (Joseph 2026-11-16: the beach ratings matter less there; the coast strip stays on the map).
    const top = S.act === 'spear' && on.includes('spear') ? 'spear' : on.find((id) => legend(id));
    el.hidden = !top;
    if (top) el.innerHTML = `<span class="k-mono">${esc(layerName(top))}</span>${legend(top)}<small class="k-lmtap">${L2('Tap any mark to name it', 'Toque una marca para ver qué es')}</small>`;
  };
  /**
   * Tap a mark (phone): a dot, line, ring or label drawn by a layer that is on, and a card names the layer, says what the mark
   * means and shows its key. Marks with their own card (lightning, storms, live observations, wave crests, rips, sargassum,
   * coral sites) and the depth contours (labelled on the map) keep theirs; a tap on open water keeps the WHAT'S HERE card.
   */
  const OWN_CARD = new Set(['ob-dot', 'ob-label', 'lt-dot', 'st-ring', 'st-label', 'wv-crest', 'rp-site', 'rp-coast', 'sg-mat', 'sg-beach', 'cs-sites']);
  const MARK_TYPES = new Set(['circle', 'symbol', 'line']);
  const tapCard = document.createElement('aside');
  tapCard.className = 'k-tapcard';
  tapCard.hidden = true;
  tapCard.setAttribute('role', 'dialog');
  stage.appendChild(tapCard);
  const tapKey = (pt: { x: number; y: number }) => {
    tapCard.hidden = true;
    const on = order().filter((id): id is LayerId => !isOwnLayer(id) && id !== 'depth');
    const styleIds: [string, LayerId][] = [];
    for (const l of map.getStyle()?.layers ?? []) {
      if (!MARK_TYPES.has(l.type) || OWN_CARD.has(l.id)) continue;
      const owner = on.find((id) => LAYERS.find((x) => x.id === id)?.mapPrefixes?.some((p) => l.id.startsWith(p)));
      if (owner && map.getLayoutProperty(l.id, 'visibility') !== 'none') styleIds.push([l.id, owner]);
    }
    if (!styleIds.length) return false;
    const B = 10;
    const own = map.queryRenderedFeatures([[pt.x - B, pt.y - B], [pt.x + B, pt.y + B]], { layers: [...OWN_CARD].filter((id) => map.getLayer(id)) });
    if (own.length) return false;
    const hits = map.queryRenderedFeatures([[pt.x - B, pt.y - B], [pt.x + B, pt.y + B]], { layers: styleIds.map(([id]) => id) });
    if (!hits.length) return false;
    // The top layer in the key's order wins where marks overlap.
    const ownerOf = (h: (typeof hits)[number]) => styleIds.find(([id]) => id === h.layer.id)![1];
    const hit = hits.sort((a, b) => on.indexOf(ownerOf(a)) - on.indexOf(ownerOf(b)))[0];
    const id = ownerOf(hit), p = (hit.properties ?? {}) as Record<string, unknown>;
    const items = LEGEND[id].filter((it) => it.sw !== 'none');
    const named = typeof p.sp === 'string' && p.sp ? titleCase(p.sp) : typeof p.label === 'string' && p.label && !/\n/.test(p.label) && p.label.length < 40 ? p.label : '';
    const title = named || (items.length === 1 ? sentence(t(legendItemKey(id, LEGEND[id].indexOf(items[0]) + 1) as Key)) : layerName(id));
    // The zone's reason, depth and nearest place: words in sentence case, the place (no digits, last) in title case.
    const parts = typeof p.where === 'string' && p.where ? p.where.split(' · ') : [];
    const where = parts.length ? `<p class="k-tcwhere">${esc(parts.map((x, i) => (i === parts.length - 1 && i > 0 && !/\d/.test(x) ? placeCase(x) : sentence(x).replace(/(\d) M\b/g, '$1 m'))).join(' · '))}</p>` : '';
    tapCard.innerHTML = `<div class="k-tchd"><span class="k-mono">${L2('You tapped', 'Tocó')} · ${esc(layerName(id))}</span><button type="button" class="k-ib" aria-label="${L2('Close', 'Cerrar')}">${CLOSE}</button></div><b class="k-tct">${esc(title)}</b>${where}<p>${esc(t(legendWhatKey(id) as Key))}</p>${legend(id)}`;
    tapCard.querySelector('button')!.addEventListener('click', () => (tapCard.hidden = true));
    tapCard.hidden = false;
    // Its own card replaces WHAT'S HERE for this tap.
    document.querySelectorAll<HTMLElement>('.help-card').forEach((c) => (c.hidden = true));
    return true;
  };

  /* ---------- readings ---------- */
  const uvLv = (u: number) => (u <= 2 ? 0 : u <= 5 ? 1 : u <= 7 ? 2 : u <= 10 ? 3 : 4);
  const uvWord = (u: number) => [L2('Low', 'Bajo'), L2('Moderate', 'Moderado'), L2('High', 'Alto'), L2('Very high · cover up', 'Muy alto · cúbrase'), L2('Extreme', 'Extremo')][uvLv(u)];
  const tideNow = (t: number) => {
    const s = tideState(LIMON_HARMONICS, t);
    const d0 = t - ((((t + tz * H) % 864e5) + 864e5) % 864e5);
    const curve = predictSeries(LIMON_HARMONICS, d0, d0 + 24 * H, H).h;
    const next = extrema(LIMON_HARMONICS, t, t + 30 * H);
    const hi = next.find((e) => e.type === 'high'), lo = next.find((e) => e.type === 'low');
    // Metres above mean sea level, with the live gauge's correction, as the forecast page reads it. `s.level` is only
    // where t sits between low and high (0..1) and must never be shown or added to a depth as metres.
    return { m: s.h + tideFixNow(t), rising: s.rising, curve, at: (t - d0) / H, hi, lo };
  };
  /** Local clock time to the minute. */
  const hm = (t: number) => {
    const x = local(t);
    return `${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}`;
  };
  const MOON_NAMES: [string, string][] = [['New moon', 'Luna nueva'], ['Waxing crescent', 'Creciente'], ['First quarter', 'Cuarto creciente'], ['Waxing gibbous', 'Gibosa creciente'], ['Full moon', 'Luna llena'], ['Waning gibbous', 'Gibosa menguante'], ['Last quarter', 'Cuarto menguante'], ['Waning crescent', 'Menguante']];
  const readings = (): Reading[] => {
    const c = map.getCenter(), t0 = ms(), h = d.here(c.lng, c.lat, t0), out: Reading[] = [];
    const o = order();
    const has = (id: KmLayer) => o.includes(id);
    /** The activity's own readings, never in CORAL (its layers say what it reads). */
    const act = (a: FcActivity) => !S.coral && S.act === a;
    if (S.coral && h.heat) out.push({ k: 'heat', l: 'DHW', v: n1(h.heat.dhw), u: '°C-wk', s: `${titleCase(h.heat.reef)}`, help: 'diveCoral', val: h.heat.dhw, src: L2('Satellite', 'Satélite'), cite: ['crw'] });
    if ((has('waves') || has('surf') || (has('rating') && act('surf'))) && h.swell && !h.land)
      out.push({ k: 'swell', l: L2('Swell', 'Oleaje'), v: n1(h.swell.hs), u: 'm', s: `${Math.round(h.swell.tp)} s · ${L2('from', 'de')} ${compass(h.swell.fromDeg)}`, deg: h.swell.fromDeg, trains: h.swell.trains, help: 'swell', src: L2('Wave model', 'Modelo de olas'), cite: ['ww3', 'wam'] });
    if ((has('wind') || act('sail') || act('surf')) && h.wind)
      out.push({ k: 'wind', l: L2('Wind', 'Viento'), v: n0(h.wind.kt), u: 'kt', s: `${compass(h.wind.fromDeg)}${fin(h.wind.gustKt) ? ` · ${L2('gusts', 'ráfagas')} ${n0(h.wind.gustKt)}` : ''}`, deg: h.wind.fromDeg, help: 'wind', src: L2('Weather models', 'Modelos del tiempo'), cite: ['ecmwf', 'gfs'] });
    if ((has('currents') || act('snorkel') || act('dive') || act('spear')) && h.current && !h.land)
      out.push({ k: 'current', l: L2('Current', 'Corriente'), v: n1(h.current.kt), u: 'kt', s: `${L2('sets', 'hacia')} ${compass(h.current.toDeg)}`, deg: h.current.toDeg, help: 'current', src: L2('Ocean model', 'Modelo del océano'), cite: ['smoc'] });
    // The old DIVE & SNORKEL rows (dive-hud.ts): bed surge at each depth, scored at 2 m for snorkel and 6 m for dive.
    if ((act('snorkel') || act('dive') || act('spear') || (has('reefs') && !S.coral)) && h.surge?.length && !h.land) {
      const at = act('dive') || act('spear') ? 6 : 2, sg = h.surge.find((x) => x.depth === at) ?? h.surge[0];
      const word = (b: string) => (b === 'DANGEROUS' ? L2('Dangerous', 'Peligroso') : b === 'SURGY' ? L2('Surgy', 'Con vaivén') : L2('Calm', 'Calmo'));
      out.push({ k: 'surge', l: L2('Surge', 'Vaivén'), v: n1(sg.uMs), u: 'm/s', s: `${word(sg.band)} · ${sg.depth} m · ±${n1(sg.excursionM)}`, help: 'surge', src: L2('By depth', 'Por prof.'), prof: h.surge, lv: sg.band === 'DANGEROUS' ? 0 : sg.band === 'SURGY' ? 2 : 4 });
    }
    // Surf at the water's edge (the breaker, cut by any reef flat in front): what a swimmer walks into.
    if ((act('swim') || act('snorkel') || act('surf')) && fin(h.entryM) && !h.land) {
      const sb = shoreBand(h.entryM);
      out.push({ k: 'entry', l: L2('Shore break', 'Rompiente en la orilla'), v: n1(h.entryM), u: 'm', s: sb === 'dump' ? L2('Dumping waves', 'Olas que revientan en seco') : sb === 'timed' ? L2('Time your entry', 'Espere el momento para entrar') : L2('Easy entry', 'Entrada fácil'), val: h.entryM, help: 'diveEntry', lv: sb === 'dump' ? 0 : sb === 'timed' ? 2 : 4 });
    }
    if ((has('sst') || has('fronts') || act('swim') || act('dive') || act('spear') || S.coral) && fin(h.sstC) && !h.land)
      out.push({ k: 'sst', l: L2('Water temp', 'Temp. agua'), v: n1(h.sstC), u: '°C', s: h.sstC >= SST_BANDS.WARM ? L2('Warm for here', 'Cálida para aquí') : h.sstC >= SST_BANDS.COOL ? L2('Mid · no wetsuit', 'Media · sin traje') : L2('Cooler for here', 'Fresca para aquí'), val: h.sstC, help: 'sst', src: L2('Satellite', 'Satélite'), cite: ['sst'] });
    if (has('chl') && fin(h.chl) && !h.land)
      out.push({ k: 'chl', l: L2('Chlorophyll', 'Clorofila'), v: h.chl >= 1 ? n1(h.chl) : h.chl.toFixed(2), u: 'mg/m³', s: h.chl >= 0.7 ? L2('Green water', 'Agua verde') : h.chl >= 0.2 ? L2('Green water edge', 'Borde de agua verde') : L2('Blue water', 'Agua azul'), val: h.chl, help: 'chl', src: L2('Satellite', 'Satélite'), cite: ['chl'] });
    if ((has('clarity') || act('snorkel') || act('dive') || act('spear')) && fin(h.visM) && !h.land)
      out.push({ k: 'clarity', l: L2('Visibility', 'Visibilidad'), v: h.visM >= 10 ? n0(h.visM) : n1(h.visM), u: 'm', s: h.visM < CLARITY_BANDS.fair ? L2('Poor · murky', 'Mala · turbia') : h.visM < CLARITY_BANDS.good ? L2('Fair · hazy', 'Regular · algo turbia') : L2('Good · clear', 'Buena · clara'), val: h.visM, help: 'vis', src: L2('Satellite', 'Satélite'), cite: ['kd490'] });
    if (has('sargassum') && h.sarg) out.push({ k: 'sarg', l: L2('Sargassum', 'Sargazo'), v: t(`sarg.level.${h.sarg.level}` as Key) || h.sarg.level, u: '', s: titleCase(h.sarg.beach), help: 'sargassum', lv: h.sarg.level === 'HIGH' ? 0 : h.sarg.level === 'MED' || h.sarg.level === 'MOD' ? 2 : 4 });
    if ((has('weather') || act('swim') || act('sail')) && h.rain)
      out.push({ k: 'rain', l: L2('Rain', 'Lluvia'), v: fin(h.rain.mmH) ? n1(h.rain.mmH) : '--', u: 'mm/h', s: fin(h.rain.pct) ? `${n0(h.rain.pct)}% ${L2('chance', 'prob.')}` : '', val: h.rain.mmH ?? 0, help: 'rain', src: L2('4 models', '4 modelos'), cite: ['models'] });
    // The old WEATHER rows: air, real feel, humidity and cloud.
    if ((has('weather') || act('swim') || act('sail') || act('fish')) && fin(h.airC))
      out.push({ k: 'air', l: L2('Air', 'Aire'), v: n0(h.airC), u: '°C', s: [fin(h.feelsC) ? `${L2('Feels', 'Sens.')} ${n0(h.feelsC)}°` : '', fin(h.humidityPct) ? `${n0(h.humidityPct)}% ${L2('humid', 'HR')}` : ''].filter(Boolean).join(' · '), val: h.cloudPct ?? 0, help: 'air', src: L2('Blend', 'Mezcla'), cite: ['models'] });
    if (has('lightning') && fin(h.lightningKm) && h.lightningKm < 60) out.push({ k: 'lightning', l: L2('Lightning', 'Rayos'), v: n0(h.lightningKm), u: 'km', s: h.lightningKm < 25 ? L2('Get out of the water', 'Salga del agua') : L2('Nearest flash', 'Rayo más cercano'), val: h.lightningKm, help: 'lightningNear', src: L2('Satellite', 'Satélite'), cite: ['glm'], ...(h.lightningKm < 25 ? { warn: 'bolt' as const } : {}) });
    if ((has('rip') || act('swim') || act('surf')) && h.rip) {
      const lv = h.rip.level === 'HIGH' ? 0 : h.rip.level === 'MOD' ? 2 : 4;
      out.push({ k: 'rip', l: L2('Rip risk', 'Resaca'), v: h.rip.level === 'HIGH' ? L2('High', 'Alta') : h.rip.level === 'MOD' ? L2('Mod', 'Mod') : L2('Low', 'Baja'), u: '', s: titleCase(h.rip.spot), lv, help: 'rip' });
    }
    if (has('fishing') || act('fish')) {
      const s = spot(), r = rate('fish', s, t0);
      if (r.score !== null) out.push({ k: 'bite', l: 'BITE', v: n0(r.score), u: '/100', s: titleCase(s.name), lv: r.level, help: 'bite' });
    }
    const td = tideNow(t0);
    if ((has('depth') || has('reefs') || act('dive') || act('spear') || act('snorkel') || act('fish')) && fin(h.depthM) && !h.land) {
      // With the tide on top, as the old WATER OVER REEF row read it (chart depth is to mean sea level).
      const wet = h.depthM + td.m;
      out.push({ k: 'depth', l: L2('Depth', 'Prof.'), v: h.depthM >= 10 ? n0(h.depthM) : n1(h.depthM), u: 'm', s: `${L2('With tide', 'Con marea')} ${wet >= 10 ? n0(wet) : n1(wet)} m · ${L2('not for navigation', 'no para navegar')}`, val: h.depthM, help: 'depth', src: L2('Seafloor map', 'Mapa del fondo'), cite: ['gebco'] });
    }
    if (has('zones') && h.zone) out.push({ k: 'zone', l: L2('Protected', 'Protegida'), v: '', u: '', s: h.zone, help: 'zone', lv: null });
    const turn = td.hi && td.lo ? (td.hi.t < td.lo.t ? td.hi : td.lo) : td.hi ?? td.lo;
    out.push({ k: 'tide', l: L2('Tide', 'Marea'), v: `${td.m >= 0 ? '+' : ''}${td.m.toFixed(2)}`, u: 'm', s: `${td.rising ? L2('Rising', 'Subiendo') : L2('Falling', 'Bajando')}${turn ? ` · ${turn.type === 'high' ? L2('high', 'alta') : L2('low', 'baja')} ${hm(turn.t)}` : ''}`, curve: td.curve, at: td.at, help: 'tide', src: L2('Exact', 'Exacta') });
    // The old SUN & MOON rows (astro-hud.ts): the day's light and the moon the bite tables run on.
    if (act('fish') || act('surf')) {
      const c0 = map.getCenter(), day = localDayStart(t0, tz), sun = sunTimes(day, c0.lat, c0.lng), mp = moonPhase(t0);
      out.push({ k: 'sky', l: L2('Sun and moon', 'Sol y luna'), v: n0(mp.illumination * 100), u: '%', s: L2(...MOON_NAMES[mp.name]), sun: [sun.sunrise ? hm(sun.sunrise) : '--', sun.sunset ? hm(sun.sunset) : '--'], val: mp.illumination, deg: mp.elongation, help: 'bwMoon', src: L2('Exact', 'Exacto') });
    }
    if (fin(h.uv)) out.push({ k: 'uv', l: 'UV', v: n0(h.uv), u: '', s: uvWord(h.uv), val: h.uv, help: 'uv', src: L2('Forecast', 'Pronóstico'), cite: ['cams'] });
    return out;
  };
  const llTxt = () => {
    const c = map.getCenter();
    return `${Math.abs(c.lat).toFixed(4)}° ${c.lat >= 0 ? 'N' : 'S'} · ${Math.abs(c.lng).toFixed(4)}° ${c.lng < 0 ? L2('W', 'O') : 'E'}`;
  };
  let lastR: Reading[] = [];
  const hereHTML = () =>
    `<button type="button" class="k-expand" data-expand>${svg('<path d="M3 3h5M3 3v5M17 17h-5M17 17v-5M3 3l5.5 5.5M17 17l-5.5-5.5"/>', '0 0 20 20')}<span>${L2('Expand data', 'Ampliar datos')}</span>${ARROW}</button><p class="k-here-ll k-mono"><span>${esc(llTxt())}</span><span>${L2('Layers on · tap to explain', 'Capas activas · toque para explicar')}</span></p><p class="k-here-note k-mono">${L2(`These readings are for the crosshair, not for ${spot().name}. Open a spot to read that place.`, `Estas lecturas son de la mira, no de ${spot().name}. Abra un punto para leer ese lugar.`)}</p><div class="k-tiles"></div><section class="k-dtls" hidden><h3 class="k-mono">${L2('In detail', 'En detalle')}<span>${L2('From Expand data', 'De Ampliar datos')}</span></h3><div class="k-dtlg"></div></section>`;
  /** The old map's finer rows for the activity (detail.ts), as compact cards under the tiles; each opens Expand data. */
  const condRoot = () => document.getElementById('cond-panel');
  const detailHTML = (x: Detail) =>
    x.towns
      ? `<button type="button" class="k-dtl k-dtl-towns k-lvn" data-k="${x.k}"><span class="k-dl k-mono">${esc(x.l)}</span><span class="k-dtw">${x.towns.map((tw) => `<span><i class="k-mono">${esc(titleCase(tw.name))}</i><b>${esc(tw.v)}</b></span>`).join('')}</span></button>`
      : `<button type="button" class="k-dtl k-lv${x.lv ?? 'n'}${x.lv === null ? ' k-plain' : ''}" data-k="${x.k}"><span class="k-dl k-mono">${esc(x.l)}</span><b class="k-dv${/\d/.test(x.v) && x.v.length <= 6 ? '' : ' k-dw'}">${esc(x.v)}${x.u ? `<small>${esc(x.u)}</small>` : ''}</b>${x.s ? `<span class="k-ds k-mono">${esc(x.s)}</span>` : ''}</button>`;
  const fillDetails = (el: HTMLElement) => {
    const sec = el.querySelector<HTMLElement>('.k-dtls');
    if (!sec) return;
    const rows = S.coral ? [] : readDetails(condRoot(), S.act);
    const html = rows.map(detailHTML).join('');
    sec.hidden = !rows.length;
    const g = sec.querySelector<HTMLElement>('.k-dtlg')!;
    if (g.dataset.sig !== html) (g.innerHTML = html), (g.dataset.sig = html);
  };
  const renderDetails = () => {
    if (WIDE.matches) {
      const sec = railR.querySelector<HTMLElement>('#k-heresec');
      if (sec) fillDetails(sec);
    }
    if (S.sheet === 'here') fillDetails(shBody);
  };
  const accent = () => (S.coral ? 't-coral' : `t-${S.act}`);
  const fillTiles = (el: HTMLElement) => {
    const box = el.querySelector<HTMLElement>('.k-tiles');
    if (!box) return;
    const cite = citer(settings.lang());
    const done = cite.finish(lastR.map((r) => tileHTML(r, cite)).join(''), L2('SOURCES', 'FUENTES'));
    const cut = done.indexOf('<section class="gd-blk gd-fn">');
    box.innerHTML = cut < 0 ? done : done.slice(0, cut);
    // The tiles' sources, numbered in the order the tiles read, in a list under them.
    let list = box.nextElementSibling as HTMLElement | null;
    if (!list?.classList.contains('k-tsrc')) (list = document.createElement('div')), (list.className = 'k-tsrc'), box.after(list);
    list.innerHTML = cut < 0 ? '' : done.slice(cut);
    box.querySelectorAll<HTMLElement>('.k-tile').forEach((tl, i) =>
      tl.addEventListener('click', () => {
        const r = lastR[i];
        if (r?.help) d.explain(r.l, r.help);
      }),
    );
    drawTiles(box, lastR, accent());
    fillDetails(el);
    const ll = el.querySelector('.k-here-ll span');
    if (ll) ll.textContent = llTxt();
  };
  let readQueued = false;
  const renderReadouts = () => {
    if (readQueued) return;
    readQueued = true;
    requestAnimationFrame(() => {
      readQueued = false;
      if (d.forecast.isOpen()) return;
      lastR = readings();
      $('k-readbar').innerHTML = barHTML(lastR.slice(0, 7));
      if (WIDE.matches) {
        const sec = railR.querySelector<HTMLElement>('#k-heresec');
        if (sec) fillTiles(sec);
      }
      if (S.sheet === 'here') fillTiles(shBody);
    });
  };
  $('k-readbar').addEventListener('click', () => openSheet('here'));

  /* ---------- spot card ---------- */
  const reasonsOf = (r: FcRead): string[] => {
    if (r.score === null) return [];
    if (r.surf) return [`${L2('Wind', 'Viento')} ${t(`fc.wind.${r.surf.windKind}` as Key)}`, `${n0(r.surf.tp)} s · ${compass(r.surf.dir)}`, ...(r.surf.tideKind !== 'none' ? [`${L2('Tide', 'Marea')} ${t(`fc.tide.${r.surf.tideKind}` as Key)}`] : [])];
    if (r.fish) return r.fish.reasons.slice(0, 3).map((k) => t(`bite.r.${k}` as Key));
    if (r.water) return r.water.reasons.slice(0, 3).map((k) => t(`dive.r.${k}` as Key));
    if (r.swim) return (r.swim as unknown as { reasons?: string[] }).reasons?.slice(0, 3).map((k) => t(`swim.r.${k}` as Key)) ?? [];
    if (r.sail) return [fin(r.sail.windKt) ? `${n0(r.sail.windKt)} kt ${fin(r.sail.fromDeg) ? compass(r.sail.fromDeg) : ''}` : '', fin(r.sail.gustKt) ? `${L2('gusts', 'ráfagas')} ${n0(r.sail.gustKt)}` : '', fin(r.sail.swellM) ? `${L2('swell', 'oleaje')} ${n1(r.sail.swellM)} m` : ''].filter(Boolean);
    return [];
  };
  const minis = (s: Spot, r: FcRead, t0: number) => {
    const h = d.here(s.lngLat[0], s.lngLat[1], t0), td = tideNow(t0);
    const C: Record<string, [string, string]> = {
      swell: [L2('Swell', 'Oleaje'), h.swell ? `${n1(h.swell.hs)}<small>m</small>` : '--'],
      wind: [L2('Wind', 'Viento'), h.wind ? `${n0(h.wind.kt)}<small>kt ${compass(h.wind.fromDeg)}</small>` : '--'],
      tide: [L2('Tide', 'Marea'), `${td.m >= 0 ? '+' : ''}${td.m.toFixed(2)}<small>m</small>`],
      uv: ['UV', fin(h.uv) ? n0(h.uv) : '--'],
      water: [L2('Water', 'Agua'), fin(r.water?.sstC) ? `${n1(r.water!.sstC!)}°` : fin(h.sstC) ? `${n1(h.sstC)}°` : '--'],
      current: [L2('Current', 'Corriente'), fin(r.water?.currentKt) ? `${n1(r.water!.currentKt!)}<small>kt</small>` : h.current ? `${n1(h.current.kt)}<small>kt</small>` : '--'],
      moon: [L2('Moon', 'Luna'), r.fish ? `${n0(r.fish.moonIllum * 100)}<small>%</small>` : '--'],
      rip: [L2('Rip', 'Resaca'), h.rip ? (h.rip.level === 'HIGH' ? L2('High', 'Alta') : h.rip.level === 'MOD' ? 'Mod' : L2('Low', 'Baja')) : '--'],
      vis: [L2('Visibility', 'Visib.'), fin(r.water?.visM) ? `${n0(r.water!.visM!)}<small>m</small>` : '--'],
      surge: [L2('Surge', 'Vaivén'), fin(r.water?.surgeMs) ? `${n1(r.water!.surgeMs!)}<small>m/s</small>` : '--'],
      gust: [L2('Gusts', 'Ráfagas'), fin(r.sail?.gustKt) ? `${n0(r.sail!.gustKt!)}<small>kt</small>` : '--'],
      sea: [L2('Swell', 'Oleaje'), fin(r.sail?.swellM) ? `${n1(r.sail!.swellM!)}<small>m</small>` : '--'],
      air: [L2('Air', 'Aire'), fin(h.airC) ? `${n0(h.airC)}°` : '--'],
    };
    const pick = { surf: ['swell', 'wind', 'tide', 'uv'], fish: ['tide', 'moon', 'wind', 'uv'], swim: ['rip', 'water', 'air', 'uv'], snorkel: ['vis', 'current', 'water', 'uv'], dive: ['vis', 'surge', 'water', 'uv'], spear: ['vis', 'surge', 'current', 'uv'], sail: ['wind', 'gust', 'sea', 'uv'] }[S.act];
    return `<div class="k-minis">${pick.map((k) => `<div><span>${C[k][0]}</span><b>${C[k][1]}</b></div>`).join('')}</div>`;
  };
  const segs = (share: number | null) => `<span class="k-segs" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${share !== null && i < Math.round(share * 10) ? 'k-f' : ''}"></i>`).join('')}</span>`;
  /**
   * The week's best window, exactly as the FORECAST page finds it (WATCH's planner): daylight runs from each day's
   * sunrise to its sunset (PLAN 7.70, Joseph 2026-11-11: "use the new times based off ... active sunrise and sunset").
   */
  let planKey = '';
  let planV: Plan | null = null;
  const planFor = (a: FcActivity, sp: Spot): Plan | null => {
    const k = `${a}|${sp.name}|${d.version()}|${Math.floor(Date.now() / 6e5)}`;
    if (k !== planKey) {
      planKey = k;
      try {
        planV = daysAt(d.fc, a, sp, Date.now());
      } catch {
        planV = null;
      }
    }
    return planV;
  };
  const bestWindow = () => {
    const a: FcActivity = S.coral ? 'snorkel' : S.act, sp = S.coral ? reefSpot(reef()) : spot();
    return bestTimeView(planFor(a, sp), (t1) => rate(a, sp, t1), ms(), false);
  };
  const spotCardHTML = () => {
    const s = spot(), t0 = ms(), r = rate(S.act, s, t0), hl = headline(r), dd = dateOf(t0);
    const strip = Array.from({ length: 12 }, (_, i) => rate(S.act, s, t0 + i * H).level);
    const bt = bestWindow();
    const lv = r.level === null ? 'n' : r.level;
    // The score beside the word only where the big number is not already it (as the forecast hero).
    const rs = r.score === null || r.activity === 'fish' || r.activity === 'swim' ? '' : `${n0(r.score)}<small>/100</small>`;
    // The words line under the number (mockup G: "Waist to chest high, clean"): the forecast hero's own words.
    const words = sentence(heroWords(r, { plan: planFor(S.act, s), ms: t0 }));
    return `<article class="k-scard k-lv${lv}" aria-label="${esc(titleCase(s.name))}">
      <div class="k-sm k-mono"><span>${esc(modeName(S.act))} · ${L2('Spot', 'Sitio')}</span><span>${time.offsetH() === 0 ? L2('Now', 'Ahora') : `${dd.wd} ${dd.n}`} · ${hhmm(t0)}</span></div>
      <h3>${esc(titleCase(s.name))}</h3>
      <div class="k-big">${esc(hl.value)}<span class="k-u">${esc(hl.unit)}</span></div>
      ${words ? `<p class="k-w">${esc(words)}</p>` : ''}
      <div class="k-rt"><span class="k-rw">${esc(levelWord(r.level))}</span>${rs ? `<span class="k-rs">${rs}</span>` : ''}${segs(r.share)}</div>
      <ul class="k-chips k-mono">${reasonsOf(r).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${minis(s, r, t0)}
      <div class="k-strip" aria-hidden="true">${strip.map((l) => `<i style="height:${l === null ? 8 : 24 + l * 19}%"></i>`).join('')}</div><div class="k-strip-l k-mono"><span>${time.offsetH() === 0 ? L2('Now', 'Ahora') : hhmm(t0)}</span><span>+12 h</span></div>
      <div class="k-sbest"><span class="k-mono">${esc(bt.kind === 'hidden' ? L2('Best time this week', 'Mejor momento de la semana') : bt.label)}</span><span class="k-bw">${esc(bt.kind === 'hidden' ? '--' : bt.when)}</span><span class="k-bv">${esc(bt.value)}</span></div>
    </article>
    <div class="k-sacts"><button type="button" class="k-go" data-go="fc"><span>${L2('Open forecast', 'Abrir pronóstico')}</span>${ARROW}</button><button type="button" class="k-go2" data-go="centre">${L2('Centre', 'Centrar')}</button>${d.openGuide ? `<button type="button" class="k-go2" data-go="guide">${L2('Species', 'Especies')}</button>` : ''}</div>${fishModeHTML()}${linksHTML()}${boatLine(s, t0)}`;
  };
  /**
   * EAT or SPORT for the fish map (PLAN 7.120, Joseph 2026-11-16): which fish the heat and the circled zones are for. The
   * spot's rating above stays the eating-fish one.
   */
  const fishModeHTML = () => {
    if (S.act !== 'fish' || !d.fishMode) return '';
    const m = d.fishMode.get();
    const b = (v: 'eat' | 'sport', l: string) => `<button type="button" data-fmode="${v}" aria-pressed="${m === v}">${esc(l)}</button>`;
    return `<div class="k-fmode"><span class="k-mono">${L2('Map shows', 'El mapa muestra')}</span><div class="k-seg">${b('eat', L2('Fish to eat', 'Peces para comer'))}${b('sport', L2('Sport fish', 'Pesca deportiva'))}</div>${m === 'sport' ? `<p class="k-mono">${L2('Catch and release. These fish are not safe or not good to eat.', 'Pesque y suelte. Estos peces no son seguros o no son buenos para comer.')}</p>` : ''}</div>`;
  };
  /**
   * Clear, labelled links for the water activities: this activity's own field notes (its tabs only, most specific first),
   * first aid, identify what you see, and (fish, spear) kill, bleed, ice.
   */
  const NT_LINK: Record<NtAct, [string, string]> = {
    fish: ['Field notes: rigs, release, rules, cooking', 'Notas de campo: aparejos, liberar, reglas, cocina'],
    spear: ['Field notes: rules, rigs, cooking, dive safety', 'Notas de campo: reglas, aparejos, cocina, buceo'],
    surf: ['Field notes: etiquette, wave size, rips', 'Notas de campo: etiqueta, tamaño de ola, resacas'],
    snorkel: ['Field notes: dive safety, park rules, rips', 'Notas de campo: buceo, reglas de parques, resacas'],
    dive: ['Field notes: dive safety, park rules, rips', 'Notas de campo: buceo, reglas de parques, resacas'],
    swim: ['Field notes: rips, emergencies', 'Notas de campo: resacas, emergencias'],
    sail: ['Field notes: rips, emergencies', 'Notas de campo: resacas, emergencias'],
  };
  const linksHTML = () => {
    const act = S.act as string;
    if (!isNtAct(act)) return '';
    const idAct = act === 'fish' || act === 'dive' || act === 'spear' || act === 'snorkel';
    const nt = `<a class="k-link" href="${notesHash(undefined, act)}"><span>${L2(...NT_LINK[act])}</span>${ARROW}</a><a class="k-link" href="${notesHash('aid', act)}"><span>${L2('Stung or bitten? First aid', '¿Picadura o mordida? Primeros auxilios')}</span>${ARROW}</a>`;
    const dp = act === 'fish' || act === 'spear' ? `<a class="k-link" href="#dispatch"><span>${L2('Kill, bleed, ice your catch', 'Mata, desangra y enfría tu pesca')}</span>${ARROW}</a>` : '';
    const id = idAct && d.openGuide ? `<button type="button" class="k-link" data-go="identify"><span>${L2('Identify what you see', 'Identifica lo que ves')}</span>${ARROW}</button>` : '';
    return `<div class="k-links">${nt}${id}${dp}</div>`;
  };
  /**
   * Fish and sail: the next boat window from this spot (mockup G: "Boat window · Wed 11 · 05:30–10:00 · Small boat OK"),
   * the same GO hours as the BOAT drawer's NEXT GO WINDOW (boat/window.ts) for the vessel in Settings.
   */
  let bwKey = '', bwHTML = '';
  const boatLine = (s: Spot, t0: number) => {
    if (S.act !== 'fish' && S.act !== 'sail') return '';
    const v = d.settings.vessel(), key = `${s.name}|${Math.floor(t0 / H)}|${v}|${d.version()}`;
    if (key === bwKey) return bwHTML;
    bwKey = key;
    const hours = hourlyVerdicts(d.fc.env, v, s.lngLat[0], s.lngLat[1], t0, 48);
    const known = hours.some((x) => x.verdict !== null);
    const w = known ? nextWindow(hours, t0) : null;
    const vw = v === 'yacht' ? L2('Yacht OK', 'Velero OK') : v === 'dinghy' ? L2('Dinghy OK', 'Panga OK') : L2('Small boat OK', 'Bote OK');
    const dd = w && dateOf(w.now ? t0 : w.startMs), de = w && dateOf(w.endMs - 1);
    // A window that runs past the day names the day it ends; one still open where the 48 h look-ahead stops has no end to give.
    const open = !!w && w.endMs >= t0 + 47 * H;
    const end = w ? `${de!.n !== dd!.n ? `${de!.wd} ${de!.n} ` : ''}${hhmm(w.endMs)}` : '';
    const span = !w ? '' : open ? (w.now ? L2('all 48 h ahead', 'las próximas 48 h') : `${L2('from', 'desde')} ${hhmm(w.startMs)}`) : `${hhmm(w.now ? t0 : w.startMs)}–${end}`;
    // GO hours are sea and weather only: say when the window runs through the dark (review 2026-11-16), so nobody plans a night trip by mistake.
    let dark = false;
    if (w) for (let t = Math.max(t0, w.startMs); t < w.endMs && !dark; t += H) dark = sunAltitude(t + H / 2, s.lngLat[1], s.lngLat[0]) < -0.833;
    bwHTML = !known
      ? ''
      : `<p class="k-bwin k-mono"><span>${L2('Boat window', 'Ventana de bote')}</span>${w ? `<b>${w.now ? L2('Now', 'Ahora') : `${dd!.wd} ${dd!.n}`} · ${span}</b><span>${vw}${dark ? ` · ${L2('includes night hours', 'incluye horas de noche')}` : ''}</span>` : `<b>${L2('None in 48 h', 'Ninguna en 48 h')}</b>`}</p>`;
    return bwHTML;
  };
  const coralCardHTML = () => {
    const rf = reef(), lv = reefLevel(rf);
    if (!rf) return `<p class="k-lgnote">${L2('Reef heat data is loading.', 'Cargando el calor de los arrecifes.')}</p>`;
    const now = Date.now();
    const seasons = nextSeasons(spawnWindows(now, 400, rf.lngLat[1], rf.lngLat[0]), now).slice(0, 3);
    const fmt = (x: number) => local(x).toLocaleDateString(settings.lang() === 'es' ? 'es-CR' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const cells = d.coralSites().length;
    const vs = reefSpot(rf), vr = rate('snorkel', vs, ms());
    return `<article class="k-scard k-lv${lv ?? 'n'}" aria-label="${esc(titleCase(rf.name))}">
      <div class="k-sm k-mono"><span>Coral · ${L2('Reef', 'Arrecife')}</span><span>${rf.day ? fmt(rf.day) : ''}</span></div>
      <h3>${esc(titleCase(rf.name))}</h3>
      <div class="k-big">${fin(rf.dhw) ? n1(rf.dhw) : '--'}<span class="k-u">°C-${L2('wk', 'sem')}</span></div>
      <p class="k-w">${L2('Degree heating weeks', 'Semanas-grado de calor')}</p>
      <div class="k-rt"><span class="k-rw">${esc(heatWord(rf))}</span></div>
      <ul class="k-chips k-mono">${fin(rf.sstC) ? `<li>SST ${n1(rf.sstC)}°</li>` : ''}${fin(rf.anomaly) ? `<li>${L2('Anomaly', 'Anomalía')} ${rf.anomaly >= 0 ? '+' : ''}${n1(rf.anomaly)}°</li>` : ''}${fin(rf.mudWeeks) ? `<li>${L2('Mud weeks', 'Semanas turbias')} ${n1(rf.mudWeeks)}</li>` : ''}</ul>
      <div class="k-minis"><div><span>${L2('Visit', 'Visita')}</span><b>${esc(levelWord(vr.level))}</b></div><div><span>${L2('Visibility', 'Visib.')}</span><b>${fin(vr.water?.visM) ? `${n0(vr.water!.visM!)}<small>m</small>` : '--'}</b></div><div><span>${L2('Water', 'Agua')}</span><b>${fin(vr.water?.sstC) ? `${n1(vr.water!.sstC!)}°` : '--'}</b></div><div><span>UV</span><b>${fin(vr.water?.uv) ? n0(vr.water!.uv!) : '--'}</b></div></div>
      <div class="k-spawn"><p class="k-mono">${L2('Spawning, predicted (local time)', 'Desove previsto (hora local)')}</p>${seasons.map((x) => `<div class="k-row"><b>${esc(titleCase(t(`spawn.${x.id}` as Key)))}</b><span>${fmt(x.first.from)}–${fmt(x.last.from)}</span><em>${hhmm(x.first.from)}–${hhmm(x.first.to)}${x.now ? ` · ${L2('tonight', 'esta noche')}` : ''}</em></div>`).join('')}</div>
    </article>
    <div class="k-private">${LOCK}<div><b>${cells ? `${cells} ${L2(cells === 1 ? 'logged site is private.' : 'logged sites are private.', cells === 1 ? 'sitio registrado es privado.' : 'sitios registrados son privados.')}` : L2('Your field log is private.', 'Su bitácora es privada.')}</b> ${L2('Sites show only as the 5 km cell they sit in; the exact spots live on this device.', 'Los sitios se ven solo como la celda de 5 km; los puntos exactos quedan en este dispositivo.')}</div></div>
    <div class="k-sacts"><button type="button" class="k-go" data-go="coralpage"><span>${L2('Open coral page', 'Abrir página de coral')}</span>${ARROW}</button><button type="button" class="k-go2" data-go="centre">${L2('Centre', 'Centrar')}</button></div>`;
  };
  const bindCard = (el: HTMLElement) => {
    el.querySelectorAll<HTMLElement>('[data-fmode]').forEach((b) =>
      b.addEventListener('click', () => {
        d.fishMode?.set(b.dataset.fmode as 'eat' | 'sport');
        renderSpot();
      }),
    );
    bindGo(el);
  };
  const bindGo = (el: HTMLElement) =>
    el.querySelectorAll<HTMLElement>('[data-go]').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.go;
        if (k === 'centre') {
          const at = S.coral ? reef()?.lngLat : spot().lngLat;
          if (at) map.flyTo({ center: at, zoom: Math.max(map.getZoom(), 12.5) });
          if (!WIDE.matches) closeSheet();
        } else if (k === 'fc') d.forecast.open({ spot: spot().name, activity: S.act });
        else if (k === 'coralpage') d.openCoralPage(reef()?.id ?? 'cahuita');
        else if (k === 'guide') d.openGuide?.(S.act === 'fish' || S.act === 'spear' ? 'edible' : undefined);
        else if (k === 'identify') d.openGuide?.('identify');
      }),
    );
  const inspectorHTML = () =>
    `<div class="k-sec-head"><h2>${S.coral ? L2('Reef', 'Arrecife') : L2('Spot', 'Sitio')}</h2><p class="k-mono">${L2('Tap a pin to change', 'Toque un punto')}</p></div><div id="k-cardbox">${S.coral ? coralCardHTML() : spotCardHTML()}</div><section id="k-heresec" class="k-heresec"><div class="k-sec-head"><h2>${L2('Under the crosshair', 'Bajo la mira')}</h2></div>${hereHTML()}</section>`;
  /**
   * The fish bar, on the map itself whenever FISH is on (Joseph 2026-11-16, option A of the mockups; the switches were
   * only in the spot card and the Expand data panel): EAT or SPORT and SHORE or BOAT, the fish with arrows, its first
   * best window today, the best spots near the crosshair, and + Catch to log one from the shore or a boat (PLAN 7.143).
   */
  const renderFishSw = () => {
    const el = $('k-fishsw'), fm = d.fishMode;
    const on = !!fm && (S.act === 'fish' || (S.act === 'spear' && !!fm.spearInfo)) && !S.coral;
    el.hidden = !on;
    if (!on || !fm) return (el.innerHTML = '');
    if (S.act === 'spear') return (el.innerHTML = spearBarHTML());
    const m = fm.get(), r = fm.reach?.() ?? 'all', fi = fm.info?.() ?? null;
    const b = (attr: string, v: string, cur: string, l: string) => `<button type="button" ${attr}="${v}" aria-pressed="${v === cur}">${esc(l)}</button>`;
    // The window on now or next at the slider time: one that has already ended today would send people out too late.
    const at = time.validMs(), best = fi?.wins.find((w) => w.end > at);
    el.innerHTML = `<div class="k-fbrow"><div class="k-seg" role="group" aria-label="${L2('Fish to eat or sport fish', 'Peces para comer o pesca deportiva')}">${b('data-fsw', 'eat', m, L2('Eat', 'Comer'))}${b('data-fsw', 'sport', m, L2('Sport', 'Deporte'))}</div>${
      fm.setReach ? `<div class="k-seg" role="group" aria-label="${L2('Where you fish from', 'Desde dónde pesca')}">${b('data-freach', 'all', r, L2('All', 'Todo'))}${b('data-freach', 'shore', r, L2('Shore', 'Orilla'))}${b('data-freach', 'boat', r, L2('Boat', 'Bote'))}</div>` : ''
    }</div>${fi && fm.step ? `<div class="k-fbrow">
      <span class="k-fpick"><button type="button" data-fstep="-1" aria-label="${L2('Previous fish', 'Pez anterior')}">‹</button><b>${esc(fi.name)}</b><button type="button" data-fstep="1" aria-label="${L2('Next fish', 'Siguiente pez')}">›</button></span>
      <button type="button" class="k-fchip k-fbest" data-fsheet="times">${best ? `${best.start <= at ? L2('Best now to', 'Mejor ahora hasta') + ' ' + esc(best.range.split('–')[1]) : `${L2('Best', 'Mejor')} ${esc(best.range)}`}` : fi?.wins.length ? L2('Best times are over today', 'Ya pasaron las mejores horas') : L2('No standout time today', 'Ninguna hora destaca hoy')}</button></div>
      <div class="k-fbrow"><button type="button" class="k-fchip" data-fsheet="spots">${svg('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>')}${L2('Best spots', 'Mejores sitios')}</button>${fm.logCatch ? `<button type="button" class="k-fchip" data-fsheet="catch">${svg('<path d="M12 5v14M5 12h14"/>')}${L2('Catch', 'Captura')}</button>` : ''}</div>` : ''}`;
  };
  /**
   * SPEAR's bar (Joseph 2026-11-16, "shouldn't spear get similar items?"): the target (every spear fish, one of them, or lobster
   * or octopus by hand), the spot's best spear window, the best open water near the crosshair, and + Catch.
   */
  const spearName = (id: SpeciesId | null) => (id ? t(`fish.${id}` as Key) : L2('All spear fish', 'Todos los peces'));
  const spearBarHTML = () => {
    const si = d.fishMode?.spearInfo?.() ?? null;
    if (!si) return '';
    const bt = bestWindow();
    const hand = si.target === 'lobster' || si.target === 'octopus';
    return `<div class="k-fbrow"><span class="k-fpick"><button type="button" data-sstep="-1" aria-label="${L2('Previous target', 'Objetivo anterior')}">‹</button><b>${esc(spearName(si.target))}</b><button type="button" data-sstep="1" aria-label="${L2('Next target', 'Siguiente objetivo')}">›</button></span>${
      hand ? `<span class="k-fchip k-fhand">${L2('By hand, not the spear gun', 'A mano, no con arpón')}</span>` : ''
    }</div>
      <div class="k-fbrow"><button type="button" class="k-fchip k-fbest" data-fsheet="spot">${bt.kind === 'hidden' || bt.kind === 'none' ? L2('No good window this week', 'Sin buena ventana esta semana') : `${L2('Best', 'Mejor')} ${esc(bt.when)}`}</button></div>
      <div class="k-fbrow"><button type="button" class="k-fchip" data-fsheet="spearspots">${svg('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>')}${L2('Best spots', 'Mejores sitios')}</button>${d.fishMode?.logCatch ? `<button type="button" class="k-fchip" data-fsheet="catch">${svg('<path d="M12 5v14M5 12h14"/>')}${L2('Catch', 'Captura')}</button>` : ''}</div>`;
  };
  const spearSheetHTML = (si: SpearInfo) => `<p class="k-mono k-fcap">${L2('Open water for', 'Agua abierta para')} ${esc(spearName(si.target).toLowerCase())} · 3–15 m · ${L2('parks and closed water left out', 'sin parques ni aguas cerradas')}</p><ul class="k-fspots">${
    si.spots.length
      ? si.spots.map((r) => `<li><button type="button" class="k-fspot" data-sfly="${r.lng},${r.lat}"><span class="k-fn">${r.n + 1}</span><span><b>${esc(r.place ? placeCase(r.place) : L2('Unnamed spot', 'Sitio sin nombre'))}</b><small>${esc(sentence(r.line))}</small>${tags(r.why)}</span>${ARROW}</button></li>`).join('')
      : `<li><span>${L2('No open spear water for this target within 15 km of the crosshair. Move the map and look again.', 'No hay agua abierta para este objetivo a 15 km de la mira. Mueva el mapa y mire otra vez.')}</span></li>`
  }</ul>`;
  $('k-fishsw').addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-fsw],[data-freach],[data-fstep],[data-fsheet],[data-sstep]');
    if (!t || !d.fishMode) return;
    if (t.dataset.sstep) {
      const si = d.fishMode.spearInfo?.();
      if (!si) return;
      const list: (SpeciesId | null)[] = [null, ...si.targets];
      const k = list.indexOf(si.target);
      d.fishMode.setSpearTarget?.(list[(k + Number(t.dataset.sstep) + list.length) % list.length]);
      return renderFishSw();
    }
    if (t.dataset.fsheet === 'spot') return openSheet('spot');
    if (t.dataset.fsheet === 'spearspots') return openSheet('spear');
    if (t.dataset.fsheet === 'catch') catchAs = null;
    if (t.dataset.fsheet) return openSheet(t.dataset.fsheet === 'catch' ? 'catch' : 'fish', t.dataset.fsheet);
    if (t.dataset.fstep) return d.fishMode.step?.(Number(t.dataset.fstep));
    if (t.dataset.fsw) d.fishMode.set(t.dataset.fsw as 'eat' | 'sport');
    else d.fishMode.setReach?.(t.dataset.freach as 'all' | 'shore' | 'boat');
    renderFishSw();
    renderSpot();
  });
  /** The fishing panel's capitals as plain words: reasons become small tags, each in sentence case. */
  const tags = (why: string) => (why ? `<span class="k-ftags">${why.split(' · ').map((w) => `<span>${esc(sentence(w))}</span>`).join('')}</span>` : '');
  const placeCase = (x: string) => titleCase(x).replace(/\bKm\b/g, 'km').replace(/\b(De|Del|La|El)\b/g, (w) => w.toLowerCase());
  /** The fish sheet: today's BITE strip and every best window, then the best spots near the crosshair (tap to fly). */
  const fishSheetHTML = (fi: FishInfo) => {
    const bars = fi.strip.bars;
    const hr = (h: number) => `<span style="left:${(h / 24) * 100}%">${String(h).padStart(2, '0')}</span>`;
    const strip = bars.length
      ? `<div class="k-fstrip" role="img" aria-label="${L2('Bite through the day, best windows in green', 'Picada durante el día, mejores horas en verde')}">${bars.map((x) => `<i class="${x.win ? 'k-win' : ''}" style="height:${x.pct}%"></i>`).join('')}</div><div class="k-fhrs">${[0, 6, 12, 18].map(hr).join('')}</div>`
      : '';
    const wins = fi.wins.length
      ? fi.wins.map((w) => `<li class="${w.end <= time.validMs() ? 'k-past' : ''}"><b>${esc(w.range)}${w.end <= time.validMs() ? ` <small>${L2('Over', 'Pasó')}</small>` : w.start <= time.validMs() ? ` <small>${L2('Now', 'Ahora')}</small>` : ''}</b>${tags(w.why)}</li>`).join('')
      : `<li><span>${L2('No hour today stands out. Bites are spread through the day.', 'Ninguna hora destaca hoy. La picada se reparte en el día.')}</span></li>`;
    const spots = fi.spots.length
      ? fi.spots.map((r) => `<li><button type="button" class="k-fspot${r.on ? ' k-on' : ''}" data-fly="${r.n}"><span class="k-fn">${r.n + 1}</span><span><b>${esc(r.place ? placeCase(r.place) : L2('Unnamed spot', 'Sitio sin nombre'))}</b><small>${esc(sentence(r.line))}</small>${tags(r.why)}</span>${ARROW}</button></li>`).join('')
      : `<li><span>${L2('No good water for this fish within 15 km of the crosshair. Move the map and look again.', 'No hay buena agua para este pez a 15 km de la mira. Mueva el mapa y mire otra vez.')}</span></li>`;
    return `<section class="k-fsec" id="k-ftimes"><p class="k-mono k-fcap">${L2('Best times today', 'Mejores horas hoy')}${fi.bite !== null ? ` · ${L2('Bite now', 'Picada ahora')} ${fi.bite}/100` : ''}</p>${strip}<ul class="k-fwins">${wins}</ul></section>
      <section class="k-fsec" id="k-fspots"><p class="k-mono k-fcap">${L2('Best spots near the crosshair', 'Mejores sitios cerca de la mira')}</p><ul class="k-fspots">${spots}</ul></section>`;
  };
  /** + Catch: where and when, of the fish on the map, at the crosshair or the phone's own position (no track needed). */
  let lastCatch: { id: string; text: string } | null = null;
  /** What + Catch logs: the fish on the FISH bar, or on SPEAR the picked target (stepped in the sheet when "all spear fish"). */
  let catchAs: SpeciesId | null = null;
  const catchName = (fi: FishInfo | null) => (S.act === 'spear' && catchAs ? t(`fish.${catchAs}` as Key) : (fi?.name ?? L2('fish', 'pez'))).toLowerCase();
  const an = (w: string) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`;
  const catchHTML = (fi: FishInfo | null) => `${S.act === 'spear' && catchAs ? `<div class="k-fbrow k-cpick"><span class="k-fpick"><button type="button" data-cstep="-1" aria-label="${L2('Previous', 'Anterior')}">‹</button><b>${esc(t(`fish.${catchAs}` as Key))}</b><button type="button" data-cstep="1" aria-label="${L2('Next', 'Siguiente')}">›</button></span></div>` : ''}<p class="k-fnote">${L2(
    `Saves ${an(catchName(fi))} catch with the time and place. Your catches show on the map and teach the app where it is found.`,
    `Guarda una captura de ${catchName(fi)} con la hora y el lugar. Sus capturas salen en el mapa y enseñan a la app dónde se encuentra.`,
  )}</p>
    <div class="k-tools"><button type="button" class="k-toolb" data-catch="here"><span><b>${L2('At the crosshair', 'En la mira')}</b><small>${L2('Centre the map where you caught it first', 'Centre el mapa donde lo pescó primero')}</small></span>${ARROW}</button><button type="button" class="k-toolb" data-catch="gps"><span><b>${L2('Where I am now', 'Donde estoy ahora')}</b><small>${L2("Uses your phone's location", 'Usa la ubicación del teléfono')}</small></span>${ARROW}</button></div>
    <p class="k-fmsg" id="k-fmsg" role="status" aria-live="polite">${lastCatch ? `${esc(lastCatch.text)} <button type="button" class="k-go2" data-undo>${L2('Undo', 'Deshacer')}</button>` : ''}</p>`;
  {
    const msg = (html: string) => {
      const m = shBody.querySelector('#k-fmsg');
      if (m) m.innerHTML = html;
    };
    const log = (at: { lng: number; lat: number }, where: string) => {
      const fi = d.fishMode?.info?.() ?? null, r = d.fishMode?.logCatch?.(at, S.act === 'spear' && catchAs ? catchAs : undefined);
      if (!r) return;
      const when = new Date().toLocaleTimeString(settings.lang() === 'es' ? 'es-CR' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' });
      const name = r.species === 'other' ? L2('fish', 'pez') : catchName(fi);
      lastCatch = { id: r.id, text: L2(`Saved: ${an(name)} at ${when}, ${where}.`, `Guardado: ${name} a las ${when}, ${where}.`) };
      msg(`${esc(lastCatch.text)} <button type="button" class="k-go2" data-undo>${L2('Undo', 'Deshacer')}</button>`);
    };
    // One listener for the fish and catch sheets, whose bodies are rebuilt as the fish, day or crosshair change.
    shBody.addEventListener('click', (e) => {
      if (S.sheet !== 'fish' && S.sheet !== 'catch' && S.sheet !== 'spear') return;
      const sf = (e.target as HTMLElement).closest<HTMLElement>('[data-sfly]');
      if (sf) {
        const [lng, lat] = sf.dataset.sfly!.split(',').map(Number);
        d.fishMode?.flyTo?.(lng, lat);
        if (!WIDE.matches) closeSheet();
        return;
      }
      const cs = (e.target as HTMLElement).closest<HTMLElement>('[data-cstep]');
      if (cs && catchAs) {
        const list = d.fishMode?.spearInfo?.()?.targets ?? [];
        catchAs = list[(list.indexOf(catchAs) + Number(cs.dataset.cstep) + list.length) % list.length] ?? catchAs;
        return openSheet('catch');
      }
      const f = (e.target as HTMLElement).closest<HTMLElement>('[data-fly]');
      if (f) {
        d.fishMode?.flySpot?.(Number(f.dataset.fly));
        if (!WIDE.matches) closeSheet();
        return;
      }
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-catch],[data-undo]');
      if (!b) return;
      if (b.hasAttribute('data-undo')) {
        if (lastCatch) d.fishMode?.undoCatch?.(lastCatch.id);
        lastCatch = null;
        return msg(L2('Removed.', 'Eliminado.'));
      }
      if (b.dataset.catch === 'here') {
        const c = map.getCenter();
        return log({ lng: c.lng, lat: c.lat }, L2('at the crosshair', 'en la mira'));
      }
      if (!('geolocation' in navigator)) return msg(L2('This phone cannot share its location. Use the crosshair instead.', 'Este teléfono no puede compartir su ubicación. Use la mira.'));
      msg(L2('Finding where you are…', 'Buscando dónde está…'));
      navigator.geolocation.getCurrentPosition(
        (p) => log({ lng: p.coords.longitude, lat: p.coords.latitude }, L2('where you are', 'donde está')),
        () => msg(L2('Your location is off or not found. Turn it on, or use the crosshair.', 'Su ubicación está apagada o no se encontró. Actívela, o use la mira.')),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  }
  /** The fish sheet follows the HUD: a new fish, day or crosshair rebuilds it in place. */
  const refreshFishSheet = () => {
    const fi = d.fishMode?.info?.();
    if (!fi) return;
    if (S.sheet === 'fish') {
      const top = shBody.scrollTop;
      shTitle.textContent = L2(`${titleCase(fi.name)} today`, `${titleCase(fi.name)} hoy`);
      shBody.innerHTML = fishSheetHTML(fi);
      shBody.scrollTop = top;
    } else if (S.sheet === 'catch') shTitle.textContent = L2(`Log ${an(catchName(fi))} catch`, `Anotar captura: ${catchName(fi)}`);
    else if (S.sheet === 'spear') {
      const si = d.fishMode?.spearInfo?.();
      if (si) shBody.innerHTML = spearSheetHTML(si);
    }
  };
  d.fishMode?.onInfo?.(() => (renderFishSw(), refreshFishSheet()));
  const renderSpot = () => {
    const dk = $('k-dkspot');
    if (S.coral) {
      const rf = reef(), lv = reefLevel(rf);
      dk.className = `k-dk-spot k-lv${lv ?? 'n'}`;
      dk.innerHTML = `<span class="k-n">${esc(titleCase(rf?.name ?? '--'))}<small>Coral · ${esc(heatWord(rf))}</small></span><span class="k-v">${rf && fin(rf.dhw) ? n1(rf.dhw) : '--'}<small> DHW</small></span>${ARROW}`;
    } else {
      const s = spot(), r = rate(S.act, s, ms()), hl = headline(r);
      dk.className = `k-dk-spot k-lv${r.level ?? 'n'}`;
      dk.innerHTML = `<span class="k-n">${esc(titleCase(s.name))}<small>${esc(modeName(S.act))} · ${esc(levelWord(r.level))}</small></span><span class="k-v">${esc(hl.value)}<small> ${esc(hl.unit)}</small></span>${ARROW}`;
    }
    $('k-backsub').textContent = `${titleCase(spot().name)} · ${modeName(S.act)}`;
    if (S.act === 'spear') renderFishSw();
    $('k-ttlact').textContent = modeName(mode());
    $('k-vspot').textContent = S.coral ? titleCase(reef()?.name ?? 'Reef').split(' · ')[0] : titleCase(spot().name);
    if (WIDE.matches) {
      if (!railR.querySelector('#k-cardbox')) {
        railR.innerHTML = inspectorHTML();
        bindCard(railR);
      } else {
        const b = railR.querySelector<HTMLElement>('#k-cardbox')!;
        b.innerHTML = S.coral ? coralCardHTML() : spotCardHTML();
        bindCard(b);
        railR.querySelector('.k-sec-head h2')!.textContent = S.coral ? L2('Reef', 'Arrecife') : L2('Spot', 'Sitio');
      }
    }
    if (S.sheet === 'spot' || S.sheet === 'coral') {
      shBody.innerHTML = S.coral ? coralCardHTML() : spotCardHTML();
      bindCard(shBody);
      shTitle.textContent = S.coral ? L2('Reef', 'Arrecife') : L2('Spot', 'Sitio');
    }
  };
  $('k-dkspot').addEventListener('click', () => openSheet(S.coral ? 'coral' : 'spot'));
  // The fishing panel's own MODE row changes it too: keep the card's switch in step (PLAN 7.120).
  d.fishMode?.subscribe?.(() => (renderSpot(), renderFishSw()));

  /* ---------- pins and ribbons ---------- */
  const coast = mountCoast(map, stage, (id) => pick(id));
  const pick = (id: string) => {
    if (S.coral) {
      S.reef = id;
      put(storage, REEF_KEY, id);
    } else {
      S.spot = id;
      put(storage, SPOT_KEY, id);
    }
    renderPins();
    renderSpot();
    drawScrub();
    if (!WIDE.matches) openSheet(S.coral ? 'coral' : 'spot');
  };
  const renderPins = () => {
    if (S.coral) {
      const list = reefList();
      coast.set(
        list.filter((r) => r.lngLat[1] < 9.9).map((r) => ({ id: r.id, name: titleCase(r.name).split(' · ')[0], lngLat: r.lngLat, level: reefLevel(r), value: fin(r.dhw) ? n1(r.dhw) : '--', unit: 'DHW', rank: -(r.dhw ?? 0) })),
        S.reef,
      );
      coast.setVisible(true);
      return;
    }
    const t0 = ms();
    const pins: PinData[] = actSpots().map((s) => {
      const r = rate(S.act, s, t0), hl = headline(r);
      return { id: s.name, name: titleCase(s.name), lngLat: s.lngLat, level: r.level, value: hl.value, unit: hl.unit, rank: r.share ?? -1 };
    });
    coast.set(pins, spot().name);
    coast.setVisible(on('rating'));
  };

  /* ---------- time dock ---------- */
  const scrub = mountScrub($('k-scrub'), (o) => (stopPlay(), time.set(o)));
  const scrubEl = $('k-scrub');
  scrubEl.addEventListener('keydown', (e) => {
    const step = BANDS.find((b, i) => time.offsetH() >= b.fromH && (i === BANDS.length - 1 || time.offsetH() < BANDS[i + 1].fromH))!.stepH;
    const k = ({ ArrowRight: step, ArrowLeft: -step, PageUp: 24, PageDown: -24 } as Record<string, number>)[e.key];
    if (k) (time.set(time.offsetH() + k), e.preventDefault());
    if (e.key === 'Home') (time.set(0), e.preventDefault());
    if (e.key === 'End') (time.set(720), e.preventDefault());
  });
  const scrubLevel = (o: number): Level | null => {
    const t1 = offMs(o);
    if (S.coral) return rate('snorkel', reefSpot(reef()), t1).level;
    return rate(S.act, spot(), t1).level;
  };
  const scrubDay = (o: number) => {
    const t1 = offMs(o), at = S.coral ? reef()?.lngLat ?? spot().lngLat : spot().lngLat;
    const sk = sky(t1, at[1], at[0]);
    return sk.sun.sunrise !== null && sk.sun.sunset !== null && t1 >= sk.sun.sunrise && t1 < sk.sun.sunset;
  };
  /** The best window's hours on the slider, from the planner's day (its start and end). */
  const bestSpan = (startMs: number) => {
    const day = planV?.days.find((x) => x?.startMs === startMs);
    if (!day) return null;
    return { a: Math.max(0, (day.startMs - time.baseMs()) / H), b: Math.max(0, (day.endMs - time.baseMs()) / H) };
  };
  let scrubQueued = false;
  function drawScrub() {
    if (scrubQueued) return;
    scrubQueued = true;
    requestAnimationFrame(() => {
      scrubQueued = false;
      if (d.forecast.isOpen()) return;
      const bt = bestWindow();
      const best = bt.startMs !== null && (bt.kind === 'best' || bt.kind === 'chance') ? bestSpan(bt.startMs) : null;
      scrub.set({ level: scrubLevel, isDay: scrubDay, date: (o) => dateOf(offMs(o)), best }, time.offsetH());
    });
  }
  const renderTime = () => {
    const o = time.offsetH(), t0 = ms(), dd = dateOf(t0), band = time.band();
    root.dataset.band = band;
    $('k-thour').textContent = band === 'outlook' ? `${dd.wd} ${dd.n}` : hhmm(t0);
    const rel = o === 0 ? L2('Now', 'Ahora') : o < 48 ? `+${o} h` : `+${Math.floor(o / 24)} d`;
    $('k-tday').textContent = band === 'outlook' ? L2('Climate average', 'Promedio climático') : `${dd.wd} ${dd.n} · ${rel}`;
    const tb = $('k-tband');
    tb.dataset.b = band;
    tb.lastElementChild!.textContent = { forecast: L2('Forecast', 'Pronóstico'), lowconf: L2('Low conf', 'Baja conf.'), outlook: L2('Outlook', 'Perspectiva') }[band];
    const c = map.getCenter(), uv = d.here(c.lng, c.lat, t0).uv;
    const u = $('k-tuv');
    u.hidden = !fin(uv);
    if (fin(uv)) {
      u.textContent = `UV ${n0(uv)}`;
      u.style.setProperty('--uvc', `var(--uv${uvLv(uv)})`);
    }
    scrubEl.setAttribute('aria-valuenow', String(o));
    scrubEl.setAttribute('aria-valuetext', `${dd.wd} ${dd.n} ${hhmm(t0)}, ${tb.lastElementChild!.textContent}`);
    $('k-play').innerHTML = S.playing ? svg('<rect x="2.5" y="2" width="3" height="10"/><rect x="8.5" y="2" width="3" height="10"/>', '0 0 14 14') : svg('<path d="M3 1.5l9 5.5-9 5.5z"/>', '0 0 14 14');
    $('k-now').hidden = o === 0;
    scrub.cursor(o);
  };
  function stopPlay() {
    if (S.playing) clearInterval(S.playing);
    S.playing = 0;
    renderTime();
  }
  $('k-play').addEventListener('click', () => {
    if (S.playing) return stopPlay();
    if (time.offsetH() >= 700) time.set(0);
    S.playing = window.setInterval(() => {
      const before = time.offsetH();
      time.step(1);
      if (time.offsetH() === before) stopPlay();
    }, 320);
    renderTime();
  });
  $('k-now').addEventListener('click', () => (stopPlay(), time.reset()));
  $('k-best').addEventListener('click', () => {
    stopPlay();
    const b = scrub.best();
    time.set(b >= 0 ? b : 0);
  });

  /* ---------- sheets ---------- */
  function openSheet(kind: string, part?: string) {
    S.sheet = kind;
    sheet.classList.remove('k-wide');
    if (kind === 'layers') {
      shTitle.textContent = L2('Layers', 'Capas');
      renderComposer();
    } else if (kind === 'spot' || kind === 'coral') renderSpot();
    else if (kind === 'here') {
      shTitle.textContent = L2('Under the crosshair', 'Bajo la mira');
      shBody.innerHTML = hereHTML();
      lastR = readings();
      requestAnimationFrame(() => fillTiles(shBody));
    } else if (kind === 'find') {
      shTitle.textContent = L2('Find', 'Buscar');
      shBody.innerHTML = findHTML();
      bindFind(shBody);
    } else if (kind === 'settings') {
      shTitle.textContent = L2('Settings', 'Ajustes');
      shBody.innerHTML = settingsHTML();
      bindSettings(shBody);
    } else if (kind === 'tools') {
      shTitle.textContent = L2('Tools', 'Herramientas');
      shBody.innerHTML = toolsHTML();
      bindTools(shBody);
    } else if (kind === 'fish') {
      const fi = d.fishMode?.info?.();
      if (!fi) return;
      shTitle.textContent = L2(`${titleCase(fi.name)} today`, `${titleCase(fi.name)} hoy`);
      shBody.innerHTML = fishSheetHTML(fi);
    } else if (kind === 'spear') {
      const si = d.fishMode?.spearInfo?.();
      if (!si) return;
      shTitle.textContent = L2('Best spear spots', 'Mejores sitios de pesca submarina');
      shBody.innerHTML = spearSheetHTML(si);
    } else if (kind === 'catch') {
      const fi = d.fishMode?.info?.() ?? null;
      if (S.act === 'spear') catchAs ??= d.fishMode?.spearInfo?.()?.target ?? 'grouper';
      shTitle.textContent = L2(`Log ${an(catchName(fi))} catch`, `Anotar captura: ${catchName(fi)}`);
      shBody.innerHTML = catchHTML(fi);
    } else if (kind === 'age') {
      shTitle.textContent = L2('Data age', 'Edad de los datos');
      shBody.innerHTML = ageHTML();
      shBody.querySelector('[data-check]')?.addEventListener('click', () => openTool('check'));
    }
    sheet.classList.add('k-open');
    scrim.classList.toggle('k-on', !WIDE.matches);
    shBody.scrollTop = 0;
    if (part === 'spots') requestAnimationFrame(() => shBody.querySelector('#k-fspots')?.scrollIntoView({ block: 'start' }));
    $('k-laybtn').setAttribute('aria-expanded', String(kind === 'layers'));
  }
  function closeSheet() {
    S.sheet = null;
    sheet.classList.remove('k-open');
    scrim.classList.remove('k-on');
  }
  $('k-shclose').addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && S.sheet && closeSheet());
  $('k-laybtn').addEventListener('click', () => (S.sheet === 'layers' ? closeSheet() : openSheet('layers')));
  $('k-find').addEventListener('click', () => (S.sheet === 'find' ? closeSheet() : openSheet('find')));
  // The map's attribution (i) sits just above the button column, not between FIND and LAYERS where it overlapped them.
  const btns = document.querySelector<HTMLElement>('.km .k-mapbtns');
  if (btns && 'ResizeObserver' in window) {
    const lift = () => {
      const m = map.getContainer().getBoundingClientRect(), b = btns.getBoundingClientRect();
      if (!b.height) return;
      // Over the column's right edge (the map runs under the side rail on a desktop, so its own corner is hidden).
      document.documentElement.style.setProperty('--k-attrib-b', `${Math.max(0, Math.round(m.bottom - b.top + 8))}px`);
      document.documentElement.style.setProperty('--k-attrib-r', `${Math.max(0, Math.round(m.right - b.right - 10))}px`);
    };
    new ResizeObserver(lift).observe(btns);
    window.addEventListener('resize', lift);
  }
  $('k-set').addEventListener('click', () => (S.sheet === 'settings' ? closeSheet() : openSheet('settings')));
  $('k-tools').addEventListener('click', () => (S.sheet === 'tools' ? closeSheet() : openSheet('tools')));
  $('k-age').addEventListener('click', () => (S.sheet === 'age' ? closeSheet() : openSheet('age')));
  $('k-back').addEventListener('click', () => d.forecast.open({ spot: spot().name, activity: S.act }));
  // Every reading the old map had, in its full CONDITIONS panel: first thing under "Under the crosshair" (Joseph 2026-11-11).
  app.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-expand], .k-dtl')) openTool('cond');
  });
  /**
   * The old panel's rows change as its modules work them out: re-read the detail cards then, and in Expand data fold
   * away a row with nothing to say ("--"), so the panel shows what is known here and now.
   */
  const EMPTY_RO = /^\s*(--|)\s*$/;
  const foldEmpty = (cond: HTMLElement) =>
    cond.querySelectorAll<HTMLElement>('.ro').forEach((ro) => {
      const segs = ro.querySelectorAll('.seg');
      ro.classList.toggle('k-empty', !!segs.length && !ro.querySelector('button') && [...segs].every((x) => EMPTY_RO.test(x.textContent ?? '')));
    });
  {
    const cond = condRoot();
    let q = false;
    const sweep = () => {
      q = false;
      renderDetails();
      if (cond && d.sheets.current() === 'cond') foldEmpty(cond);
    };
    if (cond) new MutationObserver(() => void (!q && ((q = true), requestAnimationFrame(sweep)))).observe(cond, { subtree: true, childList: true, characterData: true });
    d.sheets.subscribe(() => cond && d.sheets.current() === 'cond' && foldEmpty(cond));
  }
  // A tap closes another open drawer on the phone; otherwise it moves the crosshair to the tapped point, so WHAT'S HERE
  // and the readings read where you tapped, not where the map happened to be centred (Joseph 2026-11-16).
  map.on('click', (e) => {
    if (!WIDE.matches && S.sheet && S.sheet !== 'here') return closeSheet();
    if (S.sheet && S.sheet !== 'here') return;
    if (!WIDE.matches) tapKey(e.point);
    map.easeTo({ center: e.lngLat, duration: 350 });
  });

  /** An old drawer (WATCH, BOAT, CORAL SITES, LIVE OBS, SYSTEM CHECK, CONDITIONS...), restyled, over the map. */
  function openTool(id: SheetId | 'sync') {
    closeSheet();
    if (id === 'sync') return void document.getElementById('sync')?.click();
    d.sheets.open(id);
  }
  // The kept drawer's own header bar: its name and the way back to the map.
  const toolHead = document.createElement('div');
  toolHead.className = 'k-toolhead';
  toolHead.innerHTML = `<div class="k-th-l"><button type="button" class="k-ib" aria-label="${L2('Back to the map', 'Volver al mapa')}">${BACK}</button><h2></h2></div><span class="k-mono">${L2('Classic tools', 'Herramientas')}</span>`;
  document.body.appendChild(toolHead);
  toolHead.querySelector('button')!.addEventListener('click', () => d.sheets.close());
  const topEl = app.querySelector<HTMLElement>('.k-top')!;
  new ResizeObserver(() => root.style.setProperty('--k-tool-top', `${Math.round(topEl.getBoundingClientRect().bottom)}px`)).observe(topEl);
  d.sheets.subscribe(() => {
    const cur = d.sheets.current();
    const on = !!cur && cur !== 'layers' && cur !== 'time' && cur !== 'find' && cur !== 'spot' && cur !== 'settings';
    document.body.classList.toggle('km-tool', on);
    if (on) toolHead.querySelector('h2')!.textContent = d.tools.find((x) => x.id === cur)?.label ?? cur;
    // Only the kept tools open here: the shell has its own layers, find, time, spot and settings.
    else if (cur) d.sheets.close();
  });

  const findHTML = () => {
    const t0 = ms();
    const list = S.coral
      ? reefList().map((r) => ({ id: r.id, name: titleCase(r.name), sub: heatWord(r), v: fin(r.dhw) ? `${n1(r.dhw)}` : '--', lv: reefLevel(r) }))
      : actSpots().map((s) => {
          const r = rate(S.act, s, t0), hl = headline(r);
          return { id: s.name, name: titleCase(s.name), sub: levelWord(r.level), v: `${hl.value}${hl.unit.startsWith('/') || !hl.unit ? '' : ` ${hl.unit}`}`, lv: r.level };
        });
    return `<form class="k-fsearch" autocomplete="off">${svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>')}<input id="k-fq" spellcheck="false" enterkeyhint="go" placeholder="${L2('Beach, or 9.65, -82.74', 'Playa, o 9.65, -82.74')}" aria-label="${L2('Find a beach or a position', 'Buscar una playa o una posición')}"></form>
    <p class="k-fmsg k-mono" role="status"></p>
    <p class="k-mono k-fcap">${S.coral ? L2('Tracked reefs', 'Arrecifes') : `${esc(modeName(S.act))} · ${L2('north to south', 'de norte a sur')}`}</p>
    <div class="k-flist">${list.map((x) => `<button type="button" class="k-frow k-lv${x.lv ?? 'n'}" data-id="${esc(x.id)}" data-n="${esc(x.name.toLowerCase())}"><span><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></span><span>${esc(x.v)}</span></button>`).join('')}</div>`;
  };
  const bindFind = (el: HTMLElement) => {
    el.querySelectorAll<HTMLElement>('.k-frow').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.id!;
        const at = S.coral ? reefList().find((r) => r.id === id)?.lngLat : spotByName(id)?.lngLat;
        closeSheet();
        if (S.coral) (S.reef = id), put(storage, REEF_KEY, id);
        else (S.spot = id), put(storage, SPOT_KEY, id);
        renderPins();
        renderSpot();
        drawScrub();
        if (at) d.go({ name: id, lngLat: at });
      }),
    );
    const q = el.querySelector<HTMLInputElement>('#k-fq')!;
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase();
      el.querySelectorAll<HTMLElement>('.k-frow').forEach((b) => (b.hidden = !!v && !(b.dataset.n ?? '').includes(v)));
    });
    el.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const hit = resolveTarget(q.value);
      if (!hit) return void (el.querySelector('.k-fmsg')!.textContent = L2('No beach or position matches', 'Ninguna playa o posición coincide'));
      q.blur();
      closeSheet();
      d.go(hit);
    });
  };

  const seg = (k: string, opts: [string, string][], cur: string) => `<div class="k-seg" data-k="${k}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
  const settingsHTML = () => `
    <div class="k-setrow"><div><b>${L2('Light or dark', 'Claro u oscuro')}</b><small>${L2('Shared with the forecast page', 'Igual que la página de pronóstico')}</small></div>${seg('scheme', [['light', L2('Light', 'Claro')], ['dark', L2('Dark', 'Oscuro')]], currentScheme())}</div>
    <div class="k-setrow"><div><b>${L2('Language', 'Idioma')}</b></div>${seg('lang', [['en', 'EN'], ['es', 'ES']], settings.lang())}</div>
    <div class="k-setrow"><div><b>${L2('Sun mode', 'Modo sol')}</b><small>${L2('Thicker lines and full contrast in glare', 'Líneas gruesas y contraste máximo')}</small></div>${seg('sun', [['off', 'Off'], ['on', 'On']], settings.sun() ? 'on' : 'off')}</div>
    <div class="k-setrow"><div><b>Enhance</b><small>${L2('Pull back, pan and zoom in when you pick a place', 'Alejar, mover y acercar al elegir un lugar')}</small></div>${seg('enh', [['off', 'Off'], ['on', 'On']], settings.enhance() ? 'on' : 'off')}</div>
    <div class="k-setrow"><div><b>${L2('Sounds', 'Sonidos')}</b></div>${seg('snd', [['off', 'Off'], ['on', 'On']], settings.sound() ? 'on' : 'off')}</div>
    <div class="k-setrow"><div><b>${L2('Vessel', 'Embarcación')}</b><small>${L2('For the boat verdict and route', 'Para el veredicto y la ruta del bote')}</small></div>${seg('ves', [['small', L2('Small boat', 'Bote')], ['dinghy', L2('Dinghy', 'Panga')], ['yacht', L2('Yacht', 'Velero')]], settings.vessel())}</div>
    <div class="k-tools"><button type="button" class="k-toolb" data-about><span><b>${L2('About', 'Acerca')}</b><small>${L2('How to read this app', 'Cómo leer esta app')}</small></span>${ARROW}</button><button type="button" class="k-toolb" data-agesheet><span><b>${L2('Data age', 'Edad de los datos')}</b><small>${L2('How old each feed is, and where it comes from', 'La edad de cada fuente y de dónde viene')}</small></span>${ARROW}</button></div>
`;
  /** Tools, its own button on the map (Joseph 2026-11-16): the working tools, apart from how the app looks. */
  const toolsHTML = () => `<p class="k-mono k-fcap">${L2('Everything from the classic map', 'Todo el mapa clásico')}</p>
    <div class="k-tools">${d.tools.map((x) => x.id === 'sync'
      ? `<button type="button" class="k-toolb k-sync" data-tool="sync" aria-busy="${syncSt?.state === 'running'}"><span><b>${esc(x.label)}</b><small class="k-syncst" role="status" aria-live="polite">${esc(syncLine(x.sub))}</small><small class="k-synclast">${esc(syncLast())}</small></span>${ARROW}</button>`
      : `<button type="button" class="k-toolb" data-tool="${x.id}"><span><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></span>${ARROW}</button>`).join('')}</div>`;
  /**
   * Save for a trip runs in the old panel's button (sync-ui.ts); its row here says, in words, what it is doing: the
   * step and how far it has got (tap again to cancel), then whether it worked, and when the last save was.
   */
  let syncSt: SyncStatus | null = null;
  const SYNC_PHASE: Record<string, [string, string]> = { start: ['Starting', 'Empezando'], map: ['the map', 'el mapa'], data: ['the forecasts', 'los pronósticos'], check: ['Checking', 'Revisando'] };
  const syncLine = (idle: string) => {
    const s = syncSt;
    if (s?.state === 'running') {
      const ph = SYNC_PHASE[s.phase] ?? [s.phase, s.phase];
      return s.phase === 'start' || s.phase === 'check'
        ? L2(`${ph[0]}… Tap again to cancel.`, `${ph[1]}… Toque otra vez para cancelar.`)
        : L2(`Saving ${ph[0]}: ${s.pct}% (${s.mb} MB). Tap again to cancel.`, `Guardando ${ph[1]}: ${s.pct}% (${s.mb} MB). Toque otra vez para cancelar.`);
    }
    if (s?.state === 'done') return L2('Saved. The map, forecasts and feeds will work with no signal.', 'Guardado. El mapa, los pronósticos y los datos funcionarán sin señal.');
    if (s?.state === 'partial') return L2(`Saved, but ${s.n} part${s.n === 1 ? '' : 's'} could not be downloaded. Try again with a better signal.`, `Guardado, pero ${s.n} parte${s.n === 1 ? '' : 's'} no se ${s.n === 1 ? 'pudo' : 'pudieron'} descargar. Intente otra vez con mejor señal.`);
    if (s?.state === 'failed') return L2('The save failed. Check your signal and try again.', 'No se pudo guardar. Revise la señal e intente otra vez.');
    if (s?.state === 'cancelled') return L2('Cancelled. Nothing new was saved.', 'Cancelado. No se guardó nada nuevo.');
    if (!navigator.onLine) return L2('You need a signal to save for a trip.', 'Necesita señal para guardar para un viaje.');
    return idle;
  };
  const syncLast = () => {
    const s = loadSummary(storage);
    if (!s) return L2('Never saved on this device yet.', 'Todavía no se ha guardado en este dispositivo.');
    const when = new Date(s.at).toLocaleString(settings.lang() === 'es' ? 'es-CR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' });
    return L2(`Last saved ${when}, ${(s.bytes / 1e6).toFixed(s.bytes < 1e7 ? 1 : 0)} MB.`, `Guardado por última vez ${when}, ${(s.bytes / 1e6).toFixed(s.bytes < 1e7 ? 1 : 0)} MB.`);
  };
  document.addEventListener(SYNC_EVENT, (e) => {
    syncSt = (e as CustomEvent<SyncStatus>).detail;
    const sub = d.tools.find((x) => x.id === 'sync')?.sub ?? '';
    document.querySelectorAll<HTMLElement>('.k-sync').forEach((b) => {
      b.setAttribute('aria-busy', String(syncSt?.state === 'running'));
      b.querySelector('.k-syncst')!.textContent = syncLine(sub);
      b.querySelector('.k-synclast')!.textContent = syncLast();
    });
  });
  const bindSettings = (el: HTMLElement) => {
    el.querySelectorAll<HTMLElement>('.k-seg').forEach((g) =>
      g.querySelectorAll<HTMLElement>('button').forEach((b) =>
        b.addEventListener('click', () => {
          const k = g.dataset.k, v = b.dataset.v!;
          g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          if (k === 'scheme') setScheme(v as 'light' | 'dark');
          if (k === 'lang') d.setLang(v as 'en' | 'es');
          if (k === 'sun') settings.setSun(v === 'on');
          if (k === 'enh') settings.setEnhance(v === 'on');
          if (k === 'snd') settings.setSound(v === 'on');
          if (k === 'ves') settings.setVessel(v as 'small');
        }),
      ),
    );
    el.querySelector('[data-about]')?.addEventListener('click', () => (closeSheet(), document.dispatchEvent(new Event('ft:about'))));
    el.querySelector('[data-agesheet]')?.addEventListener('click', () => openSheet('age'));
  };
  const bindTools = (el: HTMLElement) => {
    // Save for a trip stays in the sheet, so its row can show the progress; a second tap cancels.
    el.querySelectorAll<HTMLElement>('[data-tool]').forEach((b) =>
      b.addEventListener('click', () => (b.dataset.tool === 'sync' ? void document.getElementById('sync')?.click() : openTool(b.dataset.tool as SheetId))),
    );
  };

  const FEEDS: [string, string, string, SourceId[]][] = [
    ['waves', L2('Waves', 'Olas'), L2('Wave models', 'Modelos de olas'), ['ww3', 'wam']], ['wind', L2('Wind map', 'Mapa de viento'), L2('Weather models', 'Modelos del tiempo'), ['ecmwf', 'gfs']], ['spotwind', L2('Wind at the spots', 'Viento en los spots'), L2('4 models', '4 modelos'), ['models']],
    ['weather', L2('Weather', 'Tiempo'), L2('4 weather models', '4 modelos del tiempo'), ['models']], ['currents', L2('Currents', 'Corrientes'), L2('Ocean model', 'Modelo del océano'), ['smoc']], ['raincells', L2('Rain nowcast', 'Lluvia ahora'), L2('Satellite rain', 'Lluvia por satélite'), ['imerg']],
    ['lightning', L2('Lightning', 'Rayos'), L2('Satellite', 'Satélite'), ['glm']], ['sst', L2('Sea temperature', 'Temp. del mar'), L2('Satellite', 'Satélite'), ['sst']], ['chl', L2('Ocean colour', 'Color del océano'), L2('Satellite', 'Satélite'), ['chl']],
    ['sargassum', L2('Sargassum', 'Sargazo'), L2('Satellite', 'Satélite'), ['usf']], ['river', L2('River flow', 'Caudal de ríos'), L2('River forecast', 'Pronóstico de ríos'), ['glofas']], ['coral', L2('Coral heat', 'Calor del coral'), L2('Satellite', 'Satélite'), ['crw']],
    ['gauge', L2('Tide gauge', 'Mareógrafo'), L2('Limón station', 'Estación de Limón'), ['ioc']], ['metar', L2('Airport', 'Aeropuerto'), L2('Limón airport', 'Aeropuerto de Limón'), ['metar']], ['uv', 'UV', L2('UV forecast', 'Pronóstico UV'), ['cams']],
  ];
  const ageHTML = () => {
    const now = Date.now();
    const cite = citer(settings.lang());
    return cite.finish(`<p class="k-mono k-fcap">${L2('Age of each feed, from its own fetch time', 'Edad de cada fuente, desde su propia descarga')}</p><div class="k-feeds">${FEEDS.map(([f, n, src, ids]) => {
      const a = dataAge.get(f);
      const age = a ? now - a.fetchedAt : NaN, st = a ? ageState(age) : 'none';
      // Neutral while usable; only stale data takes the caution colour (green, amber and red belong to the rating scale).
      const col = st === 'stale' ? 'var(--sev-caution)' : st === 'none' ? 'var(--lvn)' : 'var(--c-bar)';
      const h = age / H;
      const txt = !a ? '--' : h < 1 ? `${Math.max(1, Math.round(age / 6e4))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
      return `<div class="k-feed" style="--fc:${col}"><i></i><span>${esc(n)}<small>${esc(src)}${cite.mark(...ids)}${a?.fromCache ? ` · ${L2('offline copy', 'copia sin conexión')}` : ''}</small></span><b>${esc(txt)}</b></div>`;
    }).join('')}<div class="k-feed" style="--fc:var(--c-bar)"><i></i><span>${L2('Tides, sun and moon', 'Mareas, sol y luna')}<small>${L2('Computed on this device, exact', 'Calculado en este dispositivo')}</small></span><b>—</b></div></div><button type="button" class="k-go2 k-all" data-check>${L2('System check', 'Revisión del sistema')}${ARROW}</button>`, L2('SOURCES', 'FUENTES'));
  };
  const renderAge = () => {
    const o = dataAge.oldest();
    const el = $('k-age');
    const a = o ? Date.now() - o.fetchedAt : NaN, st = o ? ageState(a) : 'none';
    el.dataset.b = st === 'stale' ? 'stale' : st === 'none' ? 'none' : 'ok';
    const h = a / H;
    el.lastElementChild!.textContent = o ? `${L2('Data', 'Datos')} ${h < 1 ? `${Math.max(1, Math.round(a / 6e4))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`}` : L2('Data --', 'Datos --');
  };
  dataAge.subscribe(() => (renderAge(), renderComposer()));
  // The sea temperature's bands follow the day's water: its key redraws when they move.
  onFieldSteps(() => (renderComposer(), renderLegMini()));
  setInterval(renderAge, 60_000);

  /* ---------- language, scheme ---------- */
  app.querySelectorAll<HTMLElement>('.k-lang button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === settings.lang()));
    b.addEventListener('click', () => b.dataset.lang !== settings.lang() && d.setLang(b.dataset.lang as 'en' | 'es'));
  });
  function setScheme(s: 'light' | 'dark') {
    saveScheme(s, storage);
    applyScheme(s);
  }
  /** Recolour in place: the base map, the layers' role colours, and the layers that bake colours; no reload, data stays. */
  function applyScheme(s: 'light' | 'dark') {
    const before = roleSnapshot();
    root.dataset.scheme = s;
    resetTokens();
    styleBaseMap(map);
    schemeSwap(map as never, before, roleSnapshot());
    coast.recolour();
    scrub.draw();
    renderAll();
    emitSchemeChange();
  }
  /** The forecast and coral pages switch the shared scheme on their own pages: back on the map, follow it. */
  function schemeCheck() {
    if (d.forecast.isOpen() || /^#(forecast|coral)/.test(location.hash)) return false;
    const want = storedScheme(storage, !!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    if (want === currentScheme()) return false;
    applyScheme(want);
    return true;
  }
  $('k-scheme').addEventListener('click', () => setScheme(currentScheme() === 'dark' ? 'light' : 'dark'));

  /* ---------- views ---------- */
  try { localStorage.removeItem('km.tiles'); } catch { /* the old BOXES toggle's setting (PLAN 7.96), gone with the boxes */ }
  app.querySelectorAll<HTMLElement>('.k-views button').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.view === 'coast') map.fitBounds([[-82.9, 9.57], [-82.58, 9.81]], { duration: 1100 });
      else {
        const at = S.coral ? reef()?.lngLat : spot().lngLat;
        if (at) map.flyTo({ center: at, zoom: 13.2, duration: 1100 });
      }
    }),
  );
  $('k-zin').addEventListener('click', () => map.zoomIn());
  $('k-zout').addEventListener('click', () => map.zoomOut());

  /* ---------- everything ---------- */
  function modeChanged() {
    d.onMode?.(mode());
    renderTabs();
    applyLayers();
    renderComposer();
    renderLegMini();
    renderPins();
    renderSpot();
    renderFishSw();
    drawScrub();
    renderReadouts();
    if (!WIDE.matches && S.sheet === 'spot' && S.coral) openSheet('coral');
  }
  const renderAll = () => {
    setKmLang(settings.lang());
    if (WIDE.matches) railR.innerHTML = '';
    renderTabs();
    renderComposer();
    renderLegMini();
    renderPins();
    renderSpot();
    renderFishSw();
    renderTime();
    drawScrub();
    renderReadouts();
    renderAge();
  };
  time.subscribe(() => {
    renderTime();
    renderPins();
    renderSpot();
    renderReadouts();
  });
  map.on('moveend', renderReadouts);
  map.on('move', () => WIDE.matches && renderReadouts());
  WIDE.addEventListener('change', () => (closeSheet(), setTimeout(() => (renderAll(), pad()), 30)));
  d.onCoralSites(() => (coast.setCells(d.coralSites()), S.coral && renderSpot()));
  // Feeds arrive over the first seconds: redraw what reads them, at most every 2 s.
  let lastV = '';
  setInterval(() => {
    const v = d.version();
    if (v === lastV || d.forecast.isOpen()) return;
    lastV = v;
    renderPins();
    renderSpot();
    drawScrub();
    renderReadouts();
  }, 2000);
  window.addEventListener('fc-hide', () => setTimeout(() => (schemeCheck() || (renderAll(), pad())), 0));
  window.addEventListener('hashchange', () => setTimeout(schemeCheck, 0));
  if (document.fonts?.ready) document.fonts.ready.then(() => (placeBar(), drawScrub()));
  quietCoral(S.coral);
  renderAll();
  applyLayers();
  coast.setCells(d.coralSites());

  return {
    /** The map opened from the forecast for an activity at a spot (PLAN 7.68): that activity's layers, spot picked. */
    openFor(spotName: string, a: FcActivity) {
      S.spot = spotName;
      put(storage, SPOT_KEY, spotName);
      if (S.coral) S.coral = false;
      put(storage, CORAL_KEY, '0');
      quietCoral(false);
      setAct(a);
    },
    /** The map opened on an activity with no spot picked (the guide's SHOW ON MAP). */
    openAct(a: FcActivity) {
      if (S.coral) S.coral = false;
      put(storage, CORAL_KEY, '0');
      quietCoral(false);
      setAct(a);
    },
    setMask(m: Mask) {
      coast.setMask(m);
    },
    refresh() {
      renderAll();
    },
    /** The old LAYERS preset id for the CONDITIONS groups. */
    oldPreset: () => (S.coral ? null : OLD_PRESET[S.act]),
  };
}

export type KineticMap = ReturnType<typeof mountKineticMap>;
