/**
 * FORECAST page (PLAN 7.52): a clean full-screen page beside the map for one spot and one activity, built
 * for reading at a glance rather than for the HUD. It has its own look (forecast.css: light and dark mode,
 * not the map themes, per Joseph) and its own link, `#forecast/<spot>/<activity>`, so it can be bookmarked
 * and the phone's back button returns to the map.
 *
 * Top to bottom: the activity switch, the spots (each tinted with its rating now), the hero (a picture drawn
 * from the reading beside the one number that matters, its rating and why), then the next 7 days as bubbles
 * (WATCH's best window per day at this spot, the best day ringed). Tapping a day moves the hero to its window.
 * Every number comes from src/forecast/model.ts, which reads the scores the map already uses.
 */
import { t, type Key } from '../i18n';
import { localDayStart } from '../physics/astro';
import { REGION, SPOTS, SPOT_RENAMES } from '../region';
import { localClock } from '../tide-chart';
import { compassName } from '../spot-charts';
import type { Spot } from '../metrics/forecast';
import type { Plan, PlanDay } from '../metrics/plan';
import { heroArt } from './art';
import { ratingStrip, rowSvg, rowsFor, skyRow, timeAxis, type ChartGeom } from './charts';
import {
  FC_ACTIVITIES, beaufort, chopFor, dayUvPeaks, daysAt, surfSize as surfSizeOf, uvLevel, driftFor, isFcActivity, parseRoute, readAt, routeHash, spotsForActivity, timeline,
  type FcActivity, type FcDeps, type FcRead, type Level, type TimelineHour,
} from './model';
import './forecast.css';

const H = 3.6e6, DAY = 864e5;
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

/** "PLAYA COCLES" → "Playa Cocles"; "LIMÓN" → "Limón". */
export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
/** HUD caps to a sentence: "MOVING TIDE" → "Moving tide". */
export const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
const cmp = (deg: number | null | undefined) => (typeof deg === 'number' && Number.isFinite(deg) ? compassName(deg).replace(/W/g, t('hemi.W')) : '');
const n1 = (x: number) => x.toFixed(1);
const n0 = (x: number) => Math.round(x).toString();

