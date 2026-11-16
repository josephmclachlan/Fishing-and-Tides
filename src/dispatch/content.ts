/**
 * DISPATCH page text, both languages: why and how to kill, bleed and cool a fish (docs/DISPATCH.md). Every number
 * carries its sources (`src`: indices into SOURCES). A fact with `est` is the page’s own estimate and is marked “our estimate”.
 * Research notes: project files dispatch/research/ (science.md, methods.md).
 */
export type Lang = 'en' | 'es';
export interface Txt { en: string; es: string }
export const tr = (x: Txt, l: Lang) => x[l];
const W = (en: string, es: string): Txt => ({ en, es });

/** A statement with the sources behind it; none means the page's own estimate. */
export interface Fact { t: Txt; src?: number[]; /** True for a number or claim this page worked out itself: shown as “our estimate”. */ est?: boolean }
/** The mark after an estimate, in words. */
export const EST_MARK = W('(our estimate)', '(estimación nuestra)');

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
  { n: 'Kyoto Prefecture Marine Center 2019, flathead flounder kept at 4 to 5 °C (K 7 % against 17 % at 30 h with the spinal cord destroyed against the brainstem cut)', url: 'https://www.pref.kyoto.jp/kaiyo/documents/41-2.pdf' },
  { n: 'CRFM, Guide to Food Safety Hazards in Caribbean Fishery Products (scombrotoxin, ice at sea)', url: 'https://portal.crfm.int/it/dataset/9cce9a4b-a2b8-4a4b-bafa-5095c764be2a/resource/7585f3c9-f6a8-46e5-860f-d2a0863aa4a8/download/guide_to_food_safety_hazards_in_caribbean_fishery_products_sp._no._11.pdf' },
  { n: 'WOAH Aquatic Animal Health Code, ch. 7.3 (stunning and killing farmed fish: spiking, percussion; asphyxia and unstunned bleeding rated poor)', url: 'https://www.woah.org/fileadmin/Home/eng/Health_standards/aahc/current/chapitre_welfare_stunning_killing.pdf' },
  { n: 'AFTCO, The complete guide to ike jime (spike place, gill and tail cuts, wire, 1:1 slurry)', url: 'https://aftco.com/blogs/ocean-to-table/the-complete-guide-to-ike-jime' },
  { n: 'FAO, Chilling fish (ice slurry is the fastest chilling medium)', url: 'https://www.fao.org/4/y5013e/y5013e04.htm' },
  { n: 'Saito, Arai and Matsuyoshi 1959, Nippon Suisan Gakkaishi 24:749 (the K-value); bands 20 / 40 / 60 % from Japanese freshness guides (secondary)', url: 'https://www2.kaiyodai.ac.jp/~tomoaki/images/academic/2001.4.pdf' },
  { n: 'Segura and Campos 1990, Rev. Biol. Trop. (post-harvest losses in the Golfo Dulce, Pacific: poor icing in small boats; the only Costa Rican study found)', url: 'https://revistas.ucr.ac.cr/index.php/rbt/article/download/25439/25691/65226' },
  { n: 'US CDC Yellow Book, Food poisoning from marine toxins (scombroid: cause, symptoms, onset, duration, antihistamines, heat and freezing)', url: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/food-poisoning-from-marine-toxins.html' },
  { n: 'Tomioka and Endo 1984, Nippon Suisan Gakkaishi 50(5):889 (K-value rise at 0 °C in 14 fish species: 0.2 to 8.4 % a day)', url: 'https://www.jstage.jst.go.jp/article/suisan1932/50/5/50_5_889/_article/-char/ja' },
];

// --- header
export const TITLE = W('Kill it. Bleed it. Ice it.', 'Mátalo. Desángralo. Ponle hielo.');
export const LEDE = W(
  'How a fish dies decides how it tastes and how long it keeps. Done right, a snapper is still fresh enough for ceviche more than a day later. Done wrong, it is spoiled within about five hours. (These times are our estimate.)',
  'Cómo muere un pescado decide a qué sabe y cuánto aguanta. Bien hecho, un pargo sigue fresco para ceviche más de un día después. Mal hecho, está dañado en unas cinco horas. (Estos tiempos son una estimación nuestra.)',
);

