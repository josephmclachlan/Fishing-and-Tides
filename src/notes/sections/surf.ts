import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Surf: etiquette, a plain reading of wave size for each skill level, and the hazards listed for each break. */
export const surf: Section = {
  id: 'surf',
  title: L('Surf', 'Surf'),
  lede: L(
    'How to share a wave, which wave size suits which surfer, and what each break on this coast can do to you. Read the break you are going to before you paddle out.',
    'Cómo compartir una ola, qué tamaño de ola le sirve a cada surfista y lo que puede hacerle cada rompiente de esta costa. Lea sobre el lugar al que va antes de remar hacia afuera.',
  ),
  blocks: [
    {
      k: 'warn',
      h: L('Not confirmed', 'No confirmado'),
      t: L(
        'The hazards and skill levels below come from surf guides and from general surfing practice. Nobody who surfs these breaks has checked them for this app yet. Where a line says Not confirmed, treat it as a starting point and ask a local surfer or a surf school in Puerto Viejo before you go out.',
        'Los peligros y los niveles de abajo vienen de guías de surf y de la práctica general del surf. Nadie que surfee estas olas los ha revisado todavía para esta app. Donde una línea dice No confirmado, tómela como punto de partida y pregunte a un surfista local o a una escuela de surf en Puerto Viejo antes de entrar.',
      ),
    },
    { k: 'h', t: L('Sharing the wave', 'Compartir la ola') },
    {
      k: 'ul',
      items: [
        L('Right of way: the surfer closest to the peak, the place where the wave starts to break, has the wave. If the wave breaks both ways from the peak, each surfer takes the side they are on.{eti}', 'Prioridad: el surfista más cerca del pico, el lugar donde la ola empieza a romper, tiene la ola. Si la ola rompe hacia los dos lados del pico, cada surfista toma el lado en que está.{eti}'),
        L('Do not drop in. Dropping in means taking off on a wave that another surfer already has the right to. It is the most important rule of the line-up, and it is how people get hit by boards.{eti}', 'No se meta en la ola de otro. Meterse es salir en una ola que otro surfista ya tiene derecho a tomar. Es la regla más importante del grupo de surfistas y así es como la gente recibe golpes de tablas.{eti}'),
        L('Paddle out through the channel, the place where waves are not breaking and nobody is surfing. If you have to paddle across the line-up, go behind the surfers who are up and riding, never in front of them.{eti}', 'Reme hacia afuera por el canal, el lugar donde las olas no rompen y nadie está surfeando. Si tiene que cruzar el grupo, pase por detrás de los surfistas que van parados sobre la ola, nunca por delante.{eti}'),
        L('Keep hold of your board. Letting go of it to dive under a wave can hit the person paddling out behind you.{eti}', 'No suelte la tabla. Soltarla para pasar por debajo de una ola puede golpear a quien rema detrás de usted.{eti}'),
        L('Beginners should not paddle into the middle of a crowded line-up. Pick a quieter beach until you can catch waves on your own and turn.{eti}', 'Quienes empiezan no deben remar al centro de un grupo lleno. Elija una playa más tranquila hasta que pueda tomar olas solo y girar.{eti}'),
        L('Visitors are polite and locals do not cut in front of polite visitors either.{eti} Say sorry if you drop in by mistake.', 'Los visitantes son educados y los locales tampoco se cruzan delante de visitantes educados.{eti} Pida disculpas si se mete en una ola por error.'),
      ],
    },
    { k: 'h', t: L('Which wave size suits which surfer', 'Qué tamaño de ola le sirve a cada surfista') },
    {
      k: 'p',
      t: L(
        'This is our own rough reading, built to make the wave height on the forecast easier to use. It is not a published standard and it is Not confirmed. Wave height here means the face of the wave, the part you ride, measured from the trough to the top.',
        'Esta es nuestra lectura aproximada, hecha para que la altura de ola del pronóstico sea más fácil de usar. No es un estándar publicado y es No confirmada. Aquí la altura de ola es la cara de la ola, la parte que usted surfea, medida desde el valle hasta la cresta.',
      ),
    },
    {
      k: 'table',
      head: [L('Wave face', 'Cara de la ola'), L('Who it suits', 'A quién le sirve'), L('What to expect', 'Qué esperar')],
      rows: [
        [L('Under 0.6 m (knee to waist)', 'Menos de 0.6 m (rodilla a cintura)'), L('Beginners, with an instructor.', 'Quien empieza, con instructor.'), L('Soft waves and little push. The danger is other people and the sun, not the sea.', 'Olas suaves y poca fuerza. El peligro son las otras personas y el sol, no el mar.')],
        [L('0.6 to 1.2 m (waist to chest)', '0.6 a 1.2 m (cintura a pecho)'), L('Surfers who can already catch waves and turn.', 'Surfistas que ya toman olas y giran.'), L('Waves with some power. A rip current can start to matter.', 'Olas con algo de fuerza. Una corriente de resaca ya puede importar.')],
        [L('1.2 to 2 m (chest to over head)', '1.2 a 2 m (pecho a sobre la cabeza)'), L('Experienced surfers who are fit and know rips and reef.', 'Surfistas con experiencia, en forma, que conocen las corrientes y el arrecife.'), L('Waves break hard and hold you under. Getting out through the break takes strength.', 'Las olas rompen fuerte y lo mantienen bajo el agua. Salir por la rompiente exige fuerza.')],
        [L('Over 2 m (well over head)', 'Más de 2 m (muy sobre la cabeza)'), L('Experts only.', 'Solo expertos.'), L('Heavy waves and long swims if you lose your board. Stay on the beach if you are unsure.', 'Olas pesadas y nadadas largas si pierde la tabla. Si tiene dudas, quédese en la playa.')],
      ],
    },
    {
      k: 'p',
      t: L(
        'Move up one row of danger for a reef break such as Salsa Brava. A wave of the same size is more serious over shallow rock than over sand, because a fall can put you onto the reef. Also move up one row when the wave period is long, because long-period swell arrives with more push than its height suggests. Both of these are our own rules of thumb and are Not confirmed.',
        'Suba una fila de peligro en un arrecife como Salsa Brava. Una ola del mismo tamaño es más seria sobre roca poco profunda que sobre arena, porque una caída puede llevarlo contra el arrecife. Suba también una fila cuando el período de la ola es largo, porque el oleaje de período largo llega con más fuerza de la que sugiere su altura. Ambas son reglas prácticas nuestras y son No confirmadas.',
      ),
    },
    { k: 'h', t: L('Hazards break by break', 'Peligros por rompiente') },
    {
      k: 'p',
      t: L(
        'These are the hazards the surf guides list for each break in the app.{guides} The guides disagree with each other at times, and no local has confirmed them, so every row is Not confirmed.',
        'Estos son los peligros que las guías de surf anotan para cada rompiente de la app.{guides} Las guías no siempre coinciden entre sí y ningún local las ha confirmado, así que todas las filas son No confirmadas.',
      ),
    },
    {
      k: 'table',
      head: [L('Break', 'Rompiente'), L('Type', 'Tipo'), L('Hazards listed', 'Peligros anotados'), L('What that means for you', 'Qué significa para usted')],
      rows: [
        [
          L('Salsa Brava', 'Salsa Brava'),
          L('Reef break, right-hander', 'Arrecife, ola a la derecha'),
          L('Shallow reef, urchins, rips, crowds', 'Arrecife poco profundo, erizos, corrientes de resaca, mucha gente'),
          L('The most serious break on this coast and not a place to learn. The wave breaks over shallow reef, so a fall can cut you and urchin spines can break off in your skin. Wear reef booties, go with a surfer who knows it, and expect a crowd in good swell. The guides disagree on the best season, and the app only guesses that more water over the reef is safer. Not confirmed.', 'La rompiente más seria de esta costa y no es un lugar para aprender. La ola rompe sobre arrecife poco profundo, así que una caída puede cortarlo y las espinas de erizo pueden quedarse en la piel. Use escarpines de arrecife, vaya con un surfista que la conozca y espere mucha gente cuando hay buen oleaje. Las guías no coinciden en la mejor temporada, y la app solo supone que más agua sobre el arrecife es más seguro. No confirmado.'),
        ],
        [
          L('Playa Cocles', 'Playa Cocles'),
          L('Beach break, peaks', 'Playa de arena, picos'),
          L('Shorebreak, rips', 'Rompiente en la orilla, corrientes de resaca'),
          L('The waves can break right at the water’s edge, so getting in and out is where people are hurt. Time your entry between waves. Rips are listed here too, so look for a gap where the waves do not break. Not confirmed.', 'Las olas pueden romper justo en la orilla, así que entrar y salir es donde la gente se lastima. Entre entre una ola y otra. También se anotan corrientes de resaca, así que busque un hueco donde las olas no rompen. No confirmado.'),
        ],
        [
          L('Playa Negra (Puerto Viejo)', 'Playa Negra (Puerto Viejo)'),
          L('Beach break, peaks', 'Playa de arena, picos'),
          L('Rips', 'Corrientes de resaca'),
          L('Only one guide lists this break, as mellow on small swell. Rips are the main hazard it names. Not confirmed.', 'Solo una guía anota esta rompiente, como tranquila con oleaje pequeño. Las corrientes de resaca son el principal peligro que menciona. No confirmado.'),
        ],
        [
          L('Playa Grande', 'Playa Grande'),
          L('Beach break, peaks', 'Playa de arena, picos'),
          L('Rips, shorebreak', 'Corrientes de resaca, rompiente en la orilla'),
          L('One guide lists rips and undertow, and calls it an alternative when Cocles is too big. Not confirmed.', 'Una guía anota corrientes de resaca y de fondo, y la llama alternativa cuando Cocles está muy grande. No confirmado.'),
        ],
        [
          L('Playa Negra (Cahuita)', 'Playa Negra (Cahuita)'),
          L('Beach break, peaks', 'Playa de arena, picos'),
          L('Rips, patches of reef', 'Corrientes de resaca, parches de arrecife'),
          L('Two guides agree it is a beach break with lefts and rights. One of them lists reef patches, so do not assume the bottom is all sand. Not confirmed.', 'Dos guías coinciden en que es una playa de arena con olas a izquierda y derecha. Una de ellas anota parches de arrecife, así que no suponga que el fondo es todo arena. No confirmado.'),
        ],
      ],
    },
    { k: 'h', t: L('If you are hurt', 'Si se lastima') },
    {
      k: 'ul',
      items: [
        L('Urchin spines, reef cuts and stings: see the First aid tab for what to do first.', 'Espinas de erizo, cortes de arrecife y picaduras: vea la pestaña de Primeros auxilios para saber qué hacer primero.'),
        L('Call 911 for anyone who is knocked out, is not breathing well or is in trouble in the water. The First aid tab lists the hospital in Limón and the other numbers.', 'Llame al 911 si alguien queda inconsciente, no respira bien o está en problemas en el agua. La pestaña de Primeros auxilios trae el hospital de Limón y los otros números.'),
      ],
    },
  ],
  sources: {
    eti: {
      t: 'Surfing Handbook, Surfing etiquette',
      u: 'https://www.surfinghandbook.com/knowledge/surfing-etiquette',
      p: 'S',
      what: L('Right of way to the surfer closest to the peak, no dropping in, paddle out through the channel and behind riders, keep control of your board, beginners avoid packed line-ups, locals should not cut in front of visitors.', 'Prioridad al surfista más cerca del pico, no meterse en la ola de otro, remar por el canal y detrás de quien surfea, no soltar la tabla, quienes empiezan evitan los grupos llenos, los locales no deben cruzarse delante de visitantes.'),
    },
    guides: {
      t: 'Surf guides behind the app’s break list: Mondo Surf, Surfnerd, Culture Trip, Lonely Planet, Costa Rica Journeys and Surf-Forecast pages for each break',
      u: 'https://www.mondo.surf/surf-spot/salsa-brava/guide/11910',
      p: 'S',
      what: L('Break type and the hazards listed for each break. Gathered for the app on 4 November 2026; the guides were not re-read when this tab was written, and the Mondo Surf page was blocked when we tried it again.', 'Tipo de rompiente y los peligros anotados para cada una. Reunidas para la app el 4 de noviembre de 2026; las guías no se releyeron al escribir esta pestaña, y la página de Mondo Surf estaba bloqueada cuando se intentó otra vez.'),
    },
  },
};
