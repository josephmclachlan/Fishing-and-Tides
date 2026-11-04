import { describe, expect, it } from 'vitest';
import { INTRO_KEY, INTRO_STEPS, introHtml, introSeen, markIntroSeen } from './intro';
import { en } from './i18n/en';
import { es } from './i18n/es';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('intro', () => {
  it('shows until it has been closed once, then stays away', () => {
    const s = mem();
    expect(introSeen(s)).toBe(false);
    markIntroSeen(s);
    expect(s.getItem(INTRO_KEY)).toBe('seen');
    expect(introSeen(s)).toBe(true);
  });
  it('shows every time when there is no storage, and does not throw', () => {
    expect(introSeen(undefined)).toBe(false);
    expect(() => markIntroSeen(undefined)).not.toThrow();
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(introSeen(broken)).toBe(false);
    expect(() => markIntroSeen(broken)).not.toThrow();
  });
  it('has English and Spanish text for every line', () => {
    for (const d of [en, es] as Record<string, string>[]) {
      for (const k of ['intro.tab', 'intro.title', 'intro.lead', 'intro.colours', 'intro.ok', ...INTRO_STEPS.map((n) => `intro.${n}`)]) expect(d[k], k).toBeTruthy();
    }
  });
  it('renders the lead, every step and a way to close', () => {
    const h = introHtml((k) => `[${k}]`);
    for (const n of INTRO_STEPS) expect(h).toContain(`[intro.${n}]`);
    expect(h).toContain('intro-ok');
    expect(h).toContain('intro-x');
  });
});
