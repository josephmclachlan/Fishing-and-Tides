import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Bait, knots and rigs for local edible fish. Tackle sizes follow the guide's per-species tackle lines. */
export const rigs: Section = {
  id: 'rigs',
  title: L('Rigs', 'Aparejos'),
  lede: L('Bait, knots and rigs for the fish people here eat: snapper, jack, snook, mackerel and small grouper.', 'Carnada, nudos y aparejos para los peces que aquí se comen: pargo, jurel, róbalo, macarela y mero pequeño.'),
  blocks: [
    { k: 'h', t: L('1. The two outfits', '1. Los dos equipos') },
    {
      k: 'ul',
      items: [
        L(
          'Hand line (cordel): a plastic spool or frame wound with 30 to 50 m of nylon line rated 20 to 40 lb (9 to 18 kg). Tie on a leader, a hook and, if needed, a sinker, and let the line out by hand. It costs little, it works from a pier, a rock or a small boat, and you feel every nibble in your fingers.',
          'Cordel (hand line): un carrete o armazón de plástico con 30 a 50 m de nylon de 20 a 40 lb (9 a 18 kg). Se amarra un líder, un anzuelo y, si hace falta, un plomo, y se suelta la línea con la mano. Cuesta poco, sirve desde un muelle, una roca o una lancha pequeña, y se siente cada mordida en los dedos.',
        ),
        L(
          'Basic spinning outfit: a rod 2 to 2.4 m (7 to 8 ft) long with a spinning reel (the kind where the line comes off a fixed spool). Load it with 10 to 20 lb (4.5 to 9 kg) line for snapper and small grouper, 20 to 30 lb (9 to 14 kg) for snook and mackerel, and 30 to 50 lb (14 to 23 kg) braid for jack, which fights hard.',
          'Equipo básico de spinning: una caña de 2 a 2,4 m (7 a 8 pies) con un carrete de spinning (el de carrete fijo del que sale la línea). Cárguelo con línea de 10 a 20 lb (4,5 a 9 kg) para pargo y mero pequeño, de 20 a 30 lb (9 a 14 kg) para róbalo y macarela, y de 30 a 50 lb (14 a 23 kg) en trenzado para jurel, que pelea fuerte.',
        ),
        L(
          'Leader (líder): the last 0.5 to 1 m of line before the hook, a thicker or tougher line that fish teeth, gill covers and rocks cannot cut easily. Use thin fluorocarbon 20 to 30 lb for shy snapper, 40 to 60 lb (18 to 27 kg) for snook, and a short piece of light wire or heavy fluorocarbon for mackerel, which has sharp teeth.',
          'Líder: los últimos 0,5 a 1 m de línea antes del anzuelo, más grueso o más fuerte para que los dientes, las agallas y las rocas no lo corten fácil. Use fluorocarbono delgado de 20 a 30 lb para el pargo desconfiado, de 40 a 60 lb (18 a 27 kg) para el róbalo, y un tramo corto de cable fino o fluorocarbono grueso para la macarela, que tiene dientes filosos.',
        ),
        L(
          'Hooks: size 1/0 to 2/0 for snapper and mackerel, 2/0 to 4/0 circle hooks for grouper, 4/0 to 6/0 for snook and jack. A bigger number before the slash means a bigger hook. A circle hook (curved back toward the shank) causes less injury to the fish than a J hook, which matters for any fish you may release.{fwcsnook}',
          'Anzuelos: tamaño 1/0 a 2/0 para pargo y macarela, circulares 2/0 a 4/0 para mero, 4/0 a 6/0 para róbalo y jurel. Un número mayor antes de la barra es un anzuelo más grande. El anzuelo circular (curvado hacia el vástago) lastima menos al pez que un anzuelo en J, lo que importa con cualquier pez que quizá suelte.{fwcsnook}',
        ),
      ],
    },
    { k: 'h', t: L('2. Three rigs, step by step', '2. Tres aparejos, paso a paso') },
    { k: 'p', t: L('Running-sinker bottom rig (for snapper and grouper near rocks, pier pilings and river mouths):', 'Aparejo de fondo con plomo corredizo (para pargo y mero cerca de rocas, pilotes de muelle y desembocaduras):') },
    {
      k: 'ul',
      items: [
        L('1. Slide a sinker of 14 to 60 g (1/2 to 2 oz) onto the main line. Use the lightest one that keeps the bait near the bottom in the current.', '1. Pase por la línea principal un plomo de 14 a 60 g (1/2 a 2 oz). Use el más liviano que mantenga la carnada cerca del fondo con la corriente.'),
        L('2. Tie a small bead or a swivel below the sinker so it cannot slide down onto the knot.', '2. Amarre abajo del plomo una cuenta pequeña o un destorcedor para que no baje hasta el nudo.'),
        L('3. Tie 50 to 80 cm of leader to the swivel and a hook to the other end of the leader.', '3. Amarre al destorcedor 50 a 80 cm de líder y un anzuelo en el otro extremo.'),
        L('4. Bait the hook, lower it to the bottom, then lift the sinker off the bottom a hand span and wait with the line slightly tight. When a fish picks up the bait the line slides through the sinker, so it feels no weight.', '4. Ponga la carnada, bájela al fondo y luego levante el plomo un palmo y espere con la línea un poco tensa. Cuando el pez toma la carnada, la línea corre por el plomo y no siente peso.'),
      ],
    },
    { k: 'p', t: L('Free-line live bait rig (for snook, jack and mackerel feeding near the surface, river mouths and pier lights):', 'Aparejo de carnada viva a flote (para róbalo, jurel y macarela que comen cerca de la superficie, desembocaduras y luces de muelle):') },
    {
      k: 'ul',
      items: [
        L('1. Tie 60 to 100 cm of leader straight to the main line with a Palomar or improved clinch knot, with no sinker and no float.', '1. Amarre 60 a 100 cm de líder directo a la línea principal con un nudo Palomar o clinch mejorado, sin plomo ni flotador.'),
        L('2. Hook a live sardine or small mullet just in front of the dorsal fin or through the lips, so it can still swim freely.', '2. Enganche una sardina o una lisa pequeña viva justo delante de la aleta dorsal o por los labios, para que siga nadando libre.'),
        L('3. Lob it gently beside the current edge, a mangrove root or a pier piling. Keep the line loose so the bait swims naturally. A bait that panics and swims hard is a good sign.', '3. Láncela con suavidad junto al borde de la corriente, una raíz de manglar o un pilote. Mantenga la línea floja para que la carnada nade natural. Una carnada que se asusta y nada fuerte es buena señal.'),
        L('4. When the line moves off fast, close the reel and lean into the fish right away. A fish that is allowed to run and swallow live bait is hooked deep and is hard to release.{fwcsnook}', '4. Cuando la línea se va rápido, cierre el carrete e incline la caña hacia el pez de inmediato. Un pez al que se deja correr y tragar la carnada viva queda anzuelado en lo profundo y es difícil de soltar.{fwcsnook}'),
      ],
    },
    { k: 'p', t: L('Two-hook paternoster (for several small snapper and grouper over a reef edge or rocky bottom):', 'Paternoster de dos anzuelos (para varios pargos y meros pequeños sobre un borde de arrecife o fondo rocoso):') },
    {
      k: 'ul',
      items: [
        L('1. Tie a swivel at the end of the main line and a sinker of 30 to 90 g (1 to 3 oz) to the bottom of it, on a short 10 cm piece of line.', '1. Amarre un destorcedor al final de la línea principal y un plomo de 30 a 90 g (1 a 3 oz) en su parte baja, con 10 cm de línea.'),
        L('2. Tie a dropper loop into the main line 30 cm above the swivel and another 60 cm above it. These loops are the hook arms.{fwcknots}', '2. Haga un nudo de lazo de bajada (dropper loop) en la línea principal a 30 cm sobre el destorcedor y otro a 60 cm sobre ese. Esos lazos son los brazos de los anzuelos.{fwcknots}'),
        L('3. Loop a 20 to 30 cm leader with a hook (size 1/0 to 2/0) onto each loop. Short arms keep the hooks from tangling.', '3. Pase por cada lazo un líder de 20 a 30 cm con un anzuelo (1/0 a 2/0). Los brazos cortos evitan que los anzuelos se enreden.'),
        L('4. Drop it to the bottom, lift the sinker a hand span and feel for bites. If two fish take the hooks at once, reel them in steadily.', '4. Bájelo al fondo, levante el plomo un palmo y sienta las mordidas. Si dos peces toman los anzuelos a la vez, recoja con ritmo parejo.'),
      ],
    },
    { k: 'h', t: L('3. Four knots to learn', '3. Cuatro nudos para aprender') },
    { k: 'p', t: L('Wet every knot with spit or water before you pull it fully tight, and trim the tag end to about 3 mm (1/8 in) afterwards. Test each one with a firm pull before you fish.{fwcknots}', 'Moje todo nudo con saliva o agua antes de apretarlo del todo y recorte el extremo sobrante a unos 3 mm (1/8 de pulgada) después. Pruebe cada uno con un jalón firme antes de pescar.{fwcknots}') },
    { k: 'p', t: L('Palomar knot (a simple knot for hooks and swivels, and one of the strongest to tie in braided line):{fwcknots}', 'Nudo Palomar (un nudo simple para anzuelos y destorcedores, y uno de los más fuertes para línea trenzada):{fwcknots}') },
    {
      k: 'ul',
      items: [
        L('1. Double about 25 cm of line into a loop and pass the loop through the eye of the hook.{fwcknots}', '1. Doble unos 25 cm de línea en un lazo y pase el lazo por el ojo del anzuelo.{fwcknots}'),
        L('2. Tie a loose overhand knot (a simple knot, like the first step of tying a shoe) with the doubled line, without twisting the two strands.{fwcknots}', '2. Haga un nudo simple flojo (como el primer paso de amarrarse un zapato) con la línea doble, sin torcer las dos hebras.{fwcknots}'),
        L('3. Pass the loop that is left at the end completely over the hook.{fwcknots}', '3. Pase por encima del anzuelo, por completo, el lazo que queda al final.{fwcknots}'),
        L('4. Slide the loop up above the eye, wet it, and pull the tag end (the short end) and the main line together, then trim the tag.{fwcknots}', '4. Suba el lazo sobre el ojo, mójelo, jale juntos el extremo corto y la línea principal, y recorte el extremo.{fwcknots}'),
      ],
    },
    { k: 'p', t: L('Improved clinch knot (easy on a beach or a boat, for tying line to a hook, swivel or lure):{fwcknots}', 'Nudo clinch mejorado (fácil en la playa o en una lancha, para amarrar la línea a un anzuelo, destorcedor o señuelo):{fwcknots}') },
    {
      k: 'ul',
      items: [
        L('1. Pass the line through the eye and double it back along itself.', '1. Pase la línea por el ojo y dóblela hacia atrás a lo largo de sí misma.'),
        L('2. Wrap the short end around the main line five or more times.', '2. Dé cinco o más vueltas con el extremo corto alrededor de la línea principal.'),
        L('3. Pass the short end back through the small loop next to the eye, then through the big loop that formed.', '3. Pase el extremo corto de vuelta por el lazo pequeño junto al ojo y luego por el lazo grande que se formó.'),
        L('4. Wet it, pull it tight against the hook eye and trim the tag.', '4. Mójelo, apriételo contra el ojo del anzuelo y recorte el extremo.'),
      ],
    },
    { k: 'p', t: L('Dropper loop (a fixed loop that stands out from the line, used for the paternoster arms):{fwcknots}', 'Nudo de lazo de bajada o dropper loop (un lazo fijo que sale de lado de la línea, el que se usa en los brazos del paternoster):{fwcknots}') },
    {
      k: 'ul',
      items: [
        L('1. Form a loop in the line at the spot where you want the arm.{fwcknots}', '1. Haga un lazo en la línea en el lugar donde quiere el brazo.{fwcknots}'),
        L('2. Hold one side of the loop and make six or more turns of it around the line itself, keeping the opening between the turns open.{fwcknots}', '2. Sostenga un lado del lazo y dé seis o más vueltas con él alrededor de la propia línea, sin cerrar la abertura entre las vueltas.{fwcknots}'),
        L('3. Pull the other side of the loop through the opening in the middle of the turns, and hold it so it does not slip back.{fwcknots}', '3. Pase el otro lado del lazo por la abertura del centro de las vueltas y sosténgalo para que no se devuelva.{fwcknots}'),
        L('4. Wet it, pull gently on both ends of the line so the turns pack down on each side, then pull tight so the loop stands out at a right angle.{fwcknots}', '4. Mójelo, jale con suavidad los dos extremos de la línea para que las vueltas se junten a cada lado, y apriete para que el lazo quede a un ángulo recto.{fwcknots}'),
      ],
    },
    { k: 'p', t: L('Surgeon\'s knot (joins two lines of different thickness, for example a leader to the main line):{fwcknots}', 'Nudo de cirujano (une dos líneas de distinto grosor, por ejemplo el líder con la línea principal):{fwcknots}') },
    {
      k: 'ul',
      items: [
        L('1. Lay the two lines side by side, overlapping about 20 to 25 cm.{fwcknots}', '1. Ponga las dos líneas lado a lado, traslapadas unos 20 a 25 cm.{fwcknots}'),
        L('2. Tie an overhand knot with both lines held together as one, passing one line all the way through the loop.{fwcknots}', '2. Haga un nudo simple con las dos líneas juntas como si fueran una, pasando una línea completa por el lazo.{fwcknots}'),
        L('3. Pass the leader through the loop one more time, then pass the other end through it as well.{fwcknots}', '3. Pase el líder otra vez por el lazo y luego pase también por él el otro extremo.{fwcknots}'),
        L('4. Wet it, pull all four ends slowly so the knot sets, then trim the tags.{fwcknots}', '4. Mójelo, jale los cuatro extremos despacio para que el nudo se asiente y recorte los extremos sobrantes.{fwcknots}'),
      ],
    },
    { k: 'h', t: L('4. Bait: where to get it and how to keep it', '4. Carnada: dónde conseguirla y cómo mantenerla') },
    {
      k: 'ul',
      items: [
        L('Live shrimp (camarón): buy from a local fisher, or catch them with a small cast net in river mouths and brackish creeks at night. Keep them in a bucket of seawater with an aerator, in shade, and change a third of the water every hour.', 'Camarón vivo: cómprelo a un pescador local o atrápelo con una atarraya pequeña en desembocaduras y caños salobres de noche. Manténgalo en un balde con agua de mar y aireador, a la sombra, y cambie un tercio del agua cada hora.'),
        L('Sardines and mojarra (small silver fish): throw a cast net over the schools at the surface near piers and river mouths, early morning. A round bucket with a lid, in shade, with cool seawater changed often, keeps them alive for a few hours.', 'Sardinas y mojarra (pececitos plateados): lance la atarraya sobre los cardúmenes de la superficie cerca de muelles y desembocaduras, temprano en la mañana. Un balde redondo con tapa, a la sombra, con agua de mar fresca que se cambia seguido, los mantiene vivos unas horas.'),
        L('Cut bait: fillet or cut a fresh sardine, mullet or squid into strips 2 cm wide and 8 cm long. Keep it on ice. Old, soft bait does not catch fish.', 'Carnada cortada: filetee o corte una sardina, lisa o calamar fresco en tiras de 2 cm de ancho y 8 cm de largo. Guárdela en hielo. La carnada vieja y blanda no pesca.'),
        L('Crab (jaiba or cangrejo): small crabs from mangrove roots and rocks at low tide. Hook one through the back corner of the shell for snapper and grouper near rocks. Break off the claws first.', 'Cangrejo (jaiba): cangrejos pequeños de las raíces de manglar y las rocas con marea baja. Enganche uno por la esquina trasera del caparazón para pargo y mero cerca de rocas. Quítele primero las pinzas.'),
        L('Cast net (atarraya): hold the lead line (the line with weights on the rim) in one hand and a third of the net in the other, with the rest looped over your arm. Spin your body, throw so the net opens into a circle and lands flat, wait for it to sink, then pull the hand line slowly to close it. Practise on land first. Check local rules for nets in protected areas.', 'Atarraya: sostenga con una mano la línea de plomos del borde y con la otra un tercio de la red, con el resto doblado sobre el brazo. Gire el cuerpo, lance para que se abra en círculo y caiga plana, espere que se hunda y luego jale la cuerda despacio para cerrarla. Practique primero en tierra. Revise las reglas locales sobre redes en áreas protegidas.'),
      ],
    },
    { k: 'h', t: L('5. Tide and time pointers from the app', '5. Pistas de marea y hora que usa la app') },
    {
      k: 'p',
      t: L(
        'The app\'s BITE score treats moving water as the best time to fish, because fish feed when the tide runs and small tides move less water. Dawn and dusk score highest, then night, and midday scores lowest. Wind above 5 m/s, waves above 1 m and heavy rain pull the score down, and a squall warning makes it much lower. Muddy river water after rain suits snook and jack at river mouths, while snapper, mackerel and grouper want clear water. Open the BEST TIMES list for the day before you go.',
        'El puntaje BITE de la app considera que el agua en movimiento es lo mejor para pescar, porque los peces comen cuando corre la marea y las mareas pequeñas mueven menos agua. El amanecer y el atardecer puntúan más alto, luego la noche, y el mediodía puntúa más bajo. Viento de más de 5 m/s, olas de más de 1 m y lluvia fuerte bajan el puntaje, y una alerta de aguacero lo baja mucho. El agua turbia del río tras la lluvia favorece al róbalo y al jurel en las desembocaduras, mientras que el pargo, la macarela y el mero quieren agua clara. Abra la lista de MEJORES HORAS del día antes de salir.',
      ),
    },
    {
      k: 'table',
      head: [L('Fish', 'Pez'), L('Bait', 'Carnada'), L('Rig', 'Aparejo'), L('Best time', 'Mejor hora')],
      rows: [
        [L('Snapper (pargo)', 'Pargo'), L('Live shrimp, small fish, cut bait, crab', 'Camarón vivo, pececito, carnada cortada, cangrejo'), L('Running-sinker or free-line, 1/0 to 2/0 hook', 'Plomo corredizo o a flote, anzuelo 1/0 a 2/0'), L('Dusk, night, dawn, moving tide', 'Atardecer, noche, amanecer, marea en movimiento')],
        [L('Jack (jurel)', 'Jurel'), L('Live sardine, mullet, cut fish', 'Sardina viva, lisa, pescado cortado'), L('Free-line, strong leader, 4/0 to 6/0 hook', 'A flote, líder fuerte, anzuelo 4/0 a 6/0'), L('Dawn, dusk, birds diving on bait', 'Amanecer, atardecer, aves lanzándose sobre carnada')],
        [L('Snook (róbalo)', 'Róbalo'), L('Live mullet, sardine, mojarra, shrimp', 'Lisa viva, sardina, mojarra, camarón'), L('Free-line, 40 to 60 lb leader, 4/0 hook', 'A flote, líder de 40 a 60 lb, anzuelo 4/0'), L('Dawn, dusk, night; falling tide at river mouths', 'Amanecer, atardecer, noche; marea bajando en desembocaduras')],
        [L('Spanish mackerel (macarela)', 'Macarela'), L('Live or dead sardine, fish strips', 'Sardina viva o muerta, tiras de pescado'), L('Free-line with short wire leader', 'A flote con líder corto de cable'), L('Early morning, late afternoon', 'Temprano en la mañana, al final de la tarde')],
        [L('Small grouper (mero)', 'Mero pequeño'), L('Cut sardine, squid, crab, small live fish', 'Sardina cortada, calamar, cangrejo, pececito vivo'), L('Paternoster or bottom rig, 2/0 to 4/0 circle hook', 'Paternoster o fondo, anzuelo circular 2/0 a 4/0'), L('Dawn and dusk, moving tide', 'Amanecer y atardecer, marea en movimiento')],
      ],
    },
    { k: 'h', t: L('6. Lionfish, lobster, octopus and crab', '6. Pez león, langosta, pulpo y jaiba') },
    {
      k: 'ul',
      items: [
        L('Lionfish (pez león): taken by spear, not line. Spearfishing needs an INCOPESCA permit and card, is breath-hold only and is banned in national parks. Use a pole spear with a small tip, and keep fingers away from the venomous spines on the dorsal, pelvic and anal fins. Carry the fish in a puncture-proof container.{lionfish}', 'Pez león: se captura con arpón, no con línea. El arpón requiere permiso y carné de INCOPESCA, es solo a pulmón y está prohibido en parques nacionales. Use un arpón de mano con punta pequeña y mantenga los dedos lejos de las espinas venenosas de las aletas dorsal, pélvicas y anal. Lleve el pez en un recipiente que las espinas no puedan perforar.{lionfish}'),
        L('Lobster (langosta) and octopus (pulpo): take them only where it is legal. Lobster has a closed season from 1 March to 30 June, so never take one in that period. Check current INCOPESCA and SINAC rules first.', 'Langosta y pulpo: tómelos solo donde sea legal. La langosta tiene veda del 1 de marzo al 30 de junio, así que no tome ninguna en ese período. Confirme antes las reglas vigentes de INCOPESCA y SINAC.'),
        L('Crab (jaiba): use a baited trap or a hand line with a piece of fish and a net to lift it. Check that the species is allowed where you are.', 'Jaiba: use una trampa con carnada o una línea con un trozo de pescado y una red de mano para sacarla. Verifique que la especie esté permitida donde usted está.'),
      ],
    },
    {
      k: 'warn',
      h: L('Ciguatera-risk fish: what not to do', 'Peces con riesgo de ciguatera: qué no hacer'),
      t: L(
        'Large reef fish such as grouper, amberjack and snapper can carry ciguatera, a toxin that cooking and freezing do not remove. Avoid reef fish, particularly those over 2.3 kg (5 lb). Do not eat the head, liver, guts or roe. Do not trust a fish because it looks healthy or smells fresh, because the toxin does not change taste, texture or smell.{cdc} Read the Ciguatera page before you keep a fish.',
        'Los peces grandes de arrecife como el mero, la medregal y el pargo pueden tener ciguatera, una toxina que ni cocinar ni congelar eliminan. Evite los peces de arrecife, sobre todo los de más de 2,3 kg (5 lb). No coma la cabeza, el hígado, las vísceras ni las huevas. No confíe en un pez porque se ve sano o huele fresco, porque la toxina no cambia el sabor, la textura ni el olor.{cdc} Lea la página de Ciguatera antes de quedarse con un pez.',
      ),
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
