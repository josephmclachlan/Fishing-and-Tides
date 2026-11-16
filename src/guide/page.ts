/**
 * SPECIES GUIDE page (PLAN 7.91): every animal and plant a person can meet snorkelling, diving, fishing or walking the
 * shore from Gandoca to Limón, researched one species at a time (docs/GUIDE.md), on a full-screen page in the
 * FORECAST page's Kinetic Plus look (it reuses `.fc` and its tokens; guide.css adds the rest).
 *
 *  - Three lists: everything, what people eat (with the risks that come with it) and what is dangerous (venomous,
 *    stinging and biting animals worst first, then what is poisonous or risky to eat, with emergency numbers).
 *  - A strip of the twelve groups (fish, sharks and rays, crabs ... plants), with counts under the current filters.
 *  - Search over every name, Latin name and family; filters for where you meet it, habitat, how often, when, size,
 *    how it is caught and status; sorting; sections by kind, family, genus or order.
 *  - A species opens on top of the list with its photos, names, numbers and tabs (about, ID, life, catch, clean,
 *    safety, sources). The arrows step through the list.
 *
 * Its own link, `#guide[/<view>[/<species>[/<tab>]]]` (route.ts), so a list or a species can be bookmarked and the
 * phone's back button closes the species, then the page.
 */
import { brandLine } from '../brand';
import { t } from '../i18n';
import { landing } from '../forecast/model';
import { loadIndex, loadSpecies } from './data';
import { noAnswers, stepsFor, type IdAnswers, type IdStep } from './identify';
import { idHtml } from './identify-view';
import {
  activeCount, DEFAULT_FILTER, isHere, groupCounts, GROUP_BYS, haystack, inView, matches, modeCounts, sections, SORTS,
  type GdFilter, type GroupBy, type SortKey,
} from './filter';
import { detailHtml, esc, expandHtml, filtersHtml, groupsHtml, ICONS, introHtml, itemCount, modesHtml, pickersHtml, rowsFor, rowsHtml, type Row } from './render';
import { guideHash, isGdTab, parseGuideRoute, type GdMode, type GdTab } from './route';
import { GROUPS, type Entry, type Group, type GuideIndex, type Lang, type Species } from './types';
import '../forecast/forecast.css';
import './guide.css';

const SCHEME_KEY = 'ft.fcScheme';
const SORT_KEY = 'ft.gdSort';
const BY_KEY = 'ft.gdBy';
const FAV_KEY = 'ft.gdFav';
const EXP_KEY = 'ft.gdExp';
/** Species drawn per step as the list scrolls. */
const CHUNK = 48;

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

export interface GuidePageDeps {
  storage: Store;
  lang: () => Lang;
  setLang: (l: Lang) => void;
  /** Show a kind of eating fish on the fish map (the species page's SHOW ON MAP button). */
  showOnMap?: (kind: string) => void;
  /** Site base URL (Vite's BASE_URL). */
  base?: string;
}

type From = 'map' | 'forecast' | 'coral';
const fromHash_ = (hash: string): From => (hash.startsWith('#coral') ? 'coral' : landing(hash));

