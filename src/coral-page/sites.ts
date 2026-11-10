/**
 * MY SITES on the CORAL page (PLAN 7.66 part 2): the private field log, edited on the page itself.
 *
 *  - The front: totals, missions coming up across every site, a new site (here by GPS, from a photo's GPS,
 *    or placed on the map), backup, import and export, and every site grouped by reef.
 *  - A site's folder (`#coral/sites/<id>/<tab>`): OVERVIEW (facts, conditions now, species and notes, move,
 *    photos), VISITS (the visit form with status, team, measurements, work done and notes, then the visits),
 *    PHOTOS (by day, with a viewer for caption and tags), MISSIONS (plan, log, done) and CONDITIONS (the
 *    nearest reef's 12 weeks of heat and murky water with the visits on them, the conditions saved at each
 *    visit, and each year's peaks).
 *
 * Same store and actions as the map's CORAL drawer (src/coral/store.ts, src/coral/actions.ts): everything
 * stays on this device. Returns markup for page.ts to place, and handles its own events on the page body.
 */
import { t, type Key } from '../i18n';
import { CORAL_REEFS } from '../region';
import { ACTIONS, MEASURES, MEASURE_LIMITS, SITE_KINDS, STATUSES, cleanMeasures, photosOf, type ActionId, type Conditions, type CoralSite, type CoralStatus, type CoralStore, type SiteKind, type Visit } from '../coral/store';
import { conditionRows, dateInputMs, lastVisit, localDay, measureRows, nextMission, overdue, parseTags, photosNewestFirst, photoTime, type Row } from '../coral/folder-view';
import { yearRows } from '../coral/timeline';
import { toCSV, toGeoJSON } from '../coral/export';
import { deletePhoto, getPhoto } from '../coral/photos';
import { addPhotos, backupDue, download, importBackup, importErrorKey, persist, removeSite, saveBackup, siteFields, siteFromPhoto, watchFix } from '../coral/actions';
import type { FolderTab, SiteHistory } from '../coral-panel';
import { DHW_BLEACHING, DHW_SEVERE } from '../adapters/coral-parse';
import { MUD_HIGH, MUD_WATCH } from '../physics/mud';
import { trendChart } from './charts';
import { dayDate, lc, logTotals, monthName, shortDate, sitesByReef, soften, statusLevelOf, titleCase, upcomingMissions } from './view';

