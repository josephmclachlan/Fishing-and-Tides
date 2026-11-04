/**
 * CORAL drawer: log wild reef sites, nurseries and outplant gardens, keep notes and dated visits,
 * export GeoJSON or CSV. Private and on this device (see src/coral/store.ts). Phone: a sheet.
 */
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { closeButton, type Sheets } from './sheets';
import { newId, SITE_KINDS, STATUSES, type CoralStatus, type CoralStore, type SiteKind } from './coral/store';
import { toCSV, toGeoJSON } from './coral/export';
import { deletePhoto, getPhoto, putPhoto, shrink } from './coral/photos';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function mountCoralPanel(root: HTMLElement, map: Map, store: CoralStore, sheets: Sheets, depthAt: () => ((lng: number, lat: number) => number | undefined) | null) {
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
      <button type="button" class="tab" id="c-geo">${t('coral.exportGeo')}</button>
      <button type="button" class="tab" id="c-csv">${t('coral.exportCsv')}</button>
    </div>
    <div class="seek-msg" id="c-msg" role="status"></div>
    <ul class="boat-pins" id="c-list"></ul>
    <div id="c-detail"></div>
    <p class="rules-advice">${t('coral.note')}</p>`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('coral')));
  root.appendChild(el);

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
  let vStatus: CoralStatus = 'unknown';
  const say = (m: string) => {
    $('c-msg').textContent = m;
    setTimeout(() => $('c-msg').textContent === m && ($('c-msg').textContent = ''), 3000);
  };

  function render() {
    const sites = store.list();
    $('c-n').textContent = String(sites.length);
    $('c-kind').textContent = t(`coral.kind.${kind}` as Key);
    $('c-list').innerHTML = [...sites]
      .reverse()
      .map((s) => `<li data-id="${s.id}"><button type="button" class="tab pin-go${s.id === sel ? ' on' : ''}">${esc(s.name || t('coral.unnamed'))} · ${t(`coral.kind.${s.kind}` as Key)}</button><button type="button" class="tab pin-x" aria-label="${t('coral.remove')}">✕</button></li>`)
      .join('');
    const s = sites.find((x) => x.id === sel);
    if (!s) {
      sel = null;
      $('c-detail').innerHTML = '';
      return;
    }
    const last = s.visits[s.visits.length - 1];
    $('c-detail').innerHTML = `
      <div class="ro"><span class="lbl">${t('coral.depth')}</span><span class="seg sm">${s.depthM !== undefined ? `${Math.round(s.depthM)} ${t('unit.m')}` : '--'}</span></div>
      <div class="ro"><span class="lbl">${t('coral.last')}</span><span class="seg sm ${last?.status === 'healthy' ? 'green' : last && last.status !== 'unknown' ? 'red' : ''}">${last ? `${day(last.t)} ${t(`coral.st.${last.status}` as Key)}` : '--'}</span></div>
      <input id="c-sp" type="text" maxlength="120" value="${esc(s.species)}" placeholder="${t('coral.species')}" aria-label="${t('coral.species')}">
      <textarea id="c-notes" rows="3" maxlength="2000" placeholder="${t('coral.notes')}" aria-label="${t('coral.notes')}">${esc(s.notes)}</textarea>
      <div class="boat-btns"><button type="button" class="tab" id="c-move">${t('coral.move')}</button>
        <button type="button" class="tab" id="c-photo">${t('coral.photo')}</button>
        <input id="c-file" type="file" accept="image/*" hidden></div>
      <div class="coral-photos" id="c-photos"></div>
      <div class="boat-btns"><button type="button" class="tab" id="c-st">${t(`coral.st.${vStatus}` as Key)}</button>
        <input id="c-bl" type="number" min="0" max="100" inputmode="numeric" placeholder="${t('coral.bleach')}" aria-label="${t('coral.bleach')}">
        <button type="button" class="tab" id="c-visit">${t('coral.visit')}</button></div>
      <textarea id="c-vnotes" rows="2" maxlength="1000" placeholder="${t('coral.visitNotes')}" aria-label="${t('coral.visitNotes')}"></textarea>
      <ul class="boat-pins" id="c-visits">${[...s.visits].reverse().map((v) => `<li data-vid="${v.id}"><span class="tab pin-go">${day(v.t)} ${t(`coral.st.${v.status}` as Key)}${v.bleachPct !== undefined ? ` ${v.bleachPct}%` : ''}${v.notes ? ` · ${esc(v.notes)}` : ''}</span><button type="button" class="tab pin-x" aria-label="${t('coral.remove')}">✕</button></li>`).join('')}</ul>`;
    void showPhotos(s.photoIds, s.id);
  }

  const urls: string[] = [];
  async function showPhotos(ids: readonly string[], siteId: string) {
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    const box = detail.querySelector<HTMLElement>('#c-photos');
    if (!box) return;
    const parts: string[] = [];
    for (const id of ids) {
      const b = await getPhoto(id);
      if (sel !== siteId) return;
      if (!b) continue;
      const u = URL.createObjectURL(b);
      urls.push(u);
      parts.push(`<img src="${u}" data-pid="${id}" alt="${t('coral.photoAlt')}">`);
    }
    box.innerHTML = parts.join('');
  }

  const here = (): Promise<{ lng: number; lat: number; gps: boolean }> =>
    new Promise((resolve) => {
      const c = map.getCenter();
      const centre = { lng: c.lng, lat: c.lat, gps: false };
      if (!navigator.geolocation) return resolve(centre);
      navigator.geolocation.getCurrentPosition((p) => resolve({ lng: p.coords.longitude, lat: p.coords.latitude, gps: true }), () => resolve(centre), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 });
    });

  $('c-kind').addEventListener('click', () => ((kind = SITE_KINDS[(SITE_KINDS.indexOf(kind) + 1) % SITE_KINDS.length]), render()));
  $('c-add').addEventListener('click', async () => {
    const f = await here();
    const name = $<HTMLInputElement>('c-name').value.trim();
    const d = depthAt()?.(f.lng, f.lat);
    const s = store.add({ kind, name, lng: f.lng, lat: f.lat, ...(d !== undefined && d < 0 ? { depthM: Math.abs(d) } : {}) });
    $<HTMLInputElement>('c-name').value = '';
    sel = s.id;
    if (!f.gps) say(t('coral.atCentre'));
    render();
  });
  const download = (text: string, type: string, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  $('c-geo').addEventListener('click', () => (store.list().length ? download(JSON.stringify(toGeoJSON(store.list()), null, 1), 'application/geo+json', `coral-sites-${day(Date.now())}.geojson`) : say(t('coral.exportEmpty'))));
  $('c-csv').addEventListener('click', () => (store.list().length ? download(toCSV(store.list()), 'text/csv', `coral-sites-${day(Date.now())}.csv`) : say(t('coral.exportEmpty'))));

  $('c-list').addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li');
    const s = store.list().find((x) => x.id === li?.dataset.id);
    if (!li || !s) return;
    if ((e.target as HTMLElement).closest('.pin-x')) {
      if (!confirm(t('coral.removeSure'))) return;
      if (sel === s.id) sel = null;
      s.photoIds.forEach((p) => void deletePhoto(p));
      store.remove(s.id);
    } else {
      sel = sel === s.id ? null : s.id;
      if (sel) map.easeTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 13), duration: 1200 });
      render();
    }
  });
  // Detail: edits save on change; the visit form is read at LOG VISIT.
  detail.addEventListener('change', async (e) => {
    if (!sel) return;
    const id = (e.target as HTMLElement).id;
    if (id === 'c-file') {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      const siteId = sel;
      input.value = '';
      const blob = file && (await shrink(file));
      const cur = store.list().find((x) => x.id === siteId);
      if (!blob || !cur) return say(t('coral.photoFail'));
      const pid = newId();
      if (!(await putPhoto(pid, blob))) return say(t('coral.photoFail'));
      store.update(siteId, { photoIds: [...cur.photoIds, pid] });
      return;
    }
    if (id === 'c-sp') store.update(sel, { species: (e.target as HTMLInputElement).value.trim() });
    if (id === 'c-notes') store.update(sel, { notes: (e.target as HTMLTextAreaElement).value.trim() });
  });
  detail.addEventListener('click', (e) => {
    if (!sel) return;
    const target = e.target as HTMLElement;
    if (target.closest('#c-move')) {
      void here().then((f) => {
        const d = depthAt()?.(f.lng, f.lat);
        store.update(sel!, { lng: f.lng, lat: f.lat, ...(d !== undefined && d < 0 ? { depthM: Math.abs(d) } : {}) });
        map.easeTo({ center: [f.lng, f.lat], duration: 800 });
        say(f.gps ? t('coral.moved') : t('coral.movedCentre'));
      });
    } else if (target.closest('#c-photo')) {
      detail.querySelector<HTMLInputElement>('#c-file')!.click();
    } else if (target.closest('#c-photos img')) {
      const pid = (target as HTMLElement).dataset.pid!;
      const cur = store.list().find((x) => x.id === sel);
      if (cur && confirm(t('coral.photoRemoveSure'))) {
        void deletePhoto(pid);
        store.update(sel, { photoIds: cur.photoIds.filter((x) => x !== pid) });
      }
    } else if (target.closest('#c-st')) {
      vStatus = STATUSES[(STATUSES.indexOf(vStatus) + 1) % STATUSES.length];
      target.closest('#c-st')!.textContent = t(`coral.st.${vStatus}` as Key);
    } else if (target.closest('#c-visit')) {
      const bl = parseFloat(detail.querySelector<HTMLInputElement>('#c-bl')!.value);
      store.addVisit(sel, { t: Date.now(), status: vStatus, ...(Number.isFinite(bl) ? { bleachPct: Math.min(100, Math.max(0, Math.round(bl))) } : {}), notes: detail.querySelector<HTMLTextAreaElement>('#c-vnotes')!.value.trim() });
      vStatus = 'unknown';
    } else if (target.closest('#c-visits .pin-x')) {
      store.removeVisit(sel, target.closest<HTMLElement>('li')!.dataset.vid!);
    }
  });

  store.subscribe(render);
  render();
  window.addEventListener('pagehide', () => store.flush());
}
