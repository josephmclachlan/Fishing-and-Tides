import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Cooking the local edible catch, Caribbean Costa Rica style. Quantities serve 4 people. Each dish is an illustrated card with its time in the drawing. */
export const cook: Section = {
  id: 'cook',
  title: L('Cooking', 'Cocina'),
  lede: L('Traditional ways to cook the local catch, with quantities for four people.', 'Formas tradicionales de cocinar la pesca local, con cantidades para cuatro personas.'),
  blocks: [
    {
      k: 'tiles',
      items: [
        { ico: 'nofish', tone: 'stop', h: L('Cooking does not remove ciguatera', 'Cocinar no elimina la ciguatera'), t: L('Never rely on a pan or a pot to make a risky fish safe.{cdc} Read the Ciguatera page before you keep a large reef fish.', 'Nunca cuente con la sartén o la olla para volver seguro un pez riesgoso.{cdc} Lea la página de Ciguatera antes de quedarse con un pez grande de arrecife.') },
        { ico: 'snow', tone: 'warn', h: L('Ice it first', 'Primero hielo'), t: L('How to kill, bleed and ice a fish so it stays safe, and the histamine rule for mackerel, jack and other fast-spoiling fish, are on the Dispatch page.', 'Cómo matar, desangrar y enhielar un pescado para que se mantenga seguro, y la regla de la histamina para la macarela, el jurel y otros peces que se dañan rápido, están en la página de Despacho.') },
      ],
    },
    { k: 'h', t: L('Safe temperatures and leftovers', 'Temperaturas seguras y sobras') },
    {
      k: 'fig',
      fig: 'temp',
      label: L('A thermometer in the thickest part of a fish fillet reading 63 degrees Celsius, and a fork', 'Un termómetro en la parte más gruesa de un filete de pescado que marca 63 grados Celsius, y un tenedor'),
      tones: ['go', 'info'],
      marks: [
        L('Cook fish and shellfish until the thickest part reaches 63 °C (145 °F).{fdatemp}', 'Cocine el pescado y el marisco hasta que la parte más gruesa llegue a 63 °C (145 °F).{fdatemp}'),
        L('No thermometer? The flesh should separate easily with a fork.{fdatemp}', '¿Sin termómetro? La carne debe separarse fácil con un tenedor.{fdatemp}'),
      ],
    },
    {
      k: 'stats',
      items: [
        { n: L('2 h', '2 h'), t: L('Put cooked fish in the fridge or on ice within 2 hours.{fdatemp}', 'Ponga el pescado cocinado en la nevera o en hielo dentro de 2 horas.{fdatemp}') },
        { n: L('1 h', '1 h'), t: L('Within 1 hour when it is hotter than 32 °C (90 °F).{fdatemp}', 'Dentro de 1 hora si hace más de 32 °C (90 °F).{fdatemp}') },
      ],
    },
    {
      k: 'dodont',
      do: [
        L('Use one board for raw fish.', 'Use una tabla para el pescado crudo.'),
        L('Wash the board, the knife and your hands with soap and hot water afterwards.{fdatemp}', 'Lave la tabla, el cuchillo y sus manos con jabón y agua caliente después.{fdatemp}'),
      ],
      dont: [
        L('Let raw fish or its juices touch cooked food or anything eaten raw.{fdatemp}', 'Deje que el pescado crudo o sus jugos toquen la comida cocida o lo que se come crudo.{fdatemp}'),
        L('Keep cooked fish at room temperature.', 'Deje el pescado cocinado a temperatura ambiente.'),
      ],
    },
    {
      k: 'dodont',
      h: L('Ceviche: only the freshest fish', 'Ceviche: solo el pescado más fresco'),
      do: [
        L('Use fish that was bled and iced right after it was caught, and that the Dispatch page grades as ceviche-fresh.', 'Use pescado que se desangró y se enhieló apenas se pescó, y que la página de Despacho califica como fresco para ceviche.'),
      ],
      dont: [
        L('Use mackerel, jack or any fish that sat warm.', 'Use macarela, jurel ni ningún pescado que estuvo al calor.'),
        L('Use a large reef fish.', 'Use un pez grande de arrecife.'),
        L('Count on lime juice to cook it: ceviche is a known source of fish parasite infection, and histamine is heat stable.{fdaguide}', 'Cuente con el jugo de limón para cocinarlo: el ceviche es una fuente conocida de infección por parásitos de pescado, y la histamina resiste el calor.{fdaguide}'),
      ],
    },
    { k: 'h', t: L('Raw and cured', 'Crudo y curado') },
    {
      k: 'recipe', fig: 'ceviche', h: L('Ceviche', 'Ceviche'), serves: L('For 4', 'Para 4'),
      t: L('Raw fish "cooked" in lime juice. Eat it the same day and throw away what is left.', 'Pescado crudo "cocido" en jugo de limón. Cómalo el mismo día y bote lo que sobre.'),
      ings: [
        L('500 g (1 lb) skinless firm white fish, such as snapper or small grouper', '500 g (1 lb) de pescado blanco firme sin piel, como pargo o mero pequeño'),
        L('Juice of 8 to 10 limes (about 3/4 cup)', 'Jugo de 8 a 10 limones (unos 3/4 de taza)'),
        L('1/2 red onion', '1/2 cebolla morada'), L('1 sweet pepper', '1 chile dulce'), L('1/4 cup chopped cilantro', '1/4 de taza de culantro picado'),
        L('1 chile (to taste)', '1 chile picante (al gusto)'), L('1 teaspoon salt', '1 cucharadita de sal'), L('Ice', 'Hielo'),
      ],
      steps: [
        { t: L('Cut the fish into cubes in a cold glass or steel bowl set over ice.', 'Corte el pescado en cubos en un recipiente frío de vidrio o acero sobre hielo.'), at: L('1 cm cubes', 'cubos de 1 cm') },
        { t: L('Add salt and lime juice to just cover. Stir and keep it cold.', 'Agregue sal y jugo de limón hasta cubrir. Revuelva y manténgalo frío.') },
        { t: L('Wait: 15 to 20 minutes for a soft centre, up to 30 for a firm, white one.', 'Espere: de 15 a 20 minutos para un centro suave, hasta 30 para uno firme y blanco.'), at: L('15 to 30 min', '15 a 30 min') },
        { t: L('Stir in onion, pepper, cilantro and chile. Serve at once with plantain chips or crackers.', 'Mezcle cebolla, chile dulce, culantro y chile picante. Sirva de inmediato con tostones o galletas.') },
      ],
    },
    {
      k: 'recipe', fig: 'escabeche', h: L('Pickled fish (escabeche)', 'Escabeche'), serves: L('For 4', 'Para 4'), tone: 'warn',
      t: L('Fried fish under hot vinegar and vegetables. A Limón classic with Spanish mackerel, only if it was iced fast.', 'Pescado frito bajo vinagre caliente y verduras. Un clásico limonense con macarela, solo si se enhieló rápido.'),
      ings: [
        L('600 g (1.3 lb) fish slices', '600 g (1,3 lb) de rodajas de pescado'), L('1/2 cup flour', '1/2 taza de harina'), L('Oil for frying', 'Aceite para freír'),
        L('1 cup white vinegar', '1 taza de vinagre blanco'), L('1/2 cup water', '1/2 taza de agua'), L('2 onions', '2 cebollas'), L('1 carrot', '1 zanahoria'),
        L('1 cucumber', '1 pepino'), L('3 cloves garlic', '3 dientes de ajo'), L('Chile panameño to taste', 'Chile panameño al gusto'), L('1 teaspoon salt', '1 cucharadita de sal'),
      ],
      steps: [
        { t: L('Salt the slices, dust with flour and fry until golden and cooked through. Drain.', 'Sale las rodajas, enharínelas y fríalas hasta que estén doradas y bien cocidas. Escúrralas.') },
        { t: L('Slice the onions, carrot, cucumber and garlic. Boil them in the vinegar, water, salt and chile.', 'Corte en rodajas cebollas, zanahoria, pepino y ajo. Hiérvalos en el vinagre, el agua, la sal y el chile.'), at: L('3 min', '3 min') },
        { t: L('Pour the hot mix over the fish in a glass jar, cool it, then keep it in the fridge.', 'Vierta la mezcla caliente sobre el pescado en un frasco de vidrio, deje enfriar y guárdelo en la nevera.') },
        { t: L('Vinegar does not destroy histamine or reliably remove parasites, so use only fish that was iced fast.{fdaguide}', 'El vinagre no destruye la histamina ni elimina de forma confiable los parásitos, así que use solo pescado que se enhieló rápido.{fdaguide}') },
      ],
    },
    { k: 'h', t: L('Pan and pot', 'Sartén y olla') },
    {
      k: 'recipe', fig: 'fried', h: L('Whole fried fish', 'Pescado frito entero'), serves: L('For 4', 'Para 4'),
      t: L('Pescado frito entero: crisp outside, cooked to the bone.', 'Pescado frito entero: crujiente por fuera, cocido hasta el hueso.'),
      ings: [
        L('2 whole fish of about 500 g (1 lb) each, such as small snapper or grouper', '2 pescados enteros de unos 500 g (1 lb) cada uno, como pargo o mero pequeños'),
        L('1 teaspoon salt', '1 cucharadita de sal'), L('Juice of 1 lime', 'Jugo de 1 limón'), L('2 cloves garlic', '2 dientes de ajo'), L('1/2 cup flour', '1/2 taza de harina'),
        L('Oil 2 cm deep in a wide pan', 'Aceite de 2 cm de hondo en una sartén ancha'),
      ],
      steps: [
        { t: L('Scale, gut and rinse. Cut 3 slashes into each side down to the bone so the heat gets in.', 'Escame, destripe y enjuague. Haga 3 cortes en cada lado hasta el hueso para que entre el calor.') },
        { t: L('Rub with salt, lime juice and crushed garlic. Pat dry and dust with flour.', 'Frote con sal, jugo de limón y ajo machacado. Seque con papel y enharine.'), at: L('15 min', '15 min') },
        { t: L('Heat the oil until a pinch of flour sizzles at once. Fry until golden and crisp.', 'Caliente el aceite hasta que una pizca de harina chisporrotee al instante. Fría hasta que estén dorados y crujientes.'), at: L('5 to 6 min a side', '5 a 6 min por lado') },
        { t: L('Check the thickest part.', 'Revise la parte más gruesa.'), at: L('63 °C (145 °F)', '63 °C (145 °F)') },
        { t: L('Serve with patacones (fried green plantain), rice and a lime wedge.', 'Sirva con patacones (plátano verde frito), arroz y una rodaja de limón.') },
      ],
    },
    {
      k: 'recipe', fig: 'rondon', h: L('Rondón (rundown)', 'Rondón (rundown)'), serves: L('For 4', 'Para 4'),
      t: L('The dish of the Caribbean coast: a coconut broth with fish, lobster or crab, starchy roots and green bananas, flavoured with thyme, garlic, onion and a yellow chile called chile panameño.', 'El plato de la costa caribe: un caldo de coco con pescado, langosta o cangrejo, raíces con almidón y guineos verdes, sazonado con tomillo, ajo, cebolla y un chile amarillo llamado chile panameño.'),
      ings: [
        L('800 g (1.75 lb) fish steaks or fillets (snapper, snook, lionfish)', '800 g (1,75 lb) de posta o filete de pescado (pargo, róbalo, pez león)'),
        L('2 cups coconut milk (about 1 large coconut or 1 can)', '2 tazas de leche de coco (un coco grande o una lata)'), L('4 cups water', '4 tazas de agua'),
        L('300 g (10 oz) yuca (cassava)', '300 g (10 oz) de yuca'), L('300 g (10 oz) ñame or yam', '300 g (10 oz) de ñame'), L('2 green bananas', '2 guineos verdes'),
        L('1 ripe or green plantain', '1 plátano maduro o verde'), L('1 onion', '1 cebolla'), L('3 cloves garlic', '3 dientes de ajo'), L('4 sprigs thyme', '4 ramitas de tomillo'),
        L('1 whole chile panameño or habanero (do not break it)', '1 chile panameño o habanero entero (sin romperlo)'), L('1 teaspoon salt', '1 cucharadita de sal'),
      ],
      steps: [
        { t: L('Peel the yuca, ñame, bananas and plantain and cut them in 4 cm chunks.', 'Pele la yuca, el ñame, los guineos y el plátano y córtelos en trozos de 4 cm.'), at: L('4 cm chunks', 'trozos de 4 cm') },
        { t: L('Boil the water with onion, garlic and thyme, add the yuca and ñame.', 'Hierva el agua con la cebolla, el ajo y el tomillo, agregue la yuca y el ñame.'), at: L('15 min', '15 min') },
        { t: L('Add the bananas, plantain and coconut milk. Simmer until the roots are nearly soft.', 'Agregue los guineos, el plátano y la leche de coco. Deje a fuego bajo hasta que las raíces estén casi blandas.'), at: L('10 min', '10 min') },
        { t: L('Lay in the fish and the whole chile, add salt, and simmer gently until the fish is opaque and flakes.', 'Ponga el pescado y el chile entero, sazone con sal y cocine a fuego bajo hasta que el pescado esté opaco y se desmenuce.'), at: L('8 to 10 min', '8 a 10 min') },
        { t: L('Take the chile out before it bursts. Do not stir hard, so the fish stays in pieces.', 'Saque el chile antes de que reviente. No revuelva fuerte para que el pescado no se deshaga.') },
      ],
    },
    {
      k: 'recipe', fig: 'sauce', h: L('Fish in coconut sauce', 'Pescado en salsa de coco'), serves: L('For 4', 'Para 4'),
      t: L('Pargo o róbalo en salsa de coco ("run down"): fish simmered in a thick coconut sauce, served over rice.', 'Pargo o róbalo en salsa de coco ("run down"): pescado cocinado en una salsa espesa de coco, servido sobre arroz.'),
      ings: [
        L('4 snapper or snook fillets or steaks (about 200 g each)', '4 filetes o postas de pargo o róbalo (unos 200 g cada uno)'), L('2 cups coconut milk', '2 tazas de leche de coco'),
        L('1 onion', '1 cebolla'), L('1 sweet pepper', '1 chile dulce'), L('3 cloves garlic', '3 dientes de ajo'), L('2 sprigs thyme', '2 ramitas de tomillo'),
        L('1 teaspoon salt', '1 cucharadita de sal'), L('Chile to taste', 'Chile al gusto'), L('1 tablespoon oil', '1 cucharada de aceite'),
      ],
      steps: [
        { t: L('Fry the chopped onion, pepper and garlic in the oil until soft.', 'Sofría la cebolla, el chile dulce y el ajo picados en el aceite hasta que estén blandos.'), at: L('5 min', '5 min') },
        { t: L('Add the coconut milk, thyme, salt and chile and simmer until the sauce thickens a little.', 'Agregue la leche de coco, el tomillo, la sal y el chile y cocine a fuego bajo hasta que la salsa espese un poco.'), at: L('10 min', '10 min') },
        { t: L('Lay the fish in the sauce, cover and cook on low heat until opaque.', 'Ponga el pescado en la salsa, tape y cocine a fuego bajo hasta que esté opaco.'), at: L('8 to 10 min', '8 a 10 min') },
        { t: L('Check the thickest part. Serve over rice.', 'Revise la parte más gruesa. Sirva sobre arroz.'), at: L('63 °C (145 °F)', '63 °C (145 °F)') },
      ],
    },
    { k: 'h', t: L('Coals and boiling water', 'Brasas y agua hirviendo') },
    {
      k: 'recipe', fig: 'leaf', h: L('Fish in banana leaf', 'Pescado en hoja de plátano'), serves: L('For 4', 'Para 4'),
      t: L('Pescado asado en hoja de plátano: a whole fish grilled wrapped in banana leaf.', 'Pescado asado en hoja de plátano: un pescado entero asado envuelto en hoja de plátano.'),
      ings: [
        L('1 whole fish of about 1 kg (2 lb), such as snapper', '1 pescado entero de unos 1 kg (2 lb), como pargo'), L('Salt', 'Sal'), L('2 limes', '2 limones'), L('3 cloves garlic', '3 dientes de ajo'),
        L('1 onion', '1 cebolla'), L('1 tomato', '1 tomate'), L('Thyme', 'Tomillo'), L('Banana leaf pieces about 60 cm long', 'Trozos de hoja de plátano de unos 60 cm'), L('String', 'Cuerda'),
      ],
      steps: [
        { t: L('Scale and gut the fish and slash both sides. Rub with salt, lime juice and garlic.', 'Escame y destripe el pescado y haga cortes en ambos lados. Frótelo con sal, jugo de limón y ajo.') },
        { t: L('Pass the leaf quickly over a flame until it goes soft and shiny, so it does not tear.', 'Pase la hoja rápido sobre la llama hasta que se ablande y brille, para que no se rompa.') },
        { t: L('Put sliced onion, tomato and thyme inside and on the fish, wrap in two layers of leaf and tie with string.', 'Ponga cebolla, tomate y tomillo en rodajas dentro y sobre el pescado, envuélvalo en dos capas de hoja y amárrelo con cuerda.') },
        { t: L('Cook on hot coals.', 'Cocine sobre brasas calientes.'), at: L('12 to 15 min a side', '12 a 15 min por lado') },
        { t: L('Open one corner: the flesh should be opaque, and this hot near the bone.', 'Abra una esquina: la carne debe estar opaca, y a esta temperatura junto al hueso.'), at: L('63 °C (145 °F)', '63 °C (145 °F)') },
      ],
    },
    {
      k: 'recipe', fig: 'lobster', h: L('Lobster (langosta)', 'Langosta'), serves: L('2 tails', '2 colas'),
      t: L('Cook it alive or freshly killed and kept on ice, because dead lobster spoils fast.', 'Cocínela viva o recién muerta y guardada en hielo, porque la langosta muerta se daña rápido.'),
      ings: [L('2 tails of about 250 g each', '2 colas de unos 250 g cada una'), L('Salted water, 1 tablespoon salt per litre', 'Agua con sal, 1 cucharada por litro'), L('Melted butter, garlic and lime to serve', 'Mantequilla derretida, ajo y limón para servir')],
      steps: [
        { t: L('Boil the tails in the salted water.', 'Hierva las colas en el agua con sal.'), at: L('8 to 10 min', '8 a 10 min') },
        { t: L('Done when the shell is bright red and the meat is white all the way through.', 'Están listas cuando el caparazón es rojo brillante y la carne blanca por completo.') },
        { t: L('Split and serve with melted butter, garlic and lime, or add the meat to rondón.', 'Pártalas y sirva con mantequilla derretida, ajo y limón, o agregue la carne al rondón.') },
      ],
    },
    {
      k: 'recipe', fig: 'crab', h: L('Crab (jaiba hervida)', 'Jaiba hervida'), serves: L('1 kg (2 lb)', '1 kg (2 lb)'), tone: 'warn',
      t: L('Cook only live crabs.', 'Cocine solo jaibas vivas.'),
      ings: [L('1 kg (2 lb) live crabs', '1 kg (2 lb) de jaibas vivas'), L('2 tablespoons salt', '2 cucharadas de sal'), L('1 onion', '1 cebolla'), L('4 cloves garlic', '4 dientes de ajo'), L('Thyme', 'Tomillo'), L('1 chile', '1 chile'), L('Lime to serve', 'Limón para servir')],
      steps: [
        { t: L('Boil the crabs in a pot of water with the salt, onion, garlic, thyme and chile. Count from the time the water returns to a boil.', 'Hierva las jaibas en una olla con agua, la sal, la cebolla, el ajo, el tomillo y el chile. Cuente desde que el agua vuelve a hervir.'), at: L('12 to 15 min', '12 a 15 min') },
        { t: L('The shell turns bright orange-red.', 'El caparazón se pone rojo anaranjado brillante.') },
        { t: L('Crack the claws with a hammer and eat with lime.', 'Quiebre las pinzas con un martillo y coma con limón.') },
      ],
    },
    { k: 'h', t: L('Handle with care', 'Con cuidado') },
    {
      k: 'recipe', fig: 'octopus', h: L('Octopus (pulpo)', 'Pulpo'),
      t: L('Tough until tenderised.', 'Duro hasta que se ablanda.'),
      ings: [L('1 octopus', '1 pulpo'), L('Unsalted water', 'Agua sin sal'), L('1 onion', '1 cebolla'), L('1 bay leaf', '1 hoja de laurel')],
      steps: [
        { t: L('Clean it and remove the beak and the ink sac.', 'Límpielo y quite el pico y la bolsa de tinta.') },
        { t: L('Beat it on a rock or with a mallet, or freeze it overnight and thaw it.', 'Golpéelo contra una piedra o con un mazo, o congélelo una noche y descongélelo.'), at: L('5 min beating', '5 min golpeando') },
        { t: L('Simmer gently in unsalted water with the onion and bay leaf, until a knife slides into the thickest arm.', 'Cocínelo a fuego muy bajo en agua sin sal con la cebolla y la hoja de laurel, hasta que un cuchillo entre fácil en el tentáculo más grueso.'), at: L('45 to 60 min', '45 a 60 min') },
        { t: L('Cool it, then grill, fry or add it to ceviche.', 'Enfríelo y luego áselo, fríalo o agréguelo al ceviche.') },
      ],
    },
    {
      k: 'recipe', fig: 'lionfish', h: L('Lionfish (pez león)', 'Pez león'), tone: 'warn',
      t: L('The venom is in the spines, not in the flesh.{lionfish}', 'El veneno está en las espinas, no en la carne.{lionfish}'),
      ings: [L('Thick puncture-resistant gloves', 'Guantes gruesos a prueba de pinchazos'), L('Kitchen scissors', 'Tijeras de cocina')],
      steps: [
        { t: L('Wear the gloves.', 'Use los guantes.') },
        { t: L('Cut off all the venomous spines of the dorsal, pelvic and anal fins before you handle the fish.{lionfish}', 'Corte todas las espinas venenosas de las aletas dorsal, pélvicas y anal antes de manipular el pescado.{lionfish}') },
        { t: L('Fillet it as you would a snapper.', 'Filetéelo como un pargo.') },
        { t: L('The flesh is not venomous: fry, bake, steam or poach it like other non-oily fish.{lionfish}', 'La carne no es venenosa: fríala, hornéela, cocínela al vapor o escálfela como otros pescados no grasos.{lionfish}') },
        { t: L('Good in rondón. Lionfish can still carry ciguatera on some Caribbean reefs, so read the Ciguatera page first and ask local fishers.{lfcig}', 'Queda bien en rondón. El pez león igual puede tener ciguatera en algunos arrecifes del Caribe, así que lea antes la página de Ciguatera y pregunte a los pescadores locales.{lfcig}') },
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
    lfcig: {
      t: 'Hardison et al. 2018, Investigation of ciguatoxins in invasive lionfish from the greater Caribbean region, PLoS ONE 13(6): e0198358',
      u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6010213/',
      p: 'P',
      what: L('Of 293 lionfish from 13 places, 0.7% were above the FDA guidance level, but measurable ciguatoxin was found in up to 53% of fish in parts of the eastern Caribbean; lionfish can carry it to levels of concern in ciguatera areas.', 'De 293 peces león de 13 lugares, 0,7% superó el nivel guía de la FDA, pero se halló ciguatoxina medible hasta en 53% de los peces en partes del Caribe oriental; el pez león puede acumularla a niveles preocupantes en zonas de ciguatera.'),
    },
    lionfish: {
      t: 'Florida Fish and Wildlife Conservation Commission, Lionfish brochure',
      u: 'https://archive.myfwc.com/archive/Saltwater%20Fishing/Lionfish/lionfish-brochure.pdf',
      p: 'S',
      what: L('Venom is in the spines on the dorsal, pelvic and anal fins, the flesh is not venomous, cook it like non-oily fish, and wear puncture-resistant gloves or cut the spines off (text of the PDF read only in part).', 'El veneno está en las espinas de las aletas dorsal, pélvicas y anal, la carne no es venenosa, se cocina como un pescado no graso, y hay que usar guantes a prueba de pinchazos o cortar las espinas (texto del PDF leído solo en parte).'),
    },
  },
};
