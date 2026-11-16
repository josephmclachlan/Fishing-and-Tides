/**
 * DISPATCH page text, both languages: why and how to kill, bleed and cool a fish (docs/DISPATCH.md). Every number
 * carries its sources (`src`: indices into SOURCES). A number with no source is an estimate and the page marks it EST.
 * Research notes: project files dispatch/research/ (science.md, methods.md).
 */
export type Lang = 'en' | 'es';
export interface Txt { en: string; es: string }
export const tr = (x: Txt, l: Lang) => x[l];
const W = (en: string, es: string): Txt => ({ en, es });

/** A statement with the sources behind it; none means the page's own estimate. */
export interface Fact { t: Txt; src?: number[] }

export interface Source { n: string; url: string; note?: Txt }
export const SOURCES: Source[] = [
  { n: 'FDA, Fish and Fishery Products Hazards and Controls Guidance, ch. 7 Scombrotoxin (histamine) formation, 2022', url: 'https://www.fda.gov/media/80637/download' },
  { n: 'Huss 1995, Quality and quality changes in fresh fish, FAO Fisheries Technical Paper 348, ch. 5 (rigor, pH, ATP)', url: 'https://www.fao.org/4/v7180e/v7180e06.htm' },
  { n: 'Huss 1995, ch. 6 (spoilage rates; Dalgaard and Huss 1994, tropical fish: ln(RRS) = 0.12 x T; shelf life in ice)', url: 'https://www.fao.org/4/v7180e/v7180e07.htm' },
  { n: 'Ando et al. 1996, Fisheries Science 62(5):796 (destroying the spinal cord delays rigor in yellowtail and red sea bream)', url: 'https://www.jstage.jst.go.jp/article/fishsci1994/62/5/62_5_796/_article/-char/en' },
  { n: 'Okamoto et al. 2006, Nippon Suisan Gakkaishi 72(5):918 (four ways of killing a grunt: spinal cord destruction slowest in ATP, IMP, K and rigor)', url: 'https://www.miyagi.kopas.co.jp/JSFS/jsfs-english/E-PUB/72-5/p918.html' },
  { n: 'Nofima, Bleeding and residual blood in fish (cod: most blood out in 3 min; fish that die unbled keep more)', url: 'https://nofima.com/worth-knowing/bleeding-and-residual-blood-in-fish/' },
  { n: 'Lin et al. 2016, J Food Drug Anal 24(2):305 (histamine in mahi-mahi at 4, 15, 25 and 37 °C)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9339573' },
  { n: 'Visciano et al. 2012, Front Microbiol 3:188 (review: histamine in mackerel, mahi, tuna by time and temperature)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3366335' },
  { n: 'Kyoto Prefecture fisheries report on flathead flounder (K 7 % against 17 % at 30 h with the spinal cord destroyed); read through a summary only, to verify', url: 'https://www.pref.kyoto.jp/kaiyo/documents/41-2.pdf' },
  { n: 'CRFM, Guide to Food Safety Hazards in Caribbean Fishery Products (scombrotoxin, ice at sea)', url: 'https://portal.crfm.int/it/dataset/9cce9a4b-a2b8-4a4b-bafa-5095c764be2a/resource/7585f3c9-f6a8-46e5-860f-d2a0863aa4a8/download/guide_to_food_safety_hazards_in_caribbean_fishery_products_sp._no._11.pdf' },
  { n: 'WOAH Aquatic Animal Health Code, ch. 7.3 (stunning and killing farmed fish: spiking, percussion; asphyxia and unstunned bleeding rated poor)', url: 'https://www.woah.org/fileadmin/Home/eng/Health_standards/aahc/current/chapitre_welfare_stunning_killing.pdf' },
  { n: 'AFTCO, The complete guide to ike jime (spike place, gill and tail cuts, wire, 1:1 slurry)', url: 'https://aftco.com/blogs/ocean-to-table/the-complete-guide-to-ike-jime' },
  { n: 'FAO, Chilling fish (ice slurry is the fastest chilling medium)', url: 'https://www.fao.org/4/y5013e/y5013e04.htm' },
  { n: 'Saito, Arai and Matsuyoshi 1959, Nippon Suisan Gakkaishi 24:749 (the K-value); bands 20 / 40 / 60 % from Japanese freshness guides (secondary)', url: 'https://www2.kaiyodai.ac.jp/~tomoaki/images/academic/2001.4.pdf' },
  { n: 'Segura and Campos 1990, Rev. Biol. Trop. (post-harvest losses in the Golfo Dulce, Pacific: poor icing in small boats; the only Costa Rican study found)', url: 'https://revistas.ucr.ac.cr/index.php/rbt/article/download/25439/25691/65226' },
];

