/**
 * FIELD NOTES page: rules at a glance, first aid for stings and bites, bait and rigs, releasing fish, cooking, the season calendar and a glossary. A full-screen page in the FORECAST page's look (it
 * reuses `.fc` and its tokens), opened from the species guide and the fishing panel.
 * Its own link `#notes[/<tab>]` (route.ts); other pages hide on it and it hides on theirs.
 */
import { brandLine } from '../brand';
import { rememberOrigin, storedOrigin } from '../origin';
import { t } from '../i18n';
import { landing, MAP_HASH } from '../forecast/model';
import { ACT_NAME, CHROME, NOTE, TITLE, subFor } from './content';
import { notesHash, parseNotesRoute, type NtAct, type NtTab } from './route';
import { esc, sectionHtml, tabsHtml } from './view';
import '../forecast/forecast.css';
import '../ciguatera/ciguatera.css';
import './notes.css';
import './notes-surf.css';
import './notes-aid.css';
import './notes-rigs.css';
import './notes-misc.css';
import '../guide/surcast-pages.css';

const SCHEME_KEY = 'ft.fcScheme';
type Store = Pick<Storage, 'getItem' | 'setItem'> | undefined;
type Lang = 'en' | 'es';
type From = 'map' | 'forecast' | 'coral' | 'guide' | 'ciguatera';

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

export interface NotesPageDeps {
  storage: Store;
  lang: () => Lang;
  setLang: (l: Lang) => void;
}

const fromHash_ = (hash: string): From => (hash.startsWith('#coral') ? 'coral' : hash.startsWith('#guide') ? 'guide' : hash.startsWith('#ciguatera') ? 'ciguatera' : landing(hash));
const BACK_HASH: Record<From, string> = { map: MAP_HASH, forecast: '#forecast', coral: '#coral', guide: '#guide', ciguatera: '#ciguatera' };

