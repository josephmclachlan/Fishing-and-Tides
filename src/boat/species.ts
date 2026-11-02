/** Offshore target species for the catch log (PLAN 4.6). Names are i18n keys `boat.sp.<id>`. */
export const BOAT_SPECIES = ['mahi', 'wahoo', 'kingfish', 'tuna', 'sailfish', 'other'] as const;
export type BoatSpecies = (typeof BOAT_SPECIES)[number];
