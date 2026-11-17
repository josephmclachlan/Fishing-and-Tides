/**
 * PLAN AHEAD markup (PLAN 15.5): the day strip, the picker chips, the colour grid and its pop-up, as pure HTML
 * strings from grid.ts's columns and rows. page.ts puts them in the DOM; grid.test.ts checks them.
 */
import { t, type Key } from '../i18n';
import type { FcActivity, Level } from './model';
import { esc, lvCls } from './render';
import { GRID_DAYS, GRID_GROUPS, GRID_MAX, LESS_SURE_FROM, RATING, type GridCol, type GridGroup, type GridRow, type Range } from './grid';

/** A row's name: the activity's rating, or the reading's own name. */
export const rowName = (id: string, act: FcActivity) => (id === RATING ? t('fc.pl.rating', { act: t(`fc.act.${act}` as Key) }) : t(`fc.pl.m.${id}` as Key));
/** A row's unit as the page writes it (knots as kt, the wind's direction as "from"). */
export function rowUnit(id: string, unit: string): string {
  if (id === 'wdir' || id === 'squall') return '';
  if (id === 'rain') return 'mm/h';
  return unit === 'kn' ? 'kt' : unit;
}

export interface StripDay { i: number; wd: string; date: number; level: Level | null }
/** The 16 days to drag across: today first, the chosen ones lit, a bar in each day's best rating colour. */
export function stripHtml(days: readonly StripDay[], r: Range): string {
  const cells = days
    .map((d) => `<button type="button" class="fc-pld${d.i >= LESS_SURE_FROM ? ' unsure' : ''}${d.i >= r.from && d.i <= r.to ? ' in' : ''}${d.i === r.from || d.i === r.to ? ' edge' : ''}" data-pld="${d.i}" aria-pressed="${d.i >= r.from && d.i <= r.to}"><span class="fc-mono">${esc(d.wd)}</span><b>${d.date}</b><i class="${lvCls(d.level)}"></i></button>`)
    .join('');
  return `<div class="fc-pls" id="fc-pl-strip-in" style="--n:${days.length}">${cells}</div>
    <div class="fc-plz fc-mono" style="--n:${days.length}"><span style="grid-column:1/${LESS_SURE_FROM + 1}"><em>${esc(t('fc.pl.sure'))}</em></span><span class="u" style="grid-column:${LESS_SURE_FROM + 1}/${GRID_DAYS + 1}"><em>${esc(t('fc.pl.less'))}</em></span></div>`;
}

/** Quick ranges and the hours/days switch. */
export function barHtml(r: Range, mode: 'h' | 'd', weekend: Range): string {
  const q = (k: string, a: number, b: number) => `<button type="button" class="fc-plq" data-plq="${a},${b}" aria-pressed="${r.from === a && r.to === b}">${esc(t(`fc.pl.q.${k}` as Key))}</button>`;
  return `<div class="fc-plqs">${q('d3', 0, 2)}${q('wk', 0, 6)}${q('we', weekend.from, weekend.to)}${q('all', 0, GRID_DAYS - 1)}</div>
    <div class="fc-plmode" role="group"><button type="button" class="fc-plq" data-plm="h" aria-pressed="${mode === 'h'}">${esc(t('fc.pl.hours'))}</button><button type="button" class="fc-plq" data-plm="d" aria-pressed="${mode === 'd'}">${esc(t('fc.pl.days'))}</button></div>`;
}

/** The picked rows as chips (tap to drop one) and the ADD button; with the picker open, every row grouped. */
export function chipsHtml(ids: readonly string[], act: FcActivity, open: boolean): string {
  const chip = (id: string) => `<button type="button" class="fc-plc g-${groupClass(id)}" data-plrm="${id}" ${id === RATING ? 'disabled' : ''}><i></i>${esc(rowName(id, act))}${id === RATING ? '' : '<span aria-hidden="true">×</span>'}</button>`;
  const head = `<div class="fc-plch"><span class="fc-mono">${esc(t('fc.pl.picked', { n: String(ids.length), max: String(GRID_MAX) }))}</span></div>`;
  const add = `<button type="button" class="fc-plc fc-pladd" data-pladd aria-expanded="${open}">${esc(t(open ? 'fc.pl.done' : 'fc.pl.add'))}</button>`;
  const picker = open
    ? `<div class="fc-plpick">${GRID_GROUPS.map((g) => `<p class="fc-plg fc-mono g-${g.g}"><i></i>${esc(t(`fc.pl.g.${g.g}` as Key))}</p><div class="fc-plcs">${g.ids.map((id) => `<button type="button" class="fc-plc g-${g.g}" data-plpick="${id}" aria-pressed="${ids.includes(id)}" ${id === RATING ? 'disabled' : ''}><i></i>${esc(rowName(id, act))}</button>`).join('')}</div>`).join('')}<p class="fc-plnote">${esc(t('fc.pl.pickNote', { max: String(GRID_MAX) }))}</p></div>`
    : '';
  return `${head}<div class="fc-plcs">${ids.map(chip).join('')}${add}</div>${picker}`;
}
const groupClass = (id: string): GridGroup => GRID_GROUPS.find((g) => g.ids.includes(id))?.g ?? 'rate';

