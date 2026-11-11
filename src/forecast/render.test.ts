/**
 * The FORECAST page rendered to markup from the fixed fixture (PLAN 7.69), without a browser: every block render.ts
 * writes, checked for the model's numbers and for anything that is not a number (NaN, undefined, Infinity, null).
 */
import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import { localDayStart } from '../physics/astro';
import { chartLayout, rowsFor } from './charts';
import { dayUvPeaks, daysAt, FC_ACTIVITIES, hourWeather, readAt, spotsForActivity, timeline, type FcActivity } from './model';
import { SPOTS } from '../region';
import { bestHtml, chartLabelsHtml, chipsHtml, daysHtml, esc, rateHtml, readoutHtml, shellHtml, spotsHtml, tilesHtml } from './render';
import { bestTimeView, daysView, headline, heroView, readoutView, spotView, tilesFor } from './view';
import { DAY0, empty, full, H, spot } from './testkit';

const NOW = DAY0 + 11 * H;
const BAD = /NaN|undefined|Infinity|\bnull\b/;
const SPOT_OF: Record<FcActivity, string> = { surf: 'SALSA BRAVA', fish: 'PUNTA UVA', snorkel: 'PUNTA CAHUITA', dive: 'PUNTA CAHUITA', swim: 'PLAYA COCLES', sail: 'PLAYA COCLES' };
/** Text content of markup: tags dropped, entities decoded. */
const text = (html: string) => html.replace(/<wbr>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

/** Render every data block of the page for one activity, as page.ts does. */
function page(a: FcActivity, deps = full()) {
  const sp = spot(SPOT_OF[a]);
  const plan = daysAt(deps, a, sp, NOW, 7);
  const tl = timeline(deps, a, sp, plan.startMs);
  const r = readAt(deps, a, sp, NOW);
  const hero = heroView(r, { plan, ms: NOW });
  const best = bestTimeView(plan, (ms) => readAt(deps, a, sp, ms), NOW, false);
  const tiles = tilesFor(r, { deps, spot: sp, act: a, ms: NOW, nowMs: NOW, plan, tl });
  const spots = spotsForActivity(a, SPOTS).map((s) => ({ id: s.name, ...spotView(s, readAt(deps, a, s, NOW), [2, 2, 3, null], hourWeather(deps.env, s, NOW)) }));
  const days = daysView(plan, (ms) => readAt(deps, a, sp, ms), dayUvPeaks(deps.env, sp, plan.startMs, 7), 1, true);
  const ro = readoutView(tl[Math.round((NOW - tl[0].ms) / H)], a, rowsFor(a));
  const L = chartLayout(a, tl, 7, false, -6);
  const html = {
    rate: rateHtml(hero), chips: chipsHtml(hero), best: bestHtml(best), tiles: tilesHtml(tiles), spots: spotsHtml(spots, sp.name),
    days: daysHtml(days, t('fc.best')), readout: readoutHtml(ro), labels: chartLabelsHtml(L),
  };
  return { sp, plan, tl, r, hero, best, tiles, spots, days, ro, L, html };
}

describe('the page renders the model\'s numbers (PLAN 7.69)', () => {
  it('renders the frame with all six activities, both languages and the map, coral and theme controls', () => {
    const s = shellHtml({ acts: ['fish', 'surf', 'swim', 'snorkel', 'dive', 'sail'], lang: 'en', coral: true });
    for (const a of FC_ACTIVITIES) expect(s).toContain(`data-act="${a}"`);
    expect(s).toContain('data-lang="es"');
    expect(s).toContain('id="fc-coral"');
    expect(s).toContain('id="fc-scheme"');
    expect(s).toContain('id="fc-back"');
    expect(shellHtml({ acts: ['surf'], lang: 'es', coral: false })).not.toContain('id="fc-coral"');
    expect(s).not.toMatch(BAD);
  });
  for (const a of FC_ACTIVITIES)
    it(`${a}: every block carries the model's values and nothing that is not a number`, () => {
      const p = page(a);
      for (const [k, h] of Object.entries(p.html)) expect(h, k).not.toMatch(BAD);
      // Hero: the rating word and, where it is not the headline, the score.
      expect(text(p.html.rate)).toContain(p.hero.word);
      if (p.hero.score) expect(text(p.html.rate).replace(/\s/g, '')).toContain(p.hero.score);
      for (const x of p.hero.reasons) expect(text(p.html.chips)).toContain(x);
      // Best time: the value is the headline at the window's start.
      if (p.best.kind === 'best' || p.best.kind === 'chance') expect(text(p.html.best)).toContain(p.best.value);
      // Tiles: each tile's number and facts.
      const tt = text(p.html.tiles);
      for (const x of p.tiles) {
        expect(tt).toContain(x.v);
        for (const sub of x.sub) if (sub) expect(tt).toContain(sub);
      }
      expect((p.html.tiles.match(/<canvas/g) ?? []).length).toBe(8);
      // Spot cards: the headline now at each spot.
      const st = text(p.html.spots);
      for (const s of p.spots) expect(st).toContain(`${s.value}${s.unit ? ` ${s.unit}` : ''}`.trim().split(' ')[0]);
      expect((p.html.spots.match(/aria-selected="true"/g) ?? []).length).toBe(1);
      // Seven days: each bar's value is the headline at its window's start.
      const dt = text(p.html.days);
      p.plan.days.forEach((d) => d && expect(dt).toContain(headline(readAt(full(), a, p.sp, d.startMs)).value));
      expect((p.html.days.match(/class="fc-day /g) ?? []).length).toBe(7);
      expect((p.html.days.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
      // Readout: every cell.
      const rt = text(p.html.readout);
      for (const c of p.ro.cells) expect(rt).toContain(c.v);
      expect(rt).toContain(p.ro.time);
      // Chart labels: each data row's name and scale.
      const lt = text(p.html.labels);
      for (const o of p.L.rows) if (o.t === 'data') expect(lt).toContain(o.spec.id === 'tide' ? `±${o.hi.toFixed(2)}` : `–${Number.isInteger(o.hi) ? o.hi : o.hi.toFixed(o.hi < 1 ? 2 : 1)}`);
    });
  it('renders dashes, not zeros, before the feeds load', () => {
    for (const a of ['surf', 'sail', 'snorkel', 'dive'] as const) {
      const p = page(a, empty());
      expect(headline(p.r).value).toBe('--');
      for (const h of Object.values(p.html)) expect(h).not.toMatch(BAD);
    }
  });
  it('escapes text, so a name can never inject markup', () => {
    expect(esc('<b>"x" & \'y\'</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
  });
  it('starts the week at local midnight', () => {
    const p = page('surf');
    expect(p.plan.startMs).toBe(localDayStart(NOW, -6));
    expect(p.tl[0].ms).toBe(DAY0);
  });
});