export const STAT_TONE: Record<Stat['tone'], Txt> = { bad: W('Bad', 'Malo'), due: W('Deadline', 'Plazo'), good: W('Good', 'Bueno') };
export interface Stat { n: string; unit: Txt; what: Txt; src?: number[]; /** bad, a deadline or good news: red, amber or green. */ tone: 'bad' | 'due' | 'good' }
export const STATS: Stat[] = [
  { n: '25–30×', tone: 'bad', unit: W('faster spoiling', 'más rápido se daña'), what: W('Fish spoil about 25 to 30 times faster at 28 to 30 °C than on ice (0 °C, 32 °F). Our shade is that hot.', 'El pescado se daña unas 25 a 30 veces más rápido a 28–30 °C que en hielo (0 °C, 32 °F). Nuestra sombra está así de caliente.'), src: [2] },
  { n: '6 h', tone: 'due', unit: W('to get it on ice', 'para ponerlo en hielo'), what: W('Tuna, mahi and mackerel need ice (0 °C, 32 °F) within 6 hours of dying in this heat, or a poison called histamine can build up and make people sick.', 'El atún, el dorado y la macarela necesitan hielo (0 °C, 32 °F) dentro de 6 horas de morir con este calor, o puede formarse un veneno llamado histamina que enferma.'), src: [1] },
  { n: '6–12 h', tone: 'good', unit: W('later to stiffen', 'más tarde en ponerse rígido'), what: W('After death a fish stiffens (rigor mortis), and a fast, hard stiffening gives mushy fillets. In a Japanese test, yellowtail and red sea bream with the spinal cord destroyed, as in ikejime, took 6 to 12 hours longer to go fully stiff than fish without.', 'Después de morir el pescado se pone rígido (rigor mortis), y una rigidez rápida y fuerte deja filetes aguados. En una prueba japonesa, la cola amarilla y el besugo rojo con la médula destruida, como en el ikejime, tardaron de 6 a 12 horas más en ponerse del todo rígidos que los peces sin eso.'), src: [4] },
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
  raw: W('Tastes freshly caught: firm, clean, sweet. Fit for ceviche only if it was kept on ice from the start.', 'Sabe a recién pescado: firme, limpio, dulce. Sirve para ceviche solo si estuvo en hielo desde el principio.'),
  good: W('Still fresh. Cooked, it tastes great. Too old to eat raw.', 'Todavía fresco. Cocinado sabe muy bien. Ya está muy viejo para comerlo crudo.'),
  ok: W('The flavour is fading and the flesh is turning mushy. Cook it today.', 'El sabor se apaga y la carne se pone aguada. Cocínalo hoy.'),
  off: W('Strong fishy smell, mushy and sticky. Throw it out.', 'Olor fuerte a pescado, aguado y pegajoso. Bótalo.'),
} as const;
export const GRADE_HELP = W(
  'How the grades are drawn: a freshness score used in fish science rises as the flesh breaks down. Under 20 % is ceviche-fresh, 20 to 40 % fresh, 40 to 60 % cook it now, over 60 % spoiled. These cut-offs are guides, not laws. A fish can make people sick from histamine (tuna, mahi, mackerel) even when it does not smell bad.',
  'Cómo se dibujan los grados: un puntaje de frescura usado en la ciencia del pescado sube conforme la carne se descompone. Menos de 20 % es fresco para ceviche, 20 a 40 % fresco, 40 a 60 % cocínalo ya, más de 60 % dañado. Estos cortes son guías, no leyes. Un pescado puede enfermar por histamina (atún, dorado, macarela) aunque no huela mal.',
);
export const ICE_LIMIT = W('Dashed line: 6 h after death', 'Línea punteada: 6 h después de morir');
export const ICE_LIMIT_KEY = W(
  'Tuna, mahi and mackerel must be on ice (0 °C, 32 °F) by this line (6 hours after they die, in our heat). Past it, a poison called histamine can build up. Cooking does not remove it, and the fish may not smell bad.',
  'El atún, el dorado y la macarela deben estar en hielo (0 °C, 32 °F) antes de esta línea (6 horas después de morir, con nuestro calor). Después, puede formarse un veneno llamado histamina. Cocinar no la quita, y el pescado puede no oler mal.',
);
export const NOW_AT = W('Checked after', 'Revisado a las');
/** Under the chart title (graphics review D-3). */
export const CHART_SUB = W('A taste score, not a safety check', 'Un puntaje de sabor, no una prueba de seguridad');
/** Under the time axis (D-2): the axis is stretched at the start. */
export const AXIS_NOTE = W('Time since death. The first hours are stretched so you can see them: the first 6 hours take a third of each bar.', 'Tiempo desde la muerte. Las primeras horas están estiradas para que se vean: las primeras 6 horas ocupan un tercio de cada barra.');
export const CHART_NOTE = W(
  'ESTIMATE. These curves are modelled from fish-spoilage studies, and real fish vary by species and size, so trust the order of the bars, not the exact hours.',
  'ESTIMACIÓN. Estas curvas se modelan a partir de estudios del deterioro del pescado, y los peces varían según la especie y el tamaño, así que confía en el orden de las barras, no en las horas exactas.',
);

export interface MethodRow { id: 'ikejime' | 'stun-ice' | 'gill-shade' | 'hit-leave' | 'gut-nobleed' | 'suffocate' | 'suffocate-ice'; name: Txt; sub: Txt; good: boolean }
export const ROWS: MethodRow[] = [
  { id: 'ikejime', name: W('Spike, bleed, wire, ice slurry', 'Punzón, desangrado, alambre, hielo en agua'), sub: W('Ikejime, done within the minute', 'Ikejime, en menos de un minuto'), good: true },
  { id: 'stun-ice', name: W('Club or spike, bleed, ice', 'Garrote o punzón, desangrar, hielo'), sub: W('The simple way that works', 'La forma simple que funciona'), good: true },
  { id: 'gill-shade', name: W('Bled well, no ice', 'Bien desangrado, sin hielo'), sub: W('A well-bled fish in a hot boat', 'Un pescado bien desangrado en una lancha caliente'), good: false },
  { id: 'gut-nobleed', name: W('Gutted, not bled, no ice', 'Eviscerado, sin desangrar, sin hielo'), sub: W('Blood stays in the meat', 'La sangre se queda en la carne'), good: false },
  { id: 'hit-leave', name: W('Hit on the head, not bled, no ice', 'Golpe en la cabeza, sin desangrar, sin hielo'), sub: W('Stunned, not bled', 'Aturdido, no desangrado'), good: false },
  { id: 'suffocate', name: W('Left to die in the boat', 'Dejado morir en la lancha'), sub: W('Minutes of struggle, then the heat', 'Minutos de lucha, luego el calor'), good: false },
  { id: 'suffocate-ice', name: W('Left to die, iced 2 h later', 'Dejado morir, hielo 2 h después'), sub: W('Ice stops it getting worse, but it started badly', 'El hielo evita que empeore, pero ya empezó mal'), good: false },
];