const ARROW = (deg: number) => `<svg viewBox="-7 -7 14 14" aria-hidden="true" style="transform:rotate(${Math.round(deg + 180)}deg)"><path d="M0 6V-2"/><path d="M0-6.5 3.8 0H-3.8z"/></svg>`;

/** Day names by day index from today (0 = today). */
export interface GridLabels { day: (d: number) => string; dayShort: (d: number) => { wd: string; date: number } }
/**
 * The grid: a header row of days, a row of hours (or each day's best hour), then one row per reading. Rated cells
 * are filled in their level colour; others carry the value in their group's colour. Night columns are dimmed,
 * days 8 and on hatched, and the plan's best window framed on the rating row.
 */
export function gridHtml(cols: readonly GridCol[], rows: readonly GridRow[], act: FcActivity, mode: 'h' | 'd', lab: GridLabels): string {
  if (!cols.length) return `<p class="fc-plempty fc-mono">${esc(t('fc.pl.empty'))}</p>`;
  let head = '';
  if (mode === 'h') {
    const spans: { d: number; n: number; best: boolean; unsure: boolean }[] = [];
    cols.forEach((c) => { const s = spans[spans.length - 1]; if (s && s.d === c.day) { s.n++; s.best ||= c.best; } else spans.push({ d: c.day, n: 1, best: c.best, unsure: c.unsure }); });
    head = `<div class="fc-plh0"></div>${spans.map((s) => `<div class="fc-plhd${s.unsure ? ' unsure' : ''}${s.best ? ' best' : ''}" style="grid-column:span ${s.n}"><b>${esc(lab.day(s.d))}</b></div>`).join('')}`;
  } else {
    head = `<div class="fc-plh0"></div>${cols.map((c) => { const d = lab.dayShort(c.day); return `<div class="fc-plhd dd${c.unsure ? ' unsure' : ''}${c.best ? ' best' : ''}"><b>${esc(d.wd)}</b><span class="fc-mono">${d.date}</span></div>`; }).join('')}`;
  }
  const hours = `<div class="fc-pll fc-plhl fc-mono">${esc(t(mode === 'h' ? 'fc.pl.hour' : 'fc.pl.bestHour'))}</div>${cols.map((c) => `<div class="fc-plhh fc-mono${c.night ? ' n' : ''}${c.first ? ' d0' : ''}">${String(c.hour).padStart(2, '0')}</div>`).join('')}`;
  const body = rows
    .map((r, ri) => {
      const sc = r.id === RATING;
      const label = `<div class="fc-pll g-${r.group}${sc ? ' sc' : ''}"><i></i><span><b>${esc(rowName(r.id, act))}</b><small class="fc-mono">${esc(rowUnit(r.id, r.unit))}</small></span></div>`;
      const cells = r.cells
        .map((x, ci) => {
          const c = cols[ci];
          const cls = `fc-plx${sc ? ' sc' : ''}${x.lv !== null ? ` ${lvCls(x.lv)} lit` : ` g-${r.group}`}${c.night ? ' n' : ''}${c.unsure ? ' unsure' : ''}${c.first ? ' d0' : ''}${sc && c.best ? ' bw' : ''}`;
          const inner = x.deg !== null ? ARROW(x.deg) : esc(x.text);
          return `<button type="button" class="${cls}" data-plx="${ri},${ci}" style="--dl:${Math.min(700, ci * 10 + ri * 35)}ms">${inner}</button>`;
        })
        .join('');
      return label + cells;
    })
    .join('');
  return `<div class="fc-plgrid${mode === 'd' ? ' days' : ''}" style="--cols:${cols.length}">${head}${hours}${body}</div>`;
}

/** The square pop-up for one cell: when, the reading and its value, how good, and a line on what it means. */
export function popHtml(r: GridRow, ci: number, col: GridCol, act: FcActivity, when: string): string {
  const x = r.cells[ci];
  const unit = rowUnit(r.id, r.unit);
  const val = x.deg !== null ? `${Math.round(x.deg)}°` : `${x.text}${unit && x.v !== null && r.id !== RATING ? ` ${unit}` : r.id === RATING && x.v !== null ? '/100' : ''}`;
  const why = r.id === RATING ? t('fc.pl.why.rating', { act: t(`fc.act.${act}` as Key) }) : t(`fc.pl.why.${r.id}` as Key);
  return `<p class="fc-mono">${esc(when)}${col.unsure ? ` · ${esc(t('fc.pl.less'))}` : ''}</p><b>${esc(rowName(r.id, act))} ${esc(val)}</b>${x.lv !== null ? `<span class="fc-plpw ${lvCls(x.lv)}">${esc(t(`fc.lvl.${x.lv}` as Key))}</span>` : ''}<p>${esc(why)}</p>`;
}
