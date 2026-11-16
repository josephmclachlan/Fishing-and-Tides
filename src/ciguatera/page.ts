/**
 * CIGUATERA page (PLAN 7.101): what the poisoning is, what is and is not known for Gandoca to Limón, species and size,
 * symptoms, evidence-graded treatment, recovery and what to do. A full-screen page in the FORECAST page's look (it
 * reuses `.fc` and its tokens), opened from every ciguatera warning in the fishing panel and the species guide.
 * Its own link `#ciguatera[/<tab>]` (route.ts); other pages hide on it and it hides on theirs.
 */
import { rememberOrigin, storedOrigin } from '../origin';
import { t } from '../i18n';
import { landing, MAP_HASH } from '../forecast/model';
import { CHROME, NOTE, SUB, TITLE } from './content';
import { ciguateraHash, parseCiguateraRoute, type CgTab } from './route';
import { esc, sectionHtml, tabsHtml } from './view';
import '../forecast/forecast.css';
import '../notes/notes.css';
import '../notes/notes-aid.css';
import './ciguatera.css';

const SCHEME_KEY = 'ft.fcScheme';
type Store = Pick<Storage, 'getItem' | 'setItem'> | undefined;
type Lang = 'en' | 'es';
type From = 'map' | 'forecast' | 'coral' | 'guide';

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

export interface CiguateraPageDeps {
  storage: Store;
  lang: () => Lang;
  setLang: (l: Lang) => void;
}

const fromHash_ = (hash: string): From => (hash.startsWith('#coral') ? 'coral' : hash.startsWith('#guide') ? 'guide' : landing(hash));
const BACK_HASH: Record<From, string> = { map: MAP_HASH, forecast: '#forecast', coral: '#coral', guide: '#guide' };