// --- methods
export const METHODS_H = W('Four ways to do it right', 'Cuatro formas de hacerlo bien');
export const METHODS_P = W(
  'Pick the one you can do every time. A quick club and gill cut that you do on every fish is better than a perfect ikejime that you skip when the fish are biting.',
  'Escoge la que puedas hacer siempre. Un garrotazo rápido y un corte de agalla que haces en cada pescado valen más que un ikejime perfecto que te saltas cuando pican.',
);
export type MethodId = 'ikejime' | 'club' | 'bleed' | 'slurry';
export interface Method { id: MethodId; name: Txt; tag: Txt; /** What each number on the drawing points at. */ marks: Txt[]; steps: Txt[]; note?: Fact; /** An option for when the main way is not possible. */ alt?: Fact }
export const METHODS: Method[] = [
  {
    id: 'ikejime',
    name: W('Ikejime', 'Ikejime'),
    tag: W('Best flavour and keeping', 'Mejor sabor y duración'),
    marks: [
      W('Spike: behind and above the eye', 'Punzón: detrás y arriba del ojo'),
      W('Cut behind the gills, both sides', 'Corte detrás de las agallas, ambos lados'),
      W('Cut at the base of the tail', 'Corte en la base de la cola'),
      W('Wire down the spine (optional)', 'Alambre por la columna (opcional)'),
    ],
    steps: [
      W('Hold the fish still, wet cloth over the eyes. Get it out of the water and do it at once.', 'Sujeta el pescado quieto, con un trapo mojado en los ojos. Sácalo del agua y hazlo de una vez.'),
      W('Spike the brain: a sharp point just behind and above the eye, between the eye and the gill cover, pointing in toward the brain. The mouth opens and the body shivers once.', 'Punza el cerebro: una punta afilada justo detrás y arriba del ojo, entre el ojo y la tapa de la agalla, apuntando hacia adentro, hacia el cerebro. La boca se abre y el cuerpo tiembla una vez.'),
      W('Cut behind the gills on both sides, and the tail at its base, to open the big vessels.', 'Corta detrás de las agallas por los dos lados, y la cola en su base, para abrir los vasos grandes.'),
      W('Optional: run a thin wire down the spinal canal from the tail cut to the brain (called shinkei-jime). It stops the twitching, which would use up more of the fish’s energy.', 'Opcional: pasa un alambre fino por el canal de la columna desde el corte de la cola hasta el cerebro (se llama shinkei-jime). Detiene el temblor, que gastaría más energía del pescado.'),
      W('Bleed in a bucket of seawater, changing it until it runs clear, then straight into ice slurry.', 'Desangra en un balde de agua de mar, cambiándola hasta que salga clara, y luego directo al hielo en agua.'),
    ],
    note: { t: W('A sharp ice pick, awl or ground-down nail is enough: the spike must not bend. No exact spot works for every species, so practise on the first fish.', 'Un picahielo afilado, una lezna o un clavo afilado sirve: el punzón no debe doblarse. No hay un punto exacto para todas las especies, así que practica con el primer pescado.'), src: [12, 11] },
  },
  {
    id: 'club',
    name: W('Club, then cut', 'Garrote y corte'),
    tag: W('Quick, free, works on a rocking boat', 'Rápido, gratis, sirve en lancha movida'),
    marks: [
      W('Blow: top of the head, over the brain', 'Golpe: en lo alto de la cabeza, sobre el cerebro'),
      W('Then cut both gill arches', 'Luego corta los dos arcos de las agallas'),
    ],
    steps: [
      W('One hard blow on top of the head, over the brain. Not the nose, not the gill cover.', 'Un golpe fuerte en lo alto de la cabeza, sobre el cerebro. No en la nariz ni en la tapa de la agalla.'),
      W('Check it worked: gill cover stops moving, the eye no longer rolls when you turn the fish.', 'Verifica que funcionó: la tapa de la agalla deja de moverse y el ojo ya no gira al voltear el pescado.'),
      W('Hit again if there is any doubt. A weak blow only stuns, and a stunned fish can wake up.', 'Golpea otra vez si hay duda. Un golpe flojo solo aturde, y un pescado aturdido puede despertar.'),
      W('At once cut both gill arches, while the heart is still beating. Then leave the fish in seawater for about 3 minutes.', 'De una vez corta los dos arcos de las agallas, mientras el corazón todavía late. Luego deja el pescado en agua de mar unos 3 minutos.'),
      W('Into ice slurry.', 'Al hielo en agua.'),
    ],
    note: { t: W('The blow alone is the “hit and leave” mistake. The cut is what takes the blood out.', 'El golpe solo es el error de “pegarle y dejarlo”. El corte es lo que saca la sangre.'), src: [11] },
  },
  {
    id: 'bleed',
    name: W('Gill cut, bled in seawater', 'Corte de agalla, desangrado en agua de mar'),
    tag: W('Never skip it', 'Nunca te lo saltes'),
    marks: [
      W('Cut both gill arches', 'Corta los dos arcos de las agallas'),
      W('Head down in a bucket of fresh seawater, about 3 min', 'Cabeza abajo en un balde de agua de mar limpia, unos 3 min'),
    ],
    steps: [
      W('Right after the blow or spike, while the heart is still beating, slice through both gill arches (or the throat) with a sharp knife. The beating heart is what pumps the blood out.', 'Justo después del golpe o el punzón, mientras el corazón todavía late, corta los dos arcos de las agallas (o la garganta) con un cuchillo afilado. El corazón al latir es lo que bombea la sangre hacia afuera.'),
      W('Put the fish head down in a bucket of fresh seawater, so the heart pumps the blood out into the water.', 'Pon el pescado con la cabeza hacia abajo en un balde de agua de mar limpia, para que el corazón bombee la sangre al agua.'),
      W('Leave the fish in the water for about 3 minutes. Most of the blood is out by then, and a longer wait takes out almost no more. Do not wait before cutting: a fish that dies before it is bled keeps more blood in its flesh.', 'Deja el pescado en el agua unos 3 minutos. Para entonces casi toda la sangre ya salió, y esperar más saca casi nada más. No esperes antes de cortar: un pescado que muere antes de desangrarse deja más sangre en la carne.'),
      W('When the water turns red and warm, swap it for fresh seawater, and keep the bucket in the shade.', 'Cuando el agua se ponga roja y caliente, cámbiala por agua de mar limpia, y mantén el balde a la sombra.'),
    ],
    note: { t: W('Bleeding with no stun first is hard on the fish and thrashes blood into the flesh. Stun first.', 'Desangrar sin aturdir antes maltrata al pescado y le mete sangre en la carne. Aturde primero.'), src: [6, 11] },
    alt: { t: W('No bucket? You can hold the fish head first in the sea beside the boat, so the moving water carries the blood away. Blood can draw sharks and barracuda, so keep your hands out of the water and the fish close to the boat.', '¿Sin balde? Puedes sostener el pescado con la cabeza hacia adelante en el mar, junto a la lancha, para que el agua en movimiento se lleve la sangre. La sangre puede atraer tiburones y barracudas, así que mantén las manos fuera del agua y el pescado cerca de la lancha.'), est: true },
  },
  {
    id: 'slurry',
    name: W('Ice slurry', 'Hielo en agua'),
    tag: W('The step that saves tuna, mahi and mackerel', 'El paso que salva atún, dorado y macarela'),
    marks: [
      W('About half ice, half seawater: slushy, not clear water, near 0 °C (32 °F)', 'Más o menos mitad hielo, mitad agua de mar: espeso, no agua clara, cerca de 0 °C (32 °F)'),
      W('Fish under the slurry, bled first; cooler covered and in shade', 'Pescado bajo el hielo, desangrado antes; hielera tapada y a la sombra'),
      W('Big tuna and mahi: guts out, belly packed with ice', 'Atún y dorado grandes: sin tripas, la panza llena de hielo'),
    ],
    steps: [
      W('Fill the cooler with about half ice and half seawater, so it is near 0 °C (32 °F). Water touches every part of the fish; plain ice leaves air gaps.', 'Llena la hielera con mitad hielo y mitad agua de mar, para que quede cerca de 0 °C (32 °F). El agua toca todo el pescado; el hielo solo deja huecos de aire.'),
      W('Put the fish in as soon as it has bled. Keep it covered, in shade.', 'Mete el pescado apenas se desangre. Mantenlo cubierto y a la sombra.'),
      W('Big tuna and mahi heat up inside: take the guts out on board with a clean knife and pack the belly with ice. Smaller fish can be gutted later, on ice.', 'El atún y el dorado grandes se calientan por dentro: sácales las tripas a bordo con un cuchillo limpio y llénales la panza de hielo. Los pescados más chicos se pueden eviscerar después, sobre hielo.'),
      W('Add ice as it melts. A cold, wet fish is fine. A warm fish is not.', 'Echa hielo conforme se derrite. Un pescado frío y mojado está bien. Uno caliente, no.'),
    ],
    note: { t: W('Slurry cools a fish faster than ice alone, because water touches the whole fish. Half ice and half water (1 to 1) is the usual advice. Small fish left for many hours in salty slurry take in salt.', 'El hielo en agua enfría un pescado más rápido que el hielo solo, porque el agua toca todo el pescado. Mitad hielo y mitad agua (1 a 1) es el consejo habitual. El pescado chico que se deja muchas horas en hielo con agua salada absorbe sal.'), src: [13, 12] },
  },
];
// --- mistakes
export const MISTAKES_H = W('Four mistakes that cost you the fish', 'Cuatro errores que te cuestan el pescado');
export const MISTAKES_P = W(
  'All four are easy to stop.',
  'Los cuatro son fáciles de evitar.',
);
export interface Mistake { id: string; name: Txt; what: Fact[]; fix: Txt }
export const MISTAKES: Mistake[] = [
  {
    id: 'suffocate',
    name: W('Letting it die in the boat', 'Dejarlo morir en la lancha'),
    what: [
      { t: W('A fish gasping on the deck fights for minutes. The fight uses up the muscle’s fuel (its energy, called ATP, and its stored sugar, called glycogen) and fills the muscle with lactic acid, which makes the flesh sour and mushy.', 'Un pescado que boquea en la cubierta pelea por minutos. La pelea gasta el combustible del músculo (su energía, llamada ATP, y su azúcar de reserva, llamada glucógeno) y llena el músculo de ácido láctico, que deja la carne agria y aguada.'), src: [2] },
      { t: W('A fish that struggles stiffens (rigor mortis) sooner and harder. The tight muscle tears away from its connective tissue, so the fillet splits open (called gaping) and comes out mushy, pale and watery. A stressed cod at 30 °C started stiffening in half an hour.', 'Un pescado que lucha se pone rígido (rigor mortis) antes y con más fuerza. El músculo tenso se desprende de su tejido conectivo, así que el filete se abre (se llama “gaping”) y sale aguado y pálido. Un bacalao estresado a 30 °C empezó a ponerse rígido en media hora.'), src: [2] },
      { t: W('It starts out already tired, so our model has this fish spoiled in under 5 hours in the shade.', 'Empieza ya agotado, así que nuestro modelo lo da por dañado en menos de 5 horas a la sombra.'), est: true },
    ],
    fix: W('Kill it in seconds: spike or club, then bleed.', 'Mátalo en segundos: punzón o garrote, y a desangrar.'),
  },
  {
    id: 'hit-leave',
    name: W('Hitting it and leaving it', 'Pegarle y dejarlo'),
    what: [
      { t: W('A blow stops the thrashing, but it does nothing to remove the blood. Blood left in the flesh darkens it, gives it a metallic taste and feeds bacteria.', 'El golpe detiene el pataleo, pero no saca la sangre. La sangre que queda en la carne la oscurece, le da un sabor metálico y alimenta bacterias.'), src: [6] },
      { t: W('A weak blow only stuns the fish. It can wake up and struggle on the deck, which is the first mistake all over again.', 'Un golpe débil solo aturde al pescado. Puede despertar y pelear en la cubierta, que es el primer error otra vez.'), src: [11] },
    ],
    fix: W('After the blow, always cut the gills and bleed it in seawater.', 'Después del golpe, siempre corta las agallas y desangra en agua de mar.'),
  },
  {
    id: 'gut-nobleed',
    name: W('Gutting it without bleeding it', 'Eviscerarlo sin desangrarlo'),
    what: [
      { t: W('Gutting does not drain the blood out of the meat. In cod, fish gutted without bleeding kept more blood in the fillet than fish that were bled first.', 'Eviscerar no saca la sangre de la carne. En bacalao, los peces eviscerados sin desangrar guardaron más sangre en el filete que los desangrados primero.'), src: [6] },
      { t: W('Gutting does help a little against the heat, because the guts are full of bacteria. The US FDA allows a fish with its gills and guts removed more time to reach ice (up to 12 hours) than a whole fish. It still has to reach the ice.', 'Eviscerar sí ayuda un poco contra el calor, porque las tripas están llenas de bacterias. La FDA de Estados Unidos permite a un pescado sin agallas ni tripas más tiempo para llegar al hielo (hasta 12 horas) que a uno entero. Aun así tiene que llegar al hielo.'), src: [1] },
    ],
    fix: W('Bleed first, then ice. Gut it afterwards, on ice (big tuna and mahi: on board, with ice in the belly).', 'Primero desangrar, luego hielo. Eviscéralo después, sobre hielo (atún y dorado grandes: a bordo, con hielo en la panza).'),
  },
  {
    id: 'no-ice',
    name: W('No ice', 'Sin hielo'),
    what: [
      { t: W('Bacteria multiply about 25 to 30 times faster at 28 to 30 °C than on ice.', 'Las bacterias se multiplican unas 25 a 30 veces más rápido a 28–30 °C que en hielo.'), src: [3] },
      { t: W('So a fish that keeps 10 to 14 days in ice is only good for roughly 8 to 12 hours in a hot boat.', 'Así que un pescado que dura de 10 a 14 días en hielo solo aguanta unas 8 a 12 horas en una lancha caliente.'), est: true },
      { t: W('The bacteria turn an odourless chemical in the flesh (TMAO) into TMA, the common “fishy smell”, and produce sulphurous smells associated with old fish.', 'Las bacterias convierten una sustancia sin olor de la carne (TMAO) en TMA, el común “olor a pescado”, y producen olores a azufre asociados con el pescado viejo.'), src: [2] },
      { t: W('Tuna, mahi and mackerel also build up histamine as they warm. Cooking does not remove it.', 'El atún, el dorado y la macarela también acumulan histamina al calentarse. Cocinar no la quita.'), src: [1] },
      { t: W('In Costa Rica’s Golfo Dulce (Pacific, 1990), poor use of ice was a named cause of lost fish on small boats that carried block ice instead of crushed ice. The fish lay on or beside the block, ice was chopped only once a day, and big chunks crushed the fish instead of cooling them all around. The fish were rejected for dull eyes, mushy flesh and a rancid smell.', 'En el Golfo Dulce de Costa Rica (Pacífico, 1990), el mal uso del hielo fue una causa señalada de pescado perdido en lanchas pequeñas que llevaban hielo en marqueta en vez de hielo molido. El pescado quedaba encima o al lado de la marqueta, el hielo se picaba solo una vez al día, y los trozos grandes aplastaban el pescado en vez de enfriarlo por todos lados. Lo rechazaban por los ojos opacos, la carne aguada y el olor rancio.'), src: [15, 13] },
    ],
    fix: W('Crush the ice, add seawater, cover the fish. Even badly used ice beats none.', 'Muele el hielo, agrégale agua de mar y cubre el pescado. Hasta el hielo mal usado vale más que nada.'),
  },
];

