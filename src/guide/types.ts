/**
 * SPECIES GUIDE (PLAN 7.91): the shape of the guide's data and the words for its fixed values.
 *
 * The data is researched per species (docs/GUIDE.md): one file per species in public/data/guide/sp/<id>.json, the
 * `Species` below, and one index of every species for the list, filters and search, public/data/guide/index.json,
 * built from them (index-build.ts, `npm run data:guide`). Every text a reader sees comes in English and Costa Rican
 * Spanish (`Txt`). The words for the fixed values live here, beside the values, in both languages.
 */

export type Lang = 'en' | 'es';
/** A text in both languages. */
export interface Txt { en: string; es: string }
export const tx = (t: Txt | undefined, l: Lang): string => (t ? t[l] || t.en : '');

export const GROUPS = [
  'fish', 'sharks-rays', 'crustaceans', 'cephalopods', 'molluscs', 'echinoderms', 'jellies-anemones', 'corals',
  'sponges-worms', 'reptiles-mammals', 'seabirds', 'plants-algae',
] as const;
export type Group = (typeof GROUPS)[number];
export const isGroup = (v: unknown): v is Group => typeof v === 'string' && (GROUPS as readonly string[]).includes(v);

export const HABITATS = ['reef', 'rock', 'seagrass', 'sand', 'rubble', 'mangrove', 'estuary', 'beach', 'open-water', 'offshore', 'deep', 'drift'] as const;
export type Habitat = (typeof HABITATS)[number];
export const ENCOUNTERS = ['snorkel', 'dive', 'shore-fishing', 'boat-fishing', 'spear', 'shore-walk'] as const;
export type Encounter = (typeof ENCOUNTERS)[number];
export const TIMES = ['day', 'twilight', 'night'] as const;
export type When = (typeof TIMES)[number];
/** How often a person here meets it, most often first. */
export const SEEN = ['common', 'frequent', 'occasional', 'rare', 'records'] as const;
export type Seen = (typeof SEEN)[number];
export const EDIBLE = ['yes', 'caution', 'no', 'toxic', 'protected'] as const;
export type Edible = (typeof EDIBLE)[number];
export const METHODS = ['handline', 'rod', 'bottom', 'troll', 'jig', 'fly', 'cast-net', 'spear', 'by-hand', 'trap', 'net'] as const;
export type Method = (typeof METHODS)[number];
export const RISKS = ['ciguatera', 'scombroid', 'tetrodotoxin', 'parasites', 'shellfish-poisoning', 'spines', 'mercury', 'other'] as const;
export type Risk = (typeof RISKS)[number];
export const KINDS = ['venom', 'sting', 'bite', 'spines', 'shock', 'toxic-to-eat', 'skin-toxin', 'irritant', 'aggressive'] as const;
export type DangerKind = (typeof KINDS)[number];
export const CLEANS = [
  'fillet-round', 'whole-small', 'steak-large', 'skin-tough', 'lionfish', 'flatfish', 'eel', 'shark', 'ray-wing',
  'lobster', 'crab', 'shrimp', 'octopus', 'squid', 'conch', 'bivalve', 'urchin', 'seaweed',
] as const;
export type CleanKey = (typeof CLEANS)[number];
export const MEASURES = ['TL', 'FL', 'SL', 'DW', 'CL', 'CW', 'ML', 'SH', 'D', 'H', 'L', 'WS'] as const;
export type Measure = (typeof MEASURES)[number];
export const VARIANTS = ['adult', 'juvenile', 'male', 'female', 'initial', 'terminal', 'night', 'colour-morph', 'breeding', 'shell', 'colony'] as const;
export type VariantKey = (typeof VARIANTS)[number];
export const IUCN = ['CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'] as const;
export type Iucn = (typeof IUCN)[number];