export function mountCiguateraPage(deps: CiguateraPageDeps) {
  const { storage } = deps;
  const lang = deps.lang();
  const el = document.createElement('div');
  el.className = 'fc cig';
  el.id = 'ciguatera-page';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'cig-h1');
  el.innerHTML = `
    <div class="fc-page" id="cig-page">
      <header class="fc-top fc-in">
        <p class="fc-brand fc-mono">${t('fc.brand')}<span class="fc-hide-s"> · ${t('fc.region')}</span></p>
        <div class="fc-ctrls">
          <button type="button" class="fc-ctl fc-back" id="cig-back" title="${esc(CHROME.backTitle[lang])}"><svg viewBox="0 0 24 24" aria-hidden="true" class="cig-ico"><path d="M15 5l-7 7 7 7"/></svg><span id="cig-back-l">${esc(CHROME.back.forecast[lang])}</span></button>
          <div class="fc-lang" role="group" aria-label="${t('fc.langGroup')}"><button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button><button type="button" data-lang="es" aria-pressed="${lang === 'es'}">ES</button></div>
          <button type="button" class="fc-ctl fc-sq fc-themeb" id="cig-scheme" aria-label="${t('fc.scheme')}" title="${t('fc.scheme')}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg></button>
        </div>
        <h1 id="cig-h1">${esc(TITLE[lang])}</h1>
        <p class="fc-subline fc-mono"><b>${esc(SUB[lang])}</b></p>
      </header>
      <nav class="cig-tabs fc-in" id="cig-tabs" role="tablist" aria-label="${esc(CHROME.tabs[lang])}"></nav>
      <main class="cig-body fc-in" id="cig-body" role="tabpanel"></main>
      <footer class="fc-foot fc-in"><p class="fc-note">${esc(NOTE[lang])}</p></footer>
    </div>`;
  document.body.appendChild(el);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;

  // --- light / dark: shared with the FORECAST, CORAL and GUIDE pages
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const scheme = () => (get(storage, SCHEME_KEY) as 'light' | 'dark' | null) ?? (media?.matches ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  let mapMeta: string | null = null;
  const themeMeta = () => meta?.setAttribute('content', getComputedStyle(el).getPropertyValue('--fc-bg').trim() || '#ffffff');
  const applyScheme = () => {
    const s = scheme();
    el.dataset.scheme = s;
    $('cig-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (!el.hidden) themeMeta();
  };
  media?.addEventListener?.('change', applyScheme);
  $('cig-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  el.querySelectorAll<HTMLElement>('.fc-lang [data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.lang as Lang;
      if (l !== deps.lang()) deps.setLang(l);
    }),
  );

  let tab: CgTab = 'risk';
  let pushed = false;
  // Opened without a page behind it (a shared link, a reload): Back goes to the forecast (Joseph 2026-11-16).
  let cameFrom: From = 'forecast';

  const render = () => {
    $('cig-tabs').innerHTML = tabsHtml(tab, lang, ciguateraHash);
    $('cig-body').innerHTML = sectionHtml(tab, lang);
    $('cig-body').setAttribute('aria-label', tab);
  };

  const show = () => {
    if (!el.hidden) return;
    el.hidden = false;
    document.body.classList.add('fc-open');
    mapMeta = meta?.getAttribute('content') ?? null;
    $('cig-back-l').textContent = CHROME.back[cameFrom === 'map' ? 'forecast' : cameFrom][lang];
    applyScheme();
    themeMeta();
    render();
    el.scrollTop = 0;
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
    cameFrom = fromHash_(o);
    pushed = true; // the origin is the entry before this one, so back is one step
    if (!kept && real && oldHash !== null) rememberOrigin(oldHash);
    $('cig-back-l').textContent = CHROME.back[cameFrom === 'map' ? 'forecast' : cameFrom][lang];
  };
  const fromHash = (e?: HashChangeEvent, real = false) => {
    const r = parseCiguateraRoute(location.hash);
    if (!r) return hide();
    const oldHash = e?.oldURL ? new URL(e.oldURL).hash : null;
    if (oldHash !== null ? !parseCiguateraRoute(oldHash) : el.hidden) arrive(oldHash, real);
    const changed = r.tab !== tab;
    tab = r.tab;
    if (el.hidden) show();
    else if (changed) (render(), (el.scrollTop = 0), $('cig-page').scrollTo?.(0, 0));
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
  // A tap on one of this page's own links (a tab, a cross-link to another tab) replaces the history entry instead of
  // adding one, so the back button and the phone's back gesture go straight to where the page was opened from, not
  // back through every tab seen (Joseph 2026-11-16).
  el.addEventListener('click', (e) => {
    const me = e as MouseEvent;
    if (me.defaultPrevented || me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#ciguatera"]');
    if (!a) return;
    e.preventDefault();
    history.replaceState(history.state, '', a.getAttribute('href'));
    onNav();
  });
  // Tabs are links; step by arrows when one has focus.
  $('cig-tabs').addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const links = [...$('cig-tabs').querySelectorAll<HTMLAnchorElement>('a')];
    const i = links.findIndex((a) => a.dataset.tab === tab) + (ev.key === 'ArrowLeft' ? -1 : 1);
    links[i]?.click();
    $('cig-tabs').querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (!el.hidden && e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });
  $('cig-back').addEventListener('click', () => close());
  // A superscript number scrolls to its source; it must not become the page's own link (any other hash hides the page).
  $('cig-body').addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#cig-src-"]');
    if (!a) return;
    e.preventDefault();
    const src = el.querySelector<HTMLElement>(a.getAttribute('href')!);
    src?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    src?.classList.add('cig-hit');
    window.setTimeout(() => src?.classList.remove('cig-hit'), 1600);
  });

  /** Open on a tab, from the fishing panel, a species card or any ciguatera warning. */
  const open = (opts: { tab?: CgTab } = {}) => {
    cameFrom = fromHash_(location.hash);
    const from = location.href;
    tab = opts.tab ?? 'risk';
    const h = ciguateraHash(tab);
    if (!parseCiguateraRoute(location.hash)) {
      history.pushState({ cg: 1 }, '', h);
      rememberOrigin(new URL(from).hash);
      pushed = true;
    } else history.replaceState(history.state, '', h);
    show();
    // pushState fires no hashchange, so tell the other pages (the forecast and guide hide on any hash but their own).
    if (location.href !== from) window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: from, newURL: location.href }));
  };
  /** Back where it was opened from (a step back), except from the map, which goes to the forecast (Joseph 2026-11-16). */
  const close = () => {
    if (pushed && cameFrom !== 'map') {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      pushed = false;
      location.hash = cameFrom === 'map' ? '#forecast' : BACK_HASH[cameFrom];
    }
  };

  window.setTimeout(fromHash, 0);
  return { open, close, isOpen: () => !el.hidden };
}
