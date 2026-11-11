/**
 * FORECAST page (PLAN 7.52, redesigned as Kinetic Plus in PLAN 7.69): a clean full-screen page beside the map for
 * one spot and one activity, built for reading at a glance rather than for the HUD. It has its own look
 * (forecast.css: light and dark mode, not the map themes, per Joseph) and its own link, `#forecast/<spot>/<activity>`,
 * so it can be bookmarked. It is the app's main page (PLAN 7.65): the bare address opens it, and the map is a page
 * under it at `#map`; the phone's back button moves between the two.
 *
 * Top to bottom: the spot and the activity tabs; the hero, a full-bleed colour field that is the rating, with a
 * living picture drawn from the reading (art.ts) beside the one number that matters, its rating, why, and the
 * week's best time; the spots as mini forecasts; eight conditions tiles with their own pictures (tiles.ts); the
 * live map at the spot under a radar; the next 7 days as bars (tap one to move the hero there); and the hour-by-hour
 * charts under a readout (charts.ts). Every number comes from src/forecast/model.ts, formatted in view.ts and
 * written out by render.ts, which are pure and tested.
 */
import { t, type Key } from '../i18n';
import { localDayStart } from '../physics/astro';
import { REGION, SPOTS, SPOT_RENAMES } from '../region';
import { localClock } from '../tide-chart';
import type { Spot } from '../metrics/forecast';
import type { Plan } from '../metrics/plan';
import { drawRadar, heroParams, HeroEngine, numVar, VMAX } from './art';
import { bestBands, chartLayout, drawChartBase, drawChartTop, rowsFor, type ChartLayout } from './charts';
import { clamp, readTokens, rgba, TAU, type Tokens, type TokenName } from './kit';
import { drawTile } from './tiles';
import {
  bestHtml, chartLabelsHtml, chipsHtml, daysHtml, esc, rateHtml, readoutHtml, shellHtml, spotsHtml, tilesHtml,
} from './render';
import {
  bestTimeView, coverPlace, dayDate, dayLabel, daysView, heroView, n0, n1, readoutView, rowText, sentence, spotView, tilesFor, titleCase,
  type TileView, type ViewCtx,
} from './view';
import {
  FC_ACTIVITIES, dayUvPeaks, daysAt, hourWeather, isFcActivity, landing, MAP_HASH, parseRoute, readAt, routeHash, spotsForActivity, chooseSpot, timeline,
  type FcActivity, type FcDeps, type FcRead, type Level, type TimelineHour,
} from './model';
import './fonts';
import './forecast.css';

const H = 3.6e6, DAY = 864e5;
const TZ = REGION.tzOffsetH;
const ACT_KEY = 'ft.fcActivity';
const SPOT_KEY = 'ft.fcSpot';
const SCHEME_KEY = 'ft.fcScheme';

