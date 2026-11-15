/**
 * Loading the SPECIES GUIDE's data (PLAN 7.91): the index of every species (one small file, fetched when the page
 * first opens) and one file per species (fetched when it is opened). Both are static files built from the research
 * (`npm run data:guide`) and kept by the service worker once read, so the guide works offline after a visit.
 */
import type { GuideIndex, Species } from './types';

export const guideDir = (base: string = import.meta.env.BASE_URL) => `${base}data/guide/`;

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

let index: Promise<GuideIndex> | null = null;
/** The index, fetched once (a failed fetch is tried again next time). */
export function loadIndex(base?: string): Promise<GuideIndex> {
  index ??= getJson<GuideIndex>(`${guideDir(base)}index.json`).catch((e) => {
    index = null;
    throw e;
  });
  return index;
}

const species = new Map<string, Promise<Species>>();
/** One species' full file, fetched once. */
export function loadSpecies(id: string, base?: string): Promise<Species> {
  let p = species.get(id);
  if (!p) {
    p = getJson<Species>(`${guideDir(base)}sp/${id}.json`).catch((e) => {
      species.delete(id);
      throw e;
    });
    species.set(id, p);
  }
  return p;
}
