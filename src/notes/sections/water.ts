import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/**
 * WATER SAFETY: rip currents, waves at the water's edge, what to do when someone is in trouble. Stings and bites live in the
 * First aid tab (aid.ts) and are linked rather than repeated. This coast has no lifeguards and no flag system that the app
 * knows of (Joseph to confirm for any beach that does), so nothing here tells a swimmer to look for one.
 */
export const water: Section = {
  id: 'water',
  title: L('Water safety', 'Seguridad en el agua'),
  lede: L(
    'Most of this coast has no lifeguard and no flags, so you are your own safety team. Read the sea before you get in, know how to get out of a rip current, and know who to call.',
    'En casi toda esta costa no hay salvavidas ni banderas, así que usted mismo cuida su seguridad. Lea el mar antes de entrar, sepa cómo salir de una corriente de resaca y sepa a quién llamar.',
  ),
  blocks: [
    {
      k: 'aid',
      h: L('If someone is in trouble in the water', 'Si alguien tiene problemas en el agua'),
      t: L(
        'Call 911 first, then shout to people nearby. Do not swim out to the person yourself, because many would-be rescuers drown that way.{noaa} Throw them anything that floats, such as a board, a cooler lid, a life jacket or a dry bag, and keep your eyes on them so you can point to the spot for the rescuers. Cruz Roja (the Red Cross) and the coast guard answer through 911.',
        'Llame primero al 911 y luego grite a la gente cercana. No nade usted mismo hacia la persona, porque muchos que intentan rescatar se ahogan así.{noaa} Láncele cualquier cosa que flote, como una tabla, la tapa de una hielera, un chaleco salvavidas o una bolsa estanca, y no le quite la vista de encima para poder señalar el lugar a los rescatistas. La Cruz Roja y el guardacostas responden por el 911.',
      ),
    },
    { k: 'h', t: L('Rip currents', 'Corrientes de resaca') },
    {
      k: 'p',
      t: L(
        'A rip current is a narrow stream of water that runs from the beach out past the breaking waves. It forms where waves pile water up on the shore and that water finds a channel to flow back out. It pulls you away from the beach, not under the water. People get into trouble because they panic and tire themselves out swimming straight back against it.{noaa} Rips have been clocked at about 2.4 metres per second, which is faster than an Olympic swimmer.{oceanservice}',
        'Una corriente de resaca es una corriente angosta de agua que va desde la playa hacia afuera, pasando las olas que rompen. Se forma donde las olas amontonan agua en la orilla y esa agua busca un canal para volver al mar. Le jala lejos de la playa, no hacia el fondo. La gente se mete en problemas porque entra en pánico y se cansa nadando de frente contra ella.{noaa} Se han medido resacas de unos 2.4 metros por segundo, más rápido que un nadador olímpico.{oceanservice}',
      ),
    },
    { k: 'h', t: L('How to spot one', 'Cómo reconocerla') },
    {
      k: 'ul',
      items: [
        L('Watch the waves for a minute from the sand or a dune before you go in. Look for a flat gap in the line of breaking waves.{noaa}', 'Mire las olas durante un minuto desde la arena o una duna antes de entrar. Busque un hueco liso en la línea de olas que rompen.{noaa}'),
        L('Look for foam, sand, seaweed or sargassum drifting steadily out to sea, or a channel of darker, calmer or churning water.{noaa}{bu}', 'Busque espuma, arena, algas o sargazo que se alejan de forma constante mar adentro, o un canal de agua más oscura, más calmada o revuelta.{noaa}{bu}'),
        L('A rip can be there with none of these signs, and it can form on a calm sunny day, so do not rely on one sign alone.{bu} Near river mouths and creeks, and after heavy rain, the water also runs out hard.', 'Puede haber una resaca sin ninguna de estas señales, y puede formarse en un día calmo y soleado, así que no dependa de una sola señal.{bu} Cerca de desembocaduras de ríos y quebradas, y después de lluvias fuertes, el agua también sale con fuerza.'),
        L('The app\'s RIP RISK is an estimate from the waves, tide and wind. It says how likely a rip is to form, not whether one is there right now. Low means unlikely, not impossible.', 'El RIESGO DE RESACA de la app es un cálculo a partir de las olas, la marea y el viento. Dice qué tan probable es que se forme una resaca, no si hay una ahora mismo. Bajo significa poco probable, no imposible.'),
      ],
    },
    { k: 'h', t: L('If one catches you', 'Si una le atrapa') },
    {
      k: 'ul',
      items: [
        L('Stay calm and do not fight it. Float or tread water to save your strength.{noaa}', 'Mantenga la calma y no luche contra ella. Flote o mantenga la cabeza fuera del agua para guardar fuerzas.{noaa}'),
        L('Call and wave for help.{noaa}', 'Grite y agite los brazos para pedir ayuda.{noaa}'),
        L('If you can swim well, swim sideways, parallel to the beach, until you are out of the pull. Then angle back toward the shore along the breaking waves.{noaa}', 'Si nada bien, nade de lado, paralelo a la playa, hasta salir de la corriente. Luego vuelva hacia la orilla en diagonal, siguiendo las olas que rompen.{noaa}'),
        L('If you are tired or cannot get out, float on your back and let it carry you. It weakens past the breaking waves, and you can swim back from there.{bu}', 'Si está cansado o no puede salir, flote boca arriba y deje que le lleve. Pierde fuerza pasadas las olas que rompen, y desde ahí puede nadar de regreso.{bu}'),
      ],
    },
    { k: 'h', t: L('Waves at the water\'s edge (the shore break)', 'Olas en la orilla (el rompiente)') },
    {
      k: 'ul',
      items: [
        L('Under 0.5 m: easy to wade in and out.', 'Menos de 0.5 m: es fácil entrar y salir.'),
        L('0.5 m to 1.3 m: waves reach the waterline. Wait for a lull between sets, walk in quickly and keep your face to the sea. Small children and weak swimmers should stay out.', 'De 0.5 m a 1.3 m: las olas llegan hasta la orilla. Espere una pausa entre series, entre rápido y mire siempre hacia el mar. Niños pequeños y nadadores débiles deben quedarse fuera.'),
        L('Over 1.3 m: waves dump hard on the sand and can knock you down and injure you badly. Stay out. The same 0.5 m and 1.3 m lines are used by every score and card in the app.', 'Más de 1.3 m: las olas revientan con fuerza en la arena y pueden tumbarle y lesionarle gravemente. No entre. Estas mismas líneas de 0.5 m y 1.3 m se usan en todos los puntajes y tarjetas de la app.'),
      ],
    },
    { k: 'h', t: L('Stings, spines and bites', 'Picaduras, espinas y mordeduras') },
    {
      k: 'p',
      t: L(
        'Jellyfish, sea urchins, stingrays and other hazards each have their own steps, with what not to do and when to call 911, in the First aid tab.',
        'Medusas, erizos de mar, rayas y otros peligros tienen cada uno sus propios pasos, con lo que no se debe hacer y cuándo llamar al 911, en la pestaña de Primeros auxilios.',
      ),
    },
    { k: 'h', t: L('Emergency numbers', 'Números de emergencia') },
    {
      k: 'p',
      t: L(
        'Call 911 for an ambulance, the Red Cross or the coast guard. For a poisoning or a bad sting, the poison centre answers free, 24 hours, on 800-4686-9422 (800-INTOXICA). The region\'s hospital is Hospital Dr. Tony Facio Castro in Limón. The full list is in the First aid tab. Mobile signal can be weak on beaches, so tell someone where you are swimming.',
        'Llame al 911 para ambulancia, Cruz Roja o guardacostas. Para una intoxicación o una picadura fuerte, el centro de intoxicaciones atiende gratis, las 24 horas, en el 800-4686-9422 (800-INTOXICA). El hospital de la región es el Hospital Dr. Tony Facio Castro en Limón. La lista completa está en la pestaña de Primeros auxilios. La señal del celular puede ser débil en las playas, así que avise a alguien dónde va a nadar.',
      ),
    },
  ],
  sources: {
    noaa: {
      t: 'NOAA Ocean Today, Rip Current Safety',
      u: 'https://oceantoday.noaa.gov/fullmoon-ripcurrent/welcome.html',
      p: 'P',
      what: L('How to spot a rip from high ground, stay calm, float, swim parallel to shore then angle back, call and wave, and for a rescuer: get help, throw something that floats and do not enter the water.', 'Cómo verla desde un lugar alto, mantener la calma, flotar, nadar paralelo a la orilla y luego volver en diagonal, pedir ayuda, y para quien rescata: pedir auxilio, lanzar algo que flote y no entrar al agua.'),
    },
    oceanservice: {
      t: 'NOAA National Ocean Service, What is a rip current?',
      u: 'https://oceanservice.noaa.gov/facts/ripcurrent.html',
      p: 'P',
      what: L('Speed of up to eight feet per second (about 2.4 m/s); swim parallel to shore, not straight back.', 'Velocidad de hasta ocho pies por segundo (unos 2.4 m/s); nadar paralelo a la orilla, no de frente.'),
    },
    bu: {
      t: 'Boston University, Spotting and Surviving Rip Currents (aquatics manager Cliff Merritt)',
      u: 'https://www.bu.edu/articles/2017/rip-currents-safety',
      p: 'S',
      what: L('Warning signs may be present or absent; float on your back if tired; rips do not pull people under, panic and tiredness cause drowning.', 'Las señales pueden estar o no estar; flotar boca arriba si hay cansancio; las resacas no hunden, el pánico y el cansancio causan el ahogo.'),
    },
  },
};
