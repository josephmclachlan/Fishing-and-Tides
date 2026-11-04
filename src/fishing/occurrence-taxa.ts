/** Species names to look up in OBIS and GBIF (PLAN 4.7), by our species id (shore/kayak and boat). Edible fish only (docs/FISHING.md, eating-fish audit). No imports: the build script loads it directly. */
export const OCCURRENCE_TAXA: Record<string, string[]> = {
  snook: ['Centropomus undecimalis', 'Centropomus parallelus', 'Centropomus ensiferus'],
  // Jurel: crevalle, horse-eye, bar jack and blue runner (the jacks sold as jurel here; true jack mackerel, Trachurus, does not occur on this coast).
  jack: ['Caranx hippos', 'Caranx latus', 'Caranx ruber', 'Caranx crysos'],
  snapper: ['Lutjanus cyanopterus', 'Lutjanus jocu', 'Lutjanus griseus', 'Lutjanus analis', 'Lutjanus apodus', 'Lutjanus synagris'],
  mackerel: ['Scomberomorus brasiliensis', 'Scomberomorus regalis'],
  // Small reef groupers only: goliath (Epinephelus itajara, reportedly protected) and Nassau (E. striatus, endangered) are left out.
  grouper: ['Cephalopholis cruentata', 'Cephalopholis fulva', 'Epinephelus guttatus', 'Epinephelus adscensionis', 'Epinephelus morio', 'Mycteroperca bonaci', 'Mycteroperca tigris'],
  barracuda: ['Sphyraena barracuda'],
  lionfish: ['Pterois volitans', 'Pterois miles'],
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
