import type { Section } from '../content';

const L = (en: string, es: string) => ({ en, es });

export const rules: Section = {
  id: 'rules',
  title: L('Rules', 'Reglas'),
  lede: L(
    'What you can keep, where you can fish, and what you need, in one place.',
    'Lo que puede quedarse, dónde puede pescar y lo que necesita, todo en un lugar.',
  ),
  blocks: [
    { k: 'warn', h: L('Rules change', 'Las reglas cambian'), t: L('Rules change, so confirm with INCOPESCA (the fishing authority) and SINAC (the protected areas authority) before you go. Where a line below says CHECK, we are not sure of the rule.', 'Las reglas cambian, así que confirme con INCOPESCA (la autoridad de pesca) y SINAC (la autoridad de áreas protegidas) antes de salir. Donde una línea diga VERIFICAR, no estamos seguros de la regla.') },
    { k: 'h', t: L('National rules', 'Reglas nacionales') },
    { k: 'p', t: L('These apply everywhere in Costa Rica, including inside protected areas. The spearfishing rules come from the INCOPESCA spearfishing regulation.{spear}', 'Estas reglas aplican en todo Costa Rica, también dentro de las áreas protegidas. Las reglas de pesca submarina vienen del reglamento de pesca submarina de INCOPESCA.{spear}') },
    { k: 'table', head: [L('Rule', 'Regla'), L('Hook and line', 'Línea y anzuelo'), L('Spearfishing', 'Pesca submarina')], rows: [
      [L('Permit', 'Permiso'), L('CHECK with INCOPESCA which licence or permit your kind of fishing needs.', 'VERIFIQUE con INCOPESCA qué licencia o permiso necesita su tipo de pesca.'), L('You need an INCOPESCA permit and a spearfishing carné (card). You also sign a statement that you know the risks.{spear}', 'Necesita un permiso de INCOPESCA y un carné de pesca submarina. También firma una declaración de que conoce los riesgos.{spear}')],
      [L('Age', 'Edad'), L('CHECK with INCOPESCA.', 'VERIFIQUE con INCOPESCA.'), L('You must be 18 or older.{spear}', 'Debe tener 18 años o más.{spear}')],
      [L('How you dive', 'Cómo se bucea'), L('Not applicable.', 'No aplica.'), L('Breath-hold only. No scuba tanks and no compressors. The one exception is lionfish tournaments approved by INCOPESCA in the Caribbean.{spear}{lion}', 'Solo a pulmón (apnea). No se permiten tanques de buceo ni compresores. La única excepción son los torneos de pez león autorizados por INCOPESCA en el Caribe.{spear}{lion}')],
      [L('How many', 'Cuántos'), L('CHECK with INCOPESCA.', 'VERIFIQUE con INCOPESCA.'), L('At most 5 fish a day, for your own use. You cannot sell them.{spear}', 'Máximo 5 peces por día, para consumo propio. No se pueden vender.{spear}')],
      [L('How big', 'Qué tamaño'), L('CHECK the minimum size for each species with INCOPESCA.', 'VERIFIQUE con INCOPESCA la talla mínima de cada especie.'), L('Only fish bigger than the size at which that species first breeds (talla de primera madurez sexual).{spear}', 'Solo peces más grandes que la talla a la que esa especie se reproduce por primera vez (talla de primera madurez sexual).{spear}')],
      [L('Where', 'Dónde'), L('Follow the rules of each protected area (see below).', 'Siga las reglas de cada área protegida (vea abajo).'), L('Not in national parks or other protected areas, and not in closed seasons or closed zones.{spear}', 'No en parques nacionales ni otras áreas protegidas, ni en vedas ni zonas cerradas.{spear}')],
    ] },
    { k: 'h', t: L('Lobster closed season (veda)', 'Veda de la langosta') },
    { k: 'p', t: L('Caribbean spiny lobster (langosta) is closed every year from 1 March to 30 June. Do not catch, keep, buy or sell it in those months. The INCOPESCA decision we read set these dates for 2012, and the app treats them as the yearly closure. CHECK with INCOPESCA that the dates are the same this year.{lob}', 'La langosta espinosa del Caribe tiene veda todos los años del 1 de marzo al 30 de junio. No la capture, guarde, compre ni venda en esos meses. La decisión de INCOPESCA que leímos fijó estas fechas para 2012, y la app las trata como la veda de cada año. VERIFIQUE con INCOPESCA que las fechas sean las mismas este año.{lob}') },
    { k: 'h', t: L('Protected areas', 'Áreas protegidas') },
    { k: 'table', head: [L('Place', 'Lugar'), L('What the rule says', 'Qué dice la regla'), L('Who to ask', 'A quién preguntar')], rows: [
      [L('Cahuita National Park', 'Parque Nacional Cahuita'), L('Spear guns and trammel or cast nets are not allowed in the park.{cah} Spearfishing is banned in national parks.{spear} Line fishing in the sea part of the park: CHECK, because sources disagree (one says it is banned, another says hand line only).{plan}', 'No se permiten arpones ni redes de enmalle o atarrayas en el parque.{cah} La pesca submarina está prohibida en parques nacionales.{spear} Pesca con línea en la parte marina del parque: VERIFIQUE, porque las fuentes no coinciden (una dice que está prohibida, otra dice que solo con línea de mano).{plan}'), L('Cahuita park office, +506 2755-0302.', 'Oficina del parque Cahuita, +506 2755-0302.')],
      [L('Gandoca-Manzanillo Wildlife Refuge', 'Refugio de Vida Silvestre Gandoca-Manzanillo'), L('Traditional fishing is part of the refuge. CHECK the marine rules for line fishing and for spearfishing before you go. Spearfishing is not allowed in protected areas.{spear}', 'La pesca tradicional es parte del refugio. VERIFIQUE las reglas marinas para pesca con línea y submarina antes de salir. La pesca submarina no se permite en áreas protegidas.{spear}'), L('SINAC or INCOPESCA.', 'SINAC o INCOPESCA.')],
      [L('Limoncito Wildlife Refuge (Limoncito river mouth, south of Limón)', 'Refugio de Vida Silvestre Limoncito (desembocadura del río Limoncito, al sur de Limón)'), L('CHECK the fishing rule before you go. Spearfishing is not allowed in protected areas.{spear}', 'VERIFIQUE la regla de pesca antes de salir. La pesca submarina no se permite en áreas protegidas.{spear}'), L('SINAC.', 'SINAC.')],
    ] },
    { k: 'h', t: L('When the app says CHECK', 'Cuando la app dice VERIFICAR') },
    { k: 'p', t: L('CHECK means the rule is not confirmed. Do not guess: ask the authority before you fish. For Cahuita, call the park office on +506 2755-0302. For the refuges and for anything about fishing permits, sizes or closed seasons, ask INCOPESCA or SINAC at their offices in Limón or on their websites.{sinac}', 'VERIFICAR significa que la regla no está confirmada. No adivine: pregunte a la autoridad antes de pescar. Para Cahuita, llame a la oficina del parque al +506 2755-0302. Para los refugios y para permisos de pesca, tallas o vedas, pregunte a INCOPESCA o SINAC en sus oficinas de Limón o en sus sitios web.{sinac}') },
    { k: 'h', t: L('Protected species: do not take, buy or eat', 'Especies protegidas: no las capture, compre ni coma') },
    { k: 'p', t: L('The app marks these local animals as protected. If you hook or net one by accident, release it alive and unhurt.{guide}', 'La app marca estos animales locales como protegidos. Si engancha o enmalla uno por accidente, suéltelo vivo y sin daño.{guide}') },
    { k: 'ul', items: [
      L('Sea turtles: leatherback (tortuga baula), green turtle (tortuga verde) and hawksbill (tortuga carey), and their eggs.', 'Tortugas marinas: baula, verde y carey, y sus huevos.'),
      L('Goliath grouper (mero guasa) and Nassau grouper (mero del Caribe).', 'Mero guasa y mero del Caribe (cherna criolla).'),
      L('Queen conch (cambute or cobo rosado) and milk conch (cobo lechoso).', 'Cambute o cobo rosado y cobo lechoso.'),
      L('Sharks: silky (tiburón sedoso), hammerheads (tiburón martillo), mako and oceanic whitetip.', 'Tiburones: sedoso, martillo, mako y punta blanca oceánico.'),
      L('Whale shark (tiburón ballena), giant manta (manta raya) and sawfish (pez sierra).', 'Tiburón ballena, manta raya gigante y pez sierra.'),
      L('Manatee (manatí), dolphins and whales, crocodile (cocodrilo) and caiman (caimán).', 'Manatí, delfines y ballenas, cocodrilo y caimán.'),
    ] },
  ],
  sources: {
    spear: { t: 'INCOPESCA AJDIP/098-2017, Reglamento para el ejercicio de la pesca deportiva subacuática', u: 'https://incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-098-2017_Reglamento_Pesca_Sub_acuatica.pdf', p: 'P', what: L('Permit, carné, age 18, breath-hold only, 5 fish a day, size at first maturity, no protected areas or closed zones (articles 3, 4, 6, 7, 9).', 'Permiso, carné, 18 años, solo a pulmón, 5 peces por día, talla de primera madurez, sin áreas protegidas ni zonas cerradas (artículos 3, 4, 6, 7, 9).') },
    lion: { t: 'INCOPESCA AJDIP/194-2024, change to article 4 of the spearfishing regulation', u: 'https://incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-194-2024_Modifica_Articulo_4_AJDIP-098-2017_Reglamento_Pesca_Subacuatica.pdf', p: 'S', what: L('Scuba exception for approved Caribbean lionfish tournaments.', 'Excepción de buceo con tanque para torneos de pez león autorizados en el Caribe.') },
    lob: { t: 'INCOPESCA AJDIP/075-2012, regional closure of Caribbean spiny lobster', u: 'https://www.incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-075-2012%20aprueba%20veda%20de%20langosta%20caribe.pdf', p: 'P', what: L('Closed 1 March to 30 June 2012, agreed across Central America.', 'Veda del 1 de marzo al 30 de junio de 2012, acordada a nivel centroamericano.') },
    cah: { t: 'Cahuita National Park brochure (Costa Rica Tourism Board)', u: 'https://visitcostarica.com/sites/default/files/legacy/pdf/3_PN%20Cahuita.pdf', p: 'S', what: L('Spear guns and trammel or cast nets not allowed.', 'No se permiten arpones ni redes de enmalle o atarrayas.') },
    plan: { t: 'SINAC, Plan General de Manejo del Parque Nacional Cahuita 2016-2026', u: 'https://www.sinac.go.cr/ES/planmanejo/Plan%20Manejo%20ACLAC/Plan%20General%20de%20Manejo%20del%20Parque%20Nacional%20Cahuita%202016-2026.pdf', p: 'S', what: L('Describes a fishing ban in the marine area; another source says hand line only.', 'Describe una prohibición de pesca en el área marina; otra fuente dice que solo con línea de mano.') },
    sinac: { t: 'SINAC, Sistema Nacional de Áreas de Conservación', u: 'https://www.sinac.go.cr/', p: 'S', what: L('The authority for protected areas.', 'La autoridad de las áreas protegidas.') },
    guide: { t: 'This app, species guide (protected status of each species)', p: 'P', what: L('Species marked protected in the guide.', 'Especies marcadas como protegidas en la guía.') },
  },
};
