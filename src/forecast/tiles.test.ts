import { describe, expect, it } from 'vitest';
import { miniIcon, skyIcon, tileIcon, tipBand, type TileKind } from './tiles';

const KINDS: TileKind[] = ['swell', 'wind', 'gust', 'clock', 'fish', 'moon', 'tide', 'breaker', 'chop', 'current', 'reef', 'uv', 'stingers', 'surge', 'feels', 'water', 'rip', 'boat'];

describe('picture tiles', () => {
  it('draws every kind at any value without NaN', () => {
    for (const k of KINDS)
      for (const v of [null, 0, 0.5, 1, 3, 12, 40, 100]) {
        const svg = tileIcon(k, v, { from: 6, to: 9, rising: v === 1, waxing: false, lv: 2 });
        expect(svg).toMatch(/^<svg class="fc-ti fc-ti-/);
        expect(svg).not.toMatch(/NaN|undefined/);
      }
  });
  it('draws the picture from the value: a fuller thermometer when hotter, more swell lines when bigger', () => {
    const lvl = (svg: string) => Number(/fc-ta-rise" x="-1.6" y="([-\d.]+)"/.exec(svg)![1]);
    expect(lvl(tileIcon('feels', 36))).toBeLessThan(lvl(tileIcon('feels', 25)));
    expect(tileIcon('feels', 34)).toContain('fc-ti-heat');
    expect(tileIcon('feels', 28)).not.toContain('fc-ti-heat');
    const lines = (svg: string) => svg.split('fc-ta-slide').length - 1;
    expect(lines(tileIcon('swell', 2))).toBeGreaterThan(lines(tileIcon('swell', 0.3)));
  });
  it('has a sky picture for each day word, with rain and a bolt where they belong', () => {
    for (const k of ['sun', 'partly', 'cloud', 'showers', 'rain', 'storm', null] as const) expect(skyIcon(k)).not.toMatch(/NaN|undefined/);
    expect(skyIcon('storm')).toContain('fc-ti-bolt');
    expect(skyIcon('rain')).toContain('fc-ti-rain');
    expect(skyIcon('sun')).not.toContain('fc-ti-rain');
    for (const k of ['rain', 'humid', 'water', 'uv', 'wind', 'feels'] as const) expect(miniIcon(k)).toMatch(/^<svg class="fc-mi"/);
  });
  it('picks tips on the page\'s own bands', () => {
    expect(tipBand('uv', 11)).toBe('extreme');
    expect(tipBand('uv', 8)).toBe('vhigh');
    expect(tipBand('uv', 2)).toBe('low');
    expect(tipBand('feels', 40)).toBe('danger');
    expect(tipBand('feels', 33)).toBe('hot');
    expect(tipBand('water', 29)).toBe('bath');
    expect(tipBand('water', 23)).toBe('cool');
    expect(tipBand('breaker', 1.5)).toBe('dump');
    expect(tipBand('rainpct', 85)).toBe('wet');
    expect(tipBand('humidity', 85)).toBe('muggy');
    expect(tipBand('uv', null)).toBeNull();
  });
});

describe('moon tile', () => {
  it('draws a thin crescent near new moon and a near-full disc near full', () => {
    // The terminator arc's sweep flag: into the lit half (crescent) or out of it (gibbous).
    const sweep = (svg: string) => /A[\d.]+,14 0 0 (\d) 0,-14/.exec(svg)![1];
    expect(sweep(tileIcon('moon', 0.1, { waxing: true }))).toBe('0');
    expect(sweep(tileIcon('moon', 0.9, { waxing: true }))).toBe('1');
    expect(tileIcon('moon', 0.01)).not.toContain('fc-ti-moonlit');
  });
});
