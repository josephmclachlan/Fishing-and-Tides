/**
 * CORAL page (PLAN 7.66): a clean full-screen page for reef restoration teams (Joseph and his partner work
 * with Raising Coral alongside SINAC), covering what the map's CORAL overlay and drawer track, in the
 * FORECAST page's own light and dark look (it reuses `.fc` and its tokens; coral-page.css adds the rest), redrawn
 * in the Kinetic Plus language with it (PLAN 7.69): bold section tabs in their own colours, the chosen reef on a
 * colour field of its heat alert with a canvas reef (art.ts), crisp tiles and charts.
 * Its own link, `#coral[/<tab>[/<id>]]` (route.ts), so it can be bookmarked and the phone's back button works.
 *
 *  - REEFS: every tracked reef as a card tinted by its heat alert; the chosen reef's picture (paler with heat,
 *    cloudier with murky water), NOAA Coral Reef Watch heat stress (DHW) and MUD WEEKS on gauges, the best
 *    time in the water this week (a link to the snorkel forecast), today's stresses as tiles, the 12-week
 *    build-ups and each year's peaks, and your own sites at that reef.
 *  - MY SITES (sites.ts): the private field log on this device, edited here: totals, missions coming up, new
 *    sites by GPS, photo or map, backup and import, and each site's folder (overview, visits, photos,
 *    missions, conditions), the same store and actions as the map's CORAL drawer.
 *  - SPAWNING, GUIDE, RULES: the drawer's calendar, species and disease cards, and SINAC rules and contacts.
 *
 * Privacy: logged sites come only from the on-device store (src/coral/store.ts) and are drawn only here and
 * in the owner's drawer. Nothing on this page is fetched with or sends a site.
 */
import { t, type Key } from '../i18n';
import { CORAL_REEFS } from '../region';
import { ALERT_KEYS, coralNow, DHW_BLEACHING, DHW_SEVERE, type CoralData } from '../adapters/coral';
import type { MudNow } from '../adapters/mud';
import type { MudHistory } from '../adapters/mud-parse';
import { MUD_HIGH, MUD_WATCH } from '../physics/mud';
import type { CoralHistory } from '../coral/history';
import { peakFor } from '../coral/history';
import { coralRisks, type RiskId, type RiskInputs } from '../coral/risks';
import type { Conditions, CoralSite, CoralStore } from '../coral/store';
import { nextSeasons, SIGHTINGS, SPAWNERS, spawnWindows } from '../coral/spawning';
import { CORAL_SPECIES, CORAL_THREATS, type CoralSpecies } from '../coral/species';
import { CORAL_CONTACTS, CORAL_ETIQUETTE, CORAL_RULES } from '../coral/conduct';
import type { ReefVisit } from '../coral-heat-ui';
import { landing, MAP_HASH, routeHash } from '../forecast/model';
import { CP_TABS, coralHash, parseCoralRoute, type CpTab } from './route';
import { drawReef } from './art';
import { fitCanvas, readTokens, type Tokens } from '../forecast/kit';
import { trendChart, yearBars } from './charts';
import { alertLevelOf, bleachShare, clockCR, dayDate, gaugePct, lc, monthName, murkShare, riskLevelOf, shortDate, soften, statusLevelOf, titleCase, type Level } from './view';
import { isFolderTab, mountSites } from './sites';
import type { FolderTab, SiteHistory } from '../coral-panel';
import '../forecast/forecast.css';
import './coral-page.css';

