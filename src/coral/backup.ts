/**
 * Coral log BACKUP and IMPORT (PLAN 7.41): one .zip with `coral-log.json` (every site, visit, mission
 * and photo record) and the photos as JPEGs in a folder per site, so the file is also browsable with
 * any unzip tool. It moves the log between phones until the private database exists. Import merges
 * by id, so importing the same backup twice changes nothing. The file holds private site positions:
 * keep it off public places.
 */
import { upgradeSite, type CoralSite, type Mission, type Photo, type Visit } from './store';
import { localDay } from './folder-view';
import { unzipBlob, zipParts, type ZipIn } from './zip';

export const BACKUP_FORMAT = 'fishing-and-tides/coral-backup';
export const BACKUP_VERSION = 1;
export const LOG_NAME = 'coral-log.json';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  sites: CoralSite[];
  /** Photo id → path of its JPEG in the zip. */
  photoFiles: Record<string, string>;
}

/** A folder name from a site name: letters, digits and dashes, never empty. */
export const folderName = (s: CoralSite) => `${(s.name || 'site').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'site'}-${s.id.slice(0, 8)}`;

/** Build the zip. `getPhoto` returns a photo's JPEG or null when it is missing on this device. */
export async function buildBackup(sites: readonly CoralSite[], getPhoto: (id: string) => Promise<Blob | null>, now = Date.now()): Promise<{ blob: Blob; photos: number; missing: number }> {
  const entries: ZipIn[] = [];
  const photoFiles: Record<string, string> = {};
  let missing = 0;
  for (const s of sites) {
    for (const p of s.photos) {
      const b = await getPhoto(p.id);
      if (!b) {
        missing++;
        continue;
      }
      const path = `photos/${folderName(s)}/${localDay(p.takenAt ?? p.addedAt)}-${p.id.slice(0, 8)}.jpg`;
      photoFiles[p.id] = path;
      entries.push({ name: path, data: new Uint8Array(await b.arrayBuffer()), t: p.takenAt ?? p.addedAt });
    }
  }
  const file: BackupFile = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), sites: [...sites], photoFiles };
  entries.unshift({ name: LOG_NAME, data: new TextEncoder().encode(JSON.stringify(file)), t: now });
  return { blob: new Blob(zipParts(entries) as BlobPart[], { type: 'application/zip' }), photos: Object.keys(photoFiles).length, missing };
}

const byId = <T extends { id: string }>(a: readonly T[], b: readonly T[], pick: (x: T, y: T) => T) => {
  const m = new Map(a.map((x) => [x.id, x]));
  for (const y of b) m.set(y.id, m.has(y.id) ? pick(m.get(y.id)!, y) : y);
  return [...m.values()];
};

/**
 * One site from two copies: the newer copy's own fields (name, position, notes…), and the union of
 * visits, photos and missions by id, the newer copy winning where both have one. Deletions are not
 * carried (a visit deleted on one phone comes back from the other's backup). Pure.
 */
export function mergeSite(a: CoralSite, b: CoralSite): CoralSite {
  const [older, newer] = a.updatedAt >= b.updatedAt ? [b, a] : [a, b];
  const take = <T>(x: T, y: T) => (newer === a ? x : y);
  // Sorted with an id tie-break, so merging A into B gives the same as B into A.
  const order = <T extends { id: string }>(k: (x: T) => number) => (x: T, y: T) => k(x) - k(y) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const visits = byId<Visit>(a.visits, b.visits, take).sort(order((x) => x.t));
  const photos = byId<Photo>(a.photos, b.photos, take).sort(order((x) => x.addedAt));
  const missions = byId<Mission>(a.missions, b.missions, (x, y) => (x.updatedAt >= y.updatedAt ? x : y)).sort(order((x) => x.t));
  return { ...older, ...newer, visits, photos, missions, updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}

export interface MergeResult {
  sites: CoralSite[];
  added: number;
  merged: number;
  /** Photo ids in the incoming sites that this device does not list yet. */
  newPhotoIds: string[];
}

/** Merge incoming sites into the local list by id. Pure. */
export function mergeSites(local: readonly CoralSite[], incoming: readonly unknown[]): MergeResult {
  const out = new Map(local.map((s) => [s.id, s]));
  const known = new Set(local.flatMap((s) => s.photos.map((p) => p.id)));
  let added = 0, merged = 0;
  for (const raw of incoming) {
    const s = upgradeSite(raw);
    if (!s) continue;
    const cur = out.get(s.id);
    if (cur) {
      out.set(s.id, mergeSite(cur, s));
      merged++;
    } else {
      out.set(s.id, s);
      added++;
    }
  }
  const newPhotoIds = [...out.values()].flatMap((s) => s.photos.map((p) => p.id)).filter((id) => !known.has(id));
  return { sites: [...out.values()], added, merged, newPhotoIds };
}

/** Open a backup zip: its log and a way to read each photo. Throws with a short reason on a bad file. */
export async function readBackup(file: Blob): Promise<{ log: BackupFile; photo: (id: string) => Promise<Blob | null> }> {
  const entries = await unzipBlob(file);
  const logEntry = entries.find((e) => e.name === LOG_NAME);
  if (!logEntry) throw new Error('not a coral backup');
  const log = JSON.parse(new TextDecoder().decode(await logEntry.bytes())) as BackupFile;
  if (log.format !== BACKUP_FORMAT || !Array.isArray(log.sites)) throw new Error('not a coral backup');
  if (log.version > BACKUP_VERSION) throw new Error('made by a newer version of the app');
  const byName = new Map(entries.map((e) => [e.name, e]));
  return {
    log,
    photo: async (id) => {
      const e = byName.get(log.photoFiles?.[id] ?? '');
      if (!e) return null;
      try {
        return new Blob([(await e.bytes()) as BlobPart], { type: 'image/jpeg' });
      } catch {
        return null;
      }
    },
  };
}
