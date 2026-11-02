import { describe, expect, it } from 'vitest';
import { en } from './i18n/en';
import { es } from './i18n/es';
import { HELP_BY_ID, helpKey } from './explain';
import { CELLS, MODES, nextMode } from './glance';

const files = import.meta.glob(['./*.ts', '!./*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const source = Object.values(files).join('\n');

describe('explainers', () => {
  it('has English and Spanish text for every explainer', () => {
    for (const id of new Set(Object.values(HELP_BY_ID))) {
      expect(en[helpKey(id) as keyof typeof en], id).toBeTruthy();
      expect(es[helpKey(id) as keyof typeof es], id).toBeTruthy();
    }
  });
  it('only maps value ids that exist in a panel', () => {
    for (const id of Object.keys(HELP_BY_ID)) expect(source.includes(`id="${id}"`) || source.includes(`'${id}'`) || source.includes(`dv-\${`), id).toBe(true);
  });
});

describe('glance strip', () => {
  it('shows four values per activity, each tied to a panel readout and an explainer', () => {
    for (const m of MODES) {
      expect(CELLS[m]).toHaveLength(4);
      for (const c of CELLS[m]) {
        expect(c.label in en, c.label).toBe(true);
        expect(en[helpKey(c.help) as keyof typeof en], c.help).toBeTruthy();
        expect(source.includes(`'${c.src}'`) || source.includes(`id="${c.src}"`) || c.src.startsWith('dv-'), c.src).toBe(true);
      }
    }
  });
  it('cycles through the activities and wraps', () => {
    expect(MODES.map((m) => nextMode(m))).toEqual(['fish', 'dive', 'boat', 'surf']);
  });
});