// --- header
export const TITLE = W('Kill it. Bleed it. Ice it.', 'Mátalo. Desángralo. Ponle hielo.');
export const LEDE = W(
  'How a fish dies decides how it tastes and how long it keeps. Done right, the same snapper is still raw-fish fresh two days later. Done wrong, it is going off before you reach the beach.',
  'Cómo muere un pescado decide a qué sabe y cuánto aguanta. Bien hecho, el mismo pargo sigue fresco para comer crudo dos días después. Mal hecho, se está dañando antes de llegar a la playa.',
);

export interface Stat { n: string; unit: Txt; what: Txt; src?: number[] }
export const STATS: Stat[] = [
  { n: '25–30×', unit: W('faster spoiling', 'más rápido se daña'), what: W('Fish spoil about 25 to 30 times faster at 28 to 30 °C than on ice. Our shade is that hot.', 'El pescado se daña unas 25 a 30 veces más rápido a 28–30 °C que en hielo. Nuestra sombra está así de caliente.'), src: [2] },
  { n: '6 h', unit: W('to get it on ice', 'para ponerlo en hielo'), what: W('Tuna, mahi and mackerel need ice within 6 hours of dying in this heat, or a poison called histamine can build up and make people sick.', 'El atún, el dorado y la macarela necesitan hielo dentro de 6 horas de morir con este calor, o puede formarse un veneno llamado histamina que enferma.'), src: [1] },
  { n: '+6–12 h', unit: W('before it stiffens', 'antes de ponerse rígido'), what: W('After death a fish stiffens (rigor mortis), and fast stiffening ruins the texture. Destroying the spinal cord, as in ikejime, held it off 6 to 12 hours in yellowtail and red sea bream.', 'Después de morir el pescado se pone rígido (rigor mortis), y si es rápido arruina la textura. Destruir la médula, como en el ikejime, lo retrasó de 6 a 12 horas en la cola amarilla y el besugo rojo.'), src: [4] },
];

// --- the chart
export const CHART_H = W('Same fish. Same hour. Very different fish.', 'Mismo pescado. Misma hora. Pescado muy distinto.');
export const CHART_P = W(
  'Seven ways of handling the same fish, each as a bar of time since it died, left to right. The colour shows how good it is at that hour. Drag the black line, or tap a time.',
  'Siete formas de manejar el mismo pescado, cada una como una barra del tiempo desde que murió, de izquierda a derecha. El color muestra qué tan bueno está a esa hora. Arrastra la línea negra, o toca una hora.',
);
export const GRADES = {
  raw: W('Ceviche-fresh', 'Fresco para ceviche'),
  good: W('Fresh', 'Fresco'),
  ok: W('Cook it now', 'Cocínalo ya'),
  off: W('Spoiled', 'Dañado'),
} as const;
/** What each grade means, in the words of someone buying or cooking it. */
export const GRADE_KEY = {
  raw: W('Tastes freshly caught. Firm, clean, sweet. Fine for ceviche or raw.', 'Sabe a recién pescado. Firme, limpio, dulce. Bueno para ceviche o crudo.'),
  good: W('Still fresh. Cook it and it tastes great. Not for raw any more.', 'Todavía fresco. Cocinado sabe muy bien. Ya no es para comer crudo.'),
  ok: W('Flavour is fading and the flesh is going soft. Cook it today.', 'El sabor se apaga y la carne se pone blanda. Cocínalo hoy.'),
  off: W('Strong fishy smell, soft and sticky. Throw it out.', 'Olor fuerte a pescado, blando y pegajoso. Bótalo.'),
} as const;
export const GRADE_HELP = W(
  'How the grades are drawn: a freshness score used in fish science (the K-value) rises as the flesh breaks down. Under 20 % is ceviche-fresh, 20 to 40 % fresh, 40 to 60 % cook it now, over 60 % spoiled. These cut-offs are guides, not laws. A fish can make people sick from histamine (tuna, mahi, mackerel) even when it does not smell bad.',
  'Cómo se dibujan los grados: un puntaje de frescura usado en la ciencia del pescado (el valor K) sube conforme la carne se descompone. Menos de 20 % es fresco para ceviche, 20 a 40 % fresco, 40 a 60 % cocínalo ya, más de 60 % dañado. Estos cortes son guías, no leyes. Un pescado puede enfermar por histamina (atún, dorado, macarela) aunque no huela mal.',
);
export const ICE_LIMIT = W('Dashed line: 6 h after death', 'Línea punteada: 6 h después de morir');
export const ICE_LIMIT_KEY = W(
  'Tuna, mahi and mackerel must be on ice by this line (6 hours after they die, in our heat). Past it, a poison called histamine can build up that cooking does not remove and that does not smell.',
  'El atún, el dorado y la macarela deben estar en hielo antes de esta línea (6 horas después de morir, con nuestro calor). Después, puede formarse un veneno llamado histamina que cocinar no quita y que no huele.',
);
export const NOW_AT = W('Checked after', 'Revisado a las');
export const CHART_NOTE = W(
  'ESTIMATE. These curves are the page’s own model, drawn through a few measured points: K climbs about 0.4 % an hour on ice (Japanese flounder work), and fish spoil 25 to 30 times faster at 28 to 30 °C (Dalgaard and Huss). The starting K of each method is a judgement. Nothing was measured on Costa Rican fish. Real fish vary by species and size; the order of the bars is what to trust, not the exact hours.',
  'ESTIMACIÓN. Estas curvas son el modelo de la propia página, trazado por unos pocos puntos medidos: la K sube cerca de 0,4 % por hora en hielo (trabajos japoneses con lenguado), y el pescado se daña 25 a 30 veces más rápido a 28–30 °C (Dalgaard y Huss). La K de partida de cada método es una apreciación. No se midió nada en pescado de Costa Rica. Los peces varían por especie y tamaño; confía en el orden de las barras, no en las horas exactas.',
);

