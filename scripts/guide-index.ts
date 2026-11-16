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
const { isGroup, RECS, CLEANS, COLORS, PATTERNS, POSITIONS, SHAPES, FEATURES } = await import('../src/guide/types.ts');
const { guessLook } = await import('../src/guide/identify.ts');
const { citeText } = await import('../src/guide/cite.ts');
type Src = import('../src/guide/cite.ts').Src;
type Species = import('../src/guide/types.ts').Species;
type Photo = import('../src/guide/types.ts').Photo;
type Look = import('../src/guide/types.ts').Look;
type CiguaSize = import('../src/guide/types.ts').CiguaSize;
type CleanKey = import('../src/guide/types.ts').CleanKey;

/** A researcher's description of its looks (research/look/<id>.json), with any unknown word dropped. */
function readLook(id: string): Look | undefined {
  const f = join(SRC, 'research', 'look', `${id}.json`);
  if (!existsSync(f)) return undefined;
  try {
    const l = JSON.parse(readFileSync(f, 'utf8')) as Look;
    const only = <T extends string>(v: unknown, ok: readonly T[]) => (Array.isArray(v) ? v.filter((x): x is T => ok.includes(x as T)) : []);
    const look: Look = { colors: only(l.colors, COLORS), pattern: only(l.pattern, PATTERNS), position: only(l.position, POSITIONS) };
    const jc = only(l.juvColors, COLORS), jp = only(l.juvPattern, PATTERNS);
    if (jc.length) look.juvColors = jc;
    if (jp.length) look.juvPattern = jp;
    const sh = only(l.shape, SHAPES), ft = only(l.features, FEATURES);
    if (sh.length) look.shape = sh;
    if (ft.length) look.features = ft;
    if (l.marks?.en?.trim()) look.marks = { en: l.marks.en.trim(), es: l.marks.es?.trim() || l.marks.en.trim() };
    return look.colors.length || look.position.length ? look : undefined;
  } catch {
    return undefined;
  }
}

/** The edibility recheck (research/edible/out/<id>.json): only its food and safety fields, laid over the species. */
const EDIBLE_FIELDS = ['edible', 'edibleNote', 'edibleScope', 'eat', 'danger', 'sources', 'check'] as const;
function readEdible(id: string): Partial<Species> | undefined {
  const f = join(SRC, 'research', 'edible', 'out', `${id}.json`);
  if (!existsSync(f)) return undefined;
  try {
    const r = JSON.parse(readFileSync(f, 'utf8')) as Partial<Species>;
    const out: Record<string, unknown> = {};
    for (const k of EDIBLE_FIELDS) if (r[k] !== undefined && r[k] !== null) out[k] = r[k];
    return out as Partial<Species>;
  } catch {
    problems.push(`edible/out/${id}.json does not parse`);
    return undefined;
  }
}

/** Ciguatera size advice (research/cigua-size/out/<id>.json): kept only with a known basis and advice in both languages. */
function readCiguaSize(id: string): CiguaSize | undefined {
  const f = join(SRC, 'research', 'cigua-size', 'out', `${id}.json`);
  if (!existsSync(f)) return undefined;
  try {
    const r = JSON.parse(readFileSync(f, 'utf8')) as CiguaSize;
    if (!['published', 'estimate', 'none'].includes(r.basis) || !r.advice?.en?.trim() || !r.advice?.es?.trim()) throw new Error('basis or advice');
    const num = (v: unknown) => (typeof v === 'number' && v > 0 && v < 1000 ? v : undefined);
    return {
      basis: r.basis,
      maxKg: r.basis === 'none' ? undefined : num(r.maxKg),
      maxCm: r.basis === 'none' ? undefined : num(r.maxCm),
      advice: { en: r.advice.en.trim(), es: r.advice.es.trim() },
      sources: Array.isArray(r.sources) && r.sources.length ? r.sources.map(String) : undefined,
    };
  } catch (e) {
    problems.push(`cigua-size/out/${id}.json: ${(e as Error).message}`);
    return undefined;
  }
}

