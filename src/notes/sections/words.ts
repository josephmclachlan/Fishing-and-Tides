import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Plain two-language definitions of words a new local user meets in the app and the guide: tiles by theme, and a few tiny drawings where a picture says it better. */
export const words: Section = {
  id: 'words',
  title: L('Glossary', 'Glosario'),
  lede: L(
    'Plain meanings, in English and Spanish, for the words you meet in the app and the guide.',
    'Significados sencillos, en español e inglés, de las palabras que encuentra en la app y la guía.',
  ),
  blocks: [
    { k: 'h', t: L('Sea and weather', 'Mar y clima') },
    {
      k: 'tiles',
      items: [
        { ico: 'swell', h: L('Swell', 'Oleaje de fondo'), t: L('Long, regular waves from far away storms. They keep coming even when the wind here is calm.', 'Olas largas y regulares de tormentas lejanas. Siguen llegando aunque aquí el viento esté calmado.') },
        { ico: 'foam', h: L('Surf zone', 'Zona de rompiente'), t: L('The strip near shore where waves break. Dangerous for swimming and for launching small boats when the waves are big.', 'La franja cerca de la orilla donde rompen las olas. Peligrosa para nadar y para sacar botes pequeños cuando las olas son grandes.') },
        { ico: 'channel', tone: 'warn', h: L('Rip current', 'Corriente de resaca'), t: L('A narrow, strong flow from the beach out to sea through the waves. Do not fight it. Swim sideways, parallel to the beach, until it lets go, then swim in.', 'Un flujo angosto y fuerte de la playa hacia el mar a través de las olas. No luche contra ella. Nade de lado, paralelo a la playa, hasta que se suelte, y luego nade hacia la orilla.') },
        { ico: 'current', h: L('Current', 'Corriente'), t: L('Water moving one way. It can carry a swimmer, a drifting boat or a baited line away from where you started.', 'Agua que se mueve en una dirección. Puede arrastrar a un nadador, a un bote a la deriva o a una línea con carnada lejos de donde empezó.') },
        { ico: 'side', h: L('Surge', 'Vaivén del oleaje'), t: L('The back and forth push of water over rocks and reef when waves pass. It can throw a snorkeler or spearfisher into coral.', 'El empuje de ida y vuelta del agua sobre rocas y arrecife cuando pasan las olas. Puede lanzar a un buzo o pescador submarino contra el coral.') },
        { ico: 'tide', h: L('Tide', 'Marea'), t: L('The slow rise and fall of the sea, from the pull of the moon and sun. Here it is small, so wind and swell matter more on most days.', 'La subida y bajada lenta del mar, por la atracción de la luna y el sol. Aquí es pequeña, así que el viento y el oleaje importan más casi todos los días.') },
        { ico: 'clock', h: L('Tide types', 'Tipos de marea'), t: L('Some places have two high and two low tides a day, some have one, and some a mix. The Caribbean coast has a mixed, small tide.', 'Algunos lugares tienen dos pleamares y dos bajamares al día, otros una, y otros una mezcla. La costa Caribe tiene una marea mixta y pequeña.') },
        { ico: 'eye', h: L('Visibility', 'Visibilidad'), t: L('How far you can see underwater, in metres. After heavy rain, river water makes it low and brown.', 'Qué tan lejos se ve bajo el agua, en metros. Después de lluvia fuerte, el agua de los ríos la baja y la vuelve café.') },
        { ico: 'leaf', h: L('Chlorophyll', 'Clorofila'), t: L('The green pigment of tiny drifting plants (plankton). More means greener, richer water: more baitfish, but you see less.', 'El pigmento verde de las plantas diminutas a la deriva (plancton). Más significa agua más verde y rica: más carnada, pero se ve menos.') },
        { ico: 'weed', tone: 'warn', h: L('Sargassum', 'Sargazo'), t: L('Brown floating seaweed that washes onto beaches in large piles. It rots and smells, and it can irritate the eyes and lungs.', 'Alga parda flotante que llega a las playas en grandes montones. Se pudre y huele, y puede irritar los ojos y los pulmones.') },
      ],
    },
    {
      k: 'fig',
      fig: 'tides',
      label: L('Tides across a month: big tides near new and full moon, small tides near the half moons', 'Mareas durante un mes: mareas grandes cerca de luna nueva y llena, pequeñas cerca de los cuartos'),
      marks: [
        L('Spring tide (marea viva): the biggest tides of the month, near new moon and full moon. The sea rises higher and falls lower, and the currents run stronger.', 'Marea viva (spring tide): las mareas más grandes del mes, cerca de luna nueva y luna llena. El mar sube más y baja más, y las corrientes corren más fuertes.'),
        L('Neap tide (marea muerta): the smallest tides of the month, near the half moons. The water moves less and the currents are weaker.', 'Marea muerta (neap tide): las mareas más pequeñas del mes, cerca de los cuartos de luna. El agua se mueve menos y las corrientes son más débiles.'),
      ],
    },
    {
      k: 'fig',
      fig: 'thermo',
      label: L('Warm water on top, a thin layer, then cold water below, with fish along the layer', 'Agua tibia arriba, una capa delgada y agua fría abajo, con peces a lo largo de la capa'),
      marks: [L('Thermocline (termoclina): the depth where warm surface water suddenly turns cold below. Fish often gather along it.', 'Termoclina (thermocline): la profundidad donde el agua tibia de la superficie pasa de golpe a agua fría abajo. Los peces suelen juntarse a lo largo de ella.')],
    },
    { k: 'h', t: L('Poisoning and freshness', 'Intoxicación y frescura') },
    {
      k: 'tiles',
      items: [
        { ico: 'nofish', tone: 'stop', h: L('Ciguatera', 'Ciguatera'), t: L('A fish poisoning from a toxin that builds up in big reef fish. You cannot see, smell or taste it, and cooking does not remove it.{cdc}', 'Una intoxicación por una toxina que se acumula en peces grandes de arrecife. No se ve, huele ni saborea, y cocinar no la elimina.{cdc}') },
        { ico: 'thermo', tone: 'warn', h: L('Scombroid', 'Escombroide'), t: L('A food poisoning from fish that warmed up after being caught, such as tuna, mahi and wahoo. Flushing, headache and a rash soon after eating. Ice the fish at once.', 'Una intoxicación por pescado que se calentó después de pescado, como atún, dorado y peto. Enrojecimiento, dolor de cabeza y sarpullido poco después de comer. Ponga hielo al pescado de inmediato.') },
        { ico: 'drop', tone: 'warn', h: L('Histamine', 'Histamina'), t: L('The chemical that builds up in spoiled fish and causes scombroid. Heat and cooking do not break it down.', 'La sustancia química que se acumula en el pescado echado a perder y causa la escombroide. El calor y la cocción no la destruyen.') },
        { ico: 'snow', tone: 'go', h: L('Ceviche-fresh', 'Fresco para ceviche'), t: L('Fish kept cold and cleaned quickly from the moment it was caught, so it is fit to eat raw in ceviche.', 'Pescado mantenido frío y limpiado rápido desde que se pescó, así que sirve para comerse crudo en ceviche.') },
        { ico: 'knife', h: L('Ikejime', 'Ikejime'), t: L('A Japanese way to kill a fish fast by spiking the brain and bleeding it. The meat stays firmer and keeps longer.', 'Una forma japonesa de matar un pez rápido clavándole el cerebro y desangrándolo. La carne queda más firme y dura más.') },
        { ico: 'gauge', h: L('K-value', 'Valor K'), t: L('A lab score of how fresh a fish is. A low number means very fresh, and it rises as the fish ages.', 'Una medida de laboratorio de qué tan fresco está un pescado. Un número bajo significa muy fresco, y sube a medida que el pescado envejece.') },
      ],
    },
    { k: 'h', t: L('Fish names and groups', 'Nombres y grupos de peces') },
    {
      k: 'tiles',
      items: [
        { ico: 'fish', h: L('Pargo', 'Pargo'), t: L('Snapper. In the app, fish of the snapper family. Large reef snappers such as cubera and dog snapper carry ciguatera risk.', 'Pargo. En la app, los peces de la familia de los pargos. Los pargos grandes de arrecife, como el cubera y el perro, tienen riesgo de ciguatera.') },
        { ico: 'fish', h: L('Jurel', 'Jurel'), t: L('Jack. A fast, silvery fish of open water and reefs. Large jacks carry ciguatera risk.', 'Jurel. Un pez plateado y rápido de aguas abiertas y arrecifes. Los jureles grandes tienen riesgo de ciguatera.') },
        { ico: 'fish', h: L('Róbalo', 'Róbalo'), t: L('Snook. A fish of river mouths and lagoons. Check the local rules for snook before keeping one.', 'Róbalo. Un pez de desembocaduras de ríos y lagunas. Revise las reglas locales del róbalo antes de quedarse con uno.') },
        { ico: 'nofish', tone: 'stop', h: L('Picúa', 'Picúa'), t: L('Barracuda. Never eat it: it carries a high ciguatera risk.{cdc}', 'Barracuda. Nunca la coma: tiene alto riesgo de ciguatera.{cdc}') },
        { ico: 'layers', h: L('Family, genus, order', 'Familia, género, orden'), t: L('Groups used to sort living things. A family holds related genera, and a genus holds closely related species. The order is a larger group above the family.', 'Grupos para clasificar a los seres vivos. Una familia reúne géneros emparentados, y un género reúne especies muy cercanas. El orden es un grupo más grande sobre la familia.') },
        { ico: 'stack', h: L('Forms', 'Formas'), t: L('In the guide, the different looks of one species, such as colour phases or young and adult fish.', 'En la guía, los distintos aspectos de una misma especie, como fases de color o peces jóvenes y adultos.') },
      ],
    },
    {
      k: 'flow',
      h: L('LC, NT, VU, EN, CR', 'LC, NT, VU, EN, CR'),
      steps: [
        { ico: 'shield', tone: 'go', h: L('LC', 'LC'), t: L('Least Concern', 'Preocupación menor') },
        { ico: 'shield', tone: 'go', h: L('NT', 'NT'), t: L('Near Threatened', 'Casi amenazada') },
        { ico: 'shield', tone: 'warn', h: L('VU', 'VU'), t: L('Vulnerable', 'Vulnerable') },
        { ico: 'shield', tone: 'stop', h: L('EN', 'EN'), t: L('Endangered', 'En peligro') },
        { ico: 'shield', tone: 'stop', h: L('CR', 'CR'), t: L('Critically Endangered', 'En peligro crítico') },
      ],
    },
    {
      k: 'tiles',
      items: [{ ico: 'ask', h: L('IUCN Red List', 'Lista Roja de la UICN'), t: L('An international science group ranks species from safest (LC) to most threatened (CR). VU, EN and CR together are called threatened.{iucn}', 'Un grupo científico internacional clasifica las especies del más seguro (LC) al más amenazado (CR). VU, EN y CR juntos se llaman amenazadas.{iucn}') }],
    },
    { k: 'h', t: L('Body and size', 'Cuerpo y tamaño') },
    {
      k: 'fig',
      fig: 'fishparts',
      label: L('A jack from the side with its dorsal fin, scutes and forked tail, and its fork length and total length measured', 'Un jurel de lado con su aleta dorsal, escudetes y cola bifurcada, y su longitud furcal y total medidas'),
      marks: [
        L('Dorsal fin (aleta dorsal): the fin on the back. In many fish it has sharp spines, so hold the fish carefully.', 'Aleta dorsal (dorsal fin): la aleta del lomo. En muchos peces tiene espinas filosas, así que sostenga el pez con cuidado.'),
        L('Scutes (escudetes): hard, bony plates along the side of a fish or on a turtle’s shell. Jacks have them in front of the tail.', 'Escudetes (scutes): placas duras y óseas a lo largo del costado de un pez o en el caparazón de una tortuga. Los jureles las tienen antes de la cola.'),
        L('Caudal fin (aleta caudal): the tail fin. Its shape (forked, rounded, straight) helps tell species apart.', 'Aleta caudal (caudal fin): la aleta de la cola. Su forma (bifurcada, redondeada, recta) ayuda a distinguir las especies.'),
        L('Fork length (longitud furcal): from the nose to the fork (the notch) in the tail. Used for tuna, jacks and other fish with a forked tail.', 'Longitud furcal (fork length): del hocico a la horquilla (la muesca) de la cola. Se usa en atunes, jureles y otros peces de cola bifurcada.'),
        L('Total length (longitud total): from the nose to the tip of the longest tail lobe, with the tail pressed together.', 'Longitud total (total length): del hocico a la punta del lóbulo más largo de la cola, con la cola cerrada.'),
      ],
    },
    {
      k: 'fig',
      fig: 'widths',
      label: L('A ray measured wing tip to wing tip, and a crab measured across its shell', 'Una raya medida de punta a punta de las aletas, y una jaiba medida a lo ancho del caparazón'),
      marks: [
        L('Disc width (ancho de disco): the width of a ray or skate across its flat body, wing tip to wing tip.', 'Ancho de disco (disc width): el ancho de una raya a través de su cuerpo plano, de punta a punta de las aletas.'),
        L('Carapace width (ancho de caparazón): the width of a crab’s shell at its widest point, not counting the spines.', 'Ancho de caparazón (carapace width): el ancho del caparazón de un cangrejo en su parte más ancha, sin contar las espinas.'),
      ],
    },
    {
      k: 'tiles',
      items: [{ ico: 'fish', h: L('Barbels', 'Barbillas'), t: L('The whisker-like feelers near the mouth of catfish and some other fish. Catfish barbels and spines can sting.', 'Los bigotes sensoriales cerca de la boca de los bagres y de otros peces. Las barbillas y espinas de los bagres pueden picar.') }],
    },
    { k: 'h', t: L('Rules and places', 'Reglas y lugares') },
    {
      k: 'tiles',
      items: [
        { ico: 'calendar', tone: 'warn', h: L('Veda', 'Veda'), t: L('A closed season, when catching or taking a species is banned so it can breed. Dates change, so confirm with INCOPESCA.', 'Una temporada cerrada, cuando se prohíbe capturar o extraer una especie para que se reproduzca. Las fechas cambian, así que confirme con INCOPESCA.') },
        { ico: 'card', h: L('Carné', 'Carné'), t: L('The licence card that INCOPESCA gives a fisher. Spearfishing needs the permit and the card, and you must be 18 or older.', 'El carné de licencia que el INCOPESCA entrega a un pescador. La pesca submarina necesita el permiso y el carné, y debe ser mayor de 18 años.') },
        { ico: 'bank', h: L('INCOPESCA', 'INCOPESCA'), t: L('Instituto Costarricense de Pesca y Acuicultura, the national fisheries authority. It sets fishing rules and gives licences.', 'Instituto Costarricense de Pesca y Acuicultura, la autoridad nacional de pesca. Fija las reglas de pesca y da las licencias.') },
        { ico: 'park', h: L('SINAC', 'SINAC'), t: L('Sistema Nacional de Áreas de Conservación. It runs the national parks and refuges, such as Cahuita and Gandoca-Manzanillo.', 'Sistema Nacional de Áreas de Conservación, que administra los parques nacionales y refugios, como Cahuita y Gandoca-Manzanillo.') },
        { ico: 'hospital', h: L('CCSS', 'CCSS'), t: L('Caja Costarricense de Seguro Social, the public health service. Its clinics treat stings and bites.', 'Caja Costarricense de Seguro Social, el servicio público de salud. Sus clínicas atienden picaduras y mordeduras.') },
        { ico: 'shield', h: L('Marine protected area', 'Área marina protegida'), t: L('A part of the sea with special rules to protect nature. Fishing can be limited or banned there, so ask SINAC.', 'Una parte del mar con reglas especiales para proteger la naturaleza. La pesca puede estar limitada o prohibida, así que pregunte a SINAC.') },
        { ico: 'gauge', h: L('Bite score', 'Puntaje de pique'), t: L('The app’s 0 to 100 estimate of how likely fish are to feed, from tide, wind, swell and water conditions. A guide, not a promise.', 'La estimación de la app, de 0 a 100, de qué tan probable es que los peces coman, con marea, viento, oleaje y condiciones del agua. Es una guía, no una promesa.') },
      ],
    },
    { k: 'h', t: L('Fishing words', 'Palabras de pesca') },
    {
      k: 'tiles',
      items: [
        { ico: 'line', h: L('Handline', 'Cuerda de mano'), t: L('Fishing with a line held in the hand, with no rod or reel. Simple and common on small boats.', 'Pescar con una línea sostenida en la mano, sin caña ni carrete. Sencillo y común en botes pequeños.') },
        { ico: 'weight', h: L('Bottom fishing', 'Pesca de fondo'), t: L('A baited hook and a weight on or near the bottom, for snappers, groupers and other bottom fish.', 'Un anzuelo con carnada y un peso sobre o cerca del fondo, para pargos, meros y otros peces de fondo.') },
        { ico: 'boat', h: L('Trolling', 'Corricando'), t: L('Towing lures or baits behind a moving boat to catch fish such as tuna, mahi and wahoo.', 'Arrastrar señuelos o carnadas detrás de un bote en movimiento para pescar atún, dorado y peto.') },
        { ico: 'bolt', h: L('Jigging', 'Pesca con jig'), t: L('Dropping a metal lure and lifting it up and down so it looks like a hurt baitfish.', 'Dejar caer un señuelo de metal y subirlo y bajarlo para que parezca un pez de carnada herido.') },
      ],
    },
    {
      k: 'fig',
      fig: 'tackle',
      label: L('A main line, a leader and a tippet, then a circle hook and a barbless hook', 'Una línea principal, un líder y un tippet, y luego un anzuelo circular y uno sin lengüeta'),
      marks: [
        L('Leader (líder): the strong, short line between your main line and the hook. It resists teeth and rough skin.', 'Líder (leader): la línea fuerte y corta entre su línea principal y el anzuelo. Resiste dientes y pieles ásperas.'),
        L('Tippet: the last, thinner piece of line at the end of a leader, joined to the lure or fly. It is the part the fish sees.', 'Tippet: el último trozo, más delgado, de línea al final del líder, unido al señuelo o la mosca. Es la parte que el pez ve.'),
        L('Circle hook (anzuelo circular): a hook bent round in a circle. It usually catches the corner of the mouth, not the throat, so the fish is hurt less.', 'Anzuelo circular (circle hook): un anzuelo curvado en círculo. Suele engancharse en la comisura de la boca y no en la garganta, así que el pez sufre menos.'),
        L('Barbless hook (anzuelo sin lengüeta): a hook without the small backward point, or with it pressed flat. It comes out easily.', 'Anzuelo sin lengüeta (barbless hook): un anzuelo sin la pequeña punta hacia atrás, o con ella aplastada. Sale fácil.'),
      ],
    },
    {
      k: 'fig',
      fig: 'floatline',
      label: L('A diver on one breath, a line up to a float on the surface, and a speared fish on the line', 'Un buzo con una sola respiración, una línea hasta un flotador en la superficie y un pez arponeado en la línea'),
      marks: [
        L('Float: marks where the diver is.', 'Flotador: marca dónde está el buzo.'),
        L('Floatline (línea de flotador): a line from a spearfisher to a float on the surface. It holds the speared fish.', 'Línea de flotador (floatline): una línea del pescador submarino a un flotador en la superficie. Sostiene el pez arponeado.'),
        L('Breath-hold (apnea): diving on one breath of air, with no tank. Never dive alone and never hyperventilate before a dive.', 'Apnea (breath-hold): bucear con una sola respiración de aire, sin tanque. Nunca bucee solo y nunca hiperventile antes de bucear.'),
      ],
      tones: ['info', 'info', 'warn'],
    },
    {
      k: 'fig',
      fig: 'descender',
      label: L('A weight on a line takes a fish from the boat back down to the depth where it was caught', 'Un peso en una línea lleva a un pez del bote de vuelta a la profundidad donde se pescó'),
      marks: [L('Descender device (descendedor): a weight on a line that sends a deep-caught fish back down quickly, to the depth where it was caught.', 'Descendedor (descender device): un peso en una línea que devuelve rápido hacia abajo a un pez pescado en aguas profundas, a la profundidad donde se pescó.')],
    },
  ],
  sources: {
    cdc: {
      t: 'CDC Yellow Book: Food Poisoning from Marine Toxins',
      u: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/food-poisoning-from-marine-toxins.html',
      p: 'P',
      what: L('Ciguatera cause, no way to see or cook out the toxin, never eat barracuda.', 'Causa de la ciguatera, la toxina no se ve ni se elimina cocinando, nunca comer barracuda.'),
    },
    iucn: {
      t: 'IUCN Red List Categories and Criteria, Version 3.1, Second edition (2012)',
      u: 'https://portals.iucn.org/library/sites/library/files/documents/RL-2001-001-2nd.pdf',
      p: 'P',
      what: L('The five statuses used in the guide, from Least Concern to Critically Endangered and that Vulnerable, Endangered and Critically Endangered together are called threatened.', 'Los cinco estados usados en la guía, de Preocupación menor a En peligro crítico, y que Vulnerable, En peligro y En peligro crítico juntos se llaman amenazadas.'),
    },
  },
};
