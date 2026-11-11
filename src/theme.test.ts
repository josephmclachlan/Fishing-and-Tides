import { describe, expect, it } from 'vitest';
import { isTheme, storedScheme, storedTheme } from './theme';

describe('theme', () => {
  it('opens the Kinetic Plus map whatever was saved (RETRO and NAVAL removed in PLAN 7.70)', () => {
    for (const v of ['retro', 'naval', 'modern', 'neon', null]) expect(storedTheme({ getItem: () => v })).toBe('modern');
    expect(storedTheme({ getItem: () => { throw new Error('x'); } })).toBe('modern');
    expect(isTheme('modern')).toBe(true);
    expect(isTheme('retro')).toBe(false);
  });
  it('shares the forecast page scheme, else follows the system', () => {
    expect(storedScheme({ getItem: () => 'dark' }, false)).toBe('dark');
    expect(storedScheme({ getItem: () => 'light' }, true)).toBe('light');
    expect(storedScheme({ getItem: () => null }, true)).toBe('dark');
    expect(storedScheme({ getItem: () => { throw new Error('x'); } }, false)).toBe('light');
  });
});
