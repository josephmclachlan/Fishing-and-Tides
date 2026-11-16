import { describe, expect, it } from 'vitest';
import { sprig, sprigExtent, sprigPaths, sprigSvg } from './sargassum-glyph';

describe('sargassum sprig (drifting mats drawn as weed)', () => {
  it('has alternate leaf blades, paired round floats and a tip blade', () => {
    const s = sprig(40);
    expect(s.leaves).toHaveLength(5);
    expect(s.bladders).toHaveLength(8);
    // Blades alternate sides of the stem (y is across it; the stem itself wanders a little).
    const sides = s.leaves.slice(0, 4).map((l) => Math.sign(l.tip[1] - l.base[1]));
    expect(sides).toEqual([1, -1, 1, -1]);
  });

  it('keeps the floats visible on a small sprig', () => {
    expect(Math.min(...sprig(16).bladders.map((b) => b.r))).toBeGreaterThanOrEqual(1.2);
    expect(sprig(16).halo).toBeGreaterThanOrEqual(1.2);
    expect(sprig(200).halo).toBeLessThanOrEqual(2.5);
  });

  it('fits inside its extent, halo included', () => {
    const s = sprig(30), e = sprigExtent(s);
    for (const l of s.leaves)
      for (const p of [l.base, l.tip]) {
        expect(Math.abs(p[0]) + s.halo).toBeLessThanOrEqual(e.x);
        expect(Math.abs(p[1]) + s.halo).toBeLessThanOrEqual(e.y);
      }
    for (const b of s.bladders) expect(Math.abs(b.at[1]) + b.r + s.halo).toBeLessThanOrEqual(e.y);
  });

  it('gives SVG paths and a currentColor icon for the legend', () => {
    const p = sprigPaths(sprig(24));
    expect(p.line.startsWith('M')).toBe(true);
    expect(p.fill.match(/a/g)!.length).toBe(16); // two arcs per float
    const svg = sprigSvg(18);
    expect(svg).toContain('width="18"');
    expect(svg).toContain('currentColor');
    expect(svg).not.toContain('NaN');
  });
});
