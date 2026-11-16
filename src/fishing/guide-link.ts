/**
 * Where the fishing model and the species guide meet. The model works on the kinds of fish in fishing/species.ts
 * (snook, jack, snapper, mackerel, grouper, grunt, pompano; barracuda, permit, bonefish for sport; lionfish); the guide has a page per species. `fishKindFor` says which kind a guide species
 * belongs to (so its page can show it on the fish map), and `guideSearchFor` is the guide search that lists a kind's
 * species (so "Likely catch" can link to them). Latin names, so the search works in both languages.
 */
import { OCCURRENCE_TAXA } from './occurrence-taxa';
import type { SpeciesId } from './species';

const KINDS: readonly SpeciesId[] = ['snook', 'jack', 'snapper', 'mackerel', 'grouper', 'grunt', 'pompano', 'barracuda', 'lionfish', 'permit', 'bonefish'];

/** The model kind a species (by scientific name) belongs to, or null when the fish map has no zone for it. */
export function fishKindFor(sci: string): SpeciesId | null {
  const s = sci.trim().toLowerCase();
  return KINDS.find((k) => OCCURRENCE_TAXA[k]?.some((n) => n.toLowerCase() === s)) ?? null;
}

/** The guide search that lists a kind's species. */
export const GUIDE_SEARCH: Record<SpeciesId, string> = {
  snook: 'Centropomus',
  jack: 'Caranx',
  snapper: 'Lutjanus',
  mackerel: 'Scomberomorus',
  grouper: 'Serranidae',
  grunt: 'Haemulidae',
  pompano: 'Trachinotus carolinus',
  permit: 'Trachinotus falcatus',
  bonefish: 'Albula',
  barracuda: 'Sphyraena',
  lionfish: 'Pterois',
};

/** The guide link for a kind: the edible list of fish, searched. */
export const guideLinkFor = (k: SpeciesId): string => `#guide/edible-fish?q=${encodeURIComponent(GUIDE_SEARCH[k])}`;
