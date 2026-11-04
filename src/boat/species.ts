/**
 * Species for the catch log (PLAN 4.6, 7.16): the shore and kayak species the fishing layer scores
 * (ids match fishing/species.ts, so their catches feed its fit), then the offshore ones. Eating fish
 * only (sailfish dropped: release-only sport fish; old sailfish pins still show). Names are
 * i18n keys `boat.sp.<id>`.
 */
export const BOAT_SPECIES = ['snook', 'jack', 'snapper', 'mackerel', 'grouper', 'barracuda', 'lionfish', 'silksnapper', 'mahi', 'wahoo', 'kingfish', 'tuna', 'other'] as const;
export type BoatSpecies = (typeof BOAT_SPECIES)[number];
