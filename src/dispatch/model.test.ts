import { describe, expect, it } from 'vitest';
import { freshness, gradeOf, hoursTo, kAt, METHODS, span, WARM_RATE } from './model';

describe('freshness model', () => {
  it('starts at each method\'s K and never falls', () => {
    for (const m of METHODS) {
      let last = kAt(m, 0);
      for (let h = 1; h <= 200; h++) {
        const k = kAt(m, h);
        expect(k).toBeGreaterThanOrEqual(last);
        expect(k).toBeLessThanOrEqual(100);
        last = k;
      }
    }
  });
  it('ranks the methods the way the page argues', () => {
    for (const h of [3, 8]) {
      expect(freshness('ikejime', h)).toBeGreaterThan(freshness('stun-ice', h));
      expect(freshness('stun-ice', h)).toBeGreaterThan(freshness('gill-shade', h));
      expect(freshness('gill-shade', h)).toBeGreaterThan(freshness('suffocate', h));
    }
    expect(freshness('stun-ice', 24)).toBeGreaterThan(freshness('gill-shade', 24));
    expect(freshness('suffocate-ice', 24)).toBeGreaterThan(freshness('suffocate', 24));
    expect(freshness('suffocate-ice', 24)).toBeLessThan(freshness('stun-ice', 24));
  });
  it('keeps ikejime on ice sashimi-grade for days and a bled fish in the shade for about 9 to 12 hours', () => {
    expect(hoursTo('ikejime', 20)).toBeGreaterThan(24);
    expect(hoursTo('gill-shade', 60)).toBeGreaterThan(8);
    expect(hoursTo('gill-shade', 60)).toBeLessThan(13);
    expect(hoursTo('suffocate', 60)).toBeLessThan(5);
  });
  it('solves hoursTo and kAt consistently, across a phase change', () => {
    for (const m of METHODS) {
      const h = hoursTo(m, 50);
      expect(kAt(m, h)).toBeCloseTo(50, 6);
    }
    expect(kAt('suffocate-ice', 2)).toBeCloseTo(35 + 2 * WARM_RATE * 1.1, 6);
  });
  it('grades by the K bands', () => {
    expect(gradeOf(10)).toBe('raw');
    expect(gradeOf(20)).toBe('good');
    expect(gradeOf(59.9)).toBe('ok');
    expect(gradeOf(60)).toBe('off');
  });
  it('writes spans in hours then days', () => {
    expect(span(9.44)).toEqual({ n: 9.4, unit: 'h' });
    expect(span(72)).toEqual({ n: 3, unit: 'd' });
  });
});

import { CHART_H, hourAt, posOf, segments } from './model';
describe('chart geometry', () => {
  it('maps hours to positions and back', () => {
    expect(posOf(0)).toBe(0);
    expect(posOf(CHART_H)).toBe(1);
    expect(posOf(100)).toBe(1);
    for (const h of [1, 6, 24, 60]) expect(hourAt(posOf(h))).toBeCloseTo(h, 9);
  });
  it('covers the whole chart with ordered grades for every method', () => {
    for (const m of METHODS) {
      const s = segments(m);
      expect(s[0].from).toBe(0);
      expect(s[s.length - 1].to).toBe(CHART_H);
      s.forEach((x, i) => i && expect(x.from).toBe(s[i - 1].to));
    }
    expect(segments('suffocate')[0].grade).toBe('good');
    expect(segments('ikejime')[0].grade).toBe('raw');
    expect(segments('ikejime').map((x) => x.grade)).toEqual(['raw', 'good']);
  });
});

import { METHODS as METHOD_TEXT } from './content';
import { ART_MARKS, methodArt } from './art';
describe('method drawings', () => {
  it('has one drawing per method with a numbered badge for each mark in its list', () => {
    for (const m of METHOD_TEXT) {
      const svg = methodArt(m.id);
      expect(m.marks.length).toBe(ART_MARKS[m.id]);
      for (let n = 1; n <= m.marks.length; n++) expect(svg).toContain(`>${n}</text>`);
      expect(svg).not.toContain(`>${m.marks.length + 1}</text>`);
    }
  });
});
