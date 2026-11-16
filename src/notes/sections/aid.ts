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
        'For any sting, first get out of the water and stay calm. Call 911 at once for trouble breathing, chest pain, fainting, a sting over a large area, or a sting on the face or eyes. These steps match the first aid text in the species guide.{nhs}',
        'Ante cualquier picadura, primero salga del agua y mantenga la calma. Llame de inmediato al 911 si hay dificultad para respirar, dolor en el pecho, desmayo, una picadura en un área grande o en la cara o los ojos. Estos pasos coinciden con el texto de primeros auxilios de la guía de especies.{nhs}',
      ),
    },
    {
      k: 'warn',
      h: L('Vinegar or seawater?', '¿Vinagre o agua de mar?'),
      t: L(
        'Rinse any sting with seawater, not fresh water, because fresh water may make the stinging cells fire.{jf}{nhs} Do not use urine.{nhs} Vinegar (household, about 5 percent acetic acid) is often used for box jellyfish and fire coral, but the evidence is weak and mixed: it eased pain in some studies, gave worse pain than no treatment in others, and made stinging cells fire in a study of a sea anemone.{jf}{hwi} For a Portuguese man o\' war (agua mala), rinse with seawater and do not rely on vinegar. If you do not know the animal, rinse with seawater and do not rub. Never use alcohol or sand on a sting.',
        'Enjuague cualquier picadura con agua de mar, no con agua dulce, porque el agua dulce puede hacer que las células urticantes disparen.{jf}{nhs} No use orina.{nhs} El vinagre (de cocina, con cerca de 5 por ciento de ácido acético) se usa a menudo para medusas cubo y coral de fuego, pero la evidencia es débil y mixta: alivió el dolor en algunos estudios, dio más dolor que no hacer nada en otros, e hizo disparar las células urticantes en un estudio de una anémona de mar.{jf}{hwi} Con una fragata portuguesa (agua mala), enjuague con agua de mar y no cuente con el vinagre. Si no sabe qué animal fue, enjuague con agua de mar y no frote. Nunca use alcohol ni arena en una picadura.',
      ),
    },
    { k: 'h', t: L('Burning welts or a rash after swimming', 'Ronchas que arden o sarpullido después de nadar') },
    {
      k: 'ul',
      items: [
        L('What it may be: jellyfish, a Portuguese man o\' war, fire coral, or thimble jellyfish larvae ("sea lice"), which cause an itchy rash under swimsuits.', 'Qué puede ser: medusa, fragata portuguesa, coral de fuego o larvas de medusa dedal ("pulgas de mar"), que causan un sarpullido con comezón bajo el traje de baño.'),
        L('Do first: lift off any stuck tentacles with tweezers or a gloved hand, without rubbing. Rinse with seawater (vinegar may be tried for fire coral and box jellyfish, but the evidence is weak). Then soak the area in hot but not scalding water, 40 to 45 °C and no hotter, for 20 to 45 minutes.{hwi}{jf} Test the water with your own hand first.', 'Haga primero: retire los tentáculos pegados con pinzas o con un guante, sin frotar. Enjuague con agua de mar (el vinagre puede probarse con coral de fuego y medusa cubo, pero la evidencia es débil). Luego sumerja la zona en agua caliente pero que no queme, de 40 a 45 °C y no más, de 20 a 45 minutos.{hwi}{jf} Pruebe antes el agua con su propia mano.'),
        L('For sea lice: leave the water, take the swimsuit off before showering, rinse with seawater or vinegar, then shower with fresh water. Wash the swimsuit in hot water with detergent before wearing it again. Hydrocortisone cream and an antihistamine ease the itch.', 'Para pulgas de mar: salga del agua, quítese el traje de baño antes de ducharse, enjuague con agua de mar o vinagre y luego dúchese con agua dulce. Lave el traje de baño en agua caliente con detergente antes de volver a usarlo. La crema de hidrocortisona y un antihistamínico alivian la comezón.'),
        L('Do not: rub the skin, scrape with sand, or rinse with fresh water first, because it may make stinging cells fire.{jf}', 'No haga: frotar la piel, raspar con arena ni enjuagar primero con agua dulce, porque puede hacer que las células urticantes disparen.{jf}'),
        L('Call 911 for: trouble breathing, chest pain, fainting, a large stung area, a sting on the face or eyes, or any large box jellyfish sting. See a doctor for fever, blisters, a rash that spreads, or a stung child.', 'Llame al 911 si hay: dificultad para respirar, dolor en el pecho, desmayo, un área grande picada, picadura en la cara o los ojos, o cualquier picadura de medusa cubo grande. Vea a un médico si hay fiebre, ampollas, sarpullido que se extiende o si picó a un niño.'),
      ],
    },
    { k: 'h', t: L('A puncture with spines', 'Una punción con espinas') },
    {
      k: 'ul',
      items: [
        L('What it may be: sea urchin, lionfish, scorpionfish or a catfish spine.', 'Qué puede ser: erizo de mar, pez león, pez escorpión o la espina de un bagre.'),
        L('Do first: pull out the spines you can see with tweezers,{nhs} wash with soap and clean water, and soak the wound in hot water, as hot as the person can stand without scalding and no more than 45 °C, for at least 30 minutes, and up to 90 minutes if the pain returns when it cools.{nhs}{hwi} Hot water eased the pain in most sea urchin cases in one review.{hwi} Check that the tetanus shot is current.', 'Haga primero: saque con pinzas las espinas que se vean,{nhs} lave con jabón y agua limpia y sumerja la herida en agua caliente, tan caliente como la persona aguante sin quemarse y no más de 45 °C, al menos 30 minutos, y hasta 90 minutos si el dolor vuelve al enfriarse.{nhs}{hwi} En una revisión, el agua caliente alivió el dolor en la mayoría de los casos de erizo de mar.{hwi} Revise que la vacuna antitetánica esté al día.'),
        L('Do not: dig, squeeze, cut, suck or tie the wound.', 'No haga: cavar, apretar, cortar, chupar ni amarrar la herida.'),
        L('Call 911 for: fainting, trouble breathing or chest pain. See a doctor for spines in a joint, the palm or the sole of the foot, deep punctures, or later swelling, redness or fever.', 'Llame al 911 si hay: desmayo, dificultad para respirar o dolor en el pecho. Vea a un médico si hay espinas en una articulación, la palma o la planta del pie, punciones profundas, o después hinchazón, enrojecimiento o fiebre.'),
      ],
    },
    { k: 'h', t: L('A stingray wound', 'Una herida de raya') },
    {
      k: 'ul',
      items: [
        L('Do first: keep the person calm and out of the water. Rinse with clean water and press gently to control bleeding. Then soak the wound in hot water, 40 to 45 °C, for at least 30 minutes and up to 90, testing the water with your own hand because the injured limb may be numb.{nhs}{hwi} Hot water that is warm but not scalding is the aim, because burns have happened.{hwi}', 'Haga primero: mantenga calmada a la persona y fuera del agua. Enjuague con agua limpia y presione con suavidad para controlar el sangrado. Luego sumerja la herida en agua caliente, de 40 a 45 °C, al menos 30 minutos y hasta 90, probando el agua con su propia mano porque el miembro herido puede estar dormido.{nhs}{hwi} El agua debe estar caliente pero no quemar, porque ha habido quemaduras.{hwi}'),
        L('Do not: pull out a spine that is deep in the chest, belly or neck. Hold it in place and call 911. Do not cut the wound open.', 'No haga: sacar una espina clavada profundo en el pecho, el abdomen o el cuello. Déjela en su lugar y llame al 911. No abra la herida con un corte.'),
        L('Every stingray wound needs a doctor the same day, because spine pieces can stay in the wound, infection is common and a tetanus shot may be needed. Call 911 for a wound to the chest, belly, head or neck, heavy bleeding, fainting or trouble breathing.', 'Toda herida de raya necesita un médico el mismo día, porque pueden quedar pedazos de espina, la infección es común y puede hacer falta la vacuna antitetánica. Llame al 911 si la herida es en el pecho, el abdomen, la cabeza o el cuello, si sangra mucho, hay desmayo o dificultad para respirar.'),
      ],
    },
    { k: 'h', t: L('A cone shell sting', 'Una picadura de caracol cono') },
    {
      k: 'ul',
      items: [
        L('Treat any cone shell sting as an emergency. The venom affects the nervous system and can cause paralysis, which may lead to breathing failure and death. There is no antivenom, and the sting site may hurt only a little.{dan}', 'Trate cualquier picadura de caracol cono como una emergencia. El veneno afecta el sistema nervioso y puede causar parálisis, que puede llevar a falla respiratoria y muerte. No hay antiveneno, y el sitio de la picadura puede doler poco.{dan}'),
        L('Do first: call 911 without waiting for symptoms, keep the person still and watched, and wash the wound with fresh water. A firm pressure bandage over the sting and along the limb, not a tourniquet, is advised.{dan} If breathing stops, give rescue breaths until help arrives.{dan}', 'Haga primero: llame al 911 sin esperar síntomas, mantenga a la persona quieta y vigilada, y lave la herida con agua dulce. Se aconseja un vendaje firme de presión sobre la picadura y a lo largo del miembro, no un torniquete.{dan} Si la respiración se detiene, dé respiración de rescate hasta que llegue ayuda.{dan}'),
        L('Do not: wait to see if it passes, or cut or suck the wound. Never pick up a cone shell, even one that looks empty.{dan}', 'No haga: esperar a ver si se pasa, ni cortar ni chupar la herida. Nunca levante un caracol cono, aunque parezca vacío.{dan}'),
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
    dan: {
      t: 'Divers Alert Network (DAN), Cone Snails',
      u: 'https://dan.org/health-medicine/health-resources/diseases-conditions/cone-snails/',
      p: 'P',
      what: L('Toxin can cause paralysis and respiratory failure, no antivenom, do not wait for symptoms, clean with fresh water, pressure immobilization bandage not a tourniquet, do not touch shells.', 'La toxina puede causar parálisis y falla respiratoria, no hay antiveneno, no esperar síntomas, limpiar con agua dulce, vendaje de inmovilización con presión y no torniquete, no tocar conchas.'),
    },
  },
};
