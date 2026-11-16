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
    'Playa Cocles has lifeguards, and Playa Cocles and Playa Negra have flags. Follow them there. Everywhere else on this coast, do not count on either: read the sea before you get in, know how to get out of a rip current, and know who to call. Divers and snorkellers will also find the score meanings and park rules further down.',
    'Playa Cocles tiene salvavidas, y Playa Cocles y Playa Negra tienen banderas. Hágales caso ahí. En el resto de esta costa no cuente con ninguno: lea el mar antes de entrar, sepa cómo salir de una corriente de resaca y sepa a quién llamar. Quienes bucean o hacen snorkel encuentran más abajo qué significan las notas y las reglas de los parques.',
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
    { k: 'h', t: L('Diving and snorkelling', 'Buceo y snorkel') },
    { k: 'h', t: L('What the scores mean', 'Qué significan las notas') },
    {
      k: 'ul',
      items: [
        L('SNORKEL judges the sea at 2 m deep, the water just under the surface where you float.', 'SNORKEL juzga el mar a 2 m de profundidad, el agua justo bajo la superficie donde usted flota.'),
        L('DIVE judges the sea at 6 m deep. It does not ask whether you breathe from a tank or hold your breath, and you cannot choose another depth. It tells you how the water is, not whether you are trained for it.', 'BUCEO juzga el mar a 6 m de profundidad. No pregunta si usted respira de un tanque o aguanta la respiración, y no se puede elegir otra profundidad. Le dice cómo está el agua, no si usted está preparado para ella.'),
        L('SPEAR is for breath-hold spearfishing and has stricter limits. Scuba tanks may not be used for spearfishing in Costa Rica, apart from lionfish tournaments approved by INCOPESCA. See the Rules tab.', 'PESCA SUBMARINA es para pesca a pulmón y tiene límites más estrictos. En Costa Rica no se pueden usar tanques para pescar con arpón, salvo en torneos de pez león autorizados por INCOPESCA. Vea la pestaña de Reglas.'),
      ],
    },
    { k: 'h', t: L('Before you go down with a tank', 'Antes de bajar con tanque') },
    {
      k: 'ul',
      items: [
        L('You need a diving certificate. A new Open Water Diver certificate from PADI is for depths down to 18 m (60 feet), diving with a certified buddy. An Advanced Open Water certificate raises that to 30 m (100 feet).{padi}', 'Necesita un certificado de buceo. Un certificado nuevo de Open Water de PADI es para profundidades de hasta 18 m (60 pies), buceando con un compañero certificado. Un certificado Advanced Open Water lo sube a 30 m (100 pies).{padi}'),
        L('To take a course you must be able to swim: PADI asks for a 200 m swim and 10 minutes floating or treading water.{padi}', 'Para tomar un curso debe saber nadar: PADI pide 200 m de nado y 10 minutos flotando o braceando.{padi}'),
        L('If you are not certified, a try-dive with an instructor is the way to go. Which dive shops run trips here is Not confirmed, so ask in town.', 'Si no está certificado, lo adecuado es un bautizo de buceo con instructor. Qué tiendas de buceo ofrecen salidas aquí es No confirmado, así que pregunte en el pueblo.'),
        L('Staying inside the no-decompression limit lowers the risk of decompression illness, the bends, but does not remove it, so dive shallower and shorter than your computer allows when you can.{dan}', 'Mantenerse dentro del límite sin descompresión baja el riesgo de la enfermedad por descompresión, que se conoce como “el mal de los buzos”, pero no lo elimina. Si puede, bucee menos profundo y menos tiempo de lo que permite su computadora.{dan}'),
        L('After diving, wait before you fly: at least 12 hours after a single dive and at least 18 hours after several dives or several days of diving.{fly}', 'Después de bucear, espere antes de volar: al menos 12 horas tras una sola inmersión y al menos 18 horas tras varias inmersiones o varios días de buceo.{fly}'),
      ],
    },
    { k: 'h', t: L('If something goes wrong', 'Si algo sale mal') },
    {
      k: 'ul',
      items: [
        L('Call 911 first. For any symptoms after diving, such as strange tiredness, joint pain, numbness or trouble with balance, call local emergency services or get to the nearest emergency room, then call the Divers Alert Network emergency line, which is staffed 24 hours: +1 919 684 9111.{danhelp}', 'Llame primero al 911. Ante cualquier síntoma después de bucear, como cansancio raro, dolor en las articulaciones, adormecimiento o problemas de equilibrio, llame a emergencias locales o llegue a la sala de emergencias más cercana, y luego llame a la línea de emergencia de Divers Alert Network, atendida las 24 horas: +1 919 684 9111.{danhelp}'),
        L('Do not turn up unannounced at a recompression chamber. Not every chamber can treat every case, so let the doctors or DAN decide where you go.{danhelp}', 'No llegue sin avisar a una cámara de recompresión. No todas las cámaras pueden tratar todos los casos, así que deje que los médicos o DAN decidan adónde ir.{danhelp}'),
        L('The nearest recompression chamber to this coast is Not confirmed. Ask the dive shop you go with where they would take you, before you dive.', 'La cámara de recompresión más cercana a esta costa es No confirmada. Pregunte a la tienda de buceo con la que va adónde lo llevarían, antes de bucear.'),
        L('The First aid tab has the hospital in Limón and the other local numbers.', 'La pestaña de Primeros auxilios trae el hospital de Limón y los otros números locales.'),
      ],
    },
    {
      k: 'warn',
      h: L('Not confirmed', 'No confirmado'),
      t: L(
        'Park rules are printed in the parks’ own brochures, which can be out of date, and the app has no live feed for them. Where a line says Not confirmed, we could not check it. Call the park office before you go and follow the signs on the day.',
        'Las reglas de los parques están en los folletos de los propios parques, que pueden estar desactualizados, y la app no tiene un dato en vivo para ellas. Donde una línea dice No confirmado, no pudimos revisarla. Llame a la oficina del parque antes de ir y siga las señales ese día.',
      ),
    },
    { k: 'h', t: L('Cahuita National Park', 'Parque Nacional Cahuita') },
    {
      k: 'p',
      t: L(
        'Cahuita National Park was created to protect the most important coral reef in the country: about 600 hectares of reef inside a marine area of 22,400 hectares.{cah} What its own brochure says:',
        'El Parque Nacional Cahuita se creó para proteger el arrecife de coral más importante del país: unas 600 hectáreas de arrecife dentro de un área marina de 22 400 hectáreas.{cah} Lo que dice su propio folleto:',
      ),
    },
    {
      k: 'table',
      head: [L('Topic', 'Tema'), L('What it says', 'Qué dice')],
      rows: [
        [L('Hours', 'Horario'), L('Every day, 08:00 to 16:00, all year. Respect the hours.{cah}', 'Todos los días, de 08:00 a 16:00, todo el año. Respete el horario.{cah}')],
        [L('How to get in', 'Cómo entrar'), L('The official entrances are Puerto Vargas and the village of Cahuita (Playa Blanca), and both have an information post.{cah}', 'Las entradas oficiales son Puerto Vargas y el pueblo de Cahuita (Playa Blanca), y ambas tienen un puesto de información.{cah}')],
        [L('Paying', 'Pago'), L('At Puerto Vargas the ticket is bought at the gate with a credit or debit card only, with no cash and no booking needed. The other sector is entered by a voluntary donation.{cah} The brochure gives no price, so the price is Not confirmed.', 'En Puerto Vargas el tiquete se compra en la entrada solo con tarjeta de crédito o débito, sin efectivo y sin reserva. El otro sector se entra con una donación voluntaria.{cah} El folleto no da el precio, así que el precio es No confirmado.')],
        [L('Where you may swim and snorkel', 'Dónde se puede nadar y hacer snorkel'), L('Swimming and snorkelling are only allowed in the areas the park marks. Do not stand on the coral or pull yourself along it, because it hurts the coral and can injure you.{cah}', 'Solo se puede nadar y hacer snorkel en las áreas que el parque señala. No se pare sobre el coral ni se arrastre por él, porque lo daña y puede lastimarlo.{cah}')],
        [L('Currents', 'Corrientes'), L('Watch out for sea currents and do not swim in areas marked dangerous.{cah}', 'Cuídese de las corrientes marinas y no nade en las áreas señaladas como peligrosas.{cah}')],
        [L('Fishing', 'Pesca'), L('Lines, trammel nets, cast nets and spear fishing are not allowed.{cah} Whether line fishing is allowed in the sea part of the park is Not confirmed: see the Rules tab.', 'No se permiten líneas, trasmallos, atarrayas ni pesca con arpón.{cah} Si se permite pescar con línea en la parte marina del parque es No confirmado: vea la pestaña de Reglas.')],
        [L('Guides', 'Guías'), L('The brochure marks a guide service but does not say that snorkelling needs a guide. Some guidebooks say a licensed guide is required and others say you can walk in. Whether a guide is required is Not confirmed.', 'El folleto marca un servicio de guías pero no dice que el snorkel requiera guía. Algunas guías turísticas dicen que se exige un guía autorizado y otras que se puede entrar caminando. Si se exige guía es No confirmado.')],
        [L('Who to ask', 'A quién preguntar'), L('Park office: +506 2755-0302 or +506 2755-0461, aclac.pncahuita@sinac.go.cr.{cah}', 'Oficina del parque: +506 2755-0302 o +506 2755-0461, aclac.pncahuita@sinac.go.cr.{cah}')],
      ],
    },
    { k: 'h', t: L('Gandoca-Manzanillo Wildlife Refuge', 'Refugio de Vida Silvestre Gandoca-Manzanillo') },
    {
      k: 'p',
      t: L(
        'The refuge has two sectors, Manzanillo and Gandoca. The visitor listing gives 08:00 to 16:00 every day for both, free entry and the refuge phone number +506 2759-0600.{gvc} The refuge brochure lists snorkelling and diving on the reef among the things to do, and sets these rules:{gman}',
        'El refugio tiene dos sectores, Manzanillo y Gandoca. El listado para visitantes da de 08:00 a 16:00 todos los días en ambos, entrada gratis y el teléfono del refugio +506 2759-0600.{gvc} El folleto del refugio incluye el snorkel y el buceo en el arrecife entre las actividades y fija estas reglas:{gman}',
      ),
    },
    {
      k: 'ul',
      items: [
        L('Do not stand on the coral or on other animals, and do not drag yourself over them while diving.{gman}', 'No se pare sobre el coral ni sobre otros animales, ni se arrastre sobre ellos al bucear.{gman}'),
        L('Do not touch, move or stress sea animals. For example, do not lift rocks, because that leaves what lives under them open to predators.{gman}', 'No toque, mueva ni estrese a los animales marinos. Por ejemplo, no levante piedras, porque eso deja expuesto a lo que vive debajo ante los depredadores.{gman}'),
        L('In water less than about 1 m (3 feet) deep, use surface snorkelling gear only.{gman}', 'En agua de menos de 1 m (3 pies) de profundidad, use solo equipo de snorkel de superficie.{gman}'),
        L('Taking fish or other sea life for collecting, aquariums or sale is prohibited, and only hook and line fishing is permitted.{gman} That wording rules out spears and nets, but the app still shows the spearfishing rule here as Not confirmed until SINAC confirms it for the marine area.', 'Se prohíbe sacar peces u otros organismos marinos para colección, acuarios o venta, y solo se permite la pesca con cuerda y anzuelo.{gman} Esa redacción excluye arpones y redes, pero la app sigue mostrando la regla de pesca submarina aquí como No confirmada hasta que SINAC la confirme para el área marina.'),
        L('Jet skis are prohibited between Punta Cocles and Punta Mona, and vehicles are not allowed on the beach.{gman}', 'Las motos acuáticas están prohibidas entre Punta Cocles y Punta Mona, y no se permiten vehículos en la playa.{gman}'),
        L('The brochure and listing do not mention a guide requirement or a diving fee. That is Not confirmed. Ask at the refuge or SINAC.', 'El folleto y el listado no mencionan una exigencia de guía ni una tarifa de buceo. Eso es No confirmado. Pregunte en el refugio o en SINAC.'),
      ],
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
