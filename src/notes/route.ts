/**
 * The FIELD NOTES page's own link: `#notes[/<tab>]`. Pure, so parsing is tested without a DOM. Any other hash is not this
 * page's: it hides and the forecast, guide or map takes over (the same convention as #guide, #ciguatera and #dispatch).
 */
export const NT_TABS = ['rules', 'surf', 'water', 'aid', 'rigs', 'release', 'cook', 'seasons', 'words'] as const;
export type NtTab = (typeof NT_TABS)[number];
export const isNtTab = (v: unknown): v is NtTab => typeof v === 'string' && (NT_TABS as readonly string[]).includes(v);

export interface NtRoute {
  tab: NtTab;
}

export function parseNotesRoute(hash: string): NtRoute | null {
  const m = /^#notes(?:\/([^/]*))?\/?$/.exec(hash);
  if (!m) return null;
  return { tab: isNtTab(m[1]) ? m[1] : 'rules' };
}

export const notesHash = (tab: NtTab = 'rules'): string => (tab === 'rules' ? '#notes' : `#notes/${tab}`);