export interface MethodRow { id: 'ikejime' | 'stun-ice' | 'gill-shade' | 'hit-leave' | 'gut-nobleed' | 'suffocate' | 'suffocate-ice'; name: Txt; sub: Txt; good: boolean }
export const ROWS: MethodRow[] = [
  { id: 'ikejime', name: W('Spike, bleed, wire, ice slurry', 'Punzón, desangrado, alambre, hielo en agua'), sub: W('Ikejime, done within the minute', 'Ikejime, en menos de un minuto'), good: true },
  { id: 'stun-ice', name: W('Club or spike, bleed, ice', 'Garrote o punzón, desangrar, hielo'), sub: W('The simple way that works', 'La forma simple que funciona'), good: true },
  { id: 'gill-shade', name: W('Bled well, no ice', 'Bien desangrado, sin hielo'), sub: W('Good fish, hot boat', 'Buen pescado, lancha caliente'), good: false },
  { id: 'gut-nobleed', name: W('Gutted, not bled, no ice', 'Eviscerado, sin desangrar, sin hielo'), sub: W('Blood stays in the meat', 'La sangre se queda en la carne'), good: false },
  { id: 'hit-leave', name: W('Hit once and left, no ice', 'Un golpe y a la lancha, sin hielo'), sub: W('Stunned, not bled', 'Aturdido, no desangrado'), good: false },
  { id: 'suffocate', name: W('Left to die in the boat', 'Dejado morir en la lancha'), sub: W('Minutes of struggle, then the heat', 'Minutos de lucha, luego el calor'), good: false },
  { id: 'suffocate-ice', name: W('Left to die, iced 2 h later', 'Dejado morir, hielo 2 h después'), sub: W('Ice stops it getting worse, but it started badly', 'El hielo evita que empeore, pero ya empezó mal'), good: false },
];