const ICONS: Record<FcActivity, string> = {
  fish: '<path d="M3 12c3-4 9-5 13-1l4-3v8l-4-3c-4 4-10 3-13-1z"/><circle cx="8" cy="11" r="1"/>',
  surf: '<path d="M2 17c3 0 4-2 6-2s3 2 6 2 4-2 6-2"/><path d="M4 13c1-5 6-8 11-6-3 1-4 3-3 6"/>',
  snorkel: '<rect x="3" y="8" width="13" height="7" rx="3.5"/><path d="M19 4v10a3 3 0 0 1-3 3h-2"/>',
  dive: '<rect x="9" y="3" width="6" height="15" rx="3"/><path d="M12 18v3M9 7h6"/>',
  sail: '<path d="M12 3v14M12 4l7 12h-7M11 6l-6 10h6"/><path d="M3 19h18l-2 2H5z"/>',
  swim: '<circle cx="16" cy="6" r="2.2"/><path d="M4 12l5-3 3 3 4-2"/><path d="M2 17c2 0 3-1.5 5-1.5S10 17 12 17s3-1.5 5-1.5 3 1.5 5 1.5"/>',
};
const icon = (a: FcActivity) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[a]}</svg>`;

export interface ForecastDeps extends FcDeps {
  storage: Store;
  /** The active language and a switch to the other one (reloads; the hash keeps the page open). */
  lang: () => 'en' | 'es';
  setLang: (l: 'en' | 'es') => void;
  /** Where the map is, for the first spot when none is remembered. */
  center: () => [number, number];
}

/** Headline value as [text, unit] for the hero and the day bubbles. */
export function headline(r: FcRead): { value: string; unit: string } {
  if (r.score === null) return { value: '--', unit: '' };
  switch (r.activity) {
    case 'surf': {
      const [lo, hi] = r.surf!.range;
      return { value: hi < 0.15 ? '0' : lo === hi ? n1(lo) : `${n1(lo)}–${n1(hi)}`, unit: t('unit.m').toLowerCase() };
    }
    case 'fish':
    case 'swim':
      return { value: n0(r.score), unit: '/100' };
    case 'snorkel':
    case 'dive': {
      const v = r.water!.visM;
      return v === null ? { value: '--', unit: '' } : { value: v >= 10 ? n0(v) : n1(v), unit: t('unit.m').toLowerCase() };
    }
    case 'sail': {
      const k = r.sail!.windKt;
      return k === null ? { value: '--', unit: '' } : { value: n0(k), unit: 'kt' };
    }
  }
}

/** The reasons line: what holds the score back (or that nothing does). */
function reasons(r: FcRead): string[] {
  if (r.score === null) return [];
  if (r.surf) {
    const out: string[] = [];
    out.push(`${t('fc.wind')} ${t(`fc.wind.${r.surf.windKind}` as Key)}`);
    out.push(`${n0(r.surf.tp)} s · ${cmp(r.surf.dir)}`);
    if (r.surf.tideKind !== 'none') out.push(`${t('fc.tide')} ${t(`fc.tide.${r.surf.tideKind}` as Key)}`);
    return out;
  }
  if (r.fish) return r.fish.reasons.slice(0, 3).map((k) => sentence(t(`bite.r.${k}` as Key)));
  if (r.water) {
    const why = r.water.reasons.length ? r.water.reasons.slice(0, 3).map((k) => sentence(t(`dive.r.${k}` as Key))) : [t('fc.reason.none')];
    return r.water.access ? [sentence(t(`snk.access.${r.water.access}` as Key)), ...why] : why;
  }
  if (r.swim) {
    const w = r.swim;
    const why = w.reasons.length ? w.reasons.slice(0, 3).map((k) => t(`swim.r.${k}` as Key)) : [t('fc.reason.none')];
    // The rip risk itself is on the line above; these are what hold the day back.
    return why;
  }
  if (r.sail) {
    const s = r.sail, out: string[] = [];
    if (s.squall !== null && s.squall >= 1) out.push(`${t('fc.squall')}: ${t(`fc.squall.${Math.min(2, Math.round(s.squall))}` as Key).toLowerCase()}`);
    if (s.gustKt !== null && s.gustKt >= 18) out.push(t('fc.reason.gust', { kt: n0(s.gustKt) }));
    if (s.windKt !== null && s.windKt < 5) out.push(t('fc.reason.light'));
    if (s.windKt !== null && s.windKt >= 20) out.push(t('fc.reason.wind'));
    return out.length ? out : [t('fc.reason.none')];
  }
  return [];
}

/** The three stat tiles under the headline. */
function stats(r: FcRead, plan: Plan | null, selDay: number): [string, string][] {
  const dash = '--';
  const win = plan?.days[selDay];
  const winText = win ? t('fc.window', { from: localClock(win.startMs), to: localClock(win.endMs) }) : t('fc.noWindow');
  if (r.surf) {
    const s = r.surf;
    return [
      [t('fc.swell'), `${n1(s.hs)} m · ${n0(s.tp)} s · ${cmp(s.dir)}`],
      [t('fc.wind'), s.windKt === null ? dash : `${n0(s.windKt)} kt ${cmp(s.windFromDeg)} · ${t(`fc.wind.${s.windKind}` as Key)}`],
      [t('fc.bestWindow'), winText],
    ];
  }
  if (r.fish) {
    const f = r.fish;
    return [
      [t('fc.catch'), f.species.map((id) => titleCase(t(`fish.${id}` as Key))).join(' · ')],
      [t('fc.moon'), `${sentence(t(`astro.moon.${f.moonPhase}` as Key))} · ${n0(f.moonIllum * 100)}%`],
      [t('fc.tide'), t(f.tideRising ? 'fc.tide.rising' : 'fc.tide.falling')],
    ];
  }
  if (r.water && r.activity === 'snorkel') {
    // Snorkelling happens at the surface over a shallow reef: getting in, chop, drift, how much water, sun, stingers.
    const w = r.water;
    const uvWord = (uv: number) => sentence(t(uv >= 8 ? 'dive.uv.cover' : uv >= 6 ? 'dive.uv.high' : 'dive.uv.ok'));
    return [
      [t('fc.entry'), `${n1(w.breakerM)} m${w.rip ? ` · ${t('fc.rip')} ${sentence(t(`dive.rip.${w.rip}` as Key)).toLowerCase()}` : ''}`],
      [t('fc.chop'), w.windKt === null ? dash : `${t(`fc.chop.${chopFor(w.windKt)}` as Key)} · ${n0(w.windKt)} kt`],
      [t('fc.current'), w.currentKt === null ? dash : `${t(`fc.drift.${driftFor(w.currentKt)}` as Key)} · ${n1(w.currentKt)} kt`],
      [t('fc.overReef'), w.waterM === null ? dash : `${n1(w.waterM)} m`],
      [t('fc.uv'), w.uv === null ? dash : `${n0(w.uv)} · ${uvWord(w.uv)}`],
      [t('fc.stingers'), w.stingers === null ? dash : sentence(t(w.stingers ? 'snk.stingers.maybe' : 'snk.stingers.low'))],
    ];
  }
  if (r.water) {
    // Diving is about the bottom: surge at depth, drift, temperature for the suit.
    const w = r.water;
    return [
      [t('fc.surge', { d: w.depthM }), `${t(`fc.surge.${w.surge}` as Key)} · ${w.surgeMs.toFixed(2)} m/s`],
      [t('fc.current'), w.currentKt === null ? dash : `${t(`fc.drift.${driftFor(w.currentKt)}` as Key)} · ${n1(w.currentKt)} kt`],
      [t('fc.sst'), w.sstC === null ? dash : `${n1(w.sstC)} °C`],
      // A shore dive starts by swimming out through the break; the week's best time is in its own callout above.
      [t('fc.entry'), `${n1(w.breakerM)} m${w.rip ? ` · ${t('fc.rip')} ${sentence(t(`dive.rip.${w.rip}` as Key)).toLowerCase()}` : ''}`],
    ];
  }
  if (r.swim) {
    // A beach day: safety in the water first, then the sun, the heat and the water.
    const w = r.swim;
    const uvWord = (uv: number) => t(`fc.uvw.${uvLevel(uv)}` as Key);
    return [
      [t('fc.ripRisk'), t(`fc.ripw.${w.rip}` as Key)],
      [t('fc.shorebreak'), `${n1(w.breakerM)} m · ${t(`fc.size.${surfSizeOf(w.breakerM)}` as Key).toLowerCase()}`],
      [t('fc.uv'), w.uv === null ? dash : `${n0(w.uv)} · ${uvWord(w.uv)}`],
      [t('fc.feels'), w.feelsC === null ? dash : `${n0(w.feelsC)} °C${w.airC === null ? '' : ` · ${t('fc.airIs', { c: n0(w.airC) })}`}`],
      [t('fc.water'), w.sstC === null ? dash : `${n1(w.sstC)} °C`],
      [t('fc.wind'), w.windKt === null ? dash : `${n0(w.windKt)} kt${w.rainMmH !== null && w.rainMmH >= 0.2 ? ` · ${t('fc.row.rain').toLowerCase()} ${n1(w.rainMmH)} mm/h` : ''}`],
    ];
  }
  if (r.sail) {
    const s = r.sail;
    return [
      [t('fc.gust'), s.gustKt === null ? dash : `${n0(s.gustKt)} kt`],
      [t('fc.comfort'), r.score === null ? dash : `${n0(r.score)}/100`],
      [t('fc.swell'), s.swellM === null ? dash : `${n1(s.swellM)} m`],
    ];
  }
  return [];
}

/** Animate a number in `el` from what it shows to `to` (ranges "a–b" animate both ends). Instant under reduced motion. */
function countUp(el: HTMLElement, to: string) {
  const from = el.dataset.v ?? '';
  el.dataset.v = to;
  const nums = (s: string) => s.split('–').map(Number);
  const a = nums(from), b = nums(to);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || a.length !== b.length || [...a, ...b].some((x) => !Number.isFinite(x))) {
    el.textContent = to;
    return;
  }
  const dec = to.includes('.') ? 1 : 0;
  const t0 = performance.now(), dur = 550;
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - (1 - k) ** 3;
    el.textContent = k >= 1 ? to : a.map((x, i) => (x + (b[i] - x) * e).toFixed(dec)).join('–');
    if (k < 1 && el.dataset.v === to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const bar = (level: Level | null) =>
  `<span class="fc-bar" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i class="${level !== null && i <= level ? `on l${level}` : ''}" style="--i:${i}"></i>`).join('')}</span>`;

