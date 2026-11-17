/**
 * The one catalogue of fish kinds (PLAN 7.149): every kind the map, the forecast and the catch log know, shore
 * (fishing/species.ts) and boat (fishing/offshore.ts), with the species it covers, so the map, the forecast and the
 * species guide work from the same list. From it come the species looked up in OBIS and GBIF (PLAN 4.7), the shared
 * species base (species/base.gen.ts), the guide's "Show on map" and the guide links, and the catch log's species.
 * The order is the catch log's order: shore kinds first, then boat kinds.
 * No imports: the data scripts load it directly with Node.
 */
export interface KindEntry {
  /** Scientific names of the species of this kind (edible species recorded on this coast, docs/FISHING.md). */
  readonly taxa: readonly string[];
  /** The guide search that lists the kind's species (Latin, so it works in both languages). */
  readonly search: string;
  /** Not a fish (by hand, or squid): the guide link searches every edible species, not only fish. */
  readonly notFish?: true;
  /** false: release-only sport fish, left out of the catch log (old pins still show). */
  readonly log?: false;
}

export const KINDS = {
  snook: { taxa: ['Centropomus undecimalis', 'Centropomus parallelus', 'Centropomus ensiferus', 'Centropomus pectinatus'], search: 'Centropomus' },
  // Jurel: crevalle, horse-eye, bar jack and blue runner (the jacks sold as jurel here; true jack mackerel, Trachurus, does not occur on this coast).
  jack: { taxa: ['Caranx hippos', 'Caranx latus', 'Caranx ruber', 'Caranx crysos', 'Caranx bartholomaei'], search: 'Caranx' },
  // Yellowtail (rabirrubia) and mahogany snapper added with PLAN 7.121: both eaten here and recorded on this coast.
  snapper: { taxa: ['Lutjanus cyanopterus', 'Lutjanus jocu', 'Lutjanus griseus', 'Lutjanus analis', 'Lutjanus apodus', 'Lutjanus synagris', 'Lutjanus mahogoni', 'Ocyurus chrysurus'], search: 'Lutjanus' },
  mackerel: { taxa: ['Scomberomorus brasiliensis', 'Scomberomorus regalis'], search: 'Scomberomorus' },
  // Small reef groupers only: goliath (Epinephelus itajara, reportedly protected) and Nassau (E. striatus, endangered) are left out.
  grouper: { taxa: ['Cephalopholis cruentata', 'Cephalopholis fulva', 'Epinephelus guttatus', 'Epinephelus adscensionis', 'Epinephelus morio', 'Mycteroperca bonaci'], search: 'Epinephelidae' },
  // Grunts (PLAN 7.121): the ronco and burro species the species guide marks as eaten on this coast.
  grunt: { taxa: ['Haemulon carbonarium', 'Haemulon macrostomum', 'Haemulon flavolineatum', 'Haemulon sciurus', 'Haemulon plumierii', 'Haemulon bonariense', 'Haemulon parra', 'Haemulon aurolineatum', 'Anisotremus virginicus', 'Anisotremus surinamensis'], search: 'Haemulidae' },
  // Surf and sand fish (PLAN 7.122): pompano and palometa.
  pompano: { taxa: ['Trachinotus carolinus', 'Trachinotus goodei'], search: 'Trachinotus' },
  // River-plume fish (PLAN 7.124): corvina (weakfish) and mullet (lisa).
  // Corvina here is the market name for the drums and croakers of soft bottom off the river mouths (PLAN 7.147 added them).
  corvina: { taxa: ['Cynoscion virescens', 'Cynoscion jamaicensis', 'Micropogonias furnieri', 'Larimus breviceps', 'Isopisthus parvipinnis', 'Bairdiella ronchus', 'Umbrina broussonnetii', 'Menticirrhus americanus'], search: 'Sciaenidae' },
  mullet: { taxa: ['Mugil curema', 'Mugil liza'], search: 'Mugil' },
  // Well-recorded eating fish from the species guide (PLAN 7.147): mojarras, goatfish and reef squid for EAT, and the
  // spear targets peacock flounder, squirrelfish and spadefish.
  mojarra: { taxa: ['Gerres cinereus', 'Eugerres plumieri', 'Diapterus auratus', 'Diapterus rhombeus', 'Eucinostomus melanopterus', 'Eucinostomus argenteus', 'Eucinostomus gula'], search: 'Gerreidae' },
  goatfish: { taxa: ['Mulloidichthys martinicus', 'Pseudupeneus maculatus'], search: 'Mullidae' },
  squid: { taxa: ['Sepioteuthis sepioidea'], search: 'Sepioteuthis', notFish: true },
  flounder: { taxa: ['Bothus lunatus'], search: 'Bothus lunatus' },
  squirrelfish: { taxa: ['Holocentrus adscensionis', 'Holocentrus rufus'], search: 'Holocentrus' },
  spadefish: { taxa: ['Chaetodipterus faber'], search: 'Chaetodipterus' },
  // SPORT (PLAN 7.122, 7.123): barracuda, permit (also EAT), bonefish, tarpon; lionfish is the invasive one to take.
  barracuda: { taxa: ['Sphyraena barracuda'], search: 'Sphyraena' },
  lionfish: { taxa: ['Pterois volitans', 'Pterois miles'], search: 'Pterois' },
  permit: { taxa: ['Trachinotus falcatus'], search: 'Trachinotus falcatus' },
  bonefish: { taxa: ['Albula vulpes', 'Albula nemoptera'], search: 'Albula' },
  tarpon: { taxa: ['Megalops atlanticus'], search: 'Megalops' },
  // By hand (PLAN 7.125).
  lobster: { taxa: ['Panulirus argus', 'Panulirus guttatus'], search: 'Panulirus', notFish: true },
  octopus: { taxa: ['Octopus insularis', 'Octopus briareus'], search: 'Octopus', notFish: true },
  cigua: { taxa: ['Cittarium pica'], search: 'Cittarium', notFish: true },
  // Boat kinds (fishing/offshore.ts). Silk snapper (pargo seda), the deep hand-line snapper of the boat set (PLAN 7.17).
  silksnapper: { taxa: ['Lutjanus vivanus'], search: 'Lutjanus vivanus' },
  mahi: { taxa: ['Coryphaena hippurus'], search: 'Coryphaena' },
  wahoo: { taxa: ['Acanthocybium solandri'], search: 'Acanthocybium' },
  kingfish: { taxa: ['Scomberomorus cavalla'], search: 'Scomberomorus cavalla' },
  tuna: { taxa: ['Thunnus atlanticus', 'Thunnus albacares'], search: 'Thunnus' },
  sailfish: { taxa: ['Istiophorus albicans'], search: 'Istiophorus', log: false },
  marlin: { taxa: ['Makaira nigricans'], search: 'Makaira', log: false },
} as const satisfies Record<string, KindEntry>;
export type KindId = keyof typeof KINDS;
export const KIND_IDS = Object.keys(KINDS) as KindId[];

/** Species names to look up in OBIS and GBIF, and to build the species base from, by kind id. */
export const OCCURRENCE_TAXA: Readonly<Record<string, readonly string[]>> = Object.fromEntries(KIND_IDS.map((k) => [k, KINDS[k].taxa]));

/** The catch log's species: every kind but release-only sport fish, then "other" (i18n keys `fish.<id>`). */
export const LOG_SPECIES: readonly (KindId | 'other')[] = [...KIND_IDS.filter((k) => (KINDS[k] as KindEntry).log !== false), 'other'];

/** The kind a species (by scientific name) belongs to, or null when no kind covers it. */
export function kindForSci(sci: string): KindId | null {
  const s = sci.trim().toLowerCase();
  return KIND_IDS.find((k) => KINDS[k].taxa.some((n) => n.toLowerCase() === s)) ?? null;
}

/** The published file (public/data/fishing/occurrences.json). */
export interface OccurrenceFile {
  fetchedAt: string;
  /** [west, south, east, north] searched. */
  box: [number, number, number, number];
  sources: string[];
  /** Per species id: [lng, lat, year or null]. */
  species: Record<string, [number, number, number | null][]>;
}
