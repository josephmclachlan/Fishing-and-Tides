/**
 * Where the fishing model and the species guide meet, both read from the one catalogue of kinds (species/kinds.ts):
 * shore kinds (fishing/species.ts) and boat kinds (fishing/offshore.ts). `fishKindFor` says which kind a guide species
 * belongs to (so its page can show it on the fish map), and `guideLinkFor` is the guide link for a kind (so "Likely
 * catch" can link to it): straight to the species page when the kind is one species, else the guide search that lists
 * its species. Latin names, so the search works in both languages.
 */
import { BASE } from '../species/base.gen';
import { KINDS, kindForSci, type KindEntry, type KindId } from '../species/kinds';
import { guideHash } from '../guide/route';

/** The kind a species (by scientific name) belongs to, or null when the fish map has no zone for it. */
export const fishKindFor = (sci: string): KindId | null => kindForSci(sci);

/** The guide search that lists a kind's species. */
export const GUIDE_SEARCH: Readonly<Record<KindId, string>> = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.search])) as Record<KindId, string>;

/** The guide link for a kind: its species page when it is one species, else the edible list of fish (or, for the by-hand catch and squid, every edible species), searched. */
export function guideLinkFor(k: KindId): string {
  const e: KindEntry = KINDS[k];
  const group = e.notFish ? null : 'fish';
  const only = e.taxa.length === 1 ? BASE[e.taxa[0]] : undefined;
  if (only) return guideHash({ mode: 'edible', group, id: only.id });
  return `#guide/${e.notFish ? 'edible' : 'edible-fish'}?q=${encodeURIComponent(e.search)}`;
}