export const FOLDER_TABS: readonly FolderTab[] = ['overview', 'visits', 'photos', 'missions', 'conditions'];
export const isFolderTab = (v: unknown): v is FolderTab => typeof v === 'string' && (FOLDER_TABS as readonly string[]).includes(v);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const svg = (body: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const I = {
  gps: svg('<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>'),
  photo: svg('<rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6l1.5-2.5h4L15.5 6"/>'),
  map: svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  chev: svg('<path d="M9 5l7 7-7 7"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  zip: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M11 3v2h2v2h-2v2h2v2h-2"/>'),
  up: svg('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>'),
  down: svg('<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
};
/** HUD caps text as page text. */
const s_ = (k: Key, v?: Record<string, string | number>) => soften(t(k, v));
const val = (v: string) => (v.startsWith('@') ? soften(t(v.slice(1) as Key)) : esc(v));
const facts = (rows: Row[]) => `<dl class="cp-facts">${rows.map(([k, v]) => `<div><dt>${esc(soften(t(k as Key)))}</dt><dd>${val(v)}</dd></div>`).join('')}</dl>`;

export interface SitesDeps {
  store: CoralStore;
  lang: string;
  reefOf: (s: CoralSite) => string;
  /** Conditions at a place now (frozen into each visit), and a site's reef history for CONDITIONS. */
  conditionsAt: (lng: number, lat: number, depthM?: number) => Conditions | null;
  historyAt: (s: CoralSite) => SiteHistory | null;
  depthAt: () => ((lng: number, lat: number) => number | undefined) | null;
  /** Where to put a site when there is no GPS (the map centre). */
  centre: () => { lng: number; lat: number };
  /** Go to the map: show a site there, or place a new one with the next map tap. */
  openOnMap: (o: { site?: string; place?: boolean }) => void;
}

export function mountSites(host: HTMLElement, body: HTMLElement, deps: SitesDeps, nav: (id: string | null, sub?: FolderTab) => void) {
  const { store, lang } = deps;
  // Inputs and overlays live outside the redrawn body.
  const extra = document.createElement('div');
  extra.innerHTML = `
    <input type="file" id="cps-photos" accept="image/*" multiple hidden>
    <input type="file" id="cps-site-photo" accept="image/jpeg,image/*" hidden>
    <input type="file" id="cps-backup" accept=".zip,application/zip" hidden>
    <div class="cp-toast" id="cps-toast" role="status" aria-live="polite"></div>
    <div class="cp-viewer" id="cps-viewer" role="dialog" aria-modal="true" aria-label="${t('coral.viewer')}" hidden></div>`;
  host.append(...extra.children);
  const $ = <T extends HTMLElement>(id: string) => host.querySelector<T>('#' + id)!;

  // --- state
  let kind: SiteKind = 'reef';
  let siteId: string | null = null;
  let tab: FolderTab = 'overview';
  let vStatus: CoralStatus = 'unknown';
  let vActions = new Set<ActionId>();
  let vMission: string | null = null;
  let mActions = new Set<ActionId>();
  let openVisit: string | null = null;
  let photoTarget: { siteId: string; visitId: string | null } | null = null;
  let busy = false;
  /** Typed but not yet saved text, kept across redraws (the store redraws the page on every save). */
  let draft: Record<string, string> = {};
  const site = () => store.list().find((x) => x.id === siteId) ?? null;
  let toastTimer = 0;
  const say = (m: string, ms = 3500) => {
    const e = $('cps-toast');
    e.textContent = m;
    e.classList.add('on');
    window.clearTimeout(toastTimer);
    if (ms) toastTimer = window.setTimeout(() => e.classList.remove('on'), ms);
  };
  const chips = (set: Set<ActionId>, attr: string) =>
    `<div class="cp-chips">${ACTIONS.map((a) => `<button type="button" class="cp-chip${set.has(a) ? ' on' : ''}" ${attr}="${a}" aria-pressed="${set.has(a)}">${s_(`coral.act.${a}` as Key)}</button>`).join('')}</div>`;
  const thumbs = (s: CoralSite, ids: readonly string[]) => (ids.length ? `<div class="cp-thumbs" data-photos="${ids.join(',')}" data-psite="${s.id}">${ids.map(() => '<span class="cp-thumb cp-shimmer"></span>').join('')}</div>` : '');
  const kindName = (k: SiteKind) => s_(`coral.kind.${k}` as Key);
  const statusName = (st: CoralStatus) => s_(`coral.st.${st}` as Key);
  const reefName = (id: string) => titleCase(CORAL_REEFS.find((r) => r.id === id)?.name ?? id);

  // --- the front
  function card(s: CoralSite) {
    const now = Date.now();
    const last = lastVisit(s);
    const next = nextMission(s, now);
    const lv = statusLevelOf(last?.status);
    const cover = photosNewestFirst(s)[0];
    return `<button type="button" class="cp-site ${lc(lv)}" data-x-open="${esc(s.id)}">
      ${cover ? `<span class="cp-site-cover" data-cover="${esc(cover.id)}"></span>` : ''}
      <span class="cp-site-top"><b class="cp-site-name">${esc(s.name || t('cp.unnamed'))}</b><span class="cp-kind">${esc(kindName(s.kind))}</span></span>
      <span class="cp-site-last">${last ? `<span class="cp-pill ${lc(lv)}">${esc(statusName(last.status))}</span> ${t('cp.lastVisit', { d: shortDate(last.t, lang) })}${last.bleachPct !== undefined ? ` · ${t('cp.bleached', { n: last.bleachPct })}` : ''}` : `<span class="cp-pill l-none">${t('cp.never')}</span>`}</span>
      ${next ? `<span class="cp-site-next${overdue(next, now) ? ' late' : ''}">${t('cp.next', { d: shortDate(next.t, lang), goal: esc(next.goal) })}</span>` : ''}
      <span class="cp-site-meta">${s.depthM !== undefined ? `${Math.round(s.depthM)} m · ` : ''}${t('cp.counts', { v: s.visits.length, p: s.photos.length })}</span>
      <span class="cp-link">${t('cp.openSite')} ${I.chev}</span>
    </button>`;
  }
  /** One site card, for the REEFS tab's "your sites at this reef". */
  const siteCard = card;

  function newSiteHtml() {
    return `<section class="fc-card cp-new"><div class="fc-card-head"><h2>${t('cp.newSite')}</h2></div>
      <div class="cp-new-row">
        <input class="cp-in" id="cps-name" type="text" maxlength="60" autocomplete="off" placeholder="${t('cp.siteName')}" aria-label="${t('cp.siteName')}">
        <div class="cp-seg" role="radiogroup" aria-label="${t('cp.kind')}">${SITE_KINDS.map((k) => `<button type="button" role="radio" class="cp-chip${k === kind ? ' on' : ''}" data-x-kind="${k}" aria-checked="${k === kind}">${esc(kindName(k))}</button>`).join('')}</div>
      </div>
      <div class="cp-btns">
        <button type="button" class="cp-btn primary" data-x-here="1">${I.gps}${t('cp.here')}</button>
        <button type="button" class="cp-btn" data-x-fromphoto="1">${I.photo}${t('cp.fromPhoto')}</button>
        <button type="button" class="cp-btn" data-x-place="1">${I.map}${t('cp.onMap')}</button>
      </div>
      <p class="cp-cap">${t('cp.newSiteNote')}</p>
    </section>`;
  }

  function dataHtml() {
    const due = backupDue(store.list());
    return `<section class="fc-card"><div class="fc-card-head"><h2>${t('cp.yourData')}</h2></div>
      ${due ? `<p class="cp-warn">${esc(s_('coral.backupRemind', { n: due }))}</p>` : ''}
      <div class="cp-btns">
        <button type="button" class="cp-btn" data-x-backup="1">${I.zip}${s_('coral.backup')}</button>
        <button type="button" class="cp-btn" data-x-import="1">${I.up}${s_('coral.import')}</button>
        <button type="button" class="cp-btn" data-x-geo="1">${I.down}GeoJSON</button>
        <button type="button" class="cp-btn" data-x-csv="1">${I.down}CSV</button>
      </div>
      <p class="cp-cap">${t('cp.backupNote')}</p></section>`;
  }

  function frontHtml(banner: string) {
    const sites = store.list();
    const now = Date.now();
    if (!sites.length) return `${banner}${newSiteHtml()}<section class="fc-card cp-empty"><h2>${t('cp.noSites')}</h2><p>${t('cp.noSitesNote')}</p></section>${dataHtml()}`;
    const tot = logTotals(sites, now);
    const ups = upcomingMissions(sites, now).slice(0, 8);
    const groups = sitesByReef(sites, deps.reefOf, CORAL_REEFS.map((r) => r.id));
    return `${banner}
      <div class="cp-totals">
        <div class="cp-total"><b>${tot.sites}</b><span>${t('cp.t.sites')}</span><small>${t('cp.t.kinds', { r: tot.reef, n: tot.nursery, g: tot.garden })}</small></div>
        <div class="cp-total"><b>${tot.visits30}</b><span>${t('cp.t.visits30')}</span></div>
        <div class="cp-total"><b>${tot.outplanted}</b><span>${t('cp.t.outplanted')}</span></div>
        <div class="cp-total${tot.overdue ? ' late' : ''}"><b>${tot.open}</b><span>${t('cp.t.missions')}</span><small>${tot.overdue ? t('cp.t.overdue', { n: tot.overdue }) : t('cp.t.none')}</small></div>
      </div>
      ${newSiteHtml()}
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.coming')}</h2></div>
        ${ups.length ? `<ul class="cp-missions">${ups.map((u) => `<li class="${u.overdue ? 'late' : ''}"><button type="button" data-x-open="${esc(u.site.id)}" data-x-tab="missions"><span class="cp-m-date">${esc(dayDate(u.mission.t, lang))}</span><span class="cp-m-goal"><b>${esc(u.mission.goal || '--')}</b><small>${esc(u.site.name || t('cp.unnamed'))}${u.mission.actions.length ? ` · ${u.mission.actions.map((a) => esc(s_(`coral.act.${a}` as Key))).join(', ')}` : ''}</small></span>${u.overdue ? `<span class="cp-pill l0">${t('cp.overdue')}</span>` : '<span></span>'}${I.chev}</button></li>`).join('')}</ul>` : `<p class="cp-cap">${t('cp.noMissions')}</p>`}
      </section>
      ${groups.map((g) => `<section class="fc-card"><div class="fc-card-head"><h2>${esc(t('cp.near', { reef: reefName(g.reefId) }))}</h2><button type="button" class="cp-link" data-reef-go="${esc(g.reefId)}">${t('cp.tab.reefs')} ${I.chev}</button></div><div class="cp-sites">${g.sites.map(card).join('')}</div></section>`).join('')}
      ${dataHtml()}`;
  }

  // --- a site's folder
  function overviewHtml(s: CoralSite) {
    const last = lastVisit(s);
    const next = nextMission(s, Date.now());
    const now = deps.conditionsAt(s.lng, s.lat, s.depthM);
    const loc = s.locSource === 'gps' && s.gpsAccuracyM !== undefined ? `GPS ±${Math.round(s.gpsAccuracyM)} m` : s.locSource ? s_(`coral.loc.${s.locSource}` as Key) : '--';
    const rows: Row[] = [
      ['coral.depth', s.depthM !== undefined ? `${Math.round(s.depthM)} m` : '--'],
      ['coral.position', `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`],
      ['coral.fix', loc],
      ['coral.last', last ? `${shortDate(last.t, lang)} · ${statusName(last.status)}` : '--'],
      ['coral.next', next ? `${shortDate(next.t, lang)} · ${next.goal}` : '--'],
    ];
    const cond = now ? conditionRows(now) : [];
    return `
      <section class="fc-card">${facts(rows)}
        <div class="cp-btns">
          <button type="button" class="cp-btn" data-x-move="1">${I.gps}${s_('coral.move')}</button>
          <button type="button" class="cp-btn" data-x-showmap="1">${I.map}${t('cp.showMap')}</button>
          <button type="button" class="cp-btn" data-x-addphoto="">${I.photo}${s_('coral.photo')}</button>
        </div></section>
      ${cond.length ? `<section class="fc-card"><div class="fc-card-head"><h2>${esc(s_('coral.nowHere'))}</h2></div>${facts(cond)}</section>` : ''}
      <section class="fc-card"><div class="fc-card-head"><h2>${t('cp.aboutSite')}</h2></div>
        <label class="cp-field"><span>${t('cp.name')}</span><input class="cp-in" id="cps-rename" type="text" maxlength="60" value="${esc(s.name)}"></label>
        <label class="cp-field"><span>${t('cp.kind')}</span><span class="cp-seg">${SITE_KINDS.map((k) => `<button type="button" class="cp-chip${k === s.kind ? ' on' : ''}" data-x-setkind="${k}" aria-pressed="${k === s.kind}">${esc(kindName(k))}</button>`).join('')}</span></label>
        <label class="cp-field"><span>${esc(s_('coral.species'))}</span><input class="cp-in" id="cps-species" type="text" maxlength="120" value="${esc(s.species)}"></label>
        <label class="cp-field"><span>${esc(s_('coral.notes'))}</span><textarea class="cp-in" id="cps-notes" rows="3" maxlength="2000">${esc(s.notes)}</textarea></label>
        <p class="cp-cap">${t('cp.savedOnChange')}</p>
      </section>
      ${photosOf(s, null).length ? `<section class="fc-card"><div class="fc-card-head"><h2>${esc(s_('coral.sitePhotos'))}</h2></div>${thumbs(s, photosOf(s, null).map((p) => p.id))}</section>` : ''}
      <section class="fc-card cp-danger"><button type="button" class="cp-btn danger" data-x-delete="1">${t('cp.deleteSite')}</button></section>`;
  }

  function visitCard(s: CoralSite, v: Visit) {
    const open = openVisit === v.id;
    const mission = v.missionId ? s.missions.find((m) => m.id === v.missionId) : undefined;
    const photos = photosOf(s, v.id);
    const lv = statusLevelOf(v.status);
    return `<li class="cp-visit-item ${lc(lv)}${open ? ' open' : ''}">
      <button type="button" class="cp-visit-head" data-x-visit="${v.id}" aria-expanded="${open}"><span class="cp-m-date">${esc(dayDate(v.t, lang))}</span><span class="cp-pill ${lc(lv)}">${esc(statusName(v.status))}</span>${v.bleachPct !== undefined ? `<span class="cp-v-n">${t('cp.bleached', { n: v.bleachPct })}</span>` : '<span></span>'}<span class="cp-v-n">${photos.length ? `${photos.length} ${I.photo}` : ''}</span>${I.chev}</button>
      ${open ? `<div class="cp-visit-body">
        ${v.team ? facts([['coral.team', v.team]]) : ''}
        ${mission ? facts([['coral.mission', mission.goal]]) : ''}
        ${measureRows(v).length ? facts(measureRows(v)) : ''}
        ${v.actions.length ? `<div class="cp-tags">${v.actions.map((a) => `<span class="cp-pill l3">${esc(s_(`coral.act.${a}` as Key))}</span>`).join('')}</div>` : ''}
        ${v.notes ? `<p class="cp-notes">${esc(v.notes)}</p>` : ''}
        ${v.conditions ? `<h3 class="cp-sub">${esc(s_('coral.conditionsThen'))}</h3>${facts(conditionRows(v.conditions))}` : ''}
        ${thumbs(s, photos.map((p) => p.id))}
        <div class="cp-btns"><button type="button" class="cp-btn" data-x-addphoto="${v.id}">${I.photo}${s_('coral.photoVisit')}</button><button type="button" class="cp-btn danger" data-x-delvisit="${v.id}">${s_('coral.deleteVisit')}</button></div>
      </div>` : ''}
    </li>`;
  }

  function visitsHtml(s: CoralSite) {
    const mission = vMission ? s.missions.find((m) => m.id === vMission && !m.doneVisitId) : undefined;
    if (!mission) vMission = null;
    return `
      <section class="fc-card cp-form"><div class="fc-card-head"><h2>${mission ? `${esc(s_('coral.forMission'))} ${esc(mission.goal)}` : esc(s_('coral.newVisit'))}</h2>${mission ? `<button type="button" class="cp-link" data-x-unmission="1">${esc(s_('coral.notMission'))}</button>` : ''}</div>
        <div class="cp-field"><span>${t('cp.status')}</span><span class="cp-seg">${STATUSES.map((st) => `<button type="button" class="cp-chip${st === vStatus ? ' on' : ''}" data-x-status="${st}" aria-pressed="${st === vStatus}">${esc(st === 'unknown' ? t('cp.notSure') : statusName(st))}</button>`).join('')}</span></div>
        <label class="cp-field"><span>${esc(s_('coral.team'))}</span><input class="cp-in" id="cps-team" type="text" maxlength="80"></label>
        <div class="cp-field"><span>${t('cp.measures')}</span><div class="cp-measures">${MEASURES.map((k) => `<label><span>${esc(s_(`coral.m.${k}` as Key))}</span><input class="cp-in" data-m="${k}" type="number" inputmode="decimal" step="any" min="${MEASURE_LIMITS[k][0]}" max="${MEASURE_LIMITS[k][1]}"></label>`).join('')}</div></div>
        <div class="cp-field"><span>${esc(s_('coral.actions'))}</span>${chips(vActions, 'data-x-vact')}</div>
        <label class="cp-field"><span>${esc(s_('coral.visitNotes'))}</span><textarea class="cp-in" id="cps-vnotes" rows="2" maxlength="2000"></textarea></label>
        <div class="cp-btns"><button type="button" class="cp-btn primary" data-x-logvisit="1">${I.plus}${esc(s_('coral.visit'))}</button></div>
        <p class="cp-cap">${t('cp.visitNote')}</p>
      </section>
      <section class="fc-card"><div class="fc-card-head"><h2>${esc(s_('coral.visits'))} (${s.visits.length})</h2></div>
        ${s.visits.length ? `<ul class="cp-visits">${[...s.visits].reverse().map((v) => visitCard(s, v)).join('')}</ul>` : `<p class="cp-cap">${esc(s_('coral.noVisitsYet'))}</p>`}
      </section>`;
  }

  function photosHtml(s: CoralSite) {
    const all = photosNewestFirst(s);
    const add = `<button type="button" class="cp-btn primary" data-x-addphoto="">${I.photo}${s_('coral.photo')}</button>`;
    if (!all.length) return `<section class="fc-card"><p class="cp-cap">${esc(s_('coral.noPhotos'))}</p><div class="cp-btns">${add}</div></section>`;
    const groups: { d: number; ids: string[] }[] = [];
    for (const p of all) {
      const d = photoTime(p);
      if (!groups.length || localDay(groups[groups.length - 1].d) !== localDay(d)) groups.push({ d, ids: [] });
      groups[groups.length - 1].ids.push(p.id);
    }
    return `<section class="fc-card"><div class="cp-btns">${add}</div>
      ${groups.map((g) => `<h3 class="cp-sub">${esc(dayDate(g.d, lang))} · ${g.ids.length}</h3>${thumbs(s, g.ids)}`).join('')}</section>`;
  }

  function missionsHtml(s: CoralSite) {
    const now = Date.now();
    const open = s.missions.filter((m) => !m.doneVisitId).sort((a, b) => a.t - b.t);
    const done = s.missions.filter((m) => m.doneVisitId).reverse();
    return `
      <section class="fc-card cp-form"><div class="fc-card-head"><h2>${esc(s_('coral.newMission'))}</h2></div>
        <div class="cp-new-row">
          <label class="cp-field"><span>${esc(s_('coral.missionDate'))}</span><input class="cp-in" id="cps-mdate" type="date" value="${localDay(now + 864e5)}"></label>
          <label class="cp-field cp-grow"><span>${esc(s_('coral.missionGoal'))}</span><input class="cp-in" id="cps-mgoal" type="text" maxlength="120"></label>
        </div>
        <div class="cp-field"><span>${esc(s_('coral.actions'))}</span>${chips(mActions, 'data-x-mact')}</div>
        <label class="cp-field"><span>${esc(s_('coral.missionNotes'))}</span><textarea class="cp-in" id="cps-mnotes" rows="2" maxlength="1000"></textarea></label>
        <div class="cp-btns"><button type="button" class="cp-btn primary" data-x-plan="1">${I.plus}${esc(s_('coral.planMission'))}</button></div>
      </section>
      <section class="fc-card"><div class="fc-card-head"><h2>${esc(s_('coral.openMissions'))} (${open.length})</h2></div>
        ${open.length ? `<ul class="cp-mlist">${open.map((m) => `<li class="${overdue(m, now) ? 'late' : ''}">
          <div><span class="cp-m-date">${esc(dayDate(m.t, lang))}${overdue(m, now) ? ` <span class="cp-pill l0">${t('cp.overdue')}</span>` : ''}</span><b>${esc(m.goal || '--')}</b>${m.actions.length ? `<small>${m.actions.map((a) => esc(s_(`coral.act.${a}` as Key))).join(', ')}</small>` : ''}${m.notes ? `<p class="cp-notes">${esc(m.notes)}</p>` : ''}</div>
          <div class="cp-btns"><button type="button" class="cp-btn primary" data-x-start="${m.id}">${t('cp.logMission')}</button><button type="button" class="cp-btn danger" data-x-delmission="${m.id}" aria-label="${t('coral.remove')}">✕</button></div>
        </li>`).join('')}</ul>` : `<p class="cp-cap">${t('cp.noMissions')}</p>`}
      </section>
      ${done.length ? `<section class="fc-card"><div class="fc-card-head"><h2>${esc(s_('coral.doneMissions'))}</h2></div><ul class="cp-missions">${done.map((m) => `<li><button type="button" data-x-gotovisit="${m.doneVisitId}"><span class="cp-m-date">${esc(dayDate(s.visits.find((v) => v.id === m.doneVisitId)?.t ?? m.t, lang))}</span><span class="cp-m-goal"><b>✓ ${esc(m.goal || '--')}</b></span><span></span>${I.chev}</button></li>`).join('')}</ul></section>` : ''}`;
  }

  function conditionsHtml(s: CoralSite) {
    const h = deps.historyAt(s);
    const f1 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '--' : x.toFixed(1));
    const visits = s.visits.map((v) => ({ t: v.t, cls: lc(statusLevelOf(v.status)), title: `${shortDate(v.t, lang)} · ${statusName(v.status)}` }));
    const month = (ms: number) => monthName(ms, lang);
    const charts = h
      ? h.series.map((x) => {
          const mud = x.label !== 'DHW';
          return `<h3 class="cp-sub">${mud ? t('cp.mudTrend') : t('cp.trend')}</h3>${trendChart({ days: x.days, values: x.values, watch: x.watch, high: x.high, unit: mud ? '' : ' DHW', watchLabel: mud ? t('cp.th.mudWatch', { v: MUD_WATCH }) : t('cp.th.watch', { v: DHW_BLEACHING }), highLabel: mud ? t('cp.th.mudHigh', { v: MUD_HIGH }) : t('cp.th.high', { v: DHW_SEVERE }) }, { month, visits, height: 120 })}`;
        }).join('')
      : `<p class="cp-cap">${esc(s_('coral.historyLoading'))}</p>`;
    const rows = [...s.visits].reverse().map((v) => {
      const c = v.conditions;
      return `<tr><td>${esc(shortDate(v.t, lang))} ${new Date(v.t).getUTCFullYear()}</td><td><span class="cp-pill ${lc(statusLevelOf(v.status))}">${esc(statusName(v.status))}</span></td><td>${f1(c?.dhw)}</td><td>${f1(c?.mudWeeks)}</td><td>${f1(c?.sstC)}</td><td>${f1(c?.flowRatio)}</td><td>${f1(c?.hsM)}</td><td>${f1(v.secchiM)}</td><td>${v.sedimentPct ?? '--'}</td><td>${v.bleachPct ?? '--'}</td></tr>`;
    }).join('');
    const th = (k: Key) => `<th>${esc(soften(t(k)))}</th>`;
    const table = s.visits.length
      ? `<div class="cp-scroll"><table class="cp-table"><thead><tr>${th('coral.th.date')}${th('coral.th.status')}<th>DHW</th>${th('coral.th.mud')}<th>SST °C</th>${th('coral.th.river')}${th('coral.th.swell')}<th>Secchi m</th>${th('coral.th.sed')}${th('coral.th.bleach')}</tr></thead><tbody>${rows}</tbody></table></div>`
      : `<p class="cp-cap">${esc(s_('coral.noVisitsYet'))}</p>`;
    const years = h ? yearRows(s, h.yearFrom, h.yearTo, h.heatPeak, h.mudPeak) : [];
    const tone = (v: number | null, w: number, hi: number) => (v === null ? '' : v >= hi ? 'l0' : v >= w ? 'l2' : 'l3');
    return `
      <section class="fc-card"><div class="fc-card-head"><h2>${esc(h ? t('cp.last12At', { reef: titleCase(h.reefName) }) : t('cp.trend'))}</h2></div>${charts}</section>
      <section class="fc-card"><div class="fc-card-head"><h2>${esc(s_('coral.atVisits'))}</h2></div>${table}</section>
      ${years.length ? `<section class="fc-card"><div class="fc-card-head"><h2>${esc(s_('coral.eachYear'))}</h2></div><div class="cp-scroll"><table class="cp-table"><thead><tr>${th('coral.th.year')}${th('coral.th.heatPeak')}${th('coral.th.mudPeak')}${th('coral.th.visits')}</tr></thead><tbody>${years
        .map((y) => `<tr><td>${y.year}</td><td><span class="cp-num ${tone(y.heat, DHW_BLEACHING, DHW_SEVERE)}">${f1(y.heat)}</span></td><td><span class="cp-num ${tone(y.mud, MUD_WATCH, MUD_HIGH)}">${f1(y.mud)}</span></td><td>${y.visits ? `${y.visits}${y.worst ? ` · ${esc(statusName(y.worst))}` : ''}` : '--'}</td></tr>`)
        .join('')}</tbody></table></div><p class="cp-cap">${esc(s_('coral.historyNote'))}</p></section>` : ''}`;
  }

  function folderHtml(s: CoralSite) {
    const body = tab === 'overview' ? overviewHtml(s) : tab === 'visits' ? visitsHtml(s) : tab === 'photos' ? photosHtml(s) : tab === 'missions' ? missionsHtml(s) : conditionsHtml(s);
    const last = lastVisit(s);
    return `
      <div class="cp-folder-head">
        <button type="button" class="cp-link cp-up" data-x-front="1">${I.back}${t('cp.allSites')}</button>
        <h2 class="cp-folder-name">${esc(s.name || t('cp.unnamed'))}</h2>
        <p class="cp-folder-sub"><span class="cp-kind">${esc(kindName(s.kind))}</span> ${t('cp.near', { reef: esc(reefName(deps.reefOf(s))) })}${last ? ` · <span class="cp-pill ${lc(statusLevelOf(last.status))}">${esc(statusName(last.status))}</span>` : ''}</p>
      </div>
      <div class="cp-ftabs" role="tablist">${FOLDER_TABS.map((k) => `<button type="button" role="tab" class="cp-chip${k === tab ? ' on' : ''}" aria-selected="${k === tab}" data-x-ftab="${k}">${esc(s_(`coral.ftab.${k}` as Key))}${k === 'visits' ? ` <small>${s.visits.length}</small>` : k === 'photos' ? ` <small>${s.photos.length}</small>` : k === 'missions' ? ` <small>${s.missions.filter((m) => !m.doneVisitId).length}</small>` : ''}</button>`).join('')}</div>
      ${body}`;
  }

  /** Markup for the sites tab: a folder when `id` names a site, else the front. */
  function html(id: string | null, sub: string | null, banner: string): string {
    if (id !== siteId) (draft = {}), (vMission = null), (vActions = new Set()), (vStatus = 'unknown'), (openVisit = null);
    siteId = id && store.list().some((x) => x.id === id) ? id : null;
    if (siteId) tab = isFolderTab(sub) ? sub : 'overview';
    const s = site();
    return s ? `${banner.replace('cp-privacy', 'cp-privacy slim')}${folderHtml(s)}` : frontHtml(banner);
  }

  // Thumbnails: object URLs for the photos on screen, revoked on every redraw.
  const urls: string[] = [];
  async function after() {
    for (const x of body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
      const k = x.dataset.m ? `m:${x.dataset.m}` : x.id;
      if (k in draft) x.value = draft[k];
    }
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    for (const c of body.querySelectorAll<HTMLElement>('[data-cover]')) {
      const b = await getPhoto(c.dataset.cover!);
      if (!b || !c.isConnected) continue;
      const u = URL.createObjectURL(b);
      urls.push(u);
      c.style.backgroundImage = `url("${u}")`;
    }
    for (const box of body.querySelectorAll<HTMLElement>('.cp-thumbs')) {
      const ids = (box.dataset.photos ?? '').split(',').filter(Boolean);
      const parts: string[] = [];
      for (const id of ids) {
        const b = await getPhoto(id);
        if (!box.isConnected) return;
        if (!b) {
          parts.push(`<span class="cp-thumb cp-missing" title="${esc(s_('coral.photoMissing'))}">?</span>`);
          continue;
        }
        const u = URL.createObjectURL(b);
        urls.push(u);
        parts.push(`<button type="button" class="cp-thumb" data-x-pid="${id}" aria-label="${t('coral.photoOpen')}"><img src="${u}" alt=""></button>`);
      }
      box.innerHTML = parts.join('');
    }
  }

  // --- photo viewer
  const viewer = $('cps-viewer');
  let viewUrl: string | null = null;
  let viewing: { siteId: string; pid: string; list: string[] } | null = null;
  async function showPhoto(sid: string, pid: string, list: string[]) {
    const s = store.list().find((x) => x.id === sid);
    const p = s?.photos.find((x) => x.id === pid);
    if (!s || !p) return closeViewer();
    const blob = await getPhoto(pid);
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    viewUrl = blob ? URL.createObjectURL(blob) : null;
    viewing = { siteId: sid, pid, list };
    const i = list.indexOf(pid);
    const v = p.visitId ? s.visits.find((x) => x.id === p.visitId) : undefined;
    viewer.innerHTML = `<div class="cp-v-in">
      <div class="cp-v-top"><b>${esc(s.name || t('cp.unnamed'))} · ${esc(dayDate(photoTime(p), lang))}</b><span>${i + 1} / ${list.length}</span><button type="button" class="fc-tool" data-v="close" aria-label="${esc(s_('coral.close'))}">✕</button></div>
      <div class="cp-v-img">${viewUrl ? `<img src="${viewUrl}" alt="${esc(p.caption || t('coral.photoAlt'))}">` : `<p>${esc(s_('coral.photoMissing'))}</p>`}
        <button type="button" class="cp-v-nav prev" data-v="prev" ${i <= 0 ? 'disabled' : ''} aria-label="◀">${I.back}</button><button type="button" class="cp-v-nav next" data-v="next" ${i >= list.length - 1 ? 'disabled' : ''} aria-label="▶">${I.chev}</button></div>
      <p class="cp-cap">${esc(s_('coral.photoFrom'))}: ${v ? `${esc(dayDate(v.t, lang))} · ${esc(statusName(v.status))}` : esc(s_('coral.sitePhoto'))}</p>
      <label class="cp-field"><span>${esc(s_('coral.caption'))}</span><input class="cp-in" id="cpv-cap" type="text" maxlength="200" value="${esc(p.caption)}"></label>
      <label class="cp-field"><span>${esc(s_('coral.tags'))}</span><input class="cp-in" id="cpv-tags" type="text" maxlength="200" value="${esc(p.tags.join(', '))}"></label>
      <div class="cp-btns"><button type="button" class="cp-btn danger" data-v="del">${esc(s_('coral.photoRemove'))}</button></div>
    </div>`;
    viewer.hidden = false;
    viewer.querySelector<HTMLElement>('[data-v="close"]')?.focus();
  }
  function closeViewer() {
    viewer.hidden = true;
    viewer.innerHTML = '';
    viewing = null;
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    viewUrl = null;
  }
  viewer.addEventListener('change', (e) => {
    if (!viewing) return;
    const x = e.target as HTMLInputElement;
    if (x.id === 'cpv-cap') store.updatePhoto(viewing.siteId, viewing.pid, { caption: x.value.trim() });
    if (x.id === 'cpv-tags') store.updatePhoto(viewing.siteId, viewing.pid, { tags: parseTags(x.value) });
  });
  viewer.addEventListener('click', (e) => {
    if (!viewing) return;
    if (e.target === viewer) return closeViewer();
    const v = (e.target as Element).closest<HTMLElement>('[data-v]')?.dataset.v;
    const { siteId: sid, pid, list } = viewing;
    const i = list.indexOf(pid);
    if (v === 'close') closeViewer();
    else if (v === 'prev' && i > 0) void showPhoto(sid, list[i - 1], list);
    else if (v === 'next' && i < list.length - 1) void showPhoto(sid, list[i + 1], list);
    else if (v === 'del' && confirm(t('coral.photoRemoveSure'))) {
      void deletePhoto(pid);
      store.removePhoto(sid, pid);
      const rest = list.filter((x) => x !== pid);
      if (rest.length) void showPhoto(sid, rest[Math.min(i, rest.length - 1)], rest);
      else closeViewer();
    }
  });
  viewer.addEventListener('keydown', (e) => {
    if (!viewing) return;
    if (e.key === 'Escape') (e.stopPropagation(), closeViewer());
    if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLInputElement)) viewer.querySelector<HTMLElement>('[data-v="prev"]')?.click();
    if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement)) viewer.querySelector<HTMLElement>('[data-v="next"]')?.click();
  });

  // --- the file inputs
  const here = () => watchFix(deps.centre, (m) => say(m === null ? s_('coral.gpsWaiting') : s_('coral.gpsFix', { m: Math.round(m) }), 0));
  const takeName = () => {
    const v = (draft['cps-name'] ?? body.querySelector<HTMLInputElement>('#cps-name')?.value ?? '').trim();
    delete draft['cps-name'];
    return v;
  };
  $<HTMLInputElement>('cps-photos').addEventListener('change', async () => {
    const inp = $<HTMLInputElement>('cps-photos');
    const files = [...(inp.files ?? [])];
    inp.value = '';
    const target = photoTarget;
    if (!target || !files.length) return;
    const r = await addPhotos(store, target, files, (k, n) => say(s_('coral.photoSaving', { k, n }), 0));
    if (r.failed) say(s_('coral.photoFail'));
    else if (r.farKm >= 1) say(s_('coral.photoFar', { km: r.farKm.toFixed(1) }), 6000);
    else say(s_('coral.photosAdded', { n: files.length }));
  });
  $<HTMLInputElement>('cps-site-photo').addEventListener('change', async () => {
    const inp = $<HTMLInputElement>('cps-site-photo');
    const file = inp.files?.[0];
    inp.value = '';
    if (!file) return;
    const s = await siteFromPhoto(store, file, (lng, lat, acc) => siteFields(kind, takeName(), lng, lat, 'photo', acc, deps.depthAt()));
    if (s === 'nogps') return say(s_('coral.photoNoGps'), 6000);
    if (s === 'fail') return say(s_('coral.photoFail'));
    persist();
    say(s_('coral.fromPhotoDone'));
    nav(s.id, 'overview');
  });
  $<HTMLInputElement>('cps-backup').addEventListener('change', async () => {
    const inp = $<HTMLInputElement>('cps-backup');
    const file = inp.files?.[0];
    inp.value = '';
    if (!file || busy) return;
    busy = true;
    say(s_('coral.importBusy'), 0);
    try {
      const r = await importBackup(store, file);
      say(s_('coral.importDone', { a: r.added, m: r.merged, p: r.photos }), 6000);
    } catch (err) {
      say(`${s_('coral.importFail')} ${s_(importErrorKey(err))}`, 6000);
    } finally {
      busy = false;
    }
  });

  // --- events on the page body (only while the sites tab is showing)
  const on = () => body.dataset.tab === 'sites';
  const toggle = (set: Set<ActionId>, b: HTMLElement, a: ActionId) => {
    if (set.has(a)) set.delete(a);
    else set.add(a);
    b.classList.toggle('on', set.has(a));
    b.setAttribute('aria-pressed', String(set.has(a)));
  };
  body.addEventListener('input', (e) => {
    if (!on()) return;
    const x = e.target as HTMLInputElement;
    if (x.dataset.m) draft[`m:${x.dataset.m}`] = x.value;
    else if (/^cps-(name|team|vnotes|mdate|mgoal|mnotes)$/.test(x.id)) draft[x.id] = x.value;
  });
  body.addEventListener('change', (e) => {
    const s = site();
    if (!on() || !s) return;
    const x = e.target as HTMLInputElement;
    if (x.id === 'cps-rename') store.update(s.id, { name: x.value.trim() });
    if (x.id === 'cps-species') store.update(s.id, { species: x.value.trim() });
    if (x.id === 'cps-notes') store.update(s.id, { notes: x.value.trim() });
    if (/^cps-(rename|species|notes)$/.test(x.id)) say(t('cp.saved'), 1500);
  });
  body.addEventListener('click', async (e) => {
    if (!on()) return;
    const target = e.target as Element;
    const hit = (q: string) => target.closest<HTMLElement>(q);
    const d = (b: HTMLElement, k: string) => b.dataset[k] ?? '';
    let b: HTMLElement | null;
    const s = site();
    if ((b = hit('[data-x-open]'))) nav(d(b, 'xOpen'), isFolderTab(b.dataset.xTab) ? b.dataset.xTab : 'overview');
    else if (hit('[data-x-front]')) nav(null);
    else if ((b = hit('[data-x-ftab]'))) nav(siteId, d(b, 'xFtab') as FolderTab);
    else if ((b = hit('[data-x-kind]'))) {
      kind = d(b, 'xKind') as SiteKind;
      body.querySelectorAll<HTMLElement>('[data-x-kind]').forEach((x) => (x.classList.toggle('on', x === b), x.setAttribute('aria-checked', String(x === b))));
    } else if (hit('[data-x-here]')) {
      const f = await here();
      const ns = store.add(siteFields(kind, takeName(), f.lng, f.lat, f.gps ? 'gps' : 'centre', f.accuracy, deps.depthAt()));
      persist();
      say(f.gps ? s_('coral.addedGps', { m: Math.round(f.accuracy ?? 0) }) : s_('coral.atCentre'), 5000);
      nav(ns.id, 'overview');
    } else if (hit('[data-x-fromphoto]')) $('cps-site-photo').click();
    else if (hit('[data-x-place]')) deps.openOnMap({ place: true });
    else if (hit('[data-x-backup]')) {
      if (busy) return;
      if (!store.list().length) return say(s_('coral.exportEmpty'));
      busy = true;
      say(s_('coral.backupBusy'), 0);
      try {
        const r = await saveBackup(store);
        say(r.missing ? s_('coral.backupMissing', { n: r.photos, m: r.missing }) : s_('coral.backupDone', { n: r.photos }), 7000);
      } catch {
        say(s_('coral.backupFail'));
      } finally {
        busy = false;
      }
    } else if (hit('[data-x-import]')) $('cps-backup').click();
    else if (hit('[data-x-geo]')) store.list().length ? download(JSON.stringify(toGeoJSON(store.list()), null, 1), 'application/geo+json', `coral-sites-${localDay(Date.now())}.geojson`) : say(s_('coral.exportEmpty'));
    else if (hit('[data-x-csv]')) store.list().length ? download(toCSV(store.list()), 'text/csv', `coral-sites-${localDay(Date.now())}.csv`) : say(s_('coral.exportEmpty'));
    if (!s) return;
    // --- inside a folder
    if (hit('[data-x-move]')) {
      if (!confirm(t('cp.moveSure'))) return;
      const f = await here();
      const dd = deps.depthAt()?.(f.lng, f.lat);
      store.update(s.id, { lng: f.lng, lat: f.lat, locSource: f.gps ? 'gps' : 'centre', gpsAccuracyM: f.accuracy, ...(dd !== undefined && dd < 0 ? { depthM: Math.abs(dd) } : {}) });
      say(f.gps ? s_('coral.moved') : s_('coral.movedCentre'));
    } else if (hit('[data-x-showmap]')) deps.openOnMap({ site: s.id });
    else if ((b = hit('[data-x-setkind]'))) store.update(s.id, { kind: d(b, 'xSetkind') as SiteKind });
    else if ((b = hit('[data-x-addphoto]'))) {
      photoTarget = { siteId: s.id, visitId: b.dataset.xAddphoto || null };
      $('cps-photos').click();
    } else if ((b = hit('[data-x-pid]'))) {
      const box = b.closest<HTMLElement>('.cp-thumbs');
      void showPhoto(s.id, d(b, 'xPid'), (box?.dataset.photos ?? '').split(',').filter(Boolean));
    } else if (hit('[data-x-delete]')) {
      if (!confirm(t('coral.removeSure'))) return;
      removeSite(store, s);
      nav(null);
    } else if ((b = hit('[data-x-status]'))) {
      vStatus = d(b, 'xStatus') as CoralStatus;
      body.querySelectorAll<HTMLElement>('[data-x-status]').forEach((x) => (x.classList.toggle('on', x === b), x.setAttribute('aria-pressed', String(x === b))));
    } else if ((b = hit('[data-x-vact]'))) toggle(vActions, b, d(b, 'xVact') as ActionId);
    else if ((b = hit('[data-x-mact]'))) toggle(mActions, b, d(b, 'xMact') as ActionId);
    else if (hit('[data-x-unmission]')) {
      vMission = null;
      nav(s.id, 'visits');
    } else if (hit('[data-x-logvisit]')) {
      const raw: Record<string, number> = {};
      for (const inp of body.querySelectorAll<HTMLInputElement>('[data-m]')) if (inp.value.trim() !== '') raw[inp.dataset.m!] = parseFloat(inp.value);
      const conditions = deps.conditionsAt(s.lng, s.lat, s.depthM) ?? undefined;
      const team = body.querySelector<HTMLInputElement>('#cps-team')!.value.trim();
      const v = {
        t: Date.now(), status: vStatus, notes: body.querySelector<HTMLTextAreaElement>('#cps-vnotes')!.value.trim(), actions: [...vActions],
        ...cleanMeasures(raw), ...(team ? { team } : {}), ...(conditions ? { conditions } : {}),
      };
      vStatus = 'unknown';
      vActions = new Set();
      draft = Object.fromEntries(Object.entries(draft).filter(([k]) => !k.startsWith('m:') && k !== 'cps-vnotes'));
      const m = vMission;
      vMission = null;
      const logged = m ? store.completeMission(s.id, m, v) : store.addVisit(s.id, v);
      openVisit = logged?.id ?? null;
      persist();
      say(s_('coral.visitLogged'));
      nav(s.id, 'visits');
    } else if ((b = hit('[data-x-visit]'))) {
      openVisit = openVisit === b.dataset.xVisit ? null : d(b, 'xVisit');
      nav(s.id, 'visits');
    } else if ((b = hit('[data-x-delvisit]'))) {
      if (confirm(t('coral.deleteVisitSure'))) store.removeVisit(s.id, d(b, 'xDelvisit'));
    } else if (hit('[data-x-plan]')) {
      const when = dateInputMs(body.querySelector<HTMLInputElement>('#cps-mdate')!.value);
      const goal = body.querySelector<HTMLInputElement>('#cps-mgoal')!.value.trim();
      if (when === null || !goal) return say(s_('coral.missionNeeds'));
      const notes = body.querySelector<HTMLTextAreaElement>('#cps-mnotes')!.value.trim();
      const acts = [...mActions];
      mActions = new Set();
      draft = Object.fromEntries(Object.entries(draft).filter(([k]) => !/^cps-m/.test(k)));
      store.addMission(s.id, { t: when, goal, actions: acts, notes });
      say(s_('coral.missionPlanned'));
    } else if ((b = hit('[data-x-start]'))) {
      const m = s.missions.find((x) => x.id === b!.dataset.xStart);
      if (!m) return;
      vMission = m.id;
      vActions = new Set(m.actions);
      nav(s.id, 'visits');
    } else if ((b = hit('[data-x-delmission]'))) {
      if (confirm(t('coral.deleteMissionSure'))) store.removeMission(s.id, d(b, 'xDelmission'));
    } else if ((b = hit('[data-x-gotovisit]'))) {
      openVisit = d(b, 'xGotovisit');
      nav(s.id, 'visits');
    }
  });
  store.subscribe(() => {
    if (viewing && !store.list().find((x) => x.id === viewing!.siteId)?.photos.some((p) => p.id === viewing!.pid)) closeViewer();
  });

  return {
    html,
    after,
    siteCard,
    isViewing: () => !!viewing,
    closeViewer,
    /** Leave the folder (a deleted or unknown site). */
    current: () => siteId,
  };
}
