/**
 * How to clean and prepare what people eat here (PLAN 7.91): one drawn diagram per way of cleaning (types.ts
 * `CLEANS`), with numbered steps in both languages. Each species names its way (`eat.clean`) and may add its own
 * notes (`eat.cleanNotes`). The drawings are the guide's own (art.ts) with the cuts drawn over them: dashed lines
 * are cuts, arrows the direction to work in, and the numbers match the steps.
 *
 * The steps follow common practice in Caribbean kitchens and fisheries food-safety advice (FAO fish handling,
 * shellfish and ciguatera guidance); docs/GUIDE.md lists the sources.
 */
import { ART, type ArtKey } from './art';
import type { CleanKey, Group, Lang, Txt } from './types';

interface Step { t: Txt; /** Where its number sits on the drawing, if it has a place there. */ at?: [number, number] }
interface Diagram {
  art: ArtKey;
  name: Txt;
  /** Cuts (dashed) and strokes added to the drawing, in its 96 by 64 box. */
  cuts: string;
  /** Arrows: from and to. */
  arrows?: [number, number, number, number][];
  /** Extra outline drawn as part of the animal (the lionfish's spines). */
  extra?: string;
  steps: Step[];
}

const W = (en: string, es: string): Txt => ({ en, es });
const ICE = W(
  'Keep it cold from the moment it is caught: bleed it by cutting the gills and put it on ice. Warm fish spoils fast.',
  'Mantenlo frío desde que lo sacas: desángralo cortando las agallas y ponlo en hielo. El pescado caliente se daña rápido.',
);
const CIGUA = W(
  'Throw away the head, liver, guts and roe of big reef fish: the ciguatera toxin is strongest there.',
  'Bota la cabeza, el hígado, las vísceras y las huevas de los peces grandes de arrecife: ahí se concentra la toxina de la ciguatera.',
);

