/**
 * The DISPATCH page's own link (fish handling: killing, bleeding and cooling a catch): `#dispatch` or
 * `#dispatch/<section>` to scroll straight to a part of it. Pure, so the parsing is tested without a DOM. Any other
 * hash is not this page's: it hides and the forecast or the map takes over.
 */
export const DP_SECTIONS = ['chart', 'methods', 'mistakes', 'science', 'histamine', 'routine', 'sources'] as const;
export type DpSection = (typeof DP_SECTIONS)[number];
export const isDpSection = (v: unknown): v is DpSection => typeof v === 'string' && (DP_SECTIONS as readonly string[]).includes(v);

export const DISPATCH_HASH = '#dispatch';

/** The section a link names, null for the top; null overall for any other page's hash. */
export function parseDispatchRoute(hash: string): { section: DpSection | null } | null {
  const m = /^#dispatch(?:\/([^/]*))?\/?$/.exec(hash);
  if (!m) return null;
  return { section: isDpSection(m[1]) ? m[1] : null };
}

export const dispatchHash = (section?: DpSection | null) => (section ? `${DISPATCH_HASH}/${section}` : DISPATCH_HASH);
