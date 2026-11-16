/**
 * CIGUATERA page text (PLAN 7.99), English and Spanish, written from the research in project files ciguatera/research/
 * (cases.md, species-size.md, medical.md). Plain data, no DOM. Every claim carries what the source says and no more:
 * evidence grades are the sources' own, not ours. "No data" is never written as "safe".
 */
export type L = { en: string; es: string };
const L = (en: string, es: string): L => ({ en, es });

/** How strong the evidence behind a line is. `against` means the advice is contradicted or likely harmful. */
export type Grade = 'strong' | 'weak' | 'case' | 'expert' | 'none' | 'against';
export const GRADE_WORDS: Record<Grade, L> = {
  strong: L('Supported', 'Respaldado'),
  weak: L('Weak trial evidence', 'Evidencia débil'),
  case: L('Case reports only', 'Solo casos clínicos'),
  expert: L('Expert opinion', 'Opinión de expertos'),
  none: L('No evidence found', 'Sin evidencia'),
  against: L('Contradicted', 'Contradicho'),
};

export type Block =
  | { k: 'p'; t: L }
  | { k: 'ul'; items: L[] }
  | { k: 'warn'; h: L; t: L }
  | { k: 'aid'; h: L; t: L }
  | { k: 'h'; t: L }
  /** Rows of cells; the first row is the header. */
  | { k: 'table'; head: L[]; rows: L[][] }
  /** Item, grade chip, plain-language note. */
  | { k: 'graded'; rows: { item: L; grade: Grade; note: L }[] }
  /** Bars on a log scale: cases per 10,000 people per year. */
  | { k: 'bars'; rows: { label: L; lo: number; hi?: number; note?: L }[] };

export interface Section {
  id: 'risk' | 'here' | 'fish' | 'symptoms' | 'treatment' | 'recovery' | 'ifill' | 'sources';
  title: L;
  /** One line under the title. */
  lede: L;
  blocks: Block[];
}

export const TITLE = L('Ciguatera', 'Ciguatera');
export const SUB = L('FISH POISONING FROM REEF FISH · WHAT IS KNOWN, WHAT IS NOT', 'INTOXICACIÓN POR PECES DE ARRECIFE · LO QUE SE SABE Y LO QUE NO');
export const NOTE = L(
  'Information from published sources, not medical advice. If you think you have ciguatera, see a doctor. Where a source was only read as a summary it is marked in the Sources tab.',
  'Información de fuentes publicadas, no consejo médico. Si cree que tiene ciguatera, vea a un médico. Las fuentes leídas solo en resumen se marcan en la pestaña Fuentes.',
);
export const CHROME = {
  back: { map: L('Map', 'Mapa'), forecast: L('Forecast', 'Pronóstico'), guide: L('Guide', 'Guía'), coral: L('Coral', 'Coral') },
  backTitle: L('Leave the ciguatera page', 'Salir de la página de ciguatera'),
  tabs: L('Sections', 'Secciones'),
  linkLabel: L('Ciguatera: what it is, where, treatment', 'Ciguatera: qué es, dónde, tratamiento'),
};

