import { describe, expect, it } from 'vitest';
import { citePage } from './cite';
import { answers, detailHtml, SECTION_ORDER, splitLead, tabsFor } from './render';
import type { Species } from './types';
import muttonJson from '../../public/data/guide/sp/lutjanus-analis.json';
import manowarJson from '../../public/data/guide/sp/physalia-physalis.json';


const mutton = muttonJson as unknown as Species;
const manowar = manowarJson as unknown as Species;
const opts = { lang: 'en' as const, base: '/', link: () => null, tabHref: (k: string) => `#guide/all/x/${k}` };

describe('splitLead', () => {
  it('keeps a short text whole', () => {
    expect(splitLead('A short one. Two.')).toEqual(['A short one. Two.', '']);
  });
  it('cuts a long text after its first sentence, keeping its source markers', () => {
    const t = 'Ciguatera has been reported in this species[^1]. Risk rises with size and age; skip very large fish and never eat the head, liver or roe. Cooking and freezing do not remove the toxin.';
    const [a, b] = splitLead(t);
    expect(a).toBe('Ciguatera has been reported in this species[^1].');
    expect(b.startsWith('Risk rises')).toBe(true);
  });
  it('does not end a sentence at "e.g." before a small letter', () => {
    const t = 'Bait such as small fish, e.g. pilchard or sprat, and cut squid works well near the bottom on a slow tide. More words follow here to make it long enough for a fold.';
    expect(splitLead(t)[0]).toBe('Bait such as small fish, e.g. pilchard or sprat, and cut squid works well near the bottom on a slow tide.');
  });
});

describe('one page per species', () => {
  it('puts every section on the page in reading order, with a chip for each', () => {
    const html = detailHtml(mutton, opts);
    const secs = [...html.matchAll(/<section class="gd-sec s-(\w+)"/g)].map((m) => m[1]);
    expect(secs).toEqual(SECTION_ORDER.filter((k) => tabsFor(mutton).includes(k)));
    expect([...html.matchAll(/class="gd-d-tab s-(\w+)"/g)].map((m) => m[1])).toEqual(secs);
  });
  it('keeps every word of the research (long texts fold, they are not cut)', () => {
    const html = detailHtml(mutton, opts);
    for (const t of [mutton.about!.en, mutton.eat!.howTo!.en, mutton.danger!.firstAid!.en, mutton.behaviour!.en])
      for (const w of t.replace(/\[\^\d+\]/g, '').split(/\s+/).slice(-4)) expect(html).toContain(w.replace(/'/g, '&#39;'));
  });
  it('numbers the sources once for the whole page, in reading order, and lists the uncited ones after', () => {
    const html = detailHtml(mutton, opts);
    const sups = [...html.matchAll(/<sup class="gd-cite">([\d,]+)<\/sup>/g)].flatMap((m) => m[1].split(',').map(Number));
    expect(sups[0]).toBe(1);
    // Each new number is at most one more than the highest so far.
    let hi = 0;
    for (const n of sups) expect(n).toBeLessThanOrEqual((hi = Math.max(hi, n)));
    expect((html.match(/<ol id="gd-fn-list">/g) ?? []).length).toBe(1);
    expect(html).toContain('IUCN Red List: Lutjanus analis');
  });
  it('answers the four questions first', () => {
    const a = answers(mutton, 'en', () => true);
    expect(a.map((x) => x.k)).toEqual(['eat', 'hurts', 'rules', 'here']);
    expect(a[0].word).toBe('With care');
    expect(a[1].word).toBe('Only if eaten');
    expect(a[3].word).toBe('Not recorded here');
    const m = answers(manowar, 'en', () => true);
    expect(m[1].tone).toBe('bad');
  });
});

describe('citePage', () => {
  it('puts the list where the page asks for it', () => {
    const out = citePage('<p>a[^2] b[^1]</p><!--gd-fn-->', [{ t: 'One' }, { t: 'Two' }, { t: 'Three' }, { t: 'Added', x: true }], (n) => `<h4>${n}</h4>`);
    expect(out).toContain('a<sup class="gd-cite">1</sup> b<sup class="gd-cite">2</sup>');
    expect(out).toMatch(/<h4>3<\/h4><ol id="gd-fn-list"><li>Two<\/li><li>One<\/li><li>Three<\/li><\/ol>/);
  });
});
