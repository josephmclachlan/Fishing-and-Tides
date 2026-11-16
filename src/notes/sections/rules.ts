import type { Section } from '../content';

const L = (en: string, es: string) => ({ en, es });
const MON = [L('J', 'E'), L('F', 'F'), L('M', 'M'), L('A', 'A'), L('M', 'M'), L('J', 'J'), L('J', 'J'), L('A', 'A'), L('S', 'S'), L('O', 'O'), L('N', 'N'), L('D', 'D')];
const SPEAR_BAN = L('Illegal. Spearfishing is not allowed in protected areas.{spear}', 'Ilegal. La pesca submarina no se permite en áreas protegidas.{spear}');

/** RULES: what you can keep, where you can fish, what you need. Every "CHECK" of the old text is now "Not confirmed" (tone unk, dashed). */
export const rules: Section = {
  id: 'rules',
  title: L('Rules', 'Reglas'),
  lede: L(
    'What you can keep, where you can fish, and what you need, in one place.',
    'Lo que puede quedarse, dónde puede pescar y lo que necesita, todo en un lugar.',
  ),
  blocks: [
    {
      k: 'tiles',
      items: [
        { ico: 'warn', tone: 'warn', h: L('Rules change', 'Las reglas cambian'), t: L('Confirm with INCOPESCA (the fishing authority) and SINAC (the protected areas authority) before you go.', 'Confirme con INCOPESCA (la autoridad de pesca) y SINAC (la autoridad de áreas protegidas) antes de salir.') },
        { ico: 'ask', tone: 'unk', h: L('Not confirmed', 'No confirmado'), t: L('A dashed box means we are not sure of the rule. Do not guess: ask the authority before you fish.', 'Un recuadro punteado significa que no estamos seguros de la regla. No adivine: pregunte a la autoridad antes de pescar.') },
      ],
    },
    { k: 'h', t: L('National rules', 'Reglas nacionales') },
    {
      k: 'compare',
      cols: [L('Hook and line', 'Línea y anzuelo'), L('Spearfishing', 'Pesca submarina')],
      rows: [
        { ico: 'cert', h: L('Permit', 'Permiso'), cells: [
          { tone: 'unk', t: L('Not confirmed. Ask INCOPESCA which licence or permit you need.', 'No confirmado. Pregunte a INCOPESCA qué licencia o permiso necesita.') },
          { tone: 'warn', t: L('INCOPESCA permit and a spearfishing carné (card). You also sign a statement that you know the risks.{spear}', 'Permiso de INCOPESCA y carné de pesca submarina. También firma una declaración de que conoce los riesgos.{spear}') },
        ] },
        { ico: 'card', h: L('Age', 'Edad'), cells: [
          { tone: 'unk', t: L('Not confirmed. Ask INCOPESCA.', 'No confirmado. Pregunte a INCOPESCA.') },
          { tone: 'warn', t: L('18 or older.{spear}', '18 años o más.{spear}') },
        ] },
        { ico: 'tank', h: L('How you dive', 'Cómo se bucea'), cells: [
          { tone: 'info', t: L('Not applicable.', 'No aplica.') },
          { tone: 'stop', t: L('Breath-hold only. Illegal: scuba tanks and compressors. The one exception is lionfish tournaments approved by INCOPESCA in the Caribbean.{spear}{lion}', 'Solo a pulmón (apnea). Ilegal: tanques de buceo y compresores. La única excepción son los torneos de pez león autorizados por INCOPESCA en el Caribe.{spear}{lion}') },
        ] },
        { ico: 'fish', h: L('How many', 'Cuántos'), cells: [
          { tone: 'unk', t: L('Not confirmed. Ask INCOPESCA.', 'No confirmado. Pregunte a INCOPESCA.') },
          { tone: 'warn', t: L('At most 5 fish a day, for your own use. You cannot sell them.{spear}', 'Máximo 5 peces por día, para consumo propio. No se pueden vender.{spear}') },
        ] },
        { ico: 'ruler', h: L('How big', 'Qué tamaño'), cells: [
          { tone: 'unk', t: L('Not confirmed. Ask INCOPESCA for the minimum size of each species.', 'No confirmado. Pregunte a INCOPESCA la talla mínima de cada especie.') },
          { tone: 'warn', t: L('Only fish bigger than the size at which that species first breeds (talla de primera madurez sexual).{spear}', 'Solo peces más grandes que la talla a la que esa especie se reproduce por primera vez (talla de primera madurez sexual).{spear}') },
        ] },
        { ico: 'park', h: L('Where', 'Dónde'), cells: [
          { tone: 'info', t: L('Follow the rules of each protected area (below).', 'Siga las reglas de cada área protegida (abajo).') },
          { tone: 'stop', t: L('Illegal in national parks and other protected areas, in closed seasons and in closed zones.{spear}', 'Ilegal en parques nacionales y otras áreas protegidas, en vedas y en zonas cerradas.{spear}') },
        ] },
      ],
    },
    { k: 'h', t: L('Lobster closed season (veda)', 'Veda de la langosta') },
    {
      k: 'heat',
      cols: MON,
      rows: [{ h: L('Lobster (langosta)', 'Langosta'), hue: 'closed', v: [0, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0] }],
      key: [{ v: 3, hue: 'closed', t: L('Closed', 'Veda') }, { v: 0, t: L('Open', 'Abierta') }],
    },
    {
      k: 'stats',
      items: [
        { n: L('1 Mar to 30 Jun', '1 mar a 30 jun'), tone: 'stop', t: L('Caribbean spiny lobster (langosta) is closed every year. Do not catch, keep, buy or sell it. It is a Central American regional rule, and INCOPESCA confirmed it for Costa Rica in 2012 and 2013.{osp}{lob}{lob13}', 'La langosta espinosa del Caribe tiene veda todos los años. No la capture, guarde, compre ni venda. Es una norma regional centroamericana, y INCOPESCA la confirmó para Costa Rica en 2012 y 2013.{osp}{lob}{lob13}') },
        { n: L('140 mm', '140 mm'), t: L('Smallest tail allowed when open. Do not take lobsters carrying eggs or in moult.{osp}', 'Cola mínima permitida cuando está abierta. No se pueden llevar langostas con huevos ni en muda.{osp}') },
      ],
    },
    { k: 'h', t: L('Protected areas', 'Áreas protegidas') },
    {
      k: 'compare',
      cols: [L('Line fishing', 'Pesca con línea'), L('Spearfishing and nets', 'Pesca submarina y redes')],
      rows: [
        { ico: 'park', h: L('Cahuita National Park', 'Parque Nacional Cahuita'), cells: [
          { tone: 'unk', t: L('Not confirmed in the sea part of the park. Sources disagree: one says banned, another says hand line only.{plan}', 'No confirmado en la parte marina del parque. Las fuentes no coinciden: una dice que está prohibida, otra que solo con línea de mano.{plan}') },
          { tone: 'stop', t: L('Illegal: spear guns and trammel or cast nets.{cah} Spearfishing is banned in national parks.{spear}', 'Ilegal: arpones y redes de enmalle o atarrayas.{cah} La pesca submarina está prohibida en parques nacionales.{spear}') },
        ] },
        { ico: 'park', h: L('Gandoca-Manzanillo Wildlife Refuge', 'Refugio de Vida Silvestre Gandoca-Manzanillo'), cells: [
          { tone: 'unk', t: L('Traditional fishing is part of the refuge, and the brochure says only hook and line is permitted.{gman} Not confirmed that this covers the whole marine area.', 'La pesca tradicional es parte del refugio, y el folleto dice que solo se permite cuerda y anzuelo.{gman} No confirmado que esto cubra toda el área marina.') },
          { tone: 'stop', t: SPEAR_BAN },
        ] },
        { ico: 'park', h: L('Limoncito Wildlife Refuge (Limoncito river mouth, south of Limón)', 'Refugio de Vida Silvestre Limoncito (desembocadura del río Limoncito, al sur de Limón)'), cells: [
          { tone: 'unk', t: L('Not confirmed. Ask SINAC before you go.', 'No confirmado. Pregunte a SINAC antes de salir.') },
          { tone: 'stop', t: SPEAR_BAN },
        ] },
      ],
    },
    {
      k: 'calls',
      items: [{ n: '2755-0302', tel: '+50627550302', h: L('Cahuita park office', 'Oficina del parque Cahuita'), t: L('Ask here about line fishing in the park.', 'Pregunte aquí por la pesca con línea en el parque.') }],
    },
    {
      k: 'tiles',
      items: [
        { ico: 'bank', h: L('Refuges, permits, sizes, closures', 'Refugios, permisos, tallas, vedas'), t: L('Ask SINAC (refuges) or INCOPESCA at their offices in Limón or on their websites.{sinac}', 'Pregunte a SINAC (refugios) o a INCOPESCA en sus oficinas de Limón o en sus sitios web.{sinac}') },
      ],
    },
    { k: 'h', t: L('Protected species: do not take, buy or eat', 'Especies protegidas: no las capture, compre ni coma') },
    {
      k: 'tiles',
      items: [
        { ico: 'free', tone: 'go', h: L('Hooked one by accident?', '¿Enganchó uno por accidente?'), t: L('Release it alive and unhurt.{guide}', 'Suéltelo vivo y sin daño.{guide}') },
        { ico: 'turtle', tone: 'stop', h: L('Sea turtles and eggs', 'Tortugas marinas y huevos'), t: L('Leatherback (tortuga baula), green (tortuga verde), hawksbill (tortuga carey).', 'Baula, verde y carey.') },
        { ico: 'fish', tone: 'stop', h: L('Groupers', 'Meros'), t: L('Goliath grouper (mero guasa) and Nassau grouper (mero del Caribe).', 'Mero guasa y mero del Caribe (cherna criolla).') },
        { ico: 'conch', tone: 'stop', h: L('Conchs', 'Caracoles'), t: L('Queen conch (cambute or cobo rosado) and milk conch (cobo lechoso).', 'Cambute o cobo rosado y cobo lechoso.') },
        { ico: 'shark', tone: 'stop', h: L('Sharks', 'Tiburones'), t: L('Silky (tiburón sedoso), hammerheads (tiburón martillo), mako and oceanic whitetip.', 'Sedoso, martillo, mako y punta blanca oceánico.') },
        { ico: 'shark', tone: 'stop', h: L('Whale shark, mantas, sawfish', 'Tiburón ballena, mantas, pez sierra'), t: L('Whale shark (tiburón ballena), giant manta (manta raya) and sawfish (pez sierra).', 'Tiburón ballena, manta raya gigante y pez sierra.') },
        { ico: 'manatee', tone: 'stop', h: L('Manatee, whales, reptiles', 'Manatí, ballenas, reptiles'), t: L('Manatee (manatí), dolphins and whales, crocodile (cocodrilo) and caiman (caimán).', 'Manatí, delfines y ballenas, cocodrilo y caimán.') },
      ],
    },
  ],
  sources: {
    spear: { t: 'INCOPESCA AJDIP/098-2017, Reglamento para el ejercicio de la pesca deportiva subacuática', u: 'https://incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-098-2017_Reglamento_Pesca_Sub_acuatica.pdf', p: 'P', what: L('Permit, carné, age 18, breath-hold only, 5 fish a day, size at first maturity, no protected areas or closed zones (articles 3, 4, 6, 7, 9).', 'Permiso, carné, 18 años, solo a pulmón, 5 peces por día, talla de primera madurez, sin áreas protegidas ni zonas cerradas (artículos 3, 4, 6, 7, 9).') },
    lion: { t: 'INCOPESCA AJDIP/194-2024, change to article 4 of the spearfishing regulation', u: 'https://incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-194-2024_Modifica_Articulo_4_AJDIP-098-2017_Reglamento_Pesca_Subacuatica.pdf', p: 'P', what: L('Article 4 now allows scuba only in INCOPESCA-approved lionfish tournaments in the Costa Rican Caribbean.', 'El artículo 4 ahora permite el buceo con tanque solo en torneos de pez león aprobados por INCOPESCA en el Caribe costarricense.') },
    lob: { t: 'INCOPESCA AJDIP/075-2012, regional closure of Caribbean spiny lobster', u: 'https://www.incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-075-2012%20aprueba%20veda%20de%20langosta%20caribe.pdf', p: 'P', what: L('Closed 1 March to 30 June 2012, agreed across Central America.', 'Veda del 1 de marzo al 30 de junio de 2012, acordada a nivel centroamericano.') },
    lob13: { t: 'INCOPESCA AJDIP/080-2013, ratifies the Caribbean lobster closure, 1 March to 30 June 2013', u: 'https://incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-080-2013%20ratifica%20y%20aprueba%20veda%20langosta%20caribe%2001-03%20al%2030-06-13.pdf', p: 'P', what: L('The INCOPESCA board ratified the regional closure for the Costa Rican Caribbean in 2013.', 'La Junta Directiva de INCOPESCA ratificó la veda regional para el Caribe costarricense en 2013.') },
    osp: { t: 'OSPESCA (SICA), Reglamento OSP-02-09 for the regional management of Caribbean spiny lobster, articles 4, 11 and 12', u: 'https://faolex.fao.org/docs/pdf/sica180527.pdf', p: 'P', what: L('Closed 1 March to 30 June every year; minimum tail length 140 mm; no lobsters with eggs, sperm packet or in moult.', 'Veda del 1 de marzo al 30 de junio de cada año; cola de al menos 140 mm; prohibidas las langostas con huevos, espermateca o en muda.') },
    cah: { t: 'Cahuita National Park brochure (Costa Rica Tourism Board)', u: 'https://visitcostarica.com/sites/default/files/legacy/pdf/3_PN%20Cahuita.pdf', p: 'S', what: L('Spear guns and trammel or cast nets not allowed.', 'No se permiten arpones ni redes de enmalle o atarrayas.') },
    plan: { t: 'SINAC, Plan General de Manejo del Parque Nacional Cahuita 2016-2026', u: 'https://www.sinac.go.cr/ES/planmanejo/Plan%20Manejo%20ACLAC/Plan%20General%20de%20Manejo%20del%20Parque%20Nacional%20Cahuita%202016-2026.pdf', p: 'S', what: L('Describes a fishing ban in the marine area; another source says hand line only.', 'Describe una prohibición de pesca en el área marina; otra fuente dice que solo con línea de mano.') },
    gman: { t: 'Gandoca-Manzanillo Wildlife Refuge brochure (Costa Rica Tourism Board)', u: 'https://www.visitcostarica.com/sites/default/files/legacy/pdf/10_PN%20Gandoca%20Manzanillo.pdf', p: 'P', what: L('Only hook and line fishing is permitted; taking fish for collecting or sale is prohibited.', 'Solo se permite la pesca con cuerda y anzuelo; se prohíbe sacar peces para colección o venta.') },
    sinac: { t: 'SINAC, Sistema Nacional de Áreas de Conservación', u: 'https://www.sinac.go.cr/', p: 'S', what: L('The authority for protected areas.', 'La autoridad de las áreas protegidas.') },
    guide: { t: 'This app, species guide (protected status of each species)', p: 'P', what: L('Species marked protected in the guide.', 'Especies marcadas como protegidas en la guía.') },
  },
};
