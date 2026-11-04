/**
 * CORAL drawer: the private field log. A list of your wild reef sites, nurseries and outplant gardens;
 * each opens as a folder (PLAN 7.37) with OVERVIEW, VISITS, PHOTOS and MISSIONS tabs. Tapping a site's
 * ring on the map opens its folder too. Private and on this device (src/coral/store.ts). Phone: a sheet.
 */
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { closeButton, PHONE_QUERY, type Sheets } from './sheets';
import { haversineM } from './geo';
import { ACTIONS, MEASURES, MEASURE_LIMITS, newId, SITE_KINDS, STATUSES, cleanMeasures, entryCount, photosOf, type ActionId, type Conditions, type CoralSite, type CoralStatus, type CoralStore, type SiteKind, type Visit } from './coral/store';
import { conditionRows, dateInputMs, lastVisit, localDay, measureRows, nextMission, overdue, parseTags, photosNewestFirst, photoTime, type Row } from './coral/folder-view';
import { toCSV, toGeoJSON } from './coral/export';
import { buildBackup, mergeSites, readBackup } from './coral/backup';
import { deletePhoto, getPhoto, putPhoto, shrink } from './coral/photos';
import { CORAL_LOG_PREFIX } from './layers/coral-log';
import { claimMapTap } from './here-card';
import { EXIF_BYTES, readExif, type PhotoMeta } from './coral/exif';
import { bestFix, doneWaiting, type Fix } from './coral/gps';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const day = (ms: number) => localDay(ms);
export type FolderTab = 'overview' | 'visits' | 'photos' | 'missions';
const TABS: readonly FolderTab[] = ['overview', 'visits', 'photos', 'missions'];

/** A row's value: an i18n key when it starts with @, else text. */
const val = (v: string) => (v.startsWith('@') ? t(v.slice(1) as Key) : esc(v));
const rowsHtml = (rows: Row[]) => rows.map(([k, v]) => `<div class="ro"><span class="lbl">${t(k as Key)}</span><span class="seg sm">${val(v)}</span></div>`).join('');
const kmBetween = (lng1: number, lat1: number, lng2: number, lat2: number) => haversineM([lng1, lat1], [lng2, lat2]) / 1000;
const statusTone = (s: CoralStatus | undefined) => (s === 'healthy' ? 'green' : s && s !== 'unknown' ? 'red' : '');