export interface Size { common?: number; max?: number; measure?: Measure; unit?: 'cm' | 'mm' | 'm' }
export interface Depth { min?: number; max?: number; usualMin?: number; usualMax?: number }
export interface Status { iucn?: Iucn; origin?: 'native' | 'introduced' | 'invasive'; protectedCR?: boolean; cites?: string }
export interface Taxon { phylum?: string; class?: string; order?: string; family?: string; genus?: string }
export interface Danger { kinds: DangerKind[]; level: 1 | 2 | 3; what?: Txt; firstAid?: Txt }

/** A licensed photo: from iNaturalist or Wikimedia Commons, with its author and licence (docs/GUIDE.md). */
export interface Photo {
  /** What it shows: the adult, a juvenile, a male, a night colour... */
  v?: VariantKey;
  /** The picture, about 500 px wide (remote, cached on the device once seen). */
  src: string;
  /** A larger one for wide screens, when there is one. */
  big?: string;
  /** Pixel size of `src`, so the layout does not jump. */
  w?: number;
  h?: number;
  /** The author's name as the source credits them. */
  by: string;
  /** The licence, e.g. "CC BY 4.0" or "CC0". */
  lic: string;
  /** The photo's own page, for the credit link. */
  page: string;
  from: 'inaturalist' | 'commons';
}

export interface Eat {
  quality?: number;
  local?: boolean;
  taste?: Txt;
  risks?: Risk[];
  riskNote?: Txt;
  rules?: Txt;
  rulesCheck?: boolean;
  methods?: Method[];
  bait?: Txt;
  lures?: Txt;
  tackle?: Txt;
  when?: Txt;
  where?: Txt;
  howTo?: Txt;
  spear?: Txt;
  clean?: CleanKey;
  cleanNotes?: Txt;
  cook?: Txt;
}

/** One species as researched (public/data/guide/sp/<id>.json). */
export interface Species {
  id: string;
  tier: 'full' | 'list';
  sci: string;
  author?: string;
  group: Group;
  sub: string;
  taxon: Taxon;
  familyName?: Txt;
  names?: { en?: string[]; es?: string[]; local?: string[] };
  status?: Status;
  seen?: Seen;
  evidence?: string[];
  size?: Size;
  weight?: { common?: number; max?: number; unit?: 'kg' | 'g' };
  depth?: Depth;
  habitats?: Habitat[];
  encounter?: Encounter[];
  seenAt?: When[];
  feedsAt?: When[];
  lifespan?: Txt;
  about?: Txt;
  idTips?: Txt;
  lookalikes?: { sci: string; tip: Txt }[];
  variants?: { key: VariantKey; text: Txt }[];
  diet?: Txt;
  predators?: Txt;
  behaviour?: Txt;
  reproduction?: Txt;
  where?: Txt;
  season?: Txt;
  edible?: Edible;
  edibleNote?: Txt;
  eat?: Eat;
  danger?: Danger;
  sources?: { t: string; u?: string }[];
  check?: Txt;
  /** List tier: the one-line note. */
  note?: Txt;
  photos?: Photo[];
}

/** One row of the index: what the list, the filters, search and grouping need, nothing more. */
export interface Entry {
  id: string;
  tier: 'full' | 'list';
  sci: string;
  group: Group;
  sub: string;
  order?: string;
  family?: string;
  genus?: string;
  familyName?: Txt;
  en: string[];
  es: string[];
  local?: string[];
  seen?: Seen;
  size?: Size;
  /** Usual depth band where people here meet it, else its full range. */
  depth?: [number, number];
  habitats?: Habitat[];
  encounter?: Encounter[];
  seenAt?: When[];
  feedsAt?: When[];
  edible?: Edible;
  quality?: number;
  methods?: Method[];
  risks?: Risk[];
  clean?: CleanKey;
  danger?: { kinds: DangerKind[]; level: 1 | 2 | 3 };
  iucn?: Iucn;
  origin?: 'native' | 'introduced' | 'invasive';
  protectedCR?: boolean;
  cites?: string;
  /** The bundled thumbnail (data/guide/img/<id>.webp) when there is a licensed photo. */
  thumb?: string;
  /** List tier: why it is only a record. */
  note?: Txt;
}