export function mountForecastPage(deps: ForecastDeps) {
  const { storage } = deps;
  const el = document.createElement('div');
  el.className = 'fc';
  el.id = 'forecast';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'fc-name');
  el.innerHTML = `
    <div class="fc-wrap">
      <header class="fc-head">
        <button type="button" class="fc-back" id="fc-back" title="${t('fc.backTitle')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>${t('fc.back')}</span></button>
        <div class="fc-titles"><h1 id="fc-name">--</h1><p id="fc-sub">--</p></div>
        <div class="fc-tools">
          <button type="button" class="fc-tool" id="fc-lang" title="${t('fc.lang')}">${deps.lang() === 'es' ? 'EN' : 'ES'}</button>
          <button type="button" class="fc-tool" id="fc-scheme" aria-label="${t('fc.scheme')}" title="${t('fc.scheme')}"></button>
        </div>
      </header>
      <nav class="fc-acts" role="tablist" aria-label="${t('fc.actGroup')}">
        ${FC_ACTIVITIES.map((a) => `<button type="button" role="tab" class="fc-act" data-act="${a}">${icon(a)}<span>${t(`fc.act.${a}` as Key)}</span></button>`).join('')}
        <span class="fc-act-ink" aria-hidden="true"></span>
      </nav>
      <div class="fc-spots" id="fc-spots" role="listbox" aria-label="${t('fc.spots')}"></div>
      <section class="fc-hero" id="fc-hero" aria-live="polite">
        <div class="fc-art-box"><div class="fc-art-in" id="fc-art"></div>
          <div class="fc-compass" id="fc-compass" hidden aria-hidden="true">
            <svg viewBox="-40 -40 80 80"><circle class="fc-cp-ring" r="34"/>
              <path class="fc-cp-shore" d="M-30.5,-15 A34,34 0 0 1 30.5,-15"/>
              <path class="fc-cp-ticks" d="M0,-34v6M34,0h-5M0,34v-5M-34,0h5"/><text class="fc-cp-n" y="-18" text-anchor="middle">N</text>
              <g class="fc-cp-swell"><path d="M0,-24 L7,-6 L2.5,-8 L2.5,22 L-2.5,22 L-2.5,-8 L-7,-6 Z"/></g>
              <g class="fc-cp-wind"><path d="M0,-28 L4.5,-17 L1.2,-18.5 L1.2,16 L-1.2,16 L-1.2,-18.5 L-4.5,-17 Z"/></g>
              <circle class="fc-cp-hub" r="3"/></svg>
            <ul class="fc-cp-key"><li class="fc-cp-k-swell" id="fc-cp-swell"></li><li class="fc-cp-k-wind" id="fc-cp-wind"></li></ul>
          </div>
        </div>
        <div class="fc-hero-data">
          <div class="fc-k" id="fc-k">--</div>
          <div class="fc-big"><span class="fc-num" id="fc-num">--</span><span class="fc-unit" id="fc-unit"></span></div>
          <div class="fc-size" id="fc-size"></div>
          <div class="fc-rate" id="fc-rate"></div>
          <button type="button" class="fc-best-time" id="fc-best-time" hidden></button>
          <ul class="fc-why" id="fc-why"></ul>
          <dl class="fc-stats" id="fc-stats"></dl>
        </div>
      </section>
      <section class="fc-card fc-days-card">
        <div class="fc-card-head"><h2>${t('fc.days')}</h2><button type="button" class="fc-now" id="fc-now" hidden>${t('fc.now')}</button></div>
        <div class="fc-days" id="fc-days"></div>
      </section>
      <section class="fc-card fc-hours-card">
        <div class="fc-card-head"><h2>${t('fc.hours')}</h2></div>
        <ul class="fc-readout" id="fc-readout" aria-live="polite"></ul>
        <div class="fc-tl" id="fc-tl"><div class="fc-tl-in" id="fc-tl-in"></div><div class="fc-nowline" id="fc-nowline" hidden><span>${t('fc.now')}</span></div><div class="fc-cursor" id="fc-cursor" hidden></div></div>
        <p class="fc-tl-hint">${t('fc.hoursHint')}</p>
      </section>
      <p class="fc-note">${t('fc.note')}</p>
    </div>`;
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
  /** Restart a one-shot CSS animation class on an element. */
  const replay = (e: Element, cls: string) => {
    e.classList.remove(cls);
    void (e as HTMLElement).offsetWidth;
    e.classList.add(cls);
  };
  const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // --- light / dark: the OS setting until the user picks one here
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const scheme = () => (get(storage, SCHEME_KEY) as 'light' | 'dark' | null) ?? (media?.matches ? 'dark' : 'light');
  const applyScheme = () => {
    const s = scheme();
    el.dataset.scheme = s;
    $('fc-scheme').innerHTML =
      s === 'dark'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
    $('fc-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (!el.hidden) themeMeta();
  };
  media?.addEventListener?.('change', applyScheme);
  $('fc-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  $('fc-lang').addEventListener('click', () => deps.setLang(deps.lang() === 'es' ? 'en' : 'es'));

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
  let geom: ChartGeom = { px: 6, tzOffsetH: REGION.tzOffsetH };
  /** The spot and activity the timeline was last scrolled to "now" for. */
  let scrolledFor = '';
  let openedAt = 0;
  let artFor = '';

  const spots = () => spotsForActivity(act, SPOTS);
  const nearestSpot = (list: Spot[]) => {
    const [x, y] = deps.center();
    return list.reduce((b, s) => (Math.hypot(s.lngLat[0] - x, s.lngLat[1] - y) < Math.hypot(b.lngLat[0] - x, b.lngLat[1] - y) ? s : b), list[0]);
  };
  const spot = (): Spot => {
    const list = spots();
    return list.find((s) => s.name === spotName) ?? (list.length ? nearestSpot(list) : SPOTS[0]);
  };
  const nowHour = () => Math.floor(Date.now() / H) * H;
  const when = () => sel ?? nowHour();

  const dayLabel = (dayMs: number, d: number) => {
    if (d === 0) return t('fc.today');
    if (d === 1) return t('fc.tomorrow');
    const x = new Date(dayMs + 12 * H + REGION.tzOffsetH * H);
    return `${sentence(t(`day.${x.getUTCDay()}` as Key))} ${x.getUTCDate()}`;
  };

  const renderActs = () => {
    let on: HTMLElement | null = null;
    el.querySelectorAll<HTMLElement>('.fc-act').forEach((b) => {
      const yes = b.dataset.act === act;
      b.classList.toggle('on', yes);
      b.setAttribute('aria-selected', String(yes));
      if (yes) on = b;
    });
    // The sliding highlight under the active activity.
    const ink = el.querySelector<HTMLElement>('.fc-act-ink')!;
    const b = on as HTMLElement | null;
    if (b) {
      ink.style.width = `${b.offsetWidth}px`;
      ink.style.transform = `translateX(${b.offsetLeft}px)`;
    }
  };

  /** Each spot's next 12 hours as levels, for the mini forecast cards; kept for the hour, rebuilt while empty. */
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
  const levelWord = (r: FcRead) => (r.level === null ? t('fc.nodata') : r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key));

  /** The spots as mini forecasts: name, the headline now, its rating, and the next 12 hours as a strip. Thumb-scroll, tap to switch. */
  const renderSpots = () => {
    const now = nowHour();
    const cur = spot().name;
    html('fc-spots', spots()
      .map((s) => {
        const r = readAt(deps, act, s, now);
        const hl = headline(r);
        const strip = stripOf(s, now).map((l) => `<i class="${l === null ? 'l-none' : `l${l}`}"></i>`).join('');
        return `<button type="button" role="option" class="fc-spot ${r.level === null ? 'l-none' : `l${r.level}`}${s.name === cur ? ' on' : ''}" data-spot="${s.name}" aria-selected="${s.name === cur}">
          <span class="fc-spot-name">${titleCase(s.name)}</span>
          <span class="fc-spot-big"><b>${hl.value}</b><small>${hl.unit}</small></span>
          <span class="fc-spot-word">${levelWord(r)}</span>
          <span class="fc-spot-strip" aria-hidden="true">${strip}</span>
          <span class="fc-spot-cap" aria-hidden="true"><span>${t('fc.now')}</span><span>${t('fc.plus12')}</span></span>
          <span class="fc-spot-ico" aria-hidden="true">${icon(act)}</span></button>`;
      })
      .join(''));
    if (cur !== shownSpot) (shownSpot = cur), $('fc-spots').querySelector<HTMLElement>('.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  /** Turn a compass needle the short way round, so 350° → 10° swings 20°, not 340°. */
  const turn = (sel: string, deg: number | null) => {
    const g = $('fc-compass').querySelector<SVGElement>(sel)!;
    if (deg === null || !Number.isFinite(deg)) return void g.classList.add('off');
    const prev = Number(g.dataset.r);
    const next = Number.isFinite(prev) ? prev + ((((deg - prev) % 360) + 540) % 360) - 180 : deg;
    g.dataset.r = String(next);
    g.classList.remove('off');
    g.style.transform = `rotate(${next}deg)`;
  };
  /** SURF: swell and wind on a dial with the beach's land side; SAIL: the wind. Arrows point where they travel. */
  const renderCompass = (r: FcRead) => {
    const c = r.surf ? { swell: r.surf.dir, wind: r.surf.windFromDeg, shore: r.surf.facing } : r.sail ? { swell: null, wind: r.sail.fromDeg, shore: null } : null;
    $('fc-compass').hidden = !c || r.score === null;
    if (!c) return;
    turn('.fc-cp-swell', c.swell === null ? null : c.swell + 180);
    turn('.fc-cp-wind', c.wind === null ? null : c.wind + 180);
    turn('.fc-cp-shore', c.shore === null ? null : c.shore + 180);
    $('fc-cp-swell').textContent = c.swell === null ? '' : `${t('fc.swell')} ${cmp(c.swell)}`;
    $('fc-cp-wind').textContent = c.wind === null ? '' : `${t('fc.wind')} ${cmp(c.wind)}`;
  };
  /** The week's best window as one tappable line, hidden while the hero already shows it. */
  const renderBestTime = (sp: Spot) => {
    const b = $('fc-best-time') as HTMLButtonElement;
    const p = plan;
    if (!p || p.none === 'nodata' || p.none === 'nospot') return void (b.hidden = true);
    // No window good enough to call it a best day: still point at the least bad one, as "best chance".
    const chance = p.days.reduce<PlanDay | null>((acc, x) => (x && x.value !== null && (!acc || x.value > acc.value!) ? x : acc), null);
    const d = p.bestDay === null ? chance : p.days[p.bestDay];
    const k = t(p.bestDay === null ? 'fc.bestChance' : 'fc.bestTime');
    if (!d) {
      b.hidden = false;
      b.disabled = true;
      b.className = 'fc-best-time none';
      html('fc-best-time', `<span class="fc-bt-k">${t('fc.bestTime')}</span><b>${t('fc.noGood')}</b>`);
      return;
    }
    const ms = when();
    b.hidden = sel !== null && ms >= d.startMs && ms < d.endMs;
    b.disabled = false;
    b.dataset.ms = String(d.startMs);
    const r = readAt(deps, act, sp, d.startMs);
    const hl = headline(r);
    b.className = `fc-best-time${r.level === null ? '' : ` l${r.level}`}${p.bestDay === null ? ' chance' : ''}`;
    html('fc-best-time', `<span class="fc-bt-k">${k}</span><b>${dayLabel(d.dayMs, d.day)} · ${t('fc.window', { from: localClock(d.startMs), to: localClock(d.endMs) })}</b><span class="fc-bt-v">${hl.value}${hl.unit ? ` ${hl.unit}` : ''}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`);
  };

  const renderHero = () => {
    const sp = spot();
    const ms = when();
    const r = readAt(deps, act, sp, ms);
    $('fc-name').textContent = titleCase(sp.name);
    const d = new Date(ms + REGION.tzOffsetH * H);
    const day = sel === null ? t('fc.now') : `${sentence(t(`day.${d.getUTCDay()}` as Key))} ${d.getUTCDate()}`;
    $('fc-sub').textContent = `${sentence(t('fc.sub', { act: t(`fc.act.${act}` as Key).toLowerCase() }))} · ${t('fc.at', { day, time: localClock(ms) })}`;
    const hl = headline(r);
    $('fc-k').textContent = t(`fc.metric.${act}` as Key);
    countUp($('fc-num'), hl.value);
    $('fc-unit').textContent = hl.unit;
    const dayIdx = plan ? Math.max(0, Math.min(plan.days.length - 1, Math.floor((localDayStart(ms, REGION.tzOffsetH) - plan.startMs) / DAY))) : 0;
    const win = plan?.days[dayIdx];
    $('fc-size').textContent = r.swim ? `${t('fc.ripRisk')} ${t(`fc.ripw.${r.swim.rip}` as Key).toLowerCase()} · ${t('fc.shorebreak').toLowerCase()} ${n1(r.swim.breakerM)} m` : r.fish ? (win ? `${t('fc.bestWindow')} ${t('fc.window', { from: localClock(win.startMs), to: localClock(win.endMs) })}` : '') : r.surf ? t(`fc.size.${r.surf.size}` as Key) : r.water && act === 'snorkel' ? `${t('fc.entry')} ${n1(r.water.breakerM)} m${r.water.windKt === null ? '' : ` · ${t(`fc.chop.${chopFor(r.water.windKt)}` as Key).toLowerCase()}`}` : r.water ? `${t('fc.depthAt', { d: r.water.depthM })}${r.water.currentKt === null ? '' : ` · ${t('fc.current').toLowerCase()} ${t(`fc.drift.${driftFor(r.water.currentKt)}` as Key).toLowerCase()}`}` : r.sail && r.sail.windKt !== null ? `${t(`fc.bft.${beaufort(r.sail.windKt)}` as Key)} · ${t('fc.force', { n: beaufort(r.sail.windKt) })}` : '';
    html('fc-rate', r.level === null
      ? `<span class="fc-word">${t('fc.nodata')}</span>`
      : `<span class="fc-word l${r.level}">${r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key)}</span>${bar(r.level)}${r.surf ? `<span class="fc-of">${n1(r.score!)}/10</span>` : ''}`);
    html('fc-why', reasons(r).map((x) => `<li>${x}</li>`).join(''));
    const st = stats(r, plan, dayIdx);
    $('fc-stats').dataset.n = String(st.length);
    html('fc-stats', st.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join(''));
    const artLabel =
      act === 'surf' ? t('fc.art.surf', { m: r.surf ? n1(r.surf.hb) : '--' })
      : act === 'fish' ? t('fc.art.fish')
      : act === 'swim' ? t('fc.art.swim', { flag: r.swim ? t(`fc.flag.${r.swim.rip}` as Key) : '--' })
      : act === 'sail' ? t('fc.art.sail', { kt: r.sail?.windKt === null || !r.sail ? '--' : n0(r.sail.windKt) })
      : t('fc.art.water', { m: r.water?.visM ? n1(r.water.visM) : '--' });
    const artKey = `${act}|${sp.name}`;
    // A new hour at the same spot cross-fades the picture; a new spot or activity has its own entrance.
    if (html('fc-art', heroArt(r, artLabel, { knee: t('fc.g.knee'), waist: t('fc.g.waist'), head: t('fc.g.head') })) && artFor === artKey) replay($('fc-art'), 'fc-fade');
    artFor = artKey;
    renderCompass(r);
    renderBestTime(sp);
    $('fc-hero').dataset.level = r.level === null ? '' : String(r.level);
    // Shimmer placeholders while the feeds load (first 20 s); after that a plain "no data".
    el.classList.toggle('fc-loading', r.level === null && Date.now() - openedAt < 20_000);
    $('fc-now').hidden = sel === null;
  };

  const renderDays = () => {
    const sp = spot();
    const key = `${act}|${sp.name}|${nowHour()}`;
    if (key !== planKey || plan?.none === 'nodata') {
      plan = daysAt(deps, act, sp, Date.now(), 7);
      // The bubbles rise in one after another when the spot or activity changes, not on every redraw.
      if (planKey.split('|').slice(0, 2).join('|') !== key.split('|').slice(0, 2).join('|')) {
        $('fc-days').classList.add('in');
        window.setTimeout(() => $('fc-days').classList.remove('in'), 900);
      }
      planKey = key;
    }
    const p = plan!;
    const uvs = dayUvPeaks(deps.env, sp, p.startMs, p.days.length);
    const selDay = Math.floor((localDayStart(when(), REGION.tzOffsetH) - p.startMs) / DAY);
    html('fc-days', p.days
      .map((d, i) => {
        const dayMs = p.startMs + i * DAY;
        const r = d ? readAt(deps, act, sp, d.startMs) : null;
        const hl = r ? headline(r) : { value: '--', unit: '' };
        const lvl = r?.level ?? null;
        const best = p.bestDay === i;
        return `<button type="button" class="fc-day${best ? ' best' : ''}${i === selDay && sel !== null ? ' on' : ''}" data-day="${i}" style="--i:${i}">
          <span class="fc-day-name">${dayLabel(dayMs, i)}</span>
          <span class="fc-bubble ${lvl === null ? 'l-none' : `l${lvl}`}"><b>${hl.value}</b><small>${hl.unit}</small></span>
          <span class="fc-day-win">${d ? `${localClock(d.startMs)}` : '—'}</span>
          ${uvs[i] === null ? '' : `<span class="fc-day-uv l${uvLevel(uvs[i]!)}" title="${t('fc.uvPeak')}: ${t(`fc.uvw.${uvLevel(uvs[i]!)}` as Key)}">UV ${n0(uvs[i]!)}</span>`}
          ${best ? `<span class="fc-best">${t('fc.bestDay')}</span>` : ''}</button>`;
      })
      .join(''));
  };

  /** The hour-by-hour charts: built when the spot, activity, hour or width changes, or while data is missing. */
  const renderTimeline = () => {
    const sp = spot();
    const width = $('fc-tl').clientWidth || 340;
    const px = Math.max(6, Math.floor((width / (7 * 24)) * 10) / 10);
    const key = `${act}|${sp.name}|${nowHour()}|${px}`;
    // Feeds arrive one by one after start-up: rebuild while any row is still empty.
    const missing = tlPartial();
    if (key !== tlKey || missing) {
      const start = plan?.startMs ?? localDayStart(Date.now(), REGION.tzOffsetH);
      tl = timeline(deps, act, sp, start);
      tlKey = key;
      geom = { px, tzOffsetH: REGION.tzOffsetH };
      const wins = (plan?.days ?? []).flatMap((d) => (d ? [{ startMs: d.startMs, endMs: d.endMs }] : []));
      const rows = rowsFor(act)
        .map((r) => `<div class="fc-row"><div class="fc-row-k">${t(`fc.row.${r.id}` as Key)} <span>${t(`fc.unit.${r.id}` as Key)}</span>${tl.some((h) => r.value(h) !== null) ? '' : ` <em>${t('fc.noRow')}</em>`}</div>${rowSvg(r, tl, geom, wins)}</div>`)
        .join('');
      html('fc-tl-in', `${timeAxis(tl, geom, (ms, i) => dayLabel(ms, i))}<div class="fc-row fc-row-sky">${skyRow(tl, geom)}</div><div class="fc-row fc-row-rating"><div class="fc-row-k">${t('fc.row.rating')}</div>${ratingStrip(tl, geom)}</div>${rows}`);
    }
    const ni = tlIndex(nowHour());
    const nl = $('fc-nowline');
    // While the hero shows now, the cursor is the now line; the dashed marker appears once another hour is picked.
    nl.hidden = sel === null || ni < 0 || ni >= tl.length;
    nl.style.transform = `translateX(${(ni + 0.5) * geom.px}px)`;
    // Open (or switch) with the present in view, not last midnight.
    const sk = `${act}|${sp.name}`;
    if (sk !== scrolledFor && ni >= 0) {
      scrolledFor = sk;
      // From midnight while now still sits in the first part of the view (the day's name stays readable), else just before now.
      const tlw = $('fc-tl').clientWidth || 340;
      $('fc-tl').scrollLeft = ni * geom.px < tlw * 0.6 ? 0 : Math.max(0, ni * geom.px - 48);
    }
    placeCursor(when());
  };
  const tlPartial = () =>
    !tl.length || tl.every((h) => h.read.level === null) || tl.every((h) => h.windKt === null) || tl.every((h) => h.rainMmH === null && h.cloudPct === null);
  const tlIndex = (ms: number) => (tl.length ? Math.round((ms - tl[0].ms) / H) : -1);
  /** Move the cursor line and the readout to an hour (no rebuild: cheap enough for a mouse move). */
  const placeCursor = (ms: number) => {
    const i = tlIndex(ms);
    const c = $('fc-cursor');
    if (i < 0 || i >= tl.length) return void (c.hidden = true);
    c.hidden = false;
    c.classList.toggle('is-now', ms === nowHour());
    $('fc-nowline').hidden = sel === null || tlIndex(nowHour()) < 0;
    c.style.transform = `translateX(${(i + 0.5) * geom.px}px)`;
    const h = tl[i];
    const d = new Date(h.ms + REGION.tzOffsetH * H);
    const r = h.read;
    const hl = headline(r);
    const items = [
      `<li class="fc-ro-when">${sentence(t(`day.${d.getUTCDay()}` as Key))} ${d.getUTCDate()} · ${localClock(h.ms)}</li>`,
      `<li><span class="fc-dot ${r.level === null ? '' : `l${r.level}`}"></span>${t(`fc.metric.${act}` as Key)} <b>${hl.value}${hl.unit ? ` ${hl.unit}` : ''}</b>${r.level === null ? '' : ` · ${r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key)}`}</li>`,
      h.windKt === null || act === 'sail' ? '' : `<li>${t('fc.wind')} <b>${n0(h.windKt)} kt ${cmp(h.windFromDeg)}</b>${h.gustKt === null ? '' : ` · ${t('fc.gust').toLowerCase()} ${n0(h.gustKt)}`}</li>`,
      `<li>${t('fc.tide')} <b>${h.tideM.toFixed(2)} m</b></li>`,
      h.rainMmH !== null && h.rainMmH >= 0.1 ? `<li>${t('fc.row.rain')} <b>${n1(h.rainMmH)} mm/h</b></li>` : '',
      h.airC === null ? '' : `<li>${t('fc.air')} <b>${n0(h.airC)} °C</b></li>`,
      h.uv === null || h.uv < 0.5 ? '' : `<li><span class="fc-dot l${uvLevel(h.uv)}"></span>UV <b>${n0(h.uv)}</b> · ${t(`fc.uvw.${uvLevel(h.uv)}` as Key)}</li>`,
    ];
    html('fc-readout', items.join(''));
  };

  const render = () => {
    if (el.hidden) return;
    renderActs();
    renderDays();
    renderSpots();
    renderHero();
    renderTimeline();
  };

  // --- events
  const setAct = (a: FcActivity) => {
    if (a === act) return;
    act = a;
    put(storage, ACT_KEY, act);
    sel = null;
    replay(el, 'fc-switch');
    syncHash();
    render();
  };
  const stepAct = (dir: 1 | -1) => setAct(FC_ACTIVITIES[(FC_ACTIVITIES.indexOf(act) + dir + FC_ACTIVITIES.length) % FC_ACTIVITIES.length]);
  el.querySelector('.fc-acts')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (b) setAct(b.dataset.act as FcActivity);
  });
  // Arrow keys move along the tabs, as in any tab list.
  el.querySelector('.fc-acts')!.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
    e.preventDefault();
    stepAct(k === 'ArrowRight' ? 1 : -1);
    el.querySelector<HTMLElement>(`.fc-act[data-act="${act}"]`)?.focus();
  });
  // A sideways swipe across the hero picture switches activity on a phone.
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
  $('fc-best-time').addEventListener('click', () => {
    const ms = Number($('fc-best-time').dataset.ms);
    if (!Number.isFinite(ms) || !plan) return;
    sel = ms;
    renderDays();
    renderHero();
    const i = tlIndex(ms);
    if (i >= 0) $('fc-tl').scrollTo({ left: Math.max(0, i * geom.px - 48), behavior: reduceMotion() ? 'auto' : 'smooth' });
    placeCursor(ms);
    replay($('fc-hero'), 'fc-flash');
  });
  $('fc-spots').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-spot]');
    if (!b) return;
    spotName = b.dataset.spot!;
    put(storage, SPOT_KEY, spotName);
    syncHash();
    render();
  });
  $('fc-days').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-day]');
    if (!b || !plan) return;
    const i = Number(b.dataset.day);
    const d = plan.days[i];
    const start = d?.startMs ?? plan.startMs + i * DAY + 12 * H;
    sel = i === 0 && !d ? null : start;
    renderDays();
    renderHero();
    $('fc-tl').scrollTo({ left: Math.max(0, i * 24 * geom.px - 24), behavior: reduceMotion() ? 'auto' : 'smooth' });
    placeCursor(when());
  });
  // Timeline: a tap (or click) picks the hour for the hero; a mouse hovering previews it in the readout.
  const hourAt = (e: MouseEvent) => {
    const r = $('fc-tl-in').getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left) / geom.px);
    return i >= 0 && i < tl.length ? tl[i].ms : null;
  };
  $('fc-tl').addEventListener('click', (e) => {
    const ms = hourAt(e);
    if (ms === null) return;
    sel = ms;
    renderDays();
    renderHero();
    placeCursor(ms);
  });
  $('fc-tl').addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const ms = hourAt(e);
    if (ms !== null) placeCursor(ms);
  });
  $('fc-tl').addEventListener('pointerleave', () => placeCursor(when()));
  $('fc-now').addEventListener('click', () => ((sel = null), renderDays(), renderHero(), placeCursor(when())));
  $('fc-back').addEventListener('click', () => close());
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') (e.stopPropagation(), close());
  });

  // --- routing: #forecast/<spot>/<activity>
  const syncHash = () => {
    const h = routeHash(spot().name, act);
    if (location.hash !== h) history.replaceState(history.state, '', h);
  };
  let timer = 0;
  const show = () => {
    if (!el.hidden) return;
    el.hidden = false;
    document.body.classList.add('fc-open');
    openedAt = Date.now();
    scrolledFor = '';
    applyScheme();
    themeMeta();
    render();
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
    if (mapMeta !== null) meta?.setAttribute('content', mapMeta);
  };
  const fromHash = () => {
    const r = parseRoute(location.hash, SPOTS);
    if (!r) return hide();
    if (r.activity) act = r.activity;
    if (r.spot) spotName = r.spot;
    if (el.hidden) show();
    else render();
    syncHash();
  };
  window.addEventListener('hashchange', fromHash);

  /** Open on a spot and activity (defaults: the remembered ones, or the spot nearest the map). */
  const open = (opts: { spot?: string; activity?: FcActivity } = {}) => {
    if (opts.activity) act = opts.activity;
    if (opts.spot) spotName = opts.spot;
    sel = null;
    if (!parseRoute(location.hash, SPOTS)) {
      history.pushState({ fc: 1 }, '', routeHash(spot().name, act));
      pushed = true;
    }
    show();
    syncHash();
  };
  const close = () => {
    if (pushed && history.state?.fc) {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      hide();
    }
  };
  window.addEventListener('resize', () => !el.hidden && (renderActs(), renderTimeline()));

  // After start-up: the deps read feeds and panels main.ts declares further down.
  window.setTimeout(fromHash, 0);
  return { open, close, isOpen: () => !el.hidden, refresh: render };
}
