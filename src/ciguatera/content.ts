/**
 * CIGUATERA page text (PLAN 7.101), English and Spanish, written from the research in project files ciguatera/research/
 * (cases.md, species-size.md, medical.md). Plain data, no DOM. Every claim carries what the source says and no more:
 * evidence grades are the sources' own, not ours. "No data" is never written as "safe".
 */
import type { VBlock } from '../notes/vis';
import type { AnimalId } from '../notes/art/animals';

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
  | { k: 'bars'; cite?: string; rows: { label: L; lo: number; hi?: number; note?: L; none?: L }[] }
  /** Fish by fish, a big risk chip (never, high, care, low, none reported) and the evidence behind a tap. */
  | { k: 'risk'; rows: { fish: L; an?: AnimalId; lvl: Risk; word: L; note?: L; ev: L }[] }
  /** Ranges from 0 to 100 percent, lowest to highest across studies; `stop` marks the dangerous ones. */
  | { k: 'range'; cite?: string; key: L; rows: { label: L; lo: number; hi: number; stop?: boolean }[] }
  /**
   * The size to keep, fish by fish, for the kinds the map and forecast model (fishing/cigua.ts, from the species
   * guide's research): one bar per species on an 80 cm scale. The same numbers as the fish panel and the guide.
   */
  | { k: 'sizes'; cite?: string; kinds: string[] };

export type Risk = 'never' | 'high' | 'care' | 'low' | 'none';

export interface Section {
  id: 'risk' | 'ifill' | 'here' | 'fish' | 'symptoms' | 'treatment' | 'recovery';
  title: L;
  /** One line under the title. */
  lede: L;
  /** Text blocks, plus the field notes' visual blocks (figures, animal tiles). */
  blocks: (Block | VBlock)[];
}

