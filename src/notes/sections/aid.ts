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
    {
      k: 'aid',
      h: L('Emergency numbers', 'Números de emergencia'),
      t: L(
        'Call 911 for an ambulance, the Red Cross or the coast guard. Poison centre (Centro Nacional de Control de Intoxicaciones), free, 24 hours: 800-4686-9422 (800-INTOXICA). Hospital: Hospital Dr. Tony Facio Castro in Limón, the region\'s hospital. Talamanca health area (CCSS): Hone Creek, 4003-8250.',
        'Llame al 911 para ambulancia, Cruz Roja o guardacostas. Centro Nacional de Control de Intoxicaciones, gratis las 24 horas: 800-4686-9422 (800-INTOXICA). Hospital: Hospital Dr. Tony Facio Castro en Limón, el hospital de la región. Área de Salud de Talamanca (CCSS): Hone Creek, 4003-8250.',
      ),
    },
    {
      k: 'p',
      t: L(
        'For any sting, first get out of the water and stay calm. Call 911 at once for trouble breathing, chest pain, fainting, a sting over a large area, or a sting on the face or eyes. These steps match the first aid text in the species guide.{wem}{rc}',
        'Ante cualquier picadura, primero salga del agua y mantenga la calma. Llame de inmediato al 911 si hay dificultad para respirar, dolor en el pecho, desmayo, una picadura en un área grande o en la cara o los ojos. Estos pasos coinciden con el texto de primeros auxilios de la guía de especies.{wem}{rc}',
      ),
    },
    {
      k: 'warn',
      h: L('Vinegar or seawater?', '¿Vinagre o agua de mar?'),
      t: L(
        'It depends on the animal. Vinegar (household, 4 to 6 percent acetic acid) is for box jellyfish and fire coral, poured on for at least 30 seconds.{wem} For a Portuguese man o\' war (agua mala), do not use vinegar: rinse with seawater, because vinegar can make the stinging cells fire more.{rc} If you do not know the animal, rinse with seawater and do not rub. Never use fresh water, urine, alcohol or sand on a sting.',
        'Depende del animal. El vinagre (de cocina, con 4 a 6 por ciento de ácido acético) es para medusas cubo y coral de fuego, y se echa durante al menos 30 segundos.{wem} Con una fragata portuguesa (agua mala) no use vinagre: enjuague con agua de mar, porque el vinagre puede hacer que las células urticantes disparen más.{rc} Si no sabe qué animal fue, enjuague con agua de mar y no frote. Nunca use agua dulce, orina, alcohol ni arena en una picadura.',
      ),
    },
    { k: 'h', t: L('Burning welts or a rash after swimming', 'Ronchas que arden o sarpullido después de nadar') },
    {
      k: 'ul',
      items: [
        L('What it may be: jellyfish, a Portuguese man o\' war, fire coral, or thimble jellyfish larvae ("sea lice"), which cause an itchy rash under swimsuits.', 'Qué puede ser: medusa, fragata portuguesa, coral de fuego o larvas de medusa dedal ("pulgas de mar"), que causan un sarpullido con comezón bajo el traje de baño.'),
        L('Do first: lift off any stuck tentacles with tweezers or a gloved hand, without rubbing. Rinse with seawater (vinegar for fire coral and box jellyfish only). Then soak the area in hot water, 40 to 45 °C and no hotter, for 20 to 45 minutes. Test the water with your own hand first.{wem}', 'Haga primero: retire los tentáculos pegados con pinzas o con un guante, sin frotar. Enjuague con agua de mar (vinagre solo para coral de fuego y medusa cubo). Luego sumerja la zona en agua caliente, de 40 a 45 °C y no más, de 20 a 45 minutos. Pruebe antes el agua con su propia mano.{wem}'),
        L('For sea lice: leave the water, take the swimsuit off before showering, rinse with seawater or vinegar, then shower with fresh water. Wash the swimsuit in hot water with detergent before wearing it again. Hydrocortisone cream and an antihistamine ease the itch.', 'Para pulgas de mar: salga del agua, quítese el traje de baño antes de ducharse, enjuague con agua de mar o vinagre y luego dúchese con agua dulce. Lave el traje de baño en agua caliente con detergente antes de volver a usarlo. La crema de hidrocortisona y un antihistamínico alivian la comezón.'),
        L('Do not: rub the skin, scrape with sand, or rinse with fresh water first, because it can make stinging cells fire.', 'No haga: frotar la piel, raspar con arena ni enjuagar primero con agua dulce, porque puede hacer que las células urticantes disparen.'),
        L('Call 911 for: trouble breathing, chest pain, fainting, a large stung area, a sting on the face or eyes, or any large box jellyfish sting. See a doctor for fever, blisters, a rash that spreads, or a stung child.', 'Llame al 911 si hay: dificultad para respirar, dolor en el pecho, desmayo, un área grande picada, picadura en la cara o los ojos, o cualquier picadura de medusa cubo grande. Vea a un médico si hay fiebre, ampollas, sarpullido que se extiende o si picó a un niño.'),
      ],
    },
    { k: 'h', t: L('A puncture with spines', 'Una punción con espinas') },
    {
      k: 'ul',
      items: [
        L('What it may be: sea urchin, lionfish, scorpionfish or a catfish spine.', 'Qué puede ser: erizo de mar, pez león, pez escorpión o la espina de un bagre.'),
        L('Do first: pull out the spines you can see with tweezers, wash with soap and clean water, and soak the wound in hot water as hot as the person can stand, no more than 45 °C, for 30 to 90 minutes. This eases the pain.{wem} Check that the tetanus shot is current.', 'Haga primero: saque con pinzas las espinas que se vean, lave con jabón y agua limpia y sumerja la herida en agua caliente, tan caliente como la persona aguante y no más de 45 °C, de 30 a 90 minutos. Esto alivia el dolor.{wem} Revise que la vacuna antitetánica esté al día.'),
        L('Do not: dig, squeeze, cut, suck or tie the wound.', 'No haga: cavar, apretar, cortar, chupar ni amarrar la herida.'),
        L('Call 911 for: fainting, trouble breathing or chest pain. See a doctor for spines in a joint, the palm or the sole of the foot, deep punctures, or later swelling, redness or fever.', 'Llame al 911 si hay: desmayo, dificultad para respirar o dolor en el pecho. Vea a un médico si hay espinas en una articulación, la palma o la planta del pie, punciones profundas, o después hinchazón, enrojecimiento o fiebre.'),
      ],
    },
    { k: 'h', t: L('A stingray wound', 'Una herida de raya') },
    {
      k: 'ul',
      items: [
        L('Do first: keep the person calm and out of the water. Rinse with clean water and press gently to control bleeding. Then soak the wound in hot water, 40 to 45 °C, for 30 to 90 minutes, testing the water with your own hand because the injured limb may be numb.{wem}', 'Haga primero: mantenga calmada a la persona y fuera del agua. Enjuague con agua limpia y presione con suavidad para controlar el sangrado. Luego sumerja la herida en agua caliente, de 40 a 45 °C, de 30 a 90 minutos, probando el agua con su propia mano porque el miembro herido puede estar dormido.{wem}'),
        L('Do not: pull out a spine that is deep in the chest, belly or neck. Hold it in place and call 911. Do not cut the wound open.', 'No haga: sacar una espina clavada profundo en el pecho, el abdomen o el cuello. Déjela en su lugar y llame al 911. No abra la herida con un corte.'),
        L('Every stingray wound needs a doctor the same day, because spine pieces can stay in the wound, infection is common and a tetanus shot may be needed. Call 911 for a wound to the chest, belly, head or neck, heavy bleeding, fainting or trouble breathing.', 'Toda herida de raya necesita un médico el mismo día, porque pueden quedar pedazos de espina, la infección es común y puede hacer falta la vacuna antitetánica. Llame al 911 si la herida es en el pecho, el abdomen, la cabeza o el cuello, si sangra mucho, hay desmayo o dificultad para respirar.'),
      ],
    },
    { k: 'h', t: L('A cone shell sting', 'Una picadura de caracol cono') },
    {
      k: 'ul',
      items: [
        L('Treat any cone shell sting as an emergency. The venom can cause tingling or numbness that spreads from the sting, weakness and creeping paralysis, and breathing can fail within hours while the person stays awake. There is no antidote.{wem}', 'Trate cualquier picadura de caracol cono como una emergencia. El veneno puede causar hormigueo o adormecimiento que se extiende desde la picadura, debilidad y parálisis progresiva, y la respiración puede fallar en horas mientras la persona sigue despierta. No hay antídoto.{wem}'),
        L('Do first: call 911 at the first symptom, keep the person lying still and watched, and wash the wound. If breathing stops, give rescue breaths until help arrives.', 'Haga primero: llame al 911 ante el primer síntoma, mantenga a la persona acostada, quieta y vigilada, y lave la herida. Si la respiración se detiene, dé respiración de rescate hasta que llegue ayuda.'),
        L('Do not: wait to see if it passes, or cut or suck the wound. Never pick up a live cone shell.', 'No haga: esperar a ver si se pasa, ni cortar ni chupar la herida. Nunca levante un caracol cono vivo.'),
      ],
    },
    { k: 'h', t: L('A bite', 'Una mordedura') },
    {
      k: 'ul',
      items: [
        L('What it may be: moray eel, barracuda, shark or crab.', 'Qué puede ser: morena, barracuda, tiburón o cangrejo.'),
        L('Do first: press firmly on the wound with a clean cloth to stop the bleeding, then wash it well with clean water and soap and cover it. For a crab, let go of the animal and clean the skin with soap and water.', 'Haga primero: presione firme la herida con una tela limpia para detener el sangrado, luego lávela bien con agua limpia y jabón y cúbrala. Con un cangrejo, suelte al animal y limpie la piel con agua y jabón.'),
        L('For a shark bite: get everyone out of the water, lay the person flat and keep them warm. If a limb bleeds heavily and pressure is not enough, tie a tourniquet above the wound. Every shark bite, even a small one, needs hospital care.', 'Con una mordedura de tiburón: saque a todos del agua, acueste a la persona y manténgala abrigada. Si un miembro sangra mucho y la presión no basta, ponga un torniquete arriba de la herida. Toda mordedura de tiburón, aun pequeña, necesita hospital.'),
        L('Do not: pull out broken teeth or large objects, or try to close the wound yourself. Fish bites get infected easily, so a deep cut needs a doctor.', 'No haga: sacar dientes rotos ni objetos grandes, ni intentar cerrar la herida usted mismo. Las heridas de pescado se infectan con facilidad, así que un corte profundo necesita un médico.'),
        L('Call 911 for: heavy bleeding, any shark bite, or a wound to the chest, neck or belly.', 'Llame al 911 si hay: sangrado abundante, cualquier mordedura de tiburón, o una herida en el pecho, el cuello o el abdomen.'),
      ],
    },
    { k: 'h', t: L('A scrape or cut from coral or oyster', 'Un raspón o corte de coral u ostra') },
    {
      k: 'ul',
      items: [
        L('Do first: rinse with clean water, press to stop the bleeding, wash with soap and water, and cover. Coral and oyster cuts get infected easily, so clean them well and watch them for several days.', 'Haga primero: enjuague con agua limpia, presione para detener el sangrado, lave con jabón y agua y cubra. Los cortes de coral y ostra se infectan con facilidad, así que límpielos bien y obsérvelos varios días.'),
        L('Do not: leave grit in the cut, or ignore redness, swelling or fever that starts later.', 'No haga: dejar arenilla en el corte, ni ignorar el enrojecimiento, la hinchazón o la fiebre que empiezan después.'),
        L('See a doctor if the cut is deep, swells, turns red or you have a fever. Call 911 for serious bleeding.', 'Vea a un médico si el corte es profundo, se hincha, se enrojece o hay fiebre. Llame al 911 si el sangrado es grave.'),
      ],
    },
    { k: 'h', t: L('Sponge itch', 'Comezón de esponja') },
    {
      k: 'ul',
      items: [
        L('Do first: do not rub. Press adhesive tape on the skin and lift it off to pull out the tiny spicules (glass-like needles), rinse with vinegar, then with fresh water. Hydrocortisone cream helps if you have it.', 'Haga primero: no frote. Pegue y despegue cinta adhesiva sobre la piel para sacar las espículas (agujas diminutas como de vidrio), enjuague con vinagre y luego con agua dulce. La crema de hidrocortisona ayuda si la tiene.'),
        L('Do not: scratch, or wash with fresh water before lifting the spicules.', 'No haga: rascarse, ni lavar con agua dulce antes de sacar las espículas.'),
        L('See a doctor the same day if the pain is strong or there are blisters, spreading swelling, fever or joint pain. Call 911 in an emergency.', 'Vea a un médico el mismo día si el dolor es fuerte o hay ampollas, hinchazón que se extiende, fiebre o dolor en una articulación. Llame al 911 en una emergencia.'),
      ],
    },
    { k: 'h', t: L('Nausea or tingling after eating fish', 'Náuseas u hormigueo después de comer pescado') },
    {
      k: 'ul',
      items: [
        L('This can be fish poisoning, such as ciguatera or scombroid. See the Ciguatera page for symptoms and what to do.', 'Esto puede ser intoxicación por pescado, como ciguatera o escombroide. Vea la página de Ciguatera para los síntomas y qué hacer.'),
        L('Do first: call 911 or go to the nearest clinic and say what was eaten. Keep a sample of the fish if you can. You can also call the poison centre, 800-INTOXICA (800-4686-9422).', 'Haga primero: llame al 911 o vaya a la clínica más cercana y diga qué se comió. Guarde una muestra del pescado si puede. También puede llamar al centro de intoxicaciones, 800-INTOXICA (800-4686-9422).'),
        L('Do not: induce vomiting, drink alcohol, or wait to see if it passes. Cooking does not make a poisoned fish safe.', 'No haga: provocar el vómito, tomar alcohol ni esperar a ver si se pasa. Cocinar no vuelve seguro un pescado envenenado.'),
        L('Call 911 at once for numbness or tingling that spreads, weakness, trouble breathing or a slow or irregular pulse.', 'Llame de inmediato al 911 si el adormecimiento u hormigueo se extiende, hay debilidad, dificultad para respirar o pulso lento o irregular.'),
      ],
    },
  ],
  sources: {
    wem: {
      t: 'Wilderness Medical Society, Clinical Practice Guidelines for Treatment of Envenomation from Marine Animals, Wilderness & Environmental Medicine 26:422-429 (2015)',
      u: 'https://www.wemjournal.org/article/S1080-6032(15)00008-3/pdf',
      p: 'S',
      what: L('Hot water at about 45 °C for pain, vinegar for box jellyfish, cold pack if heat does not help (summary only).', 'Agua caliente a unos 45 °C para el dolor, vinagre para medusa cubo, compresa fría si el calor no ayuda (solo resumen).'),
    },
    rc: {
      t: 'American Red Cross Scientific Advisory Council, Scientific Review: Jellyfish Stings',
      u: 'https://www.redcross.org/content/dam/redcross/Health-Safety-Services/scientific-advisory-council/Scientific%20Advisory%20Council%20SCIENTIFIC%20REVIEW%20-%20Jellyfish%20Stings.pdf',
      p: 'S',
      what: L('Vinegar is not advised for most jellyfish and may worsen Portuguese man o\' war stings; rinse with seawater (summary only).', 'El vinagre no se aconseja para la mayoría de las medusas y puede empeorar las picaduras de fragata portuguesa; enjuague con agua de mar (solo resumen).'),
    },
  },
};