/**
 * Sources in brackets become superscript markers (src/guide/cite.ts, Joseph 2026-11-16): every en/es text and the
 * local-record note, with the ciguatera size advice's own sources added to the species' list.
 */
const SKIP = new Set(['id', 'sci', 'author', 'names', 'sources', 'evidence', 'photos', 'taxon', 'familyName']);
function cite(s: Species) {
  const list: Src[] = (s.sources ?? []).map((x) => ({ ...x }));
  const cz = s.eat?.ciguaSize;
  if (cz?.sources?.length) {
    const ks = cz.sources.map((t) => {
      let k = list.findIndex((x) => x.t === t);
      if (k < 0) k = list.push({ t }) - 1;
      return `[^${k + 1}]`;
    }).join('');
    cz.advice = { en: cz.advice.en.replace(/\.?$/, ks + '.'), es: cz.advice.es.replace(/\.?$/, ks + '.') };
    delete cz.sources;
  }
  const walk = (o: unknown): unknown => {
    if (typeof o === 'string') return citeText(o, list);
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) if (!SKIP.has(k)) (o as Record<string, unknown>)[k] = walk(v);
    }
    return o;
  };
  for (const [k, v] of Object.entries(s)) if (!SKIP.has(k)) (s as Record<string, unknown>)[k] = walk(v);
  if (list.length) s.sources = list;
}

/**
 * Fun facts (research/facts/out/<id>.json): each with its own sources, added to the species' list and marked at the end
 * of the sentence so they are numbered with the rest of the tab. Kept only with text in both languages and a source.
 */
function readFacts(id: string, s: Species) {
  const f = join(SRC, 'research', 'facts', 'out', `${id}.json`);
  if (!existsSync(f)) return;
  try {
    const r = JSON.parse(readFileSync(f, 'utf8')) as { facts?: { kind?: string; en?: string; es?: string; src?: { t?: string; u?: string }[] }[] };
    const out: Species['facts'] = [];
    for (const x of r.facts ?? []) {
      const src = (x.src ?? []).filter((y) => y?.t?.trim() && /^https?:\/\//.test(y.u ?? ''));
      if (!x.en?.trim() || !x.es?.trim() || !src.length) continue;
      s.sources ??= [];
      const ks = src
        .map((y) => {
          let k = s.sources!.findIndex((z) => z.u === y.u || z.t === y.t);
          if (k < 0) k = s.sources!.push({ t: y.t!.trim(), u: y.u }) - 1;
          return `[^${k + 1}]`;
        })
        .join('');
      const mark = (t: string) => t.trim().replace(/\.?$/, ks + '.');
      out!.push({ kind: x.kind === 'name' ? 'name' : 'fact', text: { en: mark(x.en), es: mark(x.es) } });
    }
    // The name first, then the rest in the researcher's order.
    if (out!.length) s.facts = [...out!.filter((x) => x.kind === 'name'), ...out!.filter((x) => x.kind !== 'name')];
  } catch {
    problems.push(`facts/out/${id}.json does not parse`);
  }
}

/** Cleaning drawings that do not fit a species (research/clean-fix.json): a key swaps it, "none" keeps only its own steps. */
function readCleanFix(): Record<string, string> {
  const f = join(SRC, 'research', 'clean-fix.json');
  try {
    return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>) : {};
  } catch {
    problems.push('clean-fix.json does not parse');
    return {};
  }
}

const SRC = process.argv[2] ?? process.env.GUIDE_SRC ?? '/mnt/project-files/species-guide';
const OUT = join(import.meta.dirname, '..', 'public', 'data', 'guide');
const ID = /^[a-z0-9-]{1,80}$/;

const outDir = join(SRC, 'research', 'out');
if (!existsSync(outDir)) {
  console.error(`No research at ${outDir}. Pass the species-guide folder: npm run data:guide -- <folder>`);
  process.exit(1);
}
let photos: Record<string, Photo[]> = {};
let photoFix: Record<string, { src: string; big?: string | null; w: number; h: number }> = {};
try {
  const pff = join(SRC, 'photos', 'photo-fix.json');
  if (existsSync(pff)) photoFix = JSON.parse(readFileSync(pff, 'utf8'));
} catch {
  console.warn('photos/photo-fix.json does not parse');
}
const photoFile = join(SRC, 'photos', 'photos.json');
if (existsSync(photoFile)) photos = (JSON.parse(readFileSync(photoFile, 'utf8')) as { photos: Record<string, Photo[]> }).photos ?? {};

