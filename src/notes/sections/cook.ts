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
    {
      k: 'cards',
      h: L('Raw and cured', 'Crudo y curado'),
      items: [
        {
          fig: 'ceviche',
          tag: L('Ceviche · for 4', 'Ceviche · para 4'),
          h: L('Ceviche', 'Ceviche'),
          t: L('500 g (1 lb) skinless firm white fish such as snapper or small grouper, juice of 8 to 10 limes (about 3/4 cup), 1/2 red onion, 1 sweet pepper, 1/4 cup chopped cilantro, 1 chile (to taste), 1 teaspoon salt, ice.', '500 g (1 lb) de pescado blanco firme sin piel, como pargo o mero pequeño, jugo de 8 a 10 limones (unos 3/4 de taza), 1/2 cebolla morada, 1 chile dulce, 1/4 de taza de culantro picado, 1 chile picante (al gusto), 1 cucharadita de sal, hielo.'),
          list: [
            L('Cut the fish into 1 cm cubes in a cold glass or steel bowl set over ice.', 'Corte el pescado en cubos de 1 cm en un recipiente frío de vidrio o acero sobre hielo.'),
            L('Add salt and lime juice to just cover. Stir and keep it cold.', 'Agregue sal y jugo de limón hasta cubrir. Revuelva y manténgalo frío.'),
            L('Wait 15 to 20 minutes for a soft centre, or up to 30 for a firm, white one.', 'Espere de 15 a 20 minutos para un centro suave, o hasta 30 para uno firme y blanco.'),
            L('Stir in onion, pepper, cilantro and chile. Serve at once with plantain chips or crackers. Eat it the same day and throw away what is left.', 'Mezcle cebolla, chile dulce, culantro y chile picante. Sirva de inmediato con tostones o galletas. Cómalo el mismo día y bote lo que sobre.'),
          ],
        },
        {
          fig: 'escabeche',
          tag: L('Escabeche · for 4', 'Escabeche · para 4'),
          h: L('Pickled fish (escabeche)', 'Escabeche'),
          tone: 'warn',
          t: L('600 g (1.3 lb) fish slices (a Limón classic with Spanish mackerel, only if it was iced fast), 1/2 cup flour, oil, 1 cup white vinegar, 1/2 cup water, 2 onions, 1 carrot, 1 cucumber, 3 cloves garlic, chile panameño to taste, 1 teaspoon salt.', '600 g (1,3 lb) de rodajas de pescado (un clásico limonense con macarela, solo si se enhieló rápido), 1/2 taza de harina, aceite, 1 taza de vinagre blanco, 1/2 taza de agua, 2 cebollas, 1 zanahoria, 1 pepino, 3 dientes de ajo, chile panameño al gusto, 1 cucharadita de sal.'),
          list: [
            L('Salt the slices, dust with flour and fry until golden and cooked through. Drain.', 'Sale las rodajas, enharínelas y fríalas hasta que estén doradas y bien cocidas. Escúrralas.'),
            L('Slice the onions, carrot, cucumber and garlic. Boil them 3 minutes in the vinegar, water, salt and chile.', 'Corte en rodajas cebollas, zanahoria, pepino y ajo. Hiérvalos 3 minutos en el vinagre, el agua, la sal y el chile.'),
            L('Pour the hot mix over the fish in a glass jar, cool it, then keep it in the fridge.', 'Vierta la mezcla caliente sobre el pescado en un frasco de vidrio, deje enfriar y guárdelo en la nevera.'),
            L('Vinegar does not destroy histamine or reliably remove parasites, so use only fish that was iced fast.{fdaguide}', 'El vinagre no destruye la histamina ni elimina de forma confiable los parásitos, así que use solo pescado que se enhieló rápido.{fdaguide}'),
          ],
        },
      ],
    },
    {
      k: 'cards',
      h: L('Pan and pot', 'Sartén y olla'),
      items: [
        {
          fig: 'fried',
          tag: L('Whole fried fish · for 4', 'Pescado frito entero · para 4'),
          h: L('Whole fried fish', 'Pescado frito entero'),
          t: L('Two whole fish of about 500 g (1 lb) each, such as small snapper or grouper, 1 teaspoon salt, juice of 1 lime, 2 cloves garlic, 1/2 cup flour, oil 2 cm deep in a wide pan.', 'Dos pescados enteros de unos 500 g (1 lb) cada uno, como pargo o mero pequeños, 1 cucharadita de sal, jugo de 1 limón, 2 dientes de ajo, 1/2 taza de harina, aceite de 2 cm de hondo en una sartén ancha.'),
          list: [
            L('Scale, gut and rinse. Cut 3 slashes into each side down to the bone so the heat gets in.', 'Escame, destripe y enjuague. Haga 3 cortes en cada lado hasta el hueso para que entre el calor.'),
            L('Rub with salt, lime juice and crushed garlic, leave 15 minutes. Pat dry and dust with flour.', 'Frote con sal, jugo de limón y ajo machacado y déjelos 15 minutos. Seque con papel y enharine.'),
            L('Heat the oil until a pinch of flour sizzles at once. Fry 5 to 6 minutes a side until golden and crisp, and 63 °C (145 °F) in the thickest part.', 'Caliente el aceite hasta que una pizca de harina chisporrotee al instante. Fría de 5 a 6 minutos por lado hasta que estén dorados y crujientes, y a 63 °C (145 °F) en la parte más gruesa.'),
            L('Serve with patacones (fried green plantain), rice and a lime wedge.', 'Sirva con patacones (plátano verde frito), arroz y una rodaja de limón.'),
          ],
        },
        {
          fig: 'rondon',
          tag: L('Rondón · for 4', 'Rondón · para 4'),
          h: L('Rondón (rundown)', 'Rondón (rundown)'),
          t: L('The dish of the Caribbean coast: a coconut broth with fish, lobster or crab, starchy roots and green bananas, with thyme, garlic, onion and a yellow chile called chile panameño. 800 g (1.75 lb) fish steaks or fillets (snapper, snook, lionfish), 2 cups coconut milk (about 1 large coconut or 1 can), 4 cups water, 300 g (10 oz) yuca (cassava), 300 g (10 oz) ñame or yam, 2 green bananas, 1 ripe or green plantain, 1 onion, 3 cloves garlic, 4 sprigs thyme, 1 whole chile panameño or habanero (do not break it), 1 teaspoon salt.', 'El plato de la costa caribe: un caldo de coco con pescado, langosta o cangrejo, raíces con almidón y guineos verdes, con tomillo, ajo, cebolla y un chile amarillo llamado chile panameño. 800 g (1,75 lb) de posta o filete de pescado (pargo, róbalo, pez león), 2 tazas de leche de coco (un coco grande o una lata), 4 tazas de agua, 300 g (10 oz) de yuca, 300 g (10 oz) de ñame, 2 guineos verdes, 1 plátano maduro o verde, 1 cebolla, 3 dientes de ajo, 4 ramitas de tomillo, 1 chile panameño o habanero entero (sin romperlo), 1 cucharadita de sal.'),
          list: [
            L('Peel the yuca, ñame, bananas and plantain and cut them in 4 cm chunks.', 'Pele la yuca, el ñame, los guineos y el plátano y córtelos en trozos de 4 cm.'),
            L('Boil the water with onion, garlic and thyme, add the yuca and ñame, cook 15 minutes.', 'Hierva el agua con la cebolla, el ajo y el tomillo, agregue la yuca y el ñame y cocine 15 minutos.'),
            L('Add the bananas, plantain and coconut milk, and simmer 10 more minutes until the roots are nearly soft.', 'Agregue los guineos, el plátano y la leche de coco, y deje a fuego bajo 10 minutos más hasta que las raíces estén casi blandas.'),
            L('Lay in the fish and the whole chile, salt, and simmer gently 8 to 10 minutes until the fish is opaque and flakes. Take the chile out before it bursts. Do not stir hard, so the fish stays in pieces.', 'Ponga el pescado y el chile entero, sazone con sal y cocine a fuego bajo de 8 a 10 minutos hasta que el pescado esté opaco y se desmenuce. Saque el chile antes de que reviente. No revuelva fuerte para que el pescado no se deshaga.'),
          ],
        },
        {
          fig: 'sauce',
          tag: L('Run down · for 4', 'Run down · para 4'),
          h: L('Fish in coconut sauce', 'Pescado en salsa de coco'),
          t: L('Pargo o róbalo en salsa de coco ("run down"). 4 snapper or snook fillets or steaks (about 200 g each), 2 cups coconut milk, 1 onion, 1 sweet pepper, 3 cloves garlic, 2 sprigs thyme, 1 teaspoon salt, chile to taste, 1 tablespoon oil.', 'Pargo o róbalo en salsa de coco ("run down"). 4 filetes o postas de pargo o róbalo (unos 200 g cada uno), 2 tazas de leche de coco, 1 cebolla, 1 chile dulce, 3 dientes de ajo, 2 ramitas de tomillo, 1 cucharadita de sal, chile al gusto, 1 cucharada de aceite.'),
          list: [
            L('Fry the chopped onion, pepper and garlic in the oil for 5 minutes until soft.', 'Sofría la cebolla, el chile dulce y el ajo picados en el aceite por 5 minutos hasta que estén blandos.'),
            L('Add the coconut milk, thyme, salt and chile and simmer 10 minutes until the sauce thickens a little.', 'Agregue la leche de coco, el tomillo, la sal y el chile y cocine a fuego bajo 10 minutos hasta que la salsa espese un poco.'),
            L('Lay the fish in the sauce, cover and cook on low heat 8 to 10 minutes, until opaque and 63 °C (145 °F) in the thickest part. Serve over rice.', 'Ponga el pescado en la salsa, tape y cocine a fuego bajo de 8 a 10 minutos, hasta que esté opaco y a 63 °C (145 °F) en la parte más gruesa. Sirva sobre arroz.'),
          ],
        },
      ],
    },
    {
      k: 'cards',
      h: L('Coals and boiling water', 'Brasas y agua hirviendo'),
      items: [
        {
          fig: 'leaf',
          tag: L('Grilled whole fish · for 4', 'Pescado asado entero · para 4'),
          h: L('Fish in banana leaf', 'Pescado en hoja de plátano'),
          t: L('Pescado asado en hoja de plátano. One whole fish of about 1 kg (2 lb), such as snapper, salt, 2 limes, 3 cloves garlic, 1 onion, 1 tomato, thyme, banana leaf pieces about 60 cm long, string.', 'Pescado asado en hoja de plátano. Un pescado entero de unos 1 kg (2 lb), como pargo, sal, 2 limones, 3 dientes de ajo, 1 cebolla, 1 tomate, tomillo, trozos de hoja de plátano de unos 60 cm, cuerda.'),
          list: [
            L('Scale and gut the fish and slash both sides. Rub with salt, lime juice and garlic.', 'Escame y destripe el pescado y haga cortes en ambos lados. Frótelo con sal, jugo de limón y ajo.'),
            L('Pass the leaf quickly over a flame until it goes soft and shiny, so it does not tear.', 'Pase la hoja rápido sobre la llama hasta que se ablande y brille, para que no se rompa.'),
            L('Put sliced onion, tomato and thyme inside and on the fish, wrap in two layers of leaf and tie with string.', 'Ponga cebolla, tomate y tomillo en rodajas dentro y sobre el pescado, envuélvalo en dos capas de hoja y amárrelo con cuerda.'),
            L('Cook on hot coals 12 to 15 minutes a side. Open one corner: the flesh should be opaque, and 63 °C (145 °F) near the bone.', 'Cocine sobre brasas calientes de 12 a 15 minutos por lado. Abra una esquina: la carne debe estar opaca y a 63 °C (145 °F) junto al hueso.'),
          ],
        },
        {
          fig: 'lobster',
          tag: L('Lobster · langosta', 'Langosta'),
          h: L('Lobster', 'Langosta'),
          t: L('Cook it alive or freshly killed and kept on ice, because dead lobster spoils fast.', 'Cocínela viva o recién muerta y guardada en hielo, porque la langosta muerta se daña rápido.'),
          list: [
            L('Boil 2 tails of about 250 g in salted water (1 tablespoon salt per litre) for 8 to 10 minutes.', 'Hierva 2 colas de unos 250 g en agua con sal (1 cucharada por litro) de 8 a 10 minutos.'),
            L('Done when the shell is bright red and the meat is white all the way through.', 'Está lista cuando el caparazón es rojo brillante y la carne blanca por completo.'),
            L('Split and serve with melted butter, garlic and lime, or add the meat to rondón.', 'Pártalas y sirva con mantequilla derretida, ajo y limón, o agregue la carne al rondón.'),
          ],
        },
        {
          fig: 'crab',
          tag: L('Crab boil · jaiba hervida', 'Jaiba hervida'),
          h: L('Crab', 'Jaiba'),
          tone: 'warn',
          t: L('Cook only live crabs.', 'Cocine solo jaibas vivas.'),
          list: [
            L('Boil 1 kg (2 lb) of crabs in water with 2 tablespoons salt, 1 onion, 4 cloves garlic, thyme and 1 chile.', 'Hierva 1 kg (2 lb) de jaibas en agua con 2 cucharadas de sal, 1 cebolla, 4 dientes de ajo, tomillo y 1 chile.'),
            L('Cook 12 to 15 minutes from the time the water returns to a boil. The shell turns bright orange-red.', 'Cocine de 12 a 15 minutos desde que el agua vuelve a hervir. El caparazón se pone rojo anaranjado brillante.'),
            L('Crack the claws with a hammer and eat with lime.', 'Quiebre las pinzas con un martillo y coma con limón.'),
          ],
        },
      ],
    },
    {
      k: 'cards',
      h: L('Handle with care', 'Con cuidado'),
      items: [
        {
          fig: 'octopus',
          tag: L('Octopus · pulpo', 'Pulpo'),
          h: L('Octopus', 'Pulpo'),
          t: L('It is tough until tenderised.', 'Es duro hasta que se ablanda.'),
          list: [
            L('Clean it and remove the beak and the ink sac.', 'Límpielo y quite el pico y la bolsa de tinta.'),
            L('Beat it on a rock or with a mallet for 5 minutes, or freeze it overnight and thaw it.', 'Golpéelo contra una piedra o con un mazo por 5 minutos, o congélelo una noche y descongélelo.'),
            L('Simmer gently in unsalted water with an onion and a bay leaf for 45 to 60 minutes, until a knife slides into the thickest arm.', 'Cocínelo a fuego muy bajo en agua sin sal con una cebolla y una hoja de laurel de 45 a 60 minutos, hasta que un cuchillo entre fácil en el tentáculo más grueso.'),
            L('Cool it, then grill, fry or add it to ceviche.', 'Enfríelo y luego áselo, fríalo o agréguelo al ceviche.'),
          ],
        },
        {
          fig: 'lionfish',
          tag: L('Lionfish · pez león', 'Pez león'),
          h: L('Lionfish', 'Pez león'),
          tone: 'warn',
          t: L('The venom is in the spines, not in the flesh.{lionfish}', 'El veneno está en las espinas, no en la carne.{lionfish}'),
          list: [
            L('Wear thick puncture-resistant gloves.', 'Use guantes gruesos a prueba de pinchazos.'),
            L('Cut off all the venomous spines of the dorsal, pelvic and anal fins with kitchen scissors before you handle the fish.{lionfish}', 'Corte todas las espinas venenosas de las aletas dorsal, pélvicas y anal con tijeras de cocina antes de manipular el pescado.{lionfish}'),
            L('Fillet it as you would a snapper. The flesh can be fried, baked, steamed or poached like other non-oily fish.{lionfish}', 'Filetéelo como un pargo. La carne se puede freír, hornear, cocinar al vapor o escalfar como otros pescados no grasos.{lionfish}'),
            L('Also good in ceviche (if very fresh) or in rondón.{lionfish}', 'También queda bien en ceviche (si está muy fresca) o en rondón.{lionfish}'),
          ],
        },
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