// --- methods
export const METHODS_H = W('Four ways to do it right', 'Cuatro formas de hacerlo bien');
export const METHODS_P = W(
  'Pick the one you can do every time. A fast club and a gill cut beats a perfect ikejime you skip when the fish are biting.',
  'Escoge la que puedas hacer siempre. Un garrotazo rápido y un corte de agalla ganan a un ikejime perfecto que te saltas cuando pican.',
);
export interface Method { id: string; name: Txt; tag: Txt; steps: Txt[]; note?: Fact }
export const METHODS: Method[] = [
  {
    id: 'ikejime',
    name: W('Ikejime', 'Ikejime'),
    tag: W('Best flavour and keeping', 'Mejor sabor y duración'),
    steps: [
      W('Hold the fish still, wet cloth over the eyes. Get it out of the water and do it at once.', 'Sujeta el pescado quieto, con un trapo mojado en los ojos. Sácalo del agua y hazlo de una vez.'),
      W('Spike the brain: a sharp point just behind and above the eye, between the eye and the gill cover, angled in. The mouth opens and the body shivers once.', 'Punza el cerebro: una punta afilada justo detrás y arriba del ojo, entre el ojo y la tapa de la agalla, en ángulo hacia adentro. La boca se abre y el cuerpo tiembla una vez.'),
      W('Cut behind the gills on both sides, and the tail at its base, to open the big vessels.', 'Corta detrás de las agallas por los dos lados, y la cola en su base, para abrir los vasos grandes.'),
      W('Optional: run a thin wire down the spinal canal from the tail cut to the brain (shinkei-jime). It stops the twitching and spends no more ATP.', 'Opcional: pasa un alambre fino por el canal de la columna desde el corte de la cola hasta el cerebro (shinkei-jime). Detiene el temblor y no gasta más ATP.'),
      W('Bleed in a bucket of seawater, changing it until it runs clear, then straight into ice slurry.', 'Desangra en un balde de agua de mar, cambiándola hasta que salga clara, y luego directo al hielo en agua.'),
    ],
    note: { t: W('A sharp ice pick, awl or ground-down nail is enough: the spike must not bend. No exact spot works for every species, so practise on the first fish.', 'Un picahielo afilado, una lezna o un clavo afilado sirve: el punzón no debe doblarse. No hay un punto exacto para todas las especies, así que practica con el primer pescado.'), src: [12, 11] },
  },
  {
    id: 'club',
    name: W('Club, then cut', 'Garrote y corte'),
    tag: W('Quick, free, works on a rocking boat', 'Rápido, gratis, sirve en lancha movida'),
    steps: [
      W('One hard blow on top of the head, over the brain. Not the nose, not the gill cover.', 'Un golpe fuerte en lo alto de la cabeza, sobre el cerebro. No en la nariz ni en la tapa de la agalla.'),
      W('Check it worked: gill cover stops moving, the eye no longer rolls when you turn the fish.', 'Verifica que funcionó: la tapa de la agalla deja de moverse y el ojo ya no gira al voltear el pescado.'),
      W('Hit again if there is any doubt. A weak blow only stuns, and a stunned fish can wake up.', 'Golpea otra vez si hay duda. Un golpe flojo solo aturde, y un pescado aturdido puede despertar.'),
      W('Right away cut both gill arches, and bleed in seawater for three minutes or more.', 'De una vez corta los dos arcos de las agallas y desangra en agua de mar tres minutos o más.'),
      W('Into ice slurry.', 'Al hielo en agua.'),
    ],
    note: { t: W('The blow alone is the “hit and leave” mistake. The cut is what takes the blood out.', 'El golpe solo es el error de “pegarle y dejarlo”. El corte es lo que saca la sangre.'), src: [11] },
  },
  {
    id: 'bleed',
    name: W('Gill cut, bled in seawater', 'Corte de agalla, desangrado en agua de mar'),
    tag: W('Never skip it', 'Nunca te lo saltes'),
    steps: [
      W('After the blow or spike, slice through both gill arches (or the throat) with a sharp knife.', 'Tras el golpe o el punzón, corta los dos arcos de las agallas (o la garganta) con un cuchillo afilado.'),
      W('Drop the fish head down in a bucket of fresh seawater, or trail it on a line, so the heart pumps the blood out.', 'Echa el pescado con la cabeza hacia abajo en un balde de agua de mar limpia, o arrástralo en un cordel, para que el corazón bombee la sangre.'),
      W('Three minutes takes out most of the blood in the big arteries. Bleed at once: a fish that dies before it is bled keeps more blood.', 'Tres minutos sacan casi toda la sangre de las arterias grandes. Desangra de una vez: un pescado que muere antes de desangrarse retiene más sangre.'),
      W('Change the water if it turns red and warm.', 'Cambia el agua si se pone roja y caliente.'),
    ],
    note: { t: W('Bleeding with no stun first is hard on the fish and thrashes blood into the flesh. Stun first.', 'Desangrar sin aturdir antes maltrata al pescado y le mete sangre en la carne. Aturde primero.'), src: [6, 11] },
  },
  {
    id: 'slurry',
    name: W('Ice slurry', 'Hielo en agua'),
    tag: W('The step that saves tuna, mahi and mackerel', 'El paso que salva atún, dorado y macarela'),
    steps: [
      W('Fill the cooler with about half ice and half seawater, so it is near 0 °C. Water touches every part of the fish; plain ice leaves air gaps.', 'Llena la hielera con mitad hielo y mitad agua de mar, para que quede cerca de 0 °C. El agua toca todo el pescado; el hielo solo deja huecos de aire.'),
      W('Put the fish in as soon as it has bled. Keep it covered, in shade.', 'Mete el pescado apenas se desangre. Mantenlo cubierto y a la sombra.'),
      W('Big fish: pack ice into the belly too, and cut the gut out with a clean knife.', 'Pescado grande: mete también hielo en la panza y saca las tripas con un cuchillo limpio.'),
      W('Add ice as it melts. A fish that is cold but wet is fine; a fish that is warm and dry is not.', 'Echa hielo conforme se derrite. Un pescado frío y mojado está bien; uno caliente y seco, no.'),
    ],
    note: { t: W('Slurry cools fastest because water touches the whole fish. The 1:1 ratio is the usual advice; leave small fish in salty slurry for hours and salt gets into them.', 'El hielo en agua enfría más rápido porque el agua toca todo el pescado. La proporción 1:1 es el consejo habitual; deja pescado chico horas en agua salada y le entra sal.'), src: [13, 12] },
  },
];
/** Diagram labels for the spike, cuts and wire, matching ikejime's steps. */
export const DIAGRAM = {
  title: W('Where the spike and the cuts go', 'Dónde va el punzón y los cortes'),
  marks: [
    W('Spike: behind and above the eye', 'Punzón: detrás y arriba del ojo'),
    W('Cut behind the gills, both sides', 'Corte detrás de las agallas, ambos lados'),
    W('Cut at the base of the tail', 'Corte en la base de la cola'),
    W('Wire down the spine (optional)', 'Alambre por la columna (opcional)'),
  ] as Txt[],
};

