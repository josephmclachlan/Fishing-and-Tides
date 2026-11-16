import { describe, expect, it } from 'vitest';
import { SECTIONS, SOURCES } from './content';
import { CG_TABS } from './route';
import { barPct, esc, sectionHtml, tabsHtml } from './view';

describe('ciguatera content', () => {
  it('has a section for every tab, in order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([...CG_TABS]);
  });
  it('has English and Spanish text everywhere, with no em-dashes', () => {
    const walk = (o: unknown, path: string) => {
      if (o && typeof o === 'object') {
        const r = o as Record<string, unknown>;
        if (typeof r.en === 'string' && typeof r.es === 'string') {
          expect(r.en.trim(), path).not.toBe('');
          expect(r.es.trim(), path).not.toBe('');
          expect(r.en + r.es, path).not.toMatch(/—/);
        } else for (const [k, v] of Object.entries(r)) walk(v, `${path}.${k}`);
      }
    };
    walk(SECTIONS, 'sections');
    walk(SOURCES, 'sources');
  });
  it('never says "safe" about a place without data', () => {
    expect(JSON.stringify(SECTIONS.find((s) => s.id === 'here')).toLowerCase()).toContain('not proof of safety');
  });
  it('gives every source a primary or secondary mark and an https link', () => {
    for (const s of SOURCES) {
      expect(['P', 'S']).toContain(s.p);
      if (s.u) expect(s.u).toMatch(/^https:\/\//);
    }
  });
});

describe('ciguatera view', () => {
  it('renders every section in both languages', () => {
    for (const lang of ['en', 'es'] as const) for (const t of CG_TABS) expect(sectionHtml(t, lang).length).toBeGreaterThan(200);
  });
  it('escapes HTML and puts bars on a log scale', () => {
    expect(esc('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
    expect(barPct(10000)).toBe(100);
    expect(barPct(100)).toBeCloseTo(50);
    expect(barPct(0.5)).toBe(3);
  });
  it('marks the open tab', () => {
    const h = tabsHtml('here', 'en', (t) => `#ciguatera/${t}`);
    expect(h).toContain('data-tab="here" aria-selected="true"');
    expect(h).toContain('data-tab="risk" aria-selected="false" tabindex="-1"');
  });
});
