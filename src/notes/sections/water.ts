import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/**
 * WATER SAFETY: rip currents, waves at the water's edge, what to do when someone is in trouble. Dive and snorkel basics and the park rules
 * moved to their own Dive safety tab (dive.ts) so each activity's field notes carry only what it needs. Stings and bites live in the
 * First aid tab (aid.ts) and are linked rather than repeated. Joseph (2026-11-16): Playa Cocles has lifeguards, and Playa Cocles and
 * Playa Negra have flags. Other beaches are not known to, so the text never tells a swimmer to count on one.
 */
export const water: Section = {
  id: 'water',
  title: L('Water safety', 'Seguridad en el agua'),
  lede: L(
    'Only Playa Cocles has lifeguards. Playa Cocles and Playa Negra have flags, so follow them there. Everywhere else, read the sea yourself.',
    'Solo Playa Cocles tiene salvavidas. Playa Cocles y Playa Negra tienen banderas, así que hágales caso ahí. En el resto, lea el mar usted mismo.',
  ),
  blocks: [
    {
      k: 'tiles',
      items: [
        { ico: 'lifeguard', tone: 'go', h: L('Lifeguards', 'Salvavidas'), t: L('Playa Cocles only.', 'Solo en Playa Cocles.') },
        { ico: 'flag', tone: 'go', h: L('Flags', 'Banderas'), t: L('Playa Cocles and Playa Negra.', 'Playa Cocles y Playa Negra.') },
        { ico: 'alone', tone: 'warn', h: L('Everywhere else', 'En el resto'), t: L('Do not count on lifeguards or flags.', 'No cuente con salvavidas ni banderas.') },
      ],
    },
    {
      k: 'flow',
      alert: true,
      h: L('Someone in trouble in the water', 'Alguien en problemas en el agua'),
      steps: [
        { ico: 'phone', h: L('Call 911', 'Llame al 911'), t: L('The Red Cross and the coast guard answer through 911.', 'La Cruz Roja y el guardacostas responden por el 911.') },
        { ico: 'shout', h: L('Shout for help', 'Grite pidiendo ayuda'), t: L('Get the people nearby to help.', 'Que la gente cercana ayude.') },
        { ico: 'noswim', tone: 'stop', h: L('Do not swim out', 'No nade hacia la persona'), t: L('Many would-be rescuers drown that way.{noaa}', 'Muchos que intentan rescatar se ahogan así.{noaa}') },
        { ico: 'ring', h: L('Throw something that floats', 'Lance algo que flote'), t: L('A board, a cooler lid, a life jacket or a dry bag.', 'Una tabla, la tapa de una hielera, un chaleco o una bolsa estanca.') },
        { ico: 'eye', h: L('Keep watching', 'No le quite la vista'), t: L('Point to the spot when the rescuers come.', 'Señale el lugar cuando lleguen los rescatistas.') },
      ],
    },
    { k: 'h', t: L('Rip currents', 'Corrientes de resaca') },
    {
      k: 'fig',
      fig: 'rip',
      label: L('A rip current from above, and the way out of it', 'Una corriente de resaca vista desde arriba, y cómo salir de ella'),
      tones: ['stop', 'info', 'go'],
      marks: [
        L('The rip runs out through a gap in the breaking waves.{noaa}', 'La resaca sale por un hueco entre las olas que rompen.{noaa}'),
        L('Swim sideways, parallel to the beach, until it stops pulling.{noaa}{oceanservice}', 'Nade de lado, paralelo a la playa, hasta que deje de jalar.{noaa}{oceanservice}'),
        L('Then angle back to the shore with the breaking waves.{noaa}', 'Luego vuelva a la orilla en diagonal, con las olas que rompen.{noaa}'),
      ],
    },
    {
      k: 'stats',
      items: [
        { n: L('2.4 m/s', '2,4 m/s'), t: L('The fastest rips measured. That is faster than an Olympic swimmer.{oceanservice}', 'Las resacas más rápidas medidas. Es más rápido que un nadador olímpico.{oceanservice}') },
        { n: L('Out, not under', 'Afuera, no al fondo'), t: L('A rip pulls you away from the beach, not under the water. People drown from panic and from tiring themselves out swimming against it.{noaa}', 'Una resaca le jala lejos de la playa, no hacia el fondo. La gente se ahoga por el pánico y por cansarse nadando contra ella.{noaa}') },
      ],
    },
    {
      k: 'flow',
      h: L('If one catches you', 'Si una le atrapa'),
      steps: [
        { ico: 'float', h: L('Do not fight it', 'No luche contra ella'), t: L('Stay calm. It pulls you out, not under.{noaa}', 'Mantenga la calma. Le lleva hacia afuera, no hacia abajo.{noaa}') },
        { ico: 'side', h: L('Swim sideways', 'Nade de lado'), t: L('Swim along the beach, not toward it. Once out of the pull, angle back in to shore.{noaa}', 'Nade a lo largo de la playa, no hacia ella. Cuando salga del jalón, vuelva en diagonal a la orilla.{noaa}') },
        { ico: 'wave', tone: 'go', h: L('Cannot? Float and wave', '¿No puede? Flote y haga señas'), t: L('Lie on your back, wave and shout. The pull weakens past the waves, and you can swim back from there.{noaa}{bu}', 'Flote boca arriba, haga señas y grite. El jalón pierde fuerza pasadas las olas, y desde ahí puede volver nadando.{noaa}{bu}') },
      ],
    },
    {
      k: 'tiles',
      h: L('How to spot one', 'Cómo reconocerla'),
      items: [
        { ico: 'eye', h: L('Watch for a minute', 'Mire un minuto'), t: L('Look from the sand or a dune before you go in.{noaa}', 'Mire desde la arena o una duna antes de entrar.{noaa}') },
        { ico: 'gap', h: L('A flat gap', 'Un hueco liso'), t: L('A calm-looking gap in the line of breaking waves.{noaa}', 'Un hueco que parece calmo en la línea de olas que rompen.{noaa}') },
        { ico: 'foam', h: L('Things drifting out', 'Cosas que se alejan'), t: L('Foam, sand, seaweed or sargassum moving steadily out to sea.{noaa}{bu}', 'Espuma, arena, algas o sargazo que se alejan mar adentro sin parar.{noaa}{bu}') },
        { ico: 'channel', h: L('A different strip', 'Una franja distinta'), t: L('A channel of darker, calmer or churning water.{noaa}{bu}', 'Un canal de agua más oscura, más calmada o revuelta.{noaa}{bu}') },
        { ico: 'river', h: L('River mouths and rain', 'Desembocaduras y lluvia'), t: L('Near creeks and after heavy rain, the water also runs out hard.', 'Cerca de quebradas y después de lluvias fuertes, el agua también sale con fuerza.') },
        { ico: 'warn', tone: 'warn', h: L('No signs is not no rip', 'Sin señales no es sin resaca'), t: L('A rip can show none of these signs, even on a calm, sunny day.{bu}', 'Una resaca puede no mostrar ninguna señal, incluso en un día calmo y soleado.{bu}') },
        { ico: 'gauge', tone: 'unk', h: L('The app’s RIP RISK', 'RIESGO DE RESACA en la app'), t: L('An estimate from the waves, tide and wind of how likely a rip is, not whether one is there now. Low means unlikely, not impossible.', 'Un cálculo con las olas, la marea y el viento de qué tan probable es una resaca, no si hay una ahora. Bajo significa poco probable, no imposible.') },
      ],
    },
    { k: 'h', t: L('Waves at the water’s edge', 'Olas en la orilla') },
    {
      k: 'fig',
      fig: 'shore',
      label: L('Shore break heights next to a standing adult', 'Alturas del rompiente junto a un adulto de pie'),
      tones: ['go', 'warn', 'stop'],
      marks: [
        L('Under 0.5 m: easy to wade in and out.', 'Menos de 0.5 m: es fácil entrar y salir.'),
        L('0.5 to 1.3 m: wait for a lull between sets, walk in fast and keep facing the sea. Small children and weak swimmers stay out.', 'De 0.5 a 1.3 m: espere una pausa entre series, entre rápido y mire siempre al mar. Niños pequeños y nadadores débiles se quedan fuera.'),
        L('Over 1.3 m: waves dump hard on the sand and can knock you down and injure you badly. Stay out.', 'Más de 1.3 m: las olas revientan fuerte en la arena y pueden tumbarle y lesionarle gravemente. No entre.'),
      ],
      alt: L('Every score and card in the app uses these same two lines.', 'Todos los puntajes y tarjetas de la app usan estas mismas dos líneas.'),
    },
    {
      k: 'go',
      tab: 'aid',
      ico: 'jelly',
      h: L('Stings, spines and bites', 'Picaduras, espinas y mordeduras'),
      t: L('Jellyfish, sea urchins and stingrays: what to do, what not to do and when to call 911.', 'Medusas, erizos y rayas: qué hacer, qué no hacer y cuándo llamar al 911.'),
    },
    { k: 'h', t: L('Emergency numbers', 'Números de emergencia') },
    {
      k: 'calls',
      items: [
        { n: '911', tel: '911', h: L('Emergencies.', 'Emergencias.'), t: L('Ambulance, Red Cross and coast guard.', 'Ambulancia, Cruz Roja y guardacostas.') },
        { n: '800-4686-9422', tel: '80046869422', h: L('Poison centre (800-INTOXICA).', 'Centro de intoxicaciones (800-INTOXICA).'), t: L('Free, 24 hours, for a poisoning or a bad sting.', 'Gratis, 24 horas, para una intoxicación o una picadura fuerte.') },
        { n: 'Limón', h: L('Hospital Dr. Tony Facio Castro.', 'Hospital Dr. Tony Facio Castro.'), t: L('The region’s hospital. More numbers are in the First aid tab.', 'El hospital de la región. Más números en la pestaña de Primeros auxilios.') },
      ],
    },
    {
      k: 'tiles',
      items: [{ ico: 'signal', tone: 'warn', h: L('Weak signal on beaches', 'Poca señal en las playas'), t: L('Tell someone where you are swimming before you go.', 'Avise a alguien dónde va a nadar antes de ir.') }],
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
