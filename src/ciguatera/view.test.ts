import { describe, expect, it } from 'vitest';
import { SECTIONS, SOURCES } from './content';
import { CG_TABS } from './route';
import { barPct, cited, esc, sectionHtml, tabsHtml } from './view';

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
    walk(Object.values(SOURCES), 'sources');
  });
  it('never says "safe" about a place without data', () => {
    expect(JSON.stringify(SECTIONS.find((s) => s.id === 'here')).toLowerCase()).toContain('not proof of safety');
  });
  it('gives every source a primary or secondary mark and an https link', () => {
    for (const s of Object.values(SOURCES)) {
      expect(['P', 'S']).toContain(s.p);
      if (s.u) expect(s.u).toMatch(/^https:\/\//);
    }
  });
});

describe('ciguatera citations', () => {
  const all = JSON.stringify(SECTIONS);
  it('only uses sources that exist, and every source is used', () => {
    const keys = new Set([...all.matchAll(/\{([a-z0-9]+)\}/g)].map((m) => m[1]));
    for (const k of keys) expect(Object.keys(SOURCES), k).toContain(k);
    for (const k of Object.keys(SOURCES)) expect(keys.has(k), `unused source ${k}`).toBe(true);
  });
  it('never names a source in brackets or the text', () => {
    expect(all).not.toMatch(/\((?:CDC|FDA|UCR|WHOI|summary|press release|secondary summary|resumen)\)/i);
    expect(all).not.toMatch(/\b(?:Friedman|Boucaud|Darius|Robertson|Schnorf|Mullins)\b/);
  });
  it('numbers by first appearance and lists the sources in that order', () => {
    const c = { order: [] as string[] };
    expect(cited('A{f17} B{cdc}{f17} C{cdc}', c)).toBe('A<sup class="cig-sup"><a href="#cig-src-1" aria-label="source 1">1</a></sup> B<sup class="cig-sup"><a href="#cig-src-2" aria-label="source 2">2</a>,<a href="#cig-src-1" aria-label="source 1">1</a></sup> C<sup class="cig-sup"><a href="#cig-src-2" aria-label="source 2">2</a></sup>');
    expect(c.order).toEqual(['f17', 'cdc']);
  });
  it('lists each section sources with ids matching its markers', () => {
    for (const lang of ['en', 'es'] as const)
      for (const t of CG_TABS) {
        const h = sectionHtml(t, lang);
        const nums = [...h.matchAll(/href="#cig-src-(\d+)"/g)].map((m) => Number(m[1]));
        const ids = [...h.matchAll(/<li id="cig-src-(\d+)"/g)].map((m) => Number(m[1]));
        expect(ids, `${t} ${lang}`).toEqual(ids.map((_, i) => i + 1));
        expect(Math.max(0, ...nums), `${t} ${lang}`).toBe(ids.length);
        expect(h).not.toMatch(/\{[a-z0-9]+\}/);
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
