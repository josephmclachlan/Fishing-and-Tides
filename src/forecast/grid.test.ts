import { describe, expect, it } from 'vitest';
import { dictFor, setDict } from '../i18n';
import { localDayStart, sunAltitude } from '../physics/astro';
import { METRIC_BY_ID } from '../metrics/registry';
import { FC_ACTIVITIES, daysAt, readAt } from './model';
import { type GridCol, type GridRow, cellText, cleanPicks, markBest, GRID_DAYS, GRID_DEFAULTS, GRID_GROUPS, GRID_IDS, GRID_MAX, gridCols, gridRows, groupOf, LESS_SURE_FROM, levelOf, RATING } from './grid';
import { barHtml, chipsHtml, gridHtml, popHtml, rowName, rowUnit, stripHtml } from './grid-html';
import { DAY0, empty, full, H, spot } from './testkit';

const TZ = -6;
const SP = spot('PLAYA COCLES');
const START = localDayStart(DAY0 + 9 * H, TZ);
const lab = { day: (d: number) => `D${d}`, dayShort: (d: number) => ({ wd: 'Mo', date: d + 1 }) };
const isDay = (ms: number) => sunAltitude(ms, SP.lngLat[1], SP.lngLat[0]) > 0;

describe('PLAN AHEAD rows', () => {
  it('offers every WATCH metric once, the rating first', () => {
    expect(GRID_IDS[0]).toBe(RATING);
    expect(new Set(GRID_IDS).size).toBe(GRID_IDS.length);
    for (const id of GRID_IDS.filter((x) => x !== RATING)) expect(METRIC_BY_ID.has(id), id).toBe(true);
    expect(GRID_IDS.length).toBeGreaterThanOrEqual(24);
  });
  it('starts each activity on its own short list, rating first, within the cap', () => {
    for (const a of FC_ACTIVITIES) {
      const d = GRID_DEFAULTS[a];
      expect(d[0]).toBe(RATING);
      expect(d.length).toBeLessThanOrEqual(GRID_MAX);
      for (const id of d) expect(GRID_IDS).toContain(id);
    }
  });
  it('cleans saved picks: unknown ids and repeats out, the rating first, at most 12', () => {
    expect(cleanPicks('surf', null)).toEqual([...GRID_DEFAULTS.surf]);
    expect(cleanPicks('fish', ['uv', 'nope', 'uv', 3, 'tide'])).toEqual([RATING, 'uv', 'tide']);
    expect(cleanPicks('sail', [...GRID_IDS].reverse())).toHaveLength(GRID_MAX);
    expect(cleanPicks('sail', [...GRID_IDS].reverse())[0]).toBe(RATING);
  });
  it('groups every row', () => {
    for (const id of GRID_IDS) expect(GRID_GROUPS.some((g) => g.g === groupOf(id))).toBe(true);
  });
});

describe('PLAN AHEAD levels', () => {
  it('rates scores and hazards on the five levels, and leaves neutral readings uncoloured', () => {
    expect(levelOf('bite', 85, 'fish')).toBe(4);
    expect(levelOf('bite', 10, 'fish')).toBe(0);
    expect(levelOf('rip', 0.1, 'swim')).toBe(4);
    expect(levelOf('rip', 0.6, 'swim')).toBe(0);
    expect(levelOf('uv', 11, 'surf')).toBe(0);
    expect(levelOf('tide', 0.3, 'fish')).toBeNull();
    expect(levelOf('wdir', 90, 'sail')).toBeNull();
    expect(levelOf('wind', null, 'surf')).toBeNull();
    expect(levelOf('wind', Number.NaN, 'surf')).toBeNull();
  });
  it('reads wind and swell the way each activity wants them', () => {
    expect(levelOf('wind', 15, 'sail')).toBe(4);
    expect(levelOf('wind', 15, 'swim')).toBe(2);
    expect(levelOf('wind', 2, 'sail')).toBe(1);
    expect(levelOf('swell', 1.5, 'surf')).toBe(4);
    expect(levelOf('swell', 1.5, 'snorkel')).toBe(1);
    expect(levelOf('period', 13, 'surf')).toBe(4);
    expect(levelOf('period', 13, 'fish')).toBeNull();
  });
  it('writes cells short: whole scores, a signed tide, a dash for no data', () => {
    expect(cellText(RATING, 72.6)).toBe('73');
    expect(cellText('tide', -0.24)).toBe('−0.2');
    expect(cellText('tide', 0.31)).toBe('+0.3');
    expect(cellText('squall', 2)).toBe('!!');
    expect(cellText('squall', 0)).toBe('0');
    expect(cellText('wind', null)).toBe('–');
  });
});

