import { describe, expect, it } from 'vitest';
import { localDayStart } from '../physics/astro';
import { daysAt, readAt, timeline } from './model';
import { dockCells, dockCellsHtml, dockMarks, drawDockStrip, stripHourAt, stripRange } from './dock';
import { outlookView } from './view';
import { outlookHtml } from './render';
import { DAY0, full, H, recCtx, spot, tokens } from './testkit';

const TZ = -6;
const ds = (ms: number) => localDayStart(ms, TZ);
const setup = () => {
  const deps = full();
  const sp = spot('PLAYA COCLES');
  const plan = daysAt(deps, 'surf', sp, DAY0 + 9 * H, 7);
  const tl = timeline(deps, 'surf', sp, plan.startMs);
  return { deps, sp, plan, tl };
};

describe('time dock', () => {
  it('today: 24 cells from the present hour, none past, the shown hour marked', () => {
    const { tl } = setup();
    const now = DAY0 + 9 * H;
    const cells = dockCells(tl, now, now + 3 * H, ds);
    expect(cells).toHaveLength(24);
    expect(cells[0].ms).toBe(now);
    expect(cells.some((c) => c.past)).toBe(false);
    expect(cells.filter((c) => c.on).map((c) => c.ms)).toEqual([now + 3 * H]);
  });
  it('a later day: midnight to midnight of that day', () => {
    const { tl } = setup();
    const now = DAY0 + 9 * H, show = DAY0 + 2 * 864e5 + 14 * H;
    const cells = dockCells(tl, now, show, ds);
    expect(cells[0].ms).toBe(DAY0 + 2 * 864e5);
    expect(cells[23].ms).toBe(DAY0 + 2 * 864e5 + 23 * H);
    // night at 02:00, day at noon (the fixture's sun rises near 05:30)
    expect(cells[2].day).toBe(false);
    expect(cells[12].day).toBe(true);
  });
  it('the strip runs from now to the end of the week and maps a drag to an hour', () => {
    const { tl } = setup();
    const r = stripRange(tl, DAY0 + 9 * H);
    expect(r).toEqual([9, tl.length]);
    expect(stripHourAt(0, r)).toBe(9);
    expect(stripHourAt(1, r)).toBe(tl.length - 1);
    expect(stripHourAt(-3, r)).toBe(9);
  });
  it('draws with finite coordinates and labels each midnight', () => {
    const { tl, plan } = setup();
    const c = recCtx();
    const wins = plan.days.flatMap((d) => (d ? [{ startMs: d.startMs, endMs: d.endMs }] : []));
    drawDockStrip(c, 340, 46, tl, stripRange(tl, DAY0 + 9 * H), 30, wins, tokens(), (ms) => `D${new Date(ms).getUTCDate()}`, ds);
    expect(c.texts.length).toBeGreaterThanOrEqual(5);
  });
  it('cells markup: past hours cannot be picked; four hour marks', () => {
    const { tl } = setup();
    const now = DAY0 + 9 * H;
    const cells = dockCells(tl, now, DAY0 + 864e5 + 12 * H, ds);
    const html = dockCellsHtml(cells, () => 'x');
    expect((html.match(/<button/g) ?? []).length).toBe(24);
    expect(dockMarks(cells, (ms) => String(new Date(ms).getUTCHours()))).toHaveLength(4);
  });
});

describe('days 8 to 16', () => {
  it('rows for plan days 7..15 only, each read at its window start', () => {
    const { deps, sp } = setup();
    const p30 = daysAt(deps, 'surf', sp, DAY0 + 9 * H, 30);
    // even from a longer plan, nothing past day 16
    const rows = outlookView(p30, (ms) => readAt(deps, 'surf', sp, ms));
    expect(rows).toHaveLength(9);
    expect(rows[0].i).toBe(7);
    expect(rows[8].i).toBe(15);
    rows.forEach((r) => {
      expect(r.width).toBeGreaterThanOrEqual(0);
      expect(r.width).toBeLessThanOrEqual(1);
      if (r.ms !== null) expect(r.ms).toBe(p30.days[r.i]!.startMs);
    });
    const html = outlookHtml(rows, 'LESS');
    expect(html).toContain('LESS');
    expect((html.match(/<button/g) ?? []).length).toBe(9);
  });
});