export const CLEAN: Record<CleanKey, Diagram> = {
  'fillet-round': {
    art: 'fish',
    name: W('Scale and fillet', 'Escamar y filetear'),
    cuts: 'M32 18 C35 26 35 38 32 46 M33 18 C46 15 62 18 74 28',
    arrows: [[70, 42, 44, 42], [44, 32, 70, 32]],
    steps: [
      { t: ICE },
      { t: W('Scale it from the tail to the head with the back of a knife or a scaler.', 'Escámalo de la cola a la cabeza con el lomo del cuchillo o un escamador.'), at: [76, 44] },
      { t: W('Cut behind the gill cover and the side fin, down to the backbone.', 'Corta detrás de la agalla y de la aleta lateral, hasta el espinazo.'), at: [31, 12] },
      { t: W('Cut along the back from head to tail, keeping the blade flat on the bones.', 'Corta a lo largo del lomo de la cabeza a la cola, con la hoja plana sobre las espinas.'), at: [54, 10] },
      { t: W('Lift the fillet over the ribs and cut it free at the tail. Turn the fish over and do the other side.', 'Levanta el filete sobre las costillas y suéltalo en la cola. Dale vuelta al pescado y repite.'), at: [76, 30] },
      { t: W('Trim out the rib bones and the dark blood line, and rinse in clean cold water.', 'Quita las costillas y la línea oscura de sangre, y enjuaga en agua limpia y fría.') },
      { t: CIGUA },
    ],
  },
  'whole-small': {
    art: 'fish',
    name: W('Clean whole', 'Limpiar entero'),
    cuts: 'M58 47 C46 50 34 48 26 44 M42 22 L38 42 M52 21 L48 43 M62 23 L58 42',
    arrows: [[70, 40, 46, 40]],
    steps: [
      { t: W('Scale it from the tail to the head, under water or in a bucket so the scales do not fly.', 'Escámalo de la cola a la cabeza, bajo el agua o en un balde para que las escamas no vuelen.'), at: [76, 40] },
      { t: W('Open the belly from the vent to the gills.', 'Abre la panza desde el ano hasta las agallas.'), at: [62, 52] },
      { t: W('Pull out the guts and the gills, and scrape out the dark blood along the backbone.', 'Saca las vísceras y las agallas, y raspa la sangre oscura pegada al espinazo.'), at: [22, 42] },
      { t: W('Rinse it inside and out and cut two or three slashes on each side so it cooks through. Fried whole is the coast way.', 'Lávalo por dentro y por fuera y hazle dos o tres cortes en cada lado para que se cocine parejo. Frito entero, como en la costa.'), at: [50, 14] },
    ],
  },
  'steak-large': {
    art: 'fish',
    name: W('Steaks and loins', 'Postas y lomos'),
    cuts: 'M32 29 L34 38 M60 47 C46 50 34 48 28 44 M42 17 L42 47 M50 17 L50 48 M58 18 L58 47 M66 22 L66 43',
    arrows: [[30, 33, 72, 33]],
    steps: [
      { t: W('Bleed it at once (cut behind the side fin or through the gills) and put it on ice. Tuna, bonito and dorado left warm can cause scombroid poisoning.', 'Desángralo de inmediato (corta detrás de la aleta lateral o en las agallas) y ponlo en hielo. El atún, el bonito y el dorado que se calientan pueden causar intoxicación escombroide.'), at: [26, 52] },
      { t: W('Gut it: open the belly from the vent to the throat and take out the guts and the gills.', 'Vacíalo: abre la panza del ano a la garganta y saca las vísceras y las agallas.'), at: [64, 56] },
      { t: W('For steaks, cut straight across the body every 2 to 3 cm, through the backbone, with a heavy knife.', 'Para postas, corta de lado a lado cada 2 a 3 cm, atravesando el espinazo, con un cuchillo pesado.'), at: [54, 6] },
      { t: W('For loins, cut along the middle line of the side and along the back to the spine, and lift the four loins off the bone.', 'Para lomos, corta por la línea media del costado y por el lomo hasta el espinazo, y despega los cuatro lomos.'), at: [78, 26] },
      { t: W('Cut out the dark red blood meat and keep it cold until you cook it.', 'Quita la carne oscura de sangre y mantenlo frío hasta cocinarlo.') },
    ],
  },
  'skin-tough': {
    art: 'fish',
    name: W('Skin and fillet', 'Pelar y filetear'),
    cuts: 'M30 18 C34 26 34 38 30 46 M30 18 C44 13 60 17 72 28 M30 46 C44 50 60 47 72 37',
    arrows: [[36, 32, 64, 32]],
    steps: [
      { t: W('Cut through the skin behind the head, all the way round.', 'Corta la piel detrás de la cabeza, todo alrededor.'), at: [28, 12] },
      { t: W('Cut the skin along the back and along the belly to the tail.', 'Corta la piel por el lomo y por la panza hasta la cola.'), at: [54, 10] },
      { t: W('Grip the skin at the head cut with pliers and peel it back to the tail. The skin is too tough to scale.', 'Agarra la piel en el corte de la cabeza con una pinza y jálala hacia la cola. La piel es muy dura para escamar.'), at: [68, 26] },
      { t: W('Fillet the peeled fish along the backbone. Throw away the guts and liver.', 'Filetea el pescado pelado a lo largo del espinazo. Bota las vísceras y el hígado.') },
    ],
  },
  lionfish: {
    art: 'fish',
    name: W('Lionfish: spines off, then fillet', 'Pez león: quitar espinas y filetear'),
    extra: 'M28 18 L22 5 M34 16 L31 3 M40 15 L40 2 M46 14 L48 2 M52 14 L56 3 M58 16 L63 6 M36 49 L31 59 M41 49 L38 60 M60 45 L64 55 M64 43 L69 52 M67 41 L73 48',
    cuts: 'M26 19 C38 13 52 13 62 19 M34 50 L43 49 M58 46 L68 41',
    steps: [
      { t: W('Wear thick gloves. With kitchen scissors, cut off every venomous spine: the 13 along the back first.', 'Usa guantes gruesos. Con tijeras de cocina corta cada espina venenosa: primero las 13 del lomo.'), at: [44, 20] },
      { t: W('Cut off the 2 spines under the belly (the pelvic fins).', 'Corta las 2 espinas debajo de la panza (aletas pélvicas).'), at: [28, 54] },
      { t: W('Cut off the 3 spines in front of the tail on the underside (the anal fin).', 'Corta las 3 espinas de abajo, delante de la cola (aleta anal).'), at: [76, 54] },
      { t: W('Put the spines in a closed container: they can still sting after the fish is dead.', 'Pon las espinas en un recipiente cerrado: todavía pueden picar con el pez muerto.') },
      { t: W('Fillet it like any round fish (no need to scale if you skin the fillets). The meat is white and mild. The venom is only in the spines, not in the meat.', 'Filetéalo como cualquier pez (no hace falta escamar si le quitas la piel). La carne es blanca y suave. El veneno solo está en las espinas, no en la carne.') },
      { t: W('If a spine pricks you: put the wound in water as hot as you can stand without burning (about 45 °C) for 30 to 90 minutes, and see a doctor if the pain is strong or it swells.', 'Si una espina te pica: mete la herida en agua tan caliente como aguantes sin quemarte (unos 45 °C) de 30 a 90 minutos, y ve al médico si el dolor es fuerte o se hincha.') },
    ],
  },
  flatfish: {
    art: 'flatfish',
    name: W('Four fillets', 'Cuatro filetes'),
    cuts: 'M32 32 L76 32 M32 16 C36 24 36 40 32 48',
    arrows: [[54, 30, 54, 17], [54, 34, 54, 47]],
    steps: [
      { t: W('Lay it dark side up. Cut down the middle line from behind the head to the tail, to the bone.', 'Ponlo con el lado oscuro arriba. Corta por la línea del medio, de la cabeza a la cola, hasta el hueso.'), at: [80, 26] },
      { t: W('Cut behind the head, and along the edge of the body just inside the fins.', 'Corta detrás de la cabeza y por el borde del cuerpo, justo dentro de las aletas.'), at: [30, 10] },
      { t: W('Slide the knife flat over the bones from the middle outward and lift off the first fillet, then the second.', 'Pasa el cuchillo plano sobre las espinas, del medio hacia afuera, y levanta el primer filete y luego el segundo.'), at: [62, 18] },
      { t: W('Turn it over and take two more: four fillets in all.', 'Dale vuelta y saca dos más: cuatro filetes en total.') },
      { t: W('Skin each fillet: hold the tail end and run the knife between skin and meat.', 'Pela cada filete: sujeta la punta de la cola y pasa el cuchillo entre la piel y la carne.') },
    ],
  },
  eel: {
    art: 'eel',
    name: W('Skin and cut', 'Pelar y cortar'),
    cuts: 'M18 25 L20 35 M40 33 L44 42 M54 38 L56 46 M68 33 L70 41',
    arrows: [[26, 31, 60, 41]],
    steps: [
      { t: W('Handle it with a cloth: eels stay slippery and can still bite by reflex.', 'Manipúlala con un trapo: las anguilas siguen resbalosas y pueden morder por reflejo.') },
      { t: W('Cut through the skin all the way round the neck, behind the head.', 'Corta la piel alrededor del cuello, detrás de la cabeza.'), at: [16, 20] },
      { t: W('Hold the head firmly (pliers help) and pull the skin back off toward the tail.', 'Sujeta bien la cabeza (una pinza ayuda) y jala la piel hacia la cola.'), at: [36, 28] },
      { t: W('Open the belly, take out the guts and cut the body across into pieces.', 'Abre la panza, saca las vísceras y corta el cuerpo en trozos.'), at: [56, 52] },
    ],
  },
  shark: {
    art: 'shark',
    name: W('Bleed, skin and steak', 'Desangrar, pelar y cortar en postas'),
    cuts: 'M80 25 L80 37 M46 41 C34 42 24 41 16 40 M33 28 L33 41 M34 27 C50 26 64 27 78 27 M48 27 L48 40 M58 27 L58 40 M68 27 L68 38',
    steps: [
      { t: W('Land it whole: in Costa Rica a shark must reach the dock with its fins naturally attached. Finning is illegal.', 'Desembárcalo entero: en Costa Rica el tiburón debe llegar al muelle con las aletas adheridas naturalmente. El aleteo es ilegal.') },
      { t: W('Bleed it at once by cutting off the tail or cutting behind the head, and ice it. Shark meat holds urea that turns to ammonia if it is not bled and chilled fast.', 'Desángralo enseguida cortando la cola o detrás de la cabeza, y ponlo en hielo. La carne de tiburón tiene urea que se vuelve amoníaco si no se desangra y enfría rápido.'), at: [86, 30] },
      { t: W('Open the belly and take out the guts.', 'Abre la panza y saca las vísceras.'), at: [30, 49] },
      { t: W('Cut off the head behind the gills.', 'Corta la cabeza detrás de las agallas.'), at: [33, 21] },
      { t: W('Skin it: cut along the back and belly and pull the rough skin off with pliers, or cut the meat away from it.', 'Pélalo: corta por el lomo y la panza y jala la piel áspera con una pinza, o corta la carne separándola de ella.'), at: [56, 20] },
      { t: W('Cut steaks across the body. Many cooks soak the meat in milk or lemon water for an hour to take out any ammonia smell.', 'Corta postas a lo ancho. Muchos cocineros remojan la carne en leche o agua con limón una hora para quitarle el olor a amoníaco.'), at: [64, 46] },
    ],
  },
  'ray-wing': {
    art: 'ray',
    name: W('Ray wings', 'Alas de raya'),
    cuts: 'M44 49 L52 49 M40 17 C38 28 40 40 46 46 M56 17 C58 28 56 40 50 46',
    steps: [
      { t: W('First cut off the tail with its barb, well clear of your hands, and get rid of it safely: the barb stings even when the ray is dead.', 'Primero corta la cola con su púa, lejos de las manos, y deséchala con cuidado: la púa pica aunque la raya esté muerta.'), at: [58, 56] },
      { t: W('Cut each wing off close to the body; the body holds the guts.', 'Corta cada ala pegada al cuerpo; el cuerpo tiene las vísceras.'), at: [32, 14] },
      { t: W('Skin each wing: slide the knife between skin and meat, or dip the wing in boiling water for a minute so the skin peels off.', 'Pela cada ala: pasa el cuchillo entre la piel y la carne, o mete el ala un minuto en agua hirviendo para que la piel salga.'), at: [74, 26] },
      { t: W('Cut the meat off both sides of the cartilage, or cook the wing whole and lift the meat off. Chill and cook it fresh, like shark.', 'Corta la carne de ambos lados del cartílago, o cocina el ala entera y despega la carne. Enfríala y cocínala fresca, como el tiburón.') },
    ],
  },
  lobster: {
    art: 'lobster',
    name: W('Lobster tail', 'Cola de langosta'),
    cuts: 'M56 23 L56 41 M60 32 L80 32',
    arrows: [[86, 32, 96, 32]],
    steps: [
      { t: W('Take only legal lobsters: above the minimum size, outside the closed season, and never a female with eggs under her tail.', 'Toma solo langostas legales: sobre la talla mínima, fuera de veda y nunca una hembra con huevos bajo la cola.') },
      { t: W('Chill it in ice water or the freezer for 20 to 30 minutes so it goes still.', 'Enfríala en agua con hielo o en el congelador de 20 a 30 minutos para que se quede quieta.') },
      { t: W('Hold the body in one hand and the tail in the other, and twist the tail off.', 'Sujeta el cuerpo con una mano y la cola con la otra, y gira hasta desprender la cola.'), at: [56, 16] },
      { t: W('Twist and pull the middle flap of the tail fan: the gut comes out with it.', 'Gira y jala la paleta del centro del abanico de la cola: la tripa sale con ella.'), at: [92, 22] },
      { t: W('Cut the soft underside of the tail with scissors and cook it in the shell, or take the meat out.', 'Corta con tijeras la parte blanda de abajo de la cola y cocínala en la cáscara, o saca la carne.'), at: [70, 44] },
      { t: W('The legs and head hold meat and flavour: boil them for soup or rice.', 'Las patas y la cabeza tienen carne y sabor: hiérvelas para sopa o arroz.') },
    ],
  },
  crab: {
    art: 'crab',
    name: W('Crab', 'Cangrejo'),
    cuts: 'M40 30 C40 38 56 38 56 30',
    arrows: [[48, 22, 48, 8]],
    steps: [
      { t: W('Chill it in ice water, then cook it alive in boiling water or kill it with one firm knife stroke through the middle of the underside.', 'Enfríalo en agua con hielo y luego cocínalo vivo en agua hirviendo o mátalo con un corte firme en el centro de la parte de abajo.') },
      { t: W('Turn it over and pull off the flap on the belly.', 'Dale vuelta y quítale la tapa de la panza.'), at: [48, 46] },
      { t: W('Lift off the top shell from the back.', 'Levanta el caparazón desde atrás.'), at: [58, 8] },
      { t: W('Pull off the soft grey gills on both sides and scrape out the guts in the middle.', 'Quita las agallas grises y blandas de los dos lados y raspa las vísceras del centro.'), at: [36, 26] },
      { t: W('Break the body in two, crack the claws and pick out the meat.', 'Parte el cuerpo en dos, quiebra las tenazas y saca la carne.'), at: [14, 4] },
    ],
  },
  shrimp: {
    art: 'shrimp',
    name: W('Peel and devein', 'Pelar y desvenar'),
    cuts: 'M30 21 L32 33 M34 20 C46 17 60 19 69 27',
    steps: [
      { t: W('Twist or cut off the head; keep heads for stock.', 'Gira o corta la cabeza; guarda las cabezas para caldo.'), at: [28, 14] },
      { t: W('Peel the shell off from the legs side, with or without the tail.', 'Pela la cáscara desde el lado de las patas, con o sin la cola.'), at: [44, 46] },
      { t: W('Cut a shallow line along the back and pull out the dark vein.', 'Haz un corte poco profundo por el lomo y saca la vena oscura.'), at: [56, 12] },
      { t: W('Rinse and keep on ice until you cook them.', 'Enjuágalos y mantenlos en hielo hasta cocinarlos.') },
    ],
  },
  octopus: {
    art: 'octopus',
    name: W('Octopus', 'Pulpo'),
    cuts: 'M38 22 C42 30 54 30 58 22',
    steps: [
      { t: W('Push out the hard beak from the middle of the arms and cut it away.', 'Saca el pico duro del centro de los brazos y córtalo.'), at: [48, 46] },
      { t: W('Turn the head inside out and cut away the guts and the ink sac.', 'Voltea la cabeza al revés y quita las vísceras y la bolsa de tinta.'), at: [64, 14] },
      { t: W('Cut out the eyes.', 'Corta los ojos.'), at: [34, 30] },
      { t: W('Rub it with coarse salt and rinse well to remove the slime.', 'Frótalo con sal gruesa y enjuágalo bien para quitarle la baba.') },
      { t: W('Tenderise it: freeze it for a day first, or simmer it slowly for 45 to 90 minutes until a knife slides in.', 'Ablándalo: congélalo un día antes, o cocínalo a fuego lento de 45 a 90 minutos hasta que el cuchillo entre fácil.') },
    ],
  },
  squid: {
    art: 'squid',
    name: W('Squid', 'Calamar'),
    cuts: 'M62 27 L62 37 M20 32 L56 32 M67 28 L67 36',
    arrows: [[70, 24, 82, 18]],
    steps: [
      { t: W('Hold the body and pull the head and arms out; the guts come with them.', 'Sujeta el cuerpo y jala la cabeza con los brazos; las vísceras salen con ellos.'), at: [76, 12] },
      { t: W('Pull the clear quill out of the body.', 'Saca la pluma transparente del cuerpo.'), at: [38, 24] },
      { t: W('Peel off the purple skin and pull off the fins.', 'Pela la piel morada y quita las aletas.'), at: [12, 20] },
      { t: W('Cut the arms off just in front of the eyes and squeeze out the beak.', 'Corta los brazos justo delante de los ojos y saca el pico apretando.'), at: [72, 44] },
      { t: W('Rinse, then cut the body into rings or open it flat.', 'Enjuaga y corta el cuerpo en anillos o ábrelo plano.') },
    ],
  },
  conch: {
    art: 'snail',
    name: W('Conch', 'Cambute'),
    cuts: 'M50 18 L56 24 M56 18 L50 24',
    arrows: [[72, 50, 88, 60]],
    steps: [
      { t: W('Knock a slit in the spire between the second and third turns from the tip, with a hammer or the back of a machete.', 'Abre una ranura en la espira entre la segunda y la tercera vuelta desde la punta, con un martillo o el lomo de un machete.'), at: [62, 26] },
      { t: W('Slide a thin knife into the slit and cut the muscle where it holds the central column.', 'Mete un cuchillo delgado por la ranura y corta el músculo donde se pega a la columna central.'), at: [42, 30] },
      { t: W('Pull the animal out by its hard claw.', 'Saca el animal jalándolo por la uña dura.'), at: [90, 50] },
      { t: W('Cut off the dark guts, the eyes and the claw, and peel off the dark skin. Keep the white meat.', 'Corta las vísceras oscuras, los ojos y la uña, y pela la piel oscura. Guarda la carne blanca.') },
      { t: W('Pound the meat to tenderise it before cooking.', 'Golpea la carne para ablandarla antes de cocinar.') },
    ],
  },
  bivalve: {
    art: 'bivalve',
    name: W('Oysters and clams', 'Ostiones y almejas'),
    cuts: 'M28 30 L68 30',
    steps: [
      { t: W('Gather only from clean water, away from river mouths, drains and towns, and not after heavy rain.', 'Recógelos solo en agua limpia, lejos de desembocaduras, desagües y pueblos, y no después de lluvias fuertes.') },
      { t: W('Scrub them, and throw away any with broken shells or that stay open when tapped.', 'Cepíllalos, y bota los que tengan la concha rota o sigan abiertos al tocarlos.') },
      { t: W('Oysters: hold cupped side down in a cloth, push an oyster knife into the hinge and twist it open.', 'Ostiones: sostenlos con el lado hondo abajo en un trapo, mete un cuchillo de ostión en la bisagra y gíralo.'), at: [48, 60] },
      { t: W('Cut the muscle under the top shell and lift it off.', 'Corta el músculo debajo de la concha de arriba y quítala.'), at: [76, 28] },
      { t: W('Clams and mussels: steam them until they open, and throw away any that stay shut.', 'Almejas y mejillones: cocínalos al vapor hasta que abran, y bota los que sigan cerrados.') },
      { t: W('Cook them well: raw shellfish can carry Vibrio and other germs.', 'Cocínalos bien: los mariscos crudos pueden tener Vibrio y otros microbios.') },
    ],
  },
  urchin: {
    art: 'urchin',
    name: W('Sea urchin roe', 'Huevas de erizo'),
    cuts: 'M56 34 A8 8 0 1 1 56 33.9',
    steps: [
      { t: W('Wear thick gloves and hold it in a towel.', 'Usa guantes gruesos y sostenlo con una toalla.') },
      { t: W('With scissors, cut a circle around the mouth on the underside and lift it off.', 'Con tijeras, corta un círculo alrededor de la boca, por debajo, y quítalo.'), at: [66, 22] },
      { t: W('Pour out the liquid and the dark guts.', 'Bota el líquido y las vísceras oscuras.') },
      { t: W('Spoon out the five orange or yellow roe strips and rinse them gently in clean seawater.', 'Saca con cuchara las cinco tiras de huevas anaranjadas o amarillas y enjuágalas suave en agua de mar limpia.') },
    ],
  },
  seaweed: {
    art: 'seaweed',
    name: W('Seaweed', 'Algas'),
    cuts: 'M28 52 L72 52',
    steps: [
      { t: W('Gather only in clean water, far from drains and river mouths. Cut above the base so it grows back.', 'Recógelas solo en agua limpia, lejos de desagües y desembocaduras. Corta arriba de la base para que vuelvan a crecer.'), at: [80, 50] },
      { t: W('Rinse it many times in fresh water to remove sand, shell bits and small animals.', 'Enjuágalas muchas veces en agua dulce para quitar arena, pedacitos de concha y animalitos.') },
      { t: W('Soak it overnight in clean water, then drain.', 'Remójalas toda la noche en agua limpia y escúrrelas.') },
      { t: W('Boil or blend as your recipe says. Dried seaweed keeps for months.', 'Hiérvelas o lícualas según la receta. Secas se guardan por meses.') },
    ],
  },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const tr = (t: Txt, lang: Lang) => t[lang] || t.en;

/** The drawing with its cuts, arrows and numbers. */
export function cleanSvg(k: CleanKey, label: string): string {
  const d = CLEAN[k];
  const arrows = (d.arrows ?? [])
    .map(([x1, y1, x2, y2]) => {
      const a = Math.atan2(y2 - y1, x2 - x1), h = 3.2;
      const p = (s: number) => `${(x2 - h * Math.cos(a + s)).toFixed(1)} ${(y2 - h * Math.sin(a + s)).toFixed(1)}`;
      return `M${x1} ${y1} L${x2} ${y2} M${p(0.5)} L${x2} ${y2} L${p(-0.5)}`;
    })
    .join(' ');
  const marks = d.steps
    .map((s, i) => (s.at ? `<g class="gd-mk"><circle cx="${s.at[0]}" cy="${s.at[1]}" r="4.3"/><text x="${s.at[0]}" y="${s.at[1] + 1.9}">${i + 1}</text></g>` : ''))
    .join('');
  return `<svg class="gd-clean-svg" viewBox="-6 -6 108 76" role="img" aria-label="${esc(label)}">
    <path class="gd-cl-art" d="${ART[d.art]}${d.extra ? ' ' + d.extra : ''}"/>
    <path class="gd-cl-cut" d="${d.cuts}"/>${arrows ? `<path class="gd-cl-arrow" d="${arrows}"/>` : ''}${marks}</svg>`;
}

/** The diagram and its steps, with the species' own notes after them. */
const DISPATCH_LINK = W(
  'Before you clean it: how you kill and bleed a fish decides its flavour and how long it keeps.',
  'Antes de limpiarlo: cómo matas y desangras un pescado decide su sabor y cuánto dura.',
);
const DISPATCH_GO = W('Kill, bleed, ice', 'Matar, desangrar, hielo');

const DISPATCH_CATCH = W(
  'Just caught it? Kill, bleed and ice it at once: it tastes better, keeps longer and is safer to eat.',
  '¿Recién pescado? Mátalo, desángralo y ponlo en hielo enseguida: sabe mejor, dura más y es más seguro.',
);
/** The link to the kill, bleed and ice page, for the catch tab (the clean tab has its own, above the diagram). */
export const dispatchLinkHtml = (lang: Lang): string =>
  `<a class="gd-dispatch" href="#dispatch"><span>${esc(tr(DISPATCH_CATCH, lang))}</span><b>${esc(tr(DISPATCH_GO, lang))} →</b></a>`;

/** Which drawings fit which group (Joseph 2026-11-16: a jellyfish was shown the small-fish steps). */
const CLEAN_FOR: Partial<Record<Group, readonly CleanKey[]>> = {
  fish: ['fillet-round', 'whole-small', 'steak-large', 'skin-tough', 'lionfish', 'flatfish', 'eel'],
  'sharks-rays': ['shark', 'ray-wing'],
  crustaceans: ['lobster', 'crab', 'shrimp'],
  cephalopods: ['octopus', 'squid'],
  molluscs: ['conch', 'bivalve'],
  echinoderms: ['urchin'],
  'plants-algae': ['seaweed'],
};
export const cleanFits = (g: Group, k: CleanKey) => !!CLEAN_FOR[g]?.includes(k);
/** The kill, bleed and ice page is about fish, sharks and rays only. */
export const hasDispatch = (g: Group) => g === 'fish' || g === 'sharks-rays';
const PREP = W('How to prepare it', 'Cómo prepararlo');
const OWN = W('For this species', 'Para esta especie');
const GENERAL = W('General steps', 'Pasos generales');

/**
 * The clean tab: the drawing and its steps with the species' own notes after them, or, for a species no drawing fits
 * (a sea cucumber, a bird, a coconut), only its own notes.
 */
export function cleanHtml(k: CleanKey | undefined, lang: Lang, notes: Txt | undefined, group: Group): string {
  const link = hasDispatch(group) ? `<a class="gd-dispatch" href="#dispatch"><span>${esc(tr(DISPATCH_LINK, lang))}</span><b>${esc(tr(DISPATCH_GO, lang))} →</b></a>` : '';
  // This species' own steps come first: they say what the general drawing below cannot (spines to cut, a shell, no scales).
  const own = notes ? `<section class="gd-blk gd-own"><h4 class="fc-mono">${esc(tr(k && cleanFits(group, k) ? OWN : PREP, lang))}</h4><p>${esc(tr(notes, lang))}</p></section>` : '';
  if (!k || !cleanFits(group, k)) return own ? link + own : '';
  const d = CLEAN[k];
  const name = tr(d.name, lang);
  return `${link}${own}
  <figure class="gd-clean">
    ${cleanSvg(k, name)}
    <figcaption><h4>${esc(own ? tr(GENERAL, lang) + ': ' + name : name)}</h4>
      <ol class="gd-steps">${d.steps.map((s) => `<li${s.at ? ' class="on"' : ''}>${esc(tr(s.t, lang))}</li>`).join('')}</ol>
    </figcaption></figure>`;
}
