import { describe, expect, it } from 'vitest';
import { isTheme, nextTheme, storedTheme, THEMES, type Theme } from './theme';

describe('theme', () => {
  it('cycles through every theme and back', () => {
    let t: Theme = THEMES[0];
    const seen = new Set<string>();
    for (let i = 0; i < THEMES.length; i++) { seen.add(t); t = nextTheme(t); }
    expect(seen.size).toBe(THEMES.length);
    expect(t).toBe(THEMES[0]);
  });
  it('falls back to retro on junk or a throwing store', () => {
    expect(storedTheme({ getItem: () => 'neon' })).toBe('retro');
    expect(storedTheme({ getItem: () => { throw new Error('x'); } })).toBe('retro');
    expect(storedTheme({ getItem: () => 'naval' })).toBe('naval');
    expect(isTheme('modern')).toBe(true);
  });
});