export function mountNotesPage(deps: NotesPageDeps) {
  const { storage } = deps;
  const lang = deps.lang();
  const el = document.createElement('div');
  el.className = 'fc cig';
  el.id = 'notes-page';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'nt-h1');
  el.innerHTML = `
    <div class="fc-page" id="nt-page">
      <header class="fc-top fc-in">
        <p class="fc-brand fc-mono">${brandLine(t('fc.region'), 'fc-hide-s')}</p>
        <div class="fc-ctrls">
          <button type="button" class="fc-ctl fc-back" id="nt-back" title="${esc(CHROME.backTitle[lang])}"><svg viewBox="0 0 24 24" aria-hidden="true" class="cig-ico"><path d="M15 5l-7 7 7 7"/></svg><span id="nt-back-l">${esc(CHROME.back.map[lang])}</span></button>
          <div class="fc-lang" role="group" aria-label="${t('fc.langGroup')}"><button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button><button type="button" data-lang="es" aria-pressed="${lang === 'es'}">ES</button></div>
          <button type="button" class="fc-ctl fc-sq fc-themeb" id="nt-scheme" aria-label="${t('fc.scheme')}" title="${t('fc.scheme')}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg></button>
        </div>
        <h1 id="nt-h1">${esc(TITLE[lang])}</h1>
        <p class="fc-subline fc-mono"><b id="nt-sub"></b></p>
      </header>
      <nav class="cig-tabs fc-in" id="nt-tabs" role="tablist" aria-label="${esc(CHROME.tabs[lang])}"></nav>
      <main class="cig-body fc-in" id="nt-body" role="tabpanel"></main>
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
    $('nt-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (!el.hidden) themeMeta();
  };
  media?.addEventListener?.('change', applyScheme);
  $('nt-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  el.querySelectorAll<HTMLElement>('.fc-lang [data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.lang as Lang;
      if (l !== deps.lang()) deps.setLang(l);
    }),
  );

  let tab: NtTab = 'rules';
  let act: NtAct | undefined;
  let pushed = false;
  let cameFrom: From = 'forecast';
  /** Opened from the map, Back goes to the forecast, the app's main page (the same rule as Ciguatera and Dispatch). */
  const backTo = (): From => (cameFrom === 'map' ? 'forecast' : cameFrom);

  const render = () => {
    $('nt-tabs').innerHTML = tabsHtml(tab, lang, (t) => notesHash(t, act), act);
    // The activity's own name in its own colour, and the page's tabs lit in it (the forecast's Kinetic header).
    $('nt-h1').innerHTML = act ? `${esc(TITLE[lang])}: <span class="nt-act">${esc(ACT_NAME[act][lang])}</span>` : esc(TITLE[lang]);
    if (act) el.dataset.act = act;
    else delete el.dataset.act;
    $('nt-sub').textContent = subFor(act, lang);
    $('nt-body').innerHTML = sectionHtml(tab, lang, act);
    $('nt-body').setAttribute('aria-label', tab);
  };

  const show = () => {
    if (!el.hidden) return;
    el.hidden = false;
    document.body.classList.add('fc-open');
    mapMeta = meta?.getAttribute('content') ?? null;
    $('nt-back-l').textContent = CHROME.back[backTo()][lang];
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
    $('nt-back-l').textContent = CHROME.back[backTo()][lang];
  };
  const fromHash = (e?: HashChangeEvent, real = false) => {
    const r = parseNotesRoute(location.hash);
    if (!r) return hide();
    const oldHash = e?.oldURL ? new URL(e.oldURL).hash : null;
    if (oldHash !== null ? !parseNotesRoute(oldHash) : el.hidden) arrive(oldHash, real);
    const changed = r.tab !== tab || r.act !== act;
    tab = r.tab;
    act = r.act;
    if (el.hidden) show();
    else if (changed) (render(), (el.scrollTop = 0), $('nt-page').scrollTo?.(0, 0));
  };
  // A tap on a #link fires popstate before hashchange, and popstate carries no old URL: track it here. `here` can be
  // stale (the forecast moves between spots with replaceState, which fires nothing), so the hashchange that follows,
  // which names the real page left, corrects it and is the one stored.
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
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#notes"]');
    if (!a) return;
    e.preventDefault();
    history.replaceState(history.state, '', a.getAttribute('href'));
    onNav();
  });
  // Tabs are links; step by arrows when one has focus.
  $('nt-tabs').addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const links = [...$('nt-tabs').querySelectorAll<HTMLAnchorElement>('a')];
    const i = links.findIndex((a) => a.dataset.tab === tab) + (ev.key === 'ArrowLeft' ? -1 : 1);
    links[i]?.click();
    $('nt-tabs').querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (!el.hidden && e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });
  $('nt-back').addEventListener('click', () => close());
  // A superscript number scrolls to its source, and a first aid index chip to its incident; neither may become the page's
  // own link (any other hash hides the page).
  $('nt-body').addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#cig-src-"], a[href^="#nt-inc-"]');
    if (!a) return;
    e.preventDefault();
    const src = el.querySelector<HTMLElement>(a.getAttribute('href')!);
    src?.scrollIntoView({ block: a.hash.startsWith('#nt-inc-') ? 'start' : 'center', behavior: 'smooth' });
    src?.classList.add('cig-hit');
    window.setTimeout(() => src?.classList.remove('cig-hit'), 1600);
  });

  /** Open on a tab, from the fishing panel, a species card or any ciguatera warning. */
  const open = (opts: { tab?: NtTab; act?: NtAct } = {}) => {
    cameFrom = fromHash_(location.hash);
    const from = location.href;
    act = opts.act;
    const h = notesHash(opts.tab, act);
    tab = parseNotesRoute(h)!.tab;
    if (!parseNotesRoute(location.hash)) {
      history.pushState({ nt: 1 }, '', h);
      rememberOrigin(new URL(from).hash);
      pushed = true;
    } else history.replaceState(history.state, '', h);
    show();
    // pushState fires no hashchange, so tell the other pages (the forecast and guide hide on any hash but their own).
    if (location.href !== from) window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: from, newURL: location.href }));
  };
  /** Back where it was opened from: a step back if that page is the entry before, else that page (the forecast for the map). */
  const close = () => {
    if (pushed && cameFrom !== 'map') {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      pushed = false;
      location.hash = BACK_HASH[backTo()];
    }
  };

  window.setTimeout(fromHash, 0);
  return { open, close, isOpen: () => !el.hidden };
}