// --- science
export const SCIENCE_H = W('What happens inside the fish', 'Qué pasa dentro del pescado');
export const SCIENCE_P = W(
  'A fish that dies calm and cold keeps its flavour. One that dies hard and warm goes through every one of these steps early.',
  'Un pescado que muere tranquilo y frío conserva su sabor. Uno que muere duro y caliente pasa temprano por cada uno de estos pasos.',
);
export interface Step { id: string; name: Txt; body: Fact[]; }
export const STEPS: Step[] = [
  {
    id: 'stress',
    name: W('1  Stress burns the fuel', '1  El estrés quema el combustible'),
    body: [
      { t: W('Fighting and gasping use up the muscle’s fuel: ATP (its energy) and glycogen (its stored sugar). A fish that dies calm and rested starts with a full tank.', 'Pelear y boquear gasta el combustible del músculo: el ATP (su energía) y el glucógeno (su azúcar de reserva). Un pescado que muere tranquilo y descansado empieza con el tanque lleno.'), src: [2] },
    ],
  },
  {
    id: 'acid',
    name: W('2  Lactic acid turns the flesh sour', '2  El ácido láctico agria la carne'),
    body: [
      { t: W('With no oxygen, the muscle burns glycogen into lactic acid, and the flesh turns acid (its pH falls). In a study on loach (a small freshwater fish), a stressed fish lost 0.5 pH in 3 hours, while a rested one lost 0.1.', 'Sin oxígeno, el músculo quema glucógeno y produce ácido láctico, y la carne se vuelve ácida (baja su pH). En un estudio con locha (un pez pequeño de agua dulce), un pez estresado perdió 0,5 de pH en 3 horas, y uno descansado perdió 0,1.'), src: [2] },
      { t: W('Acid flesh holds less water, so it turns mushy, pale and sticky. The final acidity depends on the fish. A lower pH means more acid: tuna ends at pH 5.4 to 5.6, mackerel at 5.8 to 6.0 and cod at 6.1 to 6.5.', 'La carne ácida retiene menos agua, así que se pone aguada, pálida y pegajosa. La acidez final depende del pescado. Un pH más bajo es más ácido: el atún termina en pH 5,4 a 5,6, la macarela en 5,8 a 6,0 y el bacalao en 6,1 a 6,5.'), src: [2] },
    ],
  },
  {
    id: 'rigor',
    name: W('3  Rigor mortis: the stiffening after death', '3  Rigor mortis: la rigidez tras la muerte'),
    body: [
      { t: W('When the muscle’s ATP is almost used up, the muscle locks stiff. How soon that happens depends on how the fish died and how warm it is. In cod that struggled before death, stiffening starts after 30 minutes at 30 °C and is over in 1 to 2 hours. In calm cod on ice (0 °C), it starts after 14 to 15 hours and lasts 3 to 4 days.', 'Cuando al músculo casi se le acaba el ATP, se traba rígido. Qué tan pronto pasa depende de cómo murió el pescado y de qué tan caliente está. En bacalao que luchó antes de morir, la rigidez empieza a los 30 minutos a 30 °C y termina en 1 a 2 horas. En bacalao tranquilo en hielo (0 °C), empieza a las 14 o 15 horas y dura de 3 a 4 días.'), src: [2] },
      { t: W('A fast, hard stiffening tears the flesh away from its connective tissue. That splits the fillet open (gaping) and leaves it mushy instead of firm.', 'Una rigidez rápida y fuerte desprende la carne de su tejido conectivo. Eso abre el filete (gaping) y lo deja aguado en vez de firme.'), src: [2] },
      { t: W('Hitting a fish on the head: one review says that fish killed by a blow to the head went stiff up to 18 hours later than fish killed in iced water. It does not say which fish or what temperature.', 'Pegarle al pescado en la cabeza: una revisión dice que los peces matados con un golpe en la cabeza se pusieron rígidos hasta 18 horas más tarde que los peces matados en agua con hielo. No dice de qué pez ni a qué temperatura.'), src: [2] },
      { t: W('Spiking and destroying the spinal cord, as in ikejime: in a separate Japanese test on yellowtail and red sea bream, fish with the spinal cord destroyed took 6 to 12 hours longer to go fully stiff than fish without. The summary we could read does not say how the comparison fish were killed.', 'Punzar y destruir la médula, como en el ikejime: en una prueba japonesa aparte con cola amarilla y besugo rojo, los peces con la médula destruida tardaron de 6 a 12 horas más en ponerse del todo rígidos que los peces sin eso. El resumen que pudimos leer no dice cómo mataron a los peces de comparación.'), src: [4] },
      { t: W('These two numbers come from different studies, with different fish and different comparisons. They cannot be added together or compared with each other.', 'Estos dos números vienen de estudios distintos, con peces distintos y comparaciones distintas. No se pueden sumar ni comparar entre sí.') },
      { t: W('One exception: in plaice (a flatfish), the fish with the spinal cord destroyed went fully stiff sooner, not later. The authors blamed that fish’s poorly developed nerves.', 'Una excepción: en la platija (un pez plano), los peces con la médula destruida se pusieron del todo rígidos antes, no después. Los autores culparon a los nervios poco desarrollados de ese pez.'), src: [4] },
    ],
  },
  {
    id: 'blood',
    name: W('4  Blood spoils the meat', '4  La sangre daña la carne'),
    body: [
      { t: W('Blood left in the flesh darkens it, tastes of iron and feeds bacteria.', 'La sangre que queda en la carne la oscurece, sabe a hierro y alimenta bacterias.'), src: [6] },
      { t: W('When the gills are cut, the heart keeps pumping and the blood drains out of the fish into the water. In a cod study, most of the blood was out after 3 minutes. Bleeding for 30 minutes left almost the same amount of blood in the flesh as bleeding for 3.', 'Cuando se cortan las agallas, el corazón sigue bombeando y la sangre sale del pescado al agua. En un estudio con bacalao, casi toda la sangre ya había salido a los 3 minutos. Desangrar 30 minutos dejó en la carne casi la misma cantidad de sangre que desangrar 3.'), src: [6] },
      { t: W('Fish that die before they are bled keep more blood in the flesh. So do fish that are gutted without being bled. When a hard struggle forces blood into the muscle, it cannot be bled out.', 'Los peces que mueren antes de desangrarse dejan más sangre en la carne. Los eviscerados sin desangrar también. Cuando una pelea dura mete sangre en el músculo, ya no se puede sacar.'), src: [6] },
      { t: W('In the loach study, bleeding the fish also cut the lactic acid the muscle made after death.', 'En el estudio con locha, desangrar al pez también redujo el ácido láctico que el músculo produjo después de morir.'), src: [2] },
    ],
  },
  {
    id: 'k',
    name: W('5  The flavour fades', '5  El sabor se va'),
    body: [
      { t: W('After death, the fish’s fuel (ATP) breaks down step by step. One step, called IMP, gives fresh fish its savoury “umami” taste. The later steps, called inosine and hypoxanthine, taste flat and slightly bitter.', 'Tras la muerte, el combustible del pescado (ATP) se degrada paso a paso. Un paso, llamado IMP, da al pescado fresco su sabor sabroso, “umami”. Los pasos posteriores, llamados inosina e hipoxantina, saben planos y algo amargos.'), src: [5] },
      { t: W('The K-value measures how much has already passed IMP, so a low K means fresh. In flathead flounder kept at 4 to 5 °C, destroying the spinal cord kept K at 7 % at 30 hours, against 17 % when the brainstem was cut instead.', 'El valor K mide cuánto ya pasó el IMP, así que una K baja significa fresco. En lenguado a 4–5 °C, destruir la médula mantuvo la K en 7 % a las 30 horas, contra 17 % cuando solo se cortó el tronco encefálico.'), src: [9] },
      { t: W('On ice (0 °C, 32 °F) the K-value of a fish rises about 5 points a day. Across 14 species it ranged from 0.2 to 8.4 points a day, so some fish keep their freshness far longer than others.', 'En hielo (0 °C, 32 °F) el valor K de un pescado sube unos 5 puntos por día. En 14 especies varió de 0,2 a 8,4 puntos por día, así que unos pescados conservan su frescura mucho más tiempo que otros.'), src: [17] },
    ],
  },
  {
    id: 'bacteria',
    name: W('6  Bacteria and the fishy smell', '6  Las bacterias y el olor a pescado'),
    body: [
      { t: W('The flesh of a live fish is clean. After it dies, bacteria from the gills, skin and gut spread into the meat. They turn an odourless chemical (TMAO) into TMA, the common “fishy smell”, and make sulphurous smells.', 'La carne de un pescado vivo está limpia. Después de morir, las bacterias de las agallas, la piel y las tripas se extienden por la carne. Convierten una sustancia sin olor (TMAO) en TMA, el común “olor a pescado”, y producen olores a azufre.'), src: [2] },
      { t: W('Tropical fish keep 6 to 35 days in ice (mackerel 14 to 18). At 28 to 30 °C they spoil 25 to 30 times faster, about 3 times faster for every 10 °C warmer. A day in the heat can use up weeks of the fish’s life on ice.', 'El pescado tropical dura de 6 a 35 días en hielo (la macarela, de 14 a 18). A 28–30 °C se daña de 25 a 30 veces más rápido, cerca de 3 veces más rápido por cada 10 °C más. Un día al calor puede gastar semanas de la vida del pescado en hielo.'), src: [3] },
      { t: W('A home fridge is about 4 °C (39 °F), not 0 °C (32 °F). Fish spoil roughly 1.5 to 2 times faster there than on ice, so a fish that keeps 10 days on ice keeps about 5 to 7 days in a fridge. Keep it on a tray of ice inside the fridge, drained, or in a sealed bag buried in ice.', 'Una nevera casera está a unos 4 °C (39 °F), no a 0 °C (32 °F). El pescado se daña de 1,5 a 2 veces más rápido ahí que en hielo, así que un pescado que dura 10 días en hielo dura de 5 a 7 días en la nevera. Ponlo sobre una bandeja de hielo dentro de la nevera, escurrido, o en una bolsa sellada enterrada en hielo.'), src: [3] },
    ],
  },
];

