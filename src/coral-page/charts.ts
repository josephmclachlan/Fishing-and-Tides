/**
 * Charts for the CORAL page (PLAN 7.65), as HTML strings so they are tested without a DOM. The line and the
 * shaded area are an SVG stretched to the box (strokes stay one width with `vector-effect`); labels, the
 * end dot and the thresholds are HTML placed by percentage, so text stays sharp at any width.
 * Colours are the page's tokens (coral-page.css), never inline.
 *
 *  - trendChart: a 12-week build-up (DHW or MUD WEEKS) with the WATCH and HIGH bands behind it, the newest
 *    value labelled, month ticks, and logged visits as ticks coloured by status.
 *  - yearBars: one bar per year, height by that year's peak, coloured by band, the HIGH line across.
 */
export interface Trend {
  /** Day stamps, epoch ms, oldest first. */
  days: readonly number[];
  values: readonly (number | null)[];
  watch: number;
  high: number;
  /** Unit after the newest value, e.g. "°C-wk". */
  unit: string;
  /** Labels for the two lines, e.g. "Bleaching likely 4". */
  watchLabel: string;
  highLabel: string;
}

export interface ChartOpts {
  /** Axis month name for an epoch ms. */
  month: (ms: number) => string;
  /** Visits drawn as ticks: time and level class (`l0`..`l4`, `l-none`). */
  visits?: readonly { t: number; cls: string; title: string }[];
  /** Plot box height, px. */
  height?: number;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pct = (x: number) => `${(Math.round(x * 100) / 100).toString()}%`;
const fmt = (v: number) => (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1));
/** Band class of a value: `l3` under watch, `l2` under high, `l0` from high. */
export const bandCls = (v: number, watch: number, high: number) => (v >= high ? 'l0' : v >= watch ? 'l2' : 'l3');

export function trendChart(tr: Trend, o: ChartOpts): string {
  const pts = tr.days.map((d, i) => [d, tr.values[i]] as const).filter((p): p is readonly [number, number] => p[1] !== null && Number.isFinite(p[1]));
  const h = o.height ?? 150;
  if (pts.length < 2 || tr.days.length < 2) return `<div class="cp-chart cp-chart-empty" style="height:${h}px"><span>--</span></div>`;
  const from = tr.days[0], to = tr.days[tr.days.length - 1];
  const top = Math.max(tr.high * 1.3, ...pts.map((p) => p[1])) * 1.05;
  const x = (t: number) => ((t - from) / Math.max(1, to - from)) * 100;
  const y = (v: number) => 100 - (Math.max(0, v) / top) * 100;
  const line = pts.map(([d, v]) => `${x(d).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const area = `M${x(pts[0][0]).toFixed(2)},100 L${line.replace(/ /g, ' L')} L${x(pts[pts.length - 1][0]).toFixed(2)},100 Z`;
  const last = pts[pts.length - 1];
  const cls = bandCls(last[1], tr.watch, tr.high);
  // Bands behind the line: calm under WATCH, amber to HIGH, red above.
  const bands = `<rect class="cp-band-ok" x="0" y="${y(tr.watch).toFixed(2)}" width="100" height="${(100 - y(tr.watch)).toFixed(2)}"/>`
    + `<rect class="cp-band-watch" x="0" y="${y(tr.high).toFixed(2)}" width="100" height="${(y(tr.watch) - y(tr.high)).toFixed(2)}"/>`
    + `<rect class="cp-band-high" x="0" y="0" width="100" height="${y(tr.high).toFixed(2)}"/>`;
  const ticks: string[] = [];
  const d0 = new Date(from);
  for (let m = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1); m <= to; m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)) {
    ticks.push(`<span style="left:${pct(x(m))}">${esc(o.month(m + 15 * 864e5))}</span>`);
  }
  const visits = (o.visits ?? []).filter((v) => v.t >= from && v.t <= to).map((v) => `<i class="cp-ch-visit ${v.cls}" style="left:${pct(x(v.t))}" title="${esc(v.title)}"></i>`).join('');
  const thr = (v: number, label: string, c: string) => `<span class="cp-ch-th ${c}" style="top:${pct(y(v))}">${esc(label)}</span>`;
  // The newest value's label sits left of the dot, so it never runs off the right edge.
  return `<div class="cp-chart">
    <div class="cp-ch-plot" style="height:${h}px">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${bands}
        <line class="cp-ch-l cp-ch-l-watch" x1="0" x2="100" y1="${y(tr.watch).toFixed(2)}" y2="${y(tr.watch).toFixed(2)}"/>
        <line class="cp-ch-l cp-ch-l-high" x1="0" x2="100" y1="${y(tr.high).toFixed(2)}" y2="${y(tr.high).toFixed(2)}"/>
        <path class="cp-ch-area ${cls}" d="${area}"/>
        <polyline class="cp-ch-line ${cls}" points="${line}"/>
      </svg>
      ${thr(tr.high, tr.highLabel, 'l0')}${thr(tr.watch, tr.watchLabel, 'l2')}
      ${visits}
      <i class="cp-ch-dot ${cls}" style="left:${pct(x(last[0]))};top:${pct(y(last[1]))}"></i>
      <b class="cp-ch-val ${cls}" style="left:${pct(x(last[0]))};top:${pct(y(last[1]))}">${fmt(last[1])}<small>${esc(tr.unit)}</small></b>
    </div>
    <div class="cp-ch-x">${ticks.join('')}</div>
  </div>`;
}

/** One bar per year; `cap` is the top of the scale (bars above it are drawn full and keep their value in the title). */
export function yearBars(years: readonly number[], peaks: readonly (number | null)[], b: { watch: number; high: number; cap: number; highLabel: string; unit: string }, height = 110): string {
  if (!years.length) return `<div class="cp-chart cp-chart-empty" style="height:${height}px"><span>--</span></div>`;
  const step = years.length > 24 ? 5 : years.length > 6 ? 2 : 1;
  const bars = years.map((yr, i) => {
    const p = peaks[i];
    // Every `step` years, and the newest (unless a label sits right beside it).
    const last = i === years.length - 1;
    const label = last || (yr % step === 0 && years.length - 1 - i >= Math.min(2, step)) ? `<em>${yr}</em>` : '';
    if (p === null || !Number.isFinite(p)) return `<span class="cp-yb cp-yb-none" title="${yr}: --">${label}</span>`;
    const hh = Math.max(2, (Math.min(p, b.cap) / b.cap) * 100);
    return `<span class="cp-yb ${bandCls(p, b.watch, b.high)}${i === years.length - 1 ? ' now' : ''}" title="${yr}: ${p.toFixed(1)} ${esc(b.unit)}" style="--i:${i}"><i style="height:${pct(hh)}"></i>${label}</span>`;
  }).join('');
  const yHigh = 100 - (b.high / b.cap) * 100;
  return `<div class="cp-chart cp-years">
    <div class="cp-yb-plot" style="height:${height}px">${bars}<span class="cp-ch-th l0" style="top:${pct(yHigh)}">${esc(b.highLabel)}</span><hr class="cp-yb-high" style="top:${pct(yHigh)}"></div>
  </div>`;
}
