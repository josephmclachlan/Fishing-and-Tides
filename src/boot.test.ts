import { describe, expect, it } from 'vitest';
import { bootHtml, DOTS, litDots } from './boot-view';
import { createProgress, mapFraction, STRAGGLER_MS, stragglersDue } from './boot';
import { ACTIVITY_ORDER } from './icons/activities';

describe('launch progress', () => {
  it('lights dots left to right and all eight only when everything is in', () => {
    expect(litDots(0, 8)).toBe(0);
    expect(litDots(1, 8)).toBe(1);
    expect(litDots(7, 8)).toBe(7);
    expect(litDots(8, 8)).toBe(8);
    // fewer steps than dots: spread out, never all lit early
    expect(litDots(2, 3)).toBe(5);
    expect(litDots(0.99, 1)).toBe(7);
    expect(litDots(0, 0)).toBe(8);
  });
  it('a step is done when every promise given to it has settled', () => {
    const p = createProgress(['tides', 'wind', 'rain']);
    p.add('wind');
    p.add('wind');
    p.add('rain');
    p.close(); // tides had nothing tracked: done
    expect(p.done()).toBe(1);
    expect(p.waiting()).toBe('wind');
    p.settle('wind');
    expect(p.waiting()).toBe('wind');
    p.settle('wind');
    p.settle('rain');
    expect(p.complete()).toBe(true);
    expect(p.waiting()).toBeNull();
  });
  it('ignores unknown steps and settles that come twice', () => {
    const p = createProgress(['a']);
    p.add('nope');
    p.settle('nope');
    p.add('a');
    p.settle('a');
    p.settle('a');
    expect(p.done()).toBe(1);
  });
});

describe('stragglers', () => {
  it('waits for everything until 85% is in, then gives the rest a second and a half', () => {
    expect(stragglersDue(17, 17, null)).toBe(true);
    expect(stragglersDue(10, 17, null)).toBe(false);
    expect(stragglersDue(15, 17, 200)).toBe(false);
    expect(stragglersDue(15, 17, STRAGGLER_MS)).toBe(true);
    expect(stragglersDue(0, 0, null)).toBe(true);
  });
});

describe('map loader progress', () => {
  it('goes style, drawing jobs, then a full frame of tiles', () => {
    expect(mapFraction(false, 0, 4, false)).toBe(0);
    expect(mapFraction(true, 0, 4, false)).toBe(0.25);
    expect(mapFraction(true, 2, 4, false)).toBeCloseTo(0.55);
    expect(mapFraction(true, 4, 4, false)).toBeCloseTo(0.85);
    expect(mapFraction(true, 4, 4, true)).toBe(1);
    expect(mapFraction(true, 0, 0, true)).toBe(1);
  });
});

describe('loader markup', () => {
  it('has the mark, eight dots that each hold an activity icon, and no external assets', () => {
    const h = bootHtml();
    expect(h).toContain('id="sc-boot"');
    expect(h.match(/class="sc-d"/g)?.length).toBe(DOTS);
    expect(DOTS).toBe(ACTIVITY_ORDER.length);
    expect(h).not.toMatch(/https?:/);
    expect(bootHtml('map')).not.toContain('id="sc-boot"');
  });
});
