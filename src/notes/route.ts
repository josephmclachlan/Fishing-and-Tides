/**
 * The FIELD NOTES page's own link: `#notes[/<tab>][?for=<activity>]`. Pure, so parsing is tested without a DOM. Any other
 * hash is not this page's: it hides and the forecast, guide or map takes over (the same convention as #guide, #ciguatera
 * and #dispatch).
 *
 * With `?for=<activity>` the page is that activity's own field guide (Joseph 2026-11-16: "a field guide unique to each
 * activity, and the first items should be the most relevant ... and the last items the most general"): only its tabs,
 * most specific first, general last (ACT_TABS). Without it, every tab in the full order.
 */
export const NT_TABS = ['rules', 'surf', 'water', 'dive', 'aid', 'rigs', 'release', 'cook', 'seasons', 'words'] as const;
export type NtTab = (typeof NT_TABS)[number];
export const isNtTab = (v: unknown): v is NtTab => typeof v === 'string' && (NT_TABS as readonly string[]).includes(v);

export const NT_ACTS = ['fish', 'spear', 'surf', 'snorkel', 'dive', 'swim', 'sail'] as const;
export type NtAct = (typeof NT_ACTS)[number];
export const isNtAct = (v: unknown): v is NtAct => typeof v === 'string' && (NT_ACTS as readonly string[]).includes(v);

/** Each activity's tabs, most specific first, most general last. */
export const ACT_TABS: Record<NtAct, readonly NtTab[]> = {
  fish: ['rigs', 'release', 'rules', 'seasons', 'cook', 'water', 'aid', 'words'],
  spear: ['rules', 'rigs', 'seasons', 'cook', 'dive', 'water', 'aid', 'words'],
  surf: ['surf', 'water', 'aid', 'words'],
  snorkel: ['dive', 'water', 'aid', 'words'],
  dive: ['dive', 'water', 'aid', 'words'],
  swim: ['water', 'aid', 'words'],
  sail: ['water', 'aid', 'words'],
};

/** The tabs shown, in order: the activity's own, or all of them. */
export const tabsFor = (act?: NtAct): readonly NtTab[] => (act ? ACT_TABS[act] : NT_TABS);

export interface NtRoute {
  tab: NtTab;
  act?: NtAct;
}

export function parseNotesRoute(hash: string): NtRoute | null {
  const m = /^#notes(?:\/([^/?]*))?\/?(?:\?for=([a-z]+))?$/.exec(hash);
  if (!m) return null;
  const act = isNtAct(m[2]) ? m[2] : undefined;
  const tabs = tabsFor(act);
  const tab = isNtTab(m[1]) && tabs.includes(m[1]) ? m[1] : tabs[0];
  return act ? { tab, act } : { tab };
}

export function notesHash(tab?: NtTab, act?: NtAct): string {
  const first = tabsFor(act)[0];
  const t = tab ?? first;
  return `#notes${t === first ? '' : `/${t}`}${act ? `?for=${act}` : ''}`;
}
