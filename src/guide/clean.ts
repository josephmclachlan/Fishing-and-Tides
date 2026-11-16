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
  /** A drawing of its own in place of the guide's animal (several views, a section), as SVG markup. */
  draw?: string;
  /** First aid or a hazard, shown in a red box above the drawing. */
  warn?: Txt;
  steps: Step[];
}

/** A cubic Bezier sampled to find y at a given x on the guide's fish back (art.ts `fish`). */
function backY(x: number): number {
  const segs = [[[10, 33], [18, 19], [38, 13], [56, 17]], [[56, 17], [64, 19], [70, 24], [74, 29]]];
  let best = 33, bd = 1e9;
  for (const [a, b, c, d] of segs)
    for (let i = 0; i <= 200; i++) {
      const t = i / 200, u = 1 - t;
      const px = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
      const py = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
      if (Math.abs(px - x) < bd) (bd = Math.abs(px - x)), (best = py);
    }
  return best;
}
const n1 = (v: number) => Math.round(v * 10) / 10;
/** The lionfish's 13 venomous spines along the back, leaning toward the tail (graphics review G-2). */
const LION_SPINES = Array.from({ length: 13 }, (_, i) => {
  const x = 22 + i * 3.3, y = backY(x);
  return `M${n1(x)} ${n1(y)} L${n1(x + 4)} ${n1(y - 13)}`;
}).join(' ');
/** The guide's fish without its dorsal fin, for the lionfish. */
const FISH_BODY = 'M10 33 C18 19 38 13 56 17 C64 19 70 24 74 29 L88 19 L86 33 L88 47 L74 37 C70 42 64 46 56 48 C38 52 18 46 10 33 Z M30 22 C34 28 34 37 30 43 M21 30 m2.4 0 a2.4 2.4 0 1 1 -4.8 0 a2.4 2.4 0 1 1 4.8 0';

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
    // Left: the fish from the side, cut across for steaks. Right: the fish cut through, seen end on, its four loins.
    draw:
      `<g transform="translate(0 4) scale(0.56)"><path class="gd-cl-art" d="${ART.fish}"/><path class="gd-cl-cut" d="M32 29 L34 38 M60 47 C46 50 34 48 28 44 M42 17 L42 47 M50 17 L50 48 M58 18 L58 47 M66 22 L66 43"/></g>` +
      '<path class="gd-cl-fill" d="M74 8 C86 14 90 24 90 32 C90 42 84 50 74 54 C64 50 58 42 58 32 C58 24 62 14 74 8 Z"/>' +
      '<path class="gd-cl-art" d="M74 8 C86 14 90 24 90 32 C90 42 84 50 74 54 C64 50 58 42 58 32 C58 24 62 14 74 8 Z M76.5 31 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 1 1 5 0"/>' +
      '<path class="gd-cl-dark" d="M70 31 C70 27 78 27 78 31 C78 35 70 35 70 31 Z"/>' +
      '<path class="gd-cl-arrow" d="M50 20 L56 24"/>',
    cuts: 'M58 31 L90 31 M74 8 L74 54',
    steps: [
      { t: W('Bleed it at once (cut behind the side fin or through the gills) and put it on ice. Tuna, bonito and dorado left warm can cause scombroid poisoning.', 'Desángralo de inmediato (corta detrás de la aleta lateral o en las agallas) y ponlo en hielo. El atún, el bonito y el dorado que se calientan pueden causar intoxicación escombroide.'), at: [12, 40] },
      { t: W('Gut it: open the belly from the vent to the throat and take out the guts and the gills.', 'Vacíalo: abre la panza del ano a la garganta y saca las vísceras y las agallas.'), at: [28, 42] },
      { t: W('For steaks, cut straight across the body every 2 to 3 cm, through the backbone, with a heavy knife.', 'Para postas, corta de lado a lado cada 2 a 3 cm, atravesando el espinazo, con un cuchillo pesado.'), at: [30, 2] },
      { t: W('For loins, cut along the middle line of the side and along the back to the spine, and lift the four loins off the bone. On the right, the fish is drawn cut through: the cuts split it into four loins round the backbone.', 'Para lomos, corta por la línea media del costado y por el lomo hasta el espinazo, y despega los cuatro lomos. A la derecha, el pez cortado de través: los cortes lo dividen en cuatro lomos alrededor del espinazo.'), at: [94, 6] },
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
    draw:
      `<path class="gd-cl-fan" d="M32 34 C42 28 58 30 66 44 C56 52 42 50 34 40 Z M34 36 L64 40 M34 37 L62 46 M34 35 L60 34 M34 38 L56 50"/>` +
      `<path class="gd-cl-art" d="${FISH_BODY} M36 49 L31 59 M41 49 L38 60 M60 45 L64 55 M64 43 L69 52 M67 41 L73 48"/>` +
      `<path class="gd-cl-spine" d="${LION_SPINES}"/>`,
    cuts: 'M20 21 C34 13 52 13 66 21 M34 50 L43 49 M58 46 L68 41',
    warn: W(
      'If a spine pricks you: put the wound in water as hot as you can stand without burning (about 45 °C) for 30 to 90 minutes, and see a doctor if the pain is strong or it swells.',
      'Si una espina te pica: mete la herida en agua tan caliente como aguantes sin quemarte (unos 45 °C) de 30 a 90 minutos, y ve al médico si el dolor es fuerte o se hincha.',
    ),
    steps: [
      { t: W('Wear thick gloves. With kitchen scissors, cut off every venomous spine: the 13 along the back first. The big side fans are not venomous.', 'Usa guantes gruesos. Con tijeras de cocina corta cada espina venenosa: primero las 13 del lomo. Las aletas grandes de los lados no son venenosas.'), at: [44, 22] },
      { t: W('Cut off the 2 spines under the belly (the pelvic fins).', 'Corta las 2 espinas debajo de la panza (aletas pélvicas).'), at: [28, 54] },
      { t: W('Cut off the 3 spines in front of the tail on the underside (the anal fin).', 'Corta las 3 espinas de abajo, delante de la cola (aleta anal).'), at: [76, 54] },
      { t: W('Put the spines in a closed container: they can still sting after the fish is dead.', 'Pon las espinas en un recipiente cerrado: todavía pueden picar con el pez muerto.') },
      { t: W('Fillet it like any round fish (no need to scale if you skin the fillets). The meat is white and mild. The venom is only in the spines, not in the meat.', 'Filetéalo como cualquier pez (no hace falta escamar si le quitas la piel). La carne es blanca y suave. El veneno solo está en las espinas, no en la carne.') },
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
    arrows: [[22, 30, 44, 39]],
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
    extra: 'M62 50 L86 50 L94 55 L86 60 L62 60 Z M68 50 L68 60 M74 50 L74 60 M80 50 L80 60',
    cuts: 'M56 23 L56 41 M62 52.5 L86 52.5 M62 57.5 L86 57.5',
    arrows: [[86, 32, 96, 32]],
    steps: [
      { t: W('Take only legal lobsters: above the minimum size, outside the closed season, and never a female with eggs under her tail.', 'Toma solo langostas legales: sobre la talla mínima, fuera de veda y nunca una hembra con huevos bajo la cola.') },
      { t: W('Chill it in ice water or the freezer for 20 to 30 minutes so it goes still.', 'Enfríala en agua con hielo o en el congelador de 20 a 30 minutos para que se quede quieta.') },
      { t: W('Hold the body in one hand and the tail in the other, and twist the tail off.', 'Sujeta el cuerpo con una mano y la cola con la otra, y gira hasta desprender la cola.'), at: [56, 16] },
      { t: W('Twist and pull the middle flap of the tail fan: the gut comes out with it.', 'Gira y jala la paleta del centro del abanico de la cola: la tripa sale con ella.'), at: [92, 22] },
      { t: W('Turn the tail over (drawn small, bottom right) and cut along both edges of the soft underside with scissors. Cook it in the shell, or take the meat out.', 'Corta con tijeras la parte blanda de abajo de la cola y cocínala en la cáscara, o saca la carne.'), at: [55, 55] },
      { t: W('The legs and head hold meat and flavour: boil them for soup or rice.', 'Las patas y la cabeza tienen carne y sabor: hiérvelas para sopa o arroz.') },
    ],
  },
  crab: {
    art: 'crab',
    name: W('Crab', 'Cangrejo'),
    // Left: the underside with its flap. Right: the top shell lifted off, the gills on each side and the guts between.
    draw:
      '<path class="gd-cl-art" d="M6 30 C6 20 14 16 22 16 C30 16 38 20 38 30 C38 40 30 44 22 44 C14 44 6 40 6 30 Z M7 32 L1 36 M8 36 L2 42 M10 40 L5 47 M37 32 L43 36 M36 36 L42 42 M34 40 L39 47 M10 22 L6 16 L2 18 M6 16 L4 11 M34 22 L38 16 L42 18 M38 16 L40 11"/>' +
      '<path class="gd-cl-fill" d="M17 29 L27 29 L25.5 42 L18.5 42 Z"/><path class="gd-cl-art" d="M17 29 L27 29 L25.5 42 L18.5 42 Z"/>' +
      '<path class="gd-cl-fill" d="M56 12 C58 2 86 2 88 12 Z"/><path class="gd-cl-art" d="M56 12 C58 2 86 2 88 12 Z"/>' +
      '<path class="gd-cl-art" d="M54 34 C54 26 62 22 72 22 C82 22 90 26 90 34 C90 42 82 46 72 46 C62 46 54 42 54 34 Z M55 36 L49 40 M56 40 L51 46 M89 36 L95 40 M88 40 L93 46"/>' +
      '<path class="gd-cl-gill" d="M58 29 L66 31 M57 33 L66 34 M58 37 L66 37 M58 41 L65 40 M86 29 L78 31 M87 33 L78 34 M86 37 L78 37 M86 41 L79 40"/>',
    cuts: 'M75 34 a3 3 0 1 1 -6 0 a3 3 0 1 1 6 0',
    arrows: [[22, 44, 22, 56], [94, 20, 94, 8]],
    steps: [
      { t: W('Chill it in ice water, then cook it alive in boiling water or kill it with one firm knife stroke through the middle of the underside.', 'Enfríalo en agua con hielo y luego cocínalo vivo en agua hirviendo o mátalo con un corte firme en el centro de la parte de abajo.'), at: [22, 23] },
      { t: W('Turn it over and pull off the flap on the belly.', 'Dale vuelta y quítale la tapa de la panza.'), at: [31, 54] },
      { t: W('Lift off the top shell from the back.', 'Levanta el caparazón desde atrás.'), at: [100, 2] },
      { t: W('Pull off the soft grey gills on both sides and scrape out the guts in the middle.', 'Quita las agallas grises y blandas de los dos lados y raspa las vísceras del centro.'), at: [60, 52] },
      { t: W('Break the body in two, crack the claws and pick out the meat.', 'Parte el cuerpo en dos, quiebra las tenazas y saca la carne.'), at: [-1, 6] },
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
    extra: 'M38 12 C42 2 54 2 58 12 M58 12 L54.5 10.5 M58 12 L59 8.4',
    cuts: 'M47.6 28 a3.6 3.6 0 1 1 -7.2 0 a3.6 3.6 0 1 1 7.2 0 M55.6 28 a3.6 3.6 0 1 1 -7.2 0 a3.6 3.6 0 1 1 7.2 0',
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
    // The spire points left, knobbed along its shoulder; the big lip flares up and right, the opening runs along it;
    // the column inside, where the muscle holds, is dashed.
    draw:
      '<path class="gd-cl-fill" d="M4 30 L40 10 C60 0 84 2 94 16 C96 30 88 46 70 56 L36 60 L30 48 Z"/>' +
      '<path class="gd-cl-art" d="M4 30 L40 10 C60 0 84 2 94 16 C96 30 88 46 70 56 L36 60 L30 48 Z M14 25 L13 35 M24 19 L21 41 M34 14 L29 46 M27 17 l1 -6 l3 5 M38 11 l2 -6 l3 5 M49 6 l2 -6 l3 5"/>' +
      '<path class="gd-cl-dark" d="M38 59 C56 52 76 40 86 22 C84 38 70 54 46 60 Z"/>' +
      '<path class="gd-cl-see" d="M21 32 C30 40 36 48 38 58"/>',
    cuts: 'M16 27 L22 33 M22 27 L16 33 M24 37 L30 41',
    arrows: [[62, 54, 68, 66]],
    steps: [
      { t: W('Knock a slit in the spire between the second and third turns from the tip, with a hammer or the back of a machete.', 'Abre una ranura en la espira entre la segunda y la tercera vuelta desde la punta, con un martillo o el lomo de un machete.'), at: [10, 18] },
      { t: W('Slide a thin knife into the slit and cut the muscle where it holds the central column.', 'Mete un cuchillo delgado por la ranura y corta el músculo donde se pega a la columna central.'), at: [36, 36] },
      { t: W('Pull the animal out by its hard claw.', 'Saca el animal jalándolo por la uña dura.'), at: [78, 64] },
      { t: W('Cut off the dark guts, the eyes and the claw, and peel off the dark skin. Keep the white meat.', 'Corta las vísceras oscuras, los ojos y la uña, y pela la piel oscura. Guarda la carne blanca.') },
      { t: W('Pound the meat to tenderise it before cooking.', 'Golpea la carne para ablandarla antes de cocinar.') },
    ],
  },
  bivalve: {
    art: 'bivalve',
    name: W('Oysters and clams', 'Ostiones y almejas'),
    // Left: an oyster, rough, its hinge at the narrow top. Right: a clam, round, with growth rings.
    draw:
      '<path class="gd-cl-fill" d="M8 44 C4 30 14 14 26 10 C34 8 40 14 42 24 C44 36 38 50 26 54 C18 56 10 52 8 44 Z"/>' +
      '<path class="gd-cl-art" d="M8 44 C4 30 14 14 26 10 C34 8 40 14 42 24 C44 36 38 50 26 54 C18 56 10 52 8 44 Z M13 42 C16 30 22 22 30 15 M18 50 C24 40 30 32 38 25 M10 36 l3 2 M38 40 l3 -2"/>' +
      '<path class="gd-cl-fill" d="M54 40 C54 24 64 14 76 14 C88 14 96 24 96 40 C96 48 90 52 76 52 C62 52 54 48 54 40 Z"/>' +
      '<path class="gd-cl-art" d="M54 40 C54 24 64 14 76 14 C88 14 96 24 96 40 C96 48 90 52 76 52 C62 52 54 48 54 40 Z M58 41 C58 28 66 20 76 20 C86 20 92 28 92 41 M62 42 C62 32 68 26 76 26 C84 26 88 32 88 42 M70 14 L76 10 L82 14"/>',
    cuts: 'M22 13 L32 11 M14 34 L40 30',
    steps: [
      { t: W('Gather only from clean water, away from river mouths, drains and towns, and not after heavy rain.', 'Recógelos solo en agua limpia, lejos de desembocaduras, desagües y pueblos, y no después de lluvias fuertes.') },
      { t: W('Scrub them, and throw away any with broken shells or that stay open when tapped.', 'Cepíllalos, y bota los que tengan la concha rota o sigan abiertos al tocarlos.') },
      { t: W('Oysters: hold cupped side down in a cloth, push an oyster knife into the hinge and twist it open.', 'Ostiones: sostenlos con el lado hondo abajo en un trapo, mete un cuchillo de ostión en la bisagra y gíralo.'), at: [27, 3] },
      { t: W('Cut the muscle under the top shell and lift it off.', 'Corta el músculo debajo de la concha de arriba y quítala.'), at: [46, 32] },
      { t: W('Clams and mussels: steam them until they open, and throw away any that stay shut.', 'Almejas y mejillones: cocínalos al vapor hasta que abran, y bota los que sigan cerrados.'), at: [76, 58] },
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
    ${d.draw ?? `<path class="gd-cl-art" d="${ART[d.art]}${d.extra ? ' ' + d.extra : ''}"/>`}${d.draw && d.extra ? `<path class="gd-cl-art" d="${d.extra}"/>` : ''}
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
  const warn = d.warn ? `<section class="gd-cl-warn"><p>${esc(tr(d.warn, lang))}</p></section>` : '';
  return `${link}${warn}${own}
  <figure class="gd-clean">
    ${cleanSvg(k, name)}
    <figcaption><h4>${own ? `<small class="fc-mono">${esc(tr(GENERAL, lang))}</small>` : ''}${esc(name)}</h4>
      <ol class="gd-steps">${d.steps.map((s) => `<li${s.at ? ' class="on"' : ''}>${esc(tr(s.t, lang))}</li>`).join('')}</ol>
    </figcaption></figure>`;
}
