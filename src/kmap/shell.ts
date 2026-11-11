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
import type { Map as MlMap } from 'maplibre-gl';
import type { Spot as FcSpot } from '../metrics/forecast';
import { readAt, skyMemo, spotsForActivity, type FcActivity, type FcDeps, type FcRead, type Level } from '../forecast/model';
import { predictSeries, tideState } from '../physics/tide';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { REGION, SPOTS } from '../region';
import { LAYERS, type LayerId, type LayerStore } from '../layers/registry';
import { legendHtml } from '../layers/legend';
import type { CoralMode } from '../coral-mode';
import type { Sheets, SheetId } from '../sheets';
import type { Settings } from '../settings';
import { dataAge, ageState } from '../adapters/data-age';
import { resolveTarget, type Target } from '../target';
import { nextSeasons, spawnWindows } from '../coral/spawning';
import { t, type Key } from '../i18n';
import { saveScheme, currentScheme } from '../theme';
import { BANDS } from '../time';
import type { TimeStore } from '../time';
import {
  GROUPS, MODES, OLD_PRESET, isCustom, isMode, isOwnLayer, layerDef, loadOrders, moveLayer, offered, orderOf, saveOrders, toggleLayer,
  type KmGroup, type KmLayer, type Mask, type Mode,
} from './model';
import { ARROW, BACK, CLOSE, GRIP, ICON, L2, LOCK, PLUS, compass, esc, fin, levelWord, modeName, resetTokens, setKmLang, svg } from './dom';
import { mountCoast, type PinData } from './coast';
import { mountScrub } from './scrub';
import { barHTML, drawTiles, tileHTML, type Reading } from './tiles';
import { styleBaseMap } from './basemap';

type Spot = (typeof SPOTS)[number];
const asSpot = (s: FcSpot | undefined): Spot => (s ? (SPOTS.find((x) => x.name === s.name) ?? SPOTS[0]) : SPOTS[0]);
const H = 3.6e6;