const SCHEME_KEY = 'ft.fcScheme';
const REEF_KEY = 'ft.cpReef';
const TAB_KEY = 'ft.cpTab';

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
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '--');
const svg = (body: string, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${body}</svg>`;

const TAB_ICONS: Record<CpTab, string> = {
  reefs: '<path d="M12 21v-7M12 14c0-4-3-5-3-9M12 14c0-3 4-4 4-8M9 9c-2 0-4-1-5-3M16 10c2 0 3.5-1 4.5-2.5"/><path d="M5 21h14"/>',
  sites: '<path d="M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z"/><rect x="9.5" y="9" width="5" height="4" rx="1"/><path d="M10.5 9V7.8a1.5 1.5 0 0 1 3 0V9"/>',
  spawning: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/><circle cx="17" cy="5" r=".8"/><circle cx="20" cy="8.5" r=".8"/><circle cx="14.5" cy="3" r=".8"/>',
  guide: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  rules: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
};
/** Tile pictures for today's stresses: one stroke weight, coloured by the tile's level. */
const RISK_ICONS: Record<RiskId, string> = {
  heat: '<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path class="cp-ti-fill" d="M12 11v5"/>',
  sediment: '<path d="M2 9c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/><path d="M3 15c2.5 0 3-1 5-1s3 1 5 1 3-1 5-1 2 .5 3 1"/><circle cx="7" cy="19" r="1"/><circle cx="12" cy="20" r="1"/><circle cx="17" cy="19" r="1"/>',
  runoff: '<path d="M7 13a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 13z"/><path d="M9 16l-1 3M13 16l-1 3M17 16l-1 3"/>',
  sargassum: '<path d="M4 20c2-4 1-8 3-12M10 20c1-5 3-7 2-12M16 20c0-4 2-6 3-10"/><circle cx="7" cy="10" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="13" r="1.3"/>',
  swell: '<path d="M2 17c3 0 4-2 6-2s3 2 6 2 4-2 6-2"/><path d="M4 13c1-5 6-8 11-6-3 1-4 3-3 6"/>',
  lowtide: '<path d="M3 8h18M3 8l2-2M3 8l2 2"/><path d="M2 18c3 0 3-1.5 5-1.5s2 1.5 5 1.5 3-1.5 5-1.5 2 1.5 5 1.5"/><path d="M12 11v4M10 13l2 2 2-2"/>',
};
const LOCK = svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>', 'cp-lock');
const CHEVRON = svg('<path d="M9 5l7 7-7 7"/>');
const LINK_OUT = svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>');

/** One gauge: a track from 0 to `max` washed green → amber → red at the two thresholds, a marker at the value. */
function gauge(v: number, max: number, watch: number, high: number, labels: [string, string]) {
  const w = gaugePct(watch, max), h = gaugePct(high, max);
  return `<div class="cp-gauge" style="--w:${w}%;--h:${h}%" role="img" aria-label="${esc(`${f1(v)} / ${labels[0]} ${watch} · ${labels[1]} ${high}`)}">
    <div class="cp-g-track"></div>
    <i class="cp-g-tick" style="left:${w}%"></i><i class="cp-g-tick" style="left:${h}%"></i>
    ${Number.isFinite(v) ? `<b class="cp-g-mark" style="left:${gaugePct(v, max)}%"></b>` : ''}
    <div class="cp-g-lbl"><span style="left:${w}%">${esc(labels[0])} ${watch}</span><span style="left:${h}%">${esc(labels[1])} ${high}</span></div>
  </div>`;
}

export interface CoralPageDeps {
  storage: Store;
  lang: () => 'en' | 'es';
  setLang: (l: 'en' | 'es') => void;
  heat: () => CoralData | null;
  history: () => CoralHistory | null;
  /** MUD WEEKS at a reef, null before the feed loads. */
  mud: (reefId: string) => (MudNow & { fromHistory: boolean }) | null;
  mudHistory: () => MudHistory | null;
  /** The MUD feed's day stamps (each reef's trend lines up with them). */
  mudDays: () => readonly number[];
  /** Today's inputs for the stress tiles (the alert is filled in here). */
  risks: (reefId: string) => Omit<RiskInputs, 'alert'>;
  /** Best day this week in the water at a reef, with the forecast spot it was read at. */
  visit: (reefId: string) => (ReefVisit & { spot: string }) | null;
  /** The private field log on this device. */
  store: CoralStore;
  /** Conditions at a place now (frozen with each visit) and a site's reef history (CONDITIONS tab). */
  conditionsAt: (lng: number, lat: number, depthM?: number) => Conditions | null;
  historyAt: (s: CoralSite) => SiteHistory | null;
  depthAt: () => ((lng: number, lat: number) => number | undefined) | null;
  /** Where a site goes when there is no GPS (the map centre). */
  centre: () => { lng: number; lat: number };
  /** The tracked reef nearest a logged site. */
  reefOf: (s: CoralSite) => string;
  /** The reef to start on when none is remembered (the one nearest the map). */
  startReef: () => string | null;
  /** Leave for the map: a site to show in its folder there, or place a new site with the next map tap. */
  openOnMap: (o: { site?: string; place?: boolean }) => void;
}

export function mountCoralPage(deps: CoralPageDeps) {
  const { storage } = deps;
  const lang = deps.lang();
  const el = document.createElement('div');
  el.className = 'fc cp';
  el.id = 'coral-page';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'cp-title');
  const MAP_ICON = svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>');
  el.innerHTML = `
    <div class="fc-page">
      <header class="fc-top fc-in">
        <p class="fc-brand fc-mono">${t('fc.brand')}<span class="fc-hide-s"> · ${t('fc.region')}</span></p>
        <div class="fc-ctrls">
          <button type="button" class="fc-ctl fc-back" id="cp-back" title="${t('cp.backTitle')}">${MAP_ICON}<span id="cp-back-l">${t('cp.back')}</span></button>
          <div class="fc-lang" role="group" aria-label="${t('fc.langGroup')}"><button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button><button type="button" data-lang="es" aria-pressed="${lang === 'es'}">ES</button></div>
          <button type="button" class="fc-ctl fc-sq fc-themeb" id="cp-scheme" aria-label="${t('fc.scheme')}" title="${t('fc.scheme')}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg></button>
        </div>
        <h1 id="cp-title">${t('cp.title')}</h1>
        <p class="fc-subline fc-mono"><b>${t('cp.sub')}</b></p>
      </header>
      <nav class="fc-tabs cp-tabs fc-in" role="tablist" aria-label="${t('cp.tabs')}">
        ${CP_TABS.map((k) => `<button type="button" role="tab" class="fc-tab" data-tab="${k}" aria-controls="cp-body">${svg(TAB_ICONS[k])}<span>${t(`cp.tab.${k}` as Key)}</span></button>`).join('')}
        <span class="fc-tab-bar" aria-hidden="true"></span>
      </nav>
      <div id="cp-body" class="cp-body" role="tabpanel"></div>
      <footer class="fc-foot fc-in"><p class="fc-note">${t('cp.note')}</p></footer>
    </div>`;
  document.body.appendChild(el);
  const $ = (id: string) => el.querySelector<HTMLElement>('#' + id)!;
  /** Replace a block only when its markup changed, so the periodic redraw does not replay animations. */
  const html = (e: HTMLElement, markup: string) => {
    if (e.dataset.html === markup) return false;
    e.innerHTML = markup;
    e.dataset.html = markup;
    return true;
  };

  // --- light / dark: shared with the FORECAST page; the OS setting until one is picked
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const scheme = () => (get(storage, SCHEME_KEY) as 'light' | 'dark' | null) ?? (media?.matches ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  let mapMeta: string | null = null;
  const themeMeta = () => meta?.setAttribute('content', getComputedStyle(el).getPropertyValue('--fc-bg').trim() || '#ffffff');
  const applyScheme = () => {
    const s = scheme();
    el.dataset.scheme = s;
    $('cp-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (!el.hidden) (themeMeta(), (T = readTokens(el)), drawArt(true));
  };
  media?.addEventListener?.('change', applyScheme);
  $('cp-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  el.querySelectorAll<HTMLElement>('.fc-lang [data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.lang as 'en' | 'es';
      if (l !== deps.lang()) deps.setLang(l);
    }),
  );

  // --- the reef picture (art.ts): a canvas in the field's own ink, moving unless reduced motion is asked for
  let T: Tokens | null = null;
  let paint = { bleach: 0, murk: 0, heat: '', mud: '' };
  let level: Level | null = null;
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let raf = 0;
  let seen = true;
  const drawArt = (force = false) => {
    const cv = el.querySelector<HTMLCanvasElement>('#cp-art-cv');
    if (!cv || !T || el.hidden) return;
    if (force || cv.width <= 1) fitCanvas(cv);
    const box = cv.getBoundingClientRect();
    const k = level === null ? 'n' : String(level);
    drawReef(cv.getContext('2d')!, box.width, box.height, performance.now() / 1000, {
      ...paint, on: T[`on${k}` as keyof Tokens], field: T[`lv${k}` as keyof Tokens], reduced: !!still?.matches,
    });
  };
  const loop = () => {
    raf = 0;
    if (el.hidden || tab !== 'reefs' || !seen) return;
    drawArt();
    if (!still?.matches) raf = requestAnimationFrame(loop);
  };
  const kick = () => !raf && (raf = requestAnimationFrame(loop));
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => ((seen = es.some((e) => e.isIntersecting)), seen && kick())) : null;

  // --- state
  let tab: CpTab = ((v) => (CP_TABS as readonly string[]).includes(v ?? '') ? (v as CpTab) : 'reefs')(get(storage, TAB_KEY));
  let reefId: string | null = get(storage, REEF_KEY);
  let speciesFilter: 'all' | 'cr' | 'sctld' | 'heat' | 'local' = 'all';
  /** We pushed the history entry, so closing can step back; and where the page was opened from. */
  let pushed = false;
  let cameFrom: 'map' | 'forecast' = 'map';
  const reef = () => {
    const ok = (id: string | null) => !!id && CORAL_REEFS.some((r) => r.id === id);
    if (!ok(reefId)) reefId = deps.startReef();
    if (!ok(reefId)) reefId = 'cahuita';
    return CORAL_REEFS.find((r) => r.id === reefId)!;
  };

  // --- tabs
  const renderTabs = () => {
    let on: HTMLElement | null = null;
    el.querySelectorAll<HTMLElement>('.cp-tabs .fc-tab').forEach((b) => {
      const yes = b.dataset.tab === tab;
      b.setAttribute('aria-selected', String(yes));
      b.tabIndex = yes ? 0 : -1;
      if (yes) on = b;
    });
    el.dataset.tab = tab;
    // The bar under the chosen tab, in its colour.
    const bar = el.querySelector<HTMLElement>('.cp-tabs .fc-tab-bar')!;
    const b = on as HTMLElement | null;
    if (b) {
      bar.style.width = `${b.offsetWidth}px`;
      bar.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop + b.offsetHeight - 5}px)`;
    }
  };

  // --- REEFS
  const alertWord = (a: number | null) => (a === null ? t('cp.nodata') : soften(t(`coral.alert.${ALERT_KEYS[a]}` as Key)));
  const heatNow = (id: string) => {
    const d = deps.heat();
    const r = d?.reefs.find((x) => x.id === id);
    return d && r ? coralNow(d, r) : null;
  };
  const mudWord = (l: string) => t(`cp.lvl.${l === 'ok' || l === 'watch' || l === 'high' ? l : 'none'}` as Key);

  function reefCards(sel: string) {
    return CORAL_REEFS.map((r) => {
      const n = heatNow(r.id);
      const m = deps.mud(r.id);
      const lv = alertLevelOf(n?.alert);
      const ml = riskLevelOf(m?.level);
      return `<button type="button" role="option" class="fc-spot cp-reef ${lc(lv)}" data-reef="${r.id}" aria-selected="${r.id === sel}">
        <span class="fc-sn">${esc(titleCase(r.name))}</span>
        <span class="fc-sv">${n && Number.isFinite(n.dhw) ? f1(n.dhw) : '--'}<small>DHW</small></span>
        <span class="fc-sr fc-mono">${esc(alertWord(n?.alert ?? null))}</span>
        <span class="cp-reef-mud fc-mono ${lc(ml)}"><i></i>${t('cp.mudShort')} ${m && Number.isFinite(m.mw) ? f1(m.mw) : '--'}</span>
      </button>`;
    }).join('');
  }

  function heroHtml(id: string) {
    const r = reef();
    const n = heatNow(id);
    const m = deps.mud(id);
    const lv = alertLevelOf(n?.alert);
    const ml = riskLevelOf(m?.level);
    const v = deps.visit(id);
    const sst = n && Number.isFinite(n.sst) ? t('cp.sst', { t: n.sst.toFixed(1), a: `${n.sstAnomaly >= 0 ? '+' : ''}${f1(n.sstAnomaly)}` }) : '';
    const visit = v
      ? `<button type="button" class="fc-best cp-visit" data-forecast="${esc(v.spot)}"><span class="fc-mono">${t('cp.bestVisit')}</span><span class="fc-bw">${esc(v.when)} · ${esc(v.hours)}</span>${v.visM !== null ? `<span class="fc-bv">${t('cp.bestVisitVis', { m: v.visM < 10 ? v.visM.toFixed(1) : Math.round(v.visM) })}</span>` : '<span></span>'}<span class="cp-visit-go fc-mono">${t('cp.bestVisitGo', { spot: esc(titleCase(v.spot)) })} ${CHEVRON}</span></button>`
      : `<div class="fc-best cp-visit"><span class="fc-mono">${t('cp.bestVisit')}</span><span class="fc-bw">${t('cp.bestVisitNone')}</span></div>`;
    const dhw = n && Number.isFinite(n.dhw) ? f1(n.dhw) : '--';
    const mw = m && Number.isFinite(m.mw) ? f1(m.mw) : '--';
    return {
      level: lv,
      paint: { bleach: bleachShare(n?.dhw), murk: murkShare(m?.mw), heat: n && Number.isFinite(n.dhw) ? `DHW ${f1(n.dhw)}` : '', mud: m && Number.isFinite(m.mw) ? `${t('cp.mudShort')} ${f1(m.mw)}` : '' },
      data: `
        <div class="fc-h-meta fc-mono"><span>${esc(titleCase(r.name))} · ${t('cp.heat')}</span><span>${n ? t('cp.heatSource', { d: shortDate(n.dhwDay, lang) }) : t('cp.loading')}</span></div>
        <div class="fc-h-art cp-h-art" role="img" aria-label="${esc(`${titleCase(r.name)}: DHW ${dhw}, ${t('cp.mud')} ${mw}`)}"><canvas id="cp-art-cv" aria-hidden="true"></canvas></div>
        <div class="fc-h-num"><span class="fc-hn cp-hn">${dhw}<span class="fc-u">${t('cp.heatUnit')}</span></span></div>
        <div class="fc-h-rate"><span class="fc-rword">${esc(alertWord(n?.alert ?? null))}</span></div>
        <div class="cp-gauges">
          ${gauge(n?.dhw ?? NaN, 16, DHW_BLEACHING, DHW_SEVERE, [t('cp.g.watch'), t('cp.g.high')])}
          ${sst ? `<p class="cp-src fc-mono">${sst}</p>` : ''}
          <div class="cp-mud ${lc(ml)}">
            <div class="cp-mud-head"><span class="fc-mono">${t('cp.mud')}</span><span class="cp-mud-v"><b>${mw}</b> ${t('cp.mudUnit')} <span class="cp-pill ${lc(ml)}">${mudWord(m?.level ?? 'none')}</span></span></div>
            ${gauge(m?.mw ?? NaN, 6, MUD_WATCH, MUD_HIGH, [t('cp.lvl.watch'), t('cp.lvl.high')])}
            <p class="cp-src fc-mono">${m && Number.isFinite(m.day) ? t('cp.mudSource', { m: m.depthM, d: shortDate(m.day, lang) }) : t('cp.loading')}</p>
          </div>
        </div>
        ${visit}`,
    };
  }

  function stressHtml(id: string) {
    const n = heatNow(id);
    const rows = coralRisks({ alert: n?.alert ?? null, ...deps.risks(id) });
    return rows.map((row) => {
      const l: Level | null = row.id === 'heat' ? alertLevelOf(n?.alert) : riskLevelOf(row.level);
      const value = row.id === 'heat' ? alertWord(n?.alert ?? null) : row.id === 'sargassum' ? (row.level === 'none' ? '' : t(`cp.lvl.${row.level}` as Key)) : row.value;
      return `<div class="cp-tile ${lc(l)}" role="button" tabindex="0" aria-expanded="false">
        <div class="fc-t-top"><span class="fc-mono">${esc(soften(t(`coral.risk.${row.id}` as Key)))}</span><span class="cp-ti">${svg(RISK_ICONS[row.id])}</span></div>
        <div class="cp-tile-v"><span class="cp-pill ${lc(l)}">${row.level === 'none' && row.id !== 'heat' ? t('cp.lvl.none') : row.id === 'heat' ? esc(value) : t(`cp.lvl.${row.level}` as Key)}</span></div>
        ${row.id !== 'heat' && row.id !== 'sargassum' && value ? `<div class="cp-tile-num">${esc(value)}</div>` : '<div class="cp-tile-num"></div>'}
        <div class="fc-t-tip"><p>${t(`cp.risk.${row.id}.tip` as Key)}</p></div>
      </div>`;
    }).join('');
  }

  function chartsHtml(id: string) {
    const d = deps.heat();
    const hr = d?.reefs.find((x) => x.id === id);
    const m = deps.mud(id);
    const month = (ms: number) => monthName(ms, lang);
    const visits = deps.store.list().filter((s) => deps.reefOf(s) === id).flatMap((s) => s.visits.map((v) => ({ t: v.t, cls: lc(statusLevelOf(v.status)), title: `${s.name || t('cp.unnamed')} · ${shortDate(v.t, lang)} · ${soften(t(`coral.st.${v.status}` as Key))}` })));
    const heat = d && hr
      ? trendChart({ days: d.days, values: hr.dhw, watch: DHW_BLEACHING, high: DHW_SEVERE, unit: ' DHW', watchLabel: t('cp.th.watch', { v: DHW_BLEACHING }), highLabel: t('cp.th.high', { v: DHW_SEVERE }) }, { month, visits })
      : `<div class="cp-chart cp-chart-empty"><span>${t('cp.loading')}</span></div>`;
    const mud = m && m.trend.length
      ? trendChart({ days: deps.mudDays(), values: m.trend, watch: MUD_WATCH, high: MUD_HIGH, unit: '', watchLabel: t('cp.th.mudWatch', { v: MUD_WATCH }), highLabel: t('cp.th.mudHigh', { v: MUD_HIGH }) }, { month, visits })
      : `<div class="cp-chart cp-chart-empty"><span>${t('cp.loading')}</span></div>`;
    // Every year's peak: heat since 1985 (the stored history topped up with the live window), murky water since 2018.
    const h = deps.history();
    const year = new Date().getUTCFullYear();
    const now = heatNow(id);
    const years = h ? [...h.years.filter((y) => y < year), year] : [year];
    const peaks = years.map((y) => peakFor(h, id, y, { peak: now?.peakDhw ?? NaN, year }));
    const severe = years.filter((_, i) => (peaks[i] ?? -1) >= DHW_SEVERE).reverse();
    const mh = deps.mudHistory();
    const mr = mh?.reefs.find((x) => x.id === id);
    const liveMud = Math.max(-Infinity, ...(m?.trend ?? []).filter((x): x is number => x !== null));
    const myears = mr ? [...mh!.years.filter((y) => y < year), year] : [];
    const mpeaks = myears.map((y) => {
      const i = mh!.years.indexOf(y);
      const stored = i >= 0 ? mr!.peak[i] : null;
      return y === year && Number.isFinite(liveMud) ? Math.max(stored ?? -Infinity, liveMud) : stored;
    });
    return `
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.trend')}</h2></div>${heat}</section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.mudTrend')}</h2></div>${mud}</section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.years', { from: years[0] })}</h2></div>
        ${yearBars(years, peaks, { watch: DHW_BLEACHING, high: DHW_SEVERE, cap: 16, highLabel: t('cp.th.high', { v: DHW_SEVERE }), unit: 'DHW' })}
        <p class="cp-cap">${severe.length ? t('cp.severeYears', { years: severe.slice(0, 8).join(', ') }) : h ? t('cp.noSevere') : t('cp.loading')}</p></section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.mudYears', { from: myears[0] ?? 2018 })}</h2></div>
        ${myears.length ? yearBars(myears, mpeaks, { watch: MUD_WATCH, high: MUD_HIGH, cap: 8, highLabel: t('cp.th.mudHigh', { v: MUD_HIGH }), unit: '' }) : `<div class="cp-chart cp-chart-empty"><span>${t('cp.loading')}</span></div>`}
        <p class="cp-cap">${m ? esc(soften(t('coral.mudNote', { m: m.depthM }))) + (m.fromHistory ? '' : ` ${esc(soften(t('coral.mudNoHistory')))}`) : ''}</p></section>`;
  }

  function reefSitesHtml(id: string) {
    const sites = deps.store.list().filter((s) => deps.reefOf(s) === id);
    if (!sites.length) return '';
    return `<section class="fc-card cp-private-card"><div class="fc-card-head"><h2>${t('cp.yourSites')}</h2><span class="cp-badge">${LOCK}${t('cp.private')}</span></div>
      <div class="cp-sites">${sites.map((x) => sites_.siteCard(x)).join('')}</div></section>`;
  }

  function reefsHtml() {
    const r = reef();
    const hero = heroHtml(r.id);
    paint = hero.paint;
    level = hero.level;
    return `
      <div class="fc-rail fc-bleed cp-reefs" role="listbox" aria-label="${t('cp.reefs')}">${reefCards(r.id)}</div>
      <section class="fc-hero fc-bleed cp-hero">
        <div class="fc-hero-in fc-in cp-hero-in">${hero.data}</div>
      </section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.stress')}</h2></div><div class="cp-tiles">${stressHtml(r.id)}</div>
        <p class="cp-cap">${esc(soften(t('coral.heatNote')))}</p></section>
      ${reefSitesHtml(r.id)}
      <div class="cp-grid2">${chartsHtml(r.id)}</div>`;
  }

  // --- MY SITES: the private field log (sites.ts), its folders at #coral/sites/<id>/<tab>
  let siteRoute: { id: string | null; sub: FolderTab | null } = { id: null, sub: null };
  const banner = () => `<section class="cp-privacy">${LOCK}<div><b>${t('cp.private')}</b><p>${t('cp.privateNote')}</p></div></section>`;

  // --- SPAWNING
  function spawningHtml() {
    const now = Date.now();
    const at = CORAL_REEFS.find((r) => r.id === 'cahuita')!.lngLat;
    const windows = spawnWindows(now, 400, at[1], at[0]);
    const seasons = nextSeasons(windows, now);
    const tonight = seasons.filter((s) => s.now);
    const sp = (id: string) => SPAWNERS.find((s) => s.id === id)!;
    const name = (id: string) => titleCase(t(`spawn.${id}` as Key));
    return `
      ${tonight.length ? `<section class="cp-tonight">${svg(TAB_ICONS.spawning)}<b>${t('cp.spawnTonight', { list: tonight.map((s) => name(s.id)).join(', ') })}</b></section>` : ''}
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.spawnSeen')}</h2></div>
        <ul class="cp-seen">${SIGHTINGS.map((s) => `<li><span class="cp-pill l3">${t('cp.spawnSeen')}</span> <b>${esc(name(s.id))}</b> · ${esc(titleCase(s.place))} · ${esc(shortDate(Date.parse(s.day + 'T12:00:00Z'), lang))} ${s.day.slice(0, 4)} <small>(${esc(s.source)})</small></li>`).join('')}</ul>
      </section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.spawnTitle')}</h2></div>
        ${seasons.length ? `<div class="cp-spawn">${seasons.map((s) => {
          const nights = windows.filter((w) => w.id === s.id && w.fullMoon === s.first.fullMoon);
          return `<article class="cp-sp${s.now ? ' now' : ''}">
            <h3>${esc(name(s.id))} <i>${esc(sp(s.id).name)}</i></h3>
            <p class="cp-sp-when">${t('cp.spawnNights', { a: s.first.night, b: s.last.night, d: `${shortDate(s.first.fullMoon, lang)} ${new Date(s.first.fullMoon).getUTCFullYear()}` })}</p>
            <div class="cp-nights">${nights.map((w) => `<span class="${w.from <= now && now <= w.to ? 'now' : ''}"><b>${esc(dayDate(w.from, lang))}</b><small>${clockCR(w.from)}–${clockCR(w.to)}</small></span>`).join('')}</div>
          </article>`;
        }).join('')}</div>` : `<p class="cp-cap">${t('cp.spawnNone')}</p>`}
        <p class="cp-cap">${esc(soften(t('coral.spawn.note')))}</p>
      </section>`;
  }

  // --- GUIDE
  const iucnLevel = (s: CoralSpecies['status']): Level => (s === 'CR' ? 0 : s === 'EN' ? 1 : s === 'VU' || s === 'NT' ? 2 : 3);
  const sctldLevel = (s: CoralSpecies['sctld']): Level => (s === 'high' ? 0 : s === 'mid' ? 2 : 3);
  const keep = (s: CoralSpecies) =>
    speciesFilter === 'all' || (speciesFilter === 'cr' && s.status === 'CR') || (speciesFilter === 'sctld' && s.sctld === 'high') || (speciesFilter === 'heat' && !!s.heatSensitive) || (speciesFilter === 'local' && !!s.localSctld);
  function guideHtml() {
    const filters = (['all', 'cr', 'sctld', 'heat', 'local'] as const).map((f) => `<button type="button" class="cp-chip${f === speciesFilter ? ' on' : ''}" data-filter="${f}" aria-pressed="${f === speciesFilter}">${t(`cp.f.${f}` as Key)}</button>`).join('');
    const list = CORAL_SPECIES.filter(keep);
    return `
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.threats')}</h2></div>
        <div class="cp-threats">${CORAL_THREATS.map((c) => `<article class="cp-threat"><h3>${esc(soften(t(`cd.${c}.name` as Key)))}</h3><p><b>${t('cp.signs')}.</b> ${esc(t(`cd.${c}.signs` as Key))}</p><p><b>${t('cp.do')}.</b> ${esc(t(`cd.${c}.do` as Key))}</p></article>`).join('')}</div>
      </section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.species', { n: CORAL_SPECIES.length })}</h2></div>
        <div class="cp-chips" role="group" aria-label="${t('cp.filter')}">${filters}</div>
        <div class="cp-species">${list.map((s) => `<article class="cp-spc">
          <h3>${esc(titleCase(t(`cg.${s.id}.name` as Key)))}</h3><i>${esc(s.name)}</i>
          <div class="cp-tags"><span class="cp-pill ${lc(iucnLevel(s.status))}">${esc(soften(t(`coral.iucn.${s.status}` as Key)))}</span><span class="cp-pill ${lc(sctldLevel(s.sctld))}">${esc(soften(t(`coral.sctld.${s.sctld}` as Key)))}</span>${s.localSctld ? `<span class="cp-pill l1">${esc(soften(t('coral.sctld.local')))}</span>` : ''}${s.heatSensitive ? `<span class="cp-pill l2">${esc(soften(t('coral.heatSens')))}</span>` : ''}</div>
          <p>${esc(t(`cg.${s.id}.tip` as Key))}</p></article>`).join('')}</div>
      </section>`;
  }

  // --- RULES
  const telText = (n: string) => (n.startsWith('+506') ? `+506 ${n.slice(4, 8)}-${n.slice(8)}` : n);
  function rulesHtml() {
    return `
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.rules')}</h2></div>
        <ul class="cp-rules">${CORAL_RULES.map((r) => `<li><span class="cp-pill ${r.confidence === 'official' ? 'l3' : 'l2'}">${r.confidence === 'official' ? t('cp.official') : t('cp.check')}</span><p>${esc(soften(t(`crule.${r.id}` as Key)))}</p><a href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer">${t('cp.source', { s: esc(r.source.name) })} ${LINK_OUT}</a></li>`).join('')}</ul>
      </section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.etiquette')}</h2></div>
        <ul class="cp-etiq">${CORAL_ETIQUETTE.map((id) => `<li>${esc(t(`cet.${id}` as Key))}</li>`).join('')}</ul>
      </section>
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.contacts')}</h2></div>
        <div class="cp-contacts">${CORAL_CONTACTS.map((c) => `<article><h3>${esc(soften(t(`ccon.${c.id}` as Key)))}</h3><p>${[
          ...(c.tel ?? []).map((n) => `<a href="tel:${n}">${telText(n)}</a>`),
          c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : '',
          c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.url.replace(/^https:\/\/|\/$/g, ''))}</a>` : '',
        ].filter(Boolean).join('')}</p></article>`).join('')}</div>
        <p class="cp-cap">${esc(soften(t('coral.rulesAdvice')))}</p>
      </section>`;
  }

  const body = $('cp-body');
  /** Open a site's folder on this page. */
  const openSite = (id: string | null, sub: FolderTab = 'overview') => {
    siteRoute = { id, sub: id ? sub : null };
    if (tab !== 'sites') (tab = 'sites'), put(storage, TAB_KEY, tab), el.scrollTo?.({ top: 0 });
    else if (!id || id !== sites_.current()) el.scrollTo?.({ top: 0 });
    syncHash();
    render();
  };
  const sites_ = mountSites(el, body, {
    store: deps.store, lang, reefOf: deps.reefOf, conditionsAt: deps.conditionsAt, historyAt: deps.historyAt, depthAt: deps.depthAt, centre: deps.centre, openOnMap: deps.openOnMap,
  }, (id, sub) => openSite(id, sub));
  const render = () => {
    if (el.hidden) return;
    renderTabs();
    body.dataset.tab = tab;
    const markup = tab === 'reefs' ? reefsHtml() : '';
    // The colour field follows the chosen reef's heat alert, on the REEFS tab only.
    if (tab === 'reefs' && level !== null) el.dataset.level = String(level);
    else delete el.dataset.level;
    const changed = html(body, tab === 'reefs' ? markup : tab === 'sites' ? sites_.html(siteRoute.id, siteRoute.sub, banner()) : tab === 'spawning' ? spawningHtml() : tab === 'guide' ? guideHtml() : rulesHtml());
    if (changed && (tab === 'sites' || tab === 'reefs')) void sites_.after();
    // A folder whose site is gone (deleted here or in the drawer): back to the front.
    if (tab === 'sites' && siteRoute.id && sites_.current() === null) (siteRoute = { id: null, sub: null }), syncHash();
    // Keep the chosen reef card in view in its scrolling row.
    if (changed && tab === 'reefs') el.querySelector<HTMLElement>('.cp-reef[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (tab === 'reefs') {
      const hero = body.querySelector('.cp-hero');
      if (changed && hero && io) (io.disconnect(), io.observe(hero));
      drawArt(true);
      kick();
    }
  };

  // --- events
  const setTab = (k: CpTab) => {
    if (k === 'sites' && tab === 'sites') siteRoute = { id: null, sub: null };
    tab = k;
    put(storage, TAB_KEY, k);
    syncHash();
    render();
    el.scrollTo?.({ top: 0 });
  };
  el.querySelector('.cp-tabs')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-tab]');
    if (b) setTab(b.dataset.tab as CpTab);
  });
  el.querySelector('.cp-tabs')!.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== 'ArrowRight' && k !== 'ArrowLeft') return;
    const i = CP_TABS.indexOf(tab) + (k === 'ArrowRight' ? 1 : -1);
    setTab(CP_TABS[(i + CP_TABS.length) % CP_TABS.length]);
    el.querySelector<HTMLElement>(`.cp-tabs [data-tab="${tab}"]`)?.focus();
  });
  const toggleTile = (tile: HTMLElement) => {
    const open = tile.getAttribute('aria-expanded') !== 'true';
    body.querySelectorAll('.cp-tile[aria-expanded="true"]').forEach((x) => x.setAttribute('aria-expanded', 'false'));
    tile.setAttribute('aria-expanded', String(open));
  };
  body.addEventListener('click', (e) => {
    const target = e.target as Element;
    const hit = (q: string) => target.closest<HTMLElement>(q);
    let b: HTMLElement | null;
    if ((b = hit('[data-reef]'))) {
      reefId = b.dataset.reef!;
      put(storage, REEF_KEY, reefId);
      syncHash();
      render();
    } else if ((b = hit('[data-forecast]'))) location.hash = routeHash(b.dataset.forecast!, 'snorkel');
    else if ((b = hit('[data-x-open]')) && tab !== 'sites') openSite(b.dataset.xOpen!);
    else if ((b = hit('[data-reef-go]'))) {
      reefId = b.dataset.reefGo!;
      put(storage, REEF_KEY, reefId);
      setTab('reefs');
    } else if ((b = hit('[data-filter]'))) {
      speciesFilter = b.dataset.filter as typeof speciesFilter;
      render();
    } else if ((b = hit('.cp-tile'))) toggleTile(b);
  });
  body.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    const tile = (e.target as Element).closest<HTMLElement>('.cp-tile');
    if (tile && (k === 'Enter' || k === ' ')) (e.preventDefault(), toggleTile(tile));
  });
  $('cp-back').addEventListener('click', () => close());
  // Escape closes it wherever focus is (after the forecast's back step focus is on the body).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || el.hidden) return;
    e.stopPropagation();
    if (sites_.isViewing()) sites_.closeViewer();
    else close();
  });

  // --- routing: #coral/<tab>/<id>
  const syncHash = () => {
    const h = coralHash(tab === 'sites' ? { tab, id: siteRoute.id, sub: siteRoute.id ? siteRoute.sub ?? 'overview' : null } : { tab, id: tab === 'reefs' ? reef().id : null });
    if (location.hash !== h) history.replaceState(history.state, '', h);
  };
  let timer = 0;
  const show = () => {
    if (!el.hidden) return;
    el.hidden = false;
    document.body.classList.add('fc-open');
    mapMeta = meta?.getAttribute('content') ?? null;
    $('cp-back-l').textContent = cameFrom === 'forecast' ? t('cp.backForecast') : t('cp.back');
    applyScheme();
    themeMeta();
    render();
    // Feeds load after start-up: redraw every 3 s until the reef heat is in, then each minute.
    const tick = () => {
      render();
      timer = window.setTimeout(tick, deps.heat() && deps.mud(reef().id) ? 60_000 : 3000);
    };
    timer = window.setTimeout(tick, 3000);
  };
  const hide = () => {
    if (el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('fc-open');
    window.clearTimeout(timer);
    if (raf) cancelAnimationFrame(raf), (raf = 0);
    if (mapMeta !== null) meta?.setAttribute('content', mapMeta);
  };
  const fromHash = (e?: HashChangeEvent) => {
    const r = parseCoralRoute(location.hash);
    if (!r) return hide();
    if (el.hidden && e?.oldURL) cameFrom = landing(new URL(e.oldURL).hash);
    tab = r.tab;
    if (r.tab === 'reefs' && r.id && CORAL_REEFS.some((x) => x.id === r.id)) reefId = r.id;
    if (r.tab === 'sites') siteRoute = { id: r.id, sub: isFolderTab(r.sub) ? r.sub : null };
    if (el.hidden) show();
    else render();
  };
  window.addEventListener('hashchange', fromHash);

  /** Open on a tab (and reef); from the map's CORAL drawer or the forecast page. */
  const open = (opts: { tab?: CpTab; reef?: string } = {}) => {
    if (opts.tab) tab = opts.tab;
    if (opts.reef) reefId = opts.reef;
    cameFrom = landing(location.hash);
    const from = location.href;
    if (!parseCoralRoute(location.hash)) {
      history.pushState({ cp: 1 }, '', coralHash({ tab, id: tab === 'reefs' ? opts.reef ?? null : null }));
      pushed = true;
    }
    show();
    syncHash();
    // pushState fires no hashchange, so tell the other pages (the forecast hides on any hash but its own).
    if (location.href !== from) window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: from, newURL: location.href }));
  };
  /** Back where it was opened from: a step back if we pushed the entry, else the map (or the forecast). */
  const close = () => {
    if (pushed && history.state?.cp) {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      pushed = false;
      location.hash = cameFrom === 'forecast' ? '#forecast' : MAP_HASH;
    }
  };
  window.addEventListener('resize', () => !el.hidden && (renderTabs(), drawArt(true)));
  still?.addEventListener?.('change', () => (drawArt(true), kick()));
  deps.store.subscribe(() => render());

  window.setTimeout(fromHash, 0);
  return {
    open,
    close,
    isOpen: () => !el.hidden,
    refresh: render,
  };
}
