/**
 * The CIGUATERA page's own link (PLAN 7.101): `#ciguatera[/<tab>]`. Pure, so parsing is tested without a DOM. Any other
 * hash is not this page's: it hides and the forecast, guide or map takes over (the same convention as #guide and #coral).
 */
export const CG_TABS = ['risk', 'here', 'fish', 'symptoms', 'treatment', 'recovery', 'ifill', 'sources'] as const;
export type CgTab = (typeof CG_TABS)[number];
export const isCgTab = (v: unknown): v is CgTab => typeof v === 'string' && (CG_TABS as readonly string[]).includes(v);

export interface CgRoute {
  tab: CgTab;
}

export function parseCiguateraRoute(hash: string): CgRoute | null {
  const m = /^#ciguatera(?:\/([^/]*))?\/?$/.exec(hash);
  if (!m) return null;
  return { tab: isCgTab(m[1]) ? m[1] : 'risk' };
}

export const ciguateraHash = (tab: CgTab = 'risk'): string => (tab === 'risk' ? '#ciguatera' : `#ciguatera/${tab}`);
