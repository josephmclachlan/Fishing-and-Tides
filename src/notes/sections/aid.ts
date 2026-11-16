import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** First aid by what you see or feel. Steps aggregate the species firstAid text in public/data/guide/sp so the two never disagree. */
export const aid: Section = {
  id: 'aid',
  title: L('First aid', 'Primeros auxilios'),
  lede: L(
    'Stung or bitten and not sure by what? Find what you see or feel, then follow the steps. Each entry says what to do first, what not to do, and when to call 911.',
    '¿Lo picó o lo mordió algo y no sabe qué fue? Busque lo que ve o siente y siga los pasos. Cada entrada dice qué hacer primero, qué no hacer y cuándo llamar al 911.',
  ),
  blocks: [
    // Emergency numbers
    {
      k: 'calls',
      items: [
        { n: '911', tel: '911', h: L('Ambulance, Red Cross, coast guard', 'Ambulancia, Cruz Roja, guardacostas'), t: L('Call 911 first.', 'Llame primero al 911.') },
        { n: '800-4686-9422', tel: '80046869422', h: L('Poison centre', 'Centro de intoxicaciones'), t: L('800-INTOXICA. Centro Nacional de Control de Intoxicaciones, free, 24 hours.', '800-INTOXICA. Centro Nacional de Control de Intoxicaciones, gratis, las 24 horas.') },
        { n: '4003-8250', tel: '+50640038250', h: L('Talamanca health area (CCSS)', 'Área de Salud de Talamanca (CCSS)'), t: L('Hone Creek.', 'Hone Creek.') },
        { n: 'LIMÓN', h: L('Hospital Dr. Tony Facio Castro', 'Hospital Dr. Tony Facio Castro'), t: L('In Limón, the region\'s hospital.', 'En Limón, el hospital de la región.') },
      ],
    },
    // 911 now
    {
      k: 'flow',
      alert: true,
      h: L('Any sting or bite: first', 'Cualquier picadura o mordedura: primero'),
      steps: [
        { ico: 'swim', h: L('Get out of the water', 'Salga del agua'), t: L('Then stay calm.', 'Luego mantenga la calma.') },
        { ico: 'phone', tone: 'stop', h: L('Call 911 at once for any red flag below', 'Llame al 911 de inmediato si hay alguna señal roja') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'breath', tone: 'stop', h: L('Trouble breathing', 'Dificultad para respirar') },
        { ico: 'heart', tone: 'stop', h: L('Chest pain', 'Dolor en el pecho') },
        { ico: 'faint', tone: 'stop', h: L('Fainting', 'Desmayo') },
        { ico: 'rash', tone: 'stop', h: L('A sting over a large area', 'Picadura en un área grande') },
        { ico: 'eye', tone: 'stop', h: L('A sting on the face or eyes', 'Picadura en la cara o los ojos') },
      ],
    },
    {
      k: 'index',
      h: L('What hurt you? Tap to jump to it', '¿Qué le hizo daño? Toque para ir'),
      items: [
        { id: 'welts', an: 'jelly', t: L('Jellyfish or a rash', 'Medusa o sarpullido') },
        { id: 'spines', an: 'urchin', t: L('Spines: urchin, lionfish', 'Espinas: erizo, pez león') },
        { id: 'ray', an: 'stingray', t: L('Stingray', 'Raya') },
        { id: 'cone', an: 'cone', t: L('Cone shell', 'Caracol cono') },
        { id: 'bite', an: 'shark', t: L('A bite', 'Una mordedura') },
        { id: 'cut', an: 'coral', t: L('Coral or oyster cut', 'Corte de coral u ostra') },
        { id: 'sponge', an: 'sponge', t: L('Sponge itch', 'Comezón de esponja') },
        { id: 'fish', an: 'plate', t: L('Sick after eating fish', 'Mal después de comer pescado') },
      ],
    },
    {
      k: 'p',
      t: L(
        'The steps in this tab match the first aid text in the species guide.{nhs}',
        'Los pasos de esta pestaña coinciden con el texto de primeros auxilios de la guía de especies.{nhs}',
      ),
    },
    // Vinegar or seawater
    { k: 'h', t: L('Vinegar or seawater?', '¿Vinagre o agua de mar?') },
    {
      k: 'tiles',
      items: [
        { ico: 'seawater', tone: 'go', h: L('Jellyfish, fire coral, sea lice: seawater', 'Medusa, coral de fuego, piojo de mar: agua de mar'), t: L('Rinse these stings with seawater and do not rub. If you do not know what stung you, do the same.', 'Enjuague estas picaduras con agua de mar y no frote. Si no sabe qué lo picó, haga lo mismo.') },
        { ico: 'notap', tone: 'stop', h: L('Jellyfish: no fresh water', 'Medusa: sin agua dulce'), t: L('Fresh water may make the stinging cells left on the skin fire again. For spines, cuts and cone shells, clean fresh water is fine.{jf}{nhs}', 'El agua dulce puede hacer que las células urticantes que quedan en la piel vuelvan a disparar. Para espinas, cortes y conos, el agua dulce limpia está bien.{jf}{nhs}') },
        { ico: 'nodrop', tone: 'stop', h: L('Urine: no', 'Orina: no'), t: L('Do not use urine.{nhs}', 'No use orina.{nhs}') },
        { ico: 'nobottle', tone: 'stop', h: L('Alcohol: never', 'Alcohol: nunca') },
        { ico: 'nosand', tone: 'stop', h: L('Sand: never', 'Arena: nunca') },
        { ico: 'jelly', tone: 'warn', h: L('Portuguese man o\' war (agua mala)', 'Fragata portuguesa (agua mala)'), t: L('Rinse with seawater. Do not rely on vinegar.', 'Enjuague con agua de mar. No cuente con el vinagre.') },
        { ico: 'bottle', tone: 'unk', h: L('Vinegar: Not confirmed', 'Vinagre: No confirmado'), t: L('Household vinegar, about 5 percent acetic acid, is often used for box jellyfish and fire coral. The evidence is weak and mixed: it eased pain in some studies, gave worse pain than no treatment in others, and made stinging cells fire in a study of a sea anemone.{jf}{hwi}', 'El vinagre de cocina, con cerca de 5 por ciento de ácido acético, se usa a menudo para medusas cubo y coral de fuego. La evidencia es débil y mixta: alivió el dolor en algunos estudios, dio más dolor que no hacer nada en otros, e hizo disparar las células urticantes en un estudio de una anémona de mar.{jf}{hwi}') },
      ],
    },
    // Hot water soak, used below
    { k: 'h', t: L('The hot-water soak', 'El remojo en agua caliente') },
    {
      k: 'fig',
      fig: 'soak',
      label: L('A foot soaking in a bucket of hot water, a hand testing the water first, and a thermometer showing 40 to 45 degrees Celsius', 'Un pie remojándose en un balde de agua caliente, una mano que prueba el agua primero, y un termómetro que marca de 40 a 45 grados Celsius'),
      tones: ['warn', 'go', 'info'],
      marks: [
        L('Test the water with your own healthy hand first, because an injured limb may be numb. If your hand cannot stay in it, it is too hot.{nhs}{hwi}', 'Pruebe antes el agua con su propia mano sana, porque un miembro herido puede estar dormido. Si su mano no aguanta adentro, está demasiado caliente.{nhs}{hwi}'),
        L('Hot but not scalding, 40 to 45 °C and no hotter. Burns have happened.{hwi}', 'Caliente pero sin quemar, de 40 a 45 °C y no más. Ha habido quemaduras.{hwi}'),
        L('Keep the limb in for the time given in each entry below.', 'Mantenga el miembro adentro el tiempo que indica cada entrada de abajo.'),
      ],
    },

    // Welts and rash
    { k: 'inc', id: 'welts', an: 'jelly', t: L('Burning welts or a rash after swimming', 'Ronchas que arden o sarpullido después de nadar') },
    {
      k: 'animals',
      items: [
        { an: 'jelly', h: L('Jellyfish', 'Medusa') },
        { an: 'manowar', h: L('Portuguese man o\' war', 'Fragata portuguesa'), t: L('A blue float with very long tentacles.', 'Un flotador azul con tentáculos muy largos.') },
        { an: 'firecoral', h: L('Fire coral', 'Coral de fuego'), t: L('Mustard-yellow blades that look like coral.', 'Láminas amarillo mostaza que parecen coral.') },
        { an: 'sealice', h: L('Sea lice', 'Pulgas de mar'), t: L('Thimble jellyfish larvae. An itchy rash under swimsuits.', 'Larvas de medusa dedal. Sarpullido con comezón bajo el traje de baño.') },
      ],
    },
    {
      k: 'flow',
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'tweezers', h: L('Lift off tentacles', 'Quite los tentáculos'), t: L('Use tweezers or a gloved hand, without rubbing.', 'Con pinzas o con un guante, sin frotar.') },
        { ico: 'seawater', h: L('Rinse with seawater', 'Enjuague con agua de mar'), t: L('Vinegar may be tried for fire coral and box jellyfish, but the evidence is weak.', 'El vinagre puede probarse con coral de fuego y medusa cubo, pero la evidencia es débil.') },
        { ico: 'hotwater', tone: 'warn', h: L('Test the water', 'Pruebe el agua'), t: L('With your own hand first.', 'Primero con su propia mano.') },
        { ico: 'thermo', tone: 'go', h: L('Soak 20 to 45 min', 'Remoje de 20 a 45 min'), t: L('Hot but not scalding, 40 to 45 °C and no hotter.{hwi}{jf}', 'Caliente pero sin quemar, de 40 a 45 °C y no más.{hwi}{jf}') },
      ],
    },
    {
      k: 'flow',
      h: L('Sea lice: itchy rash under the swimsuit', 'Pulgas de mar: comezón bajo el traje de baño'),
      steps: [
        { ico: 'swim', h: L('Leave the water', 'Salga del agua') },
        { ico: 'trunks', h: L('Swimsuit off first', 'Primero quítese el traje'), t: L('Take it off before showering.', 'Quíteselo antes de ducharse.') },
        { ico: 'shower', h: L('Rinse, then shower', 'Enjuague y dúchese'), t: L('Rinse with seawater or vinegar, then shower with fresh water.', 'Enjuague con agua de mar o vinagre y luego dúchese con agua dulce.') },
        { ico: 'hotwater', h: L('Wash the swimsuit', 'Lave el traje'), t: L('In hot water with detergent before wearing it again.', 'En agua caliente con detergente antes de volver a usarlo.') },
        { ico: 'cream', h: L('Ease the itch', 'Alivie la comezón'), t: L('Hydrocortisone cream and an antihistamine.', 'Crema de hidrocortisona y un antihistamínico.') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'notouch', tone: 'stop', h: L('Do not rub the skin', 'No frote la piel') },
        { ico: 'nosand', tone: 'stop', h: L('Do not scrape with sand', 'No raspe con arena') },
        { ico: 'notap', tone: 'stop', h: L('Do not rinse with fresh water first', 'No enjuague primero con agua dulce'), t: L('It may make stinging cells fire.{jf}', 'Puede hacer que las células urticantes disparen.{jf}') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'phone', tone: 'stop', h: L('Call 911', 'Llame al 911'), t: L('Trouble breathing, chest pain, fainting, a large stung area, a sting on the face or eyes, or any large box jellyfish sting.', 'Dificultad para respirar, dolor en el pecho, desmayo, un área grande picada, picadura en la cara o los ojos, o cualquier picadura de medusa cubo grande.') },
        { ico: 'hospital', tone: 'warn', h: L('See a doctor', 'Vea a un médico'), t: L('Fever, blisters, a rash that spreads, or a stung child.', 'Fiebre, ampollas, sarpullido que se extiende o si picó a un niño.') },
      ],
    },

    // Spines
    { k: 'inc', id: 'spines', an: 'urchin', t: L('A puncture with spines', 'Una punción con espinas') },
    {
      k: 'animals',
      items: [
        { an: 'urchin', h: L('Sea urchin', 'Erizo de mar') },
        { an: 'lionfish', h: L('Lionfish', 'Pez león') },
        { an: 'scorpion', h: L('Scorpionfish', 'Pez escorpión'), t: L('Blotchy, sits still on rock.', 'Manchado, quieto sobre la roca.') },
        { an: 'catfish', h: L('Catfish spine', 'Espina de bagre') },
      ],
    },
    {
      k: 'flow',
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'tweezers', h: L('Pull out spines', 'Saque las espinas'), t: L('Pull out the ones you can see, with tweezers.{nhs}', 'Saque con pinzas las que se vean.{nhs}') },
        { ico: 'soap', h: L('Wash the wound', 'Lave la herida'), t: L('With soap and clean water.', 'Con jabón y agua limpia.') },
        { ico: 'thermo', tone: 'go', h: L('Soak 30 to 90 min', 'Remoje de 30 a 90 min'), t: L('As hot as the person can stand without scalding, no more than 45 °C. At least 30 minutes, and up to 90 if the pain returns when it cools.{nhs}{hwi} Hot water eased the pain in most sea urchin cases in one review.{hwi}', 'Tan caliente como la persona aguante sin quemarse, no más de 45 °C. Al menos 30 minutos, y hasta 90 si el dolor vuelve al enfriarse.{nhs}{hwi} En una revisión, el agua caliente alivió el dolor en la mayoría de los casos de erizo de mar.{hwi}') },
        { ico: 'syringe', h: L('Check the tetanus shot', 'Revise la vacuna antitetánica'), t: L('Make sure it is current.', 'Que esté al día.') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'notouch', tone: 'stop', h: L('Do not dig or squeeze', 'No cave ni apriete') },
        { ico: 'nocut', tone: 'stop', h: L('Do not cut', 'No corte') },
        { ico: 'nomouth', tone: 'stop', h: L('Do not suck', 'No chupe') },
        { ico: 'notie', tone: 'stop', h: L('Do not tie the wound', 'No amarre la herida') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'phone', tone: 'stop', h: L('Call 911', 'Llame al 911'), t: L('Fainting, trouble breathing or chest pain.', 'Desmayo, dificultad para respirar o dolor en el pecho.') },
        { ico: 'hospital', tone: 'warn', h: L('See a doctor', 'Vea a un médico'), t: L('Spines in a joint, the palm or the sole of the foot, deep punctures, or later swelling, redness or fever.', 'Espinas en una articulación, la palma o la planta del pie, punciones profundas, o después hinchazón, enrojecimiento o fiebre.') },
      ],
    },

    // Stingray
    { k: 'inc', id: 'ray', an: 'stingray', t: L('A stingray wound', 'Una herida de raya') },
    {
      k: 'flow',
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'stingray', h: L('Calm, out of the water', 'Calma y fuera del agua'), t: L('Keep the person calm and out of the water.', 'Mantenga calmada a la persona y fuera del agua.') },
        { ico: 'bandage', h: L('Rinse and press', 'Enjuague y presione'), t: L('Rinse with clean water and press gently to control bleeding.', 'Enjuague con agua limpia y presione con suavidad para controlar el sangrado.') },
        { ico: 'hotwater', tone: 'warn', h: L('Test the water', 'Pruebe el agua'), t: L('With your own hand, because the injured limb may be numb.{nhs}{hwi}', 'Con su propia mano, porque el miembro herido puede estar dormido.{nhs}{hwi}') },
        { ico: 'thermo', tone: 'go', h: L('Soak 30 to 90 min', 'Remoje de 30 a 90 min'), t: L('40 to 45 °C, at least 30 minutes and up to 90. Warm but not scalding, because burns have happened.{hwi}', 'De 40 a 45 °C, al menos 30 minutos y hasta 90. Caliente pero sin quemar, porque ha habido quemaduras.{hwi}') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'notouch', tone: 'stop', h: L('Do not pull out a deep spine', 'No saque una espina profunda'), t: L('A spine deep in the chest, belly or neck: hold it in place and call 911.', 'Una espina clavada profundo en el pecho, el abdomen o el cuello: déjela en su lugar y llame al 911.') },
        { ico: 'nocut', tone: 'stop', h: L('Do not cut the wound open', 'No abra la herida con un corte') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'hospital', tone: 'warn', h: L('Doctor the same day', 'Médico el mismo día'), t: L('Every stingray wound needs one: spine pieces can stay in the wound, infection is common and a tetanus shot may be needed.', 'Toda herida de raya necesita uno: pueden quedar pedazos de espina, la infección es común y puede hacer falta la vacuna antitetánica.') },
        { ico: 'phone', tone: 'stop', h: L('Call 911', 'Llame al 911'), t: L('A wound to the chest, belly, head or neck, heavy bleeding, fainting or trouble breathing.', 'Herida en el pecho, el abdomen, la cabeza o el cuello, sangrado abundante, desmayo o dificultad para respirar.') },
      ],
    },

    // Cone shell
    { k: 'inc', id: 'cone', an: 'cone', t: L('A cone shell sting', 'Una picadura de caracol cono') },
    {
      k: 'tiles',
      items: [
        { ico: 'cone', tone: 'stop', h: L('An emergency', 'Una emergencia'), t: L('The venom affects the nervous system and can cause paralysis, which may lead to breathing failure and death. The sting itself may hurt only a little, so do not wait.{dan}', 'El veneno afecta el sistema nervioso y puede causar parálisis, que puede llevar a falla respiratoria y muerte. La picadura en sí puede doler poco, así que no espere.{dan}') },
        { ico: 'nosyringe', tone: 'stop', h: L('No antivenom', 'No hay antiveneno'), t: L('There is no antivenom, so the hospital keeps the person breathing until the venom wears off.{dan}', 'No existe antiveneno, así que el hospital mantiene respirando a la persona hasta que pase el efecto del veneno.{dan}') },
      ],
    },
    {
      k: 'flow',
      alert: true,
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'phone', tone: 'stop', h: L('Call 911 now', 'Llame al 911 ya'), t: L('Do not wait for symptoms.{dan}', 'No espere síntomas.{dan}') },
        { ico: 'eye', h: L('Keep still, watch', 'Quieto y vigilado'), t: L('Keep the person still and watched.', 'Mantenga a la persona quieta y vigilada.') },
        { ico: 'tap', h: L('Wash with fresh water', 'Lave con agua dulce'), t: L('Wash the wound.', 'Lave la herida.') },
        { ico: 'bandage', h: L('Bandage and keep still', 'Vende y no mueva'), t: L('A firm bandage over the sting and along the whole limb, then a splint so the limb cannot move. Not a tourniquet.{dan}{pit}', 'Un vendaje firme sobre la picadura y a lo largo de todo el miembro, y luego una tablilla para que no se mueva. No un torniquete.{dan}{pit}') },
        { ico: 'breath', h: L('Breathing stops?', '¿Se detiene la respiración?'), t: L('Give rescue breaths until help arrives.{dan}', 'Dé respiración de rescate hasta que llegue ayuda.{dan}') },
      ],
    },
    {
      k: 'fig',
      fig: 'wrap',
      label: L('An arm with a firm bandage from the fingers up past the sting, and a splint to keep it still', 'Un brazo con un vendaje firme desde los dedos hasta más arriba de la picadura, y una tablilla para que no se mueva'),
      tones: ['stop', 'go', 'go', 'warn'],
      marks: [
        L('The sting site, under the bandage.', 'El sitio de la picadura, bajo el vendaje.'),
        L('Bandage firmly over the sting, then wrap a second bandage from just above the fingers up the arm as far as it goes. Not a tourniquet.{dan}{pit}', 'Vende firme sobre la picadura, y luego envuelva un segundo vendaje desde justo arriba de los dedos, subiendo por el brazo hasta donde alcance. No un torniquete.{dan}{pit}'),
        L('Tie a splint, such as a board or a stick, along the limb so it cannot move, and keep the person still.{pit}', 'Amarre una tablilla, como una tabla o un palo, a lo largo del miembro para que no se mueva, y mantenga quieta a la persona.{pit}'),
        L('Firm, but not so tight that the fingers go numb, tingle or change colour. Squeeze a fingertip: the colour should come back within 2 seconds.{pit}', 'Firme, pero no tanto que los dedos se duerman, hormigueen o cambien de color. Apriete la punta de un dedo: el color debe volver en 2 segundos.{pit}'),
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'nowait', tone: 'stop', h: L('Do not wait to see if it passes', 'No espere a ver si se pasa') },
        { ico: 'nocut', tone: 'stop', h: L('Do not cut the wound', 'No corte la herida') },
        { ico: 'nomouth', tone: 'stop', h: L('Do not suck the wound', 'No chupe la herida') },
        { ico: 'notie', tone: 'stop', h: L('No tourniquet', 'Sin torniquete'), t: L('Use a pressure bandage.{dan}', 'Use un vendaje de presión.{dan}') },
        { ico: 'notouch', tone: 'stop', h: L('Never pick up a cone shell', 'Nunca levante un caracol cono'), t: L('Even one that looks empty.{dan}', 'Aunque parezca vacío.{dan}') },
      ],
    },

    // Bite
    { k: 'inc', id: 'bite', an: 'shark', t: L('A bite', 'Una mordedura') },
    {
      k: 'animals',
      items: [
        { an: 'moray', h: L('Moray eel', 'Morena') },
        { an: 'barracuda', h: L('Barracuda', 'Barracuda') },
        { an: 'shark', h: L('Shark', 'Tiburón'), t: L('See the shark bite steps below.', 'Vea abajo los pasos para mordedura de tiburón.') },
        { an: 'crab', h: L('Crab', 'Cangrejo'), t: L('Let go of the animal and clean the skin with soap and water.', 'Suelte al animal y limpie la piel con agua y jabón.') },
      ],
    },
    {
      k: 'flow',
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'bandage', h: L('Press firmly', 'Presione firme'), t: L('Use a clean cloth to stop the bleeding.', 'Con una tela limpia para detener el sangrado.') },
        { ico: 'soap', h: L('Wash it well', 'Lávela bien'), t: L('With clean water and soap.', 'Con agua limpia y jabón.') },
        { ico: 'bandage', h: L('Cover it', 'Cúbrala') },
      ],
    },
    {
      k: 'flow',
      alert: true,
      h: L('Shark bite', 'Mordedura de tiburón'),
      steps: [
        { ico: 'phone', tone: 'stop', h: L('Call 911', 'Llame al 911'), t: L('Or send someone to call while you help.', 'O mande a alguien a llamar mientras usted ayuda.') },
        { ico: 'swim', h: L('Everyone out of the water', 'Todos fuera del agua') },
        { ico: 'bandage', tone: 'stop', h: L('Press hard on the wound', 'Presione fuerte la herida'), t: L('Push a cloth or towel hard onto the bleeding and do not let go.', 'Apriete con fuerza una tela o toalla sobre el sangrado y no la suelte.') },
        { ico: 'band', h: L('Still bleeding from an arm or leg?', '¿Sigue sangrando un brazo o pierna?'), t: L('Tie a tourniquet (a tight band) a hand width above the wound.', 'Ponga un torniquete (una banda bien apretada) un palmo arriba de la herida.') },
        { ico: 'faint', h: L('Lay flat, keep warm', 'Acueste y abrigue'), t: L('Lay the person flat and keep them warm until help comes.', 'Acueste a la persona y manténgala abrigada hasta que llegue ayuda.') },
        { ico: 'hospital', tone: 'stop', h: L('Hospital for every bite', 'Hospital para toda mordedura'), t: L('Even a small shark bite needs hospital care.', 'Aun una mordedura pequeña de tiburón necesita hospital.') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'notouch', tone: 'stop', h: L('Do not pull out teeth or large objects', 'No saque dientes rotos ni objetos grandes') },
        { ico: 'nocut', tone: 'stop', h: L('Do not close the wound yourself', 'No intente cerrar la herida usted mismo') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'phone', tone: 'stop', h: L('Call 911', 'Llame al 911'), t: L('Heavy bleeding, any shark bite, or a wound to the chest, neck or belly.', 'Sangrado abundante, cualquier mordedura de tiburón, o una herida en el pecho, el cuello o el abdomen.') },
        { ico: 'hospital', tone: 'warn', h: L('See a doctor', 'Vea a un médico'), t: L('A deep cut. Fish bites get infected easily.', 'Un corte profundo. Las heridas de pescado se infectan con facilidad.') },
      ],
    },

    // Coral / oyster
    { k: 'inc', id: 'cut', an: 'coral', t: L('A scrape or cut from coral or oyster', 'Un raspón o corte de coral u ostra') },
    {
      k: 'animals',
      items: [
        { an: 'coral', h: L('Coral', 'Coral') },
        { an: 'oyster', h: L('Oyster', 'Ostra') },
      ],
    },
    {
      k: 'flow',
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'tap', h: L('Rinse', 'Enjuague'), t: L('With clean water.', 'Con agua limpia.') },
        { ico: 'bandage', h: L('Press', 'Presione'), t: L('To stop the bleeding.', 'Para detener el sangrado.') },
        { ico: 'soap', h: L('Wash', 'Lave'), t: L('With soap and water.', 'Con jabón y agua.') },
        { ico: 'bandage', h: L('Cover', 'Cubra'), t: L('Coral and oyster cuts get infected easily, so clean them well and watch them for several days.', 'Los cortes de coral y ostra se infectan con facilidad, así que límpielos bien y obsérvelos varios días.') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'nosand', tone: 'stop', h: L('Do not leave grit in the cut', 'No deje arenilla en el corte') },
        { ico: 'warn', tone: 'stop', h: L('Do not ignore later signs', 'No ignore lo que aparece después'), t: L('Redness, swelling or fever that starts later.', 'Enrojecimiento, hinchazón o fiebre que empiezan después.') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'hospital', tone: 'warn', h: L('See a doctor', 'Vea a un médico'), t: L('The cut is deep, swells, turns red or you have a fever.', 'El corte es profundo, se hincha, se enrojece o hay fiebre.') },
        { ico: 'phone', tone: 'stop', h: L('Call 911', 'Llame al 911'), t: L('Serious bleeding.', 'Sangrado grave.') },
      ],
    },

    // Sponge itch
    { k: 'inc', id: 'sponge', an: 'sponge', t: L('Sponge itch', 'Comezón de esponja') },
    {
      k: 'flow',
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'notouch', tone: 'stop', h: L('Do not rub', 'No frote') },
        { ico: 'tape', h: L('Lift with tape', 'Saque con cinta'), t: L('Press adhesive tape on the skin and lift it off to pull out the tiny spicules (glass-like needles).', 'Pegue y despegue cinta adhesiva sobre la piel para sacar las espículas (agujas diminutas como de vidrio).') },
        { ico: 'bottle', h: L('Vinegar, then fresh water', 'Vinagre y luego agua dulce'), t: L('Rinse with vinegar, then with fresh water.', 'Enjuague con vinagre y luego con agua dulce.') },
        { ico: 'cream', h: L('Itch cream', 'Crema para la comezón'), t: L('Hydrocortisone cream helps if you have it.', 'La crema de hidrocortisona ayuda si la tiene.') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'notouch', tone: 'stop', h: L('Do not scratch', 'No se rasque') },
        { ico: 'notap', tone: 'stop', h: L('No fresh water before the spicules are out', 'Sin agua dulce antes de sacar las espículas') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'hospital', tone: 'warn', h: L('Doctor the same day', 'Médico el mismo día'), t: L('Strong pain, or blisters, spreading swelling, fever or joint pain.', 'Dolor fuerte, o ampollas, hinchazón que se extiende, fiebre o dolor en una articulación.') },
        { ico: 'phone', tone: 'stop', h: L('Call 911', 'Llame al 911'), t: L('In an emergency.', 'En una emergencia.') },
      ],
    },

    // Fish poisoning
    { k: 'inc', id: 'fish', an: 'plate', t: L('Nausea or tingling after eating fish', 'Náuseas u hormigueo después de comer pescado') },
    {
      k: 'tiles',
      items: [
        { ico: 'sick', h: L('Fish poisoning', 'Intoxicación por pescado'), t: L('Such as ciguatera or scombroid. See the Ciguatera page for symptoms and what to do.', 'Como ciguatera o escombroide. Vea la página de Ciguatera para los síntomas y qué hacer.') },
      ],
    },
    {
      k: 'flow',
      h: L('Do first', 'Haga primero'),
      steps: [
        { ico: 'phone', h: L('Call 911 or go to a clinic', 'Llame al 911 o vaya a una clínica'), t: L('Go to the nearest clinic and say what was eaten.', 'Vaya a la clínica más cercana y diga qué se comió.') },
        { ico: 'jar', h: L('Keep a sample', 'Guarde una muestra'), t: L('Keep a sample of the fish if you can.', 'Guarde una muestra del pescado si puede.') },
        { ico: 'phone', h: L('Poison centre', 'Centro de intoxicaciones'), t: L('You can also call 800-INTOXICA (800-4686-9422).', 'También puede llamar al 800-INTOXICA (800-4686-9422).') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'nosick', tone: 'stop', h: L('Do not induce vomiting', 'No provoque el vómito') },
        { ico: 'nobottle', tone: 'stop', h: L('Do not drink alcohol', 'No tome alcohol') },
        { ico: 'nowait', tone: 'stop', h: L('Do not wait to see if it passes', 'No espere a ver si se pasa') },
        { ico: 'noflame', tone: 'stop', h: L('Cooking does not make it safe', 'Cocinar no lo vuelve seguro'), t: L('A poisoned fish stays poisoned.', 'Un pescado envenenado sigue envenenado.') },
      ],
    },
    {
      k: 'flow',
      alert: true,
      h: L('Call 911 at once for', 'Llame de inmediato al 911 si hay'),
      steps: [
        { ico: 'tingle', tone: 'stop', h: L('Spreading numbness', 'Adormecimiento que se extiende'), t: L('Numbness or tingling that spreads.', 'Adormecimiento u hormigueo que se extiende.') },
        { ico: 'faint', tone: 'stop', h: L('Weakness', 'Debilidad') },
        { ico: 'breath', tone: 'stop', h: L('Trouble breathing', 'Dificultad para respirar') },
        { ico: 'pulse', tone: 'stop', h: L('Slow or irregular pulse', 'Pulso lento o irregular') },
      ],
    },
  ],
  sources: {
    hwi: {
      t: 'Hot-Water Immersion (HWI) or Ice-Pack Treatment (IPT) as First Aid for Human Envenomation by Marine Animals? Review of Literature, Toxins 16(6):273 (2024), open access on PubMed Central',
      u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11209160/',
      p: 'P',
      what: L('Hot water is usually 40 to 50 °C and up to 45 °C, for jellyfish about 45 minutes, warm but not scalding because burns happened; helped most urchin stings; vinegar made one anemone fire its stinging cells.', 'El agua caliente suele ser de 40 a 50 °C y hasta 45 °C, para medusas unos 45 minutos, caliente pero sin quemar porque hubo quemaduras; alivió la mayoría de las picaduras de erizo; el vinagre hizo disparar las células urticantes de una anémona.'),
    },
    jf: {
      t: 'Pek et al., First Aid Treatment of Jellyfish Stings: A Systematic Review (ILCOR), Cureus 17(5):e84289 (2025), open access on PubMed Central',
      u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12169498/',
      p: 'P',
      what: L('Seawater is the recommended rinse, fresh water may fire stinging cells, vinegar evidence is weak and mixed, heat may follow at a safe temperature; evidence overall is very low quality.', 'El agua de mar es el enjuague recomendado, el agua dulce puede disparar las células urticantes, la evidencia del vinagre es débil y mixta, el calor puede seguir a una temperatura segura; la evidencia en general es de muy baja calidad.'),
    },
    nhs: {
      t: 'NHS, Jellyfish and other sea creature stings',
      u: 'https://www.nhs.uk/conditions/jellyfish-and-other-sea-creature-stings/',
      p: 'P',
      what: L('Rinse with seawater not fresh water, no urine, remove spines with tweezers, soak in water as hot as can be tolerated for at least 30 minutes, call emergency for breathing trouble, chest pain or severe swelling.', 'Enjuagar con agua de mar y no agua dulce, no usar orina, sacar espinas con pinzas, remojar en agua tan caliente como se aguante por al menos 30 minutos, llamar a emergencias por dificultad para respirar, dolor de pecho o hinchazón fuerte.'),
    },
    pit: {
      t: 'St John Western Australia, Pressure immobilisation',
      u: 'https://shop.stjohnwa.com.au/pages/guide/pressure-immobilisation',
      p: 'P',
      what: L('For cone shell stings: a firm bandage over the sting, a second from the fingers or toes up the limb, a splint, keep the person still; too tight shows as numbness, tingling or colour change; colour should return to a squeezed fingertip within 2 seconds.', 'Para picaduras de cono: un vendaje firme sobre la picadura, otro desde los dedos subiendo por el miembro, una tablilla, mantener quieta a la persona; demasiado apretado se nota por adormecimiento, hormigueo o cambio de color; el color debe volver a la punta del dedo apretada en 2 segundos.'),
    },
    dan: {
      t: 'Divers Alert Network (DAN), Cone Snails',
      u: 'https://dan.org/health-medicine/health-resources/diseases-conditions/cone-snails/',
      p: 'P',
      what: L('Toxin can cause paralysis and respiratory failure, no antivenom, do not wait for symptoms, clean with fresh water, pressure immobilization bandage not a tourniquet, do not touch shells.', 'La toxina puede causar parálisis y falla respiratoria, no hay antiveneno, no esperar síntomas, limpiar con agua dulce, vendaje de inmovilización con presión y no torniquete, no tocar conchas.'),
    },
  },
};