export const SECTIONS: Section[] = [
  {
    id: 'risk',
    title: L('The risk', 'El riesgo'),
    lede: L('A toxin from reef algae that builds up in big reef fish. You cannot see, smell, taste or cook it out.', 'Una toxina de algas de arrecife que se acumula en peces grandes de arrecife. No se ve, huele, saborea ni se elimina cocinando.'),
    blocks: [
      { k: 'warn', h: L('Never eat', 'Nunca coma'), t: L('Barracuda (picúa) and moray eels (morenas). The US CDC says never eat them. Also never eat the head, liver, guts or roe of any large reef fish.', 'Barracuda (picúa) y morenas. Los CDC de EE. UU. dicen que nunca se coman. Tampoco coma nunca la cabeza, el hígado, las vísceras ni las huevas de ningún pez grande de arrecife.') },
      { k: 'p', t: L('Ciguatera comes from tiny algae (Gambierdiscus) that live on dead coral, rubble and seaweed on reefs. Small fish eat the algae, big fish eat the small fish, and the toxin (ciguatoxin) concentrates up the chain. It is most concentrated in the head, liver, guts and roe.', 'La ciguatera viene de algas diminutas (Gambierdiscus) que viven sobre coral muerto, escombros y algas de los arrecifes. Los peces pequeños comen las algas, los grandes comen a los pequeños y la toxina (ciguatoxina) se concentra en la cadena. Se concentra más en la cabeza, el hígado, las vísceras y las huevas.') },
      { k: 'h', t: L('What does not work', 'Lo que no sirve') },
      { k: 'ul', items: [
        L('Cooking, freezing, pickling, salting or smoking do not destroy the toxin (CDC).', 'Cocinar, congelar, encurtir, salar o ahumar no destruye la toxina (CDC).'),
        L('The fish looks, smells and tastes normal. No coin, ant or cat test is backed by any source we found.', 'El pescado se ve, huele y sabe normal. Ninguna fuente que encontramos respalda pruebas con monedas, hormigas o gatos.'),
        L('There is no approved home test. Commercial kits were not reliable in the one independent test we found (they missed most toxic samples).', 'No hay una prueba casera aprobada. Los kits comerciales no fueron fiables en la única prueba independiente que encontramos (no detectaron la mayoría de las muestras tóxicas).'),
        L('There is no antidote. Treatment is supportive.', 'No hay antídoto. El tratamiento es de apoyo.'),
      ] },
      { k: 'h', t: L('Rules the evidence supports', 'Reglas que respalda la evidencia') },
      { k: 'ul', items: [
        L('Skip the big reef predators: barracuda, large groupers (mero), amberjack (medregal), large jacks (jurel), cubera and dog snapper (pargo cubera, pargo perro).', 'Evite los grandes depredadores de arrecife: barracuda, meros grandes, medregal, jureles grandes, pargo cubera y pargo perro.'),
        L('Throw away the head, liver, guts and roe of any reef fish.', 'Deseche la cabeza, el hígado, las vísceras y las huevas de cualquier pez de arrecife.'),
        L('Size lowers the average risk but no size is proven safe. CDC advice is to avoid reef fish over about 5 lb (2.3 kg). Small fish have made people ill too.', 'El tamaño baja el riesgo promedio pero ningún tamaño es seguro. El CDC aconseja evitar peces de arrecife de más de unas 5 lb (2,3 kg). Peces pequeños también han enfermado a personas.'),
        L('Risk is local: reefs a few kilometres apart can differ. Ask local fishers which fish and places have made people sick, and treat a place with no data as unknown, not safe.', 'El riesgo es local: arrecifes a pocos kilómetros pueden diferir. Pregunte a los pescadores locales qué peces y lugares han enfermado a la gente, y trate un lugar sin datos como desconocido, no como seguro.'),
        L('Open-water fish (tuna, mahi, wahoo) are rarely reported with ciguatera, but they can cause a different poisoning, scombroid, if not chilled fast. Ice them.', 'Los peces de mar abierto (atún, dorado, peto) rara vez se reportan con ciguatera, pero pueden causar otra intoxicación, la escombroide, si no se enfrían rápido. Póngales hielo.'),
      ] },
      { k: 'p', t: L('The app flags species with a ciguatera warning on the fishing panel and in the species guide. Those warnings open this page.', 'La app marca con una advertencia de ciguatera las especies en el panel de pesca y en la guía de especies. Esas advertencias abren esta página.') },
    ],
  },
  {
    id: 'here',
    title: L('Here: Gandoca to Limón', 'Aquí: Gandoca a Limón'),
    lede: L('No published cases for this coast. That is a gap in reporting, not proof of safety.', 'No hay casos publicados para esta costa. Es un vacío de reportes, no prueba de seguridad.'),
    blocks: [
      { k: 'warn', h: L('What we found', 'Lo que encontramos'), t: L('After searching in English and Spanish we found no published ciguatera case, outbreak, rate or fish toxin test for Limón, Cahuita, Puerto Viejo, Punta Uva, Manzanillo or Gandoca, and none for Bocas del Toro. A University of Costa Rica summary (2021 to 2023) says "no information on ciguatera events is known" on the Caribbean side, and suggests one reason may be that the health sector does not know the illness. It also says monitoring there is very limited, and that more than six potentially ciguatoxin-producing algae species have been detected since 2022.', 'Tras buscar en inglés y español no encontramos ningún caso, brote, tasa ni prueba de toxina en peces publicados para Limón, Cahuita, Puerto Viejo, Punta Uva, Manzanillo o Gandoca, ni para Bocas del Toro. Un resumen de la Universidad de Costa Rica (2021 a 2023) dice que "no se conoce información sobre eventos de ciguatera" en el sector Caribe y sugiere que una razón puede ser el desconocimiento de la enfermedad por parte del sector salud. También dice que el monitoreo es muy limitado y que desde 2022 se han detectado más de seis especies de algas potencialmente productoras de ciguatoxinas.') },
      { k: 'p', t: L('Elsewhere in the Caribbean only 2 to 10 percent of cases are reported (US figure), and in Miami-Dade 10 to 100 cases may go unreported for each one reported. Missing reports here most likely mean missing reporting.', 'En el resto del Caribe solo se reporta entre el 2 y el 10 por ciento de los casos (cifra de EE. UU.), y en Miami-Dade por cada caso reportado pueden quedar 10 a 100 sin reportar. Que falten reportes aquí probablemente significa que falta vigilancia.') },
      { k: 'h', t: L('Site by site (west to east)', 'Sitio por sitio (de oeste a este)') },
      { k: 'table', head: [L('Place', 'Lugar'), L('What is published', 'Lo publicado')], rows: [
        [L('Gandoca, Manzanillo, Punta Uva', 'Gandoca, Manzanillo, Punta Uva'), L('No ciguatera data. A 2013 fish die-off there was put down to natural causes, not ciguatera.', 'Sin datos de ciguatera. Una mortandad de peces en 2013 se atribuyó a causas naturales, no a ciguatera.')],
        [L('Punta Cocles, Puerto Viejo, Salsa Brava', 'Punta Cocles, Puerto Viejo, Salsa Brava'), L('No data found.', 'No se encontraron datos.')],
        [L('Cahuita, Punta Cahuita, Playa Negra', 'Cahuita, Punta Cahuita, Playa Negra'), L('No data found.', 'No se encontraron datos.')],
        [L('Limón, Isla Uvita', 'Limón, Isla Uvita'), L('No data found.', 'No se encontraron datos.')],
        [L('Bocas del Toro, Panama', 'Bocas del Toro, Panamá'), L('No cases or algae records found. A 2026 Panamanian risk index (expert scores, not case data) scores the western Caribbean of Panama 2.65 and says clinical reports are few and incomplete.', 'No se encontraron casos ni registros de algas. Un índice de riesgo panameño de 2026 (puntajes de expertos, no datos de casos) puntúa el Caribe occidental de Panamá con 2,65 y dice que los reportes clínicos son pocos e incompletos.')],
      ] },
      { k: 'h', t: L('Nearest reports', 'Reportes más cercanos') },
      { k: 'table', head: [L('Place', 'Lugar'), L('Report', 'Reporte')], rows: [
        [L('Belize, 2017', 'Belice, 2017'), L('At least 10 ill after eating barracuda from Turneffe (news reports).', 'Al menos 10 enfermos tras comer barracuda de Turneffe (prensa).')],
        [L('Colombian Caribbean', 'Caribe colombiano'), L('Three outbreaks in a 1985 to 1986 paper (28 ill at Taganga); later work says cases are under-diagnosed.', 'Tres brotes en un artículo de 1985 a 1986 (28 enfermos en Taganga); trabajos posteriores dicen que hay subdiagnóstico.')],
        [L('Mexican Caribbean (Quintana Roo)', 'Caribe mexicano (Quintana Roo)'), L('163 cases from 1984 to 2013; in every outbreak the fish was barracuda.', '163 casos de 1984 a 2013; en todos los brotes el pez fue barracuda.')],
        [L('Cuba, 1983 to 1998', 'Cuba, 1983 a 1998'), L('46 outbreaks, 305 cases, no deaths.', '46 brotes, 305 casos, sin muertes.')],
        [L('Guadeloupe, 2013 to 2016', 'Guadalupe, 2013 a 2016'), L('234 cases; jacks and amberjack were the most common fish (47 cases), barracuda 12.', '234 casos; los jureles y medregales fueron los más comunes (47 casos), barracuda 12.')],
        [L('Nicaragua, 2025', 'Nicaragua, 2025'), L('First record of Gambierdiscus algae at the Cayos Miskitos.', 'Primer registro de algas Gambierdiscus en los Cayos Miskitos.')],
      ] },
      { k: 'h', t: L('Cases per 10,000 people per year', 'Casos por 10.000 personas por año') },
      { k: 'bars', rows: [
        { label: L('French Polynesia (1979 to 83)', 'Polinesia Francesa (1979 a 83)'), lo: 5850, note: L('Pacific hotspot', 'Foco del Pacífico') },
        { label: L('Marshall Islands (1982 to 83)', 'Islas Marshall (1982 a 83)'), lo: 2820 },
        { label: L('Culebra, Puerto Rico (2005 to 06)', 'Culebra, Puerto Rico (2005 a 06)'), lo: 73.6, hi: 169.5 },
        { label: L('Guadeloupe (1984)', 'Guadalupe (1984)'), lo: 30 },
        { label: L('US Virgin Islands (1982)', 'Islas Vírgenes de EE. UU. (1982)'), lo: 7.6, note: L('a later estimate is much higher', 'una estimación posterior es mucho mayor') },
        { label: L('Miami-Dade, Florida (1974 to 76)', 'Miami-Dade, Florida (1974 a 76)'), lo: 5 },
      ] },
      { k: 'p', t: L('Caribbean rates are far lower than the Pacific hotspots, but they run from a few to over a hundred per 10,000 and vary a lot between islands. There is no rate for Costa Rica.', 'Las tasas del Caribe son mucho menores que las de los focos del Pacífico, pero van de unos pocos a más de cien por 10.000 y varían mucho entre islas. No hay una tasa para Costa Rica.') },
      { k: 'h', t: L('Why a few kilometres matter', 'Por qué importan unos pocos kilómetros') },
      { k: 'p', t: L('Ciguatera is very local. A review of work in the US Virgin Islands says that within about 3 km on one island, fish from one reef can be safe while neighbouring reefs are hotspots (secondary summary). So a place with no reports is unknown, and a fish from one reef says little about another. Local knowledge of which fish and places have made people ill is the best guide we have for this coast.', 'La ciguatera es muy local. Una revisión de trabajos en las Islas Vírgenes de EE. UU. dice que a menos de unos 3 km en una misma isla, los peces de un arrecife pueden ser seguros mientras arrecifes vecinos son focos (resumen secundario). Un lugar sin reportes es desconocido, y un pez de un arrecife dice poco sobre otro. El conocimiento local de qué peces y lugares han enfermado a la gente es la mejor guía para esta costa.') },
    ],
  },
  {
    id: 'fish',
    title: L('Species and size', 'Especies y tamaño'),
    lede: L('How the published record ranks Caribbean fish. A tier is not a guarantee.', 'Cómo clasifica el registro publicado a los peces del Caribe. Un nivel no es una garantía.'),
    blocks: [
      { k: 'table', head: [L('Fish', 'Pez'), L('Risk in the record', 'Riesgo en el registro'), L('Evidence', 'Evidencia')], rows: [
        [L('Barracuda, picúa (Sphyraena barracuda)', 'Barracuda, picúa (Sphyraena barracuda)'), L('HIGH. Never eat (CDC)', 'ALTO. Nunca comer (CDC)'), L('Every Mexican Caribbean outbreak 1984 to 2013; 12 of 234 Guadeloupe cases', 'Todos los brotes del Caribe mexicano 1984 a 2013; 12 de 234 casos en Guadalupe')],
        [L('Moray eels, morenas (Gymnothorax)', 'Morenas (Gymnothorax)'), L('HIGH. Never eat (CDC)', 'ALTO. Nunca comer (CDC)'), L('Small series, CDC', 'Series pequeñas, CDC')],
        [L('Amberjack, medregal (Seriola)', 'Medregal, coronado (Seriola)'), L('HIGH', 'ALTO'), L('Jacks and amberjack: 47 Guadeloupe cases', 'Jureles y medregal: 47 casos en Guadalupe')],
        [L('Horse-eye jack, jurel ojón (Caranx latus)', 'Jurel ojón (Caranx latus)'), L('HIGH', 'ALTO'), L('55 percent of 178 Guadeloupe and St Barth fish tested toxic (summary); toxin rose with weight', '55 por ciento de 178 peces de Guadalupe y San Bartolomé dio tóxico (resumen); la toxina subió con el peso')],
        [L('Yellow jack, bar jack, crevalle (Caranx bartholomaei, ruber, hippos)', 'Jurel amarillo, jurel, jurel común'), L('MODERATE to HIGH', 'MODERADO a ALTO'), L('Guadeloupe series; nothing specific found for crevalle', 'Serie de Guadalupe; nada específico para el jurel común')],
        [L('Groupers, mero (Mycteroperca, Epinephelus), esp. large', 'Meros (Mycteroperca, Epinephelus), sobre todo grandes'), L('HIGH when large', 'ALTO si son grandes'), L('15 Guadeloupe cases', '15 casos en Guadalupe')],
        [L('Cubera and dog snapper (Lutjanus cyanopterus, jocu)', 'Pargo cubera y pargo perro'), L('HIGH', 'ALTO'), L('Dog snapper cases in Guadeloupe and a Cuba traveller; cubera on agency lists only', 'Casos de pargo perro en Guadalupe y un viajero a Cuba; cubera solo en listas de agencias')],
        [L('Schoolmaster (Lutjanus apodus)', 'Pargo gallego'), L('MODERATE', 'MODERADO'), L('Guadeloupe cases', 'Casos en Guadalupe')],
        [L('Mutton snapper, yellowtail (L. analis, Ocyurus)', 'Pargo criollo, rabirrubia'), L('LOW reported', 'BAJO reportado'), L('Yellowtail "suspected, not established" in Guadeloupe; no mutton snapper source found', 'Rabirrubia "sospechado, no establecido" en Guadalupe; no hallamos fuente del pargo criollo')],
        [L('King mackerel, carite (Scomberomorus cavalla)', 'Carite, sierra'), L('MODERATE (listed)', 'MODERADO (en listas)'), L('Agency lists, no size data', 'Listas de agencias, sin datos de talla')],
        [L('Hogfish, parrotfish', 'Boquinete, loros'), L('MODERATE / LOW to MODERATE', 'MODERADO / BAJO a MODERADO'), L('Agency lists and CDC; no case series found', 'Listas de agencias y CDC; no hallamos series de casos')],
        [L('Lionfish, pez león (Pterois volitans)', 'Pez león (Pterois volitans)'), L('LOW to MODERATE: toxin found, illness rare', 'BAJO a MODERADO: hay toxina, la enfermedad es rara'), L('USVI: about 12 percent of 153 fish above the US FDA level, about 40 percent had some toxin, size did not predict it; no illness reported to the FDA by 2013; one Guadeloupe case', 'USVI: cerca del 12 por ciento de 153 peces superó el nivel de la FDA, cerca del 40 por ciento tenía algo de toxina, el tamaño no lo predijo; ninguna enfermedad reportada a la FDA hasta 2013; un caso en Guadalupe')],
        [L('Mahi-mahi, dorado', 'Dorado'), L('Not established. Scombroid risk', 'No establecido. Riesgo escombroide'), L('"Suspected, not established" in Guadeloupe', '"Sospechado, no establecido" en Guadalupe')],
        [L('Tunas, atún; wahoo, peto; Spanish mackerel', 'Atunes; peto; macarela'), L('None reported', 'Ninguno reportado'), L('Pelagic fish are rarely reported. Chill them fast (scombroid)', 'Los peces pelágicos rara vez se reportan. Enfríelos rápido (escombroide)')],
      ] },
      { k: 'h', t: L('Size: what the record says', 'Tamaño: lo que dice el registro') },
      { k: 'ul', items: [
        L('CDC: avoid reef fish over about 5 lb (2.3 kg). California public health uses 6 lb (summary). These are rules of thumb, not measured safe limits.', 'CDC: evitar peces de arrecife de más de unas 5 lb (2,3 kg). Salud pública de California usa 6 lb (resumen). Son reglas prácticas, no límites seguros medidos.'),
        L('A 2022 French Polynesia study of five species found toxic fish were on average larger, but age did not predict it and toxic fish came in a wide range of sizes. The authors wrote that eating small or low-weight fish "remains risky".', 'Un estudio de 2022 en la Polinesia Francesa con cinco especies halló que los peces tóxicos eran en promedio más grandes, pero la edad no lo predijo y los tóxicos tenían tallas muy variadas. Los autores escribieron que comer peces pequeños o de poco peso "sigue siendo riesgoso".'),
        L('Caribbean data are thin. In Guadeloupe a link between weight and toxin was significant only for horse-eye jack and snappers (summary). In US Virgin Islands lionfish there was no link.', 'Los datos del Caribe son escasos. En Guadalupe la relación entre peso y toxina fue significativa solo para el jurel ojón y los pargos (resumen). En el pez león de las Islas Vírgenes no hubo relación.'),
      ] },
      { k: 'h', t: L('A rule you may hear, checked', 'Una regla que se oye, revisada') },
      { k: 'graded', rows: [
        { item: L('"The bigger the fish, the higher the risk"', '"Entre más grande el pez, mayor el riesgo"'), grade: 'weak', note: L('True on average for some species, weakly. It is why CDC suggests a size limit.', 'Cierto en promedio para algunas especies, débilmente. Por eso el CDC sugiere un límite de talla.') },
        { item: L('"Fish under about 3 lb are usually safe"', '"Peces de menos de unas 3 lb suelen ser seguros"'), grade: 'against', note: L('No source gives a safe size. Authors say small fish stay risky.', 'Ninguna fuente da un tamaño seguro. Los autores dicen que los pequeños siguen siendo riesgosos.') },
        { item: L('"Mix small amounts of different small fish to dilute the risk"', '"Mezcle pequeñas porciones de varios peces pequeños para diluir el riesgo"'), grade: 'none', note: L('We found no source for this. Poisoning is per meal and a toxic fish can be any size.', 'No hallamos fuente. La intoxicación es por comida y un pez tóxico puede ser de cualquier tamaño.') },
        { item: L('"You can get it from snapper"', '"Se puede contraer con pargo"'), grade: 'strong', note: L('Yes: cubera and dog snapper, and some others, appear in case series.', 'Sí: el pargo cubera y el pargo perro, y otros, aparecen en series de casos.') },
      ] },
      { k: 'p', t: L('Scombroid is a different illness: histamine from fish kept warm (tuna, mahi, mackerel). It starts within minutes to an hour with flushing, rash and headache. Ciguatera starts hours later and brings nerve symptoms.', 'La escombroide es otra enfermedad: histamina de pescado mal enfriado (atún, dorado, macarela). Empieza en minutos a una hora con enrojecimiento, sarpullido y dolor de cabeza. La ciguatera empieza horas después y trae síntomas nerviosos.') },
    ],
  },
  {
    id: 'symptoms',
    title: L('Symptoms', 'Síntomas'),
    lede: L('Gut first, then nerves. Hot and cold feel reversed. It can last weeks to months.', 'Primero el estómago, luego los nervios. Lo frío y lo caliente se sienten al revés. Puede durar semanas o meses.'),
    blocks: [
      { k: 'table', head: [L('When', 'Cuándo'), L('What', 'Qué')], rows: [
        [L('3 to 6 hours (up to about 30) after the meal', 'De 3 a 6 horas (hasta unas 30) tras la comida'), L('Nausea, vomiting, diarrhoea, stomach cramps. In the Caribbean these usually come first and fade in 1 to 4 days.', 'Náuseas, vómitos, diarrea, cólicos. En el Caribe suelen venir primero y ceden en 1 a 4 días.')],
        [L('Hours to 2 days', 'De horas a 2 días'), L('Tingling or numbness of lips, tongue, hands and feet; itching; muscle and joint pain; headache; tooth or jaw pain; a metallic taste.', 'Hormigueo o adormecimiento de labios, lengua, manos y pies; picazón; dolor muscular y articular; dolor de cabeza; dolor de dientes o mandíbula; sabor metálico.')],
        [L('Often day 1 to a few days', 'A menudo del día 1 a unos días'), L('Temperature reversal: cold things feel hot, burning or like an electric shock; the tongue can feel burnt. A hallmark, but not everyone gets it.', 'Inversión de la temperatura: lo frío se siente caliente, quema o da descarga; la lengua puede sentirse quemada. Es una señal típica, pero no todos la tienen.')],
        [L('Any time in the first days', 'En cualquier momento de los primeros días'), L('Slow pulse, low blood pressure, faintness. This is the dangerous part. Heart block is listed.', 'Pulso lento, presión baja, desmayo. Esta es la parte peligrosa. Se menciona el bloqueo cardiaco.')],
        [L('Weeks to months', 'Semanas a meses'), L('Fatigue, itching, aching, mood and memory changes. Most recover within months. Symptoms "for years" are reported, but after a year doctors are told to look for other causes.', 'Fatiga, picazón, dolores, cambios de ánimo y memoria. La mayoría se recupera en meses. Se reportan síntomas "por años", pero pasado un año se indica buscar otras causas.')],
      ] },
      { k: 'h', t: L('How often each symptom is reported', 'Con qué frecuencia se reporta cada síntoma') },
      { k: 'p', t: L('Ranges across published case series (different studies, so approximate): diarrhoea 44 to 83 percent, vomiting 28 to 69, nausea 17 to 82, tingling of limbs 36 to 100, temperature reversal 16 to 94, muscle pain 12 to 86, itching 5 to 77, slow pulse 3 to 75, low blood pressure 8 to 43.', 'Rangos en series de casos publicadas (estudios distintos, por tanto aproximados): diarrea 44 a 83 por ciento, vómitos 28 a 69, náuseas 17 a 82, hormigueo de extremidades 36 a 100, inversión de temperatura 16 a 94, dolor muscular 12 a 86, picazón 5 a 77, pulso lento 3 a 75, presión baja 8 a 43.') },
      { k: 'h', t: L('Good to know', 'Bueno saber') },
      { k: 'ul', items: [
        L('Caribbean ciguatoxin is a different molecule from the Pacific one and is believed to be less acutely potent. Caribbean cases tend to start with the gut; Pacific cases lean to nerve symptoms.', 'La ciguatoxina del Caribe es una molécula distinta de la del Pacífico y se cree menos potente en lo agudo. Los casos del Caribe tienden a empezar con el estómago; los del Pacífico, con síntomas nerviosos.'),
        L('Death is rare, under 0.1 percent (CDC). Reported deaths follow dehydration, shock or breathing failure, and most reports are from the Pacific.', 'La muerte es rara, menos del 0,1 por ciento (CDC). Las muertes reportadas siguen a deshidratación, choque o falla respiratoria, y la mayoría son del Pacífico.'),
        L('Relapse: symptoms can flare again weeks or months later. Patients report alcohol, caffeine, nuts, fish, exertion and dehydration as triggers. These come from patient reports and expert opinion, not controlled studies.', 'Recaídas: los síntomas pueden reaparecer semanas o meses después. Los pacientes reportan alcohol, cafeína, nueces, pescado, esfuerzo y deshidratación como detonantes. Vienen de reportes de pacientes y opinión de expertos, no de estudios controlados.'),
        L('A few cases of passing it to a baby through breast milk or to a partner are reported. Pregnant and nursing women should be extra careful.', 'Hay pocos casos de transmisión al bebé por la leche o a la pareja. Las mujeres embarazadas o lactantes deben tener cuidado extra.'),
        L('Everyone who ate the same fish can be affected, to different degrees. Tell them.', 'Todos los que comieron el mismo pescado pueden verse afectados, en distinto grado. Avíseles.'),
      ] },
    ],
  },
  {
    id: 'treatment',
    title: L('Treatment and remedies', 'Tratamiento y remedios'),
    lede: L('No antidote exists. Care is supportive. Here is how strong the evidence is for each thing people try.', 'No existe antídoto. La atención es de apoyo. Aquí, qué tan sólida es la evidencia de cada cosa que la gente prueba.'),
    blocks: [
      { k: 'aid', h: L('The honest summary', 'El resumen honesto'), t: L('The CDC states there is no specific antidote. Doctors treat the symptoms: fluids, anti-nausea drugs, watching the heart, and medicines for nerve pain and itch. Time is what clears the toxin.', 'El CDC indica que no hay antídoto específico. Los médicos tratan los síntomas: líquidos, antieméticos, vigilancia del corazón y medicinas para el dolor nervioso y la picazón. El tiempo es lo que elimina la toxina.') },
      { k: 'h', t: L('In hospital', 'En el hospital') },
      { k: 'graded', rows: [
        { item: L('IV fluids, anti-nausea drugs', 'Líquidos IV, antieméticos'), grade: 'expert', note: L('Standard supportive care.', 'Atención de apoyo estándar.') },
        { item: L('Atropine for a slow, symptomatic pulse', 'Atropina para pulso lento con síntomas'), grade: 'expert', note: L('Used in hospital for dangerous slow heart rate.', 'Se usa en hospital para ritmo cardiaco lento peligroso.') },
        { item: L('Mannitol IV (a drip of a sugar-alcohol)', 'Manitol IV (goteo de un azúcar-alcohol)'), grade: 'weak', note: L('Early uncontrolled series and one unblinded trial were positive. The one double-blind trial (50 patients) found no benefit over saline. Experts still call it reasonable in early, stable patients. The CDC mentions it, ideally within 48 hours and only if hydrated.', 'Series tempranas sin control y un ensayo no ciego fueron positivos. El único ensayo doble ciego (50 pacientes) no halló beneficio frente a suero salino. Los expertos aún lo consideran razonable en pacientes tempranos y estables. El CDC lo menciona, idealmente en 48 horas y solo con buena hidratación.') },
        { item: L('Amitriptyline (tingling, itch, headache)', 'Amitriptilina (hormigueo, picazón, dolor de cabeza)'), grade: 'case', note: L('Reported helpful in case reports; no trials.', 'Reportada útil en casos clínicos; sin ensayos.') },
        { item: L('Gabapentin or pregabalin (nerve pain)', 'Gabapentina o pregabalina (dolor nervioso)'), grade: 'case', note: L('Used for nerve pain; case reports only.', 'Se usan para dolor nervioso; solo casos clínicos.') },
        { item: L('Fluoxetine (long fatigue)', 'Fluoxetina (fatiga prolongada)'), grade: 'case', note: L('Case reports only.', 'Solo casos clínicos.') },
        { item: L('Antihistamines (itch), nifedipine (headache)', 'Antihistamínicos (picazón), nifedipino (dolor de cabeza)'), grade: 'case', note: L('Case reports only.', 'Solo casos clínicos.') },
        { item: L('Activated charcoal', 'Carbón activado'), grade: 'expert', note: L('Suggested only for people seen in the first hours who are not vomiting. We found no evidence for taking it days or weeks later.', 'Se sugiere solo para quienes llegan en las primeras horas y no vomitan. No hallamos evidencia para tomarlo días o semanas después.') },
      ] },
      { k: 'h', t: L('Advice you hear on forums, checked', 'Consejos de foros, revisados') },
      { k: 'graded', rows: [
        { item: L('"Time is the biggest healer"', '"El tiempo es el mejor sanador"'), grade: 'strong', note: L('CDC and reviews: symptoms clear over days to months.', 'CDC y revisiones: los síntomas ceden en días a meses.') },
        { item: L('"Recovery takes weeks to a year"', '"La recuperación toma de semanas a un año"'), grade: 'weak', note: L('Weeks to months is typical; years are rare and should prompt a look for other causes.', 'Lo típico son semanas a meses; años es raro y debe llevar a buscar otras causas.') },
        { item: L('"Symptoms can come back years later"', '"Los síntomas pueden volver años después"'), grade: 'weak', note: L('Reported in patients; not well studied.', 'Reportado en pacientes; poco estudiado.') },
        { item: L('"Dehydration makes all symptoms worse"', '"La deshidratación empeora todos los síntomas"'), grade: 'weak', note: L('Dehydration is a cause of death and a reported trigger; "all symptoms" is unproven. Drinking fluids is sensible.', 'La deshidratación es causa de muerte y un detonante reportado; "todos los síntomas" no está probado. Tomar líquidos es sensato.') },
        { item: L('"Take activated charcoal as much as you can"', '"Tome carbón activado todo lo que pueda"'), grade: 'against', note: L('Only early use is mentioned in the sources. Repeated use later is unsupported, and charcoal can interfere with medicines and bowel function.', 'Las fuentes solo mencionan el uso temprano. El uso repetido después no tiene respaldo, y el carbón puede interferir con medicinas y con el intestino.') },
        { item: L('"Try cholestyramine if you do not improve"', '"Pruebe colestiramina si no mejora"'), grade: 'none', note: L('No trial. Only small uncontrolled reports from one group (about 10 patients, press release). Not in the CDC page or the 2017 review. Ask a doctor; it is a prescription drug.', 'Sin ensayos. Solo reportes pequeños sin control de un grupo (unos 10 pacientes, comunicado de prensa). No está en la página del CDC ni en la revisión de 2017. Consulte a un médico; es un fármaco de receta.') },
        { item: L('"Ciguatoxin is stored in fat, so avoid weight gain"', '"La ciguatoxina se almacena en la grasa, evite subir de peso"'), grade: 'none', note: L('Fat storage is a hypothesis in the review; no weight advice found.', 'El almacenamiento en grasa es una hipótesis en la revisión; no hallamos consejos de peso.') },
        { item: L('"Try saunas"', '"Pruebe saunas"'), grade: 'none', note: L('Nothing found in the medical sources. Heat can worsen dehydration.', 'Nada en las fuentes médicas. El calor puede empeorar la deshidratación.') },
        { item: L('Vitamins, lidocaine, steroids', 'Vitaminas, lidocaína, esteroides'), grade: 'none', note: L('No supporting evidence found.', 'No hallamos evidencia a favor.') },
        { item: L('Pacific plant remedies (Argusia, Heliotropium and others)', 'Remedios de plantas del Pacífico (Argusia, Heliotropium y otras)'), grade: 'none', note: L('A review says there is no scientific evidence they are safe or effective.', 'Una revisión dice que no hay evidencia científica de que sean seguros o eficaces.') },
      ] },
    ],
  },
  {
    id: 'recovery',
    title: L('Recovery: what to avoid', 'Recuperación: qué evitar'),
    lede: L('Advice is expert opinion. No controlled study has tested it.', 'El consejo es opinión de expertos. Ningún estudio controlado lo ha probado.'),
    blocks: [
      { k: 'table', head: [L('Avoid', 'Evite'), L('For how long (source)', 'Por cuánto tiempo (fuente)')], rows: [
        [L('Alcohol', 'Alcohol'), L('CDC: at least 6 months. Reviews: 3 to 6 months or until symptoms resolve.', 'CDC: al menos 6 meses. Revisiones: 3 a 6 meses o hasta que cedan los síntomas.')],
        [L('Caffeine', 'Cafeína'), L('Same as alcohol. Patients report it triggers flares.', 'Igual que el alcohol. Los pacientes reportan que provoca brotes.')],
        [L('Nuts', 'Nueces y frutos secos'), L('CDC lists nuts; reviews list nuts and nut oils among reported triggers.', 'El CDC menciona los frutos secos; las revisiones listan nueces y sus aceites entre los detonantes reportados.')],
        [L('Fish and seafood', 'Pescado y mariscos'), L('CDC lists fish, with the same time frame. Reviews report any fish, even freshwater, as a trigger for some patients.', 'El CDC menciona el pescado, con el mismo plazo. Las revisiones reportan cualquier pescado, incluso de agua dulce, como detonante en algunos pacientes.')],
        [L('Other things reported by patients', 'Otras cosas reportadas por pacientes'), L('Chicken, pork, hard exertion and dehydration are named in reviews as reported triggers. Spicy food and sunlight: no source found, unproven.', 'Pollo, cerdo, esfuerzo intenso y deshidratación figuran en revisiones como detonantes reportados. Comida picante y sol: no hay fuente, sin probar.')],
      ] },
      { k: 'ul', items: [
        L('Keep drinking water. Dehydration is the usual route to a serious case.', 'Siga tomando agua. La deshidratación es la vía habitual a un caso grave.'),
        L('Nothing here has been proven to speed recovery. Rest and time are what the sources describe.', 'Nada de esto está probado para acelerar la recuperación. Las fuentes describen descanso y tiempo.'),
        L('If symptoms flare, think of what you ate or drank in the last day and tell your doctor.', 'Si los síntomas reaparecen, piense en lo que comió o bebió el último día y dígalo a su médico.'),
      ] },
    ],
  },
  {
    id: 'ifill',
    title: L('If you think you have it', 'Si cree que la tiene'),
    lede: L('See a doctor. Go now if the pulse is slow, you faint, or you cannot keep fluids down.', 'Vea a un médico. Vaya ya si el pulso es lento, se desmaya o no retiene líquidos.'),
    blocks: [
      { k: 'warn', h: L('Go to hospital now', 'Vaya al hospital ya'), t: L('Slow or irregular pulse, fainting or dizziness on standing, repeated vomiting or diarrhoea, trouble breathing, seizures. In Costa Rica call 911.', 'Pulso lento o irregular, desmayo o mareo al ponerse de pie, vómito o diarrea repetidos, dificultad para respirar, convulsiones. En Costa Rica llame al 911.') },
      { k: 'ul', items: [
        L('Tell the doctor the fish, where and when it was caught, and when symptoms began. Many doctors have never seen ciguatera, and the UCR summary names low awareness in the health sector as a reason it goes unreported here.', 'Diga al médico qué pez, dónde y cuándo se pescó, y cuándo empezaron los síntomas. Muchos médicos nunca han visto ciguatera, y el resumen de la UCR señala el poco conocimiento del sector salud como una razón de que no se reporte aquí.'),
        L('Costa Rica poison centre: 800-INTOXICA (800-4686-9422), reported in news items. We could not confirm it on an official page: check it before you rely on it.', 'Centro de control de intoxicaciones de Costa Rica: 800-INTOXICA (800-4686-9422), según notas de prensa. No pudimos confirmarlo en una página oficial: verifíquelo antes de depender de él.'),
        L('Good practice, not stated by the CDC: keep any leftover fish frozen and tell everyone who ate it. Tell the local health office what fish and place, so a case is counted.', 'Buena práctica, no indicada por el CDC: guarde congelado cualquier sobrante y avise a todos los que comieron. Informe a la oficina de salud local qué pez y qué lugar, para que el caso se cuente.'),
        L('Do not eat the rest of the fish, and do not feed it to pets.', 'No coma el resto del pescado ni se lo dé a mascotas.'),
        L('Until you are seen: drink water, rest, and avoid alcohol and caffeine.', 'Hasta que lo vean: tome agua, descanse y evite alcohol y cafeína.'),
      ] },
    ],
  },
  {
    id: 'sources',
    title: L('Sources', 'Fuentes'),
    lede: L('Read in full (P) or only as a summary (S). Check S items before citing.', 'Leídas completas (P) o solo en resumen (S). Verifique las S antes de citarlas.'),
    blocks: [{ k: 'p', t: L('Sources are listed below.', 'Las fuentes se listan abajo.') }],
  },
];

