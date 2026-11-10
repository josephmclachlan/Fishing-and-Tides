/**
 * Field log actions shared by the map's CORAL drawer (coral-panel.ts) and the CORAL page (coral-page/),
 * so both log a site, file photos, back up and import the same way. They touch the device (GPS, files,
 * IndexedDB) but no layout: each caller shows its own messages. Everything stays on this device.
 */
import { newId, type CoralSite, type CoralStore, type LocSource, type NewSite } from './store';
import { deletePhoto, getPhoto, putPhoto, shrink } from './photos';
import { EXIF_BYTES, readExif, type PhotoMeta } from './exif';
import { bestFix, doneWaiting, type Fix } from './gps';
import { buildBackup, mergeSites, readBackup } from './backup';
import { entryCount } from './store';
import { haversineM } from '../geo';
import { localDay } from './folder-view';
import type { Key } from '../i18n';

export interface HereFix {
  lng: number;
  lat: number;
  gps: boolean;
  accuracy?: number;
}

let fixing = false;
/**
 * Your position for a new or moved site: watches GPS and keeps the best fix until it is within GOOD_FIX_M
 * or FIX_TIMEOUT_MS passes, reporting the accuracy as it improves. No GPS or refused: `fallback` (the map centre).
 */
export const watchFix = (fallback: () => { lng: number; lat: number }, progress: (accuracyM: number | null) => void = () => {}): Promise<HereFix> =>
  new Promise((resolve) => {
    const centre = { ...fallback(), gps: false };
    if (!navigator.geolocation || fixing) return resolve(centre);
    fixing = true;
    const fixes: Fix[] = [];
    const started = Date.now();
    progress(null);
    let id = -1;
    const finish = () => {
      if (!fixing) return;
      fixing = false;
      navigator.geolocation.clearWatch(id);
      clearTimeout(timer);
      const best = bestFix(fixes);
      resolve(best ? { lng: best.lng, lat: best.lat, gps: true, accuracy: best.accuracy } : centre);
    };
    const timer = setTimeout(finish, 20_500);
    id = navigator.geolocation.watchPosition(
      (p) => {
        fixes.push({ lng: p.coords.longitude, lat: p.coords.latitude, accuracy: p.coords.accuracy, t: p.timestamp });
        const best = bestFix(fixes);
        if (best) progress(best.accuracy);
        if (doneWaiting(best, started, Date.now())) finish();
      },
      // Permission refused: stop. A momentary loss of signal or a slow fix: keep waiting until the timer.
      (err) => err.code === err.PERMISSION_DENIED && finish(),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });

/** A photo's EXIF time and place, or nothing. */
export const fileMeta = async (file: File): Promise<PhotoMeta> => {
  try {
    return readExif(await file.slice(0, EXIF_BYTES).arrayBuffer());
  } catch {
    return {};
  }
};

/** Site fields for a position: kind, name, where it came from, GPS accuracy and the chart depth when known. */
export function siteFields(kind: CoralSite['kind'], name: string, lng: number, lat: number, locSource: LocSource, accuracy?: number, depthAt?: ((lng: number, lat: number) => number | undefined) | null): NewSite {
  const d = depthAt?.(lng, lat);
  return { kind, name, lng, lat, locSource, ...(accuracy !== undefined && Number.isFinite(accuracy) ? { gpsAccuracyM: accuracy } : {}), ...(d !== undefined && d < 0 ? { depthM: Math.abs(d) } : {}) };
}

/** File photos into a site (or one of its visits), scaled down; how many failed and the farthest one taken from the site, km. */
export async function addPhotos(store: CoralStore, target: { siteId: string; visitId: string | null }, files: readonly File[], progress: (k: number, n: number) => void = () => {}) {
  let failed = 0;
  let farKm = 0;
  for (const [k, file] of files.entries()) {
    progress(k + 1, files.length);
    const m = await fileMeta(file);
    const s0 = store.list().find((x) => x.id === target.siteId);
    if (s0 && m.lat !== undefined && m.lng !== undefined) farKm = Math.max(farKm, haversineM([s0.lng, s0.lat], [m.lng, m.lat]) / 1000);
    const blob = await shrink(file);
    const pid = newId();
    if (!blob || !store.list().some((x) => x.id === target.siteId) || !(await putPhoto(pid, blob))) {
      failed++;
      continue;
    }
    const taken = m.takenAt ?? (file.lastModified || undefined);
    store.addPhoto(target.siteId, { id: pid, ...(target.visitId ? { visitId: target.visitId } : {}), ...(taken !== undefined ? { takenAt: taken } : {}) });
  }
  return { failed, farKm, added: files.length - failed };
}

/** NEW SITE FROM PHOTO: the photo's own GPS places the site and the photo is filed in it. */
export async function siteFromPhoto(store: CoralStore, file: File, make: (lng: number, lat: number, accuracy?: number) => NewSite): Promise<CoralSite | 'nogps' | 'fail'> {
  const m = await fileMeta(file);
  if (m.lat === undefined || m.lng === undefined) return 'nogps';
  const blob = await shrink(file);
  const pid = newId();
  if (!blob || !(await putPhoto(pid, blob))) return 'fail';
  const s = store.add(make(m.lng, m.lat, m.accuracyM));
  store.addPhoto(s.id, { id: pid, ...(m.takenAt !== undefined ? { takenAt: m.takenAt } : file.lastModified ? { takenAt: file.lastModified } : {}) });
  return s;
}

/** Remove a site and its photo files. */
export function removeSite(store: CoralStore, s: CoralSite) {
  s.photos.forEach((p) => void deletePhoto(p.id));
  store.remove(s.id);
}

/** Save text or a blob as a file. */
export function download(content: string | Blob, type: string, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(typeof content === 'string' ? new Blob([content], { type }) : content);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

// BACKUP / IMPORT (PLAN 7.41): one zip with the log and the photos, to move the log between phones.
const BACKED_KEY = 'ft.coral.backedUp';
export const REMIND_EVERY = 10;
/** Entries (sites, visits, photos, missions) at the last backup. */
export const backedUp = () => {
  try {
    return Number(localStorage.getItem(BACKED_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
};
/** New entries since the last backup, when that is enough to remind. */
export const backupDue = (sites: readonly CoralSite[]) => {
  const n = entryCount(sites) - backedUp();
  return n >= REMIND_EVERY ? n : 0;
};

/** Build and save the backup zip; throws when it cannot be built. */
export async function saveBackup(store: CoralStore, now = Date.now()) {
  const r = await buildBackup(store.list(), getPhoto);
  download(r.blob, 'application/zip', `coral-backup-${localDay(now)}.zip`);
  try {
    localStorage.setItem(BACKED_KEY, String(entryCount(store.list())));
  } catch {
    /* reminder only */
  }
  return { photos: r.photos, missing: r.missing };
}

/** Merge a backup zip into the log (photos first, so the log never points at a photo this device lacks). */
export async function importBackup(store: CoralStore, file: Blob) {
  const b = await readBackup(file);
  const r = mergeSites(store.list(), b.log.sites);
  let copied = 0;
  for (const id of r.newPhotoIds) {
    const blob = await b.photo(id);
    if (blob && (await putPhoto(id, blob))) copied++;
  }
  store.replaceAll(r.sites);
  return { added: r.added, merged: r.merged, photos: copied };
}

/** The message key for a failed import. */
export const importErrorKey = (err: unknown): Key => {
  const m = err instanceof Error ? err.message : '';
  return /newer/.test(m) ? 'coral.importNewer' : /zip|backup/.test(m) ? 'coral.importNotBackup' : 'coral.importDamaged';
};

/** Ask the browser not to clear this storage under pressure (it may still if the user clears site data). */
export const persist = () => void navigator.storage?.persist?.().catch(() => false);