export interface GuideIndex {
  /** When the index was built (ms). */
  builtAt: number;
  count: number;
  entries: Entry[];
}

// ---------------------------------------------------------------- words

const W = (en: string, es: string): Txt => ({ en, es });

export const GROUP_WORDS: Record<Group, { name: Txt; short: Txt }> = {
  fish: { name: W('Fish', 'Peces'), short: W('Fish', 'Peces') },
  'sharks-rays': { name: W('Sharks and rays', 'Tiburones y rayas'), short: W('Sharks & rays', 'Tiburones y rayas') },
  crustaceans: { name: W('Crabs, lobsters and shrimps', 'Cangrejos, langostas y camarones'), short: W('Crustaceans', 'Crustáceos') },
  cephalopods: { name: W('Octopus and squid', 'Pulpos y calamares'), short: W('Octopus & squid', 'Pulpos y calamares') },
  molluscs: { name: W('Shells and sea slugs', 'Conchas y babosas de mar'), short: W('Shells & slugs', 'Conchas y babosas') },
  echinoderms: { name: W('Urchins, sea stars and sea cucumbers', 'Erizos, estrellas y pepinos de mar'), short: W('Urchins & stars', 'Erizos y estrellas') },
  'jellies-anemones': { name: W('Jellyfish, anemones and hydroids', 'Aguamalas, anémonas e hidroides'), short: W('Jellies & anemones', 'Aguamalas y anémonas') },
  corals: { name: W('Corals', 'Corales'), short: W('Corals', 'Corales') },
  'sponges-worms': { name: W('Sponges, worms and sea squirts', 'Esponjas, gusanos y ascidias'), short: W('Sponges & worms', 'Esponjas y gusanos') },
  'reptiles-mammals': { name: W('Turtles, crocodiles and mammals', 'Tortugas, cocodrilos y mamíferos'), short: W('Turtles & mammals', 'Tortugas y mamíferos') },
  seabirds: { name: W('Water birds', 'Aves acuáticas'), short: W('Water birds', 'Aves acuáticas') },
  'plants-algae': { name: W('Sea and shore plants, seaweeds', 'Plantas de mar y costa, algas'), short: W('Plants & seaweeds', 'Plantas y algas') },
};

