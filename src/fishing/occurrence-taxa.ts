/** Species names to look up in OBIS and GBIF (PLAN 4.7), by our species id (shore/kayak and boat). No imports: the build script loads it directly. */
export const OCCURRENCE_TAXA: Record<string, string[]> = {
  tarpon: ['Megalops atlanticus'],
  snook: ['Centropomus undecimalis', 'Centropomus parallelus', 'Centropomus ensiferus'],
  jack: ['Caranx hippos'],
  snapper: ['Lutjanus cyanopterus', 'Lutjanus jocu', 'Lutjanus griseus', 'Lutjanus analis', 'Lutjanus apodus', 'Lutjanus synagris'],
  barracuda: ['Sphyraena barracuda'],
  mahi: ['Coryphaena hippurus'],
  wahoo: ['Acanthocybium solandri'],
  kingfish: ['Scomberomorus cavalla'],
  tuna: ['Thunnus atlanticus', 'Thunnus albacares'],
  sailfish: ['Istiophorus albicans'],
};

/** The published file (public/data/fishing/occurrences.json). */
export interface OccurrenceFile {
  fetchedAt: string;
  /** [west, south, east, north] searched. */
  box: [number, number, number, number];
  sources: string[];
  /** Per species id: [lng, lat, year or null]. */
  species: Record<string, [number, number, number | null][]>;
}