// --- mistakes
export const MISTAKES_H = W('Four mistakes that cost you the fish', 'Cuatro errores que te cuestan el pescado');
export const MISTAKES_P = W(
  'All four are easy to stop. (No survey of how fish are handled on this coast was found; these are the usual ways fish are lost, not measured shares.)',
  'Los cuatro son fáciles de evitar. (No se encontró ninguna encuesta de cómo se maneja el pescado en esta costa; estas son las formas habituales de perder pescado, no porcentajes medidos.)',
);
export interface Mistake { id: string; name: Txt; what: Fact[]; fix: Txt }
export const MISTAKES: Mistake[] = [
  {
    id: 'suffocate',
    name: W('Letting it die in the boat', 'Dejarlo morir en la lancha'),
    what: [
      { t: W('A fish gasping on the boards fights for minutes. The fight burns its energy (ATP) and its stored sugar (glycogen) and floods the muscle with lactic acid.', 'Un pescado que boquea en el piso pelea por minutos. La pelea quema su energía (ATP) y su azúcar de reserva (glucógeno) y llena el músculo de ácido láctico.'), src: [2] },
      { t: W('Struggling fish go into rigor sooner and harder: the muscle pulls tight, the flesh splits (gaping) and comes out soft, pale and wet. A stressed cod at 30 °C started rigor in half an hour.', 'El pescado estresado entra antes y más fuerte en rigor: el músculo se tensa, la carne se abre (gaping) y queda blanda, pálida y aguada. Un bacalao estresado a 30 °C empezó el rigor en media hora.'), src: [2] },
      { t: W('Starting stale: the model puts this fish at going-off in under 5 hours in the shade.', 'Parte ya cansado: el modelo lo pone dañándose en menos de 5 horas a la sombra.') },
    ],
    fix: W('Kill it in seconds: spike or club, then bleed.', 'Mátalo en segundos: punzón o garrote, y a desangrar.'),
  },
  {
    id: 'hit-leave',
    name: W('Hitting it and leaving it', 'Pegarle y dejarlo'),
    what: [
      { t: W('A blow stops the thrashing, but nothing takes the blood out. Blood left in the flesh turns it dark and gives the metallic, “fishy” taste, and feeds bacteria.', 'El golpe detiene el pataleo, pero nada saca la sangre. La sangre que queda en la carne la oscurece, da el sabor metálico y a pescado y alimenta bacterias.'), src: [6] },
      { t: W('A weak blow only stuns. The fish can wake up and struggle on the boards, which is the first mistake all over again.', 'Un golpe débil solo aturde. El pescado puede despertar y pelear en el piso, que es el primer error otra vez.'), src: [11] },
    ],
    fix: W('After the blow, always cut the gills and bleed it in seawater.', 'Después del golpe, siempre corta las agallas y desangra en agua de mar.'),
  },
  {
    id: 'gut-nobleed',
    name: W('Gutting it without bleeding it', 'Eviscerarlo sin desangrarlo'),
    what: [
      { t: W('Gutting does not empty the muscle. Fish gutted without bleeding kept more blood in the fillet than fish bled first.', 'Eviscerar no vacía el músculo. El pescado eviscerado sin desangrar guardó más sangre en el filete que el desangrado primero.'), src: [6] },
      { t: W('Gutting does help against heat in one way: the gut is full of bacteria. FDA gives a gilled and gutted fish up to 12 hours to be on ice, not 6. It still has to reach the ice.', 'Eviscerar ayuda contra el calor en algo: las tripas están llenas de bacterias. La FDA da a un pescado sin agallas ni tripas hasta 12 horas para llegar al hielo, no 6. Pero igual tiene que llegar al hielo.'), src: [1] },
    ],
    fix: W('Bleed first, gut second, ice third.', 'Primero desangrar, luego eviscerar, luego hielo.'),
  },
  {
    id: 'no-ice',
    name: W('No ice', 'Sin hielo'),
    what: [
      { t: W('Bacteria multiply about 25 to 30 times faster at 28 to 30 °C than on ice.', 'Las bacterias se multiplican unas 25 a 30 veces más rápido a 28–30 °C que en hielo.'), src: [3] },
      { t: W('So a fish that keeps 10 to 14 days in ice is good for roughly 8 to 12 hours in a hot boat.', 'Así que un pescado que dura 10 a 14 días en hielo aguanta unas 8 a 12 horas en una lancha caliente.') },
      { t: W('They turn an odourless chemical in the flesh (TMAO) into TMA, the sharp “fish smell”, and make the sulphur smells of old fish.', 'Convierten una sustancia sin olor de la carne (TMAO) en TMA, el “olor a pescado” fuerte, y producen los olores a azufre del pescado viejo.'), src: [2] },
      { t: W('Tuna, mahi and mackerel make histamine as they warm. Cooking does not remove it.', 'El atún, el dorado y la macarela producen histamina al calentarse. Cocinar no la quita.'), src: [1] },
      { t: W('Poor icing was a named cause of fish losses in small boats using block ice in Costa Rica’s Golfo Dulce (Pacific, 1990): chunks laid beside the fish, not around it.', 'El mal uso del hielo fue una causa señalada de pérdidas en lanchas chicas con hielo en bloque en el Golfo Dulce de Costa Rica (Pacífico, 1990): trozos al lado del pescado, no alrededor.'), src: [15] },
    ],
    fix: W('Crush the ice, add seawater, cover the fish. Even bad ice beats none.', 'Muele el hielo, agrégale agua de mar y cubre el pescado. Hasta el hielo mal usado vale más que nada.'),
  },
];