export interface Source { t: string; u?: string; p: 'P' | 'S'; what: L }
export const SOURCES: Source[] = [
  { t: 'CDC Yellow Book: Food Poisoning from Marine Toxins', u: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/food-poisoning-from-marine-toxins.html', p: 'P', what: L('Size, never barracuda or moray, toxin location, cooking, no antidote, avoid list, death under 0.1%.', 'Talla, nunca barracuda ni morena, ubicación de la toxina, cocción, sin antídoto, lista de evitar, muerte menor a 0,1%.') },
  { t: 'Friedman et al. 2017, An Updated Review of Ciguatera Fish Poisoning, Mar Drugs 15(3):72', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5367029/', p: 'P', what: L('Symptoms and frequencies, treatments, relapse triggers (first part read).', 'Síntomas y frecuencias, tratamientos, detonantes de recaída (primera parte leída).') },
  { t: 'Friedman et al. 2008, Ciguatera Fish Poisoning: Treatment, Prevention and Management, Mar Drugs 6(3):456', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2579736/', p: 'P', what: L('Mannitol, remedies, incidence table.', 'Manitol, remedios, tabla de incidencia.') },
  { t: 'Chan 2016, Fatal Ciguatera Fish Poisoning, Am J Trop Med Hyg 94(4):704', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4824207', p: 'P', what: L('Deaths and what they had in common.', 'Muertes y lo que tenían en común.') },
  { t: 'Schnorf et al. 2002, Ciguatera fish poisoning: a double-blind randomized trial of mannitol, Neurology 58:873', u: 'https://www.qxmd.com/r/11914401', p: 'S', what: L('Mannitol no better than saline.', 'Manitol no mejor que suero salino.') },
  { t: 'Mullins and Hoffman 2017, Is mannitol the treatment of choice for ciguatera?, Clin Toxicol 55:947', u: 'https://read.qxmd.com/read/28535116/is-mannitol-the-treatment-of-choice-for-patients-with-ciguatera-fish-poisoning', p: 'S', what: L('Review of the mannitol evidence.', 'Revisión de la evidencia del manitol.') },
  { t: 'Boucaud-Maitre et al. 2018, Ciguatera in Guadeloupe 2013 to 2016, Sci Rep 8:3095', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5814543', p: 'P', what: L('234 cases, fish involved.', '234 casos, peces implicados.') },
  { t: 'Nunez-Vazquez et al., Ciguatera in Mexico 1984 to 2013, Mar Drugs', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6356608', p: 'P', what: L('Barracuda in all Caribbean outbreaks; 163 cases.', 'Barracuda en todos los brotes del Caribe; 163 casos.') },
  { t: 'Robertson et al. 2013, Invasive lionfish and ciguatera, Mar Drugs 12:88', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3917262', p: 'P', what: L('Toxin in US Virgin Islands lionfish.', 'Toxina en el pez león de las Islas Vírgenes de EE. UU.') },
  { t: 'Darius et al. 2022, Age and growth vs ciguatoxicity, French Polynesia, Mar Drugs 20:251', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9027493/', p: 'P', what: L('Size and age against toxicity.', 'Talla y edad frente a toxicidad.') },
  { t: 'WHOI: Ciguatera Fish Poisoning', u: 'https://www.whoi.edu/science/B/redtide/illness/ciguatera_fish_poisoning.html', p: 'P', what: L('US Virgin Islands rates and under-reporting.', 'Tasas en las Islas Vírgenes y subregistro.') },
  { t: 'Vargas (UCR), ANCA-IOCARIBE Costa Rica summary 2021 to 2023', u: 'https://oceanexpert.net/downloadFile/55043', p: 'P', what: L('No known ciguatera events on the Caribbean side; algae detected; limited monitoring.', 'Sin eventos de ciguatera conocidos en el Caribe; algas detectadas; monitoreo limitado.') },
  { t: 'Yepes, Seixas and Aparicio 2026, ciguatera risk index for Panama, Revista Colegiada de Ciencia 7(2)', u: 'https://revistas.up.ac.pa/index.php/revcolciencia/article/download/9704/7137/22785', p: 'P', what: L('Expert-scored risk; few Panamanian clinical reports.', 'Riesgo según expertos; pocos reportes clínicos en Panamá.') },
  { t: 'Tico Times 2013, natural causes likely behind fish deaths on the Caribbean coast', u: 'https://ticotimes.net/2013/10/04/natural-causes-likely-to-blame-for-mass-fish-deaths-on-costa-rica-s-caribbean-coast', p: 'S', what: L('Not ciguatera; context for Gandoca to Punta Uva.', 'No es ciguatera; contexto de Gandoca a Punta Uva.') },
  { t: 'San Pedro Sun 2017, suspected ciguatera poisoning, Belize', u: 'https://www.sanpedrosun.com/health/2017/08/21/suspected-ciguatera-poisoning-detected-fish-consumers/', p: 'S', what: L('Barracuda outbreak.', 'Brote por barracuda.') },
  { t: 'Culebra, Puerto Rico incidence study (PMC3339456)', u: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3339456/', p: 'S', what: L('Local rates.', 'Tasas locales.') },
  { t: 'US Department of Agriculture and University of Florida ciguatera sheet', u: 'https://www.nifa.usda.gov/sites/default/files/resource/Ciguatera.pdf', p: 'S', what: L('Species lists; could not be fetched.', 'Listas de especies; no se pudo abrir.') },
  { t: 'Newswise: Diagnosis and treatment of ciguatera poisoning', u: 'https://www.newswise.com/articles/diagnosis-and-treatment-of-ciguatera-poisoning', p: 'S', what: L('The only cholestyramine item found (press release).', 'El único dato de colestiramina hallado (comunicado de prensa).') },
];