/** Friendly subgroups in the order they are shown inside each group. */
export const SUB_WORDS: Record<string, Txt> = {
  // fish
  snappers: W('Snappers', 'Pargos'), grunts: W('Grunts', 'Roncadores'), porgies: W('Porgies', 'Plumas y sargos'),
  'drums-croakers': W('Drums and croakers', 'Corvinas y verrugatos'), tilefishes: W('Tilefishes', 'Blanquillos'), tripletail: W('Tripletail', 'Dormilona'),
  spadefishes: W('Spadefishes', 'Paguaras'),
  groupers: W('Groupers', 'Meros'), 'seabasses-hamlets': W('Sea basses and hamlets', 'Serranos y vaquitas'), soapfishes: W('Soapfishes', 'Peces jabón'),
  'scorpionfishes-lionfish': W('Scorpionfishes and lionfish', 'Peces escorpión y pez león'), searobins: W('Searobins', 'Rubios'), bigeyes: W('Bigeyes', 'Catalufas'),
  squirrelfishes: W('Squirrelfishes', 'Candiles'), 'flying-gurnards': W('Flying gurnards', 'Alones'), lizardfishes: W('Lizardfishes', 'Peces lagarto'), hawkfishes: W('Hawkfishes', 'Halcones'),
  'jacks-pompanos': W('Jacks and pompanos', 'Jureles y pámpanos'), remoras: W('Remoras', 'Rémoras'), cobia: W('Cobia', 'Cobia'), billfishes: W('Billfishes', 'Picudos'),
  dolphinfish: W('Dolphinfish', 'Dorados'), barracudas: W('Barracudas', 'Barracudas'),
  'tunas-mackerels': W('Tunas and mackerels', 'Atunes y macarelas'), 'cutlassfishes-escolars': W('Cutlassfishes and escolars', 'Sables y escolares'),
  'butterfishes-pomfrets': W('Butterfishes and pomfrets', 'Palometas y japutas'), needlefishes: W('Needlefishes', 'Agujones'), halfbeaks: W('Halfbeaks', 'Medios picos'),
  flyingfishes: W('Flyingfishes', 'Peces voladores'), 'oceanic-oddities': W('Ocean wanderers', 'Peces oceánicos'), 'deep-sea': W('Deep-sea fish', 'Peces de profundidad'),
  snooks: W('Snooks', 'Róbalos'), 'tarpon-ladyfish-bonefish': W('Tarpon, ladyfish and bonefish', 'Sábalo, machete y macabí'), mullets: W('Mullets', 'Lisas'),
  mojarras: W('Mojarras', 'Mojarras'), 'sea-catfishes': W('Sea catfishes', 'Bagres de mar'), threadfins: W('Threadfins', 'Barbudos'), chubs: W('Sea chubs', 'Chopas'),
  goatfishes: W('Goatfishes', 'Salmonetes'),
  parrotfishes: W('Parrotfishes', 'Peces loro'), 'wrasses-hogfish': W('Wrasses and hogfish', 'Doncellas y lábridos'), damselfishes: W('Damselfishes', 'Damiselas y sargentos'),
  surgeonfishes: W('Surgeonfishes', 'Cirujanos'), butterflyfishes: W('Butterflyfishes', 'Peces mariposa'), angelfishes: W('Angelfishes', 'Peces ángel'),
  basslets: W('Basslets', 'Grammas'), jawfishes: W('Jawfishes', 'Bocones'), cardinalfishes: W('Cardinalfishes', 'Cardenales'), sweepers: W('Sweepers', 'Barrenderos'),
  bonnetmouths: W('Bonnetmouths', 'Boquitas'), dragonets: W('Dragonets', 'Dragoncillos'),
  triggerfishes: W('Triggerfishes', 'Peces ballesta'), filefishes: W('Filefishes', 'Lijas'), 'boxfishes-cowfishes': W('Trunkfishes and cowfishes', 'Peces cofre y toritos'),
  puffers: W('Puffers', 'Tamboriles'), porcupinefishes: W('Porcupinefishes', 'Peces erizo'), spikefishes: W('Spikefishes', 'Peces espina'),
  morays: W('Moray eels', 'Morenas'), 'snake-eels': W('Snake eels', 'Anguilas serpiente'), 'conger-eels': W('Conger and garden eels', 'Congrios y anguilas jardín'),
  'river-eels': W('River eels', 'Anguilas de río'), 'seahorses-pipefishes': W('Seahorses and pipefishes', 'Caballitos de mar y peces pipa'),
  'trumpetfish-cornetfish': W('Trumpetfish and cornetfish', 'Peces trompeta y corneta'), toadfishes: W('Toadfishes', 'Peces sapo'),
  'frogfishes-batfishes': W('Frogfishes and batfishes', 'Peces rana y murciélago'),
  gobies: W('Gobies', 'Gobios'), sleepers: W('Sleepers', 'Guavinas'), blennies: W('Blennies', 'Blenios'), clingfishes: W('Clingfishes', 'Chupapiedras'),
  'cusk-eels-pearlfishes': W('Cusk-eels and pearlfishes', 'Brótulas y peces perla'),
  anchovies: W('Anchovies', 'Anchoas'), 'herrings-sardines': W('Herrings and sardines', 'Sardinas y arenques'), silversides: W('Silversides', 'Pejerreyes'),
  flounders: W('Flounders', 'Lenguados'), 'soles-tonguefishes': W('Soles and tonguefishes', 'Suelas y lenguas'), 'river-visitors': W('River visitors', 'Visitantes de río'),
  // sharks and rays
  'requiem-sharks': W('Requiem sharks', 'Tiburones réquiem'), hammerheads: W('Hammerheads', 'Tiburones martillo'), 'nurse-sharks': W('Nurse sharks', 'Tiburones gata'),
  'whale-shark': W('Whale shark', 'Tiburón ballena'), 'mackerel-thresher-sharks': W('Mako and thresher sharks', 'Marrajos y zorros'), 'other-sharks': W('Other sharks', 'Otros tiburones'),
  stingrays: W('Stingrays', 'Rayas'), 'river-stingrays': W('River stingrays', 'Rayas de río'), 'eagle-rays-cownose-rays': W('Eagle and cownose rays', 'Rayas águila y gavilán'),
  'mantas-devil-rays': W('Mantas and devil rays', 'Mantas y diablos'), 'electric-rays': W('Electric rays', 'Rayas eléctricas'),
  'sawfishes-guitarfishes': W('Sawfishes and guitarfishes', 'Peces sierra y guitarras'),
  // crustaceans
  'spiny-lobsters': W('Spiny lobsters', 'Langostas'), 'slipper-lobsters': W('Slipper lobsters', 'Langostas zapatilla'), shrimps: W('Shrimps', 'Camarones'),
  'river-shrimps': W('River shrimps', 'Camarones de río'), 'mantis-shrimps': W('Mantis shrimps', 'Camarones mantis'), 'swimming-crabs': W('Swimming crabs', 'Jaibas'),
  'reef-crabs': W('Reef crabs', 'Cangrejos de arrecife'), 'spider-crabs': W('Spider and decorator crabs', 'Cangrejos araña'), 'land-crabs': W('Land crabs', 'Cangrejos de tierra'),
  'ghost-mangrove-crabs': W('Ghost and mangrove crabs', 'Cangrejos fantasma y de manglar'), 'rock-crabs': W('Rock crabs', 'Cangrejos de roca'),
  'hermit-crabs': W('Hermit crabs', 'Cangrejos ermitaños'), 'mole-crabs': W('Mole crabs', 'Cangrejos topo'), barnacles: W('Barnacles', 'Balanos y percebes'),
  'isopods-others': W('Isopods and others', 'Isópodos y otros'),
  // cephalopods and sea slugs
  octopuses: W('Octopuses', 'Pulpos'), squids: W('Squids', 'Calamares'), 'deep-cephalopods': W('Deep-sea cephalopods', 'Cefalópodos de profundidad'),
  'sea-hares': W('Sea hares', 'Liebres de mar'), 'sap-sucking-slugs': W('Sap-sucking slugs', 'Babosas sacoglosas'), nudibranchs: W('Nudibranchs', 'Nudibranquios'),
  'bubble-snails': W('Bubble snails', 'Caracoles burbuja'), 'other-sea-slugs': W('Other sea slugs', 'Otras babosas de mar'),
  // shells
  conchs: W('Conchs', 'Cambutes'), 'helmets-tritons-tuns': W('Helmets, tritons and tuns', 'Cascos, tritones y toneles'),
  'cowries-flamingo-tongue': W('Cowries and flamingo tongue', 'Porcelanas y lengua de flamenco'), 'cone-snails-augers': W('Cones and augers', 'Conos y barrenas'),
  'murex-rock-snails': W('Murexes and rock snails', 'Múrices y caracoles de roca'), 'whelks-tulips-melongenas': W('Tulips and crown conchs', 'Tulipanes y coronas'),
  'olives-marginellas-doves': W('Olives, marginellas and doves', 'Olivas, marginelas y palomitas'), 'nerites-periwinkles': W('Nerites and periwinkles', 'Neritas y litorinas'),
  'limpets-keyhole-limpets': W('Limpets', 'Lapas'), 'turbans-top-snails': W('Turbans and top snails', 'Turbantes y trompos'),
  'ceriths-worm-snails': W('Ceriths and worm snails', 'Cerites y vermétidos'), 'moon-snails': W('Moon snails', 'Caracoles luna'),
  'violet-snails-drifters': W('Violet snails', 'Caracoles violeta'), 'other-snails': W('Other snails', 'Otros caracoles'),
  oysters: W('Oysters', 'Ostiones'), mussels: W('Mussels', 'Mejillones'), 'ark-clams': W('Ark clams', 'Arcas'), 'venus-clams': W('Venus clams', 'Almejas venus'),
  'tellins-donax': W('Tellins and coquinas', 'Tellinas y coquinas'), 'scallops-file-clams': W('Scallops and file clams', 'Vieiras y limas'), 'pen-shells': W('Pen shells', 'Hachas'),
  'jewel-boxes-thorny-oysters': W('Jewel boxes and thorny oysters', 'Chamas y ostras espinosas'), 'other-clams': W('Other clams', 'Otras almejas'),
  'shipworms-borers': W('Shipworms and borers', 'Bromas y perforadores'), chitons: W('Chitons', 'Quitones'), 'tusk-shells': W('Tusk shells', 'Colmillos de mar'),
  // echinoderms
  'sea-urchins': W('Sea urchins', 'Erizos de mar'), 'sand-dollars-heart-urchins': W('Sand dollars and heart urchins', 'Galletas de mar y erizos corazón'),
  'sea-stars': W('Sea stars', 'Estrellas de mar'), 'brittle-stars': W('Brittle stars', 'Estrellas frágiles'), 'sea-cucumbers': W('Sea cucumbers', 'Pepinos de mar'),
  'feather-stars': W('Feather stars', 'Lirios de mar'),
  // jellies and anemones
  jellyfish: W('Jellyfish', 'Aguamalas'), 'box-jellyfish': W('Box jellyfish', 'Cubomedusas'), 'drifters-siphonophores': W("Man o' war and drifters", 'Carabelas y flotadores'),
  hydroids: W('Hydroids', 'Hidroides'), 'sea-anemones': W('Sea anemones', 'Anémonas de mar'), 'zoanthids-corallimorphs': W('Zoanthids and corallimorphs', 'Zoántidos y coralimorfos'),
  'comb-jellies': W('Comb jellies', 'Ctenóforos'),
  // corals
  'branching-corals': W('Branching corals', 'Corales ramificados'), 'brain-corals': W('Brain corals', 'Corales cerebro'), 'star-corals': W('Star corals', 'Corales estrella'),
  'boulder-mound-corals': W('Boulder and mound corals', 'Corales masivos'), 'plate-lettuce-corals': W('Plate and lettuce corals', 'Corales de placa y lechuga'),
  'finger-pillar-corals': W('Finger and pillar corals', 'Corales dedo y pilar'), 'flower-cactus-corals': W('Flower and cactus corals', 'Corales flor y cactus'),
  'small-cup-corals': W('Small cup corals', 'Corales copa'), 'fire-corals': W('Fire corals', 'Corales de fuego'), 'lace-corals': W('Lace corals', 'Corales de encaje'),
  'black-corals': W('Black corals', 'Corales negros'), 'sea-fans': W('Sea fans', 'Abanicos de mar'), 'sea-rods-whips': W('Sea rods, plumes and whips', 'Varas, plumas y látigos de mar'),
  'soft-corals': W('Soft and encrusting corals', 'Corales blandos e incrustantes'),
  // sponges and worms
  sponges: W('Sponges', 'Esponjas'), 'bristle-worms': W('Bristle worms', 'Gusanos de fuego y poliquetos'), 'fan-worms': W('Fan and Christmas tree worms', 'Plumeros y árboles de Navidad'),
  flatworms: W('Flatworms', 'Planarias'), 'ribbon-worms': W('Ribbon worms', 'Nemertinos'), 'peanut-worms-spoon-worms': W('Peanut and spoon worms', 'Sipuncúlidos y equiuros'),
  'sea-squirts': W('Sea squirts', 'Ascidias'), 'salps-pyrosomes': W('Salps and pyrosomes', 'Salpas y pirosomas'), bryozoans: W('Bryozoans', 'Briozoos'),
  // reptiles, mammals and birds
  'sea-turtles': W('Sea turtles', 'Tortugas marinas'), crocodilians: W('Crocodile and caiman', 'Cocodrilo y caimán'), dolphins: W('Dolphins', 'Delfines'),
  whales: W('Whales', 'Ballenas'), manatee: W('Manatee', 'Manatí'), otters: W('Otters', 'Nutrias'), seals: W('Seals', 'Focas'),
  'shore-mammals': W('Shore mammals', 'Mamíferos de la costa'),
  'pelicans-boobies': W('Pelicans and boobies', 'Pelícanos y piqueros'), frigatebirds: W('Frigatebirds', 'Rabihorcados'),
  'terns-gulls-skimmers': W('Terns, gulls and skimmers', 'Pagazas, gaviotas y rayadores'), 'cormorants-anhingas': W('Cormorants and anhinga', 'Cormoranes y pato aguja'),
  'herons-egrets': W('Herons and egrets', 'Garzas'), 'ospreys-kingfishers': W('Osprey and kingfishers', 'Águila pescadora y martines pescadores'),
  shorebirds: W('Shorebirds', 'Aves playeras'), 'other-seabirds': W('Other water birds', 'Otras aves acuáticas'),
  // plants
  seagrasses: W('Seagrasses', 'Pastos marinos'), mangroves: W('Mangroves', 'Mangles'), 'coastal-plants': W('Shoreline plants', 'Plantas de playa y costa'),
  'green-algae': W('Green seaweeds', 'Algas verdes'), 'brown-algae': W('Brown seaweeds', 'Algas pardas'), sargassum: W('Sargassum', 'Sargazo'),
  'red-algae': W('Red seaweeds', 'Algas rojas'), 'coralline-algae': W('Coralline algae', 'Algas coralinas'), 'blue-green-algae': W('Cyanobacteria', 'Cianobacterias'),
};
/** The order subgroups are listed in: the order above. */
export const SUB_ORDER: readonly string[] = Object.keys(SUB_WORDS);

