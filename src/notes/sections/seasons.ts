import type { Section } from '../content';

const L = (en: string, es: string) => ({ en, es });

export const seasons: Section = {
  id: 'seasons',
  title: L('Seasons', 'Temporadas'),
  lede: L(
    'Which local fish are running or good each month, plus the lobster closure and turtle nesting.',
    'Qué peces locales andan o están buenos cada mes, además de la veda de langosta y la anidación de tortugas.',
  ),
  blocks: [
    { k: 'h', t: L('How to read this', 'Cómo leer esto') },
    { k: 'p', t: L('Each row is a month. "Best" means the app rates that fish at its peak that month. "Good" means a fair month, and "slower" means a quieter month, not a closed one. These ratings are the app\'s own rules of thumb for the Caribbean coast, not counts of fish caught, so use them as a guide and ask local fishers.{app}', 'Cada fila es un mes. "Mejor" significa que la app califica ese pez en su punto más alto ese mes. "Bueno" es un mes regular y "más lento" es un mes más tranquilo, no cerrado. Estas calificaciones son reglas prácticas de la app para el Caribe, no conteos de peces capturados, así que úselas como guía y pregunte a los pescadores locales.{app}') },
    { k: 'table', head: [L('Month', 'Mes'), L('Rain', 'Lluvia'), L('Line fishing', 'Pesca con línea'), L('Closed or nesting', 'Veda o anidación')], rows: [
      [L('Jan', 'Ene'), L('Wetter', 'Más lluvia'), L('Best: pargo (snapper). Good: jurel (jack). Slower: róbalo (snook).', 'Mejor: pargo. Bueno: jurel. Más lento: róbalo.'), L('Lobster open.', 'Langosta abierta.')],
      [L('Feb', 'Feb'), L('Drier', 'Más seco'), L('Best: pargo. Good: jurel. Slower: róbalo.', 'Mejor: pargo. Bueno: jurel. Más lento: róbalo.'), L('Lobster open.', 'Langosta abierta.')],
      [L('Mar', 'Mar'), L('Drier', 'Más seco'), L('Best: jurel. Good: pargo. Slower: róbalo.', 'Mejor: jurel. Bueno: pargo. Más lento: róbalo.'), L('Lobster CLOSED. Leatherback (baula) nesting starts.', 'Langosta en VEDA. Empieza la anidación de la baula.')],
      [L('Apr', 'Abr'), L('Rains start', 'Empiezan las lluvias'), L('Best: jurel. Good: pargo. Slower: róbalo.', 'Mejor: jurel. Bueno: pargo. Más lento: róbalo.'), L('Lobster CLOSED. Leatherback nesting at its busiest. Hawksbill (carey) may start (CHECK).', 'Langosta en VEDA. Anidación de la baula en su punto más alto. La carey puede empezar (VERIFICAR).')],
      [L('May', 'May'), L('Wet', 'Lluvioso'), L('Good: jurel. Slower: pargo, róbalo.', 'Bueno: jurel. Más lento: pargo, róbalo.'), L('Lobster CLOSED. Leatherback and hawksbill nesting.', 'Langosta en VEDA. Anidación de baula y carey.')],
      [L('Jun', 'Jun'), L('Wetter', 'Más lluvia'), L('Good: jurel, róbalo. Slower: pargo.', 'Bueno: jurel, róbalo. Más lento: pargo.'), L('Lobster CLOSED until 30 June. Leatherback and hawksbill nesting.', 'Langosta en VEDA hasta el 30 de junio. Anidación de baula y carey.')],
      [L('Jul', 'Jul'), L('Wetter', 'Más lluvia'), L('Good: róbalo. Slower: jurel, pargo.', 'Bueno: róbalo. Más lento: jurel, pargo.'), L('Lobster open again. Leatherback nesting ends, green turtle (tortuga verde) starts.', 'Langosta abierta otra vez. Termina la anidación de la baula, empieza la de la tortuga verde.')],
      [L('Aug', 'Ago'), L('Wet', 'Lluvioso'), L('Best: róbalo. Slower: jurel, pargo.', 'Mejor: róbalo. Más lento: jurel, pargo.'), L('Green and hawksbill turtle nesting.', 'Anidación de tortuga verde y carey.')],
      [L('Sep', 'Sep'), L('Drier', 'Más seco'), L('Best: róbalo. Good: jurel, pargo.', 'Mejor: róbalo. Bueno: jurel, pargo.'), L('Green and hawksbill turtle nesting.', 'Anidación de tortuga verde y carey.')],
      [L('Oct', 'Oct'), L('Drier', 'Más seco'), L('Best: róbalo. Good: jurel, pargo.', 'Mejor: róbalo. Bueno: jurel, pargo.'), L('Green and hawksbill turtle nesting ends.', 'Termina la anidación de tortuga verde y carey.')],
      [L('Nov', 'Nov'), L('Wetter', 'Más lluvia'), L('Best: róbalo, pargo. Good: jurel.', 'Mejor: róbalo, pargo. Bueno: jurel.'), L('Lobster open.', 'Langosta abierta.')],
      [L('Dec', 'Dic'), L('Wetter', 'Más lluvia'), L('Best: pargo. Good: róbalo, jurel.', 'Mejor: pargo. Bueno: róbalo, jurel.'), L('Lobster open.', 'Langosta abierta.')],
    ] },
    { k: 'p', t: L('Rain: the Caribbean coast has two drier spells, February to March and September to October, and the rest of the year is wetter. Look at the current forecast, because rain varies a lot from year to year. Heavy rain muddies the river mouths, which changes where the snook feed.{imn}', 'Lluvia: la costa Caribe tiene dos épocas más secas, de febrero a marzo y de setiembre a octubre, y el resto del año es más lluvioso. Revise el pronóstico actual, porque la lluvia varía mucho de un año a otro. La lluvia fuerte enturbia las desembocaduras de los ríos, lo que cambia dónde se alimenta el róbalo.{imn}') },
    { k: 'h', t: L('Fish with no clear best month', 'Peces sin un mejor mes claro') },
    { k: 'p', t: L('For these the app treats every month the same, because the best local months are not documented. For offshore fish, ask a local boat captain what is running now.{guide}', 'Para estos la app trata todos los meses igual, porque los mejores meses locales no están documentados. Para peces de mar abierto, pregunte a un capitán local qué anda ahora.{guide}') },
    { k: 'table', head: [L('Fish', 'Pez'), L('When', 'Cuándo'), L('Note', 'Nota')], rows: [
      [L('Macarela (Spanish mackerel)', 'Macarela'), L('All year', 'Todo el año'), L('Schools along reef edges in clear water.', 'Anda en cardúmenes por los bordes del arrecife en agua clara.')],
      [L('Mero and cabrilla (small reef groupers)', 'Mero y cabrilla (meros pequeños de arrecife)'), L('All year', 'Todo el año'), L('Large reef groupers can carry ciguatera (fish poisoning). See the Ciguatera page.', 'Los meros grandes de arrecife pueden tener ciguatera (intoxicación por pescado). Vea la página de Ciguatera.')],
      [L('Pez león (lionfish)', 'Pez león'), L('All year', 'Todo el año'), L('Eating it is encouraged. Spear only, and see the spearfishing rules.', 'Se anima a comerlo. Solo con arpón, y vea las reglas de pesca submarina.')],
      [L('Dorado (mahi), peto (wahoo), atún (tuna), barrilete', 'Dorado, peto, atún, barrilete'), L('Mostly warm months, offshore', 'Sobre todo en meses cálidos, mar afuera'), L('Ice them quickly. Ask a local captain for the current months.', 'Póngales hielo pronto. Pregunte a un capitán local por los meses actuales.')],
      [L('Langosta (lobster)', 'Langosta'), L('Open July to February', 'Abierta de julio a febrero'), L('Closed 1 March to 30 June. See the Rules tab.{lob}', 'Veda del 1 de marzo al 30 de junio. Vea la pestaña Reglas.{lob}')],
      [L('Pulpo (octopus)', 'Pulpo'), L('All year', 'Todo el año'), L('Found on reef and rubble on night snorkels and dives.', 'Se encuentra en arrecife y cascajo en snorkel y buceo nocturno.')],
      [L('Jaiba (crab)', 'Jaiba'), L('All year', 'Todo el año'), L('Brackish channels, lagoons and river mouths.', 'Canales salobres, lagunas y desembocaduras.')],
    ] },
    { k: 'p', t: L('Turtles are protected. Never take turtles or their eggs, and only watch nesting beaches on a guided tour.', 'Las tortugas están protegidas. Nunca capture tortugas ni sus huevos, y solo visite las playas de anidación en un tour con guía.') },
  ],
  sources: {
    app: { t: 'This app, shore and kayak fishing model (docs/FISHING.md, month factors per species)', p: 'P', what: L('Monthly ratings for snook, jack and snapper; mackerel, grouper and lionfish rated the same all year.', 'Calificaciones mensuales de róbalo, jurel y pargo; macarela, mero y pez león iguales todo el año.') },
    guide: { t: 'This app, species guide (season, where and reproduction fields)', p: 'P', what: L('Season notes for each species, and turtle nesting months.', 'Notas de temporada de cada especie y meses de anidación de las tortugas.') },
    lob: { t: 'INCOPESCA AJDIP/075-2012, regional closure of Caribbean spiny lobster', u: 'https://www.incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-075-2012%20aprueba%20veda%20de%20langosta%20caribe.pdf', p: 'P', what: L('Closed 1 March to 30 June.', 'Veda del 1 de marzo al 30 de junio.') },
    imn: { t: 'Instituto Meteorológico Nacional, Vertiente Caribe climate summary', u: 'https://www.imn.ac.cr/documents/10179/31165/VertienteCaribe.pdf/acd336b0-9c69-444a-9316-f168945c9a6d', p: 'P', what: L('Two relative rainfall minima, February to March and September to October; wettest in November to February and again in July.', 'Dos mínimos relativos de lluvia, de febrero a marzo y de setiembre a octubre; lo más lluvioso es de noviembre a febrero y otra vez en julio.') },
  },
};