// --- science
export const SCIENCE_H = W('What happens inside the fish', 'Qué pasa dentro del pescado');
export const SCIENCE_P = W(
  'A fish that dies calm and cold keeps its flavour. One that dies hard and warm runs through every one of these steps early.',
  'Un pescado que muere tranquilo y frío conserva su sabor. Uno que muere duro y caliente pasa temprano por cada uno de estos pasos.',
);
export interface Step { id: string; name: Txt; body: Fact[]; }
export const STEPS: Step[] = [
  {
    id: 'stress',
    name: W('1  Stress and burning the fuel', '1  Estrés y quemar el combustible'),
    body: [
      { t: W('Fighting and gasping use up the muscle’s ATP (energy) and glycogen (stored sugar). A fish that dies rested starts with a full tank.', 'Pelear y boquear gasta el ATP (energía) y el glucógeno (azúcar de reserva) del músculo. Un pescado que muere descansado empieza con el tanque lleno.'), src: [2] },
    ],
  },
  {
    id: 'acid',
    name: W('2  Lactic acid and pH drop', '2  Ácido láctico y caída del pH'),
    body: [
      { t: W('With no oxygen, the muscle burns glycogen into lactic acid, and the flesh turns acid. A stressed loach lost 0.5 pH in 3 hours; a rested one 0.1.', 'Sin oxígeno, el músculo quema glucógeno y hace ácido láctico, y la carne se acidifica. Un pez loach estresado perdió 0,5 de pH en 3 horas; uno descansado, 0,1.'), src: [2] },
      { t: W('Acid flesh holds less water and goes soft, pale and sticky. Tuna end at pH 5.4 to 5.6, mackerel 5.8 to 6.0, cod 6.1 to 6.5.', 'La carne ácida retiene menos agua y se vuelve blanda, pálida y pegajosa. El atún termina en pH 5,4 a 5,6, la macarela 5,8 a 6,0, el bacalao 6,1 a 6,5.'), src: [2] },
    ],
  },
  {
    id: 'rigor',
    name: W('3  Rigor mortis', '3  Rigor mortis'),
    body: [
      { t: W('When ATP falls from 7–10 µmol/g to about 1 or less, the muscle locks. In cod, stressed at 30 °C it starts at 0.5 h and is over in 1 to 2 hours. Unstressed at 0 °C it starts at 14 to 15 h and lasts 72 to 96 h.', 'Cuando el ATP baja de 7–10 µmol/g a cerca de 1 o menos, el músculo se traba. En bacalao, estresado a 30 °C empieza a las 0,5 h y termina en 1 a 2 horas. Sin estrés a 0 °C empieza a las 14–15 h y dura 72 a 96 h.'), src: [2] },
      { t: W('A fast rigor tears the flesh from its connective tissue: gaping, soft fillets. A blow to the head delayed rigor by up to 18 hours; destroying the spinal cord, 6 to 12 hours in yellowtail and red sea bream (but it came sooner in plaice, so species differ).', 'Un rigor rápido desprende la carne de su tejido conectivo: filetes abiertos y blandos. Un golpe a la cabeza retrasó el rigor hasta 18 horas; destruir la médula, 6 a 12 horas en la cola amarilla y el besugo rojo (pero llegó antes en la platija, así que las especies varían).'), src: [2, 4] },
      { t: W('We have no rigor timings for snapper, jack or snook at 28 °C. The page’s model assumes they behave like the species measured.', 'No tenemos tiempos de rigor para pargo, jurel o róbalo a 28 °C. El modelo de la página supone que se comportan como las especies medidas.') },
    ],
  },
  {
    id: 'blood',
    name: W('4  Blood', '4  Sangre'),
    body: [
      { t: W('Blood left in the flesh darkens it, tastes of iron and is food for bacteria. In cod, most blood left the big arteries within 3 minutes, and 30 minutes bled it hardly further.', 'La sangre que queda en la carne la oscurece, sabe a hierro y es comida para bacterias. En bacalao, casi toda la sangre salió de las arterias grandes en 3 minutos, y 30 minutos casi no la sacaron más.'), src: [6] },
      { t: W('Fish that die before they are bled, and fish gutted without bleeding, kept more blood. Blood pumped into the muscle by a hard struggle cannot be bled out.', 'Los peces que mueren antes de desangrarse, y los eviscerados sin desangrar, retuvieron más sangre. La sangre que una pelea dura mete en el músculo ya no se puede sacar.'), src: [6] },
    ],
  },
  {
    id: 'k',
    name: W('5  Flavour fades: the K-value', '5  El sabor se va: el valor K'),
    body: [
      { t: W('ATP breaks down to IMP, which is the savoury, umami taste of fresh fish, then to inosine and hypoxanthine, which are flat and slightly bitter. K is the share already past IMP. Spinal-cord destruction kept a flounder’s K at 7 % at 30 h against 17 % for a struggled one.', 'El ATP se degrada a IMP, que es el sabor sabroso, umami, del pescado fresco, y luego a inosina e hipoxantina, que son planas y algo amargas. La K es la parte que ya pasó el IMP. Destruir la médula mantuvo la K de un lenguado en 7 % a las 30 h contra 17 % de uno que luchó.'), src: [5, 9] },
    ],
  },
  {
    id: 'bacteria',
    name: W('6  Bacteria and the fishy smell', '6  Bacterias y el olor a pescado'),
    body: [
      { t: W('Live fish are sterile in the flesh. After death, bacteria from the gills, skin and gut spread. They turn TMAO into TMA, the fishy smell, and make sulphur compounds.', 'El pescado vivo tiene la carne estéril. Tras la muerte, las bacterias de las agallas, la piel y las tripas se extienden. Convierten el TMAO en TMA, el olor a pescado, y producen compuestos de azufre.'), src: [2] },
      { t: W('Tropical fish keep 6 to 35 days in ice (mackerel 14 to 18). Spoilage is 25 to 30 times faster at 28 to 30 °C, about 3 times faster for each 10 °C, so a day in the heat takes the place of a month on ice.', 'El pescado tropical dura 6 a 35 días en hielo (macarela 14 a 18). El deterioro es 25 a 30 veces más rápido a 28–30 °C, unas 3 veces más rápido por cada 10 °C, así que un día en el calor equivale a un mes en hielo.'), src: [3] },
    ],
  },
];