type Store = Pick<Storage, 'getItem' | 'setItem'> | undefined;
const get = (s: Store, k: string) => {
  try {
    return s?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const put = (s: Store, k: string, v: string) => {
  try {
    s?.setItem(k, v);
  } catch {
    /* private mode: lasts until reload */
  }
};

export interface ForecastDeps extends FcDeps {
  storage: Store;
  /** The active language and a switch to the other one (reloads; the hash keeps the page open). */
  lang: () => 'en' | 'es';
  setLang: (l: 'en' | 'es') => void;
  /** Where the map is, for the first spot when none is remembered. */
  center: () => [number, number];
  /** Open the map for an activity at a spot: its layer preset, zoomed in with the crosshair on the spot (PLAN 7.68). */
  openMap?: (spot: Spot, a: FcActivity) => void;
  /**
   * A picture of the live map around a spot, where the spot sits in it (0..1 across and down) and its ground scale
   * (m per picture pixel, for the radar's kilometre rings); null if it cannot be taken.
   */
  mapPreview?: (spot: Spot) => Promise<{ url: string; x: number; y: number; mPerPx?: number } | null>;
  /** Open the CORAL page at the reef nearest this spot (PLAN 7.66); no button when left out. */
  openCoral?: (at: [number, number]) => void;
}

const lvTok = (l: Level | null, p: 'lv' | 'on' | 'ac') => (l === null ? `${p}n` : `${p}${l}`) as TokenName;

export function mountForecastPage(deps: ForecastDeps) {
  const { storage } = deps;
  const el = document.createElement('div');
  el.className = 'fc';
  el.id = 'forecast';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'fc-name');
  el.innerHTML = shellHtml({ acts: FC_ACTIVITIES, lang: deps.lang(), coral: !!deps.openCoral });
  document.body.appendChild(el);
  const $ = (id: string) => el.querySelector<HTMLElement>('#' + id)!;
  /** Replace a block's markup only when it changed, so the periodic redraw does not replay its animations. */
  const html = (id: string, markup: string) => {
    const e = $(id);
    if (e.dataset.html === markup) return false;
    e.innerHTML = markup;
    e.dataset.html = markup;
    return true;
  };
  const motionQ = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = !!motionQ?.matches;

  // --- light / dark: the OS setting until the user picks one here
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const scheme = () => (get(storage, SCHEME_KEY) as 'light' | 'dark' | null) ?? (media?.matches ? 'dark' : 'light');
  let T: Tokens | null = null;
  const applyScheme = () => {
    const s = scheme();
    el.dataset.scheme = s;
    $('fc-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (el.hidden) return;
    themeMeta();
    T = readTokens(el);
    engine.setTokens(T, true);
    chartDirty = true;
    drawAll(true);
  };
  media?.addEventListener?.('change', applyScheme);
  $('fc-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  el.querySelector('#fc-coral')?.addEventListener('click', () => deps.openCoral?.(spot().lngLat));
  el.querySelectorAll<HTMLElement>('.fc-lang [data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.lang as 'en' | 'es';
      if (l !== deps.lang()) deps.setLang(l);
    }),
  );

  // The browser bar follows the page while it is open, the map's theme otherwise.
  const meta = document.querySelector('meta[name="theme-color"]');
  const mapMeta = meta?.getAttribute('content') ?? null;
  const themeMeta = () => meta?.setAttribute('content', getComputedStyle(el).getPropertyValue('--fc-bg').trim() || '#ffffff');

  // --- state
  let act: FcActivity = (() => {
    const v = get(storage, ACT_KEY);
    return isFcActivity(v) ? v : 'surf';
  })();
  // A spot saved under an old name (SPOT_RENAMES) opens under its new one.
  let spotName: string = ((n) => SPOT_RENAMES[n] ?? n)(get(storage, SPOT_KEY) ?? '');
  /** The hour the hero shows; null = now. */
  let sel: number | null = null;
  let plan: Plan | null = null;
  let planKey = '';
  /** We pushed the history entry, so closing can step back instead of adding one. */
  let pushed = false;
  let shownSpot = '';
  let tl: TimelineHour[] = [];
  let tlKey = '';
  let openedAt = 0;
  let heroRead: FcRead | null = null;
  /** Which tiles show their tip (by activity and place), kept across redraws. */
  const openTiles = new Set<string>();

  const spots = () => spotsForActivity(act, SPOTS);
  /** The spot shown, and the one asked for when it has no forecast for this activity (`chooseSpot`). */
  const spot = (): Spot => chooseSpot(spotName, act, SPOTS).spot;
  const swapped = () => chooseSpot(spotName, act, SPOTS).asked;
  const nowHour = () => Math.floor(Date.now() / H) * H;
  const when = () => sel ?? nowHour();
  const actWord = () => t(`fc.act.${act}` as Key);

  // --- the hero's canvases
  const engine = new HeroEngine($('fc-fx') as HTMLCanvasElement, $('fc-ov') as HTMLCanvasElement, $('fc-hero'), $('fc-art'));
  engine.reduced = reduced;

  // --- tabs
  const placeBar = () => {
    const b = el.querySelector<HTMLElement>(`.fc-tab[data-act="${act}"]`);
    if (!b) return;
    const bar = $('fc-tab-bar');
    bar.style.width = `${b.offsetWidth}px`;
    bar.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop + b.offsetHeight - 5}px)`;
  };
  const renderTabs = () => {
    el.querySelectorAll<HTMLElement>('.fc-tab').forEach((b) => {
      const yes = b.dataset.act === act;
      b.setAttribute('aria-selected', String(yes));
      b.tabIndex = yes ? 0 : -1;
    });
    el.dataset.act = act;
    placeBar();
  };

  /** The week's plan and the hour-by-hour timeline: rebuilt each hour, on a new spot or activity, and while feeds load. */
  const ensureData = () => {
    const sp = spot();
    const key = `${act}|${sp.name}|${nowHour()}`;
    if (key !== planKey || plan?.none === 'nodata') {
      plan = daysAt(deps, act, sp, Date.now(), 7);
      planKey = key;
    }
    if (key !== tlKey || tlPartial()) {
      tl = timeline(deps, act, sp, plan?.startMs ?? localDayStart(Date.now(), TZ));
      tlKey = key;
      chartDirty = true;
    }
  };
  const tlPartial = () =>
    !tl.length || tl.every((h) => h.read.level === null) || tl.every((h) => h.windKt === null) || tl.every((h) => h.rainMmH === null && h.cloudPct === null);
  const tlIndex = (ms: number) => (tl.length ? Math.round((ms - tl[0].ms) / H) : -1);
  const ctx = (): ViewCtx => ({ deps, spot: spot(), act, ms: when(), nowMs: nowHour(), plan, tl });

  // --- header and hero
  const fitHero = () => {
    const box = $('fc-numbox'), hn = $('fc-hn');
    const avail = box.clientWidth;
    if (!avail) return;
    hn.style.setProperty('--fs', '100px');
    const [wd, wg] = VMAX[act];
    hn.style.fontVariationSettings = `"wdth" ${wd}, "wght" ${wg}`;
    const wNat = hn.getBoundingClientRect().width;
    const big = window.innerWidth >= 960, cap = big ? 300 : Math.min(190, window.innerHeight * 0.24);
    hn.style.setProperty('--fs', `${clamp(((100 * avail) / Math.max(1, wNat)) * 0.97, 56, cap).toFixed(1)}px`);
    setVar(performance.now() / 1000);
  };
  const setVar = (tt: number) => {
    const [a, b] = numVar(engine.p, tt, reduced);
    $('fc-hn').style.fontVariationSettings = `"wdth" ${a.toFixed(1)}, "wght" ${b | 0}`;
  };
  const renderHero = () => {
    const sp = spot();
    const ms = when();
    const r = readAt(deps, act, sp, ms);
    heroRead = r;
    $('fc-name').textContent = titleCase(sp.name);
    const asked = swapped();
    $('fc-swap').hidden = !asked;
    $('fc-swap').textContent = asked ? t('fc.swapped', { asked: titleCase(asked), act: actWord().toLowerCase(), shown: titleCase(sp.name) }) : '';
    const at = t('fc.at', { day: sel === null ? t('fc.now') : dayDate(ms), time: localClock(ms) });
    html('fc-sub', `<b>${esc(sentence(t('fc.sub', { act: actWord().toLowerCase() })))}</b> · ${esc(at)}`);
    $('fc-when').textContent = at;
    const v = heroView(r, { plan, ms });
    $('fc-k').textContent = v.label;
    const numChanged = $('fc-num').textContent !== v.value || $('fc-unit').textContent !== v.unit;
    $('fc-num').textContent = v.value;
    $('fc-unit').textContent = v.unit;
    $('fc-words').textContent = v.words;
    html('fc-rate', rateHtml(v));
    html('fc-why', chipsHtml(v));
    const b = bestTimeView(plan, (x) => readAt(deps, act, sp, x), ms, sel !== null);
    const best = $('fc-best') as HTMLButtonElement;
    best.hidden = b.kind === 'hidden';
    best.disabled = b.kind === 'none';
    best.dataset.ms = b.startMs === null ? '' : String(b.startMs);
    best.dataset.kind = b.kind;
    html('fc-best', bestHtml(b));
    $('fc-art').setAttribute('aria-label',
      act === 'surf' ? t('fc.art.surf', { m: r.surf ? n1(r.surf.hb) : '--' })
      : act === 'fish' ? t('fc.art.fish')
      : act === 'swim' ? t('fc.art.swim', { flag: r.swim ? t(`fc.flag.${r.swim.rip}` as Key) : '--' })
      : act === 'sail' ? t('fc.art.sail', { kt: r.sail?.windKt === null || !r.sail ? '--' : n0(r.sail.windKt) })
      : t('fc.art.water', { m: r.water?.visM ? n1(r.water.visM) : '--' }));
    const lv = r.level === null ? '' : String(r.level);
    el.dataset.level = lv;
    $('fc-hero').dataset.level = lv;
    engine.set(heroParams(r, { deps, ms, plan, tl }), performance.now() / 1000);
    if (numChanged) fitHero();
    if (reduced && T) engine.still();
    // Shimmer placeholders while the feeds load (first 20 s); after that a plain "no data".
    el.classList.toggle('fc-loading', r.level === null && Date.now() - openedAt < 20_000);
    $('fc-now').hidden = sel === null;
  };

  // --- spots
  /** Each spot's next 12 hours as levels, for the cards; kept for the hour, rebuilt while empty. */
  const strips = new Map<string, (Level | null)[]>();
  const stripOf = (sp: Spot, now: number) => {
    const k = `${act}|${now}|${sp.name}`;
    let v = strips.get(k);
    if (!v || v.every((x) => x === null)) {
      if (strips.size > 120) strips.clear();
      v = Array.from({ length: 12 }, (_, i) => readAt(deps, act, sp, now + i * H).level);
      strips.set(k, v);
    }
    return v;
  };
  const renderSpots = () => {
    const now = nowHour();
    const cur = spot().name;
    $('fc-spots-cap').textContent = t('fc.spotsCap', { act: actWord() });
    html('fc-spots', spotsHtml(spots().map((s) => ({ id: s.name, ...spotView(s, readAt(deps, act, s, now), stripOf(s, now), hourWeather(deps.env, s, now)) })), cur));
    if (cur !== shownSpot) {
      shownSpot = cur;
      const rail = $('fc-spots');
      const on = rail.querySelector<HTMLElement>('[aria-selected="true"]');
      if (on && rail.scrollWidth > rail.clientWidth) {
        const pad = parseFloat(getComputedStyle(rail).paddingLeft) || 0;
        const left = on.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft - pad;
        rail.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
      }
    }
  };

  // --- conditions tiles
  let tiles: { el: HTMLElement; cv: HTMLCanvasElement; c: CanvasRenderingContext2D; w: number; h: number; v: TileView; drawn: boolean }[] = [];
  const tileVis = new Set<Element>();
  const tio = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? tileVis.add(e.target) : tileVis.delete(e.target))), { rootMargin: '60px' }) : null;
  const sizeTiles = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const o of tiles) {
      const r = o.cv.getBoundingClientRect();
      o.w = r.width;
      o.h = r.height;
      o.cv.width = Math.max(1, Math.round(r.width * dpr));
      o.cv.height = Math.max(1, Math.round(r.height * dpr));
      o.c.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.drawn = false;
    }
    // Long values shrink to fit their tile.
    el.querySelectorAll<HTMLElement>('.fc-t-val').forEach((v) => {
      v.style.fontSize = '';
      let fs = parseFloat(getComputedStyle(v).fontSize), n = 0;
      while (v.scrollWidth > v.clientWidth + 1 && fs > 18 && n++ < 30) (fs -= 1.5), (v.style.fontSize = `${fs}px`);
    });
  };
  const drawTiles = (tt: number, all = false) => {
    if (!T) return;
    const I = rgba(T.ink), B = rgba(T.block);
    const words = { period: t('fc.vz.period'), from: t('fc.cap.from', { deg: '', dir: '' }).replace(/[°\s]+$/, '') };
    const heroA = rgba(T[lvTok(heroRead?.level ?? null, 'ac')]);
    for (const o of tiles) {
      if (!all && !reduced && o.drawn && !tileVis.has(o.el)) continue;
      o.drawn = true;
      const A = o.v.kind === 'uv' && o.v.lv !== null ? rgba(T[`uv${4 - o.v.lv}` as TokenName]) : o.v.lv !== null ? rgba(T[lvTok(o.v.lv, 'ac')]) : heroA;
      drawTile(o.v.kind, o.c, o.w, o.h, reduced ? 3.2 : tt, o.v.viz, { I, A, B, sand: T.sand, reduced, words });
    }
  };
  const renderTiles = (anim: boolean) => {
    const r = heroRead;
    if (!r) return;
    const c = ctx();
    const ms = c.ms;
    const d0 = localDayStart(ms, TZ);
    $('fc-cond-when').textContent = `${d0 === localDayStart(Date.now(), TZ) ? t('fc.today') : dayDate(ms)} · ${localClock(ms)}`;
    const list = tilesFor(r, c);
    if (html('fc-tiles', tilesHtml(list, () => false))) {
      tileVis.clear();
      tio?.disconnect();
      tiles = [...$('fc-tiles').querySelectorAll<HTMLElement>('.fc-tile')].map((e, i) => {
        const cv = e.querySelector('canvas')!;
        if (tio) tio.observe(e);
        else tileVis.add(e);
        if (openTiles.has(`${act}:${i}`)) e.setAttribute('aria-expanded', 'true');
        return { el: e, cv, c: cv.getContext('2d')!, w: 0, h: 0, v: list[i], drawn: false };
      });
      sizeTiles();
      if (anim && !reduced)
        tiles.forEach((o, i) => o.el.animate?.([{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(14px)' }, { clipPath: 'inset(0 0 0% 0)', transform: 'none' }], { duration: 560, delay: 60 + i * 45, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'backwards' }));
    } else tiles.forEach((o, i) => (o.v = list[i] ?? o.v));
    drawTiles(performance.now() / 1000, true);
  };
  const toggleTile = (e: Event) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('.fc-tile[aria-expanded]');
    if (!tile) return;
    const id = `${act}:${tile.dataset.tile}`;
    const open = !openTiles.has(id);
    if (open) openTiles.add(id);
    else openTiles.delete(id);
    tile.setAttribute('aria-expanded', String(open));
  };
  $('fc-tiles').addEventListener('click', toggleTile);
  $('fc-tiles').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), toggleTile(e));
  });

  // --- the next 7 days
  const renderDays = (anim: boolean) => {
    const p = plan;
    if (!p) return;
    const sp = spot();
    $('fc-days-cap').textContent = t('fc.daysCap', { what: t(`fc.daysWhat.${act}` as Key) });
    const uvs = dayUvPeaks(deps.env, sp, p.startMs, p.days.length);
    const selDay = Math.floor((localDayStart(when(), TZ) - p.startMs) / DAY);
    const changed = html('fc-days', daysHtml(daysView(p, (ms) => readAt(deps, act, sp, ms), uvs, selDay, sel !== null), t('fc.best')));
    if (changed && anim && !reduced)
      $('fc-days').querySelectorAll<HTMLElement>('.fc-bar').forEach((b, i) => b.animate?.([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 620, delay: i * 50, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'backwards' }));
  };

  // --- hour by hour
  let L: ChartLayout | null = null;
  let chartDirty = true;
  let chartFor = '';
  let chartP = 1, chartT0 = 0;
  let cursorI: number | null = null;
  let chartVis = false;
  let scrolledFor = '';
  const bctx = ($('fc-hx-base') as HTMLCanvasElement).getContext('2d')!;
  const tctx = ($('fc-hx-top') as HTMLCanvasElement).getContext('2d')!;
  const bands = () => (L ? bestBands((plan?.days ?? []).flatMap((d) => (d ? [{ startMs: d.startMs, endMs: d.endMs }] : [])), L.t0) : []);
  const drawBase = () => {
    if (!L || !T) return;
    drawChartBase(bctx, L, tl, T, chartP, { dayName: (ms, i) => dayLabel(localDayStart(ms, TZ), i), text: (s, v) => rowText(s, v) });
  };
  const drawTop = (tt: number) => {
    if (!L || !T) return;
    const ni = tlIndex(nowHour());
    drawChartTop(tctx, L, T, {
      bands: bands(), breath: reduced ? 0.5 : 0.5 + 0.5 * Math.sin((TAU * tt) / 4), nowI: ni, nowLabel: t('fc.now'),
      cursorI: cursorI ?? (sel === null ? null : tlIndex(sel)),
    });
  };
  const renderChart = (anim: boolean) => {
    const sp = spot();
    const sc = $('fc-tl');
    const wide = window.innerWidth >= 960;
    const lw = wide ? 150 : 96;
    const avail = Math.max(200, ($('fc-hx').clientWidth || 360) - lw);
    const px = wide ? Math.max(9, avail / 168) : 7;
    const key = `${tlKey}|${px.toFixed(2)}|${wide}`;
    if (!chartDirty && key === chartFor) return;
    chartDirty = false;
    chartFor = key;
    L = chartLayout(act, tl, px, wide, TZ);
    $('fc-hx').style.setProperty('--lw', `${lw}px`);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    $('fc-tl-in').style.width = `${L.W}px`;
    $('fc-tl-in').style.height = `${L.H}px`;
    for (const [cv, c] of [[$('fc-hx-base'), bctx], [$('fc-hx-top'), tctx]] as const) {
      const cc = cv as HTMLCanvasElement;
      cc.width = Math.max(1, Math.round(L.W * dpr));
      cc.height = Math.max(1, Math.round(L.H * dpr));
      cc.style.width = `${L.W}px`;
      cc.style.height = `${L.H}px`;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    $('fc-hx-lab').style.height = `${L.H}px`;
    html('fc-hx-lab', chartLabelsHtml(L));
    chartP = anim && !reduced ? 0 : 1;
    chartT0 = performance.now();
    drawBase();
    drawTop(performance.now() / 1000);
    // Open (or switch) with the present in view, not last midnight.
    const sk = `${act}|${sp.name}`;
    const ni = tlIndex(nowHour());
    if (sk !== scrolledFor && ni >= 0) {
      scrolledFor = sk;
      sc.scrollLeft = Math.max(0, (ni - 3) * px);
    }
    renderReadout();
  };
  const renderReadout = () => {
    const i = cursorI ?? tlIndex(when());
    const h = tl[clamp(i, 0, tl.length - 1)];
    if (!h) return;
    html('fc-readout', readoutHtml(readoutView(h, act, rowsFor(act))));
  };
  const setCursor = (i: number | null) => {
    if (L) i = i === null ? null : clamp(i, 0, tl.length - 1);
    if (i === cursorI) return;
    cursorI = i;
    renderReadout();
    if (reduced || !chartVis) drawTop(3);
  };
  const hourAtX = (clientX: number) => {
    const r = $('fc-tl-in').getBoundingClientRect();
    return L ? Math.floor((clientX - r.left) / L.px) : -1;
  };
  let dragging = false;
  $('fc-tl').addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || dragging) setCursor(hourAtX(e.clientX));
  });
  $('fc-tl').addEventListener('pointerdown', (e) => {
    dragging = e.pointerType !== 'mouse';
    setCursor(hourAtX(e.clientX));
  });
  $('fc-tl').addEventListener('pointerup', () => (dragging = false));
  $('fc-tl').addEventListener('pointercancel', () => (dragging = false));
  $('fc-tl').addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') setCursor(null);
  });
  // A tap (or click) picks the hour for the hero.
  $('fc-tl').addEventListener('click', (e) => {
    const i = hourAtX(e.clientX);
    if (i < 0 || i >= tl.length) return;
    pick(tl[i].ms, false);
  });
  $('fc-tl').addEventListener('keydown', (e) => {
    if (!L) return;
    if (e.key === 'Enter' && cursorI !== null) return void (e.preventDefault(), pick(tl[cursorI].ms, false));
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const sc = $('fc-tl');
    const i = clamp((cursorI ?? tlIndex(when())) + (e.key === 'ArrowRight' ? 1 : -1), 0, tl.length - 1);
    const x = (i + 0.5) * L.px;
    if (x < sc.scrollLeft + 20 || x > sc.scrollLeft + sc.clientWidth - 20) sc.scrollLeft = x - sc.clientWidth / 2;
    setCursor(i);
  });

  // --- the live-map card
  let previewFor = '';
  let previewAt = 0;
  let shot: { w: number; h: number; x: number; y: number; mPerPx: number | null } | null = null;
  let liveVis = false;
  const LV = { w: 0, h: 0 };
  const lctx = ($('fc-radar-cv') as HTMLCanvasElement).getContext('2d')!;
  const sizeLive = () => {
    const cv = $('fc-radar-cv') as HTMLCanvasElement;
    const r = $('fc-radar').getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    LV.w = r.width;
    LV.h = r.height;
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLive(performance.now() / 1000);
  };
  const drawLive = (tt: number) => {
    if (!T || !LV.w) return;
    const at = shot ? coverPlace(shot, LV, shot) : { x: LV.w / 2, y: LV.h / 2, kmPx: null };
    drawRadar(lctx, LV.w, LV.h, reduced ? 3.2 : tt, { cx: at.x, cy: at.y, kmPx: at.kmPx, name: titleCase(spot().name), level: heroRead?.level ?? null, T, reduced });
  };
  const renderRadar = () => {
    const sp = spot();
    const a = actWord().toLowerCase();
    $('fc-radar-big').textContent = t('fc.radarBig', { act: actWord() });
    $('fc-radar-sub').textContent = t('fc.radarSub', { act: a, spot: titleCase(sp.name) });
    $('fc-radar-hint').textContent = t('fc.radarHint', { act: a });
    $('fc-radar').setAttribute('aria-label', `${t('fc.radar')}: ${t('fc.radarSub', { act: a, spot: titleCase(sp.name) })}`);
    if (reduced || !liveVis) drawLive(3.2);
    if (!deps.mapPreview || (previewFor === sp.name && Date.now() - previewAt < 120_000)) return;
    previewFor = sp.name;
    previewAt = Date.now();
    void deps.mapPreview(sp).then((p) => {
      if (!p || previewFor !== sp.name) return;
      const img = new Image();
      img.onload = () => {
        if (previewFor !== sp.name) return;
        shot = { w: img.naturalWidth, h: img.naturalHeight, x: p.x, y: p.y, mPerPx: p.mPerPx ?? null };
        $('fc-radar-img').style.backgroundImage = `url(${p.url})`;
        $('fc-radar').classList.add('has-img');
        drawLive(performance.now() / 1000);
      };
      img.src = p.url;
    });
  };
  $('fc-radar').addEventListener('click', () => {
    if (deps.openMap) deps.openMap(spot(), act);
    else close();
  });

  // --- drawing loop: the hero field, visible tiles, the chart's top layer and the radar, only while on screen
  let raf = 0, last = 0, heroVis = true;
  const frame = (now: number) => {
    raf = 0;
    if (el.hidden) return;
    const tt = now / 1000, dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (heroVis) (engine.step(dt, tt), engine.overlay(tt), setVar(tt));
    drawTiles(tt);
    if (chartVis) {
      if (chartP < 1) (chartP = Math.min(1, (now - chartT0) / 900)), drawBase();
      drawTop(tt);
    }
    if (liveVis) drawLive(tt);
    kick();
  };
  const kick = () => {
    if (reduced || document.hidden || el.hidden || raf) return;
    if (heroVis || tileVis.size || chartVis || liveVis) (last = performance.now()), (raf = requestAnimationFrame(frame));
  };
  /** Everything at rest (reduced motion, a theme change): one still frame of each canvas. */
  const drawAll = (force = false) => {
    if (!T) return;
    if (reduced || force) {
      if (reduced) engine.still();
      drawTiles(3.2, true);
      drawBase();
      drawTop(3);
      drawLive(3.2);
    }
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => ((heroVis = es[0].isIntersecting), kick())).observe($('fc-hero'));
    new IntersectionObserver((es) => ((chartVis = es[0].isIntersecting), kick())).observe($('fc-hx'));
    new IntersectionObserver((es) => ((liveVis = es[0].isIntersecting), kick())).observe($('fc-radar'));
  } else chartVis = liveVis = true;
  document.addEventListener('visibilitychange', kick);
  motionQ?.addEventListener?.('change', (e) => {
    reduced = e.matches;
    engine.reduced = reduced;
    if (reduced) drawAll();
    else kick();
  });

  const render = (anim = false) => {
    if (el.hidden) return;
    if (!T) (T = readTokens(el)), engine.setTokens(T, true);
    ensureData();
    renderTabs();
    renderHero();
    renderSpots();
    renderTiles(anim);
    renderDays(anim);
    renderChart(anim);
    renderRadar();
    kick();
  };

  /** Move the hero to an hour (a day, the best time, a chart hour); null goes back to now. */
  const pick = (ms: number | null, scroll: boolean) => {
    sel = ms;
    cursorI = null;
    renderHero();
    renderTiles(false);
    renderDays(false);
    renderReadout();
    if (reduced || !chartVis) drawTop(3);
    const i = ms === null ? -1 : tlIndex(ms);
    if (scroll && i >= 0 && L) $('fc-tl').scrollTo({ left: Math.max(0, (i - 3) * L.px), behavior: reduced ? 'auto' : 'smooth' });
    if (!reduced) $('fc-hero').animate?.([{ filter: 'brightness(1.12)' }, { filter: 'none' }], { duration: 600, easing: 'ease-out' });
  };

  // --- events
  const heroParts = () => ['fc-k', 'fc-numbox', 'fc-words', 'fc-rate', 'fc-why', 'fc-best'].map($);
  let switching = 0;
  const setAct = (a: FcActivity) => {
    if (a === act) return;
    act = a;
    put(storage, ACT_KEY, act);
    sel = null;
    cursorI = null;
    syncHash();
    if (reduced) return render(false);
    const my = ++switching;
    heroParts().forEach((x, i) => x.animate?.([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 170, delay: i * 18, easing: 'ease-in', fill: 'forwards' }));
    window.setTimeout(() => {
      if (my !== switching) return;
      render(true);
      fitHero();
      heroParts().forEach((x, i) => {
        x.getAnimations?.().forEach((an) => an.cancel());
        x.animate?.([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: i * 45, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
      $('fc-hn').animate?.([{ letterSpacing: '-.12em', opacity: 0 }, { letterSpacing: '-.04em', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }, 230);
    renderTabs();
  };
  const stepAct = (dir: 1 | -1) => setAct(FC_ACTIVITIES[(FC_ACTIVITIES.indexOf(act) + dir + FC_ACTIVITIES.length) % FC_ACTIVITIES.length]);
  $('fc-tabs').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (b) setAct(b.dataset.act as FcActivity);
  });
  // Arrow keys move along the tabs, as in any tab list.
  $('fc-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    stepAct(e.key === 'ArrowRight' ? 1 : -1);
    el.querySelector<HTMLElement>(`.fc-tab[data-act="${act}"]`)?.focus();
  });
  // A sideways swipe across the hero switches activity on a phone.
  let swipe: { x: number; y: number; id: number } | null = null;
  $('fc-hero').addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  $('fc-hero').addEventListener('pointerup', (e) => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 45) stepAct(dx < 0 ? 1 : -1);
  });
  $('fc-hero').addEventListener('pointercancel', () => (swipe = null));
  $('fc-best').addEventListener('click', () => {
    const ms = Number($('fc-best').dataset.ms);
    if ($('fc-best').dataset.ms && Number.isFinite(ms)) pick(ms, true);
  });
  // The spots bar: translucent < > arrows at its ends, and with a mouse it scrolls on its own while the pointer is in the
  // outer 25% on either side (faster nearer the edge). Touch keeps plain swiping.
  {
    const rail = $('fc-spots'), wrap = $('fc-railwrap'), bl = $('fc-rl'), br = $('fc-rr');
    let dir = 0, raf = 0, last = 0;
    const arrows = () => {
      bl.hidden = rail.scrollLeft < 4;
      br.hidden = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 4;
    };
    const tick = (now: number) => {
      raf = 0;
      if (!dir) return;
      const dt = Math.min(50, now - (last || now));
      last = now;
      rail.scrollLeft += dir * dt * 0.9;
      raf = requestAnimationFrame(tick);
    };
    const go = (d: number) => {
      dir = d;
      if (d && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    wrap.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || rail.scrollWidth <= rail.clientWidth) return go(0);
      const r = rail.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
      go(f < 0.25 ? -(0.25 - f) * 4 : f > 0.75 ? (f - 0.75) * 4 : 0);
    });
    wrap.addEventListener('pointerleave', () => go(0));
    bl.addEventListener('click', () => rail.scrollBy({ left: -rail.clientWidth * 0.6, behavior: reduced ? 'auto' : 'smooth' }));
    br.addEventListener('click', () => rail.scrollBy({ left: rail.clientWidth * 0.6, behavior: reduced ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', arrows, { passive: true });
    window.addEventListener('resize', arrows);
    new MutationObserver(arrows).observe(rail, { childList: true });
    requestAnimationFrame(arrows);
  }
  $('fc-spots').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-spot]');
    if (!b) return;
    spotName = b.dataset.spot!;
    put(storage, SPOT_KEY, spotName);
    sel = null;
    cursorI = null;
    syncHash();
    render(true);
  });
  $('fc-days').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-day]');
    if (!b || !plan) return;
    const i = Number(b.dataset.day);
    const d = plan.days[i];
    pick(i === 0 && !d ? null : (d?.startMs ?? plan.startMs + i * DAY + 12 * H), true);
  });
  $('fc-now').addEventListener('click', () => pick(null, true));
  $('fc-back').addEventListener('click', () => close());
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') (e.stopPropagation(), close());
  });

  // Resizes: refit the number, the canvases and the tab bar; re-lay the chart when the width changes.
  let rzT = 0;
  const onResize = () => {
    if (el.hidden) return;
    window.clearTimeout(rzT);
    rzT = window.setTimeout(() => {
      engine.resize();
      fitHero();
      sizeTiles();
      sizeLive();
      placeBar();
      renderChart(false);
      drawAll();
      if (reduced) engine.still();
    }, 80);
  };
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(onResize);
    ro.observe($('fc-hero'));
    // The picture's own box also moves when the best-chance card appears or the data arrives, with the hero unchanged.
    ro.observe($('fc-art'));
  }
  void document.fonts?.ready.then(() => onResize());

  // --- routing: #forecast/<spot>/<activity>
  const syncHash = () => {
    const h = routeHash(spot().name, act);
    if (location.hash !== h) history.replaceState(history.state, '', h);
  };
  let timer = 0;
  // The main page: cover the map from the start, so it does not flash up before the first render.
  let booting = landing(location.hash) === 'forecast';
  if (booting) (el.hidden = false), document.body.classList.add('fc-open');
  const show = () => {
    if (!el.hidden && !booting) return;
    booting = false;
    el.hidden = false;
    document.body.classList.add('fc-open');
    openedAt = Date.now();
    scrolledFor = '';
    applyScheme();
    render();
    engine.resize();
    sizeLive();
    fitHero();
    if (reduced) drawAll();
    // Feeds load after start-up and age by the hour: redraw while open, every 3 s until the hero has data.
    const tick = () => {
      render();
      const waiting = !$('fc-hero').dataset.level || (tlPartial() && Date.now() - openedAt < 60_000);
      timer = window.setTimeout(tick, waiting ? 3000 : 60_000);
    };
    timer = window.setTimeout(tick, 3000);
  };
  const hide = () => {
    if (el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('fc-open');
    window.clearTimeout(timer);
    // The map's way back reads where the forecast was (PLAN 7.67).
    window.dispatchEvent(new CustomEvent('fc-hide'));
    if (mapMeta !== null) meta?.setAttribute('content', mapMeta);
  };
  const fromHash = () => {
    // The forecast is the main page: the bare address opens it; #map (or an old map link) shows the map.
    if (landing(location.hash) === 'map') return hide();
    const r = parseRoute(location.hash, SPOTS) ?? { spot: null, activity: null };
    if (r.activity) act = r.activity;
    if (r.spot) spotName = r.spot;
    if (el.hidden || booting) show();
    else render();
    syncHash();
  };
  window.addEventListener('hashchange', fromHash);

  /** Open on a spot and activity (defaults: the remembered ones, or the spot nearest the map). */
  const open = (opts: { spot?: string; activity?: FcActivity } = {}) => {
    if (opts.activity) act = opts.activity;
    if (opts.spot) spotName = opts.spot;
    sel = null;
    if (landing(location.hash) === 'map') {
      history.pushState({ fc: 1 }, '', routeHash(spot().name, act));
      pushed = true;
    }
    show();
    syncHash();
  };
  /** Go to the map. Back from the map returns here: to the page that pushed the forecast, or by its own entry. */
  const close = () => {
    if (pushed && history.state?.fc) {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      history.pushState({ map: 1 }, '', location.pathname + location.search + MAP_HASH);
      hide();
    }
  };

  // After start-up: the deps read feeds and panels main.ts declares further down.
  window.setTimeout(fromHash, 0);
  /** Where the forecast is, for the map's way back to it (PLAN 7.67). */
  const where = () => ({ spot: spot().name, activity: act });
  return { open, close, isOpen: () => !el.hidden, refresh: () => render(), where };
}
