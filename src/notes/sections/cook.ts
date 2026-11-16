import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Cooking the local edible catch, Caribbean Costa Rica style. Quantities serve 4 people. */
export const cook: Section = {
  id: 'cook',
  title: L('Cooking', 'Cocina'),
  lede: L('Traditional ways to cook the local catch, with quantities for four people.', 'Formas tradicionales de cocinar la pesca local, con cantidades para cuatro personas.'),
  blocks: [
    {
      k: 'warn',
      h: L('Before you cook', 'Antes de cocinar'),
      t: L(
        'Cooking does not remove ciguatera, so never rely on a pan or a pot to make a risky fish safe.{cdc} Read the Ciguatera page before you keep a large reef fish. For how to kill, bleed and ice a fish so it stays safe, and for the histamine rule for mackerel, jack and other fast-spoiling fish, read the Dispatch page.',
        'Cocinar no elimina la ciguatera, así que nunca cuente con la sartén o la olla para volver seguro un pez riesgoso.{cdc} Lea la página de Ciguatera antes de quedarse con un pez grande de arrecife. Para saber cómo matar, desangrar y enhielar un pescado para que se mantenga seguro, y la regla de la histamina para la macarela, el jurel y otros peces que se dañan rápido, lea la página de Despacho.',
      ),
    },
    { k: 'h', t: L('Safe temperatures and leftovers', 'Temperaturas seguras y sobras') },
    {
      k: 'ul',
      items: [
        L('Cook fish and shellfish until the thickest part reaches 63 °C (145 °F). Without a thermometer, the flesh should separate easily with a fork.{fdatemp}', 'Cocine el pescado y el marisco hasta que la parte más gruesa llegue a 63 °C (145 °F). Sin termómetro, la carne debe separarse fácil con un tenedor.{fdatemp}'),
        L('Keep raw fish and its juices away from cooked food and from anything eaten raw. Use one board for raw fish and wash it, the knife and your hands with soap and hot water afterwards.{fdatemp}', 'Mantenga el pescado crudo y sus jugos lejos de la comida cocida y de lo que se come crudo. Use una tabla para el pescado crudo y lávela, junto con el cuchillo y sus manos, con jabón y agua caliente.{fdatemp}'),
        L('Leftovers: put cooked fish in the fridge or on ice within 2 hours (1 hour when it is hotter than 32 °C, 90 °F). Do not keep it at room temperature.{fdatemp}', 'Sobras: ponga el pescado cocinado en la nevera o en hielo dentro de 2 horas (1 hora si hace más de 32 °C, 90 °F). No lo deje a temperatura ambiente.{fdatemp}'),
      ],
    },
    { k: 'h', t: L('Ceviche (ceviche)', 'Ceviche (ceviche)') },
    {
      k: 'p',
      t: L(
        'Only fish that is perfectly fresh goes into ceviche. Lime juice changes the flesh but does not replace cooking: ceviche is a known source of fish parasite infection, and histamine is heat stable.{fdaguide} Use only fish that was bled and iced right after it was caught, and that the Dispatch page grades as ceviche-fresh. Never use mackerel, jack or any fish that sat warm. Do not use a large reef fish.',
        'Solo el pescado perfectamente fresco va en ceviche. El jugo de limón cambia la carne pero no sustituye la cocción: el ceviche es una fuente conocida de infección por parásitos de pescado, y la histamina resiste el calor.{fdaguide} Use solo pescado que se desangró y se enhieló apenas se pescó, y que la página de Despacho califica como fresco para ceviche. Nunca use macarela, jurel ni ningún pescado que estuvo al calor. No use un pez grande de arrecife.',
      ),
    },
    {
      k: 'ul',
      items: [
        L('Ingredients: 500 g (1 lb) skinless firm white fish such as snapper or small grouper, juice of 8 to 10 limes (about 3/4 cup), 1/2 red onion, 1 sweet pepper, 1/4 cup chopped cilantro, 1 chile (to taste), 1 teaspoon salt, ice.', 'Ingredientes: 500 g (1 lb) de pescado blanco firme sin piel, como pargo o mero pequeño, jugo de 8 a 10 limones (unos 3/4 de taza), 1/2 cebolla morada, 1 chile dulce, 1/4 de taza de culantro picado, 1 chile picante (al gusto), 1 cucharadita de sal, hielo.'),
        L('1. Cut the fish into 1 cm cubes and put them in a cold glass or steel bowl set over ice.', '1. Corte el pescado en cubos de 1 cm y póngalos en un recipiente frío de vidrio o acero sobre hielo.'),
        L('2. Add salt and the lime juice so the fish is just covered. Stir and keep it cold.', '2. Agregue la sal y el jugo de limón hasta cubrir el pescado. Revuelva y manténgalo frío.'),
        L('3. Leave it for 15 to 20 minutes for a soft centre, or up to 30 minutes for a firm, white one.', '3. Déjelo de 15 a 20 minutos si quiere el centro suave, o hasta 30 minutos si lo quiere firme y blanco.'),
        L('4. Stir in the onion, pepper, cilantro and chile. Serve at once, with plantain chips or crackers. Eat it the same day and throw away what is left.', '4. Mezcle la cebolla, el chile dulce, el culantro y el chile picante. Sirva de inmediato con tostones o galletas. Cómalo el mismo día y bote lo que sobre.'),
      ],
    },
    { k: 'h', t: L('Whole fried fish (pescado frito entero)', 'Pescado frito entero (whole fried fish)') },
    {
      k: 'ul',
      items: [
        L('Ingredients: two whole fish of about 500 g (1 lb) each, such as small snapper or grouper, 1 teaspoon salt, juice of 1 lime, 2 cloves garlic, 1/2 cup flour, oil 2 cm deep in a wide pan.', 'Ingredientes: dos pescados enteros de unos 500 g (1 lb) cada uno, como pargo o mero pequeños, 1 cucharadita de sal, jugo de 1 limón, 2 dientes de ajo, 1/2 taza de harina, aceite de 2 cm de hondo en una sartén ancha.'),
        L('1. Scale, gut and rinse the fish. Cut 3 slashes into each side down to the bone so the heat gets in.', '1. Escame, destripe y enjuague los pescados. Haga 3 cortes en cada lado hasta el hueso para que entre el calor.'),
        L('2. Rub with salt, lime juice and crushed garlic and leave 15 minutes. Pat dry and dust with flour.', '2. Frote con sal, jugo de limón y ajo machacado y déjelos 15 minutos. Seque con papel y enharine.'),
        L('3. Heat the oil until a pinch of flour sizzles at once. Fry 5 to 6 minutes a side until golden and crisp, and until the thickest part reaches 63 °C (145 °F).', '3. Caliente el aceite hasta que una pizca de harina chisporrotee al instante. Fría de 5 a 6 minutos por lado hasta que estén dorados y crujientes, y la parte más gruesa llegue a 63 °C (145 °F).'),
        L('4. Serve with patacones (fried green plantain), rice and a lime wedge.', '4. Sirva con patacones (plátano verde frito), arroz y una rodaja de limón.'),
      ],
    },
    { k: 'h', t: L('Rondón (rundown, Caribbean coconut stew)', 'Rondón (rundown, sopa caribeña de coco)') },
    {
      k: 'p',
      t: L(
        'Rondón is the dish of the Caribbean coast. It is a coconut broth with fish, lobster or crab and starchy roots and green bananas, flavoured with thyme, garlic, onion and a yellow chile called chile panameño.',
        'El rondón es el plato de la costa caribe. Es un caldo de coco con pescado, langosta o cangrejo, raíces con almidón y guineos verdes, sazonado con tomillo, ajo, cebolla y un chile amarillo llamado chile panameño.',
      ),
    },
    {
      k: 'ul',
      items: [
        L('Ingredients for 4: 800 g (1.75 lb) fish steaks or fillets (snapper, snook, lionfish), 2 cups coconut milk (about 1 large coconut or 1 can), 4 cups water, 300 g (10 oz) yuca (cassava), 300 g (10 oz) ñame or yam, 2 green bananas, 1 ripe or green plantain, 1 onion, 3 cloves garlic, 4 sprigs thyme, 1 whole chile panameño or habanero (do not break it), 1 teaspoon salt.', 'Ingredientes para 4: 800 g (1,75 lb) de posta o filete de pescado (pargo, róbalo, pez león), 2 tazas de leche de coco (un coco grande o una lata), 4 tazas de agua, 300 g (10 oz) de yuca, 300 g (10 oz) de ñame, 2 guineos verdes, 1 plátano maduro o verde, 1 cebolla, 3 dientes de ajo, 4 ramitas de tomillo, 1 chile panameño o habanero entero (sin romperlo), 1 cucharadita de sal.'),
        L('1. Peel the yuca, ñame, bananas and plantain and cut them in 4 cm chunks.', '1. Pele la yuca, el ñame, los guineos y el plátano y córtelos en trozos de 4 cm.'),
        L('2. Boil the water with the onion, garlic and thyme, add the yuca and ñame and cook 15 minutes.', '2. Hierva el agua con la cebolla, el ajo y el tomillo, agregue la yuca y el ñame y cocine 15 minutos.'),
        L('3. Add the bananas, plantain and coconut milk, and simmer 10 more minutes until the roots are nearly soft.', '3. Agregue los guineos, el plátano y la leche de coco, y deje a fuego bajo 10 minutos más hasta que las raíces estén casi blandas.'),
        L('4. Lay in the fish and the whole chile, salt, and simmer gently 8 to 10 minutes until the fish is opaque and flakes. Take the chile out before it bursts, and do not stir hard so the fish stays in pieces.', '4. Ponga el pescado y el chile entero, sazone con sal y cocine a fuego bajo de 8 a 10 minutos hasta que el pescado esté opaco y se desmenuce. Saque el chile antes de que reviente y no revuelva fuerte para que el pescado no se deshaga.'),
      ],
    },
    { k: 'h', t: L('Fish in coconut sauce (pargo o róbalo en salsa de coco, "run down")', 'Pescado en salsa de coco (pargo o róbalo en salsa de coco, "run down")') },
    {
      k: 'ul',
      items: [
        L('Ingredients: 4 snapper or snook fillets or steaks (about 200 g each), 2 cups coconut milk, 1 onion, 1 sweet pepper, 3 cloves garlic, 2 sprigs thyme, 1 teaspoon salt, chile to taste, 1 tablespoon oil.', 'Ingredientes: 4 filetes o postas de pargo o róbalo (unos 200 g cada uno), 2 tazas de leche de coco, 1 cebolla, 1 chile dulce, 3 dientes de ajo, 2 ramitas de tomillo, 1 cucharadita de sal, chile al gusto, 1 cucharada de aceite.'),
        L('1. Fry the chopped onion, pepper and garlic in the oil for 5 minutes until soft.', '1. Sofría la cebolla, el chile dulce y el ajo picados en el aceite por 5 minutos hasta que estén blandos.'),
        L('2. Add the coconut milk, thyme, salt and chile and simmer 10 minutes until the sauce thickens a little.', '2. Agregue la leche de coco, el tomillo, la sal y el chile y cocine a fuego bajo 10 minutos hasta que la salsa espese un poco.'),
        L('3. Lay the fish in the sauce, cover and cook on low heat 8 to 10 minutes, until opaque and 63 °C (145 °F) in the thickest part. Serve over rice.', '3. Ponga el pescado en la salsa, tape y cocine a fuego bajo de 8 a 10 minutos, hasta que esté opaco y a 63 °C (145 °F) en la parte más gruesa. Sirva sobre arroz.'),
      ],
    },
    { k: 'h', t: L('Pickled fish (escabeche)', 'Escabeche (pickled fried fish)') },
    {
      k: 'ul',
      items: [
        L('Ingredients: 600 g (1.3 lb) fish slices (a Limón classic with Spanish mackerel, only if it was iced fast), 1/2 cup flour, oil for frying, 1 cup white vinegar, 1/2 cup water, 2 onions, 1 carrot, 1 cucumber, 3 cloves garlic, chile panameño to taste, 1 teaspoon salt.', 'Ingredientes: 600 g (1,3 lb) de rodajas de pescado (un clásico limonense con macarela, solo si se enhieló rápido), 1/2 taza de harina, aceite para freír, 1 taza de vinagre blanco, 1/2 taza de agua, 2 cebollas, 1 zanahoria, 1 pepino, 3 dientes de ajo, chile panameño al gusto, 1 cucharadita de sal.'),
        L('1. Salt the slices, dust with flour and fry until golden and cooked through. Let them drain.', '1. Sale las rodajas, enharínelas y fríalas hasta que estén doradas y bien cocidas. Escúrralas.'),
        L('2. Slice the onions, carrot, cucumber and garlic. Boil them 3 minutes in the vinegar, water, salt and chile.', '2. Corte en rodajas las cebollas, la zanahoria, el pepino y el ajo. Hiérvalos 3 minutos en el vinagre, el agua, la sal y el chile.'),
        L('3. Pour the hot mix over the fish in a glass jar, let it cool, then keep it in the fridge. Vinegar does not destroy histamine or reliably remove parasites, so use only fish that was iced fast.{fdaguide}', '3. Vierta la mezcla caliente sobre el pescado en un frasco de vidrio, deje enfriar y guárdelo en la nevera. El vinagre no destruye la histamina ni elimina de forma confiable los parásitos, así que use solo pescado que se enhieló rápido.{fdaguide}'),
      ],
    },
    { k: 'h', t: L('Whole fish in banana leaf (pescado asado en hoja de plátano)', 'Pescado asado en hoja de plátano (grilled whole fish in banana leaf)') },
    {
      k: 'ul',
      items: [
        L('Ingredients: one whole fish of about 1 kg (2 lb), such as snapper, salt, 2 limes, 3 cloves garlic, 1 onion, 1 tomato, thyme, banana leaf pieces about 60 cm long, string.', 'Ingredientes: un pescado entero de unos 1 kg (2 lb), como pargo, sal, 2 limones, 3 dientes de ajo, 1 cebolla, 1 tomate, tomillo, trozos de hoja de plátano de unos 60 cm, cuerda.'),
        L('1. Scale and gut the fish and slash both sides. Rub it with salt, lime juice and garlic.', '1. Escame y destripe el pescado y haga cortes en ambos lados. Frótelo con sal, jugo de limón y ajo.'),
        L('2. Pass the leaf quickly over a flame until it goes soft and shiny, so it does not tear.', '2. Pase la hoja rápido sobre la llama hasta que se ablande y brille, para que no se rompa.'),
        L('3. Put sliced onion, tomato and thyme inside and on the fish, wrap it in two layers of leaf and tie with string.', '3. Ponga cebolla, tomate y tomillo en rodajas dentro y sobre el pescado, envuélvalo en dos capas de hoja y amárrelo con cuerda.'),
        L('4. Cook on hot coals 12 to 15 minutes a side. Open one corner to check that the flesh is opaque and near the bone it reaches 63 °C (145 °F).', '4. Cocine sobre brasas calientes de 12 a 15 minutos por lado. Abra una esquina para ver que la carne esté opaca y que junto al hueso llegue a 63 °C (145 °F).'),
      ],
    },
    { k: 'h', t: L('Lobster (langosta) and crab (jaiba)', 'Langosta y jaiba') },
    {
      k: 'ul',
      items: [
        L('Lobster: cook it alive or freshly killed and kept on ice, because dead lobster spoils fast. Boil 2 tails of about 250 g in salted water (1 tablespoon salt per litre) for 8 to 10 minutes until the shell is bright red and the meat is white all the way through. Split and serve with melted butter, garlic and lime, or add the meat to rondón.', 'Langosta: cocínela viva o recién muerta y guardada en hielo, porque la langosta muerta se daña rápido. Hierva 2 colas de unos 250 g en agua con sal (1 cucharada por litro) de 8 a 10 minutos hasta que el caparazón esté rojo brillante y la carne blanca por completo. Pártalas y sirva con mantequilla derretida, ajo y limón, o agregue la carne al rondón.'),
        L('Crab boil (jaiba hervida): cook only live crabs. Boil 1 kg (2 lb) of crabs in a pot of water with 2 tablespoons salt, 1 onion, 4 cloves garlic, thyme and 1 chile, for 12 to 15 minutes from the time the water returns to a boil. The shell turns bright orange-red. Crack the claws with a hammer and eat with lime.', 'Jaiba hervida: cocine solo jaibas vivas. Hierva 1 kg (2 lb) de jaibas en una olla con agua, 2 cucharadas de sal, 1 cebolla, 4 dientes de ajo, tomillo y 1 chile, de 12 a 15 minutos desde que el agua vuelve a hervir. El caparazón se pone rojo anaranjado brillante. Quiebre las pinzas con un martillo y coma con limón.'),
      ],
    },
    { k: 'h', t: L('Octopus (pulpo) and lionfish (pez león)', 'Pulpo y pez león') },
    {
      k: 'ul',
      items: [
        L('Octopus: it is tough until tenderised. Clean it, remove the beak and the ink sac, then beat it on a rock or with a mallet for 5 minutes, or freeze it overnight and thaw it. Simmer it gently in unsalted water with an onion and a bay leaf for 45 to 60 minutes until a knife slides into the thickest arm. Cool it, then grill, fry or add it to ceviche.', 'Pulpo: es duro hasta que se ablanda. Límpielo, quite el pico y la bolsa de tinta y golpéelo contra una piedra o con un mazo por 5 minutos, o congélelo una noche y descongélelo. Cocínelo a fuego muy bajo en agua sin sal con una cebolla y una hoja de laurel de 45 a 60 minutos hasta que un cuchillo entre fácil en el tentáculo más grueso. Enfríelo y luego áselo, fríalo o agréguelo al ceviche.'),
        L('Lionfish: the venom is in the spines, not in the flesh. Wear thick puncture-resistant gloves and cut off all the venomous spines of the dorsal, pelvic and anal fins with kitchen scissors before you handle the fish.{lionfish} Fillet it as you would a snapper. The flesh is not venomous and can be fried, baked, steamed or poached like other non-oily fish. It is also good in ceviche (if very fresh) or in rondón.{lionfish}', 'Pez león: el veneno está en las espinas, no en la carne. Use guantes gruesos a prueba de pinchazos y corte todas las espinas venenosas de las aletas dorsal, pélvicas y anal con tijeras de cocina antes de manipular el pescado.{lionfish} Filetéelo como un pargo. La carne no es venenosa y se puede freír, hornear, cocinar al vapor o escalfar como otros pescados no grasos. También queda bien en ceviche (si está muy fresca) o en rondón.{lionfish}'),
      ],
    },
  ],
  sources: {
    fdatemp: {
      t: 'FDA, Selecting and Serving Fresh and Frozen Seafood Safely',
      u: 'https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely',
      p: 'P',
      what: L('Cook seafood to 145 °F (63 °C), flesh that separates with a fork, keep raw and cooked apart, wash boards with soap and hot water, and chill within 2 hours (1 hour above 90 °F).', 'Cocinar el marisco a 63 °C (145 °F), carne que se separa con tenedor, separar crudo y cocido, lavar tablas con jabón y agua caliente, y enfriar en 2 horas (1 hora sobre 32 °C).'),
    },
    fdaguide: {
      t: 'FDA, Fish and Fishery Products Hazards and Controls Guidance (June 2022 edition)',
      u: 'https://www.fda.gov/food/seafood-guidance-documents-regulatory-information/fish-and-fishery-products-hazards-and-controls-guidance',
      p: 'P',
      what: L('Ceviche listed among products implicated in parasite infection, brining and pickling do not eliminate parasites, and histamine is heat stable (chapters 5 and 7, read in the PDF).', 'El ceviche figura entre los productos implicados en infecciones por parásitos, la salmuera y el encurtido no eliminan los parásitos, y la histamina resiste el calor (capítulos 5 y 7, leídos en el PDF).'),
    },
    cdc: {
      t: 'CDC Yellow Book, Food Poisoning from Marine Toxins',
      u: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/food-poisoning-from-marine-toxins.html',
      p: 'P',
      what: L('Ciguatoxin is not destroyed by cooking, freezing, pickling, salting or smoking.', 'La ciguatoxina no se destruye al cocinar, congelar, encurtir, salar ni ahumar.'),
    },
    lionfish: {
      t: 'Florida Fish and Wildlife Conservation Commission, Lionfish brochure',
      u: 'https://archive.myfwc.com/archive/Saltwater%20Fishing/Lionfish/lionfish-brochure.pdf',
      p: 'S',
      what: L('Venom is in the spines on the dorsal, pelvic and anal fins, the flesh is not venomous, cook it like non-oily fish, and wear puncture-resistant gloves or cut the spines off (text of the PDF read only in part).', 'El veneno está en las espinas de las aletas dorsal, pélvicas y anal, la carne no es venenosa, se cocina como un pescado no graso, y hay que usar guantes a prueba de pinchazos o cortar las espinas (texto del PDF leído solo en parte).'),
    },
  },
};