// --- histamine
export const HIST_H = W('Tuna, mahi, mackerel: the 6-hour rule', 'Atún, dorado, macarela: la regla de las 6 horas');
export const HIST_P = W(
  'These fish are full of histidine. Bacteria on the skin, gills and gut turn it into histamine once the fish warms up. Histamine is not destroyed by cooking, smoking, salting or freezing, and the fish does not have to smell bad.',
  'Estos peces tienen mucha histidina. Las bacterias de la piel, las agallas y las tripas la convierten en histamina cuando el pescado se calienta. La histamina no se destruye cocinando, ahumando, salando ni congelando, y el pescado no tiene que oler mal.',
);
export const HIST_SPECIES = W(
  'Tuna and bonito (atún, barrilete), mahi-mahi (dorado), mackerels (macarela, carite, sierra), wahoo (peto), marlin, and jacks can form it too.',
  'Atún y barrilete, mahi-mahi (dorado), macarelas (macarela, carite, sierra), peto, marlín y los jureles también pueden formarla.',
);
export interface Clock { h: number; label: Txt; src: number[] }
export const HIST_CLOCK: Clock[] = [
  { h: 6, label: W('Ice or 4.4 °C within 6 h of death when air or water is above 28.3 °C (our usual day)', 'Hielo o 4,4 °C dentro de 6 h de muerto cuando el aire o el agua pasan de 28,3 °C (nuestro día normal)'), src: [1] },
  { h: 9, label: W('Within 9 h when it is cooler', 'Dentro de 9 h cuando está más fresco'), src: [1] },
  { h: 12, label: W('Within 12 h if gilled and gutted first', 'Dentro de 12 h si se le quitan agallas y tripas antes'), src: [1] },
];
export const HIST_FACTS: Fact[] = [
  { t: W('Mahi-mahi at 25 °C reached 600 ppm in 12 hours. At 15 °C it reached 380 ppm in 24 hours. In ice at 4 °C, under 30 ppm even after 4 days (it had been inoculated with a histamine-forming bacterium).', 'El mahi-mahi a 25 °C llegó a 600 ppm en 12 horas. A 15 °C llegó a 380 ppm en 24 horas. En hielo a 4 °C, menos de 30 ppm aun después de 4 días (se le había inoculado una bacteria productora de histamina).'), src: [7] },
  { t: W('Mackerel held at 32 °C: 50 ppm after 12 hours, 100 ppm after 16 (a review of earlier studies).', 'Macarela a 32 °C: 50 ppm a las 12 horas, 100 ppm a las 16 (una revisión de estudios anteriores).'), src: [8] },
  { t: W('FDA’s guidance level is 50 ppm. Fish that made people ill were usually above 200 ppm and often above 500 ppm.', 'El nivel de guía de la FDA es 50 ppm. Los pescados que enfermaron a personas pasaban de 200 ppm y a menudo de 500 ppm.'), src: [1] },
  { t: W('Symptoms start minutes to a few hours after eating: flushed face, burning or peppery mouth, headache, hives, sweating, palpitations, stomach cramps, diarrhoea, sometimes wheeze. They last from 12 hours to a few days.', 'Los síntomas empiezan minutos a pocas horas después de comer: cara enrojecida, boca ardiente o picante, dolor de cabeza, ronchas, sudor, palpitaciones, cólicos, diarrea, a veces silbidos al respirar. Duran de 12 horas a unos días.'), src: [1] },
  { t: W('Breathing trouble, fainting or a racing heart: call 911 or get to the clinic. A sick table-mate is the warning to throw the rest away.', 'Dificultad para respirar, desmayo o corazón muy acelerado: llama al 911 o ve a la clínica. Que se enferme un compañero de mesa es el aviso para botar el resto.') },
  { t: W('Big tuna (over about 9 kg) heat up inside after death. Pack ice into the belly and the gill cavity, and do not leave a fish dead on a line.', 'El atún grande (más de unos 9 kg) se calienta por dentro después de morir. Mete hielo en la panza y en las agallas, y no dejes un pescado muerto en el cordel.'), src: [10, 1] },
];

