/**
 * Ciguatera warnings for the fish the map and forecast model (shore kinds in species.ts, boat kinds in offshore.ts),
 * in one place so the map, the forecast, the BOAT drawer and the #ciguatera page agree. Pure: no DOM.
 *
 * Tiers, matched to the #ciguatera page's Species and size table (ciguatera/content.ts):
 *   never   red: no size is lower risk, do not eat (barracuda: CDC "never eat").
 *   high    red: a species of this kind is HIGH in the published record (horse-eye jack, cubera and dog snapper,
 *           large groupers). Eaten here every day, so the warning gives the size to keep, fish by fish.
 *   listed  amber: ciguatera reported for a species of this kind (FishBase, agency lists: king mackerel, cero,
 *           bar jack, grunts, permit, silk snapper), with the size to keep where the guide has one.
 *   rare    amber: toxin found but illness rarely reported (lionfish, wahoo).
 * The sizes come from the shared species base (species/base.gen.ts, the guide's research/cigua-size): published
 * sale limits (Cuba) or the research's estimates. Every one is "lower risk, not safe".
 */
import { BASE } from '../species/base.gen';
import type { BaseRow, CiguaRow } from '../species/build';
import { OCCURRENCE_TAXA } from '../species/kinds';

export type CiguaTier = 'never' | 'high' | 'listed' | 'rare';
/** Red for never and high, amber for the rest. */
export const isRed = (t: CiguaTier | undefined) => t === 'never' || t === 'high';

/** One species of a kind, with the size to keep (or none known, or do not eat). */
export interface CiguaSpecies { sci: string; en: string; es: string; size: CiguaRow }

/** The species of a kind (shore or boat id) that carry a ciguatera risk in the guide, in the kind's own order. */
export function ciguaSpecies(kind: string): CiguaSpecies[] {
  return (OCCURRENCE_TAXA[kind] ?? [])
    .map((sci) => BASE[sci])
    .filter((r): r is BaseRow => !!r && r.cigua)
    .map((r) => ({ sci: r.sci, en: r.en, es: r.es, size: r.size ?? { basis: 'none' } }));
}

/** The smallest length to keep among a kind's species (cm), or null when none has one: the forecast's one-line rule. */
export function strictestCm(kind: string): number | null {
  const cms = ciguaSpecies(kind).flatMap((s) => (s.size.cm ? [s.size.cm] : []));
  return cms.length ? Math.min(...cms) : null;
}
