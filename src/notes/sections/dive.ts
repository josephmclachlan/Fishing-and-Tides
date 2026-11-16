import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/**
 * DIVE SAFETY (split out of Water safety, 2026-11-16, so the snorkel, dive and spear field notes open on it): what the
 * SNORKEL and DIVE scores judge, what a tank dive needs, the wait before flying, what to do if a dive goes wrong, and the
 * Cahuita and Gandoca-Manzanillo park rules. Rips, shore break and emergencies stay in Water safety (water.ts).
 */
export const dive: Section = {
  id: 'dive',
  title: L('Dive safety', 'Seguridad en el buceo'),
  lede: L(
    'What the snorkel and dive scores look at, what you need before a tank dive, and the rules in the two marine parks.',
    'Qué miran las notas de snorkel y buceo, qué necesita antes de bucear con tanque y las reglas de los dos parques marinos.',
  ),
  blocks: [
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
        { ico: 'faint', h: L('Lie them down, give oxygen', 'Acuéstelo, dele oxígeno'), t: L('Keep the diver lying down. Give oxygen if the boat or dive shop has it, and water to drink if they are awake and can swallow.{dandcs}', 'Mantenga al buzo acostado. Dele oxígeno si la lancha o la tienda de buceo tiene, y agua si está despierto y puede tragar.{dandcs}') },
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
    dandcs: {
      t: 'Divers Alert Network, Treating decompression sickness (the bends)',
      u: 'https://dan.org/safety-prevention/diver-safety/divers-blog/treating-decompression-sickness-the-bends/',
      p: 'S',
      what: L('Give emergency oxygen straight away when the bends is suspected, give fluids, then contact DAN or the nearest medical facility; oxygen can make symptoms ease for a while, so the diver still needs a doctor.', 'Dar oxígeno de emergencia de inmediato si se sospecha enfermedad descompresiva, dar líquidos y luego contactar a DAN o al centro médico más cercano; el oxígeno puede aliviar los síntomas un tiempo, así que el buzo igual necesita un médico.'),
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
