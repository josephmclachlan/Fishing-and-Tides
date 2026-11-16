import type { Section } from '../content';

const L = (en: string, es: string) => ({ en, es });
const MON = [L('J', 'E'), L('F', 'F'), L('M', 'M'), L('A', 'A'), L('M', 'M'), L('J', 'J'), L('J', 'J'), L('A', 'A'), L('S', 'S'), L('O', 'O'), L('N', 'N'), L('D', 'D')];

/** SEASONS: the old month table as heat grids (line fishing, rain, closure and nesting). Levels: best 3, good 2, slower 1. */
export const seasons: Section = {
  id: 'seasons',
  title: L('Seasons', 'Temporadas'),
  lede: L(
    'Which local fish are running or good each month, plus the lobster closure and turtle nesting.',
    'Qué peces locales andan o están buenos cada mes, además de la veda de langosta y la anidación de tortugas.',
  ),
  blocks: [
    {
      k: 'heat',
      h: L('Line fishing by month', 'Pesca con línea por mes'),
      cols: MON,
      rows: [
        { h: L('Pargo (snapper)', 'Pargo'), v: [3, 3, 2, 2, 1, 1, 1, 1, 2, 2, 3, 3] },
        { h: L('Jurel (jack)', 'Jurel'), v: [2, 2, 3, 3, 2, 2, 1, 1, 2, 2, 2, 2] },
        { h: L('Róbalo (snook)', 'Róbalo'), v: [1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 2] },
      ],
      key: [
        { v: 3, t: L('Best: the app rates it at its peak', 'Mejor: la app lo califica en su punto más alto') },
        { v: 2, t: L('Good: a fair month', 'Bueno: un mes regular') },
        { v: 1, t: L('Slower: quieter, not closed', 'Más lento: más tranquilo, no cerrado') },
      ],
      note: L("These ratings are the app's own rules of thumb for the Caribbean coast, not counts of fish caught. Use them as a guide and ask local fishers.{app}", 'Estas calificaciones son reglas prácticas de la app para el Caribe, no conteos de peces capturados. Úselas como guía y pregunte a los pescadores locales.{app}'),
    },
    {
      k: 'heat',
      h: L('Rain by month', 'Lluvia por mes'),
      cols: MON,
      rows: [{ h: L('Rain', 'Lluvia'), hue: 'rain', v: [3, 1, 1, 2, 2, 3, 3, 2, 1, 1, 3, 3] }],
      key: [
        { v: 1, hue: 'rain', t: L('Drier', 'Más seco') },
        { v: 2, hue: 'rain', t: L('Wet, or rains starting', 'Lluvioso, o empiezan las lluvias') },
        { v: 3, hue: 'rain', t: L('Wetter', 'Más lluvia') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'rain', h: L('Two drier spells', 'Dos épocas más secas'), t: L('February to March and September to October. The rest of the year is wetter. Rain varies a lot from year to year, so check the current forecast.{imn}', 'De febrero a marzo y de setiembre a octubre. El resto del año es más lluvioso. La lluvia varía mucho de un año a otro, así que revise el pronóstico actual.{imn}') },
        { ico: 'river', h: L('Heavy rain', 'Lluvia fuerte'), t: L('It muddies the river mouths, which changes where the snook feed.{imn}', 'Enturbia las desembocaduras de los ríos, lo que cambia dónde se alimenta el róbalo.{imn}') },
      ],
    },
    {
      k: 'heat',
      h: L('Closed seasons and turtle nesting', 'Vedas y anidación de tortugas'),
      cols: MON,
      rows: [
        { h: L('Lobster (langosta)', 'Langosta'), hue: 'closed', v: [0, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0] },
        { h: L('Leatherback (baula)', 'Baula'), hue: 'nest', v: [0, 0, 1, 3, 2, 2, 1, 0, 0, 0, 0, 0] },
        { h: L('Hawksbill (carey)', 'Carey'), hue: 'nest', v: [0, 0, 0, 0, 2, 2, 0, 2, 2, 1, 0, 0] },
        { h: L('Green turtle (tortuga verde)', 'Tortuga verde'), hue: 'nest', v: [0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0] },
      ],
      key: [
        { v: 3, hue: 'closed', t: L('Lobster closed (until 30 June)', 'Langosta en veda (hasta el 30 de junio)') },
        { v: 3, hue: 'nest', t: L('Nesting at its busiest', 'Anidación en su punto más alto') },
        { v: 2, hue: 'nest', t: L('Nesting', 'Anidación') },
        { v: 1, hue: 'nest', t: L('Starts or ends', 'Empieza o termina') },
      ],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'turtle', tone: 'unk', h: L('Not confirmed', 'No confirmado'), t: L('Hawksbill (carey) nesting may start in April.', 'La anidación de la carey puede empezar en abril.') },
        { ico: 'lobster', tone: 'stop', h: L('Lobster: 1 March to 30 June', 'Langosta: 1 de marzo al 30 de junio'), t: L('Open July to February. See the Rules tab.{lob}', 'Abierta de julio a febrero. Vea la pestaña Reglas.{lob}') },
        { ico: 'turtle', tone: 'stop', h: L('Turtles are protected', 'Las tortugas están protegidas'), t: L('Never take turtles or their eggs. Watch nesting beaches only on a guided tour.', 'Nunca capture tortugas ni sus huevos. Visite las playas de anidación solo en un tour con guía.') },
      ],
    },
    { k: 'h', t: L('Fish with no clear best month', 'Peces sin un mejor mes claro') },
    { k: 'p', t: L('The app treats every month the same for these, because the best local months are not documented. For offshore fish, ask a local boat captain what is running now.{guide}', 'La app trata todos los meses igual para estos, porque los mejores meses locales no están documentados. Para peces de mar abierto, pregunte a un capitán local qué anda ahora.{guide}') },
    {
      k: 'tiles',
      items: [
        { ico: 'fish', h: L('Macarela (Spanish mackerel)', 'Macarela'), t: L('All year. Schools along reef edges in clear water.', 'Todo el año. Anda en cardúmenes por los bordes del arrecife en agua clara.') },
        { ico: 'fish', tone: 'warn', h: L('Mero and cabrilla (small reef groupers)', 'Mero y cabrilla (meros pequeños de arrecife)'), t: L('All year. Large reef groupers can carry ciguatera (fish poisoning). See the Ciguatera page.', 'Todo el año. Los meros grandes de arrecife pueden tener ciguatera (intoxicación por pescado). Vea la página de Ciguatera.') },
        { ico: 'spine', h: L('Pez león (lionfish)', 'Pez león'), t: L('All year. Eating it is encouraged. Spear only, and see the spearfishing rules.', 'Todo el año. Se anima a comerlo. Solo con arpón, y vea las reglas de pesca submarina.') },
        { ico: 'boat', h: L('Dorado (mahi), peto (wahoo), atún (tuna), barrilete', 'Dorado, peto, atún, barrilete'), t: L('Mostly warm months, offshore. Ice them quickly. Ask a local captain for the current months.', 'Sobre todo en meses cálidos, mar afuera. Póngales hielo pronto. Pregunte a un capitán local por los meses actuales.') },
        { ico: 'octopus', h: L('Pulpo (octopus)', 'Pulpo'), t: L('All year. Found on reef and rubble on night snorkels and dives.', 'Todo el año. Se encuentra en arrecife y cascajo en snorkel y buceo nocturno.') },
        { ico: 'river', h: L('Jaiba (crab)', 'Jaiba'), t: L('All year. Brackish channels, lagoons and river mouths.', 'Todo el año. Canales salobres, lagunas y desembocaduras.') },
      ],
    },
  ],
  sources: {
    app: { t: 'This app, shore and kayak fishing model (docs/FISHING.md, month factors per species)', p: 'P', what: L('Monthly ratings for snook, jack and snapper; mackerel, grouper and lionfish rated the same all year.', 'Calificaciones mensuales de róbalo, jurel y pargo; macarela, mero y pez león iguales todo el año.') },
    guide: { t: 'This app, species guide (season, where and reproduction fields)', p: 'P', what: L('Season notes for each species, and turtle nesting months.', 'Notas de temporada de cada especie y meses de anidación de las tortugas.') },
    lob: { t: 'INCOPESCA AJDIP/075-2012, regional closure of Caribbean spiny lobster', u: 'https://www.incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-075-2012%20aprueba%20veda%20de%20langosta%20caribe.pdf', p: 'P', what: L('Closed 1 March to 30 June.', 'Veda del 1 de marzo al 30 de junio.') },
    imn: { t: 'Instituto Meteorológico Nacional, Vertiente Caribe climate summary', u: 'https://www.imn.ac.cr/documents/10179/31165/VertienteCaribe.pdf/acd336b0-9c69-444a-9316-f168945c9a6d', p: 'P', what: L('Two relative rainfall minima, February to March and September to October; wettest in November to February and again in July.', 'Dos mínimos relativos de lluvia, de febrero a marzo y de setiembre a octubre; lo más lluvioso es de noviembre a febrero y otra vez en julio.') },
  },
};
