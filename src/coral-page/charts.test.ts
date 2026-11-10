import { describe, expect, it } from 'vitest';
import { bandCls, trendChart, yearBars } from './charts';

const DAY = 864e5;
const days = Array.from({ length: 84 }, (_, i) => Date.UTC(2026, 7, 1) + i * DAY);
const month = (ms: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date(ms).getUTCMonth()];
const tr = (values: (number | null)[]) => ({ days, values, watch: 4, high: 8, unit: '°C-wk', watchLabel: 'Bleaching 4', highLabel: 'Severe 8' });

describe('coral page charts', () => {
  it('bands values like Coral Reef Watch', () => {
    expect(bandCls(2, 4, 8)).toBe('l3');
    expect(bandCls(4, 4, 8)).toBe('l2');
    expect(bandCls(9.5, 4, 8)).toBe('l0');
  });
  it('labels the newest value in its band and ticks the months', () => {
    const html = trendChart(tr(days.map((_, i) => i / 10)), { month });
    expect(html).toContain('8.3<small>°C-wk</small>');
    expect(html).toContain('cp-ch-dot l0');
    expect(html).toContain('>Sep<');
    expect(html).toContain('>Oct<');
    expect(html).toContain('Severe 8');
  });
  it('skips gaps, and shows an empty box with too little data', () => {
    const vals = days.map((_, i) => (i % 3 ? null : 1));
    expect(trendChart(tr(vals), { month })).toContain('1.0<small>');
    expect(trendChart(tr(days.map(() => null)), { month })).toContain('cp-chart-empty');
  });
  it('draws visits inside the window only', () => {
    const html = trendChart(tr(days.map(() => 2)), { month, visits: [{ t: days[10], cls: 'l3', title: 'a' }, { t: days[0] - 10 * DAY, cls: 'l0', title: 'b' }] });
    expect(html.match(/cp-ch-visit/g)).toHaveLength(1);
  });
  it('draws a bar per year with the peaks capped', () => {
    const years = Array.from({ length: 42 }, (_, i) => 1985 + i);
    const peaks = years.map((y) => (y === 2023 ? 16.6 : y === 1990 ? null : 2));
    const html = yearBars(years, peaks, { watch: 4, high: 8, cap: 12, highLabel: 'Severe 8', unit: '°C-wk' });
    expect(html.match(/class="cp-yb /g)).toHaveLength(42);
    expect(html).toContain('2023: 16.6');
    expect(html).toContain('height:100%');
    expect(html).toContain('cp-yb-none');
    expect(html).toContain('<em>1985</em>');
    expect(html).toContain('<em>2026</em>');
    expect(html).not.toContain('<em>2025</em>');
  });
});
