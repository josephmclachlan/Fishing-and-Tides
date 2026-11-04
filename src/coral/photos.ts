/**
 * Coral site photos: stored on this device only, in IndexedDB (localStorage is too small), as JPEGs
 * scaled to at most 1280 px on the long side. A photo belongs to a site through `CoralSite.photoIds`.
 * Every call resolves (null / false / empty) when IndexedDB is blocked, so the log still works.
 */
const DB = 'ft.coral.photos';
const STORE = 'photos';
export const MAX_PX = 1280;

/** Size to scale a w x h image to so its long side is at most `max`; never enlarges. Pure. */
export function fitSize(w: number, h: number, max = MAX_PX): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

const open = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

const run = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>, fallback: T): Promise<T> => {
  const db = await open();
  if (!db) return fallback;
  return new Promise((resolve) => {
    try {
      const r = f(db.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(fallback);
    } catch {
      resolve(fallback);
    }
  });
};

export const putPhoto = (id: string, blob: Blob): Promise<boolean> => run<IDBValidKey | null>('readwrite', (s) => s.put(blob, id) as IDBRequest<IDBValidKey | null>, null).then((k) => k !== null);
export const getPhoto = (id: string): Promise<Blob | null> => run<Blob | undefined>('readonly', (s) => s.get(id), undefined).then((b) => b ?? null);
export const deletePhoto = (id: string): Promise<unknown> => run('readwrite', (s) => s.delete(id), undefined);

/** Scale an image file down to a JPEG blob (EXIF orientation is applied by the browser). */
export async function shrink(file: Blob): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { w, h } = fitSize(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return await new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.82));
  } catch {
    return null;
  }
}
