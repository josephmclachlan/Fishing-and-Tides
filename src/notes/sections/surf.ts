import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Surf: etiquette, a plain reading of wave size for each skill level, and the hazards listed for each break. */
export const surf: Section = {
  id: 'surf',
  title: L('Surf', 'Surf'),
  lede: L(
    'How to share a wave, which wave size suits you, and what each break here can do to you.',
    'Cómo compartir una ola, qué tamaño de ola le sirve y lo que puede hacerle cada rompiente de aquí.',
  ),
  blocks: [
    {
      k: 'tiles',
      items: [
        {
          ico: 'ask',
          tone: 'unk',
          h: L('Not confirmed', 'No confirmado'),
          t: L(
            'The hazards and skill levels here come from surf guides and general surfing practice. No local surfer has checked them yet, so ask a local surfer or a surf school in Puerto Viejo before you go out.',
            'Los peligros y niveles de aquí vienen de guías de surf y de la práctica general. Ningún surfista local los ha revisado todavía, así que pregunte a un surfista local o a una escuela de surf en Puerto Viejo antes de entrar.',
          ),
        },
      ],
    },
    { k: 'h', t: L('Sharing the wave', 'Compartir la ola') },
    {
      k: 'fig',
      fig: 'peak',
      label: L('Who has the wave at a peak, seen from above', 'Quién tiene la ola en un pico, visto desde arriba'),
      tones: ['go', 'stop', 'info'],
      marks: [
        L('The surfer closest to the peak, where the wave starts to break, has the wave. If it breaks both ways, each surfer takes their own side.{eti}', 'El surfista más cerca del pico, donde la ola empieza a romper, tiene la ola. Si rompe hacia los dos lados, cada surfista toma su lado.{eti}'),
        L('Never drop in: do not take off on a wave someone else already has. It is the most important rule, and it is how people get hit by boards.{eti}', 'Nunca se meta: no salga en una ola que otro ya tiene. Es la regla más importante y así la gente recibe golpes de tablas.{eti}'),
        L('Paddle out through the channel, where waves do not break. Cross behind surfers who are riding, never in front of them.{eti} The channel is often a rip current, so only go in it with your board.', 'Reme hacia afuera por el canal, donde las olas no rompen. Pase por detrás de quien va surfeando, nunca por delante.{eti} El canal suele ser una corriente de resaca, así que solo entre en él con su tabla.'),
      ],
    },
    {
      k: 'dodont',
      do: [
        L('Keep hold of your board when a wave comes.{eti}', 'Agarre su tabla cuando viene una ola.{eti}'),
        L('Learn at a quieter beach until you can catch waves and turn on your own.{eti}', 'Aprenda en una playa más tranquila hasta que tome olas y gire por su cuenta.{eti}'),
        L('Be polite, and say sorry if you drop in by mistake. Locals should not cut in front of polite visitors either.{eti}', 'Sea educado y pida disculpas si se mete por error. Los locales tampoco deben cruzarse delante de visitantes educados.{eti}'),
      ],
      dont: [
        L('Do not let go of your board to dive under a wave. It can hit the person paddling behind you.{eti}', 'No suelte la tabla para pasar bajo una ola. Puede golpear a quien rema detrás.{eti}'),
        L('Do not paddle into the middle of a crowded line-up as a beginner.{eti}', 'Si está empezando, no reme al centro de un grupo lleno.{eti}'),
      ],
    },
    { k: 'h', t: L('Which wave size suits you', 'Qué tamaño de ola le sirve') },
    {
      k: 'fig',
      fig: 'sizes',
      label: L('Four wave sizes next to a standing adult', 'Cuatro tamaños de ola junto a un adulto de pie'),
      tones: ['go', 'warn', 'stop', 'stop'],
      marks: [
        L('Under 0.6 m, up to the knee: beginners, with an instructor. Soft waves with little push; the danger is other people and the sun.', 'Menos de 0.6 m, hasta la rodilla: quien empieza, con instructor. Olas suaves y poca fuerza; el peligro son otras personas y el sol.'),
        L('0.6 to 1.2 m, knee to chest: surfers who can already catch waves and turn. Some power, and rips start to matter.', '0.6 a 1.2 m, rodilla a pecho: quien ya toma olas y gira. Algo de fuerza, y las corrientes de resaca empiezan a importar.'),
        L('1.2 to 2 m, chest to over your head: experienced, fit surfers who know rips and reef. Waves break hard and hold you under, and getting out takes strength.', '1.2 a 2 m, pecho a sobre la cabeza: surfistas con experiencia, en forma, que conocen resacas y arrecife. Las olas rompen fuerte y le mantienen abajo, y salir exige fuerza.'),
        L('Over 2 m, well over your head: experts only. Heavy waves and long swims if you lose your board. Unsure? Stay on the beach.', 'Más de 2 m, muy sobre la cabeza: solo expertos. Olas pesadas y nadadas largas si pierde la tabla. ¿Duda? Quédese en la playa.'),
      ],
      alt: L(
        'Wave height here is the face you ride, from the trough to the top. This guide is our own rough reading, not a published standard, so it is Not confirmed.',
        'Aquí la altura es la cara que usted surfea, del valle a la cresta. Esta guía es nuestra lectura aproximada, no un estándar publicado, así que es No confirmada.',
      ),
    },
    {
      k: 'tiles',
      h: L('Count one size bigger when', 'Cuente un tamaño más cuando'),
      items: [
        { ico: 'coral', tone: 'unk', h: L('It breaks over reef', 'Rompe sobre arrecife'), t: L('At a reef break such as Salsa Brava, a fall can put you onto shallow rock. Not confirmed.', 'En un arrecife como Salsa Brava, una caída puede llevarle contra roca poco profunda. No confirmado.') },
        { ico: 'clock', tone: 'unk', h: L('The period is long', 'El período es largo'), t: L('Long-period swell hits harder than its height suggests. Not confirmed.', 'El oleaje de período largo pega más fuerte de lo que sugiere su altura. No confirmado.') },
      ],
    },
    { k: 'h', t: L('Hazards break by break', 'Peligros por rompiente') },
    {
      k: 'heat',
      cols: [L('Reef', 'Arrecife'), L('Urchins', 'Erizos'), L('Rips', 'Resaca'), L('Shore break', 'Orilla'), L('Crowds', 'Gente')],
      rows: [
        { h: L('Salsa Brava', 'Salsa Brava'), hue: 'closed', v: [3, 3, 3, 0, 3] },
        { h: L('Playa Cocles', 'Playa Cocles'), hue: 'closed', v: [0, 0, 3, 3, 0] },
        { h: L('Playa Negra (Puerto Viejo)', 'Playa Negra (Puerto Viejo)'), hue: 'closed', v: [0, 0, 3, 0, 0] },
        { h: L('Playa Grande', 'Playa Grande'), hue: 'closed', v: [0, 0, 3, 3, 0] },
        { h: L('Playa Negra (Cahuita)', 'Playa Negra (Cahuita)'), hue: 'closed', v: [2, 0, 3, 0, 0] },
      ],
      key: [
        { v: 3, hue: 'closed', t: L('Listed by the surf guides', 'Anotado por las guías de surf') },
        { v: 2, hue: 'closed', t: L('Patches only', 'Solo parches') },
      ],
      note: L('These are the hazards the surf guides list for each break.{guides} The guides sometimes disagree and no local has confirmed them, so every row is Not confirmed.', 'Estos son los peligros que las guías de surf anotan para cada rompiente.{guides} Las guías a veces no coinciden y ningún local los ha confirmado, así que todas las filas son No confirmadas.'),
    },
    {
      k: 'cards',
      items: [
        {
          ico: 'coral',
          tone: 'stop',
          tag: L('Reef break, rights', 'Arrecife, olas a la derecha'),
          h: L('Salsa Brava', 'Salsa Brava'),
          t: L('The most serious break on this coast, and not a place to learn.', 'La rompiente más seria de esta costa, y no es lugar para aprender.'),
          list: [
            L('A fall on the shallow reef can cut you, and urchin spines can break off in your skin. Wear reef booties.', 'Una caída en el arrecife poco profundo puede cortarle, y las espinas de erizo se quedan en la piel. Use escarpines.'),
            L('Go with a surfer who knows it, and expect a crowd in good swell.', 'Vaya con un surfista que la conozca y espere mucha gente con buen oleaje.'),
            L('The guides disagree on the best season, and the app only guesses that more water over the reef is safer. Not confirmed.', 'Las guías no coinciden en la mejor temporada, y la app solo supone que más agua sobre el arrecife es más seguro. No confirmado.'),
          ],
        },
        {
          ico: 'gap',
          tone: 'warn',
          tag: L('Beach break, peaks', 'Playa de arena, picos'),
          h: L('Playa Cocles', 'Playa Cocles'),
          t: L('Waves can break right at the water’s edge, so getting in and out is where people get hurt.', 'Las olas pueden romper justo en la orilla, así que entrar y salir es donde la gente se lastima.'),
          list: [L('Time your entry between waves, and look for the rip gap before you go in. Not confirmed.', 'Entre entre una ola y otra, y busque el hueco de la resaca antes de entrar. No confirmado.')],
        },
        {
          ico: 'gap',
          tone: 'unk',
          tag: L('Beach break, peaks', 'Playa de arena, picos'),
          h: L('Playa Negra (Puerto Viejo)', 'Playa Negra (Puerto Viejo)'),
          t: L('Only one guide lists it, as mellow on a small swell, with rips as the main hazard. Not confirmed.', 'Solo una guía la anota, tranquila con oleaje pequeño, y la resaca como peligro principal. No confirmado.'),
        },
        {
          ico: 'gap',
          tone: 'unk',
          tag: L('Beach break, peaks', 'Playa de arena, picos'),
          h: L('Playa Grande', 'Playa Grande'),
          t: L('One guide lists rips and undertow and calls it the place to go when Cocles is too big. Not confirmed.', 'Una guía anota resaca y corriente de fondo y la llama la alternativa cuando Cocles está muy grande. No confirmado.'),
        },
        {
          ico: 'gap',
          tone: 'unk',
          tag: L('Beach break, lefts and rights', 'Playa de arena, izquierdas y derechas'),
          h: L('Playa Negra (Cahuita)', 'Playa Negra (Cahuita)'),
          t: L('Two guides agree it is a beach break, but one lists patches of reef, so do not assume the bottom is all sand. Not confirmed.', 'Dos guías coinciden en que es de arena, pero una anota parches de arrecife, así que no suponga que el fondo es todo arena. No confirmado.'),
        },
      ],
    },
    {
      k: 'flow',
      alert: true,
      h: L('If someone is hurt', 'Si alguien se lastima'),
      steps: [
        { ico: 'phone', h: L('Call 911', 'Llame al 911'), t: L('For anyone knocked out, not breathing well or in trouble in the water.', 'Si alguien queda inconsciente, no respira bien o está en problemas en el agua.') },
        { ico: 'hospital', h: L('Cuts, spines, stings', 'Cortes, espinas, picaduras'), t: L('The First aid tab says what to do first, with the hospital in Limón and other numbers.', 'La pestaña de Primeros auxilios dice qué hacer primero, con el hospital de Limón y otros números.') },
      ],
    },
    {
      k: 'go',
      tab: 'aid',
      ico: 'jelly',
      h: L('First aid', 'Primeros auxilios'),
      t: L('Urchin spines, reef cuts and stings, step by step.', 'Espinas de erizo, cortes de arrecife y picaduras, paso a paso.'),
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
