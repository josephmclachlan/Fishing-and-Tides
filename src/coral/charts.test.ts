import { describe, expect, it } from 'vitest';
import { dhwTrendSvg, peaksSvg, yearsOver } from './charts';

describe('coral charts', () => {
  it('draws the trend in the tone of the latest value, skipping gaps', () => {
    const svg = dhwTrendSvg([0, 1, null, 3.1]);
    expect(svg).toContain('<polyline');
    expect(svg).toContain('stroke:var(--green);stroke-width:2');
    expect((svg.match(/,/g) ?? []).length).toBe(3); // three points
    expect(dhwTrendSvg([9])).toContain('fill:var(--red)');
  });
  it('one bar per year with data, coloured by threshold', () => {
    const svg = peaksSvg([2022, 2023, 2024], [1, 16.6, null]);
    expect((svg.match(/<rect/g) ?? []).length).toBe(2);
    expect(svg).toContain('fill:var(--red)');
    expect(svg).toContain('2023: 16.6');
  });
  it('lists the years over a threshold, newest first', () => {
    expect(yearsOver([2005, 2020, 2023, 2024], [6, 9, 16.6, 15.4], 8)).toEqual([2024, 2023, 2020]);
  });
});