// --- routine
export const ROUTINE_H = W('The five-step routine', 'La rutina de cinco pasos');
export const ROUTINE: { n: string; head: Txt; body: Txt }[] = [
  { n: '1', head: W('Kill', 'Matar'), body: W('Spike or club it, seconds after it is on board.', 'Con punzón o garrote, a los segundos de subirlo a bordo.') },
  { n: '2', head: W('Bleed', 'Desangrar'), body: W('Cut both gill arches. Head down in seawater, three minutes or more.', 'Corta los dos arcos de las agallas. Cabeza abajo en agua de mar, tres minutos o más.') },
  { n: '3', head: W('Ice', 'Hielo'), body: W('Slurry, about half ice and half seawater, within the hour. Never past 6 hours for tuna, mahi and mackerel.', 'Hielo en agua, mitad y mitad más o menos, dentro de la hora. Nunca más de 6 horas para atún, dorado y macarela.') },
  { n: '4', head: W('Clean', 'Limpiar'), body: W('Gut with a clean knife, rinse in clean cold water, keep the fish on ice while you work.', 'Eviscera con un cuchillo limpio, enjuaga en agua limpia y fría, mantén el pescado en hielo mientras trabajas.') },
  { n: '5', head: W('Keep cold', 'Mantener frío'), body: W('Cold and dry: on ice at the shop, in the fridge, or wrapped airtight in the freezer.', 'Frío y seco: en hielo en el local, en la nevera, o bien sellado en el congelador.') },
];

// --- footer
export const SOURCES_H = W('Sources and what is estimated', 'Fuentes y qué es estimado');
export const SOURCES_P = W(
  'Numbers with a [number] are from that source below. Numbers marked EST are this page’s own estimates. Bands for the K-value, the exact spike spot, bleed times and the ice mix are practical guidance, not laboratory standards. Several Japanese and Norwegian papers were read through summaries only. Costa Rican handling practice, ice price and any rule on ice or histamine aboard small boats were not found; ask a fish buyer or INCOPESCA. CHECK with a local fisherman and correct this page where it is wrong.',
  'Los números con [número] vienen de esa fuente abajo. Los marcados EST son estimaciones de esta página. Las bandas del valor K, el punto exacto del punzón, los tiempos de desangrado y la mezcla de hielo son guía práctica, no normas de laboratorio. Varios estudios japoneses y noruegos se leyeron solo por resúmenes. No se encontró la práctica de manejo en Costa Rica, el precio del hielo ni regla alguna sobre hielo o histamina en lanchas pequeñas; pregunta a un comprador de pescado o a INCOPESCA. CONSULTA con un pescador local y corrige esta página donde esté mal.',
);

export const SECTION_LABELS: Record<'chart' | 'methods' | 'mistakes' | 'science' | 'histamine' | 'routine' | 'sources', Txt> = {
  chart: W('Compare', 'Comparar'),
  methods: W('Methods', 'Métodos'),
  mistakes: W('Mistakes', 'Errores'),
  science: W('Science', 'Ciencia'),
  histamine: W('Histamine', 'Histamina'),
  routine: W('Routine', 'Rutina'),
  sources: W('Sources', 'Fuentes'),
};