describe('PLAN AHEAD columns', () => {
  const plan = daysAt(full(), 'surf', SP, DAY0 + 9 * H, GRID_DAYS);
  it('steps every three local hours and skips the hours already over today', () => {
    const now = START + 10 * H;
    const cols = gridCols('h', { from: 0, to: 1 }, START, now, plan, isDay, TZ);
    expect(cols[0].hour).toBe(9);
    expect(cols.every((c) => c.hour % 3 === 0)).toBe(true);
    expect(cols.filter((c) => c.day === 1)).toHaveLength(8);
    expect(cols.filter((c) => c.first)).toHaveLength(2);
    expect(cols.some((c) => c.night) && cols.some((c) => !c.night)).toBe(true);
  });
  it('gives one column per day at its best window in days mode, and hatches day 8 on', () => {
    const cols = gridCols('d', { from: 0, to: GRID_DAYS - 1 }, START, START, plan, isDay, TZ);
    expect(cols).toHaveLength(GRID_DAYS);
    expect(cols.filter((c) => c.unsure).map((c) => c.day)[0]).toBe(LESS_SURE_FROM);
    for (const c of cols) if (plan.days[c.day]) expect(c.ms).toBe(plan.days[c.day]!.startMs);
  });
});

describe('PLAN AHEAD best frame', () => {
  const col = (day: number, hour: number, night = false): GridCol => ({ ms: START + day * 864e5 + hour * H, day, hour, night, best: false, unsure: false, first: hour === 0 });
  const row = (vs: (number | null)[]): GridRow => ({ id: RATING, group: 'rate', unit: '/100', cells: vs.map((v) => ({ v, lv: v === null ? null : levelOf('bite', v, 'fish'), text: '', deg: null })) });
  it('frames the best daylight run in each day, by the numbers shown', () => {
    const cols = [col(0, 6), col(0, 9), col(0, 12), col(0, 15), col(0, 21, true), col(1, 9), col(1, 12)];
    const out = markBest(cols, row([60, 82, 79, 49, 95, 30, 33]), 'h');
    expect(out.map((c) => c.best)).toEqual([false, true, true, false, false, false, false]);
  });
  it('frames only the best day in days mode, and nothing without a rating', () => {
    const cols = [col(0, 9), col(1, 9), col(2, 9)];
    expect(markBest(cols, row([60, 82, 81]), 'd').map((c) => c.best)).toEqual([false, true, false]);
    expect(markBest(cols, undefined, 'd').some((c) => c.best)).toBe(false);
  });
});