// --- histamine
export const HIST_H = W('Tuna, mahi, mackerel: the 6-hour rule', 'Atún, dorado, macarela: la regla de las 6 horas');
export const HIST_P = W(
  'Scombroid poisoning, also called histamine fish poisoning, is the illness you get from eating fish that was kept warm. It is easy to prevent and hard to spot on the plate.',
  'La intoxicación escombroide, también llamada intoxicación por histamina del pescado, es la enfermedad que se contrae al comer pescado que estuvo caliente. Es fácil de prevenir y difícil de notar en el plato.',
);
export const HIST_SPECIES = W(
  'Tuna and bonito (atún, barrilete), mahi-mahi (dorado), mackerels (macarela, carite, sierra), wahoo (peto), marlin, and jacks can form it too.',
  'Atún y barrilete, mahi-mahi (dorado), macarelas (macarela, carite, sierra), peto, marlín y los jureles también pueden formarla.',
);
export interface Clock { h: number; label: Txt; src: number[] }
export const HIST_CLOCK: Clock[] = [
  { h: 6, label: W('Ice, or 4.4 °C (fridge cold), within 6 hours of death when the air or water is above 28.3 °C: our usual day', 'Hielo, o 4,4 °C (frío de nevera), dentro de 6 horas de morir cuando el aire o el agua pasan de 28,3 °C: nuestro día normal'), src: [1] },
  { h: 9, label: W('Within 9 hours when the air and water are 28.3 °C or cooler', 'Dentro de 9 horas cuando el aire y el agua están a 28,3 °C o menos'), src: [1] },
  { h: 12, label: W('Up to 12 hours if the gills and guts are removed before icing', 'Hasta 12 horas si se le quitan las agallas y las tripas antes de enhielar'), src: [1] },
];
export interface HistGroup { id: string; h: Txt; facts: Fact[] }
export const HIST_GROUPS: HistGroup[] = [
  {
    id: 'cause',
    h: W('What causes it', 'Qué la causa'),
    facts: [
      { t: W('The poison is histamine in the fish. You do not catch it from a germ.', 'El veneno es la histamina que hay en el pescado. No se contagia por un germen.'), src: [1] },
      { t: W('Tuna, mahi and mackerel are rich in an amino acid called histidine. When the fish is warm, bacteria from its skin, gills and gut turn the histidine into histamine.', 'El atún, el dorado y la macarela son ricos en un aminoácido llamado histidina. Cuando el pescado está caliente, las bacterias de su piel, sus agallas y sus tripas convierten la histidina en histamina.'), src: [1] },
      { t: W('Histamine is the same chemical your body releases in an allergic reaction. Eating a lot of it gives allergy-like symptoms.', 'La histamina es la misma sustancia que su cuerpo libera en una reacción alérgica. Comer mucha da síntomas parecidos a los de una alergia.'), src: [16] },
    ],
  },
  {
    id: 'build',
    h: W('How fast it builds up', 'Qué tan rápido se acumula'),
    facts: [
      { t: W('In a lab test, mahi-mahi seeded with a histamine-making bacterium reached 600 ppm after 12 hours at 25 °C, and 380 ppm after 24 hours at 15 °C. Kept at 4 °C, it stayed under 30 ppm even after 4 days. (ppm means parts per million.)', 'En una prueba de laboratorio, el mahi-mahi al que se le agregó una bacteria productora de histamina llegó a 600 ppm a las 12 horas a 25 °C, y a 380 ppm a las 24 horas a 15 °C. Mantenido a 4 °C, se quedó en menos de 30 ppm aun después de 4 días. (ppm significa partes por millón.)'), src: [7] },
      { t: W('Mackerel held at 32 °C reached 50 ppm after 12 hours and 100 ppm after 16 (a review of earlier studies).', 'La macarela a 32 °C llegó a 50 ppm a las 12 horas y a 100 ppm a las 16 (una revisión de estudios anteriores).'), src: [8] },
      { t: W('The US FDA’s guidance level is 50 ppm. Fish that made people sick were usually above 200 ppm and often above 500 ppm.', 'El nivel de guía de la FDA de Estados Unidos es 50 ppm. Los pescados que enfermaron a personas casi siempre pasaban de 200 ppm y a menudo de 500 ppm.'), src: [1] },
      { t: W('Big tuna (over about 9 kg) heat up inside after death. Pack ice into the belly and the gill cavity, and never leave a dead fish hanging on a line.', 'El atún grande (más de unos 9 kg) se calienta por dentro después de morir. Mete hielo en la panza y en las agallas, y nunca dejes un pescado muerto colgando de un cordel.'), src: [10, 1] },
    ],
  },
  {
    id: 'effects',
    h: W('What it does to you', 'Qué le hace a usted'),
    facts: [
      { t: W('Symptoms usually start 10 to 60 minutes after eating. They look like an allergic reaction: a flushed face and upper body that looks sunburnt, a severe headache, itching, a racing or pounding heart, blurred vision, stomach cramps and diarrhoea.', 'Los síntomas suelen empezar de 10 a 60 minutos después de comer. Se parecen a una reacción alérgica: cara y parte superior del cuerpo enrojecidas como quemadas por el sol, dolor de cabeza fuerte, picazón, corazón acelerado o latiendo fuerte, visión borrosa, cólicos y diarrea.'), src: [1, 16] },
      { t: W('Left untreated, the symptoms usually clear within 12 hours, but can last up to 48 hours.', 'Sin tratamiento, los síntomas suelen pasar en 12 horas, pero pueden durar hasta 48 horas.'), src: [16] },
      { t: W('Rarely, it causes trouble breathing, a dangerous heart rhythm, or low blood pressure that needs a hospital.', 'Rara vez causa dificultad para respirar, un ritmo del corazón peligroso o presión baja que necesita hospital.'), src: [16] },
    ],
  },
  {
    id: 'help',
    h: W('What to do if someone gets sick', 'Qué hacer si alguien se enferma'),
    facts: [
      { t: W('Antihistamine medicines, the kind used for hay fever and allergies, usually work well.', 'Los antihistamínicos, los que se usan para la rinitis alérgica y las alergias, suelen funcionar bien.'), src: [16] },
      { t: W('Call 911 or go to the clinic if there is trouble breathing, fainting or a racing heart, or if the person has other medical conditions.', 'Llame al 911 o vaya a la clínica si hay dificultad para respirar, desmayo o corazón acelerado, o si la persona tiene otras enfermedades.') },
      { t: W('If one person at the table gets sick, nobody should eat any more of that fish.', 'Si una persona de la mesa se enferma, nadie debe comer más de ese pescado.') },
    ],
  },
  {
    id: 'safe',
    h: W('Cooking, freezing and smell do not make it safe', 'Cocinar, congelar y el olor no la hacen segura'),
    facts: [
      { t: W('Histamine is not destroyed by cooking, smoking, salting or freezing. A fish with a lot of histamine may still look and smell normal. Only keeping the fish cold from the start prevents it.', 'La histamina no se destruye cocinando, ahumando, salando ni congelando. Un pescado con mucha histamina puede verse y oler normal. Solo mantener el pescado frío desde el principio lo evita.'), src: [1] },
    ],
  },
];

