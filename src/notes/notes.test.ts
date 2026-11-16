import { describe, expect, it } from 'vitest';
import { SECTIONS } from './content';
import { NT_TABS, notesHash, parseNotesRoute } from './route';
import { cited, esc, sectionHtml, tabsHtml } from './view';

describe('notes route', () => {
  it('parses its own links only', () => {
    expect(parseNotesRoute('#notes')).toEqual({ tab: 'rules' });
    expect(parseNotesRoute('#notes/aid')).toEqual({ tab: 'aid' });
    expect(parseNotesRoute('#notes/nope')).toEqual({ tab: 'rules' });
    expect(parseNotesRoute('#guide')).toBeNull();
    expect(notesHash('seasons')).toBe('#notes/seasons');
    expect(notesHash('rules')).toBe('#notes');
  });
});

describe('notes content', () => {
  it('has a section for every tab, in order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([...NT_TABS]);
  });
  it('has English and Spanish text everywhere, no em-dashes, no source names in brackets', () => {
    const walk = (o: unknown, path: string) => {
      if (o && typeof o === 'object') {
        const r = o as Record<string, unknown>;
        if (typeof r.en === 'string' && typeof r.es === 'string') {
          expect(r.en.trim(), path).not.toBe('');
          expect(r.es.trim(), path).not.toBe('');
          expect(r.en + r.es, path).not.toMatch(/—/);
          expect(r.en, path).not.toMatch(/no data found|no evidence found|could not find|not found/i);
        } else for (const [k, v] of Object.entries(r)) walk(v, `${path}.${k}`);
      }
    };
    SECTIONS.forEach((s) => walk(s, s.id));
  });
  it('only cites sources it lists, each with an https link', () => {
    for (const s of SECTIONS) {
      const text = JSON.stringify(s.blocks) + JSON.stringify(s.lede);
      for (const m of text.matchAll(/\{([a-z0-9]+)\}/g)) expect(s.sources, `${s.id} cites ${m[1]}`).toHaveProperty(m[1]);
      for (const [k, src] of Object.entries(s.sources)) {
        expect(text, `${s.id} lists ${k} but never cites it`).toContain(`{${k}}`);
        if (src.u) expect(src.u).toMatch(/^https:\/\//);
      }
    }
  });
  it('renders every tab in both languages with sources numbered from 1 in reading order', () => {
    for (const s of SECTIONS)
      for (const lang of ['en', 'es'] as const) {
        const html = sectionHtml(s.id, lang);
        expect(html).toContain('cig-title');
        const nums = [...html.matchAll(/<sup class="cig-sup">(.*?)<\/sup>/g)].flatMap((m) => [...m[1].matchAll(/>(\d+)</g)].map((x) => Number(x[1])));
        let max = 0;
        for (const n of nums) {
          expect(n, `${s.id} ${lang}`).toBeLessThanOrEqual(max + 1);
          max = Math.max(max, n);
        }
      }
  });
  it('escapes text and numbers markers by first appearance', () => {
    const src = { a: { t: 'A', p: 'P' as const, what: { en: '', es: '' } }, b: { t: 'B', p: 'P' as const, what: { en: '', es: '' } } };
    const c = { order: [] as string[] };
    expect(cited('x{b} y{a}{b} <i>', c, src)).toContain('1</a></sup> y<sup class="cig-sup"><a href="#cig-src-1" aria-label="source 1">1</a>,<a href="#cig-src-2"');
    expect(esc('<&>')).toBe('&lt;&amp;&gt;');
    expect(tabsHtml('aid', 'en', notesHash)).toContain('aria-selected="true"');
  });
});
