import { describe, expect, it } from 'vitest';
import { activityForPreset, GROUPS, openGroups } from './cond-groups';

const none = new Set<never>();

describe('openGroups', () => {
  it('opens every group for ALL', () => {
    expect([...openGroups('all', {}, none)]).toEqual(GROUPS.map((g) => g.id));
  });
  it("opens only the activity's groups", () => {
    expect([...openGroups('surf', {}, none)]).toEqual(['waves']);
    expect([...openGroups('fish', {}, none)]).toEqual(['water', 'weather', 'fishing', 'place']);
    expect([...openGroups('dive', {}, none)]).toEqual(['waves', 'water', 'place']);
    expect([...openGroups('boat', {}, none)]).toEqual(['waves', 'weather', 'place']);
  });
  it('lets a tap open or shut a group', () => {
    const open = openGroups('surf', { weather: true, waves: false }, none);
    expect(open.has('weather')).toBe(true);
    expect(open.has('waves')).toBe(false);
  });
  it('always opens a group with a warning, even one shut by hand', () => {
    expect(openGroups('surf', { weather: false }, new Set(['weather'] as const)).has('weather')).toBe(true);
  });
});

describe('activityForPreset', () => {
  it('maps the LAYERS presets to conditions activities', () => {
    expect(activityForPreset('fishing')).toBe('fish');
    expect(activityForPreset('sail')).toBe('boat');
    expect(activityForPreset('all')).toBe('all');
    expect(activityForPreset(null)).toBeNull();
  });
});
