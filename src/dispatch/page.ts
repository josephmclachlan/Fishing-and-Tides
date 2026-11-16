/**
 * DISPATCH page: how to kill, bleed and cool a catch, and what goes wrong if you do not (docs/DISPATCH.md). A full
 * screen page in the FORECAST page's Kinetic Plus look (it reuses `.fc` and its tokens; dispatch.css adds the rest),
 * in the language chosen for the app. Its own link, `#dispatch[/<section>]` (route.ts), so it can be linked from the
 * species guide's cleaning tab and the fishing panel, and the phone's back button works.
 */
import { rememberOrigin, storedOrigin } from '../origin';
import { t } from '../i18n';
import { LEDE, TITLE, tr, type Lang } from './content';
import { landing } from '../forecast/model';
import { hourAt } from './model';
import type { Method } from './model';
import { dispatchHash, parseDispatchRoute, type DpSection } from './route';
import { resetCitations, chartHtml, esc, gradeAt, GRADE_LEVEL, hoursLabel, methodsHtml, mistakesHtml, navHtml, readoutText, routineHtml, scienceHtml, histamineHtml, sourcesHtml, statsHtml } from './view';
import { GRADES } from './content';
import '../forecast/forecast.css';
import './dispatch.css';

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
const svg = (body: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const BACK_ICON = '<path d="M15 5l-7 7 7 7"/>';

type From = 'map' | 'forecast' | 'guide';
/** Where the back button returns: the guide if opened from it, otherwise the forecast page (never the map by default). */
const fromOf = (hash: string): From => (hash.startsWith('#guide') ? 'guide' : landing(hash));

export interface DispatchPageDeps {
  storage: Store;
  lang: () => Lang;
  setLang: (l: Lang) => void;
}

/** The hour the chart opens at: past the 6 h histamine limit, where the warm methods have already lost. */
const START_H = 12;

export function mountDispatchPage(deps: DispatchPageDeps) {
  const { storage } = deps;
  const lang = deps.lang();
  const el = document.createElement('div');
  el.className = 'fc dp';
  el.id = 'dispatch-page';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'dp-title');
  resetCitations();
  el.innerHTML = `
    <div class="fc-page" id="dp-page">
      <header class="fc-top fc-in">
        <p class="fc-brand fc-mono">${t('fc.brand')}<span class="fc-hide-s"> · ${t('fc.region')}</span></p>
        <div class="fc-ctrls">
          <button type="button" class="fc-ctl fc-back" id="dp-back" title="${esc(t('dp.backTitle'))}">${svg(BACK_ICON)}<span id="dp-back-l">${t('dp.back.forecast')}</span></button>
          <div class="fc-lang" role="group" aria-label="${t('fc.langGroup')}"><button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button><button type="button" data-lang="es" aria-pressed="${lang === 'es'}">ES</button></div>
          <button type="button" class="fc-ctl fc-sq fc-themeb" id="dp-scheme" aria-label="${t('fc.scheme')}" title="${t('fc.scheme')}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg></button>
        </div>
        <h1 id="dp-title">${esc(tr(TITLE, lang))}</h1>
        <p class="fc-subline fc-mono"><b>${t('dp.sub')}</b></p>
      </header>
      <div class="fc-in dp-body">
        <p class="dp-lead">${esc(tr(LEDE, lang))}</p>
        ${statsHtml(lang)}
        <nav class="dp-nav" aria-label="${esc(t('dp.nav'))}">${navHtml(lang)}</nav>
        ${chartHtml(lang, START_H)}
        ${methodsHtml(lang)}
        ${mistakesHtml(lang)}
        ${scienceHtml(lang)}
        ${histamineHtml(lang)}
        ${routineHtml(lang)}
        ${sourcesHtml(lang)}
      </div>
      <footer class="fc-foot fc-in"><p class="fc-note">${esc(t('dp.linkSub'))}</p></footer>
    </div>`;
  document.body.appendChild(el);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;

  // --- light / dark: shared with the other pages
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const scheme = () => (get(storage, SCHEME_KEY) as 'light' | 'dark' | null) ?? (media?.matches ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  let mapMeta: string | null = null;
  const themeMeta = () => meta?.setAttribute('content', getComputedStyle(el).getPropertyValue('--fc-bg').trim() || '#ffffff');
  const applyScheme = () => {
    const s = scheme();
    el.dataset.scheme = s;
    $('dp-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (!el.hidden) themeMeta();
  };
  media?.addEventListener?.('change', applyScheme);
  $('dp-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  el.querySelectorAll<HTMLElement>('.fc-lang [data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.lang as Lang;
      if (l !== deps.lang()) deps.setLang(l);
    }),
  );

  // --- the chart: a line over the bars at the chosen hour, and each bar's grade there
  const box = $('dp-chartbox');
  const slider = $<HTMLInputElement>('dp-t');
  const rows = [...box.querySelectorAll<HTMLElement>('.dp-row')];
  const setHour = (h: number) => {
    const p = Math.sqrt(h / 72);
    box.style.setProperty('--x', String(p));
    slider.value = String(Math.round(p * 1000));
    $('dp-t-v').textContent = hoursLabel(h);
    $('dp-read').textContent = readoutText(h, lang);
    for (const r of rows) {
      const g = gradeAt(r.dataset.m as Method, h);
      const pill = r.querySelector<HTMLElement>('.dp-pill')!;
      pill.className = `dp-pill ${GRADE_LEVEL[g]}`;
      pill.textContent = tr(GRADES[g], lang);
    }
    el.querySelectorAll<HTMLElement>('.dp-chip').forEach((c) => c.classList.toggle('on', Number(c.dataset.h) === Math.round(h)));
  };
  slider.addEventListener('input', () => setHour(hourAt(Number(slider.value) / 1000)));
  el.querySelectorAll<HTMLElement>('.dp-chip').forEach((c) => c.addEventListener('click', () => setHour(Number(c.dataset.h))));
  setHour(START_H);

  // --- sections: the buttons scroll, and the link follows
  let pushed = false;
  let cameFrom: From = 'map';
  const scrollTo = (s: DpSection | null, smooth: boolean) => {
    // `.dp-sec` only: the section buttons carry the same data-s and sit at the top of the page.
    const target = s ? el.querySelector<HTMLElement>(`.dp-sec[data-s="${s}"]`) : null;
    if (!target) return void el.scrollTo({ top: 0 });
    const nav = el.querySelector<HTMLElement>('.dp-nav');
    const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - (nav?.offsetHeight ?? 0);
    el.scrollTo({ top: Math.max(0, top), behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  };
  el.querySelectorAll<HTMLElement>('.dp-navb').forEach((b) =>
    b.addEventListener('click', () => {
      const s = b.dataset.s as DpSection;
      history.replaceState(history.state, '', dispatchHash(s));
      scrollTo(s, true);
    }),
  );

  // --- routing
  const show = () => {
    if (!el.hidden) return;
    el.hidden = false;
    document.body.classList.add('fc-open');
    mapMeta = meta?.getAttribute('content') ?? null;
    $('dp-back-l').textContent = t(cameFrom === 'guide' ? 'dp.back.guide' : 'dp.back.forecast');
    applyScheme();
    themeMeta();
  };
  const hide = () => {
    if (el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('fc-open');
    if (mapMeta !== null) meta?.setAttribute('content', mapMeta);
  };
  /**
   * Arriving from another page. The origin stored on this history entry wins (a reload, or a step back onto this page);
   * else it is the page just left, stored only when a real hashchange named it.
   */
  const arrive = (oldHash: string | null, real: boolean) => {
    const kept = storedOrigin();
    const o = kept ?? oldHash;
    if (o === null) return;
    cameFrom = fromOf(o);
    pushed = true; // the origin is the entry before this one, so back is one step
    if (!kept && real && oldHash !== null) rememberOrigin(oldHash);
    $('dp-back-l').textContent = t(cameFrom === 'guide' ? 'dp.back.guide' : 'dp.back.forecast');
  };
  const fromHash = (e?: HashChangeEvent, real = false) => {
    const r = parseDispatchRoute(location.hash);
    if (!r) return hide();
    const wasHidden = el.hidden;
    const oldHash = e?.oldURL ? new URL(e.oldURL).hash : null;
    if (oldHash !== null ? !parseDispatchRoute(oldHash) : el.hidden) arrive(oldHash, real);
    show();
    if (wasHidden || r.section) scrollTo(r.section, !wasHidden);
  };
  // A tap on a #link fires popstate before hashchange, and popstate carries no old URL: track it here, so the
  // back button returns to the exact page and species it was opened from (not the map).
  let here = location.href;
  const onNav = (e?: HashChangeEvent) => {
    const old = e?.oldURL ?? here;
    here = location.href;
    fromHash(old !== here ? ({ oldURL: old } as HashChangeEvent) : undefined, !!e?.oldURL);
  };
  window.addEventListener('hashchange', onNav);
  window.addEventListener('popstate', () => onNav());

  const open = (section: DpSection | null = null) => {
    cameFrom = fromOf(location.hash);
    const from = location.href;
    if (!parseDispatchRoute(location.hash)) {
      history.pushState({ dp: 1 }, '', dispatchHash(section));
      rememberOrigin(new URL(from).hash);
      pushed = true;
    } else history.replaceState(history.state, '', dispatchHash(section));
    show();
    scrollTo(section, false);
    if (location.href !== from) window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: from, newURL: location.href }));
  };
  /** Back where it was opened from: a step back if we got here by a link, else the map (or the guide). */
  const close = () => {
    // Opened from the map: go to the forecast, not back to the map.
    if (pushed && cameFrom !== 'map') {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      location.hash = cameFrom === 'guide' ? '#guide' : '#forecast';
    }
  };
  $('dp-back').addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => {
    if (el.hidden || e.key !== 'Escape') return;
    e.stopPropagation();
    close();
  });

  window.setTimeout(fromHash, 0);
  return { open, close, isOpen: () => !el.hidden };
}