/** Scombroid beside ciguatera, the other fish illness here; the ciguatera page (#ciguatera) has the detail. */
export const HIST_VS_H = W('Not the same as ciguatera', 'No es lo mismo que la ciguatera');
export const HIST_VS_HEAD: [Txt, Txt, Txt] = [W('', ''), W('Scombroid (histamine)', 'Escombroide (histamina)'), W('Ciguatera', 'Ciguatera')];
export const HIST_VS: [Txt, Txt, Txt][] = [
  [W('Caused by', 'La causa'), W('Bacteria turning histidine into histamine in warm fish', 'Bacterias que convierten la histidina en histamina en pescado caliente'), W('A toxin from reef algae that builds up in big reef fish', 'Una toxina de algas de arrecife que se acumula en peces grandes de arrecife')],
  [W('Fish', 'Pescados'), W('Tuna, mahi, mackerel and other fish that were kept warm', 'Atún, dorado, macarela y otros pescados que estuvieron calientes'), W('Large reef fish such as barracuda, snapper and grouper', 'Peces grandes de arrecife como la barracuda, el pargo y el mero')],
  [W('Starts', 'Empieza'), W('Minutes to a few hours after eating', 'De minutos a unas horas después de comer'), W('Usually 3 to 6 hours after eating, sometimes later', 'Normalmente 3 a 6 horas después de comer, a veces más tarde')],
  [W('Feels like', 'Se siente como'), W('An allergy: flushing, rash, headache, racing heart', 'Una alergia: enrojecimiento, sarpullido, dolor de cabeza, corazón acelerado'), W('Stomach upset first, then tingling and numbness, and hot and cold feeling reversed', 'Primero malestar de estómago, luego hormigueo y adormecimiento, y lo frío y lo caliente se sienten al revés')],
  [W('Lasts', 'Dura'), W('12 hours to a few days', 'De 12 horas a unos días'), W('Days to months', 'De días a meses')],
  [W('Prevented by', 'Se previene con'), W('Ice within 6 hours of death', 'Hielo dentro de 6 horas de muerto'), W('Not eating big reef fish, and never the head, liver, guts or roe. Cold does not help.', 'No comer peces grandes de arrecife, y nunca la cabeza, el hígado, las tripas ni las huevas. El frío no ayuda.')],
];
export const HIST_VS_LINK = W('Read the ciguatera page', 'Lee la página de la ciguatera');

