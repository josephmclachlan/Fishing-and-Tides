/** Species names to look up in OBIS and GBIF (PLAN 4.7), by our species id (shore/kayak and boat). Edible fish only (docs/FISHING.md, eating-fish audit). No imports: the build script loads it directly. */
export const OCCURRENCE_TAXA: Record<string, string[]> = {
  snook: ['Centropomus undecimalis', 'Centropomus parallelus', 'Centropomus ensiferus'],
  // Jurel: crevalle, horse-eye, bar jack and blue runner (the jacks sold as jurel here; true jack mackerel, Trachurus, does not occur on this coast).
  jack: ['Caranx hippos', 'Caranx latus', 'Caranx ruber', 'Caranx crysos'],
  // Yellowtail (rabirrubia) and mahogany snapper added with PLAN 7.121: both eaten here and recorded on this coast.
  snapper: ['Lutjanus cyanopterus', 'Lutjanus jocu', 'Lutjanus griseus', 'Lutjanus analis', 'Lutjanus apodus', 'Lutjanus synagris', 'Lutjanus mahogoni', 'Ocyurus chrysurus'],
  mackerel: ['Scomberomorus brasiliensis', 'Scomberomorus regalis'],
  // Small reef groupers only: goliath (Epinephelus itajara, reportedly protected) and Nassau (E. striatus, endangered) are left out.
  grouper: ['Cephalopholis cruentata', 'Cephalopholis fulva', 'Epinephelus guttatus', 'Epinephelus adscensionis', 'Epinephelus morio', 'Mycteroperca bonaci', 'Mycteroperca tigris'],
  // Grunts (PLAN 7.121): the ronco and burro species the species guide marks as eaten on this coast.
  grunt: ['Haemulon carbonarium', 'Haemulon macrostomum', 'Haemulon flavolineatum', 'Haemulon sciurus', 'Haemulon plumierii', 'Haemulon bonariense', 'Haemulon parra', 'Haemulon aurolineatum', 'Anisotremus virginicus', 'Anisotremus surinamensis'],
  // Surf and sand fish (PLAN 7.122): pompano and palometa (EAT), permit and bonefish (SPORT).
  pompano: ['Trachinotus carolinus', 'Trachinotus goodei'],
  permit: ['Trachinotus falcatus'],
  bonefish: ['Albula vulpes', 'Albula nemoptera'],
  barracuda: ['Sphyraena barracuda'],
  lionfish: ['Pterois volitans', 'Pterois miles'],
  mahi: ['Coryphaena hippurus'],
  wahoo: ['Acanthocybium solandri'],
  kingfish: ['Scomberomorus cavalla'],
  tuna: ['Thunnus atlanticus', 'Thunnus albacares'],
  sailfish: ['Istiophorus albicans'],
  // SPORT (PLAN 7.123).
  tarpon: ['Megalops atlanticus'],
  marlin: ['Makaira nigricans'],
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