const list: Species[] = [];
const problems: string[] = [];
let dropped = 0;
let guessed = 0;
let recheck = 0;
const cleanFix = readCleanFix();
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
  const edited = readEdible(id);
  if (edited) {
    Object.assign(s, edited);
    recheck++;
  }
  const fix = cleanFix[id];
  if (fix && s.eat) {
    if (fix === 'none') delete s.eat.clean;
    else if ((CLEANS as readonly string[]).includes(fix)) s.eat.clean = fix as CleanKey;
    else problems.push(`clean-fix: unknown drawing "${fix}" for ${id}`);
  }
  const csz = readCiguaSize(id);
  if (csz) s.eat = { ...s.eat, ciguaSize: csz };
  if (!ID.test(id) || s.id !== id) problems.push(`${f}: id "${s.id}" does not match the file name`);
  else if (s.tier !== 'full' && s.tier !== 'list') problems.push(`${f}: tier "${s.tier}"`);
  else if (!isGroup(s.group)) problems.push(`${f}: group "${s.group}"`);
  else if (!s.sci?.trim()) problems.push(`${f}: no Latin name`);
  else {
    const ph = photos[id]
      ?.filter((p) => p.src && p.page && p.by && p.lic && !/\bND\b/i.test(p.lic))
      // Wikimedia serves only its standard thumbnail widths; 1024 px answers 400, so phones with sharp screens got a
      // broken photo (Joseph 2026-11-16). 960 is the nearest standard width. Tracking parameters are dropped.
      .map((p) => {
        const fix = (u?: string) => (u && /wikimedia\.org\//.test(u) ? u.replace(/\?utm_[^#]*$/, '').replace(/\/1024px-/, '/960px-') : u);
        // Full-size Wikimedia files are throttled for hotlinking (429): photos/photo-fix.json maps each to a standard thumbnail.
        const pf = photoFix[p.src];
        if (pf) return { ...p, src: pf.src, big: pf.big ?? undefined, w: pf.w, h: pf.h };
        return { ...p, src: fix(p.src)!, big: fix(p.big) };
      });
    const lf = join(SRC, 'research', 'local', `${id}.json`);
    if (existsSync(lf)) {
      try {
        const l = JSON.parse(readFileSync(lf, 'utf8')) as { rec?: string; why?: string; check?: boolean; src?: { t: string; u?: string } };
        if (RECS.includes(l.rec as never)) {
          let why = l.why?.trim() || undefined;
          // A record with its own source (the orca's sightings catalogue): add it to the list and mark the note.
          if (why && l.src?.t) {
            s.sources = [...(s.sources ?? []), { t: l.src.t, u: l.src.u }];
            why = why.replace(/\.?$/, `[^${s.sources.length}].`);
          }
          Object.assign(s, { rec: l.rec, recWhy: why, recCheck: l.check || undefined });
        }
      } catch {
        problems.push(`local/${id}.json does not parse`);
      }
    }
    const look = readLook(id) ?? guessLook(s.idTips?.en ?? '', s.habitats, s.group);
    if (look?.guessed) guessed++;
    readFacts(id, s);
    const sp: Species = { ...s, photos: ph?.length ? ph : undefined, look };
    cite(sp);
    list.push(sp);
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
  `guide: ${kept.length} species (${full} full, ${kept.length - full} also recorded), ${thumbs.size} with photos, ${dropped} dropped, ${guessed} looks guessed from text, ${recheck} edibility rechecks, ${removed} stale files removed; ` +
    `index ${(statSync(join(OUT, 'index.json')).size / 1024).toFixed(0)} KB`,
);
if (problems.length) console.warn(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
