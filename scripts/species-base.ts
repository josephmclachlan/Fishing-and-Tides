/**
 * Writes the shared species base (src/species/base.gen.ts) from the species guide's published data:
 * `npm run data:base`. Reads public/data/guide/index.json and sp/<id>.json for every species the map models
 * (src/fishing/occurrence-taxa.ts). Safe to run any time: it only reads the guide and writes one file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { OCCURRENCE_TAXA } from '../src/fishing/occurrence-taxa.ts';
import { baseModule, buildBase } from '../src/species/build.ts';

const dir = 'public/data/guide';
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8')).entries;
const sp = (id: string) => {
  try {
    return JSON.parse(readFileSync(`${dir}/sp/${id}.json`, 'utf8'));
  } catch {
    return null;
  }
};
const base = buildBase(OCCURRENCE_TAXA, index, sp);
writeFileSync('src/species/base.gen.ts', baseModule(base));
const missing = Object.values(OCCURRENCE_TAXA).flat().filter((s) => !Object.values(base).some((r) => r.sci.toLowerCase() === s.toLowerCase()));
console.log(`species base: ${Object.keys(base).length} species${missing.length ? `; not in the guide: ${missing.join(', ')}` : ''}`);