export function mountGuidePage(deps: GuidePageDeps) {
  const { storage } = deps;
  const lang = deps.lang();
  const base = deps.base ?? import.meta.env.BASE_URL;
  const el = document.createElement('div');
  el.className = 'fc gd';
  el.id = 'guide-page';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'gd-title');
  el.innerHTML = `
    <div class="fc-page" id="gd-page">
      <header class="fc-top fc-in">
        <p class="fc-brand fc-mono">${brandLine(t('fc.region'), 'fc-hide-s')}</p>
        <div class="fc-ctrls">
          <button type="button" class="fc-ctl fc-back" id="gd-back" title="${esc(t('gd.backTitle'))}">${svg(ICONS.back)}<span id="gd-back-l">${t('gd.back.forecast')}</span></button>
          <div class="fc-lang" role="group" aria-label="${t('fc.langGroup')}"><button type="button" data-lang="en" aria-pressed="${lang === 'en'}">EN</button><button type="button" data-lang="es" aria-pressed="${lang === 'es'}">ES</button></div>
          <button type="button" class="fc-ctl fc-sq fc-themeb" id="gd-scheme" aria-label="${t('fc.scheme')}" title="${t('fc.scheme')}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg></button>
        </div>
        <h1 id="gd-title">${t('gd.title')}</h1>
        <p class="fc-subline fc-mono"><b id="gd-sub">${t('gd.loading')}</b></p>
        <p class="gd-nlinks fc-mono"><a href="#notes/aid">${esc(t('nt.aid'))}</a> · <a href="#notes/rules">${esc(t('nt.rules'))}</a> · <a href="#notes/words">${esc(t('nt.words'))}</a></p>
      </header>
      <nav class="gd-modes fc-in" id="gd-modes" role="tablist" aria-label="${esc(t('gd.modes'))}"></nav>
      <div class="gd-groups-w fc-in"><div class="gd-groups" id="gd-groups" role="toolbar" aria-label="${esc(t('gd.groups'))}"></div></div>
      <div class="gd-tools fc-in">
        <label class="gd-search">${svg(ICONS.search)}<input id="gd-q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="${esc(t('gd.search'))}" aria-label="${esc(t('gd.searchLabel'))}"></label>
        <button type="button" class="fc-ctl gd-fbtn" id="gd-fbtn" aria-expanded="false" aria-controls="gd-filters">${svg(ICONS.filter)}<span>${t('gd.filters')}</span><b id="gd-fn" hidden></b></button>
        <div class="gd-picks" id="gd-picks"></div>
        <div id="gd-exp"></div>
      </div>
      <div class="gd-filters fc-in" id="gd-filters" hidden></div>
      <div class="fc-in" id="gd-intro"></div>
      <p class="gd-count fc-in fc-mono" id="gd-count" aria-live="polite"></p>
      <div class="gd-list fc-in" id="gd-list"></div>
      <div class="fc-in gd-more-w"><button type="button" class="fc-ctl gd-more" id="gd-more" hidden>${t('gd.more')}</button></div>
      <footer class="fc-foot fc-in"><p class="fc-note">${t('gd.note')}</p></footer>
    </div>
    <div class="gd-sheet" id="gd-sheet" role="dialog" aria-modal="true" aria-labelledby="gd-d-title" hidden><div class="gd-sheet-in" id="gd-detail"></div></div>`;
  document.body.appendChild(el);
  // The old photo cache kept failed loads as if they were photos (2026-11-16): drop it; the worker now fills guide-photos-v2.
  void globalThis.caches?.delete('guide-photos').catch(() => undefined);
  // A large photo that fails (a size the host will not make, a dropped connection) falls back to the normal one.
  el.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (img instanceof HTMLImageElement && img.hasAttribute('srcset')) img.removeAttribute('srcset');
    },
    true,
  );
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  const page = $('gd-page'), list = $('gd-list'), sheet = $('gd-sheet'), detail = $('gd-detail'), moreBtn = $('gd-more');
  const q = $<HTMLInputElement>('gd-q');

  // --- light / dark: shared with the FORECAST and CORAL pages; the OS setting until one is picked
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const scheme = () => (get(storage, SCHEME_KEY) as 'light' | 'dark' | null) ?? (media?.matches ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  let mapMeta: string | null = null;
  const themeMeta = () => meta?.setAttribute('content', getComputedStyle(el).getPropertyValue('--fc-bg').trim() || '#ffffff');
  const applyScheme = () => {
    const s = scheme();
    el.dataset.scheme = s;
    $('gd-scheme').title = t(s === 'dark' ? 'fc.scheme.light' : 'fc.scheme.dark');
    if (!el.hidden) themeMeta();
  };
  media?.addEventListener?.('change', applyScheme);
  $('gd-scheme').addEventListener('click', () => (put(storage, SCHEME_KEY, scheme() === 'dark' ? 'light' : 'dark'), applyScheme()));
  el.querySelectorAll<HTMLElement>('.fc-lang [data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.lang as Lang;
      if (l !== deps.lang()) deps.setLang(l);
    }),
  );

  // --- state
  let mode: GdMode = 'all';
  let group: Group | null = null;
  const savedSort = get(storage, SORT_KEY) as SortKey | null;
  const savedBy = get(storage, BY_KEY) as GroupBy | null;
  const f: GdFilter = {
    ...DEFAULT_FILTER,
    encounter: [], habitats: [], seen: [], times: [], methods: [], sizes: [], flags: [],
    sort: savedSort && SORTS.includes(savedSort) ? savedSort : 'seen',
    by: savedBy && GROUP_BYS.includes(savedBy) && savedBy !== 'risk' ? savedBy : 'sub',
    expanded: get(storage, EXP_KEY) === '1',
  };
  /** The danger list has its own grouping (by how it hurts, unless another is picked there). */
  let dangerBy: GroupBy = 'risk';
  const byNow = (): GroupBy => (mode === 'danger' ? dangerBy : f.by);
  let idx: GuideIndex | null = null;
  let failed = false;
  const hays = new Map<string, string>();
  const bySci = new Map<string, string>();
  let rows: Row[] = [];
  let drawn = 0;
  /** The species of the list in the order drawn, for the arrows on a species. */
  let order: string[] = [];
  let openId: string | null = null;
  let tab: GdTab = 'about';
  let current: Species | null = null;
  let pushed = false;
  // Opened without a page behind it (a shared link, a reload): Back goes to the forecast (Joseph 2026-11-16).
  let cameFrom: From = 'forecast';
  /** Species the reader saved, kept on this phone. */
  const favs = new Set<string>(((): string[] => {
    try {
      const v: unknown = JSON.parse(get(storage, FAV_KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  })());
  const saveFavs = () => put(storage, FAV_KEY, JSON.stringify([...favs]));
  /** The identify answers and the question showing. */
  let idA: IdAnswers = noAnswers();
  let idStep: IdStep = 'kind';
  const listOpts = { lang, base, href: (id: string) => guideHash({ mode, group, id }), fav: (id: string) => favs.has(id) };

  // --- the controls, drawn once and updated in place (keeps focus and the strip's scroll)
  $('gd-modes').innerHTML = modesHtml(mode, { all: 0, identify: 0, edible: 0, danger: 0, saved: 0 });
  $('gd-groups').innerHTML = groupsHtml(group, Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>, lang);
  $('gd-filters').innerHTML = filtersHtml(f, lang);
  $('gd-exp').innerHTML = expandHtml(f.expanded);
  const drawPicks = () => ($('gd-picks').innerHTML = pickersHtml({ ...f, by: byNow() }, mode));
  drawPicks();
  const setFilters = (open: boolean) => {
    $('gd-filters').hidden = !open;
    $('gd-fbtn').setAttribute('aria-expanded', String(open));
  };
  setFilters(false);

  const modeBar = () => {
    const on = el.querySelector<HTMLElement>('.gd-mode[aria-selected="true"]');
    const bar = el.querySelector<HTMLElement>('.gd-mode-bar');
    if (!on || !bar || el.hidden) return;
    bar.style.width = `${on.offsetWidth}px`;
    bar.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop + on.offsetHeight - 5}px)`;
  };

  const counts = (all: readonly Entry[]) => {
    const mc = modeCounts(all, f, group, hays);
    mc.saved = all.filter((e) => favs.has(e.id)).length;
    el.querySelectorAll<HTMLElement>('.gd-mode').forEach((b) => {
      const m = b.dataset.mode as GdMode;
      b.setAttribute('aria-selected', String(m === mode));
      b.tabIndex = m === mode ? 0 : -1;
      b.querySelector('sup')!.textContent = m === 'identify' ? '' : String(mc[m]);
    });
    el.dataset.mode = mode;
    const gc = groupCounts(all, f, mode, hays);
    const total = GROUPS.reduce((n, g) => n + gc[g], 0);
    el.querySelectorAll<HTMLElement>('.gd-g').forEach((b) => {
      const g = (b.dataset.group || null) as Group | null;
      const n = g ? gc[g] : total;
      b.setAttribute('aria-pressed', String(g === group));
      b.querySelector('b')!.textContent = String(n);
      b.toggleAttribute('data-empty', !n);
    });
    const fn = activeCount(f);
    $('gd-fn').textContent = String(fn);
    $('gd-fn').hidden = !fn;
    el.querySelectorAll<HTMLElement>('.gd-chip[data-f]').forEach((b) => {
      const on = (f[b.dataset.f as 'encounter'] as string[]).includes(b.dataset.v!);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    el.querySelector<HTMLInputElement>('input[data-f="records"]')!.checked = f.records;
    el.querySelectorAll<HTMLInputElement>('input[data-f="expanded"]').forEach((i) => (i.checked = f.expanded));
    modeBar();
  };

  // --- the list
  const more = () => {
    let end = drawn, n = 0;
    while (end < rows.length && n < CHUNK) if (rows[end++].k === 'card' || rows[end - 1].k === 'rec') n++;
    // Keep a section's heading with its first species.
    while (end < rows.length && rows[end].k !== 'card' && rows[end].k !== 'rec' && end > drawn && rows[end - 1].k !== 'card' && rows[end - 1].k !== 'rec') end++;
    if (end > drawn) list.insertAdjacentHTML('beforeend', rowsHtml(rows.slice(drawn, end), listOpts));
    drawn = end;
    moreBtn.hidden = drawn >= rows.length;
  };
  const render = () => {
    if (!idx) {
      list.innerHTML = failed
        ? `<div class="gd-empty"><p>${esc(t('gd.loadFail'))}</p><button type="button" class="fc-ctl" data-retry>${esc(t('gd.retry'))}</button></div>`
        : `<p class="gd-empty fc-mono">${esc(t('gd.loading'))}</p>`;
      return;
    }
    const all = idx.entries;
    counts(all);
    if (mode === 'identify') {
      const r = idHtml(f.expanded ? all : all.filter(isHere), idA, idStep, listOpts, f.expanded);
      order = r.order;
      $('gd-intro').innerHTML = '';
      $('gd-count').textContent = '';
      list.innerHTML = r.html;
      rows = [];
      drawn = 0;
      moreBtn.hidden = true;
      return;
    }
    const shown =
      mode === 'saved'
        ? all.filter((e) => favs.has(e.id) && (!group || e.group === group))
        : all.filter((e) => inView(e, mode, group) && matches(e, f, hays.get(e.id)));
    const by = byNow();
    const secs = sections(shown, by, f.sort, lang);
    rows = rowsFor(secs, !group && by !== 'none' && by !== 'risk');
    order = rows.flatMap((r) => (r.k === 'card' || r.k === 'rec' ? [r.e.id] : []));
    $('gd-intro').innerHTML = introHtml(mode);
    $('gd-count').textContent = shown.length ? t('gd.shown', { n: itemCount(rows) }) : '';
    list.innerHTML = shown.length ? '' : `<p class="gd-empty">${esc(t(mode === 'saved' ? 'gd.fav.none' : 'gd.none'))}</p>`;
    drawn = 0;
    if (shown.length) more();
  };
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && !moreBtn.hidden && more(), { root: el, rootMargin: '900px 0px' })
    : null;
  io?.observe(moreBtn);
  moreBtn.addEventListener('click', more);

  const load = () => {
    if (idx) return;
    failed = false;
    render();
    loadIndex(base).then(
      (ix) => {
        idx = ix;
        for (const e of ix.entries) hays.set(e.id, haystack(e)), bySci.set(e.sci.toLowerCase(), e.id);
        $('gd-sub').textContent = t('gd.sub', { n: ix.entries.filter((e) => e.tier === 'full' && (f.expanded || isHere(e))).length });
        render();
        if (openId) drawDetail();
      },
      () => ((failed = true), render()),
    );
  };

  /** Scroll back to the controls when the list changes under a reader far down it. */
  const toTools = () => {
    const top = el.querySelector<HTMLElement>('.gd-tools')!.offsetTop - 8;
    if (el.scrollTop > top) el.scrollTop = top;
  };
  const setView = (m: GdMode, g: Group | null) => {
    const changedMode = m !== mode;
    mode = m;
    group = g;
    history.replaceState(history.state, '', guideHash({ mode, group }));
    if (changedMode) drawPicks();
    render();
    toTools();
  };

  /** Keep the question in view after an answer moves it on. */
  const toId = () => {
    const box = el.querySelector<HTMLElement>('.gd-id');
    if (box && el.scrollTop > box.offsetTop - 8) el.scrollTop = box.offsetTop - 8;
  };
  /** One answer: a single choice moves on to the next question, colours, marks and places can be several. */
  const idAnswer = (k: string, v: string) => {
    const a = idA;
    let advance = false;
    if (k === 'kind') (a.kind = a.kind === v ? undefined : (v as IdAnswers['kind'])), (a.group = undefined), (a.sub = undefined), (a.shape = []), (advance = !!a.kind);
    else if (k === 'group') (a.group = a.group === v ? undefined : (v as IdAnswers['group'])), (a.sub = undefined), (a.shape = []), (advance = !!a.group);
    else if (k === 'sub') (a.sub = a.sub === v ? undefined : v), (advance = !!a.sub);
    else if (k === 'size') (a.size = a.size === v ? undefined : (v as IdAnswers['size'])), (advance = !!a.size);
    else if (k === 'night') a.night = !a.night;
    else if (k === 'colors' || k === 'pattern' || k === 'position' || k === 'shape' || k === 'features') {
      const arr = a[k] as string[];
      a[k] = (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never;
    }
    if (advance && idx) {
      const steps = stepsFor(idx.entries, a);
      idStep = steps[steps.indexOf(idStep) + 1] ?? 'results';
    }
    render();
    if (advance) toId();
  };

  // --- clicks and typing
  el.addEventListener('click', (ev) => {
    const target = ev.target as Element;
    const hit = <T extends Element = HTMLElement>(sel: string) => target.closest<T>(sel);
    let b: HTMLElement | null;
    const plain = (ev as MouseEvent).button === 0 && !(ev as MouseEvent).metaKey && !(ev as MouseEvent).ctrlKey && !(ev as MouseEvent).shiftKey;
    if ((b = hit('[data-a]')) && idx) {
      idAnswer(b.dataset.a!, b.dataset.v!);
    } else if ((b = hit('[data-step]'))) {
      idStep = b.dataset.step as IdStep;
      render();
      toId();
    } else if (hit('[data-id-reset]')) {
      idA = noAnswers();
      idStep = 'kind';
      render();
      toId();
    } else if ((b = hit('[data-showmap]'))) {
      deps.showOnMap?.(b.dataset.showmap!);
    } else if ((b = hit('[data-setlang]'))) {
      const l = b.dataset.setlang as Lang;
      if (l !== deps.lang()) deps.setLang(l);
    } else if ((b = hit('[data-fav]')) && openId) {
      if (favs.has(openId)) favs.delete(openId);
      else favs.add(openId);
      saveFavs();
      const on = favs.has(openId);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('span')!.textContent = t(on ? 'gd.fav.on' : 'gd.fav.off');
      render();
    } else if ((b = hit('.gd-mode'))) setView(b.dataset.mode as GdMode, group);
    else if ((b = hit('.gd-g'))) {
      const g = (b.dataset.group || null) as Group | null;
      setView(mode, g === group ? null : g);
      b.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    } else if ((b = hit('.gd-chip[data-f]'))) {
      const k = b.dataset.f as 'encounter';
      const v = b.dataset.v as never;
      const arr = f[k] as string[];
      f[k] = (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never;
      render();
    } else if (hit('[data-clear]')) {
      Object.assign(f, { encounter: [], habitats: [], seen: [], times: [], methods: [], sizes: [], flags: [], records: false });
      render();
    } else if (hit('#gd-fbtn')) setFilters($('gd-filters').hidden === true);
    else if (hit('[data-retry]')) load();
    else if ((b = hit('a.gd-card, a.gd-rec, .gd-look a')) && plain) {
      ev.preventDefault();
      const r = parseGuideRoute(b.getAttribute('href') ?? '');
      if (r?.id) {
        history.pushState({ gd: 1, gdD: 1 }, '', b.getAttribute('href'));
        openDetail(r.id, 'about');
      }
    } else if ((b = hit('a.gd-d-tab')) && plain) {
      ev.preventDefault();
      const k = b.dataset.tab;
      if (isGdTab(k) && openId) {
        tab = k;
        history.replaceState(history.state, '', guideHash({ mode, group, id: openId, tab }));
        drawDetail(false);
      }
    } else if ((b = hit('[data-go]')) && b.dataset.go) {
      history.replaceState(history.state, '', guideHash({ mode, group, id: b.dataset.go }));
      openDetail(b.dataset.go, 'about');
    } else if (hit('[data-close]')) closeDetail();
    else if (target === sheet) closeDetail();
  });
  el.addEventListener('change', (ev) => {
    const s = ev.target as HTMLInputElement | HTMLSelectElement;
    if (s.dataset.f === 'records') (f.records = (s as HTMLInputElement).checked), render();
    else if (s.dataset.f === 'expanded') {
      f.expanded = (s as HTMLInputElement).checked;
      put(storage, EXP_KEY, f.expanded ? '1' : '');
      if (idx) $('gd-sub').textContent = t('gd.sub', { n: idx.entries.filter((e) => e.tier === 'full' && (f.expanded || isHere(e))).length });
      render();
    }
    else if (s.dataset.pick === 'sort') (f.sort = s.value as SortKey), put(storage, SORT_KEY, f.sort), render();
    else if (s.dataset.pick === 'by') {
      if (mode === 'danger') dangerBy = s.value as GroupBy;
      else (f.by = s.value as GroupBy), put(storage, BY_KEY, f.by);
      render();
    }
  });
  let typing = 0;
  q.addEventListener('input', () => {
    window.clearTimeout(typing);
    typing = window.setTimeout(() => {
      f.q = q.value;
      render();
    }, 140);
  });
  q.addEventListener('keydown', (e) => e.key === 'Enter' && q.blur());

  // --- a species, on top of the list
  const drawDetail = (fresh = true) => {
    if (!current || current.id !== openId) return;
    const i = openId ? order.indexOf(openId) : -1;
    detail.innerHTML = detailHtml(current, {
      lang, tab, base,
      pos: i >= 0 ? { i, n: order.length, prev: order[i - 1], next: order[i + 1] } : undefined,
      link: (sci) => {
        const id = bySci.get(sci.toLowerCase());
        return id ? guideHash({ mode, group, id }) : null;
      },
      tabHref: (k) => guideHash({ mode, group, id: openId, tab: k }),
      fav: !!openId && favs.has(openId),
    });
    if (fresh) sheet.scrollTop = 0;
    else el.querySelector<HTMLElement>('.gd-d-tabs')?.scrollIntoView?.({ block: 'nearest' });
    if (fresh) el.querySelector<HTMLElement>('.gd-d-close')?.focus({ preventScroll: true });
  };
  let asked = '';
  const openDetail = (id: string, t_: GdTab) => {
    const was = openId;
    openId = id;
    tab = t_;
    if (sheet.hidden) {
      sheet.hidden = false;
      page.inert = true;
      el.classList.add('gd-open');
    }
    if (current?.id === id) return drawDetail(was !== id);
    asked = id;
    detail.innerHTML = `<div class="gd-d-top"><button type="button" class="fc-ctl gd-d-close" data-close>${svg(ICONS.back)}<span>${esc(t('gd.d.close'))}</span></button></div><p class="gd-empty fc-mono">${esc(t('gd.d.loading'))}</p>`;
    loadSpecies(id, base).then(
      (s) => {
        if (asked !== id) return;
        current = s;
        drawDetail();
      },
      () => {
        if (asked !== id) return;
        detail.innerHTML = `<div class="gd-d-top"><button type="button" class="fc-ctl gd-d-close" data-close>${svg(ICONS.back)}<span>${esc(t('gd.d.close'))}</span></button></div><div class="gd-empty"><p>${esc(t('gd.loadFail'))}</p></div>`;
      },
    );
  };
  const hideDetail = () => {
    if (sheet.hidden) return;
    const was = openId;
    openId = null;
    sheet.hidden = true;
    page.inert = false;
    el.classList.remove('gd-open');
    // Back to the card it was opened from.
    if (was) list.querySelector<HTMLElement>(`[data-id="${CSS.escape(was)}"]`)?.focus({ preventScroll: false });
  };
  const closeDetail = () => {
    if (history.state?.gdD) history.back(); // hashchange hides it
    else {
      history.replaceState(history.state, '', guideHash({ mode, group }));
      hideDetail();
    }
  };

  // --- keys: Escape closes the species, then the page; arrows step through the list on a species
  document.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    const typingIn = (e.target as Element)?.closest?.('input, select, textarea');
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!sheet.hidden) closeDetail();
      else close();
    } else if (!sheet.hidden && !typingIn && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      const i = openId ? order.indexOf(openId) : -1;
      const id = i < 0 ? undefined : order[i + (e.key === 'ArrowLeft' ? -1 : 1)];
      if (id) history.replaceState(history.state, '', guideHash({ mode, group, id })), openDetail(id, 'about');
    }
  });
  $('gd-back').addEventListener('click', () => close());

  // --- routing
  const show = () => {
    if (!el.hidden) return;
    el.hidden = false;
    document.body.classList.add('fc-open');
    mapMeta = meta?.getAttribute('content') ?? null;
    $('gd-back-l').textContent = t(cameFrom === 'coral' ? 'gd.back.coral' : 'gd.back.forecast');
    applyScheme();
    themeMeta();
    load();
    render();
  };
  const hide = () => {
    if (el.hidden) return;
    hideDetail();
    el.hidden = true;
    document.body.classList.remove('fc-open');
    if (mapMeta !== null) meta?.setAttribute('content', mapMeta);
  };
  const fromHash = (e?: HashChangeEvent) => {
    const r = parseGuideRoute(location.hash);
    if (!r) return hide();
    if (el.hidden && e?.oldURL) cameFrom = fromHash_(new URL(e.oldURL).hash);
    const changed = r.mode !== mode || r.group !== group;
    if (changed && r.mode !== mode) (mode = r.mode), drawPicks();
    group = r.group;
    // A link can carry a search ("Likely catch" opens the guide on the snappers, say).
    const qChanged = r.q !== null && r.q !== f.q;
    if (qChanged) {
      f.q = r.q!;
      q.value = f.q;
    }
    if (el.hidden) show();
    else if (changed || qChanged) render();
    if (r.id) {
      if (r.id !== openId || sheet.hidden) openDetail(r.id, r.tab ?? 'about');
      else if ((r.tab ?? 'about') !== tab) (tab = r.tab ?? 'about'), drawDetail(false);
    } else hideDetail();
  };
  window.addEventListener('hashchange', fromHash);
  window.addEventListener('popstate', () => fromHash());

  /** Open on a list (and species): from the map's settings, the forecast or the coral page. */
  const open = (opts: { mode?: GdMode; group?: Group | null; id?: string } = {}) => {
    if (opts.mode && opts.mode !== mode) (mode = opts.mode), drawPicks();
    if (opts.group !== undefined) group = opts.group;
    cameFrom = fromHash_(location.hash);
    const from = location.href;
    const h = guideHash({ mode, group, id: opts.id ?? null });
    if (!parseGuideRoute(location.hash)) {
      history.pushState({ gd: 1 }, '', h);
      pushed = true;
    } else history.replaceState(history.state, '', h);
    show();
    if (opts.id) openDetail(opts.id, 'about');
    // pushState fires no hashchange, so tell the other pages (the forecast hides on any hash but its own).
    if (location.href !== from) window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: from, newURL: location.href }));
  };
  /** Back where it was opened from (a step back), except from the map, which goes to the forecast (Joseph 2026-11-16). */
  const close = () => {
    if (pushed && cameFrom !== 'map' && history.state?.gd && !history.state?.gdD) {
      pushed = false;
      history.back(); // hashchange hides it
    } else {
      pushed = false;
      location.hash = cameFrom === 'coral' ? '#coral' : '#forecast';
    }
  };
  window.addEventListener('resize', () => !el.hidden && modeBar());

  window.setTimeout(fromHash, 0);
  return { open, close, isOpen: () => !el.hidden };
}
