import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => L(m, ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]));

/**
 * Bait, knots and rigs for local edible fish, shown as drawings (art/rigs.ts): the two outfits, line and hook sizes,
 * each rig as a labelled diagram whose numbers are its steps, each knot as four stages of the real tie, bait per fish.
 * Tackle sizes follow the guide's per-species tackle lines.
 */
export const rigs: Section = {
  id: 'rigs',
  title: L('Rigs', 'Aparejos'),
  lede: L('Bait, knots and rigs for the fish people here eat: snapper, jack, snook, mackerel and small grouper.', 'Carnada, nudos y aparejos para los peces que aquí se comen: pargo, jurel, róbalo, macarela y mero pequeño.'),
  blocks: [
    {
      k: 'cards',
      h: L('The two outfits', 'Los dos equipos'),
      items: [
        {
          fig: 'rghand',
          tag: L('Cordel', 'Cordel'),
          h: L('Hand line', 'Cordel'),
          t: L(
            'A plastic spool or frame wound with 30 to 50 m of nylon rated 20 to 40 lb (9 to 18 kg). Tie on a leader, a hook and, if needed, a sinker, and let the line out by hand.',
            'Un carrete o armazón de plástico con 30 a 50 m de nylon de 20 a 40 lb (9 a 18 kg). Se amarra un líder, un anzuelo y, si hace falta, un plomo, y se suelta la línea con la mano.',
          ),
          list: [L('Costs little.', 'Cuesta poco.'), L('Works from a pier, a rock or a small boat.', 'Sirve desde un muelle, una roca o una lancha pequeña.'), L('You feel every nibble in your fingers.', 'Se siente cada mordida en los dedos.')],
        },
        {
          fig: 'rgspin',
          tag: L('Spinning', 'Spinning'),
          h: L('Spinning outfit', 'Equipo de spinning'),
          t: L(
            'A rod 2 to 2.4 m (7 to 8 ft) long with a spinning reel, the kind where the line comes off a fixed spool. The line to load for each fish is in the chart below.',
            'Una caña de 2 a 2,4 m (7 a 8 pies) con un carrete de spinning, el de carrete fijo del que sale la línea. La línea para cada pez está en el gráfico de abajo.',
          ),
        },
      ],
    },
    {
      k: 'fig',
      fig: 'rglines',
      label: L('Main line and leader strength for each fish, in pounds', 'Resistencia de la línea principal y del líder para cada pez, en libras'),
      marks: [
        L(
          'Solid bar: the main line. Snapper and small grouper 10 to 20 lb (4.5 to 9 kg), snook and mackerel 20 to 30 lb (9 to 14 kg). The hand line is 20 to 40 lb (9 to 18 kg).',
          'Barra llena: la línea principal. Pargo y mero pequeño 10 a 20 lb (4,5 a 9 kg), róbalo y macarela 20 a 30 lb (9 a 14 kg). El cordel es de 20 a 40 lb (9 a 18 kg).',
        ),
        L(
          'Open bar: the leader (líder), the last 0.5 to 1 m before the hook, thicker or tougher so teeth, gill covers and rocks cannot cut it easily. Thin fluorocarbon 20 to 30 lb for shy snapper, 40 to 60 lb (18 to 27 kg) for snook.',
          'Barra vacía: el líder, los últimos 0,5 a 1 m antes del anzuelo, más grueso o más fuerte para que dientes, agallas y rocas no lo corten fácil. Fluorocarbono delgado de 20 a 30 lb para el pargo desconfiado, de 40 a 60 lb (18 a 27 kg) para el róbalo.',
        ),
        L('Mackerel has sharp teeth: use a short piece of light wire or heavy fluorocarbon as the leader.', 'La macarela tiene dientes filosos: use de líder un tramo corto de cable fino o fluorocarbono grueso.'),
        L('Jack fights hard: 30 to 50 lb (14 to 23 kg) braid and a strong leader.', 'El jurel pelea fuerte: trenzado de 30 a 50 lb (14 a 23 kg) y un líder fuerte.'),
      ],
    },
    {
      k: 'fig',
      fig: 'rghooks',
      label: L('Hook sizes from 1/0 to 6/0 and the fish each suits, with a J hook beside a circle hook', 'Tamaños de anzuelo de 1/0 a 6/0 y el pez para cada uno, con un anzuelo en J junto a uno circular'),
      marks: [
        L(
          'A bigger number before the slash means a bigger hook. Snapper and mackerel 1/0 to 2/0, grouper 2/0 to 4/0 circle hooks, snook and jack 4/0 to 6/0.',
          'Un número mayor antes de la barra es un anzuelo más grande. Pargo y macarela 1/0 a 2/0, mero 2/0 a 4/0 circulares, róbalo y jurel 4/0 a 6/0.',
        ),
        L(
          'A circle hook has its point curved back toward the shank. It causes less injury to the fish than a J hook, which matters for any fish you may release.{fwcsnook}',
          'El anzuelo circular tiene la punta curvada hacia el vástago. Lastima menos al pez que un anzuelo en J, lo que importa con cualquier pez que quizá suelte.{fwcsnook}',
        ),
      ],
      tones: ['info', 'go'],
    },

    { k: 'h', t: L('Running-sinker bottom rig', 'Aparejo de fondo con plomo corredizo') },
    {
      k: 'fig',
      fig: 'rgrun',
      label: L('Running-sinker bottom rig: main line, sliding sinker, bead, swivel, leader and hook near the bottom', 'Aparejo de fondo con plomo corredizo: línea principal, plomo corredizo, cuenta, destorcedor, líder y anzuelo cerca del fondo'),
      marks: [
        L('Slide a sinker of 14 to 60 g (1/2 to 2 oz) onto the main line. Use the lightest one that keeps the bait near the bottom in the current.', 'Pase por la línea principal un plomo de 14 a 60 g (1/2 a 2 oz). Use el más liviano que mantenga la carnada cerca del fondo con la corriente.'),
        L('Tie a small bead or a swivel below it, so the sinker cannot slide down onto the knot.', 'Amarre abajo una cuenta pequeña o un destorcedor, para que el plomo no baje hasta el nudo.'),
        L('Tie 50 to 80 cm of leader to the swivel and a hook to the other end.', 'Amarre al destorcedor 50 a 80 cm de líder y un anzuelo en el otro extremo.'),
        L(
          'Bait it, lower it to the bottom, then lift the sinker a hand span off the bottom and wait with the line slightly tight. When a fish picks up the bait the line slides through the sinker, so the fish feels no weight.',
          'Ponga la carnada, bájela al fondo, levante el plomo un palmo del fondo y espere con la línea un poco tensa. Cuando el pez toma la carnada, la línea corre por el plomo y el pez no siente peso.',
        ),
      ],
      alt: L('For snapper and grouper near rocks, pier pilings and river mouths.', 'Para pargo y mero cerca de rocas, pilotes de muelle y desembocaduras.'),
    },
    { k: 'h', t: L('Free-line live bait rig', 'Aparejo de carnada viva a flote') },
    {
      k: 'fig',
      fig: 'rgfree',
      label: L('Free-line live bait rig: loose main line, knot, leader and a live sardine by a pier piling', 'Aparejo de carnada viva a flote: línea floja, nudo, líder y una sardina viva junto a un pilote'),
      marks: [
        L('Tie 60 to 100 cm of leader straight to the main line with a Palomar or improved clinch knot. No sinker and no float.', 'Amarre 60 a 100 cm de líder directo a la línea principal con un nudo Palomar o clinch mejorado. Sin plomo ni flotador.'),
        L('Hook a live sardine or small mullet just in front of the dorsal fin or through the lips, so it can still swim freely.', 'Enganche una sardina o una lisa pequeña viva justo delante de la aleta dorsal o por los labios, para que siga nadando libre.'),
        L(
          'Lob it gently beside the current edge, a mangrove root or a pier piling. Keep the line loose so the bait swims naturally. A bait that panics and swims hard is a good sign.',
          'Láncela con suavidad junto al borde de la corriente, una raíz de manglar o un pilote. Mantenga la línea floja para que la carnada nade natural. Una carnada que se asusta y nada fuerte es buena señal.',
        ),
        L(
          'When the line moves off fast, close the reel and lean into the fish right away. A fish that is allowed to run and swallow live bait is hooked deep and is hard to release.{fwcsnook}',
          'Cuando la línea se va rápido, cierre el carrete e incline la caña hacia el pez de inmediato. Un pez al que se deja correr y tragar la carnada viva queda anzuelado en lo profundo y es difícil de soltar.{fwcsnook}',
        ),
      ],
      alt: L('For snook, jack and mackerel feeding near the surface, at river mouths and under pier lights.', 'Para róbalo, jurel y macarela que comen cerca de la superficie, en desembocaduras y bajo las luces de muelle.'),
    },
    { k: 'h', t: L('Two-hook paternoster', 'Paternoster de dos anzuelos') },
    {
      k: 'fig',
      fig: 'rgpat',
      label: L('Two-hook paternoster: two dropper loops with hook arms above a swivel and sinker', 'Paternoster de dos anzuelos: dos lazos con brazos y anzuelos sobre un destorcedor y un plomo'),
      marks: [
        L('Tie a swivel to the end of the main line, and a sinker of 30 to 90 g (1 to 3 oz) below it on 10 cm of line.', 'Amarre un destorcedor al final de la línea principal y, abajo, un plomo de 30 a 90 g (1 a 3 oz) con 10 cm de línea.'),
        L('Tie a dropper loop into the main line 30 cm above the swivel, and another 60 cm above that one. These loops hold the hook arms.{fwcknots}', 'Haga un lazo de bajada en la línea principal a 30 cm sobre el destorcedor y otro a 60 cm sobre ese. Esos lazos sostienen los brazos de los anzuelos.{fwcknots}'),
        L('Loop a 20 to 30 cm leader with a 1/0 to 2/0 hook onto each loop. Short arms keep the hooks from tangling.', 'Pase por cada lazo un líder de 20 a 30 cm con un anzuelo 1/0 a 2/0. Los brazos cortos evitan que los anzuelos se enreden.'),
        L('Drop it to the bottom, lift the sinker a hand span and feel for bites. If two fish take the hooks at once, reel them in steadily.', 'Bájelo al fondo, levante el plomo un palmo y sienta las mordidas. Si dos peces toman los anzuelos a la vez, recoja con ritmo parejo.'),
      ],
      alt: L('For several small snapper and grouper over a reef edge or rocky bottom.', 'Para varios pargos y meros pequeños sobre un borde de arrecife o fondo rocoso.'),
    },

    {
      k: 'tiles',
      h: L('Four knots: for every one', 'Cuatro nudos: para todos'),
      items: [
        { ico: 'rgdrop', h: L('Wet it', 'Mójelo'), t: L('With spit or water, before you pull it fully tight.{fwcknots}', 'Con saliva o agua, antes de apretarlo del todo.{fwcknots}') },
        { ico: 'rgscissors', h: L('Trim to 3 mm', 'Recorte a 3 mm'), t: L('Cut the short end to about 3 mm (1/8 in).{fwcknots}', 'Corte el extremo sobrante a unos 3 mm (1/8 de pulgada).{fwcknots}') },
        { ico: 'rgpull', h: L('Test it', 'Pruébelo'), t: L('Give it a firm pull before you fish.{fwcknots}', 'Dele un jalón firme antes de pescar.{fwcknots}') },
      ],
    },
    { k: 'h', t: L('Palomar knot', 'Nudo Palomar') },
    {
      k: 'fig',
      fig: 'rgpalomar',
      label: L('Tying a Palomar knot in four steps', 'Cómo hacer el nudo Palomar en cuatro pasos'),
      marks: [
        L('Double about 25 cm of line into a loop and pass the loop through the eye of the hook.{fwcknots}', 'Doble unos 25 cm de línea en un lazo y pase el lazo por el ojo del anzuelo.{fwcknots}'),
        L('Tie a loose overhand knot (a simple knot, like the first step of tying a shoe) with the doubled line. Do not twist the two strands.{fwcknots}', 'Haga un nudo simple flojo (como el primer paso de amarrarse un zapato) con la línea doble. No tuerza las dos hebras.{fwcknots}'),
        L('Pass the loop at the end right over the hook.{fwcknots}', 'Pase por completo el lazo del final por encima del anzuelo.{fwcknots}'),
        L('Slide the loop up above the eye, wet it, pull the short end and the main line together, then trim the short end.{fwcknots}', 'Suba el lazo sobre el ojo, mójelo, jale juntos el extremo corto y la línea principal, y recorte el extremo corto.{fwcknots}'),
      ],
      alt: L('For hooks and swivels. One of the strongest knots to tie in braided line.{fwcknots}', 'Para anzuelos y destorcedores. Uno de los nudos más fuertes para línea trenzada.{fwcknots}'),
    },
    { k: 'h', t: L('Improved clinch knot', 'Nudo clinch mejorado') },
    {
      k: 'fig',
      fig: 'rgclinch',
      label: L('Tying an improved clinch knot in four steps', 'Cómo hacer el nudo clinch mejorado en cuatro pasos'),
      marks: [
        L('Pass the line through the eye and double it back along itself.{fwcknots}', 'Pase la línea por el ojo y dóblela hacia atrás a lo largo de sí misma.{fwcknots}'),
        L('Wrap the short end around the main line five or more times.{fwcknots}', 'Dé cinco o más vueltas con el extremo corto alrededor de la línea principal.{fwcknots}'),
        L('Pass the short end back through the small loop next to the eye, then (arrow) through the big loop that formed.{fwcknots}', 'Pase el extremo corto de vuelta por el lazo pequeño junto al ojo y luego (flecha) por el lazo grande que se formó.{fwcknots}'),
        L('Wet it, pull it tight against the hook eye and trim the short end.{fwcknots}', 'Mójelo, apriételo contra el ojo del anzuelo y recorte el extremo corto.{fwcknots}'),
      ],
      alt: L('Easy on a beach or a boat, for tying line to a hook, swivel or lure.', 'Fácil en la playa o en una lancha, para amarrar la línea a un anzuelo, destorcedor o señuelo.'),
    },
    { k: 'h', t: L('Dropper loop', 'Lazo de bajada (dropper loop)') },
    {
      k: 'fig',
      fig: 'rgdropper',
      label: L('Tying a dropper loop in four steps', 'Cómo hacer el lazo de bajada en cuatro pasos'),
      marks: [
        L('Form a loop in the line at the spot where you want the arm.{fwcknots}', 'Haga un lazo en la línea en el lugar donde quiere el brazo.{fwcknots}'),
        L('Hold one side of the loop and make six or more turns of it around the line itself, keeping the opening between the turns open.{fwcknots}', 'Sostenga un lado del lazo y dé seis o más vueltas con él alrededor de la propia línea, sin cerrar la abertura entre las vueltas.{fwcknots}'),
        L('Pull the other side of the loop through the opening in the middle of the turns, and hold it so it does not slip back.{fwcknots}', 'Pase el otro lado del lazo por la abertura del centro de las vueltas y sosténgalo para que no se devuelva.{fwcknots}'),
        L('Wet it, pull gently on both ends so the turns pack down on each side, then pull tight so the loop stands out at a right angle.{fwcknots}', 'Mójelo, jale con suavidad los dos extremos para que las vueltas se junten a cada lado, y apriete para que el lazo quede a un ángulo recto.{fwcknots}'),
      ],
      alt: L('A fixed loop that stands out from the line: the arms of the paternoster.', 'Un lazo fijo que sale de lado de la línea: los brazos del paternoster.'),
    },
    { k: 'h', t: L('Surgeon’s knot', 'Nudo de cirujano') },
    {
      k: 'fig',
      fig: 'rgsurgeon',
      label: L('Tying a surgeon’s knot in four steps; the leader is the green line', 'Cómo hacer el nudo de cirujano en cuatro pasos; el líder es la línea verde'),
      marks: [
        L('Lay the two lines side by side, overlapping about 20 to 25 cm.{fwcknots}', 'Ponga las dos líneas lado a lado, traslapadas unos 20 a 25 cm.{fwcknots}'),
        L('Tie an overhand knot with both lines held together as one, passing one line all the way through the loop.{fwcknots}', 'Haga un nudo simple con las dos líneas juntas como si fueran una, pasando una línea completa por el lazo.{fwcknots}'),
        L('Pass the leader through the loop one more time, then pass the other end through it as well.{fwcknots}', 'Pase el líder otra vez por el lazo y luego pase también por él el otro extremo.{fwcknots}'),
        L('Wet it, pull all four ends slowly so the knot sets, then trim the short ends.{fwcknots}', 'Mójelo, jale los cuatro extremos despacio para que el nudo se asiente y recorte los extremos sobrantes.{fwcknots}'),
      ],
      alt: L('Joins two lines of different thickness, for example a leader to the main line.', 'Une dos líneas de distinto grosor, por ejemplo el líder con la línea principal.'),
    },

    {
      k: 'tiles',
      h: L('Bait: where to get it, how to keep it', 'Carnada: dónde conseguirla y cómo mantenerla'),
      items: [
        {
          ico: 'rgshrimp',
          h: L('Live shrimp', 'Camarón vivo'),
          t: L(
            'Buy from a local fisher, or cast-net them in river mouths and brackish creeks at night. Keep them in seawater with an aerator, in shade, and change a third of the water every hour.',
            'Cómprelo a un pescador local o atrápelo con atarraya en desembocaduras y caños salobres de noche. Manténgalo en agua de mar con aireador, a la sombra, y cambie un tercio del agua cada hora.',
          ),
        },
        {
          ico: 'rgsardine',
          h: L('Sardines, mojarra', 'Sardinas, mojarra'),
          t: L(
            'Small silver fish. Cast-net the schools at the surface near piers and river mouths, early morning. A round bucket with a lid, in shade, with cool seawater changed often, keeps them alive a few hours.',
            'Pececitos plateados. Lance la atarraya sobre los cardúmenes cerca de muelles y desembocaduras, temprano. Un balde redondo con tapa, a la sombra, con agua de mar fresca cambiada seguido, los mantiene vivos unas horas.',
          ),
        },
        {
          ico: 'rgcut',
          h: L('Cut bait', 'Carnada cortada'),
          t: L('Fresh sardine, mullet or squid cut into strips 2 cm wide and 8 cm long. Keep it on ice: old, soft bait does not catch fish.', 'Sardina, lisa o calamar fresco cortado en tiras de 2 cm de ancho y 8 cm de largo. Guárdela en hielo: la carnada vieja y blanda no pesca.'),
        },
        {
          ico: 'rgcrab',
          h: L('Crab', 'Cangrejo'),
          t: L(
            'Small crabs (jaiba or cangrejo) from mangrove roots and rocks at low tide. Break off the claws, then hook one through the back corner of the shell for snapper and grouper near rocks.',
            'Cangrejos pequeños (jaiba) de las raíces de manglar y las rocas con marea baja. Quítele las pinzas y enganche uno por la esquina trasera del caparazón para pargo y mero cerca de rocas.',
          ),
        },
      ],
    },
    { k: 'h', t: L('Throwing a cast net (atarraya)', 'Cómo lanzar la atarraya') },
    {
      k: 'fig',
      fig: 'rgnet',
      label: L('Throwing a cast net: holding it, the net opening in the air, sinking and closing', 'Lanzar la atarraya: cómo sostenerla, la red abierta en el aire, hundiéndose y cerrándose'),
      marks: [
        L('Hold the lead line (the rim with the weights) in one hand and a third of the net in the other, with the rest looped over your arm.', 'Sostenga con una mano la línea de plomos del borde y con la otra un tercio de la red, con el resto doblado sobre el brazo.'),
        L('Spin your body and throw so the net opens into a circle and lands flat.', 'Gire el cuerpo y lance para que la red se abra en círculo y caiga plana.'),
        L('Wait for it to sink.', 'Espere a que se hunda.'),
        L('Pull the hand line slowly to close it.', 'Jale la cuerda despacio para cerrarla.'),
      ],
      alt: L('Practise on land first. Check local rules for nets in protected areas.', 'Practique primero en tierra. Revise las reglas locales sobre redes en áreas protegidas.'),
    },

    { k: 'h', t: L('Each fish: bait, hook and rig', 'Cada pez: carnada, anzuelo y aparejo') },
    {
      k: 'fig',
      fig: 'rgbait',
      label: L('Which bait each fish takes, and its hook size', 'Qué carnada toma cada pez, y su tamaño de anzuelo'),
      marks: [
        L('Snapper (pargo): live shrimp, small fish, cut bait or crab. Running-sinker or free-line rig.', 'Pargo: camarón vivo, pececito, carnada cortada o cangrejo. Plomo corredizo o a flote.'),
        L('Jack (jurel): live sardine, mullet or cut fish. Free-line with a strong leader.', 'Jurel: sardina viva, lisa o pescado cortado. A flote con líder fuerte.'),
        L('Snook (róbalo): live mullet, sardine, mojarra or shrimp. Free-line with a 40 to 60 lb leader.', 'Róbalo: lisa viva, sardina, mojarra o camarón. A flote con líder de 40 a 60 lb.'),
        L('Spanish mackerel (macarela): live or dead sardine, or fish strips. Free-line with a short wire leader.', 'Macarela: sardina viva o muerta, o tiras de pescado. A flote con líder corto de cable.'),
        L('Small grouper (mero): cut sardine, squid, crab or a small live fish. Paternoster or bottom rig, with a circle hook.', 'Mero pequeño: sardina cortada, calamar, cangrejo o pececito vivo. Paternoster o fondo, con anzuelo circular.'),
      ],
    },
    {
      k: 'heat',
      h: L('Best time for each fish', 'Mejor hora para cada pez'),
      cols: [L('Dawn', 'Alba'), L('AM', 'AM'), L('PM', 'PM'), L('Dusk', 'Ocaso'), L('Night', 'Noche')],
      rows: [
        { h: L('Snapper', 'Pargo'), v: [3, 0, 0, 3, 3] },
        { h: L('Jack', 'Jurel'), v: [3, 0, 0, 3, 0] },
        { h: L('Snook', 'Róbalo'), v: [3, 0, 0, 3, 3] },
        { h: L('Mackerel', 'Macarela'), v: [0, 3, 3, 0, 0] },
        { h: L('Small grouper', 'Mero pequeño'), v: [3, 0, 0, 3, 0] },
      ],
      key: [{ v: 3, t: L('Best time', 'Mejor hora') }],
      note: L(
        'Mackerel: early morning and late afternoon. Snapper and grouper also want a moving tide, snook a falling tide at river mouths. For jack, watch for birds diving on bait.',
        'Macarela: temprano en la mañana y al final de la tarde. El pargo y el mero también quieren marea en movimiento, el róbalo marea bajando en desembocaduras. Para el jurel, busque aves lanzándose sobre carnada.',
      ),
    },

    {
      k: 'tiles',
      h: L('What the app’s BITE score looks at', 'Lo que mira el puntaje BITE de la app'),
      items: [
        { ico: 'current', tone: 'go', h: L('Moving water', 'Agua en movimiento'), t: L('Fish feed when the tide runs. Small tides move less water.', 'Los peces comen cuando corre la marea. Las mareas pequeñas mueven menos agua.') },
        { ico: 'rgdawn', tone: 'go', h: L('Dawn and dusk', 'Amanecer y atardecer'), t: L('Score highest, then night. Midday scores lowest.', 'Puntúan más alto, luego la noche. El mediodía puntúa más bajo.') },
        { ico: 'rgwind', tone: 'warn', h: L('Wind, waves, rain', 'Viento, olas, lluvia'), t: L('Wind above 5 m/s, waves above 1 m and heavy rain pull the score down.', 'Viento de más de 5 m/s, olas de más de 1 m y lluvia fuerte bajan el puntaje.') },
        { ico: 'rgsquall', tone: 'stop', h: L('Squall warning', 'Alerta de aguacero'), t: L('Makes the score much lower.', 'Baja mucho el puntaje.') },
        { ico: 'rgmud', h: L('Muddy river water', 'Agua turbia del río'), t: L('After rain it suits snook and jack at river mouths.', 'Tras la lluvia favorece al róbalo y al jurel en las desembocaduras.') },
        { ico: 'rgclear', h: L('Clear water', 'Agua clara'), t: L('Snapper, mackerel and grouper want it.', 'El pargo, la macarela y el mero la quieren.') },
        { ico: 'clock', h: L('BEST TIMES', 'MEJORES HORAS'), t: L('Open the list for the day before you go.', 'Abra la lista del día antes de salir.') },
      ],
    },

    { k: 'h', t: L('Lionfish, lobster, octopus and crab', 'Pez león, langosta, pulpo y jaiba') },
    {
      k: 'fig',
      fig: 'rglion',
      label: L('A lionfish with its venomous spines marked', 'Un pez león con sus espinas venenosas marcadas'),
      tones: ['stop', 'stop', 'stop'],
      marks: [
        L('Dorsal fin spines, along the back: venomous.{lionfish}', 'Espinas de la aleta dorsal, en el lomo: venenosas.{lionfish}'),
        L('Pelvic fin spines, under the belly: venomous.{lionfish}', 'Espinas de las aletas pélvicas, bajo el vientre: venenosas.{lionfish}'),
        L('Anal fin spines, underneath near the tail: venomous. Keep your fingers away from all of them.{lionfish}', 'Espinas de la aleta anal, abajo cerca de la cola: venenosas. Mantenga los dedos lejos de todas.{lionfish}'),
      ],
      alt: L(
        'Lionfish (pez león) is taken by spear, not line. Use a pole spear with a small tip, and carry the fish in a container the spines cannot pierce.{lionfish}',
        'El pez león se captura con arpón, no con línea. Use un arpón de mano con punta pequeña y lleve el pez en un recipiente que las espinas no puedan perforar.{lionfish}',
      ),
    },
    {
      k: 'tiles',
      h: L('Spearfishing rules', 'Reglas de la pesca con arpón'),
      items: [
        { ico: 'card', tone: 'warn', h: L('Permit and card', 'Permiso y carné'), t: L('Spearfishing needs an INCOPESCA permit and card.', 'El arpón requiere permiso y carné de INCOPESCA.') },
        { ico: 'rgnotank', tone: 'stop', h: L('Breath-hold only', 'Solo a pulmón'), t: L('No tanks.', 'Sin tanques.') },
        { ico: 'rgnospear', tone: 'stop', h: L('Not in national parks', 'No en parques nacionales'), t: L('Spearfishing is banned there.', 'Ahí el arpón está prohibido.') },
      ],
    },
    {
      k: 'heat',
      h: L('Lobster (langosta): closed season', 'Langosta: veda'),
      cols: MONTHS,
      rows: [{ h: L('Lobster', 'Langosta'), v: [0, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0], hue: 'closed' }],
      key: [{ v: 3, hue: 'closed', t: L('Closed 1 March to 30 June: never take one in that period.', 'Veda del 1 de marzo al 30 de junio: no tome ninguna en ese período.') }],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'rgoctopus', h: L('Lobster and octopus', 'Langosta y pulpo'), t: L('Take them only where it is legal. Check current INCOPESCA and SINAC rules first.', 'Tómelos solo donde sea legal. Confirme antes las reglas vigentes de INCOPESCA y SINAC.') },
        { ico: 'rgcrab', h: L('Crab (jaiba)', 'Jaiba'), t: L('Use a baited trap, or a hand line with a piece of fish and a net to lift it. Check that the species is allowed where you are.', 'Use una trampa con carnada o una línea con un trozo de pescado y una red de mano para sacarla. Verifique que la especie esté permitida donde usted está.') },
      ],
    },

    { k: 'h', t: L('Ciguatera-risk fish', 'Peces con riesgo de ciguatera') },
    {
      k: 'stats',
      items: [
        {
          n: L('2.3 kg · 5 lb', '2,3 kg · 5 lb'),
          t: L(
            'Large reef fish such as grouper, amberjack and snapper can carry ciguatera, a toxin. Avoid reef fish, particularly those over 2.3 kg (5 lb).{cdc}',
            'Los peces grandes de arrecife como el mero, la medregal y el pargo pueden tener ciguatera, una toxina. Evite los peces de arrecife, sobre todo los de más de 2,3 kg (5 lb).{cdc}',
          ),
        },
      ],
    },
    {
      k: 'dodont',
      do: [L('Read the Ciguatera page before you keep a fish.', 'Lea la página de Ciguatera antes de quedarse con un pez.')],
      dont: [
        L('Do not eat the head, liver, guts or roe.{cdc}', 'No coma la cabeza, el hígado, las vísceras ni las huevas.{cdc}'),
        L('Do not count on cooking or freezing: neither removes the toxin.{cdc}', 'No confíe en cocinar ni congelar: ninguno elimina la toxina.{cdc}'),
        L('Do not trust a fish because it looks healthy or smells fresh. The toxin does not change taste, texture or smell.{cdc}', 'No confíe en un pez porque se ve sano o huele fresco. La toxina no cambia el sabor, la textura ni el olor.{cdc}'),
      ],
    },
  ],
  sources: {
    fwcknots: {
      t: 'Florida Fish and Wildlife Conservation Commission, Fishing Basics: knots',
      u: 'https://myfwc.com/fishing/basics/',
      p: 'P',
      what: L('Knot steps (Palomar, improved clinch, dropper loop, surgeon\'s knot), wetting the knot and trimming the tag to 1/8 in, and the Palomar as one of the strongest knots for braid.', 'Pasos de los nudos (Palomar, clinch mejorado, lazo de bajada, nudo de cirujano), mojar el nudo y recortar el extremo a 1/8 de pulgada, y el Palomar como uno de los más fuertes para trenzado.'),
    },
    fwcsnook: {
      t: 'Florida Fish and Wildlife Conservation Commission, Reduce catch-and-release mortality (snook)',
      u: 'https://myfwc.com/research/saltwater/fish/snook/reduce-catch-release-mortality/',
      p: 'P',
      what: L('Circle hooks cause less injury, live bait raises the chance of gut hooking, and setting the hook at once lowers it.', 'Los anzuelos circulares lastiman menos, la carnada viva aumenta el riesgo de anzuelar en el estómago y clavar de inmediato lo reduce.'),
    },
    lionfish: {
      t: 'Florida Fish and Wildlife Conservation Commission, Lionfish brochure',
      u: 'https://archive.myfwc.com/archive/Saltwater%20Fishing/Lionfish/lionfish-brochure.pdf',
      p: 'S',
      what: L('Lionfish have 18 venomous spines on the dorsal, pelvic and anal fins (text of the PDF read only in part).', 'El pez león tiene 18 espinas venenosas en las aletas dorsal, pélvicas y anal (el texto del PDF se leyó solo en parte).'),
    },
    cdc: {
      t: 'CDC Yellow Book, Food Poisoning from Marine Toxins',
      u: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/food-poisoning-from-marine-toxins.html',
      p: 'P',
      what: L('Ciguatoxin survives cooking and freezing, is concentrated in head, liver, intestines and roe, does not change taste or smell, and reef fish over 5 lb are the ones to avoid.', 'La ciguatoxina resiste la cocción y la congelación, se concentra en cabeza, hígado, intestinos y huevas, no cambia el sabor ni el olor, y los peces de arrecife de más de 5 lb son los que hay que evitar.'),
    },
  },
};
