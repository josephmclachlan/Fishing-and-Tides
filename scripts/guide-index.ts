/**
 * Builds the SPECIES GUIDE's data (PLAN 7.91) from the research: `npm run data:guide [-- <research folder>]`.
 *
 * Reads <folder>/research/out/<id>.json (one researched species per file, see docs/GUIDE.md) and the photo set
 * <folder>/photos/photos.json + photos/img/<id>.webp, then writes
 *   public/data/guide/sp/<id>.json   one species with its photos (fetched when the species is opened)
 *   public/data/guide/img/<id>.webp  its 240 x 180 list thumbnail
 *   public/data/guide/index.json     one compact row per species for the list, filters and search
 * Species marked `drop` (Pacific, freshwater, fossil, synonyms) are left out; files that do not parse or do not
 * name a known group are reported and skipped. Files no longer in the research are removed.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';

// Node runs TypeScript but not the app's extensionless imports ('./types'): try them again with '.ts'.
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
  try { return await next(s, c); } catch (e) {
    if (/^\\.{1,2}\\//.test(s) && !/\\.[a-z]+$/i.test(s)) return next(s + '.ts', c);
    throw e;
  }
}`),
);
const { buildIndex } = await import('../src/guide/index-build.ts');
const { isGroup } = await import('../src/guide/types.ts');
type Species = import('../src/guide/types.ts').Species;
type Photo = import('../src/guide/types.ts').Photo;

const SRC = process.argv[2] ?? process.env.GUIDE_SRC ?? '/mnt/project-files/species-guide';
const OUT = join(import.meta.dirname, '..', 'public', 'data', 'guide');
const ID = /^[a-z0-9-]{1,80}$/;

const outDir = join(SRC, 'research', 'out');
if (!existsSync(outDir)) {
  console.error(`No research at ${outDir}. Pass the species-guide folder: npm run data:guide -- <folder>`);
  process.exit(1);
}
let photos: Record<string, Photo[]> = {};
const photoFile = join(SRC, 'photos', 'photos.json');
if (existsSync(photoFile)) photos = (JSON.parse(readFileSync(photoFile, 'utf8')) as { photos: Record<string, Photo[]> }).photos ?? {};

const list: Species[] = [];
const problems: string[] = [];
let dropped = 0;
for (const f of readdirSync(outDir).filter((n) => n.endsWith('.json')).sort()) {
  const id = f.slice(0, -5);
  let s: Species;
  try {
    s = JSON.parse(readFileSync(join(outDir, f), 'utf8')) as Species;
  } catch (e) {
    problems.push(`${f}: ${(e as Error).message}`);
    continue;
  }
  if (s.tier === 'drop') {
    dropped++;
    continue;
  }
  if (!ID.test(id) || s.id !== id) problems.push(`${f}: id "${s.id}" does not match the file name`);
  else if (s.tier !== 'full' && s.tier !== 'list') problems.push(`${f}: tier "${s.tier}"`);
  else if (!isGroup(s.group)) problems.push(`${f}: group "${s.group}"`);
  else if (!s.sci?.trim()) problems.push(`${f}: no Latin name`);
  else {
    const ph = photos[id]?.filter((p) => p.src && p.page && p.by && p.lic && !/\bND\b/i.test(p.lic));
    list.push(ph?.length ? { ...s, photos: ph } : { ...s, photos: undefined });
  }
}

// Two files for one species (a synonym researched twice) would show it twice: keep the fuller one.
const bySci = new Map<string, Species>();
for (const s of list) {
  const k = s.sci.trim().toLowerCase();
  const was = bySci.get(k);
  if (!was) bySci.set(k, s);
  else {
    const keep = (s.tier === 'full' ? 1 : 0) - (was.tier === 'full' ? 1 : 0) || JSON.stringify(s).length - JSON.stringify(was).length;
    problems.push(`${s.id} and ${was.id} are both ${s.sci}: kept ${keep > 0 ? s.id : was.id}`);
    if (keep > 0) bySci.set(k, s);
  }
}
const kept = [...bySci.values()];

mkdirSync(join(OUT, 'sp'), { recursive: true });
mkdirSync(join(OUT, 'img'), { recursive: true });
const ids = new Set(kept.map((s) => s.id));
const thumbs = new Set<string>();
for (const s of kept) {
  writeFileSync(join(OUT, 'sp', `${s.id}.json`), JSON.stringify(s));
  const from = join(SRC, 'photos', 'img', `${s.id}.webp`);
  if (s.photos?.length && existsSync(from)) {
    const to = join(OUT, 'img', `${s.id}.webp`);
    if (!existsSync(to) || statSync(to).size !== statSync(from).size) copyFileSync(from, to);
    thumbs.add(s.id);
  }
}
let removed = 0;
for (const f of readdirSync(join(OUT, 'sp'))) if (!ids.has(f.replace(/\.json$/, ''))) unlinkSync(join(OUT, 'sp', f)), removed++;
for (const f of readdirSync(join(OUT, 'img'))) if (!thumbs.has(f.replace(/\.webp$/, ''))) unlinkSync(join(OUT, 'img', f)), removed++;

const index = buildIndex(kept, Date.now(), (id) => (thumbs.has(id) ? `data/guide/img/${id}.webp` : undefined));
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index));

const full = kept.filter((s) => s.tier === 'full').length;
console.log(
  `guide: ${kept.length} species (${full} full, ${kept.length - full} also recorded), ${thumbs.size} with photos, ${dropped} dropped, ${removed} stale files removed; ` +
    `index ${(statSync(join(OUT, 'index.json')).size / 1024).toFixed(0)} KB`,
);
if (problems.length) console.warn(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