// --- routine
export const ROUTINE_H = W('The five-step routine', 'La rutina de cinco pasos');
export const ROUTINE: { n: string; head: Txt; body: Txt }[] = [
  { n: '1', head: W('Kill', 'Matar'), body: W('Spike or club it, seconds after it is on board.', 'Con punzón o garrote, a los segundos de subirlo a bordo.') },
  { n: '2', head: W('Bleed', 'Desangrar'), body: W('Cut both gill arches while the heart still beats. Head down in seawater, about 3 minutes.', 'Corta los dos arcos de las agallas mientras el corazón late. Cabeza abajo en agua de mar, unos 3 minutos.') },
  { n: '3', head: W('Ice', 'Hielo'), body: W('Ice slurry (0 °C, 32 °F), about half ice and half seawater, within the hour. Tuna, mahi and mackerel must be on ice within 6 hours of dying, at the very latest. Big tuna and mahi: guts out and ice in the belly.', 'Hielo en agua (0 °C, 32 °F), más o menos mitad hielo y mitad agua de mar, dentro de la hora. El atún, el dorado y la macarela deben estar en hielo antes de 6 horas de muertos, como máximo. Atún y dorado grandes: sin tripas y con hielo en la panza.') },
  { n: '4', head: W('Clean', 'Limpiar'), body: W('Back at the dock, gut with a clean knife, rinse in clean cold water, and keep the fish on ice (0 °C, 32 °F) while you work. Big tuna and mahi were already gutted on board.', 'Ya en el muelle, eviscera con un cuchillo limpio, enjuaga en agua limpia y fría, y mantén el pescado en hielo (0 °C, 32 °F) mientras trabajas. El atún y el dorado grandes ya se evisceraron a bordo.') },
  { n: '5', head: W('Keep cold', 'Mantener frío'), body: W('Keep it cold: on ice (0 °C, 32 °F), in the fridge (about 4 °C, 39 °F) with the fish sitting on ice, or wrapped airtight in the freezer. A fridge alone is not as good as ice.', 'Mantenlo frío: en hielo (0 °C, 32 °F), en la nevera (unos 4 °C, 39 °F) con el pescado sobre hielo, o bien sellado en el congelador. La nevera sola no es tan buena como el hielo.') },
];

// --- footer
export const SOURCES_H = W('Sources and what is estimated', 'Fuentes y qué es estimado');
export const SOURCES_P = W(
  'A small number beside a fact points to its source below. “Our estimate” marks something this page worked out itself. The bands for the K-value, the exact spike spot, the bleeding times and the ice mix are practical guidance, not laboratory standards.',
  'Un número pequeño junto a un dato lleva a su fuente abajo. “Estimación nuestra” marca lo que esta página calculó por su cuenta. Las bandas del valor K, el punto exacto del punzón, los tiempos de desangrado y la mezcla de hielo son guía práctica, no normas de laboratorio.',
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
