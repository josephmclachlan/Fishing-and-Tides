import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/**
 * WATER SAFETY (with the dive and snorkel basics and park rules that #294 added to this tab): rip currents, waves at the water's edge, what to do when someone is in trouble. Stings and bites live in the
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
        { ico: 'float', h: L('Stay calm', 'Mantenga la calma'), t: L('Float or tread water. Do not fight it.{noaa}', 'Flote o mantenga la cabeza fuera. No luche contra ella.{noaa}') },
        { ico: 'wave', h: L('Call and wave', 'Grite y haga señas'), t: L('Wave your arms so people see you.{noaa}', 'Agite los brazos para que le vean.{noaa}') },
        { ico: 'side', h: L('Swim sideways', 'Nade de lado'), t: L('If you swim well, go parallel to the beach, then angle in.{noaa}', 'Si nada bien, vaya paralelo a la playa y luego entre en diagonal.{noaa}') },
        { ico: 'float', tone: 'go', h: L('Tired? Float', '¿Cansado? Flote'), t: L('Lie on your back and let it carry you. It weakens past the waves, and you can swim back from there.{bu}', 'Flote boca arriba y deje que le lleve. Pierde fuerza pasadas las olas, y desde ahí puede volver nadando.{bu}') },
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
    { k: 'h', t: L('Diving and snorkelling', 'Buceo y snorkel') },
    {
      k: 'fig',
      fig: 'depth',
      label: L('The depths the scores judge, and how deep each first certificate goes', 'Las profundidades que juzgan las notas, y hasta dónde llega cada certificado'),
      marks: [
        L('SNORKEL judges the sea 2 m down, just under where you float.', 'SNORKEL juzga el mar a 2 m, justo bajo donde usted flota.'),
        L('DIVE judges it 6 m down, tank or breath-hold. It says how the water is, not whether you are trained for it.', 'BUCEO lo juzga a 6 m, con tanque o a pulmón. Dice cómo está el agua, no si usted está preparado para ella.'),
        L('A new PADI Open Water diver goes down to 18 m, with a certified buddy.{padi}', 'Un buzo nuevo Open Water de PADI baja hasta 18 m, con un compañero certificado.{padi}'),
        L('Advanced Open Water goes down to 30 m.{padi}', 'Advanced Open Water baja hasta 30 m.{padi}'),
      ],
      alt: L(
        'SPEAR is for breath-hold spearfishing and has stricter limits. Tanks may not be used to spearfish in Costa Rica, except in lionfish tournaments approved by INCOPESCA. See the Rules tab.',
        'PESCA SUBMARINA es para pesca a pulmón y tiene límites más estrictos. En Costa Rica no se pueden usar tanques para pescar con arpón, salvo en torneos de pez león aprobados por INCOPESCA. Vea la pestaña de Reglas.',
      ),
    },
    {
      k: 'tiles',
      h: L('Before you go down with a tank', 'Antes de bajar con tanque'),
      items: [
        { ico: 'cert', h: L('Get certified', 'Certifíquese'), t: L('You need a diving certificate. The depths each one allows are in the chart above.{padi}', 'Necesita un certificado de buceo. La profundidad que permite cada uno está en el gráfico de arriba.{padi}') },
        { ico: 'swim', h: L('200 m swim, 10 min float', '200 m de nado, 10 min flotando'), t: L('What PADI asks before you can take a course.{padi}', 'Lo que pide PADI para poder tomar un curso.{padi}') },
        { ico: 'guide', tone: 'unk', h: L('Not certified?', '¿Sin certificado?'), t: L('Book a try-dive with an instructor. Which shops run trips here is Not confirmed, so ask in town.', 'Haga un bautizo de buceo con instructor. Qué tiendas salen desde aquí es No confirmado, así que pregunte en el pueblo.') },
        { ico: 'tank', tone: 'warn', h: L('Stay well inside your limits', 'Quédese lejos de sus límites'), t: L('The no-decompression limit lowers the risk of the bends but does not remove it, so dive shallower and shorter than your computer allows.{dan}', 'El límite sin descompresión baja el riesgo del mal de los buzos pero no lo elimina, así que bucee menos hondo y menos tiempo de lo que permite su computadora.{dan}') },
      ],
    },
    {
      k: 'hbars',
      h: L('Wait before you fly', 'Espere antes de volar'),
      ico: 'plane',
      max: 24,
      unit: 'h',
      rows: [
        { label: L('After one dive, at least', 'Tras una inmersión, al menos'), v: 12 },
        { label: L('After several dives or several days of diving, at least', 'Tras varias inmersiones o varios días de buceo, al menos'), v: 18 },
      ],
      note: L('These are the minimum waits.{fly}', 'Son las esperas mínimas.{fly}'),
    },
    {
      k: 'flow',
      alert: true,
      h: L('Feeling wrong after a dive', 'Se siente mal después de bucear'),
      steps: [
        { ico: 'phone', h: L('Call 911', 'Llame al 911'), t: L('Or get to the nearest emergency room. Odd tiredness, joint pain, numbness or trouble with balance all count.{danhelp}', 'O vaya a la sala de emergencias más cercana. Cansancio raro, dolor en las articulaciones, adormecimiento o problemas de equilibrio cuentan.{danhelp}') },
        { ico: 'phone', h: L('Then call DAN', 'Luego llame a DAN'), t: L('The Divers Alert Network emergency line, 24 hours: +1 919 684 9111.{danhelp}', 'La línea de emergencia de Divers Alert Network, 24 horas: +1 919 684 9111.{danhelp}') },
        { ico: 'nochamber', tone: 'stop', h: L('Let DAN pick the chamber', 'Que DAN elija la cámara'), t: L('Do not just turn up at one. Not every chamber treats every case, so let the doctors or DAN choose.{danhelp}', 'No llegue sin avisar a una. No todas las cámaras tratan todos los casos, así que deje que los médicos o DAN decidan.{danhelp}') },
        { ico: 'ask', tone: 'unk', h: L('Ask before you dive', 'Pregunte antes de bucear'), t: L('The nearest chamber to this coast is Not confirmed. Ask your dive shop where they would take you.', 'La cámara más cercana a esta costa es No confirmada. Pregunte a su tienda de buceo adónde le llevarían.') },
      ],
    },
    { k: 'h', t: L('Parks', 'Parques') },
    {
      k: 'stats',
      items: [
        { n: L('600 ha', '600 ha'), t: L('Of coral reef in Cahuita National Park, the most important reef in the country, inside 22,400 ha of protected sea.{cah}', 'De arrecife de coral en el Parque Nacional Cahuita, el arrecife más importante del país, dentro de 22 400 ha de mar protegido.{cah}') },
      ],
    },
    {
      k: 'compare',
      cols: [L('Cahuita National Park', 'Parque Nacional Cahuita'), L('Gandoca-Manzanillo Refuge', 'Refugio Gandoca-Manzanillo')],
      rows: [
        { ico: 'clock', h: L('Hours', 'Horario'), cells: [
          { tone: 'info', t: L('08:00 to 16:00, every day.{cah}', '08:00 a 16:00, todos los días.{cah}') },
          { tone: 'info', t: L('08:00 to 16:00, every day.{gvc}', '08:00 a 16:00, todos los días.{gvc}') },
        ] },
        { ico: 'gate', h: L('Way in', 'Entrada'), cells: [
          { tone: 'info', t: L('Puerto Vargas, or Cahuita village (Playa Blanca). Both have an information post.{cah}', 'Puerto Vargas o el pueblo de Cahuita (Playa Blanca). Ambas tienen puesto de información.{cah}') },
          { tone: 'info', t: L('The Manzanillo sector or the Gandoca sector.{gvc}', 'El sector Manzanillo o el sector Gandoca.{gvc}') },
        ] },
        { ico: 'card', h: L('Paying', 'Pago'), cells: [
          { tone: 'warn', t: L('Puerto Vargas: card only at the gate, no cash, no booking. Village: a donation.{cah} Price Not confirmed.', 'Puerto Vargas: solo tarjeta en la entrada, sin efectivo ni reserva. Pueblo: una donación.{cah} Precio No confirmado.') },
          { tone: 'go', t: L('Free.{gvc}', 'Gratis.{gvc}') },
        ] },
        { ico: 'swim', h: L('Swim and snorkel', 'Nadar y snorkel'), cells: [
          { tone: 'warn', t: L('Only in the areas the park marks. Watch the currents and keep out of areas marked dangerous.{cah}', 'Solo en las áreas que marca el parque. Cuídese de las corrientes y no entre en áreas marcadas como peligrosas.{cah}') },
          { tone: 'go', t: L('Snorkelling and diving on the reef are allowed. In water under 1 m (3 ft), surface gear only.{gman}', 'Se permite snorkel y buceo en el arrecife. En agua de menos de 1 m (3 pies), solo equipo de superficie.{gman}') },
        ] },
        { ico: 'hook', h: L('Fishing', 'Pesca'), cells: [
          { tone: 'stop', t: L('No lines, trammel nets, cast nets or spears.{cah} Line fishing in the sea part is Not confirmed: see Rules.', 'Sin líneas, trasmallos, atarrayas ni arpones.{cah} La pesca con línea en la parte marina es No confirmada: vea Reglas.') },
          { tone: 'warn', t: L('Hook and line only. Taking sea life to collect, for aquariums or to sell is prohibited.{gman}', 'Solo cuerda y anzuelo. Se prohíbe sacar vida marina para colección, acuarios o venta.{gman}') },
        ] },
        { ico: 'spear', h: L('Spearfishing', 'Pesca con arpón'), cells: [
          { tone: 'stop', t: L('Not allowed.{cah}', 'No permitida.{cah}') },
          { tone: 'unk', t: L('The hook-and-line-only rule rules it out, but it stays Not confirmed until SINAC confirms it for the sea.', 'La regla de solo cuerda y anzuelo la excluye, pero sigue No confirmada hasta que SINAC lo confirme para el mar.') },
        ] },
        { ico: 'jetski', h: L('Jet skis and vehicles', 'Motos acuáticas y vehículos'), cells: [
          { tone: 'unk', t: L('The brochure does not say.', 'El folleto no lo dice.') },
          { tone: 'stop', t: L('No jet skis from Punta Cocles to Punta Mona, and no vehicles on the beach.{gman}', 'Sin motos acuáticas de Punta Cocles a Punta Mona, y sin vehículos en la playa.{gman}') },
        ] },
        { ico: 'guide', h: L('Guide needed?', '¿Hace falta guía?'), cells: [
          { tone: 'unk', t: L('Not confirmed. The brochure lists a guide service, and guidebooks disagree.', 'No confirmado. El folleto marca un servicio de guías, y las guías turísticas no coinciden.') },
          { tone: 'unk', t: L('Not confirmed, and no diving fee is mentioned. Ask at the refuge or SINAC.', 'No confirmado, y no se menciona tarifa de buceo. Pregunte en el refugio o en SINAC.') },
        ] },
        { ico: 'phone', h: L('Park office', 'Oficina'), cells: [
          { tone: 'info', t: L('+506 2755-0302 or +506 2755-0461, aclac.pncahuita@sinac.go.cr{cah}', '+506 2755-0302 o +506 2755-0461, aclac.pncahuita@sinac.go.cr{cah}') },
          { tone: 'info', t: L('+506 2759-0600{gvc}', '+506 2759-0600{gvc}') },
        ] },
      ],
    },
    {
      k: 'tiles',
      h: L('On the reef, in both parks', 'En el arrecife, en ambos parques'),
      items: [
        { ico: 'nostand', tone: 'stop', h: L('Do not stand on coral', 'No se pare en el coral'), t: L('And do not drag yourself over it. It hurts the coral and can cut you.{cah}{gman}', 'Ni se arrastre sobre él. Lo daña y puede cortarle.{cah}{gman}') },
        { ico: 'notouch', tone: 'stop', h: L('Do not touch or move animals', 'No toque ni mueva animales'), t: L('Leave sea animals alone and do not stress them.{gman}', 'Deje en paz a los animales marinos y no los estrese.{gman}') },
        { ico: 'rock', tone: 'stop', h: L('Do not lift rocks', 'No levante piedras'), t: L('It leaves what lives under them open to predators.{gman}', 'Deja expuesto a lo que vive debajo ante los depredadores.{gman}') },
      ],
    },
    {
      k: 'warn',
      h: L('Not confirmed', 'No confirmado'),
      t: L(
        'These park rules come from the parks’ own brochures, which can be out of date. Call the park office before you go and follow the signs on the day.',
        'Estas reglas vienen de los folletos de los parques, que pueden estar desactualizados. Llame a la oficina del parque antes de ir y siga las señales ese día.',
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
    padi: {
      t: 'PADI, How deep can Open Water and Advanced divers go',
      u: 'https://blog.padi.com/how-deep-can-open-water-vs-advanced-divers-go/',
      p: 'S',
      what: L('Open Water 18 m (60 feet) with a certified buddy, Advanced Open Water 30 m (100 feet), a 200 m swim and 10 minutes floating to take the course.', 'Open Water 18 m (60 pies) con un compañero certificado, Advanced Open Water 30 m (100 pies), 200 m de nado y 10 minutos flotando para hacer el curso.'),
    },
    dan: {
      t: 'Divers Alert Network, A critical look at no-decompression limits',
      u: 'https://dan.org/alert-diver/article/a-critical-look-at-no-decompression-limits/',
      p: 'S',
      what: L('Staying within the limits lowers the risk of decompression illness but does not remove it.', 'Mantenerse dentro de los límites baja el riesgo de enfermedad por descompresión pero no lo elimina.'),
    },
    fly: {
      t: 'DAN Southern Africa, Flying after diving',
      u: 'https://dansa.org/blog/2021/04/15/flying-after-diving',
      p: 'S',
      what: L('At least 12 hours after a single no-decompression dive and at least 18 hours after repeated dives or several days of diving.', 'Al menos 12 horas tras una inmersión sin descompresión y al menos 18 horas tras inmersiones repetidas o varios días de buceo.'),
    },
    danhelp: {
      t: 'Divers Alert Network, Emergency assistance',
      u: 'https://dan.org/health-medicine/emergency-assistance/',
      p: 'S',
      what: L('Emergency line +1 919 684 9111 open 24 hours, call local emergency services first, and do not arrive unannounced at a chamber.', 'Línea de emergencia +1 919 684 9111 abierta las 24 horas, llamar primero a emergencias locales y no llegar sin avisar a una cámara.'),
    },
    cah: {
      t: 'Cahuita National Park brochure (Costa Rica Tourism Board)',
      u: 'https://visitcostarica.com/sites/default/files/legacy/pdf/3_PN%20Cahuita.pdf',
      p: 'P',
      what: L('Hours, entrances, card-only tickets at Puerto Vargas, designated swimming and snorkelling areas, no standing on coral, current warning, fishing ban on nets and spears, park office numbers.', 'Horario, entradas, tiquetes solo con tarjeta en Puerto Vargas, áreas designadas para nadar y hacer snorkel, no pararse en el coral, aviso de corrientes, prohibición de redes y arpones, teléfonos de la oficina del parque.'),
    },
    gman: {
      t: 'Gandoca-Manzanillo Wildlife Refuge brochure (Costa Rica Tourism Board)',
      u: 'https://www.visitcostarica.com/sites/default/files/legacy/pdf/10_PN%20Gandoca%20Manzanillo.pdf',
      p: 'P',
      what: L('Snorkelling and diving listed, no standing on coral, do not disturb animals, surface gear only in water under 1 m, hook and line fishing only, no collecting, no jet skis from Punta Cocles to Punta Mona.', 'Snorkel y buceo incluidos, no pararse en el coral, no molestar a los animales, solo equipo de superficie en agua de menos de 1 m, solo pesca con cuerda y anzuelo, no recolectar, sin motos acuáticas de Punta Cocles a Punta Mona.'),
    },
    gvc: {
      t: 'Visit Costa Rica, Gandoca-Manzanillo Wildlife Refuge',
      u: 'https://visitcostarica.com/where-to-go/protected-areas/gandoca-manzanillo-natural-wildlife-refuge',
      p: 'S',
      what: L('Hours 08:00 to 16:00 in both sectors, entry free, refuge phone number.', 'Horario de 08:00 a 16:00 en ambos sectores, entrada gratis, teléfono del refugio.'),
    },
  },
};