describe('PLAN AHEAD rows of cells', () => {
  const deps = full();
  const plan = daysAt(deps, 'surf', SP, DAY0 + 9 * H, GRID_DAYS);
  const cols = gridCols('h', { from: 0, to: 2 }, START, START, plan, isDay, TZ);
  it('fills every pickable row with no NaN, from the rating and the metric registry', () => {
    for (const a of FC_ACTIVITIES) {
      const rows = gridRows(GRID_IDS, cols, a, SP, deps.env, (ms) => readAt(deps, a, SP, ms));
      expect(rows).toHaveLength(GRID_IDS.length);
      for (const r of rows) {
        expect(r.cells).toHaveLength(cols.length);
        for (const c of r.cells) {
          expect(c.text).not.toMatch(/NaN|undefined|Infinity/);
          if (c.v !== null) expect(Number.isFinite(c.v)).toBe(true);
        }
      }
      expect(rows[0].cells.some((c) => c.lv !== null)).toBe(true);
    }
  });
  it('draws wind direction as an arrow and keeps going with no data', () => {
    const rows = gridRows(['wdir', 'wind'], cols, 'sail', SP, deps.env, (ms) => readAt(deps, 'sail', SP, ms));
    expect(rows[0].cells.every((c) => c.deg !== null)).toBe(true);
    const none = empty();
    const dry = gridRows(GRID_IDS, cols, 'surf', SP, none.env, (ms) => readAt(none, 'surf', SP, ms));
    expect(dry.flatMap((r) => r.cells).every((c) => !/NaN/.test(c.text))).toBe(true);
  });
});

describe('PLAN AHEAD markup', () => {
  const deps = full();
  const plan = daysAt(deps, 'fish', SP, DAY0 + 9 * H, GRID_DAYS);
  const cols = gridCols('h', { from: 0, to: 1 }, START, START, plan, isDay, TZ);
  const rows = gridRows(GRID_DEFAULTS.fish, cols, 'fish', SP, deps.env, (ms) => readAt(deps, 'fish', SP, ms));
  for (const lang of ['en', 'es'] as const) {
    it(`names every row and writes no missing words (${lang})`, () => {
      setDict(dictFor(lang));
      for (const id of GRID_IDS) {
        expect(rowName(id, 'surf')).not.toMatch(/^fc\.|undefined/);
        expect(rowUnit(id, METRIC_BY_ID.get(id)?.unit ?? '')).not.toMatch(/^fc\.|undefined/);
      }
      const all = [
        stripHtml(Array.from({ length: GRID_DAYS }, (_, i) => ({ i, wd: 'Mo', date: i + 1, level: null })), { from: 2, to: 5 }),
        barHtml({ from: 0, to: 6 }, 'h', { from: 5, to: 6 }),
        chipsHtml(GRID_DEFAULTS.fish, 'fish', true),
        gridHtml(cols, rows, 'fish', 'h', lab),
        popHtml(rows[0], 3, cols[3], 'fish', 'D0 · 09:00'),
      ].join('');
      expect(all).not.toMatch(/undefined|NaN|fc\.pl\./);
      setDict(dictFor('en'));
    });
  }
  it('lays out a cell per row and column, and lights the strip days in range', () => {
    const g = gridHtml(cols, rows, 'fish', 'h', lab);
    expect(g.match(/data-plx=/g)).toHaveLength(rows.length * cols.length);
    expect(g).toContain(`--cols:${cols.length}`);
    const s = stripHtml(Array.from({ length: GRID_DAYS }, (_, i) => ({ i, wd: 'Mo', date: i + 1, level: 3 as const })), { from: 2, to: 5 });
    expect(s.match(/aria-pressed="true"/g)).toHaveLength(4);
    expect(s.match(/ unsure/g)).toHaveLength(GRID_DAYS - LESS_SURE_FROM);
  });
  it('shows an empty note with no columns, and the rating out of 100 in its pop-up', () => {
    expect(gridHtml([], rows, 'fish', 'h', lab)).toContain('fc-plempty');
    const ci = rows[0].cells.findIndex((c) => c.v !== null);
    expect(popHtml(rows[0], ci, cols[ci], 'fish', 'x')).toContain('/100');
  });
  it('locks the rating chip and marks the picks in the picker', () => {
    const c = chipsHtml([RATING, 'uv'], 'fish', true);
    expect(c).toMatch(/data-plrm="rating" disabled/);
    expect(c).toMatch(/data-plpick="uv" aria-pressed="true"/);
    expect(c).toMatch(/data-plpick="tide" aria-pressed="false"/);
  });
});