export const HABITAT_WORDS: Record<Habitat, Txt> = {
  reef: W('Reef', 'Arrecife'), rock: W('Rock', 'Roca'), seagrass: W('Seagrass', 'Pasto marino'), sand: W('Sand', 'Arena'), rubble: W('Rubble', 'Cascajo'),
  mangrove: W('Mangrove', 'Manglar'), estuary: W('River mouth', 'Desembocadura'), beach: W('Beach', 'Playa'), 'open-water': W('Open water', 'Aguas abiertas'),
  offshore: W('Offshore', 'Mar afuera'), deep: W('Deep water', 'Aguas profundas'), drift: W('Drifting', 'A la deriva'),
};
export const ENCOUNTER_WORDS: Record<Encounter, Txt> = {
  snorkel: W('Snorkel', 'Esnórquel'), dive: W('Dive', 'Buceo'), 'shore-fishing': W('Shore fishing', 'Pesca de orilla'), 'boat-fishing': W('Boat fishing', 'Pesca en bote'),
  spear: W('Spear', 'Arpón'), 'shore-walk': W('Beach walk', 'Caminata de costa'),
};
export const TIME_WORDS: Record<When, Txt> = { day: W('Day', 'Día'), twilight: W('Dawn and dusk', 'Amanecer y atardecer'), night: W('Night', 'Noche') };
export const SEEN_WORDS: Record<Seen, Txt> = {
  common: W('Common', 'Común'), frequent: W('Frequent', 'Frecuente'), occasional: W('Occasional', 'Ocasional'), rare: W('Rare', 'Raro'), records: W('Records only', 'Solo registros'),
};
export const EDIBLE_WORDS: Record<Edible, Txt> = {
  yes: W('Edible', 'Comestible'), caution: W('Edible with care', 'Comestible con cuidado'), no: W('Not eaten', 'No se come'),
  toxic: W('Poisonous to eat', 'Venenoso al comerlo'), protected: W('Protected: do not take', 'Protegido: no se toma'),
};
export const METHOD_WORDS: Record<Method, Txt> = {
  handline: W('Hand line', 'Cordel'), rod: W('Rod and reel', 'Caña'), bottom: W('Bottom fishing', 'Pesca de fondo'), troll: W('Trolling', 'Curricán'),
  jig: W('Jigging', 'Jigging'), fly: W('Fly', 'Mosca'), 'cast-net': W('Cast net', 'Atarraya'), spear: W('Spear', 'Arpón'), 'by-hand': W('By hand', 'A mano'),
  trap: W('Trap', 'Nasa'), net: W('Net', 'Red'),
};
export const RISK_WORDS: Record<Risk, Txt> = {
  ciguatera: W('Ciguatera', 'Ciguatera'), scombroid: W('Scombroid', 'Escombroide'), tetrodotoxin: W('Tetrodotoxin', 'Tetrodotoxina'), parasites: W('Parasites', 'Parásitos'),
  'shellfish-poisoning': W('Shellfish poisoning', 'Intoxicación por mariscos'), spines: W('Spines', 'Espinas'), mercury: W('Mercury', 'Mercurio'), other: W('Other risk', 'Otro riesgo'),
};
export const KIND_WORDS: Record<DangerKind, Txt> = {
  venom: W('Venomous', 'Venenoso'), sting: W('Stings', 'Urticante'), bite: W('Bites', 'Muerde'), spines: W('Sharp spines', 'Espinas'), shock: W('Electric shock', 'Descarga eléctrica'),
  'toxic-to-eat': W('Toxic to eat', 'Tóxico al comer'), 'skin-toxin': W('Toxic to touch', 'Tóxico al tocar'), irritant: W('Irritates skin', 'Irrita la piel'),
  aggressive: W('Can attack', 'Puede atacar'),
};
export const LEVEL_WORDS: Record<1 | 2 | 3, Txt> = {
  1: W('Painful', 'Doloroso'), 2: W('Serious: see a doctor', 'Serio: vaya al médico'), 3: W('Can kill', 'Puede matar'),
};
export const IUCN_WORDS: Record<Iucn, Txt> = {
  CR: W('Critically endangered', 'En peligro crítico'), EN: W('Endangered', 'En peligro'), VU: W('Vulnerable', 'Vulnerable'), NT: W('Near threatened', 'Casi amenazado'),
  LC: W('Least concern', 'Preocupación menor'), DD: W('Data deficient', 'Datos insuficientes'), NE: W('Not evaluated', 'No evaluado'),
};
export const VARIANT_WORDS: Record<VariantKey, Txt> = {
  adult: W('Adult', 'Adulto'), juvenile: W('Juvenile', 'Juvenil'), male: W('Male', 'Macho'), female: W('Female', 'Hembra'), initial: W('Initial phase', 'Fase inicial'),
  terminal: W('Terminal phase', 'Fase terminal'), night: W('At night', 'De noche'), 'colour-morph': W('Colour form', 'Forma de color'), breeding: W('Breeding', 'En reproducción'),
  shell: W('Shell', 'Concha'), colony: W('Colony', 'Colonia'),
};
export const MEASURE_WORDS: Record<Measure, Txt> = {
  TL: W('total length', 'largo total'), FL: W('fork length', 'largo a la horquilla'), SL: W('standard length', 'largo estándar'), DW: W('disc width', 'ancho del disco'),
  CL: W('carapace length', 'largo del caparazón'), CW: W('carapace width', 'ancho del caparazón'), ML: W('mantle length', 'largo del manto'),
  SH: W('shell length', 'largo de la concha'), D: W('across', 'de diámetro'), H: W('tall', 'de alto'), L: W('long', 'de largo'), WS: W('wingspan', 'de envergadura'),
};