/** What is under a point at an hour: everything the old CONDITIONS panel and "what's here" card read. */
export interface Here {
  land: boolean;
  depthM: number | null;
  swell: { hs: number; tp: number; fromDeg: number; trains: { hs: number; tp: number; deg: number }[] } | null;
  wind: { kt: number; fromDeg: number; gustKt: number | null } | null;
  current: { kt: number; toDeg: number } | null;
  sstC: number | null;
  visM: number | null;
  rain: { mmH: number | null; pct: number | null } | null;
  lightningKm: number | null;
  rip: { level: 'LOW' | 'MOD' | 'HIGH'; spot: string } | null;
  sarg: { level: string; beach: string } | null;
  uv: number | null;
  zone: string | null;
  heat: { reef: string; dhw: number; alert: number } | null;
  airC: number | null;
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

/** Headline value for a spot: the forecast page's (surf range, scores /100, visibility, wind). */
export function headline(r: FcRead): { value: string; unit: string } {
  if (r.score === null) return { value: '--', unit: '' };
  switch (r.activity) {
    case 'surf': {
      const [lo, hi] = r.surf!.range;
      return { value: hi < 0.15 ? '0' : lo === hi ? n1(lo) : `${n1(lo)}–${n1(hi)}`, unit: 'm' };
    }
    case 'snorkel':
    case 'dive': {
      const v = r.water?.visM;
      return v === null || v === undefined ? { value: n0(r.score), unit: '/100' } : { value: v >= 10 ? n0(v) : n1(v), unit: 'm' };
    }
    case 'sail': {
      const k = r.sail?.windKt;
      return k === null || k === undefined ? { value: n0(r.score), unit: '/100' } : { value: n0(k), unit: 'kt' };
    }
    default:
      return { value: n0(r.score), unit: '/100' };
  }
}

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
      <button type="button" class="k-ib" id="k-set" aria-label="${L2('Settings and tools', 'Ajustes y herramientas')}">${svg('<path d="M3 5h14M3 10h14M3 15h14"/><rect x="5" y="3" width="3" height="4" fill="currentColor" stroke="none"/><rect x="12" y="8" width="3" height="4" fill="currentColor" stroke="none"/><rect x="7" y="13" width="3" height="4" fill="currentColor" stroke="none"/>', '0 0 20 20')}</button>
    </div>
  </header>
  <aside class="k-rail k-rail-l" id="k-raill" aria-label="${L2('Layers', 'Capas')}"></aside>
  <main class="k-stage" id="k-stage" aria-label="${L2('Map', 'Mapa')}">
    <div class="k-confveil" aria-hidden="true"></div>
    <div class="k-xh" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div>
    <button type="button" class="k-readbar" id="k-readbar" aria-label="${L2('Readings under the crosshair', 'Lecturas bajo la mira')}"></button>
    <div class="k-legmini" id="k-legmini" aria-hidden="true"></div>
    <div class="k-views" role="group" aria-label="${L2('Prepared views', 'Vistas')}"><button type="button" data-view="coast">${L2('Coast', 'Costa')}</button><button type="button" data-view="spot" id="k-vspot"></button></div>
    <div class="k-mapbtns">
      <div class="k-zoom"><button type="button" id="k-zin" aria-label="${L2('Zoom in', 'Acercar')}">${svg('<path d="M8 2v12M2 8h12"/>', '0 0 16 16')}</button><button type="button" id="k-zout" aria-label="${L2('Zoom out', 'Alejar')}">${svg('<path d="M2 8h12"/>', '0 0 16 16')}</button></div>
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
  const reefLevel = (r: ReefNow | null): Level | null => (r?.dhw === null || r?.dhw === undefined ? null : r.dhw >= 8 ? 0 : r.dhw >= 4 ? 1 : r.dhw >= 2 ? 2 : r.dhw > 0 ? 3 : 4);
  const heatWord = (r: ReefNow | null) => {
    const l = reefLevel(r);
    return l === null ? L2('No data', 'Sin datos') : [L2('Alert 2 · severe', 'Alerta 2 · severa'), L2('Alert 1 · bleaching', 'Alerta 1 · blanqueo'), L2('Watch', 'Vigilancia'), L2('Warming', 'Calentando'), L2('No stress', 'Sin estrés')][l];
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
    tabBar.style.transform = `translateX(${tb.offsetLeft}px)`;
    if (!WIDE.matches) {
      const l = tb.offsetLeft - 16;
      if (l < tabs.scrollLeft || tb.offsetLeft + tb.offsetWidth > tabs.scrollLeft + tabs.clientWidth) tabs.scrollTo({ left: Math.max(0, l), behavior: 'smooth' });
    }
  };
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
    d.coralMode.set(onC);
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
  /** Draw order: the composer's top layer draws over the rest, all under the place labels. */
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
  const layerName = (id: KmLayer) =>
    id === 'rating' ? L2('Beach ratings', 'Calificación de playas') : id === 'heat' ? L2('Heat stress', 'Estrés térmico') : id === 'private' ? L2('Private sites', 'Sitios privados') : titleCase(t(`layer.${id}` as Key));
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
  const ramp = (cols: string[], labels: string[]) => `<div class="k-ramp">${cols.map((c) => `<i style="background:var(--${c})"></i>`).join('')}</div><div class="k-rampl">${labels.map((l) => `<span>${esc(l)}</span>`).join('')}</div>`;
  const keys = (items: [string, string, string?][]) => `<div class="k-keys">${items.map(([c, l, k]) => `<span><i class="${k ?? ''}" style="--k:var(--${c})"></i>${esc(l)}</span>`).join('')}</div>`;
  const ownLegend = (id: KmLayer) =>
    id === 'rating'
      ? keys([['lv0', levelWord(0)], ['lv1', levelWord(1)], ['lv2', levelWord(2)], ['lv3', levelWord(3)], ['lv4', levelWord(4)]])
      : id === 'heat'
        ? keys([['lv4', L2('No stress', 'Sin estrés')], ['lv2', L2('Watch', 'Vigilancia')], ['lv1', L2('Alert 1', 'Alerta 1')], ['lv0', L2('Alert 2', 'Alerta 2')]])
        : id === 'private'
          ? `${keys([['t-coral', L2('5 km cell with your sites', 'Celda de 5 km con sus sitios'), 'k-hatch']])}<p class="k-lgnote">${L2('Your logged sites never show exactly on this map.', 'Sus sitios nunca se muestran exactos en este mapa.')}</p>`
          : '';
  const legend = (id: KmLayer) => {
    if (isOwnLayer(id)) return ownLegend(id);
    if (id === 'sst') return ramp(['r-sst0', 'r-sst1', 'r-sst2', 'r-sst3', 'r-sst4', 'r-sst5'], ['26°', '28°', '30 °C']);
    if (id === 'clarity') return ramp(['r-vis0', 'r-vis1', 'r-vis2', 'r-vis3', 'r-vis4', 'r-vis5'], ['1', '5', '10', '20 m']);
    if (id === 'weather') return ramp(['r-rain0', 'r-rain1', 'r-rain2', 'r-rain3', 'r-rain4'], ['0.3', '2.5', '10', '20 mm/h']);
    return '';
  };
  const explainLayer = (id: KmLayer) => {
    if (isOwnLayer(id)) return `<p class="k-lgnote">${esc(id === 'rating' ? L2('Each beach in the rating colour of the chosen activity, for the hour on the slider: the same score as the forecast page. Tiles show the headline value; tap one for the spot card.', 'Cada playa en el color de su calificación para la actividad y la hora elegidas, igual que la página de pronóstico. Toque una para ver el spot.') : id === 'heat' ? L2('NOAA Coral Reef Watch degree heating weeks at each tracked reef: heat built up over 12 weeks. 4 or more is bleaching likely, 8 or more severe.', 'Semanas-grado de calor de NOAA Coral Reef Watch en cada arrecife: el calor acumulado en 12 semanas. 4 o más, blanqueo probable; 8 o más, severo.') : L2('Restoration sites in your private field log, drawn only as the 5 km cell they fall in, so nobody can read an exact site off the screen.', 'Sitios de restauración de su bitácora privada, dibujados solo como la celda de 5 km, para que nadie lea un sitio exacto en la pantalla.'))}</p>`;
    return `<div class="k-lgfull">${legendHtml(id, (k) => t(k as Key))}</div>`;
  };
  const openInfo = new Set<KmLayer>();
  const composerHTML = () => {
    const o = order(), m = mode();
    const rest = offered(m).filter((x) => !o.includes(x));
    return `<div class="k-preset"><div class="k-pl"><span class="k-pv">${esc(modeName(m))}</span><span class="k-pc">${isCustom(orders, m) ? L2('Mine', 'Mía') : L2('Preset', 'Preset')}</span></div><button type="button" class="k-tbtn" data-reset ${isCustom(orders, m) ? '' : 'disabled'}>${L2('Reset', 'Restablecer')}</button></div>
    <p class="k-lc-cap k-mono"><span>${o.length} ${L2('on', 'activas')}</span><span>${L2('Top draws over', 'Arriba se dibuja encima')}</span></p>
    <ol class="k-lrows">${o
      .map((id, i) => {
        const a = ageOf(id), lg = legend(id);
        return `<li class="k-lrow" data-id="${id}"><button type="button" class="k-hdl" data-move="${id}" aria-label="${L2('Move', 'Mover')} ${esc(layerName(id))}: ${L2('arrow keys', 'flechas')}">${GRIP}</button><div class="k-lb"><div class="k-ln"><span class="k-ix">${String(i + 1).padStart(2, '0')}</span>${esc(layerName(id))}<button type="button" class="k-q" data-info="${id}" aria-expanded="${openInfo.has(id)}" aria-label="${L2('What this shows', 'Qué muestra')}">?</button></div><p class="k-lsrc k-mono">${esc(layerDef(id).src)} · <span class="${a.cls}">${esc(a.txt)}</span></p>${lg ? `<div class="k-lg">${lg}</div>` : ''}${openInfo.has(id) ? `<div class="k-linfo">${explainLayer(id)}</div>` : ''}</div><button type="button" class="k-sw" role="switch" aria-checked="true" data-off="${id}" aria-label="${L2('Turn off', 'Apagar')} ${esc(layerName(id))}"></button></li>`;
      })
      .join('')}</ol>
    <div class="k-addh"><b>${L2('Add a layer', 'Añadir capa')}</b><span class="k-mono">${rest.length}</span></div>
    ${GROUPS.map((g) => {
      const ls = rest.filter((x) => layerDef(x).group === g);
      return ls.length ? `<p class="k-addg k-mono">${esc(groupName(g))}</p><div class="k-adds">${ls.map((x) => `<button type="button" class="k-addc" data-add="${x}">${PLUS}${esc(layerName(x))}</button>`).join('')}</div>` : '';
    }).join('')}`;
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
      railL.innerHTML = `<div class="k-sec-head"><h2>${L2('Layers', 'Capas')}</h2><p class="k-mono">${order().length} ${L2('on', 'activas')}</p></div><div class="k-comp">${composerHTML()}</div>`;
      bindComposer(railL);
    }
    if (S.sheet === 'layers') {
      shBody.innerHTML = `<div class="k-comp">${composerHTML()}</div>`;
      bindComposer(shBody);
    }
  };
  const renderLegMini = () => {
    const el = $('k-legmini');
    const top = order().find((id) => legend(id));
    el.hidden = WIDE.matches || !top;
    if (top) el.innerHTML = `<span class="k-mono">${esc(layerName(top))}</span>${legend(top)}`;
  };

  /* ---------- readings ---------- */
  const uvLv = (u: number) => (u <= 2 ? 0 : u <= 5 ? 1 : u <= 7 ? 2 : u <= 10 ? 3 : 4);
  const uvWord = (u: number) => [L2('Low', 'Bajo'), L2('Moderate', 'Moderado'), L2('High', 'Alto'), L2('Very high · cover up', 'Muy alto · cúbrase'), L2('Extreme', 'Extremo')][uvLv(u)];
  const tideNow = (t: number) => {
    const s = tideState(LIMON_HARMONICS, t);
    const d0 = t - ((((t + tz * H) % 864e5) + 864e5) % 864e5);
    const curve = predictSeries(LIMON_HARMONICS, d0, d0 + 24 * H, H).h;
    return { m: s.level, rising: s.rising, curve, at: (t - d0) / H };
  };
  const readings = (): Reading[] => {
    const c = map.getCenter(), t0 = ms(), h = d.here(c.lng, c.lat, t0), out: Reading[] = [];
    const o = order();
    const has = (id: KmLayer) => o.includes(id);
    if (S.coral && h.heat) out.push({ k: 'heat', l: 'DHW', v: n1(h.heat.dhw), u: '°C-wk', s: `${titleCase(h.heat.reef)}`, help: 'diveCoral', val: h.heat.dhw, src: 'CRW' });
    if ((has('waves') || has('surf') || (has('rating') && S.act === 'surf')) && h.swell && !h.land)
      out.push({ k: 'swell', l: L2('Swell', 'Oleaje'), v: n1(h.swell.hs), u: 'm', s: `${Math.round(h.swell.tp)} s · ${L2('from', 'de')} ${compass(h.swell.fromDeg)}`, deg: h.swell.fromDeg, trains: h.swell.trains, help: 'swell', src: 'WW3' });
    if ((has('wind') || S.act === 'sail' || S.act === 'surf') && h.wind)
      out.push({ k: 'wind', l: L2('Wind', 'Viento'), v: n0(h.wind.kt), u: 'kt', s: `${compass(h.wind.fromDeg)}${fin(h.wind.gustKt) ? ` · ${L2('gusts', 'ráfagas')} ${n0(h.wind.gustKt)}` : ''}`, deg: h.wind.fromDeg, help: 'wind', src: 'ECMWF · GFS' });
    if ((has('currents') || S.act === 'snorkel' || S.act === 'dive') && h.current && !h.land)
      out.push({ k: 'current', l: L2('Current', 'Corriente'), v: n1(h.current.kt), u: 'kt', s: `${L2('sets', 'hacia')} ${compass(h.current.toDeg)}`, deg: h.current.toDeg, help: 'current', src: 'SMOC' });
    if ((has('sst') || has('fronts') || S.act === 'swim' || S.act === 'dive' || S.coral) && fin(h.sstC) && !h.land)
      out.push({ k: 'sst', l: L2('Water', 'Agua'), v: n1(h.sstC), u: '°C', s: h.sstC >= 29.5 ? L2('Very warm', 'Muy cálida') : h.sstC >= 27 ? L2('Warm, no wetsuit', 'Cálida, sin traje') : L2('Cool for here', 'Fresca para aquí'), val: h.sstC, help: 'sst', src: L2('satellite', 'satélite') });
    if ((has('clarity') || S.act === 'snorkel' || S.act === 'dive') && fin(h.visM) && !h.land)
      out.push({ k: 'clarity', l: L2('Visibility', 'Visibilidad'), v: h.visM >= 10 ? n0(h.visM) : n1(h.visM), u: 'm', s: h.visM < 4 ? L2('Murky, river water', 'Turbia, agua de río') : h.visM < 10 ? L2('Hazy', 'Algo turbia') : L2('Clear', 'Clara'), val: h.visM, help: 'vis', src: 'Kd490' });
    if (has('sargassum') && h.sarg) out.push({ k: 'sarg', l: L2('Sargassum', 'Sargazo'), v: t(`sarg.level.${h.sarg.level}` as Key) || h.sarg.level, u: '', s: titleCase(h.sarg.beach), help: 'sargassum', lv: h.sarg.level === 'HIGH' ? 0 : h.sarg.level === 'MED' || h.sarg.level === 'MOD' ? 2 : 4 });
    if ((has('weather') || S.act === 'swim' || S.act === 'sail') && h.rain)
      out.push({ k: 'rain', l: L2('Rain', 'Lluvia'), v: fin(h.rain.mmH) ? n1(h.rain.mmH) : '--', u: 'mm/h', s: fin(h.rain.pct) ? `${n0(h.rain.pct)}% ${L2('chance', 'prob.')}` : '', val: h.rain.mmH ?? 0, help: 'rain', src: L2('4 models', '4 modelos') });
    if (has('lightning') && fin(h.lightningKm) && h.lightningKm < 60) out.push({ k: 'lightning', l: L2('Lightning', 'Rayos'), v: n0(h.lightningKm), u: 'km', s: h.lightningKm < 25 ? L2('Get out of the water', 'Salga del agua') : L2('Nearest flash', 'Rayo más cercano'), val: h.lightningKm, help: 'lightningNear', src: 'GLM' });
    if ((has('rip') || S.act === 'swim' || S.act === 'surf') && h.rip) {
      const lv = h.rip.level === 'HIGH' ? 0 : h.rip.level === 'MOD' ? 2 : 4;
      out.push({ k: 'rip', l: L2('Rip risk', 'Resaca'), v: h.rip.level === 'HIGH' ? L2('High', 'Alta') : h.rip.level === 'MOD' ? L2('Mod', 'Mod') : L2('Low', 'Baja'), u: '', s: titleCase(h.rip.spot), lv, help: 'rip' });
    }
    if (has('fishing') || S.act === 'fish') {
      const s = spot(), r = rate('fish', s, t0);
      if (r.score !== null) out.push({ k: 'bite', l: 'BITE', v: n0(r.score), u: '/100', s: titleCase(s.name), lv: r.level, help: 'bite' });
    }
    if ((has('depth') || has('reefs') || S.act === 'dive' || S.act === 'fish') && fin(h.depthM) && !h.land)
      out.push({ k: 'depth', l: L2('Depth', 'Prof.'), v: h.depthM >= 10 ? n0(h.depthM) : n1(h.depthM), u: 'm', s: L2('GEBCO · not for navigation', 'GEBCO · no para navegar'), val: h.depthM, help: 'depth', src: 'GEBCO' });
    if (has('zones') && h.zone) out.push({ k: 'zone', l: L2('Zone', 'Zona'), v: '', u: '', s: h.zone, help: 'zone', lv: null });
    const td = tideNow(t0);
    out.push({ k: 'tide', l: L2('Tide', 'Marea'), v: `${td.m >= 0 ? '+' : ''}${td.m.toFixed(2)}`, u: 'm', s: `${td.rising ? L2('Rising', 'Subiendo') : L2('Falling', 'Bajando')} · ${L2('Limón harmonics', 'armónicos Limón')}`, curve: td.curve, at: td.at, help: 'tide', src: L2('exact', 'exacta') });
    if (fin(h.uv)) out.push({ k: 'uv', l: 'UV', v: n0(h.uv), u: '', s: uvWord(h.uv), val: h.uv, help: 'uv', src: 'CAMS' });
    return out;
  };
  const llTxt = () => {
    const c = map.getCenter();
    return `${Math.abs(c.lat).toFixed(4)}° ${c.lat >= 0 ? 'N' : 'S'} · ${Math.abs(c.lng).toFixed(4)}° ${c.lng < 0 ? L2('W', 'O') : 'E'}`;
  };
  let lastR: Reading[] = [];
  const hereHTML = () =>
    `<p class="k-here-ll k-mono"><span>${esc(llTxt())}</span><span>${L2('Layers on · tap to explain', 'Capas activas · toque para explicar')}</span></p><div class="k-tiles"></div><button type="button" class="k-go2 k-all" data-all>${L2('All readings', 'Todas las lecturas')}${ARROW}</button>`;
  const bindHere = (el: HTMLElement) => {
    el.querySelector('[data-all]')?.addEventListener('click', () => openTool('cond'));
  };
  const accent = () => (S.coral ? 't-coral' : `t-${S.act}`);
  const fillTiles = (el: HTMLElement) => {
    const box = el.querySelector<HTMLElement>('.k-tiles');
    if (!box) return;
    box.innerHTML = lastR.map(tileHTML).join('');
    box.querySelectorAll<HTMLElement>('.k-tile').forEach((tl, i) =>
      tl.addEventListener('click', () => {
        const r = lastR[i];
        if (r?.help) d.explain(r.l, r.help);
      }),
    );
    drawTiles(box, lastR, accent());
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
      surge: [L2('Surge', 'Surge'), fin(r.water?.surgeMs) ? `${n1(r.water!.surgeMs!)}<small>m/s</small>` : '--'],
      gust: [L2('Gusts', 'Ráfagas'), fin(r.sail?.gustKt) ? `${n0(r.sail!.gustKt!)}<small>kt</small>` : '--'],
      sea: [L2('Swell', 'Oleaje'), fin(r.sail?.swellM) ? `${n1(r.sail!.swellM!)}<small>m</small>` : '--'],
      air: [L2('Air', 'Aire'), fin(h.airC) ? `${n0(h.airC)}°` : '--'],
    };
    const pick = { surf: ['swell', 'wind', 'tide', 'uv'], fish: ['tide', 'moon', 'wind', 'uv'], swim: ['rip', 'water', 'air', 'uv'], snorkel: ['vis', 'current', 'water', 'uv'], dive: ['vis', 'surge', 'water', 'uv'], sail: ['wind', 'gust', 'sea', 'uv'] }[S.act];
    return `<div class="k-minis">${pick.map((k) => `<div><span>${C[k][0]}</span><b>${C[k][1]}</b></div>`).join('')}</div>`;
  };
  const segs = (share: number | null) => `<span class="k-segs" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${share !== null && i < Math.round(share * 10) ? 'k-f' : ''}"></i>`).join('')}</span>`;
  const bestIn = (s: Spot, from: number, hours: number) => {
    let best: FcRead | null = null;
    for (let o = 0; o < hours; o++) {
      const t1 = from + o * H, sk = sky(t1, s.lngLat[1], s.lngLat[0]);
      if (sk.sun.sunrise === null || sk.sun.sunset === null || t1 < sk.sun.sunrise || t1 >= sk.sun.sunset) continue;
      const r = rate(S.act, s, t1);
      if (r.score !== null && (!best || (r.share ?? 0) > (best.share ?? 0))) best = r;
    }
    return best;
  };
  const spotCardHTML = () => {
    const s = spot(), t0 = ms(), r = rate(S.act, s, t0), hl = headline(r), dd = dateOf(t0);
    const strip = Array.from({ length: 12 }, (_, i) => rate(S.act, s, t0 + i * H).level);
    const b = bestIn(s, Math.floor(Date.now() / H) * H, 7 * 24);
    const bw = b ? `${DN()[local(b.ms).getUTCDay()]} ${local(b.ms).getUTCDate()} · ${hhmm(b.ms)}` : L2('No good window this week', 'Sin buena ventana esta semana');
    const bh = b ? headline(b) : null;
    const lv = r.level === null ? 'n' : r.level;
    const rs = r.score === null ? '' : r.activity === 'surf' ? `${n1(r.score)}<small>/10</small>` : `${n0(r.score)}<small>/100</small>`;
    return `<article class="k-scard k-lv${lv}" aria-label="${esc(titleCase(s.name))}">
      <div class="k-sm k-mono"><span>${esc(modeName(S.act))} · Spot</span><span>${time.offsetH() === 0 ? L2('Now', 'Ahora') : `${dd.wd} ${dd.n}`} · ${hhmm(t0)}</span></div>
      <h3>${esc(titleCase(s.name))}</h3>
      <div class="k-big">${esc(hl.value)}<span class="k-u">${esc(hl.unit)}</span></div>
      <div class="k-rt"><span class="k-rw">${esc(levelWord(r.level))}</span>${rs ? `<span class="k-rs">${rs}</span>` : ''}${segs(r.share)}</div>
      <ul class="k-chips k-mono">${reasonsOf(r).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${minis(s, r, t0)}
      <div class="k-strip" aria-hidden="true">${strip.map((l) => `<i style="height:${l === null ? 8 : 24 + l * 19}%"></i>`).join('')}</div><div class="k-strip-l k-mono"><span>${time.offsetH() === 0 ? L2('Now', 'Ahora') : hhmm(t0)}</span><span>+12 h</span></div>
      <div class="k-sbest"><span class="k-mono">${L2('Best time this week', 'Mejor momento de la semana')}</span><span class="k-bw">${esc(bw)}</span><span class="k-bv">${bh ? `${esc(bh.value)} ${esc(bh.unit.startsWith('/') ? '' : bh.unit)}` : ''}</span></div>
    </article>
    <div class="k-sacts"><button type="button" class="k-go" data-go="fc"><span>${L2('Open forecast', 'Abrir pronóstico')}</span>${ARROW}</button><button type="button" class="k-go2" data-go="centre">${L2('Centre', 'Centrar')}</button></div>`;
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
  const bindCard = (el: HTMLElement) =>
    el.querySelectorAll<HTMLElement>('[data-go]').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.go;
        if (k === 'centre') {
          const at = S.coral ? reef()?.lngLat : spot().lngLat;
          if (at) map.flyTo({ center: at, zoom: Math.max(map.getZoom(), 12.5) });
          if (!WIDE.matches) closeSheet();
        } else if (k === 'fc') d.forecast.open({ spot: spot().name, activity: S.act });
        else if (k === 'coralpage') d.openCoralPage(reef()?.id ?? 'cahuita');
      }),
    );
  const inspectorHTML = () =>
    `<div class="k-sec-head"><h2>${S.coral ? L2('Reef', 'Arrecife') : 'Spot'}</h2><p class="k-mono">${L2('Tap a pin to change', 'Toque un punto')}</p></div><div id="k-cardbox">${S.coral ? coralCardHTML() : spotCardHTML()}</div><section id="k-heresec" class="k-heresec"><div class="k-sec-head"><h2>${L2('Under the crosshair', 'Bajo la mira')}</h2></div>${hereHTML()}</section>`;
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
    $('k-ttlact').textContent = modeName(mode());
    $('k-vspot').textContent = S.coral ? titleCase(reef()?.name ?? 'Reef').split(' · ')[0] : titleCase(spot().name);
    if (WIDE.matches) {
      if (!railR.querySelector('#k-cardbox')) {
        railR.innerHTML = inspectorHTML();
        bindHere(railR);
        bindCard(railR);
      } else {
        const b = railR.querySelector<HTMLElement>('#k-cardbox')!;
        b.innerHTML = S.coral ? coralCardHTML() : spotCardHTML();
        bindCard(b);
        railR.querySelector('.k-sec-head h2')!.textContent = S.coral ? L2('Reef', 'Arrecife') : 'Spot';
      }
    }
    if (S.sheet === 'spot' || S.sheet === 'coral') {
      shBody.innerHTML = S.coral ? coralCardHTML() : spotCardHTML();
      bindCard(shBody);
      shTitle.textContent = S.coral ? L2('Reef', 'Arrecife') : 'Spot';
    }
  };
  $('k-dkspot').addEventListener('click', () => openSheet(S.coral ? 'coral' : 'spot'));

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
  let scrubQueued = false;
  function drawScrub() {
    if (scrubQueued) return;
    scrubQueued = true;
    requestAnimationFrame(() => {
      scrubQueued = false;
      if (d.forecast.isOpen()) return;
      scrub.set({ level: scrubLevel, isDay: scrubDay, date: (o) => dateOf(offMs(o)) }, time.offsetH());
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
  function openSheet(kind: string) {
    S.sheet = kind;
    sheet.classList.remove('k-wide');
    if (kind === 'layers') {
      shTitle.textContent = L2('Layers', 'Capas');
      renderComposer();
    } else if (kind === 'spot' || kind === 'coral') renderSpot();
    else if (kind === 'here') {
      shTitle.textContent = L2('Under the crosshair', 'Bajo la mira');
      shBody.innerHTML = hereHTML();
      bindHere(shBody);
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
    } else if (kind === 'age') {
      shTitle.textContent = L2('Data age', 'Edad de los datos');
      shBody.innerHTML = ageHTML();
      shBody.querySelector('[data-check]')?.addEventListener('click', () => openTool('check'));
    }
    sheet.classList.add('k-open');
    scrim.classList.toggle('k-on', !WIDE.matches);
    shBody.scrollTop = 0;
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
  $('k-set').addEventListener('click', () => (S.sheet === 'settings' ? closeSheet() : openSheet('settings')));
  $('k-age').addEventListener('click', () => (S.sheet === 'age' ? closeSheet() : openSheet('age')));
  $('k-back').addEventListener('click', () => d.forecast.open({ spot: spot().name, activity: S.act }));
  map.on('click', () => !WIDE.matches && S.sheet && S.sheet !== 'here' && closeSheet());

  /** An old drawer (WATCH, BOAT, CORAL SITES, LIVE OBS, SYSTEM CHECK, CONDITIONS...), restyled, over the map. */
  function openTool(id: SheetId | 'sync') {
    closeSheet();
    if (id === 'sync') return void document.getElementById('sync')?.click();
    d.sheets.open(id);
  }
  d.sheets.subscribe(() => document.body.classList.toggle('km-tool', !!d.sheets.current()));

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
    <div class="k-addh"><b>${L2('Tools', 'Herramientas')}</b><span class="k-mono">${L2('Everything from the classic map', 'Todo el mapa clásico')}</span></div>
    <div class="k-tools">${d.tools.map((x) => `<button type="button" class="k-toolb" data-tool="${x.id}"><span><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></span>${ARROW}</button>`).join('')}</div>`;
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
    el.querySelectorAll<HTMLElement>('[data-tool]').forEach((b) => b.addEventListener('click', () => openTool(b.dataset.tool as SheetId | 'sync')));
  };

  const FEEDS: [string, string, string][] = [
    ['waves', L2('Waves', 'Olas'), 'ECMWF WAM · WW3'], ['wind', L2('Wind map', 'Mapa de viento'), 'ECMWF · GFS'], ['spotwind', L2('Wind at the spots', 'Viento en los spots'), L2('4 models', '4 modelos')],
    ['weather', L2('Weather', 'Tiempo'), 'IFS · UKMO · GFS · ICON'], ['currents', L2('Currents', 'Corrientes'), 'Copernicus SMOC'], ['raincells', L2('Rain nowcast', 'Lluvia ahora'), 'IMERG'],
    ['lightning', L2('Lightning', 'Rayos'), 'GOES GLM'], ['sst', L2('Sea temperature', 'Temp. del mar'), L2('satellite', 'satélite')], ['chl', L2('Ocean colour', 'Color del océano'), L2('satellite', 'satélite')],
    ['sargassum', 'Sargassum', 'USF SaWS'], ['river', L2('River flow', 'Caudal de ríos'), 'GloFAS'], ['coral', L2('Coral heat', 'Calor del coral'), 'NOAA CRW'],
    ['gauge', L2('Tide gauge', 'Mareógrafo'), 'IOC Limón'], ['metar', L2('Airport', 'Aeropuerto'), 'METAR MRLM'], ['uv', 'UV', 'CAMS'],
  ];
  const ageHTML = () => {
    const now = Date.now();
    return `<p class="k-mono k-fcap">${L2('Age of each feed, from its own fetch time', 'Edad de cada fuente, desde su propia descarga')}</p><div class="k-feeds">${FEEDS.map(([f, n, src]) => {
      const a = dataAge.get(f);
      const age = a ? now - a.fetchedAt : NaN, st = a ? ageState(age) : 'none';
      const col = st === 'fresh' ? 'var(--c-win)' : st === 'aging' ? 'var(--c-sun)' : st === 'stale' ? 'var(--lv0)' : 'var(--lvn)';
      const h = age / H;
      const txt = !a ? '--' : h < 1 ? `${Math.max(1, Math.round(age / 6e4))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
      return `<div class="k-feed" style="--fc:${col}"><i></i><span>${esc(n)}<small>${esc(src)}${a?.fromCache ? ` · ${L2('offline copy', 'copia sin conexión')}` : ''}</small></span><b>${esc(txt)}</b></div>`;
    }).join('')}<div class="k-feed" style="--fc:var(--c-win)"><i></i><span>${L2('Tides, sun and moon', 'Mareas, sol y luna')}<small>${L2('Computed on this device, exact', 'Calculado en este dispositivo')}</small></span><b>—</b></div></div><button type="button" class="k-go2 k-all" data-check>${L2('System check', 'Revisión del sistema')}${ARROW}</button>`;
  };
  const renderAge = () => {
    const o = dataAge.oldest();
    const el = $('k-age');
    const a = o ? Date.now() - o.fetchedAt : NaN, st = o ? ageState(a) : 'none';
    el.dataset.b = st === 'fresh' ? 'forecast' : st === 'aging' ? 'lowconf' : st === 'stale' ? 'outlook' : 'none';
    const h = a / H;
    el.lastElementChild!.textContent = o ? `${L2('Data', 'Datos')} ${h < 1 ? `${Math.max(1, Math.round(a / 6e4))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`}` : L2('Data --', 'Datos --');
  };
  dataAge.subscribe(() => (renderAge(), renderComposer()));
  setInterval(renderAge, 60_000);

  /* ---------- language, scheme ---------- */
  app.querySelectorAll<HTMLElement>('.k-lang button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === settings.lang()));
    b.addEventListener('click', () => b.dataset.lang !== settings.lang() && d.setLang(b.dataset.lang as 'en' | 'es'));
  });
  function setScheme(s: 'light' | 'dark') {
    saveScheme(s, storage);
    root.dataset.scheme = s;
    resetTokens();
    styleBaseMap(map);
    // The old map layers read their colours once, when built: reload to repaint them in the new scheme.
    d.reload();
  }
  $('k-scheme').addEventListener('click', () => setScheme(currentScheme() === 'dark' ? 'light' : 'dark'));

  /* ---------- views ---------- */
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
  window.addEventListener('fc-hide', () => setTimeout(() => (renderAll(), pad()), 0));
  if (document.fonts?.ready) document.fonts.ready.then(() => (placeBar(), drawScrub()));
  d.coralMode.set(S.coral);
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
      d.coralMode.set(false);
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