export const TITLE = L('Ciguatera', 'Ciguatera');
export const SUB = L('FISH POISONING FROM REEF FISH · WHAT IS KNOWN, WHAT IS NOT', 'INTOXICACIÓN POR PECES DE ARRECIFE · LO QUE SE SABE Y LO QUE NO');
export const NOTE = L(
  'Information from published sources, not medical advice. If you think you have ciguatera, see a doctor. Superscript numbers point to the sources listed at the end of each section.',
  'Información de fuentes publicadas, no consejo médico. Si cree que tiene ciguatera, vea a un médico. Los números en superíndice remiten a las fuentes al final de cada sección.',
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
      { k: 'warn', h: L('Never eat', 'Nunca coma'), t: L('Barracuda (picúa) and moray eels (morenas): never eat them.{cdc} Also never eat the head, liver, guts or roe of any large reef fish.{cdc}', 'Barracuda (picúa) y morenas: no los coma nunca.{cdc} Tampoco coma nunca la cabeza, el hígado, las vísceras ni las huevas de ningún pez grande de arrecife.{cdc}') },
      { k: 'animals', items: [
        { an: 'barracuda', h: L('Barracuda, picúa: never eat', 'Barracuda, picúa: nunca la coma'), tone: 'stop' },
        { an: 'moray', h: L('Moray eel, morena: never eat', 'Morena: nunca la coma'), tone: 'stop' },
      ] },
      { k: 'h', t: L('How a fish becomes toxic', 'Cómo un pez se vuelve tóxico') },
      { k: 'fig', fig: 'cgChain', label: L('From algae to small fish to big fish to you, the toxin builds up at each step.', 'De las algas al pez pequeño, al pez grande y a usted, la toxina se acumula en cada paso.'), tones: ['info', 'info', 'warn', 'stop'], marks: [
        L('Tiny algae (Gambierdiscus) live on dead coral, rubble and seaweed on the reef. They make the toxin, ciguatoxin.{cdc}', 'Algas diminutas (Gambierdiscus) viven sobre coral muerto, escombros y algas del arrecife. Ellas producen la toxina, la ciguatoxina.{cdc}'),
        L('Small fish that graze on the reef eat the algae.', 'Los peces pequeños que pastan en el arrecife comen las algas.'),
        L('Big fish eat many small fish, so the toxin builds up in them.', 'Los peces grandes comen muchos peces pequeños, y la toxina se acumula en ellos.'),
        L('You eat the big fish. Cooking does not destroy the toxin.{cdc}', 'Usted come el pez grande. Cocinarlo no destruye la toxina.{cdc}'),
      ] },
      { k: 'h', t: L('Where the toxin is in a fish', 'Dónde está la toxina en el pez') },
      { k: 'fig', fig: 'cgParts', label: L('A reef fish: the head, liver, guts and roe in red hold the most toxin; the fillet in grey holds less.', 'Un pez de arrecife: la cabeza, el hígado, las vísceras y las huevas en rojo tienen más toxina; el filete en gris tiene menos.'), tones: ['stop', 'grey'], marks: [
        L('Red: the head, liver, guts and roe hold the most toxin. Throw them away.{cdc}', 'Rojo: la cabeza, el hígado, las vísceras y las huevas tienen más toxina. Deséchelos.{cdc}'),
        L('Grey: the fillet holds less, but not none. A toxic fish is still toxic with the guts out.', 'Gris: el filete tiene menos, pero no cero. Un pez tóxico sigue siendo tóxico sin las vísceras.'),
      ] },
      { k: 'h', t: L('What does not work', 'Lo que no sirve') },
      { k: 'ul', items: [
        L('Cooking, freezing, pickling, salting or smoking do not destroy the toxin.{cdc}', 'Cocinar, congelar, encurtir, salar o ahumar no destruye la toxina.{cdc}'),
        L('The fish looks, smells and tastes normal. No coin, ant or cat test is backed by any source we found.', 'El pescado se ve, huele y sabe normal. Ninguna fuente que encontramos respalda pruebas con monedas, hormigas o gatos.'),
        L('There is no approved home test. Test kits have not been reliable: one kit tried on 50 Caribbean fish missed 50 to 82 percent of the toxic ones and flagged 33 to 44 percent of the others, and kits are no longer sold.{kits}', 'No hay una prueba casera aprobada. Los kits de prueba no han sido fiables: uno probado en 50 peces del Caribe no detectó del 50 al 82 por ciento de los tóxicos y marcó como tóxicos del 33 al 44 por ciento de los demás, y ya no se venden.{kits}'),
        L('There is no antidote. Doctors treat the symptoms while the body clears the toxin.{cdc}', 'No hay antídoto. Los médicos tratan los síntomas mientras el cuerpo elimina la toxina.{cdc}'),
      ] },
      { k: 'h', t: L('Rules the evidence supports', 'Reglas que respalda la evidencia') },
      { k: 'ul', items: [
        L('Skip the big reef predators: barracuda, large groupers (mero), amberjack (medregal), large jacks (jurel), cubera and dog snapper (pargo cubera, pargo perro).', 'Evite los grandes depredadores de arrecife: barracuda, meros grandes, medregal, jureles grandes, pargo cubera y pargo perro.'),
        L('Throw away the head, liver, guts and roe of any reef fish.', 'Deseche la cabeza, el hígado, las vísceras y las huevas de cualquier pez de arrecife.'),
        L('Size lowers the average risk but no size is proven safe. The usual advice is to avoid reef fish over about 5 lb (2.3 kg).{cdc} Small fish have made people ill too.{pol}', 'El tamaño baja el riesgo promedio pero ningún tamaño es seguro. El consejo habitual es evitar peces de arrecife de más de unas 5 lb (2,3 kg).{cdc} Peces pequeños también han enfermado a personas.{pol}'),
        L('Risk is local: reefs a few kilometres apart can differ. Ask local fishers which fish and places have made people sick, and treat a place with no data as unknown, not safe.', 'El riesgo es local: arrecifes a pocos kilómetros pueden diferir. Pregunte a los pescadores locales qué peces y lugares han enfermado a la gente, y trate un lugar sin datos como desconocido, no como seguro.'),
        L('Open-water fish (tuna, mahi, wahoo) are rarely reported with ciguatera, but they can cause a different poisoning, scombroid, if not chilled fast. Ice them.', 'Los peces de mar abierto (atún, dorado, peto) rara vez se reportan con ciguatera, pero pueden causar otra intoxicación, la escombroide, si no se enfrían rápido. Póngales hielo.'),
      ] },
      { k: 'p', t: L('The app flags species with a ciguatera warning on the fishing panel and in the species guide. Those warnings open this page.', 'La app marca con una advertencia de ciguatera las especies en el panel de pesca y en la guía de especies. Esas advertencias abren esta página.') },
    ],
  },
  {
    id: 'ifill',
    title: L('If you think you have it', 'Si cree que la tiene'),
    lede: L('See a doctor. Go now if the pulse is slow, you faint, or you cannot keep fluids down.', 'Vea a un médico. Vaya ya si el pulso es lento, se desmaya o no retiene líquidos.'),
    blocks: [
      { k: 'warn', h: L('Go to hospital now', 'Vaya al hospital ya'), t: L('Slow or irregular pulse, fainting or dizziness on standing, repeated vomiting or diarrhoea, trouble breathing, seizures. In Costa Rica call 911.', 'Pulso lento o irregular, desmayo o mareo al ponerse de pie, vómito o diarrea repetidos, dificultad para respirar, convulsiones. En Costa Rica llame al 911.') },
      { k: 'ul', items: [
        L('Tell the doctor the fish, where and when it was caught, and when symptoms began. Many doctors have never seen ciguatera, and low awareness in the health sector is named as one reason it goes unreported here.{ucr}', 'Diga al médico qué pez, dónde y cuándo se pescó, y cuándo empezaron los síntomas. Muchos médicos nunca han visto ciguatera, y se señala el poco conocimiento del sector salud como una razón de que no se reporte aquí.{ucr}'),
        L('Costa Rica poison centre: 800-INTOXICA (800-4686-9422), given in a CCSS press note.{poison} Check the number is current before you rely on it.', 'Centro de control de intoxicaciones de Costa Rica: 800-INTOXICA (800-4686-9422), según un comunicado de la CCSS.{poison} Verifique que el número esté vigente antes de depender de él.'),
        L('Good practice, though no source states it: keep any leftover fish frozen and tell everyone who ate it. Tell the local health office what fish and place, so a case is counted.', 'Buena práctica, aunque ninguna fuente la indica: guarde congelado cualquier sobrante y avise a todos los que comieron. Informe a la oficina de salud local qué pez y qué lugar, para que el caso se cuente.'),
        L('For doctors and health workers: two or more people ill from the same food count as an outbreak, to be reported at once to the local health area of the Ministerio de Salud (forms VE-01 for one patient, VE-02 for a group). Ciguatera is not named as its own notifiable disease, but marine toxins fall under foodborne illness.{eta}', 'Para médicos y personal de salud: dos o más personas enfermas por el mismo alimento cuentan como brote, y se notifica de inmediato al área rectora de salud local del Ministerio de Salud (formularios VE-01 para un paciente, VE-02 para un grupo). La ciguatera no figura como enfermedad de notificación individual propia, pero las toxinas marinas entran en las enfermedades transmitidas por alimentos.{eta}'),
        L('Do not eat the rest of the fish, and do not feed it to pets.', 'No coma el resto del pescado ni se lo dé a mascotas.'),
        L('Until you are seen: drink water, rest, and avoid alcohol and caffeine.', 'Hasta que lo vean: tome agua, descanse y evite alcohol y cafeína.'),
      ] },
    ],
  },
  {
    id: 'here',
    title: L('Here: Gandoca to Limón', 'Aquí: Gandoca a Limón'),
    lede: L('No published cases for this coast. That is a gap in reporting, not proof of safety.', 'No hay casos publicados para esta costa. Es un vacío de reportes, no prueba de seguridad.'),
    blocks: [
      { k: 'warn', h: L('What we found', 'Lo que encontramos'), t: L('After searching in English and Spanish we found no published ciguatera case, outbreak, rate or fish toxin test for Limón, Cahuita, Puerto Viejo, Punta Uva, Manzanillo or Gandoca, and none for Bocas del Toro. A University of Costa Rica report (2021 to 2023) says "no information on ciguatera events is known" on the Caribbean side, and suggests one reason may be that the health sector does not know the illness. It also says monitoring there is very limited, and that more than six potentially ciguatoxin-producing algae species have been detected since 2022.{ucr}', 'Tras buscar en inglés y español no encontramos ningún caso, brote, tasa ni prueba de toxina en peces publicados para Limón, Cahuita, Puerto Viejo, Punta Uva, Manzanillo o Gandoca, ni para Bocas del Toro. Un informe de la Universidad de Costa Rica (2021 a 2023) dice que "no se conoce información sobre eventos de ciguatera" en el sector Caribe y sugiere que una razón puede ser el desconocimiento de la enfermedad por parte del sector salud. También dice que el monitoreo es muy limitado y que desde 2022 se han detectado más de seis especies de algas potencialmente productoras de ciguatoxinas.{ucr}') },
      { k: 'p', t: L('Elsewhere in the Caribbean only 2 to 10 percent of cases are reported (US figure), and in Miami-Dade 10 to 100 cases may go unreported for each one reported.{f08} Missing reports here most likely mean missing reporting.', 'En el resto del Caribe solo se reporta entre el 2 y el 10 por ciento de los casos (cifra de EE. UU.), y en Miami-Dade por cada caso reportado pueden quedar 10 a 100 sin reportar.{f08} Que falten reportes aquí probablemente significa que falta vigilancia.') },
      { k: 'h', t: L('Site by site (west to east)', 'Sitio por sitio (de oeste a este)') },
      { k: 'table', head: [L('Place', 'Lugar'), L('What is published', 'Lo publicado')], rows: [
        [L('Gandoca, Manzanillo, Punta Uva', 'Gandoca, Manzanillo, Punta Uva'), L('No ciguatera data. A 2013 fish die-off there was put down to natural causes, not ciguatera.{tico}', 'Sin datos de ciguatera. Una mortandad de peces en 2013 se atribuyó a causas naturales, no a ciguatera.{tico}')],
        [L('Punta Cocles, Puerto Viejo, Salsa Brava', 'Punta Cocles, Puerto Viejo, Salsa Brava'), L('No data found.', 'No se encontraron datos.')],
        [L('Cahuita, Punta Cahuita, Playa Negra', 'Cahuita, Punta Cahuita, Playa Negra'), L('No data found.', 'No se encontraron datos.')],
        [L('Limón, Isla Uvita', 'Limón, Isla Uvita'), L('No data found.', 'No se encontraron datos.')],
        [L('Bocas del Toro, Panama', 'Bocas del Toro, Panamá'), L('No cases or algae records found. A 2026 risk index (expert scores, not case data) scores the western Caribbean of Panama 2.65 and says clinical reports are few and incomplete.{pan}', 'No se encontraron casos ni registros de algas. Un índice de riesgo de 2026 (puntajes de expertos, no datos de casos) puntúa el Caribe occidental de Panamá con 2,65 y dice que los reportes clínicos son pocos e incompletos.{pan}')],
      ] },
      { k: 'h', t: L('Nearest reports', 'Reportes más cercanos') },
      { k: 'table', head: [L('Place', 'Lugar'), L('Report', 'Reporte')], rows: [
        [L('Belize, 2017', 'Belice, 2017'), L('At least 12 ill in August 2017 after eating barracuda from the Turneffe area, sold at Ladyville; the outbreak was declared over in October.{bz}', 'Al menos 12 enfermos en agosto de 2017 tras comer barracuda de la zona de Turneffe, vendida en Ladyville; el brote se declaró terminado en octubre.{bz}')],
        [L('Colombian Caribbean', 'Caribe colombiano'), L('Three outbreaks in a 1999 paper: 28 ill at Taganga after barracuda; 15 of 18 crew in Cartagena in 1984 after a 1.2 m barracuda; two families in 1994 after a 0.4 to 0.5 m medregal. No toxin was measured.{col}', 'Tres brotes en un artículo de 1999: 28 enfermos en Taganga por barracuda; 15 de 18 tripulantes en Cartagena en 1984 por una barracuda de 1,2 m; dos familias en 1994 por un medregal de 0,4 a 0,5 m. No se midió la toxina.{col}')],
        [L('Mexican Caribbean (Quintana Roo)', 'Caribe mexicano (Quintana Roo)'), L('163 cases from 1984 to 2013; in every outbreak the fish was barracuda.{mex}', '163 casos de 1984 a 2013; en todos los brotes el pez fue barracuda.{mex}')],
        [L('Cuba', 'Cuba'), L('Ciego de Ávila province, 1983 to 1998: 46 outbreaks, 305 cases, no deaths; barracuda was the most frequent fish.{cuba}', 'Provincia de Ciego de Ávila, 1983 a 1998: 46 brotes, 305 casos, sin muertes; la picúa fue el pez más frecuente.{cuba}')],
        [L('Guadeloupe, 2013 to 2016', 'Guadalupe, 2013 a 2016'), L('234 cases; jacks and amberjack were the most common fish (47 cases), barracuda 12.{gdl}', '234 casos; los jureles y medregales fueron los más comunes (47 casos), barracuda 12.{gdl}')],
        [L('St Eustatius, 2015', 'San Eustaquio, 2015'), L('8 crew ill after eating barracuda.{eust}', '8 tripulantes enfermos tras comer barracuda.{eust}')],
        [L('Nicaragua, 2025', 'Nicaragua, 2025'), L('First record of Gambierdiscus algae for the Nicaraguan Caribbean, at the Cayos Miskitos (samples from 2017 to 2019).{nic}', 'Primer registro de algas Gambierdiscus en el Caribe de Nicaragua, en los Cayos Miskitos (muestras de 2017 a 2019).{nic}')],
      ] },
      { k: 'h', t: L('Cases per 10,000 people per year', 'Casos por 10.000 personas por año') },
      { k: 'bars', cite: 'f08', rows: [
        { label: L('French Polynesia (1979 to 83)', 'Polinesia Francesa (1979 a 83)'), lo: 5850, note: L('Pacific hotspot', 'Foco del Pacífico') },
        { label: L('Marshall Islands (1982 to 83)', 'Islas Marshall (1982 a 83)'), lo: 2820 },
        { label: L('Culebra, Puerto Rico (2005 to 06)', 'Culebra, Puerto Rico (2005 a 06)'), lo: 73.6, hi: 169.5 },
        { label: L('Guadeloupe (1984)', 'Guadalupe (1984)'), lo: 30 },
        { label: L('Guadeloupe (2013 to 2016)', 'Guadalupe (2013 a 2016)'), lo: 1.5, note: L('same island, newer method{gdl}', 'misma isla, método más reciente{gdl}') },
        { label: L('US Virgin Islands (1982)', 'Islas Vírgenes de EE. UU. (1982)'), lo: 7.6, note: L('a later estimate is much higher{whoi}', 'una estimación posterior es mucho mayor{whoi}') },
        { label: L('Miami-Dade, Florida (1974 to 76)', 'Miami-Dade, Florida (1974 a 76)'), lo: 5 },
        { label: L('Costa Rica, Caribbean coast', 'Costa Rica, costa caribe'), lo: 0, none: L('No rate published', 'No hay tasa publicada') },
      ] },
      { k: 'p', t: L('Caribbean rates are far lower than the Pacific hotspots, but they run from about 1 to over a hundred per 10,000 and depend a lot on the method: Guadeloupe gave 30 in 1984 and 1.5 in 2013 to 2016. There is no rate for Costa Rica.', 'Las tasas del Caribe son mucho menores que las de los focos del Pacífico, pero van de cerca de 1 a más de cien por 10.000 y dependen mucho del método: Guadalupe dio 30 en 1984 y 1,5 en 2013 a 2016. No hay una tasa para Costa Rica.') },
      { k: 'h', t: L('Why a few kilometres matter', 'Por qué importan unos pocos kilómetros') },
      { k: 'p', t: L('Ciguatera is very local. Reviews of the field say that within about 3 km on one island, fish from one reef can be safe while neighbouring reefs are hotspots. A 2021 study of the algae in the US Virgin Islands measured marked differences in toxin between adjacent sites.{liefer} So a place with no reports is unknown, and a fish from one reef says little about another. Local knowledge of which fish and places have made people ill is the best guide we have for this coast.', 'La ciguatera es muy local. Las revisiones del tema dicen que a menos de unos 3 km en una misma isla, los peces de un arrecife pueden ser seguros mientras arrecifes vecinos son focos. Un estudio de 2021 sobre las algas en las Islas Vírgenes de EE. UU. midió diferencias marcadas de toxina entre sitios contiguos.{liefer} Un lugar sin reportes es desconocido, y un pez de un arrecife dice poco sobre otro. El conocimiento local de qué peces y lugares han enfermado a la gente es la mejor guía para esta costa.') },
    ],
  },
  {
    id: 'fish',
    title: L('Species and size', 'Especies y tamaño'),
    lede: L('How the published record ranks Caribbean fish. A tier is not a guarantee.', 'Cómo clasifica el registro publicado a los peces del Caribe. Un nivel no es una garantía.'),
    blocks: [
      { k: 'risk', rows: [
        { fish: L('Barracuda, picúa (Sphyraena barracuda)', 'Barracuda, picúa (Sphyraena barracuda)'), an: 'barracuda', lvl: 'never', word: L('NEVER EAT{cdc}', 'NUNCA COMER{cdc}'), ev: L('Every Mexican Caribbean outbreak 1984 to 2013;{mex} 12 of 234 Guadeloupe cases{gdl}', 'Todos los brotes del Caribe mexicano 1984 a 2013;{mex} 12 de 234 casos en Guadalupe{gdl}') },
        { fish: L('Moray eels, morenas (Gymnothorax)', 'Morenas (Gymnothorax)'), an: 'moray', lvl: 'never', word: L('NEVER EAT{cdc}', 'NUNCA COMER{cdc}'), ev: L('Small series', 'Series pequeñas') },
        { fish: L('Amberjack, medregal (Seriola)', 'Medregal, coronado (Seriola)'), lvl: 'high', word: L('HIGH', 'ALTO'), ev: L('Jacks and amberjack: 47 Guadeloupe cases', 'Jureles y medregal: 47 casos en Guadalupe') },
        { fish: L('Horse-eye jack, jurel ojón (Caranx latus)', 'Jurel ojón (Caranx latus)'), lvl: 'high', word: L('HIGH', 'ALTO'), ev: L('55 percent of 178 Guadeloupe and St Barth fish tested toxic; toxin rose with weight{stb}', '55 por ciento de 178 peces de Guadalupe y San Bartolomé dio tóxico; la toxina subió con el peso{stb}') },
        { fish: L('Yellow jack, bar jack, crevalle (Caranx bartholomaei, ruber, hippos)', 'Jurel amarillo, jurel, jurel común'), lvl: 'care', word: L('MODERATE TO HIGH', 'MODERADO A ALTO'), ev: L('Guadeloupe series;{gdl} nothing specific found for crevalle', 'Serie de Guadalupe;{gdl} nada específico para el jurel común') },
        { fish: L('Groupers, mero (Mycteroperca, Epinephelus), esp. large', 'Meros (Mycteroperca, Epinephelus), sobre todo grandes'), lvl: 'high', word: L('HIGH IF LARGE', 'ALTO SI ES GRANDE'), ev: L('15 Guadeloupe cases', '15 casos en Guadalupe') },
        { fish: L('Cubera and dog snapper (Lutjanus cyanopterus, jocu)', 'Pargo cubera y pargo perro'), lvl: 'high', word: L('HIGH', 'ALTO'), ev: L('Dog snapper cases in Guadeloupe and a Cuba traveller; cubera on agency lists only', 'Casos de pargo perro en Guadalupe y un viajero a Cuba; cubera solo en listas de agencias') },
        { fish: L('Schoolmaster (Lutjanus apodus)', 'Pargo gallego'), lvl: 'care', word: L('MODERATE', 'MODERADO'), ev: L('Guadeloupe cases', 'Casos en Guadalupe') },
        { fish: L('Mutton snapper, yellowtail (L. analis, Ocyurus)', 'Pargo criollo, rabirrubia'), lvl: 'low', word: L('LOW REPORTED', 'BAJO REPORTADO'), ev: L('Yellowtail "suspected, not established" in Guadeloupe; no mutton snapper source found', 'Rabirrubia "sospechado, no establecido" en Guadalupe; no hallamos fuente del pargo criollo') },
        { fish: L('King mackerel, carite (Scomberomorus cavalla), and cero (Scomberomorus regalis)', 'Carite, sierra (Scomberomorus cavalla), y carite chinigua (Scomberomorus regalis)'), lvl: 'care', word: L('MODERATE', 'MODERADO'), note: L('On agency lists', 'En listas de agencias'), ev: L('Agency lists; cero reports in FishBase;{fbcero} no size data for either', 'Listas de agencias; reportes del carite chinigua en FishBase;{fbcero} sin datos de talla para ninguno') },
        { fish: L('Hogfish, parrotfish', 'Boquinete, loros'), lvl: 'care', word: L('LOW TO MODERATE', 'BAJO A MODERADO'), note: L('Hogfish moderate, parrotfish low to moderate', 'Boquinete moderado, loros bajo a moderado'), ev: L('Agency lists;{cdc} no case series found', 'Listas de agencias;{cdc} no hallamos series de casos') },
        { fish: L('Lionfish, pez león (Pterois volitans)', 'Pez león (Pterois volitans)'), an: 'lionfish', lvl: 'care', word: L('LOW TO MODERATE', 'BAJO A MODERADO'), note: L('Toxin found, illness rare', 'Hay toxina, la enfermedad es rara'), ev: L('US Virgin Islands: about 12 percent of 153 fish above the US FDA level, about 40 percent had some toxin, size did not predict it; no illness reported to the FDA by 2013;{lion} one Guadeloupe case{gdl}', 'Islas Vírgenes de EE. UU.: cerca del 12 por ciento de 153 peces superó el nivel de la FDA, cerca del 40 por ciento tenía algo de toxina, el tamaño no lo predijo; ninguna enfermedad reportada a la FDA hasta 2013;{lion} un caso en Guadalupe{gdl}') },
        { fish: L('Mahi-mahi, dorado', 'Dorado'), lvl: 'none', word: L('NOT ESTABLISHED', 'NO ESTABLECIDO'), note: L('Scombroid risk: ice it', 'Riesgo escombroide: póngale hielo'), ev: L('"Suspected, not established" in Guadeloupe', '"Sospechado, no establecido" en Guadalupe') },
        { fish: L('Wahoo, peto (Acanthocybium solandri)', 'Peto (Acanthocybium solandri)'), lvl: 'low', word: L('RARE REPORTS', 'REPORTES RAROS'), ev: L('The Canary Islands test wahoo over 30 kg before sale;{can} no size link known. Chill it fast (scombroid)', 'Las Islas Canarias analizan los petos de más de 30 kg antes de venderlos;{can} no se conoce relación con la talla. Enfríelo rápido (escombroide)') },
        { fish: L('Tunas, atún; Spanish mackerel, macarela', 'Atunes; macarela'), lvl: 'none', word: L('NONE REPORTED', 'NINGUNO REPORTADO'), ev: L('Pelagic fish are rarely reported. Chill them fast (scombroid)', 'Los peces pelágicos rara vez se reportan. Enfríelos rápido (escombroide)') },
      ] },
      { k: 'p', t: L('The FDA lists amberjack, barracuda, moray eels, groupers, hogfish, jacks, snappers, king mackerel, parrotfish and queen triggerfish as ciguatera risks. Mahi-mahi and wahoo are not on its ciguatera list.{fda}', 'La FDA lista medregal, barracuda, morenas, meros, boquinete, jureles, pargos, carite, loros y pez ballesta reina como riesgos de ciguatera. El dorado y el peto no están en su lista de ciguatera.{fda}') },
      { k: 'h', t: L('Size: what the record says', 'Tamaño: lo que dice el registro') },
      { k: 'ul', items: [
        L('Avoid reef fish over about 5 lb (2.3 kg).{cdc} That is a rule of thumb, not a measured safe limit: FDA guidance gives no size cutoff and says fish caught side by side can differ widely in toxin.{fda}', 'Evitar peces de arrecife de más de unas 5 lb (2,3 kg).{cdc} Es una regla práctica, no un límite seguro medido: la guía de la FDA no da un tamaño de corte y dice que peces capturados lado a lado pueden diferir mucho en toxina.{fda}'),
        L('A 2022 French Polynesia study of five species found toxic fish were on average larger, but age did not predict it and toxic fish came in a wide range of sizes. The authors wrote that eating small or low-weight fish "remains risky".{pol}', 'Un estudio de 2022 en la Polinesia Francesa con cinco especies halló que los peces tóxicos eran en promedio más grandes, pero la edad no lo predijo y los tóxicos tenían tallas muy variadas. Los autores escribieron que comer peces pequeños o de poco peso "sigue siendo riesgoso".{pol}'),
        L('In a US Virgin Islands study of 77 reef fish, heavier and longer fish had modestly higher toxin, but the authors say the samples were too small for size conclusions, and fish from one wave-exposed site had none at any size.{loef}', 'En un estudio de 77 peces de arrecife en las Islas Vírgenes de EE. UU., los peces más pesados y largos tuvieron algo más de toxina, pero los autores dicen que las muestras eran demasiado pequeñas para concluir sobre el tamaño, y los peces de un sitio expuesto al oleaje no tuvieron toxina de ningún tamaño.{loef}'),
        L('Caribbean data are thin. In a Guadeloupe and St Barthélemy series of 178 fish, 75 percent were not toxic and a link between weight and toxin was significant only for horse-eye jack and snappers.{stb} In US Virgin Islands lionfish there was no link.{lion}', 'Los datos del Caribe son escasos. En una serie de 178 peces de Guadalupe y San Bartolomé, el 75 por ciento no fue tóxico y la relación entre peso y toxina fue significativa solo para el jurel ojón y los pargos.{stb} En el pez león de las Islas Vírgenes no hubo relación.{lion}'),
      ] },
      { k: 'h', t: L('Size to keep, fish by fish', 'Tamaño para quedarse, pez por pez') },
      { k: 'p', t: L('These are the sizes the fish map, the forecast and the species guide use. Keeping a fish under its size lowers the risk but does not make it safe. Sizes marked as an estimate are our research\'s best guess; the others are the weights above which Cuba bans the fish for sale because of ciguatera.{cu19}', 'Estos son los tamaños que usan el mapa de pesca, el pronóstico y la guía de especies. Quedarse con un pez por debajo de su tamaño baja el riesgo pero no lo hace seguro. Los marcados como estimación son la mejor aproximación de nuestra investigación; los demás son los pesos sobre los cuales Cuba prohíbe vender el pez por la ciguatera.{cu19}') },
      { k: 'sizes', kinds: ['jack', 'snapper', 'grouper', 'grunt', 'mackerel', 'kingfish', 'silksnapper', 'pompano', 'permit'] },
      { k: 'h', t: L('A rule you may hear, checked', 'Una regla que se oye, revisada') },
      { k: 'graded', rows: [
        { item: L('"The bigger the fish, the higher the risk"', '"Entre más grande el pez, mayor el riesgo"'), grade: 'weak', note: L('True on average for some species, weakly. It is why a size limit is suggested.{cdc}', 'Cierto en promedio para algunas especies, débilmente. Por eso se sugiere un límite de talla.{cdc}') },
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
      { k: 'fig', fig: 'cgTime', label: L('When each kind of symptom shows up after eating the fish, from hours to months.', 'Cuándo aparece cada tipo de síntoma tras comer el pescado, de horas a meses.'), tones: ['warn', 'warn', 'warn', 'stop', 'grey'], marks: [
        L('Stomach: nausea, vomiting, diarrhoea and cramps, from 3 to 6 hours after the meal (up to about 30). They fade in 1 to 4 days.{f17}', 'Estómago: náuseas, vómitos, diarrea y cólicos, de 3 a 6 horas tras la comida (hasta unas 30). Ceden en 1 a 4 días.{f17}'),
        L('Tingling or numbness of the lips, tongue, hands and feet, from a few hours to 2 days in.{cdc}', 'Hormigueo o adormecimiento de labios, lengua, manos y pies, de unas horas a 2 días después.{cdc}'),
        L('Hot and cold feel reversed, often from day 1 to a few days in.', 'Lo frío y lo caliente se sienten al revés, a menudo del día 1 a unos días después.'),
        L('Heart: a slow pulse, low blood pressure or fainting in the first days. This is the dangerous part. Go to hospital.{cdc}', 'Corazón: pulso lento, presión baja o desmayo en los primeros días. Es la parte peligrosa. Vaya al hospital.{cdc}'),
        L('Tiredness, itching and aches can last weeks to months.{f08}', 'El cansancio, la picazón y los dolores pueden durar semanas o meses.{f08}'),
      ] },
      { k: 'table', head: [L('When', 'Cuándo'), L('What', 'Qué')], rows: [
        [L('3 to 6 hours (up to about 30) after the meal', 'De 3 a 6 horas (hasta unas 30) tras la comida'), L('Nausea, vomiting, diarrhoea, stomach cramps. In the Caribbean these usually come first and fade in 1 to 4 days.{f17}', 'Náuseas, vómitos, diarrea, cólicos. En el Caribe suelen venir primero y ceden en 1 a 4 días.{f17}')],
        [L('Hours to 2 days', 'De horas a 2 días'), L('Tingling or numbness of lips, tongue, hands and feet; itching; muscle and joint pain; headache; tooth or jaw pain; a metallic taste.{cdc}', 'Hormigueo o adormecimiento de labios, lengua, manos y pies; picazón; dolor muscular y articular; dolor de cabeza; dolor de dientes o mandíbula; sabor metálico.{cdc}')],
        [L('Often day 1 to a few days', 'A menudo del día 1 a unos días'), L('Temperature reversal: cold things feel hot, burning or like an electric shock; the tongue can feel burnt. A hallmark, but not everyone gets it.', 'Inversión de la temperatura: lo frío se siente caliente, quema o da descarga; la lengua puede sentirse quemada. Es una señal típica, pero no todos la tienen.')],
        [L('Any time in the first days', 'En cualquier momento de los primeros días'), L('Slow pulse, low blood pressure, faintness. This is the dangerous part. Heart block is listed.{cdc}', 'Pulso lento, presión baja, desmayo. Esta es la parte peligrosa. Se menciona el bloqueo cardiaco.{cdc}')],
        [L('Weeks to months', 'Semanas a meses'), L('Fatigue, itching, aching, mood and memory changes. Most recover within months. Symptoms "for years" are reported, but after a year doctors are told to look for other causes.{f08}', 'Fatiga, picazón, dolores, cambios de ánimo y memoria. La mayoría se recupera en meses. Se reportan síntomas "por años", pero pasado un año se indica buscar otras causas.{f08}')],
      ] },
      { k: 'h', t: L('How often each symptom is reported', 'Con qué frecuencia se reporta cada síntoma') },
      { k: 'range', cite: 'f17', key: L('Out of every 100 patients, how many had it. Each bar runs from the lowest to the highest count in different studies, so the numbers are approximate.', 'De cada 100 pacientes, cuántos lo tuvieron. Cada barra va del conteo más bajo al más alto en distintos estudios, así que los números son aproximados.'), rows: [
        { label: L('Diarrhoea', 'Diarrea'), lo: 44, hi: 83 },
        { label: L('Vomiting', 'Vómitos'), lo: 28, hi: 69 },
        { label: L('Nausea', 'Náuseas'), lo: 17, hi: 82 },
        { label: L('Tingling of hands and feet', 'Hormigueo de manos y pies'), lo: 36, hi: 100 },
        { label: L('Hot and cold reversed', 'Frío y calor al revés'), lo: 16, hi: 94 },
        { label: L('Muscle pain', 'Dolor muscular'), lo: 12, hi: 86 },
        { label: L('Itching', 'Picazón'), lo: 5, hi: 77 },
        { label: L('Slow pulse', 'Pulso lento'), lo: 3, hi: 75, stop: true },
        { label: L('Low blood pressure', 'Presión baja'), lo: 8, hi: 43, stop: true },
      ] },
      { k: 'h', t: L('Good to know', 'Bueno saber') },
      { k: 'ul', items: [
        L('Caribbean ciguatoxin is a different molecule from the Pacific one and is believed to be less acutely potent. Caribbean cases tend to start with the gut; Pacific cases lean to nerve symptoms.{f08}{c16}', 'La ciguatoxina del Caribe es una molécula distinta de la del Pacífico y se cree menos potente en lo agudo. Los casos del Caribe tienden a empezar con el estómago; los del Pacífico, con síntomas nerviosos.{f08}{c16}'),
        L('Death is rare, under 0.1 percent.{cdc} A review of fatal cases counted about 26 deaths worldwide from its table, most in the Pacific and about 6 in the Caribbean, marked by seizures and coma.{c16}', 'La muerte es rara, menos del 0,1 por ciento.{cdc} Una revisión de casos fatales contó unas 26 muertes en el mundo según su tabla, la mayoría en el Pacífico y unas 6 en el Caribe, con convulsiones y coma.{c16}'),
        L('Relapse: symptoms can flare again weeks or months later. Patients report alcohol, caffeine, nuts, fish, exertion and dehydration as triggers. These come from patient reports and expert opinion, not controlled studies.{f17}', 'Recaídas: los síntomas pueden reaparecer semanas o meses después. Los pacientes reportan alcohol, cafeína, nueces, pescado, esfuerzo y deshidratación como detonantes. Vienen de reportes de pacientes y opinión de expertos, no de estudios controlados.{f17}'),
        L('A few cases of passing it to a baby through breast milk or to a partner are reported.{f17} Pregnant and nursing women should be extra careful.', 'Hay pocos casos de transmisión al bebé por la leche o a la pareja.{f17} Las mujeres embarazadas o lactantes deben tener cuidado extra.'),
        L('Everyone who ate the same fish can be affected, to different degrees. Tell them.', 'Todos los que comieron el mismo pescado pueden verse afectados, en distinto grado. Avíseles.'),
      ] },
    ],
  },
  {
    id: 'treatment',
    title: L('Treatment and remedies', 'Tratamiento y remedios'),
    lede: L('No antidote exists. Doctors treat the symptoms while the body clears the toxin. Here is how strong the evidence is for each thing people try.', 'No existe antídoto. Los médicos tratan los síntomas mientras el cuerpo elimina la toxina. Aquí, qué tan sólida es la evidencia de cada cosa que la gente prueba.'),
    blocks: [
      { k: 'aid', h: L('The honest summary', 'El resumen honesto'), t: L('There is no specific antidote.{cdc} Doctors treat the symptoms: fluids, drugs for nausea, watching the heart, and medicines for nerve pain and itch.{f17} Time is what clears the toxin.', 'No hay antídoto específico.{cdc} Los médicos tratan los síntomas: líquidos, medicinas contra la náusea, vigilancia del corazón y medicinas para el dolor nervioso y la picazón.{f17} El tiempo es lo que elimina la toxina.') },
      { k: 'h', t: L('In hospital', 'En el hospital') },
      { k: 'graded', rows: [
        { item: L('For vomiting and dehydration: a drip of fluids and anti-nausea drugs', 'Para vómitos y deshidratación: suero por la vena y medicinas contra la náusea'), grade: 'expert', note: L('What hospitals normally do to keep you well while the toxin clears.{cdc}', 'Lo que los hospitales hacen normalmente para mantenerlo bien mientras se elimina la toxina.{cdc}') },
        { item: L('For a dangerously slow pulse: atropine', 'Para un pulso peligrosamente lento: atropina'), grade: 'expert', note: L('Given in hospital when a slow heartbeat causes dizziness or fainting.{f17}', 'Se da en el hospital cuando un latido lento causa mareo o desmayo.{f17}') },
        { item: L('To try to calm nerve symptoms early: mannitol, given as a drip', 'Para intentar calmar los síntomas nerviosos al inicio: manitol, por goteo en la vena'), grade: 'weak', note: L('Early reports, where doctors knew who got it, looked good. The one careful trial, where neither patients nor doctors knew who got it (50 patients), found it worked no better than a salt-water drip.{schn} Experts still call it reasonable early on if the patient is stable.{mh17} It is mentioned for the first 48 hours, and only once the patient has had enough fluids.{cdc}', 'Los primeros reportes, donde los médicos sabían quién lo recibía, parecían buenos. El único ensayo cuidadoso, donde ni pacientes ni médicos sabían quién lo recibía (50 pacientes), halló que no funcionó mejor que un suero de agua con sal.{schn} Los expertos aún lo consideran razonable al inicio si el paciente está estable.{mh17} Se menciona para las primeras 48 horas, y solo cuando el paciente ya recibió suficientes líquidos.{cdc}') },
        { item: L('For tingling, itch and headache: amitriptyline', 'Para hormigueo, picazón y dolor de cabeza: amitriptilina'), grade: 'case', note: L('Doctors have reported it helping single patients; it has not been tested in a trial.{f17}', 'Los médicos han reportado que ayudó a pacientes sueltos; no se ha probado en un ensayo.{f17}') },
        { item: L('For burning nerve pain: gabapentin or pregabalin', 'Para el dolor nervioso que quema: gabapentina o pregabalina'), grade: 'case', note: L('Reported in single patients only.', 'Reportado solo en pacientes sueltos.') },
        { item: L('For tiredness that lasts: fluoxetine', 'Para el cansancio que no se va: fluoxetina'), grade: 'case', note: L('Reported in single patients only.', 'Reportado solo en pacientes sueltos.') },
        { item: L('For itch: antihistamines. For headache: nifedipine', 'Para la picazón: antihistamínicos. Para el dolor de cabeza: nifedipino'), grade: 'case', note: L('Reported in single patients only.', 'Reportado solo en pacientes sueltos.') },
        { item: L('To soak up toxin still in the stomach: activated charcoal', 'Para atrapar la toxina que aún está en el estómago: carbón activado'), grade: 'expert', note: L('Suggested only for people seen in the first hours who are not vomiting. We found no evidence for taking it days or weeks later.{cdc}{f17}', 'Se sugiere solo para quienes llegan en las primeras horas y no vomitan. No hallamos evidencia para tomarlo días o semanas después.{cdc}{f17}') },
      ] },
      { k: 'h', t: L('Advice you hear on forums, checked', 'Consejos de foros, revisados') },
      { k: 'graded', rows: [
        { item: L('"Time is the biggest healer"', '"El tiempo es el mejor sanador"'), grade: 'strong', note: L('Symptoms clear over days to months.{cdc}{f17}', 'Los síntomas ceden en días a meses.{cdc}{f17}') },
        { item: L('"Recovery takes weeks to a year"', '"La recuperación toma de semanas a un año"'), grade: 'weak', note: L('Weeks to months is typical; years are rare and should prompt a look for other causes.', 'Lo típico son semanas a meses; años es raro y debe llevar a buscar otras causas.') },
        { item: L('"Symptoms can come back years later"', '"Los síntomas pueden volver años después"'), grade: 'weak', note: L('Reported in patients; not well studied.', 'Reportado en pacientes; poco estudiado.') },
        { item: L('"Dehydration makes all symptoms worse"', '"La deshidratación empeora todos los síntomas"'), grade: 'weak', note: L('Dehydration is a cause of death and a reported trigger; "all symptoms" is unproven. Drinking fluids is sensible.', 'La deshidratación es causa de muerte y un detonante reportado; "todos los síntomas" no está probado. Tomar líquidos es sensato.') },
        { item: L('"Take activated charcoal as much as you can"', '"Tome carbón activado todo lo que pueda"'), grade: 'against', note: L('Only early use is mentioned in the sources. Repeated use later is unsupported, and charcoal can interfere with medicines and bowel function.', 'Las fuentes solo mencionan el uso temprano. El uso repetido después no tiene respaldo, y el carbón puede interferir con medicinas y con el intestino.') },
        { item: L('"Try cholestyramine if you do not improve"', '"Pruebe colestiramina si no mejora"'), grade: 'none', note: L('No controlled trial. It has been reported only in a small uncontrolled report of 10 people (a 2000 press release).{news} It does not appear in the main clinical guidance. Ask a doctor; it is a prescription drug.', 'Sin ensayo controlado. Solo se ha reportado en un informe pequeño sin control de 10 personas (un comunicado de prensa de 2000).{news} No aparece en las guías clínicas principales. Consulte a un médico; es un fármaco de receta.') },
        { item: L('"Ciguatoxin is stored in fat, so avoid weight gain"', '"La ciguatoxina se almacena en la grasa, evite subir de peso"'), grade: 'none', note: L('Fat storage is only a hypothesis; no weight advice found.{f17}', 'El almacenamiento en grasa es solo una hipótesis; no hallamos consejos de peso.{f17}') },
        { item: L('"Try saunas"', '"Pruebe saunas"'), grade: 'none', note: L('Nothing found in the medical sources. Heat can worsen dehydration.', 'Nada en las fuentes médicas. El calor puede empeorar la deshidratación.') },
        { item: L('Vitamins, lidocaine, steroids', 'Vitaminas, lidocaína, esteroides'), grade: 'none', note: L('No supporting evidence found.', 'No hallamos evidencia a favor.') },
        { item: L('Pacific plant remedies (Argusia, Heliotropium and others)', 'Remedios de plantas del Pacífico (Argusia, Heliotropium y otras)'), grade: 'none', note: L('There is no scientific evidence they are safe or effective.{f08}', 'No hay evidencia científica de que sean seguros o eficaces.{f08}') },
      ] },
    ],
  },
  {
    id: 'recovery',
    title: L('Recovery: what to avoid', 'Recuperación: qué evitar'),
    lede: L('Advice is expert opinion. No controlled study has tested it.', 'El consejo es opinión de expertos. Ningún estudio controlado lo ha probado.'),
    blocks: [
      { k: 'table', head: [L('Avoid', 'Evite'), L('For how long (source)', 'Por cuánto tiempo (fuente)')], rows: [
        [L('Alcohol', 'Alcohol'), L('At least 6 months.{cdc} Some reviews say 3 to 6 months or until symptoms resolve.{f17}', 'Al menos 6 meses.{cdc} Algunas revisiones dicen 3 a 6 meses o hasta que cedan los síntomas.{f17}')],
        [L('Caffeine', 'Cafeína'), L('Same as alcohol. Patients report it triggers flares.', 'Igual que el alcohol. Los pacientes reportan que provoca brotes.')],
        [L('Nuts', 'Nueces y frutos secos'), L('Listed as something to avoid;{cdc} reviews list nuts and nut oils among reported triggers.{f17}', 'Figuran entre lo que se debe evitar;{cdc} las revisiones listan nueces y sus aceites entre los detonantes reportados.{f17}')],
        [L('Fish and seafood', 'Pescado y mariscos'), L('Listed as something to avoid, with the same time frame.{cdc} Any fish, even freshwater, is reported as a trigger for some patients.{f17}', 'Figura entre lo que se debe evitar, con el mismo plazo.{cdc} Se reporta cualquier pescado, incluso de agua dulce, como detonante en algunos pacientes.{f17}')],
        [L('Other things reported by patients', 'Otras cosas reportadas por pacientes'), L('Chicken, pork, hard exertion and dehydration are reported triggers.{f17} Spicy food and sunlight: no source found, unproven.', 'Pollo, cerdo, esfuerzo intenso y deshidratación figuran como detonantes reportados.{f17} Comida picante y sol: no hay fuente, sin probar.')],
      ] },
      { k: 'ul', items: [
        L('Keep drinking water. Dehydration is the usual route to a serious case.', 'Siga tomando agua. La deshidratación es la vía habitual a un caso grave.'),
        L('Nothing here has been proven to speed recovery. Rest and time are what the sources describe.', 'Nada de esto está probado para acelerar la recuperación. Las fuentes describen descanso y tiempo.'),
        L('If symptoms flare, think of what you ate or drank in the last day and tell your doctor.', 'Si los síntomas reaparecen, piense en lo que comió o bebió el último día y dígalo a su médico.'),
      ] },
    ],
  },
];

/** A source behind a superscript number. `p` (internal, never shown): P read in full, S abstract or search summary only. */
export interface Source { t: string; u?: string; p: 'P' | 'S'; what: L }
export const SOURCES: Record<string, Source> = {
  cdc: { t: 'CDC Yellow Book: Food Poisoning from Marine Toxins', u: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/food-poisoning-from-marine-toxins.html', p: 'P', what: L('Size, never barracuda or moray, toxin location, cooking, no antidote, avoid list, death under 0.1%.', 'Talla, nunca barracuda ni morena, ubicación de la toxina, cocción, sin antídoto, lista de evitar, muerte menor a 0,1%.') },
  f17: { t: 'Friedman et al. 2017, An Updated Review of Ciguatera Fish Poisoning, Mar Drugs 15(3):72', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5367029/', p: 'P', what: L('Symptoms and frequencies, treatments, relapse triggers (first part read).', 'Síntomas y frecuencias, tratamientos, detonantes de recaída (primera parte leída).') },
  f08: { t: 'Friedman et al. 2008, Ciguatera Fish Poisoning: Treatment, Prevention and Management, Mar Drugs 6(3):456', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2579736/', p: 'P', what: L('Mannitol, remedies, duration, incidence table and under-reporting.', 'Manitol, remedios, duración, tabla de incidencia y subregistro.') },
  c16: { t: 'Chan 2016, Fatal Ciguatera Fish Poisoning, Am J Trop Med Hyg 94(4):704', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4824207', p: 'P', what: L('Deaths and what they had in common.', 'Muertes y lo que tenían en común.') },
  schn: { t: 'Schnorf et al. 2002, Ciguatera fish poisoning: a double-blind randomized trial of mannitol, Neurology 58:873', u: 'https://www.qxmd.com/r/11914401', p: 'S', what: L('Mannitol no better than saline.', 'Manitol no mejor que suero salino.') },
  mh17: { t: 'Mullins and Hoffman 2017, Is mannitol the treatment of choice for ciguatera?, Clin Toxicol 55:947', u: 'https://read.qxmd.com/read/28535116/is-mannitol-the-treatment-of-choice-for-patients-with-ciguatera-fish-poisoning', p: 'S', what: L('Review of the mannitol evidence.', 'Revisión de la evidencia del manitol.') },
  gdl: { t: 'Boucaud-Maitre et al. 2018, Ciguatera in Guadeloupe 2013 to 2016, Sci Rep 8:3095', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5814543', p: 'P', what: L('234 cases and the fish involved.', '234 casos y los peces implicados.') },
  mex: { t: 'Nunez-Vazquez et al., Ciguatera in Mexico 1984 to 2013, Mar Drugs', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6356608', p: 'P', what: L('Barracuda in all Caribbean outbreaks; 163 cases.', 'Barracuda en todos los brotes del Caribe; 163 casos.') },
  lion: { t: 'Robertson et al. 2013, Invasive lionfish and ciguatera, Mar Drugs 12:88', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3917262', p: 'P', what: L('Toxin in US Virgin Islands lionfish.', 'Toxina en el pez león de las Islas Vírgenes de EE. UU.') },
  pol: { t: 'Darius et al. 2022, Age and growth vs ciguatoxicity, French Polynesia, Mar Drugs 20:251', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9027493/', p: 'P', what: L('Size and age against toxicity; small fish stay risky.', 'Talla y edad frente a toxicidad; los peces pequeños siguen siendo riesgosos.') },
  whoi: { t: 'Woods Hole Oceanographic Institution: Ciguatera Fish Poisoning', u: 'https://www.whoi.edu/science/B/redtide/illness/ciguatera_fish_poisoning.html', p: 'P', what: L('US Virgin Islands rates and under-reporting.', 'Tasas en las Islas Vírgenes y subregistro.') },
  ucr: { t: 'Vargas (University of Costa Rica), ANCA-IOCARIBE Costa Rica report 2021 to 2023', u: 'https://oceanexpert.net/downloadFile/55043', p: 'P', what: L('No known ciguatera events on the Caribbean side; algae detected; limited monitoring.', 'Sin eventos de ciguatera conocidos en el Caribe; algas detectadas; monitoreo limitado.') },
  pan: { t: 'Yepes, Seixas and Aparicio 2026, ciguatera risk index for Panama, Revista Colegiada de Ciencia 7(2)', u: 'https://revistas.up.ac.pa/index.php/revcolciencia/article/download/9704/7137/22785', p: 'P', what: L('Expert-scored risk; few Panamanian clinical reports.', 'Riesgo según expertos; pocos reportes clínicos en Panamá.') },
  tico: { t: 'Tico Times 2013, natural causes likely behind fish deaths on the Caribbean coast', u: 'https://ticotimes.net/2013/10/04/natural-causes-likely-to-blame-for-mass-fish-deaths-on-costa-rica-s-caribbean-coast', p: 'S', what: L('Not ciguatera; context for Gandoca to Punta Uva.', 'No es ciguatera; contexto de Gandoca a Punta Uva.') },
  bz: { t: 'San Pedro Sun and Amandala 2017, suspected ciguatera poisoning linked to Turneffe barracuda, Belize', u: 'https://amandala.com.bz/news/ciguatera-poisoning-linked-turneffe-barracudas', p: 'S', what: L('Ministry of Health alerts: at least 12 ill, declared over in October.', 'Alertas del Ministerio de Salud: al menos 12 enfermos, declarado terminado en octubre.') },
  col: { t: 'Alvarez 1999, Tres brotes de ictiosarcotoxicosis por Sphyraena barracuda y Seriola zonata en el Caribe de Colombia, Biomedica 19(1):35-38', u: 'https://revistabiomedica.org/index.php/biomedica/article/download/1005/1120/4626', p: 'P', what: L('Three outbreaks, with fish sizes; no toxin assay.', 'Tres brotes, con tamaños de los peces; sin ensayo de toxina.') },
  cuba: { t: 'Ciguatera outbreaks in Ciego de Avila province 1983 to 1998, Rev Cubana Hig Epidemiol 2001;39(3):164-171', u: 'https://doaj.org/article/f4d673409dcb4b9dad11afba305c1281', p: 'S', what: L('46 outbreaks and 305 cases; barracuda most frequent.', '46 brotes y 305 casos; la picúa fue lo más frecuente.') },
  nic: { t: 'Presencia y abundancia de Gambierdiscus sp en Cayos Miskitos (RACCN), Revista del Agua, UNAN-Managua, 2025', u: 'https://revistas.unan.edu.ni/index.php/RevAgua/article/download/5095/7736/32573', p: 'S', what: L('First Gambierdiscus report for the Nicaraguan Caribbean; algae only, no cases.', 'Primer registro de Gambierdiscus para el Caribe de Nicaragua; solo algas, sin casos.') },
  liefer: { t: 'Liefer et al. 2021, Asynchrony of Gambierdiscus spp. Abundance and Toxicity in the U.S. Virgin Islands, Toxins 13(6):413', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8230442', p: 'P', what: L('Marked toxin differences between adjacent sites; introduction states the 3 km hotspot idea from earlier work.', 'Diferencias marcadas de toxina entre sitios contiguos; la introducción cita la idea de focos a 3 km de trabajos previos.') },
  stb: { t: 'Evaluation of Antilles fish ciguatoxicity by mouse and chick bioassays, Bull Soc Pathol Exot 2003;96(1):24-28', p: 'S', what: L('178 fish of 26 species, Guadeloupe and St Barthelemy 1993 to 1999; weight link only for horse-eye jack and snappers.', '178 peces de 26 especies, Guadalupe y San Bartolomé 1993 a 1999; relación con el peso solo en jurel ojón y pargos.') },
  kits: { t: 'Dickey, Granade and McClure 1994, Ciguatect test kit on 50 Caribbean fish (US FDA); Bienfang et al. 2011 on Cigua-Check', u: 'https://archive.org/download/biostor-260266/biostor-260266.pdf', p: 'P', what: L('False negatives 50 to 82 percent and false positives 33 to 44 percent for one kit; poor reader agreement for the other; neither is sold now.', 'Falsos negativos de 50 a 82 por ciento y falsos positivos de 33 a 44 por ciento en un kit; poca concordancia entre lectores en el otro; ninguno se vende hoy.') },
  news: { t: 'Newswise: Diagnosis and treatment of ciguatera poisoning (press release)', u: 'https://www.newswise.com/articles/diagnosis-and-treatment-of-ciguatera-poisoning', p: 'S', what: L('The only cholestyramine item found.', 'El único dato de colestiramina hallado.') },
  poison: { t: 'Caja Costarricense de Seguro Social press note giving the Centro Nacional de Control de Intoxicaciones line', u: 'https://www.ccss.sa.cr/noticia?v=400972302605', p: 'S', what: L('Source of 800-INTOXICA.', 'Fuente de 800-INTOXICA.') },
  fda: { t: 'US FDA, Fish and Fishery Products Hazards and Controls Guidance, chapter 6 and table 3-2', u: 'https://www.fda.gov/media/80637/download', p: 'P', what: L('Species flagged for ciguatera; no size cutoff; guidance level 0.1 ug/kg C-CTX-1 equivalents.', 'Especies señaladas por ciguatera; sin tamaño de corte; nivel guía 0,1 ug/kg equivalentes de C-CTX-1.') },
  loef: { t: 'Loeffler et al. 2018, ciguatoxins in US Virgin Islands reef fish, Environ Toxicol Chem 37:1852', u: 'https://repository.library.noaa.gov/view/noaa/59571/noaa_59571_DS1.pdf', p: 'P', what: L('77 fish; weight and toxin weakly related; samples too small for size conclusions.', '77 peces; peso y toxina relacionados débilmente; muestras demasiado pequeñas para concluir sobre el tamaño.') },
  eta: { t: 'Ministerio de Salud, Protocolo nacional para la vigilancia de enfermedades transmitidas por alimentos y agua, version 2, April 2026', u: 'https://ministeriodesalud.go.cr/index.php/biblioteca-de-archivos-left/documentos-ministerio-de-salud/vigilancia-de-la-salud/normas-protocolos-guias-y-lineamientos/enfermedades-transmitidas-por-alimentos-y-agua/vigilancia-eta/7205-protocolo-nacional-para-la-vigilancia-de-enfermedades-transmitidas-por-alimentos-y-agua/file', p: 'P', what: L('Marine toxins count as foodborne illness; ciguatera named once as an example; outbreak and form rules.', 'Las toxinas marinas cuentan como enfermedad transmitida por alimentos; la ciguatera se nombra una vez como ejemplo; reglas de brote y formularios.') },
  cu19: { t: 'Díaz-Asencio et al. 2019, Ciguatoxin Occurrence in Food-Web Components of a Cuban Coral Reef Ecosystem, Toxins 11(12):722, Table 1', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6950047', p: 'S', what: L('Cuban weight limits for selling fish because of ciguatera.', 'Límites de peso de Cuba para vender pescado por la ciguatera.') },
  can: { t: 'Acosta Arbelo 2020, Ciguatera, de enfermedad exótica a endémica en Canarias, Real Academia de Ciencias Veterinarias de España', u: 'https://racve.es/files/2020/11/Conferencia-ciguatera.pdf', p: 'S', what: L('Canary Islands rules, including testing large wahoo before sale.', 'Normas de Canarias, incluido el análisis de petos grandes antes de la venta.') },
  fbcero: { t: 'FishBase: Scomberomorus regalis', u: 'https://www.fishbase.se/summary/Scomberomorus-regalis.html', p: 'S', what: L('Ciguatera reports for cero.', 'Reportes de ciguatera en el carite chinigua.') },
  eust: { t: 'Ciguatera outbreak on a ship at St Eustatius, 2015, Western Pacific Surveillance and Response Journal 2018', u: 'https://ojs.wpro.who.int/ojs/index.php/wpsar/article/view/443/858', p: 'S', what: L('8 crew ill after eating barracuda.', '8 tripulantes enfermos tras comer barracuda.') },
};
