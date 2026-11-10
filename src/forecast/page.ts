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
import { REGION, SPOTS } from '../region';
import { localClock } from '../tide-chart';
import { compassName } from '../spot-charts';
import type { Spot } from '../metrics/forecast';
import type { Plan } from '../metrics/plan';
import { heroArt } from './art';
import {
  FC_ACTIVITIES, daysAt, isFcActivity, parseRoute, readAt, routeHash, spotsForActivity,
  type FcActivity, type FcDeps, type FcRead, type Level,
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
  if (r.water) return r.water.reasons.length ? r.water.reasons.slice(0, 3).map((k) => sentence(t(`dive.r.${k}` as Key))) : [t('fc.reason.none')];
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
  if (r.water) {
    const w = r.water;
    return [
      [t('fc.bestWindow'), winText],
      [t('fc.sst'), w.sstC === null ? dash : `${n1(w.sstC)} °C`],
      [t('fc.score'), r.score === null ? dash : `${n0(r.score)}/100`],
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
        <div class="fc-art-box" id="fc-art"></div>
        <div class="fc-hero-data">
          <div class="fc-k" id="fc-k">--</div>
          <div class="fc-big"><span class="fc-num" id="fc-num">--</span><span class="fc-unit" id="fc-unit"></span></div>
          <div class="fc-size" id="fc-size"></div>
          <div class="fc-rate" id="fc-rate"></div>
          <ul class="fc-why" id="fc-why"></ul>
          <dl class="fc-stats" id="fc-stats"></dl>
        </div>
      </section>
      <section class="fc-card fc-days-card">
        <div class="fc-card-head"><h2>${t('fc.days')}</h2><button type="button" class="fc-now" id="fc-now" hidden>${t('fc.now')}</button></div>
        <div class="fc-days" id="fc-days"></div>
      </section>
      <p class="fc-note">${t('fc.note')}</p>
    </div>`;
  document.body.appendChild(el);
  const $ = (id: string) => el.querySelector<HTMLElement>('#' + id)!;
  /** Replace a block's markup only when it changed, so the periodic redraw does not replay its animations. */
  const html = (id: string, markup: string) => {
    const e = $(id);
    if (e.dataset.html !== markup) (e.innerHTML = markup), (e.dataset.html = markup);
  };

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
  let spotName: string = get(storage, SPOT_KEY) ?? '';
  /** The hour the hero shows; null = now. */
  let sel: number | null = null;
  let plan: Plan | null = null;
  let planKey = '';
  /** We pushed the history entry, so closing can step back instead of adding one. */
  let pushed = false;
  let shownSpot = '';

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

  const renderSpots = () => {
    const now = nowHour();
    const cur = spot().name;
    html('fc-spots', spots()
      .map((s) => {
        const r = readAt(deps, act, s, now);
        return `<button type="button" role="option" class="fc-spot${s.name === cur ? ' on' : ''}" data-spot="${s.name}" aria-selected="${s.name === cur}">
          <span class="fc-dot ${r.level === null ? '' : `l${r.level}`}"></span><span>${titleCase(s.name)}</span><span class="fc-spot-v">${headline(r).value}</span></button>`;
      })
      .join(''));
    if (cur !== shownSpot) (shownSpot = cur), $('fc-spots').querySelector<HTMLElement>('.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
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
    $('fc-size').textContent = r.surf ? t(`fc.size.${r.surf.size}` as Key) : r.water ? `${t('fc.surge', { d: r.water.depthM })}: ${t(`fc.surge.${r.water.surge}` as Key).toLowerCase()} · ${r.water.surgeMs.toFixed(2)} m/s` : r.sail && r.sail.fromDeg !== null ? `${t('fc.wind')} ${cmp(r.sail.fromDeg)}` : '';
    html('fc-rate', r.level === null
      ? `<span class="fc-word">${t('fc.nodata')}</span>`
      : `<span class="fc-word l${r.level}">${r.surf ? sentence(t(`surf.band.${r.surf.band}` as Key)) : t(`fc.lvl.${r.level}` as Key)}</span>${bar(r.level)}${r.surf ? `<span class="fc-of">${n1(r.score!)}/10</span>` : ''}`);
    html('fc-why', reasons(r).map((x) => `<li>${x}</li>`).join(''));
    const dayIdx = plan ? Math.max(0, Math.min(plan.days.length - 1, Math.floor((localDayStart(ms, REGION.tzOffsetH) - plan.startMs) / DAY))) : 0;
    html('fc-stats', stats(r, plan, dayIdx).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join(''));
    const artLabel =
      act === 'surf' ? t('fc.art.surf', { m: r.surf ? n1(r.surf.hb) : '--' })
      : act === 'fish' ? t('fc.art.fish')
      : act === 'sail' ? t('fc.art.sail', { kt: r.sail?.windKt === null || !r.sail ? '--' : n0(r.sail.windKt) })
      : t('fc.art.water', { m: r.water?.visM ? n1(r.water.visM) : '--' });
    html('fc-art', heroArt(r, artLabel, { knee: t('fc.g.knee'), waist: t('fc.g.waist'), head: t('fc.g.head') }));
    $('fc-hero').dataset.level = r.level === null ? '' : String(r.level);
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
          ${best ? `<span class="fc-best">${t('fc.bestDay')}</span>` : ''}</button>`;
      })
      .join(''));
  };

  const render = () => {
    if (el.hidden) return;
    renderActs();
    renderDays();
    renderSpots();
    renderHero();
  };

  // --- events
  el.querySelector('.fc-acts')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b || b.dataset.act === act) return;
    act = b.dataset.act as FcActivity;
    put(storage, ACT_KEY, act);
    sel = null;
    el.classList.remove('fc-switch');
    void el.offsetWidth; // restart the switch animation
    el.classList.add('fc-switch');
    syncHash();
    render();
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
  });
  $('fc-now').addEventListener('click', () => ((sel = null), renderDays(), renderHero()));
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
    applyScheme();
    themeMeta();
    render();
    // Feeds load after start-up and age by the hour: redraw while open, every 3 s until the hero has data.
    const tick = () => {
      render();
      timer = window.setTimeout(tick, $('fc-hero').dataset.level ? 60_000 : 3000);
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
  window.addEventListener('resize', () => !el.hidden && renderActs());

  // After start-up: the deps read feeds and panels main.ts declares further down.
  window.setTimeout(fromHash, 0);
  return { open, close, isOpen: () => !el.hidden, refresh: render };
}
