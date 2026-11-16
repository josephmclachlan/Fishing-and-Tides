import { beforeAll, describe, expect, it } from 'vitest';
import guideIndex from '../../public/data/guide/index.json';
import genText from './base.gen.ts?raw';
import { OCCURRENCE_TAXA } from './kinds';
import { BASE } from './base.gen';
import { baseModule, buildBase, type GuideIndexRow, type GuideSpecies } from './build';

// The guide's species files, loaded only for the mapped species.
const files = import.meta.glob<GuideSpecies>('../../public/data/guide/sp/*.json', { import: 'default' });
const index = (guideIndex as { entries: GuideIndexRow[] }).entries;
const loaded = new Map<string, GuideSpecies>();
const sp = (id: string) => loaded.get(id) ?? null;
beforeAll(async () => {
  const scis = new Set(Object.values(OCCURRENCE_TAXA).flat().map((s) => s.toLowerCase()));
  for (const r of index.filter((r) => scis.has(r.sci.toLowerCase()))) {
    const load = files[`../../public/data/guide/sp/${r.id}.json`];
    if (load) loaded.set(r.id, await load());
  }
});

describe('shared species base', () => {
  it('matches the species guide (run `npm run data:base` after the guide changes)', () => {
    const built = buildBase(OCCURRENCE_TAXA, index, sp);
    expect(genText).toBe(baseModule(built));
    expect(BASE).toEqual(built);
  });
  it('has a row for every mapped species the guide covers', () => {
    const missing = Object.values(OCCURRENCE_TAXA).flat().filter((s) => !BASE[s]);
    expect(missing).toEqual(['Pterois miles']); // covered by the guide's Pterois volitans page
  });
  it('reads a sale ban at any weight as do not eat', () => {
    expect(buildBase({ x: ['A b'] }, [{ id: 'a-b', sci: 'A b' }], () => ({ eat: { risks: ['ciguatera'], ciguaSize: { basis: 'published' } } }))['A b'].size).toEqual({ basis: 'never' });
  });
});
