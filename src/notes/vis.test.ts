import { describe, expect, it } from 'vitest';
import { SECTIONS } from './content';
import { FIGS, telify, visHtml, type VBlock } from './vis';
import { PICTS, pict } from './icons';

const vis = SECTIONS.flatMap((s) => s.blocks.filter((b): b is VBlock => !['p', 'h', 'ul', 'warn', 'aid', 'table', 'graded', 'bars'].includes(b.k)).map((b) => ({ s: s.id, b })));

describe('notes visuals', () => {
  it('every drawing carries one numbered badge per mark, in both languages', () => {
    for (const { s, b } of vis) {
      if (b.k !== 'fig') continue;
      for (const lang of ['en', 'es'] as const) {
        const n = (FIGS[b.fig].art(lang).match(/class="nt-bd"/g) ?? []).length;
        expect(n, `${s} ${b.fig} ${lang}`).toBe(b.marks.length);
      }
      if (b.tones) expect(b.tones.length, `${s} ${b.fig} tones`).toBe(b.marks.length);
    }
  });
  it('every pictogram and drawing named by a block exists', () => {
    const ids = JSON.stringify(vis.map((v) => v.b));
    for (const m of ids.matchAll(/"(?:ico)":"([a-z0-9]+)"/g)) expect(PICTS, m[1]).toHaveProperty(m[1]);
    for (const m of ids.matchAll(/"fig":"([a-z0-9]+)"/g)) expect(FIGS, m[1]).toHaveProperty(m[1]);
    for (const id of Object.keys(PICTS) as (keyof typeof PICTS)[]) expect(pict(id)).toMatch(/^<svg class="nt-i" viewBox="0 0 24 24"/);
  });
  it('heat rows have one value per column', () => {
    for (const { s, b } of vis) if (b.k === 'heat') for (const r of b.rows) expect(r.v.length, `${s} ${r.h.en}`).toBe(b.cols.length);
  });
  it('turns phone numbers into tap-to-call links', () => {
    expect(telify('Call +506 2755-0302 or 800-4686-9422')).toBe('Call <a class="nt-tel" href="tel:+50627550302">+506 2755-0302</a> or <a class="nt-tel" href="tel:80046869422">800-4686-9422</a>');
    expect(visHtml({ k: 'calls', items: [{ n: '911', tel: '911', h: { en: 'A', es: 'B' } }] }, 'en', (l) => l.en, () => '#')).toContain('href="tel:911"');
  });
});
