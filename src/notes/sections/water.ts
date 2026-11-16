import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Dive and snorkel basics, plus the park and access rules for Cahuita and Gandoca-Manzanillo. */
export const water: Section = {
  id: 'water',
  title: L('Dive and snorkel', 'Buceo y snorkel'),
  lede: L(
    'What the DIVE and SNORKEL scores mean, what you need before you go down with a tank, and the park rules for the two protected areas where most of the reef is.',
    'Qué significan las notas de BUCEO y SNORKEL, lo que necesita antes de bajar con tanque y las reglas de los dos parques donde está la mayor parte del arrecife.',
  ),
  blocks: [
    {
      k: 'warn',
      h: L('Not confirmed', 'No confirmado'),
      t: L(
        'Park rules are printed in the parks’ own brochures, which can be out of date, and the app has no live feed for them. Where a line says Not confirmed, we could not check it. Call the park office before you go and follow the signs on the day.',
        'Las reglas de los parques están en los folletos de los propios parques, que pueden estar desactualizados, y la app no tiene un dato en vivo para ellas. Donde una línea dice No confirmado, no pudimos revisarla. Llame a la oficina del parque antes de ir y siga las señales ese día.',
      ),
    },
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