export function mountCoralPanel(root: HTMLElement, map: Map, store: CoralStore, sheets: Sheets, depthAt: () => ((lng: number, lat: number) => number | undefined) | null, conditionsAt: (lng: number, lat: number, depthM?: number) => Conditions | null = () => null) {
  const el = document.createElement('section');
  el.className = 'panel boat coral';
  el.id = 'coral-panel';
  el.innerHTML = `
    <div class="ph">${t('coral.title')} <span class="tag">${t('coral.tag')}</span></div>
    <div class="ro"><span class="lbl">${t('coral.sites')}</span><span class="seg" id="c-n">0</span></div>
    <input id="c-name" type="text" maxlength="60" autocomplete="off" placeholder="${t('coral.name')}" aria-label="${t('coral.name')}">
    <div class="boat-btns">
      <button type="button" class="tab" id="c-kind"></button>
      <button type="button" class="tab" id="c-add">${t('coral.add')}</button>
    </div>
    <div class="boat-btns">
      <button type="button" class="tab" id="c-place">${t('coral.place')}</button>
      <button type="button" class="tab" id="c-fromphoto">${t('coral.fromPhoto')}</button>
    </div>
    <div class="boat-btns">
      <button type="button" class="tab" id="c-geo">${t('coral.exportGeo')}</button>
      <button type="button" class="tab" id="c-csv">${t('coral.exportCsv')}</button>
    </div>
    <div class="boat-btns">
      <button type="button" class="tab" id="c-backup">${t('coral.backup')}</button>
      <button type="button" class="tab" id="c-import">${t('coral.import')}</button>
      <input id="c-file-backup" type="file" accept=".zip,application/zip" hidden>
    </div>
    <div class="cr-note" id="c-remind"></div>
    <div class="seek-msg" id="c-msg" role="status"></div>
    <ul class="boat-pins" id="c-list"></ul>
    <div id="c-detail" class="cf"></div>
    <input id="c-file" type="file" accept="image/*" multiple hidden>
    <input id="c-file-site" type="file" accept="image/jpeg,image/*" hidden>
    <p class="rules-advice">${t('coral.note')}</p>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('coral')));
  root.appendChild(el);

  const viewer = document.createElement('div');
  viewer.className = 'panel cf-viewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-label', t('coral.viewer'));
  // Outside the HUD so the photo sits above the CRT scanlines: coral detail must stay sharp.
  document.body.appendChild(viewer);

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'tab coral-open';
  tab.textContent = t('coral.tab');
  tab.setAttribute('aria-controls', el.id);
  root.querySelector('.top-tabs')?.appendChild(tab);
  tab.addEventListener('click', () => sheets.toggle('coral'));
  const syncOpen = () => {
    const v = sheets.is('coral');
    el.classList.toggle('open', v);
    tab.classList.toggle('on', v);
    tab.setAttribute('aria-expanded', String(v));
  };
  sheets.subscribe(syncOpen);
  syncOpen();

  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  const detail = $('c-detail');
  let kind: SiteKind = 'reef';
  let sel: string | null = null;
  let folderTab: FolderTab = 'overview';
  /** The visit form's draft. */
  let vStatus: CoralStatus = 'unknown';
  let vActions = new Set<ActionId>();
  let vMission: string | null = null;
  let mActions = new Set<ActionId>();
  /** Expanded visit in the VISITS list. */
  let openVisit: string | null = null;
  /** Typed but not yet saved form text (visit and mission forms), kept across redraws. */
  let draft: Record<string, string> = {};
  const draftKey = (x: HTMLElement) => (x.dataset.m ? `m:${x.dataset.m}` : x.id);
  const DRAFTED = new Set(['c-team', 'c-vnotes', 'c-mdate', 'c-mgoal', 'c-mnotes']);
  /** Where the next chosen photo files go. */
  let photoTarget: { siteId: string; visitId: string | null } | null = null;
  const say = (m: string) => {
    $('c-msg').textContent = m;
    setTimeout(() => $('c-msg').textContent === m && ($('c-msg').textContent = ''), 3000);
  };
  const site = () => store.list().find((x) => x.id === sel) ?? null;

  const actionBtns = (set: Set<ActionId>, cls: string) =>
    `<div class="cf-acts">${ACTIONS.map((a) => `<button type="button" class="tab ${cls}${set.has(a) ? ' on' : ''}" data-act="${a}" aria-pressed="${set.has(a)}">${t(`coral.act.${a}` as Key)}</button>`).join('')}</div>`;
  const thumbs = (s: CoralSite, ids: readonly string[]) => `<div class="coral-photos" data-photos="${ids.join(',')}" data-site="${s.id}"></div>`;

  function overviewHtml(s: CoralSite) {
    const last = lastVisit(s);
    const next = nextMission(s, Date.now());
    const now = conditionsAt(s.lng, s.lat, s.depthM);
    const loc = s.locSource === 'gps' && s.gpsAccuracyM !== undefined ? `GPS ±${Math.round(s.gpsAccuracyM)} ${t('unit.m')}` : s.locSource ? t(`coral.loc.${s.locSource}` as Key) : '--';
    return `
      <div class="ro"><span class="lbl">${t('coral.depth')}</span><span class="seg sm">${s.depthM !== undefined ? `${Math.round(s.depthM)} ${t('unit.m')}` : '--'}</span></div>
      <div class="ro"><span class="lbl">${t('coral.position')}</span><span class="seg sm">${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</span></div>
      <div class="ro"><span class="lbl">${t('coral.fix')}</span><span class="seg sm">${loc}</span></div>
      <div class="ro"><span class="lbl">${t('coral.last')}</span><span class="seg sm ${statusTone(last?.status)}">${last ? `${day(last.t)} ${t(`coral.st.${last.status}` as Key)}` : '--'}</span></div>
      <div class="ro"><span class="lbl">${t('coral.next')}</span><span class="seg sm${next && overdue(next, Date.now()) ? ' red' : ''}">${next ? `${day(next.t)} ${esc(next.goal)}` : '--'}</span></div>
      <div class="ro"><span class="lbl">${t('coral.counts')}</span><span class="seg sm">${s.visits.length} · ${s.photos.length} · ${s.missions.filter((m) => !m.doneVisitId).length}</span></div>
      ${now && conditionRows(now).length ? `<div class="lbl cf-sub">${t('coral.nowHere')}</div>${rowsHtml(conditionRows(now))}` : ''}
      <input id="c-sp" type="text" maxlength="120" value="${esc(s.species)}" placeholder="${t('coral.species')}" aria-label="${t('coral.species')}">
      <textarea id="c-notes" rows="3" maxlength="2000" placeholder="${t('coral.notes')}" aria-label="${t('coral.notes')}">${esc(s.notes)}</textarea>
      <div class="boat-btns"><button type="button" class="tab" id="c-move">${t('coral.move')}</button>
        <button type="button" class="tab" data-add-photo="">${t('coral.photo')}</button></div>
      <div class="lbl cf-sub">${t('coral.sitePhotos')}</div>
      ${thumbs(s, photosOf(s, null).map((p) => p.id))}`;
  }

  function visitHtml(s: CoralSite, v: Visit) {
    const open = openVisit === v.id;
    const mission = v.missionId ? s.missions.find((m) => m.id === v.missionId) : undefined;
    const photos = photosOf(s, v.id);
    const head = `${day(v.t)} ${t(`coral.st.${v.status}` as Key)}${v.bleachPct !== undefined ? ` ${v.bleachPct}%` : ''}${photos.length ? ` · ${photos.length}▣` : ''}`;
    const body = open
      ? `<div class="cf-visit">
          ${v.team ? `<div class="ro"><span class="lbl">${t('coral.team')}</span><span class="seg sm">${esc(v.team)}</span></div>` : ''}
          ${mission ? `<div class="ro"><span class="lbl">${t('coral.mission')}</span><span class="seg sm">${esc(mission.goal)}</span></div>` : ''}
          ${rowsHtml(measureRows(v))}
          ${v.actions.length ? `<div class="cr-tags">${v.actions.map((a) => `<span class="cr-lvl cr-green">${t(`coral.act.${a}` as Key)}</span>`).join('')}</div>` : ''}
          ${v.notes ? `<p class="cf-notes">${esc(v.notes)}</p>` : ''}
          ${v.conditions ? `<div class="lbl cf-sub">${t('coral.conditionsThen')}</div>${rowsHtml(conditionRows(v.conditions))}` : ''}
          ${thumbs(s, photos.map((p) => p.id))}
          <div class="boat-btns"><button type="button" class="tab" data-add-photo="${v.id}">${t('coral.photoVisit')}</button>
            <button type="button" class="tab" data-del-visit="${v.id}">${t('coral.deleteVisit')}</button></div>
        </div>`
      : '';
    return `<li data-vid="${v.id}"><button type="button" class="tab pin-go${open ? ' on' : ''}" data-open-visit="${v.id}" aria-expanded="${open}">${head}</button></li>${body ? `<li class="cf-open">${body}</li>` : ''}`;
  }

  function visitsHtml(s: CoralSite) {
    const mission = vMission ? s.missions.find((m) => m.id === vMission && !m.doneVisitId) : undefined;
    if (!mission) vMission = null;
    return `
      <div class="lbl cf-sub">${mission ? `${t('coral.forMission')} ${esc(mission.goal)}` : t('coral.newVisit')}</div>
      <div class="boat-btns"><button type="button" class="tab" id="c-st">${t(`coral.st.${vStatus}` as Key)}</button>
        <input id="c-team" type="text" maxlength="80" placeholder="${t('coral.team')}" aria-label="${t('coral.team')}"></div>
      <div class="cf-measures">${MEASURES.map((k) => `<label><span class="lbl">${t(`coral.m.${k}` as Key)}</span><input data-m="${k}" type="number" inputmode="decimal" step="any" min="${MEASURE_LIMITS[k][0]}" max="${MEASURE_LIMITS[k][1]}"></label>`).join('')}</div>
      <div class="lbl cf-sub">${t('coral.actions')}</div>
      ${actionBtns(vActions, 'cf-vact')}
      <textarea id="c-vnotes" rows="2" maxlength="2000" placeholder="${t('coral.visitNotes')}" aria-label="${t('coral.visitNotes')}"></textarea>
      <div class="boat-btns"><button type="button" class="tab" id="c-visit">${t('coral.visit')}</button>${mission ? `<button type="button" class="tab" id="c-unmission">${t('coral.notMission')}</button>` : ''}</div>
      <div class="lbl cf-sub">${t('coral.visits')} (${s.visits.length})</div>
      <ul class="boat-pins" id="c-visits">${[...s.visits].reverse().map((v) => visitHtml(s, v)).join('')}</ul>`;
  }

  function photosHtml(s: CoralSite) {
    const all = photosNewestFirst(s);
    if (!all.length) return `<p class="rules-advice">${t('coral.noPhotos')}</p><div class="boat-btns"><button type="button" class="tab" data-add-photo="">${t('coral.photo')}</button></div>`;
    // Folder-style: one group per day.
    const groups: { d: string; ids: string[] }[] = [];
    for (const p of all) {
      const d = day(photoTime(p));
      if (groups[groups.length - 1]?.d !== d) groups.push({ d, ids: [] });
      groups[groups.length - 1].ids.push(p.id);
    }
    return `<div class="boat-btns"><button type="button" class="tab" data-add-photo="">${t('coral.photo')}</button></div>
      ${groups.map((g) => `<div class="lbl cf-sub">${g.d} · ${g.ids.length}</div>${thumbs(s, g.ids)}`).join('')}`;
  }

  function missionsHtml(s: CoralSite) {
    const now = Date.now();
    const open = s.missions.filter((m) => !m.doneVisitId);
    const done = s.missions.filter((m) => m.doneVisitId).reverse();
    return `
      <div class="lbl cf-sub">${t('coral.newMission')}</div>
      <div class="boat-btns"><input id="c-mdate" type="date" value="${day(now + 864e5)}" aria-label="${t('coral.missionDate')}">
        <input id="c-mgoal" type="text" maxlength="120" placeholder="${t('coral.missionGoal')}" aria-label="${t('coral.missionGoal')}"></div>
      ${actionBtns(mActions, 'cf-mact')}
      <textarea id="c-mnotes" rows="2" maxlength="1000" placeholder="${t('coral.missionNotes')}" aria-label="${t('coral.missionNotes')}"></textarea>
      <div class="boat-btns"><button type="button" class="tab" id="c-mplan">${t('coral.planMission')}</button></div>
      <div class="lbl cf-sub">${t('coral.openMissions')} (${open.length})</div>
      <ul class="boat-pins">${open.map((m) => `<li><span class="tab pin-go${overdue(m, now) ? ' cr-red' : ''}">${day(m.t)} ${esc(m.goal || '--')}${m.actions.length ? ` · ${m.actions.map((a) => t(`coral.act.${a}` as Key)).join(', ')}` : ''}${m.notes ? `<br><span class="cf-notes">${esc(m.notes)}</span>` : ''}</span><button type="button" class="tab" data-start="${m.id}">${t('coral.startMission')}</button><button type="button" class="tab pin-x" data-del-mission="${m.id}" aria-label="${t('coral.remove')}">✕</button></li>`).join('')}</ul>
      ${done.length ? `<div class="lbl cf-sub">${t('coral.doneMissions')}</div><ul class="boat-pins">${done.map((m) => `<li><button type="button" class="tab pin-go" data-goto-visit="${m.doneVisitId}">${day(s.visits.find((v) => v.id === m.doneVisitId)?.t ?? m.t)} ✓ ${esc(m.goal || '--')}</button></li>`).join('')}</ul>` : ''}`;
  }

  function render() {
    const sites = store.list();
    $('c-n').textContent = String(sites.length);
    $('c-kind').textContent = t(`coral.kind.${kind}` as Key);
    $('c-list').innerHTML = [...sites]
      .reverse()
      .map((s) => `<li data-id="${s.id}"><button type="button" class="tab pin-go${s.id === sel ? ' on' : ''}">${esc(s.name || t('coral.unnamed'))} · ${t(`coral.kind.${s.kind}` as Key)}</button><button type="button" class="tab pin-x" aria-label="${t('coral.remove')}">✕</button></li>`)
      .join('');
    const s = site();
    if (!s) {
      sel = null;
      detail.innerHTML = '';
      return;
    }
    const body = folderTab === 'overview' ? overviewHtml(s) : folderTab === 'visits' ? visitsHtml(s) : folderTab === 'photos' ? photosHtml(s) : missionsHtml(s);
    detail.innerHTML = `
      <div class="cf-head lbl">${esc(s.name || t('coral.unnamed'))} · ${t(`coral.kind.${s.kind}` as Key)}</div>
      <div class="cf-tabs" role="tablist">${TABS.map((k) => `<button type="button" role="tab" class="tab${k === folderTab ? ' on' : ''}" aria-selected="${k === folderTab}" data-ftab="${k}">${t(`coral.ftab.${k}` as Key)}</button>`).join('')}</div>
      <div class="cf-body" role="tabpanel">${body}</div>`;
    for (const x of detail.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
      const k = draftKey(x);
      if (k in draft) x.value = draft[k];
    }
    void fillThumbs(s.id);
  }

  // Thumbnails: object URLs for the photos on screen, revoked on every redraw.
  const urls: string[] = [];
  async function fillThumbs(siteId: string) {
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    for (const box of detail.querySelectorAll<HTMLElement>('.coral-photos')) {
      const ids = (box.dataset.photos ?? '').split(',').filter(Boolean);
      const parts: string[] = [];
      for (const id of ids) {
        const b = await getPhoto(id);
        if (sel !== siteId || !box.isConnected) return;
        if (!b) continue;
        const u = URL.createObjectURL(b);
        urls.push(u);
        parts.push(`<button type="button" class="cf-thumb" data-pid="${id}" aria-label="${t('coral.photoOpen')}"><img src="${u}" alt=""></button>`);
      }
      box.innerHTML = parts.join('');
    }
  }

  /** Open a site's folder (from the list, the map ring, or another feed). */
  function openSite(id: string, at: FolderTab = 'overview', fly = true) {
    const s = store.list().find((x) => x.id === id);
    if (!s) return;
    if (sel !== id) (draft = {}), (vMission = null), (vActions = new Set()), (vStatus = 'unknown');
    sel = id;
    folderTab = at;
    openVisit = null;
    if (fly) map.easeTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 13), duration: 1200 });
    if (!sheets.is('coral')) sheets.toggle('coral');
    render();
  }

  // Full-screen photo viewer with caption, tags, the visit it belongs to, and remove.
  let viewUrl: string | null = null;
  let viewing: { siteId: string; pid: string; list: string[] } | null = null;
  async function showPhoto(siteId: string, pid: string, list: string[]) {
    const s = store.list().find((x) => x.id === siteId);
    const p = s?.photos.find((x) => x.id === pid);
    if (!s || !p) return closeViewer();
    const blob = await getPhoto(pid);
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    viewUrl = blob ? URL.createObjectURL(blob) : null;
    viewing = { siteId, pid, list };
    const i = list.indexOf(pid);
    const v = p.visitId ? s.visits.find((x) => x.id === p.visitId) : undefined;
    viewer.innerHTML = `
      <div class="ph">${esc(s.name || t('coral.unnamed'))} · ${day(photoTime(p))} <span class="tag">${i + 1}/${list.length}</span></div>
      ${viewUrl ? `<img class="cf-big" src="${viewUrl}" alt="${esc(p.caption || t('coral.photoAlt'))}">` : `<p class="rules-advice">${t('coral.photoMissing')}</p>`}
      <div class="ro"><span class="lbl">${t('coral.photoFrom')}</span><span class="seg sm">${v ? `${day(v.t)} ${t(`coral.st.${v.status}` as Key)}` : t('coral.sitePhoto')}</span></div>
      <input id="cv-cap" type="text" maxlength="200" value="${esc(p.caption)}" placeholder="${t('coral.caption')}" aria-label="${t('coral.caption')}">
      <input id="cv-tags" type="text" maxlength="200" value="${esc(p.tags.join(', '))}" placeholder="${t('coral.tags')}" aria-label="${t('coral.tags')}">
      <div class="boat-btns">
        <button type="button" class="tab" id="cv-prev" ${i <= 0 ? 'disabled' : ''}>◀</button>
        <button type="button" class="tab" id="cv-next" ${i >= list.length - 1 ? 'disabled' : ''}>▶</button>
        <button type="button" class="tab" id="cv-del">${t('coral.photoRemove')}</button>
        <button type="button" class="tab" id="cv-close">${t('coral.close')}</button>
      </div>`;
    viewer.hidden = false;
    viewer.querySelector<HTMLElement>('#cv-close')?.focus();
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
    const id = (e.target as HTMLElement).id;
    if (id === 'cv-cap') store.updatePhoto(viewing.siteId, viewing.pid, { caption: (e.target as HTMLInputElement).value.trim() });
    if (id === 'cv-tags') store.updatePhoto(viewing.siteId, viewing.pid, { tags: parseTags((e.target as HTMLInputElement).value) });
  });
  viewer.addEventListener('click', (e) => {
    if (!viewing) return;
    const target = e.target as HTMLElement;
    const { siteId, pid, list } = viewing;
    const i = list.indexOf(pid);
    if (target.closest('#cv-close')) closeViewer();
    else if (target.closest('#cv-prev') && i > 0) void showPhoto(siteId, list[i - 1], list);
    else if (target.closest('#cv-next') && i < list.length - 1) void showPhoto(siteId, list[i + 1], list);
    else if (target.closest('#cv-del') && confirm(t('coral.photoRemoveSure'))) {
      void deletePhoto(pid);
      store.removePhoto(siteId, pid);
      const rest = list.filter((x) => x !== pid);
      if (rest.length) void showPhoto(siteId, rest[Math.min(i, rest.length - 1)], rest);
      else closeViewer();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !viewer.hidden) closeViewer();
  });

  /**
   * Your position for a new or moved site: watches GPS and keeps the best fix until it is within
   * GOOD_FIX_M or FIX_TIMEOUT_MS passes, showing the accuracy as it improves. No GPS: the map centre.
   */
  let fixing = false;
  const here = (): Promise<{ lng: number; lat: number; gps: boolean; accuracy?: number }> =>
    new Promise((resolve) => {
      const c = map.getCenter();
      const centre = { lng: c.lng, lat: c.lat, gps: false };
      if (!navigator.geolocation || fixing) return resolve(centre);
      fixing = true;
      const fixes: Fix[] = [];
      const started = Date.now();
      const msg = $('c-msg');
      msg.textContent = t('coral.gpsWaiting');
      let id = -1;
      const finish = () => {
        if (!fixing) return;
        fixing = false;
        navigator.geolocation.clearWatch(id);
        clearTimeout(timer);
        const best = bestFix(fixes);
        msg.textContent = '';
        resolve(best ? { lng: best.lng, lat: best.lat, gps: true, accuracy: best.accuracy } : centre);
      };
      const timer = setTimeout(finish, 20_500);
      id = navigator.geolocation.watchPosition(
        (p) => {
          fixes.push({ lng: p.coords.longitude, lat: p.coords.latitude, accuracy: p.coords.accuracy, t: p.timestamp });
          const best = bestFix(fixes);
          if (best) msg.textContent = t('coral.gpsFix', { m: Math.round(best.accuracy) });
          if (doneWaiting(best, started, Date.now())) finish();
        },
        // Permission refused: stop. A momentary loss of signal or a slow fix: keep waiting until the timer.
        (err) => err.code === err.PERMISSION_DENIED && finish(),
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
      );
    });
  const depthFields = (lng: number, lat: number) => {
    const d = depthAt()?.(lng, lat);
    return d !== undefined && d < 0 ? { depthM: Math.abs(d) } : {};
  };

  $('c-kind').addEventListener('click', () => ((kind = SITE_KINDS[(SITE_KINDS.indexOf(kind) + 1) % SITE_KINDS.length]), render()));
  $('c-add').addEventListener('click', async () => {
    const f = await here();
    const s = addSite(f.lng, f.lat, f.gps ? 'gps' : 'centre', f.accuracy);
    persist();
    if (!f.gps) say(t('coral.atCentre'));
    else say(t('coral.addedGps', { m: Math.round(f.accuracy ?? 0) }));
    openSite(s.id, 'overview', false);
  });
  function addSite(lng: number, lat: number, locSource: 'gps' | 'centre' | 'hand' | 'photo', accuracy?: number) {
    const name = $<HTMLInputElement>('c-name').value.trim();
    $<HTMLInputElement>('c-name').value = '';
    return store.add({ kind, name, lng, lat, locSource, ...(accuracy !== undefined && Number.isFinite(accuracy) ? { gpsAccuracyM: accuracy } : {}), ...depthFields(lng, lat) });
  }
  // PLACE ON MAP: the next map tap places the site (the drawer steps aside on a phone so the map can be tapped).
  let placing: (() => void) | null = null;
  $('c-place').addEventListener('click', () => {
    if (placing) return placing(), say(t('coral.placeCancel'));
    const release = claimMapTap();
    const wasOpen = sheets.is('coral');
    const phone = matchMedia(PHONE_QUERY).matches;
    if (phone && wasOpen) sheets.toggle('coral');
    say(t('coral.placeTap'));
    $('c-place').classList.add('on');
    const onTap = (e: { lngLat: { lng: number; lat: number } }) => {
      placing?.();
      const s = addSite(e.lngLat.lng, e.lngLat.lat, 'hand');
      setTimeout(() => openSite(s.id, 'overview', false), 0);
    };
    placing = () => {
      map.off('click', onTap);
      release();
      $('c-place').classList.remove('on');
      placing = null;
    };
    map.once('click', onTap);
  });
  // NEW SITE FROM PHOTO: the photo's own GPS places the site, and the photo is filed in it.
  const meta = async (file: File): Promise<PhotoMeta> => {
    try {
      return readExif(await file.slice(0, EXIF_BYTES).arrayBuffer());
    } catch {
      return {};
    }
  };
  const fileSite = $<HTMLInputElement>('c-file-site');
  $('c-fromphoto').addEventListener('click', () => fileSite.click());
  fileSite.addEventListener('change', async () => {
    const file = fileSite.files?.[0];
    fileSite.value = '';
    if (!file) return;
    const m = await meta(file);
    if (m.lat === undefined || m.lng === undefined) return say(t('coral.photoNoGps'));
    const blob = await shrink(file);
    const pid = newId();
    if (!blob || !(await putPhoto(pid, blob))) return say(t('coral.photoFail'));
    const s = addSite(m.lng, m.lat, 'photo', m.accuracyM);
    store.addPhoto(s.id, { id: pid, ...(m.takenAt !== undefined ? { takenAt: m.takenAt } : file.lastModified ? { takenAt: file.lastModified } : {}) });
    say(t('coral.fromPhotoDone'));
    openSite(s.id, 'overview', true);
  });
  const download = (text: string | Blob, type: string, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(typeof text === 'string' ? new Blob([text], { type }) : text);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  $('c-geo').addEventListener('click', () => (store.list().length ? download(JSON.stringify(toGeoJSON(store.list()), null, 1), 'application/geo+json', `coral-sites-${day(Date.now())}.geojson`) : say(t('coral.exportEmpty'))));
  $('c-csv').addEventListener('click', () => (store.list().length ? download(toCSV(store.list()), 'text/csv', `coral-sites-${day(Date.now())}.csv`) : say(t('coral.exportEmpty'))));

  // BACKUP / IMPORT (PLAN 7.41): one zip with the log and the photos, to move the log between phones.
  const BACKED_KEY = 'ft.coral.backedUp';
  const REMIND_EVERY = 10;
  const backedUp = () => {
    try {
      return Number(localStorage.getItem(BACKED_KEY) ?? '0') || 0;
    } catch {
      return 0;
    }
  };
  const remind = () => {
    const n = entryCount(store.list()) - backedUp();
    $('c-remind').textContent = n >= REMIND_EVERY ? t('coral.backupRemind', { n }) : '';
  };
  let busy = false;
  $('c-backup').addEventListener('click', async () => {
    if (busy) return;
    if (!store.list().length) return say(t('coral.exportEmpty'));
    busy = true;
    $('c-msg').textContent = t('coral.backupBusy');
    try {
      const r = await buildBackup(store.list(), getPhoto);
      download(r.blob, 'application/zip', `coral-backup-${day(Date.now())}.zip`);
      try {
        localStorage.setItem(BACKED_KEY, String(entryCount(store.list())));
      } catch {
        /* reminder only */
      }
      say(r.missing ? t('coral.backupMissing', { n: r.photos, m: r.missing }) : t('coral.backupDone', { n: r.photos }));
      remind();
    } catch {
      say(t('coral.backupFail'));
    } finally {
      busy = false;
    }
  });
  const backupInput = $<HTMLInputElement>('c-file-backup');
  $('c-import').addEventListener('click', () => backupInput.click());
  backupInput.addEventListener('change', async () => {
    const file = backupInput.files?.[0];
    backupInput.value = '';
    if (!file || busy) return;
    busy = true;
    $('c-msg').textContent = t('coral.importBusy');
    try {
      const b = await readBackup(file);
      const r = mergeSites(store.list(), b.log.sites);
      // Photos first, so the log never points at a photo this device lacks.
      let copied = 0;
      for (const id of r.newPhotoIds) {
        const blob = await b.photo(id);
        if (blob && (await putPhoto(id, blob))) copied++;
      }
      store.replaceAll(r.sites);
      say(t('coral.importDone', { a: r.added, m: r.merged, p: copied }));
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      say(`${t('coral.importFail')} ${t(/newer/.test(m) ? 'coral.importNewer' : /zip|backup/.test(m) ? 'coral.importNotBackup' : 'coral.importDamaged')}`);
    } finally {
      busy = false;
    }
  });
  // Ask the browser not to clear this storage under pressure (it may still if the user clears site data).
  const persist = () => void navigator.storage?.persist?.().catch(() => false);
  store.subscribe(remind);
  remind();

  $('c-list').addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li');
    const s = store.list().find((x) => x.id === li?.dataset.id);
    if (!li || !s) return;
    if ((e.target as HTMLElement).closest('.pin-x')) {
      if (!confirm(t('coral.removeSure'))) return;
      if (sel === s.id) sel = null;
      s.photos.forEach((p) => void deletePhoto(p.id));
      store.remove(s.id);
    } else if (sel === s.id) {
      sel = null;
      render();
    } else openSite(s.id);
  });

  // Photos: one hidden file input; several files at once go to the current target (site or visit).
  const fileInput = $<HTMLInputElement>('c-file');
  fileInput.addEventListener('change', async () => {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = '';
    const target = photoTarget;
    if (!target || !files.length) return;
    let failed = 0;
    let farKm = 0;
    for (const [k, file] of files.entries()) {
      $('c-msg').textContent = t('coral.photoSaving', { k: k + 1, n: files.length });
      const m = await meta(file);
      const s0 = store.list().find((x) => x.id === target.siteId);
      if (s0 && m.lat !== undefined && m.lng !== undefined) farKm = Math.max(farKm, kmBetween(s0.lng, s0.lat, m.lng, m.lat));
      const blob = await shrink(file);
      const pid = newId();
      if (!blob || !store.list().some((x) => x.id === target.siteId) || !(await putPhoto(pid, blob))) {
        failed++;
        continue;
      }
      const taken = m.takenAt ?? (file.lastModified || undefined);
      store.addPhoto(target.siteId, { id: pid, ...(target.visitId ? { visitId: target.visitId } : {}), ...(taken !== undefined ? { takenAt: taken } : {}) });
    }
    if (failed) say(t('coral.photoFail'));
    else if (farKm >= 1) say(t('coral.photoFar', { km: farKm.toFixed(1) }));
    else say(t('coral.photosAdded', { n: files.length }));
  });

  // Folder: edits save on change; the visit and mission forms are read when their button is pressed.
  detail.addEventListener('change', (e) => {
    if (!sel) return;
    const id = (e.target as HTMLElement).id;
    if (id === 'c-sp') store.update(sel, { species: (e.target as HTMLInputElement).value.trim() });
    if (id === 'c-notes') store.update(sel, { notes: (e.target as HTMLTextAreaElement).value.trim() });
  });
  detail.addEventListener('input', (e) => {
    const x = e.target as HTMLInputElement;
    if (x.dataset.m || DRAFTED.has(x.id)) draft[draftKey(x)] = x.value;
  });
  const toggle = (set: Set<ActionId>, btn: HTMLElement) => {
    const a = btn.dataset.act as ActionId;
    if (set.has(a)) set.delete(a);
    else set.add(a);
    btn.classList.toggle('on', set.has(a));
    btn.setAttribute('aria-pressed', String(set.has(a)));
  };
  detail.addEventListener('click', (e) => {
    const s = site();
    if (!s) return;
    const target = e.target as HTMLElement;
    const hit = <T extends HTMLElement = HTMLElement>(q: string) => target.closest<T>(q);
    let b: HTMLElement | null;
    if ((b = hit('[data-ftab]'))) {
      folderTab = b.dataset.ftab as FolderTab;
      render();
    } else if (hit('#c-move')) {
      void here().then((f) => {
        store.update(s.id, { lng: f.lng, lat: f.lat, locSource: f.gps ? 'gps' : 'centre', gpsAccuracyM: f.accuracy, ...depthFields(f.lng, f.lat) });
        map.easeTo({ center: [f.lng, f.lat], duration: 800 });
        say(f.gps ? t('coral.moved') : t('coral.movedCentre'));
      });
    } else if ((b = hit('[data-add-photo]'))) {
      photoTarget = { siteId: s.id, visitId: b.dataset.addPhoto || null };
      fileInput.click();
    } else if ((b = hit('.cf-thumb'))) {
      const box = b.closest<HTMLElement>('.coral-photos');
      void showPhoto(s.id, b.dataset.pid!, (box?.dataset.photos ?? '').split(',').filter(Boolean));
    } else if (hit('#c-st')) {
      vStatus = STATUSES[(STATUSES.indexOf(vStatus) + 1) % STATUSES.length];
      hit('#c-st')!.textContent = t(`coral.st.${vStatus}` as Key);
    } else if ((b = hit('.cf-vact'))) toggle(vActions, b);
    else if ((b = hit('.cf-mact'))) toggle(mActions, b);
    else if (hit('#c-unmission')) {
      vMission = null;
      render();
    } else if (hit('#c-visit')) {
      const raw: Record<string, number> = {};
      for (const inp of detail.querySelectorAll<HTMLInputElement>('[data-m]')) if (inp.value.trim() !== '') raw[inp.dataset.m!] = parseFloat(inp.value);
      const conditions = conditionsAt(s.lng, s.lat, s.depthM) ?? undefined;
      const team = detail.querySelector<HTMLInputElement>('#c-team')!.value.trim();
      const v = {
        t: Date.now(), status: vStatus, notes: detail.querySelector<HTMLTextAreaElement>('#c-vnotes')!.value.trim(), actions: [...vActions],
        ...cleanMeasures(raw), ...(team ? { team } : {}), ...(conditions ? { conditions } : {}),
      };
      const logged = vMission ? store.completeMission(s.id, vMission, v) : store.addVisit(s.id, v);
      vStatus = 'unknown';
      vActions = new Set();
      vMission = null;
      draft = Object.fromEntries(Object.entries(draft).filter(([k]) => !k.startsWith('m:') && k !== 'c-vnotes'));
      openVisit = logged?.id ?? null;
      render();
      say(t('coral.visitLogged'));
    } else if ((b = hit('[data-open-visit]'))) {
      openVisit = openVisit === b.dataset.openVisit ? null : b.dataset.openVisit!;
      render();
    } else if ((b = hit('[data-del-visit]'))) {
      if (!confirm(t('coral.deleteVisitSure'))) return;
      store.removeVisit(s.id, b.dataset.delVisit!);
    } else if (hit('#c-mplan')) {
      const when = dateInputMs(detail.querySelector<HTMLInputElement>('#c-mdate')!.value);
      const goal = detail.querySelector<HTMLInputElement>('#c-mgoal')!.value.trim();
      if (when === null || !goal) return say(t('coral.missionNeeds'));
      store.addMission(s.id, { t: when, goal, actions: [...mActions], notes: detail.querySelector<HTMLTextAreaElement>('#c-mnotes')!.value.trim() });
      mActions = new Set();
      draft = Object.fromEntries(Object.entries(draft).filter(([k]) => !k.startsWith('c-m')));
      say(t('coral.missionPlanned'));
    } else if ((b = hit('[data-start]'))) {
      const m = s.missions.find((x) => x.id === b!.dataset.start);
      if (!m) return;
      vMission = m.id;
      vActions = new Set(m.actions);
      folderTab = 'visits';
      render();
    } else if ((b = hit('[data-del-mission]'))) {
      if (confirm(t('coral.deleteMissionSure'))) store.removeMission(s.id, b.dataset.delMission!);
    } else if ((b = hit('[data-goto-visit]'))) {
      folderTab = 'visits';
      openVisit = b.dataset.gotoVisit!;
      render();
    }
  });

  // Tap a site's ring on the map: open its folder. After the click has closed other sheets (phone).
  map.on('click', `${CORAL_LOG_PREFIX}sites`, (e) => {
    const id = e.features?.[0]?.properties?.id;
    if (typeof id === 'string') setTimeout(() => openSite(id, 'overview', false), 0);
  });
  map.on('mouseenter', `${CORAL_LOG_PREFIX}sites`, () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', `${CORAL_LOG_PREFIX}sites`, () => (map.getCanvas().style.cursor = ''));

  store.subscribe(() => {
    render();
    if (viewing) {
      const s = store.list().find((x) => x.id === viewing!.siteId);
      if (!s?.photos.some((p) => p.id === viewing!.pid)) closeViewer();
    }
  });
  render();
  window.addEventListener('pagehide', () => store.flush());
  return { openSite };
}
