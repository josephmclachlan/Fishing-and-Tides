import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });

/** Putting back fish you will not or must not keep. Edible local fish only. */
export const release: Section = {
  id: 'release',
  title: L('Releasing fish', 'Soltar'),
  lede: L(
    'Some fish must go back: too small, protected, not safe to eat, or more than you need. Handled well, many swim away. This tab shows how, and where releasing does not work.',
    'Algunos peces deben volver al agua: muy pequeños, protegidos, no seguros para comer o más de lo que necesita. Bien manejados, muchos se van nadando. Esta pestaña muestra cómo, y dónde soltar no funciona.',
  ),
  blocks: [
    { k: 'h', t: L('When you must put a fish back', 'Cuándo debe devolver un pez') },
    {
      k: 'ul',
      items: [
        L('Undersize: the fish is below the legal or the sensible size, so it has not yet spawned.', 'Muy pequeño: el pez está bajo la talla legal o la razonable, así que todavía no se ha reproducido.'),
        L('Protected species: sea turtles and some rays and sharks may not be kept. Check the species guide and ask INCOPESCA or SINAC.', 'Especie protegida: las tortugas marinas y algunas rayas y tiburones no se pueden quedar. Revise la guía de especies y pregunte a INCOPESCA o SINAC.'),
        L('A fish you will not eat: barracuda (picúa), moray eels (morenas) and large reef predators carry ciguatera risk, and cooking does not remove it. The app flags these fish.{cdc}', 'Un pez que no va a comer: la barracuda (picúa), las morenas y los grandes depredadores de arrecife tienen riesgo de ciguatera, y cocinar no la elimina. La app marca estos peces.{cdc}'),
        L('Too many: when you have enough for the day, stop fishing or put the rest back alive. A fish kept and thrown away later is a waste.', 'Demasiados: cuando ya tiene suficiente para el día, deje de pescar o devuelva vivos los demás. Un pez que se guarda y luego se bota es un desperdicio.'),
      ],
    },
    { k: 'h', t: L('Handling and unhooking', 'Manejo y desanzuelado') },
    {
      k: 'ul',
      items: [
        L('Decide before you land the fish. Have pliers, a wet cloth and a net without knots ready.', 'Decida antes de subir el pez. Tenga listos los alicates, un paño mojado y una red sin nudos.'),
        L('Touch the fish as little as you can and only with wet hands. Dry hands and dry cloth strip the slime that protects its skin.{noaa}', 'Toque el pez lo menos posible y solo con las manos mojadas. Las manos secas y un paño seco le quitan la baba que protege su piel.{noaa}'),
        L('Keep the fish out of the water for less than a minute. Support its body along its length with both hands and keep your fingers away from its eyes and gills. Do not hold it only by the lip or jaw.{noaa}', 'Mantenga el pez fuera del agua menos de un minuto. Sostenga su cuerpo a lo largo con las dos manos y mantenga los dedos lejos de los ojos y las agallas. No lo sostenga solo por el labio o la mandíbula.{noaa}'),
        L('Never use a gaff on a fish you plan to release. A gaff hole can kill it.{noaa}', 'Nunca use garfio en un pez que piensa soltar. El agujero del garfio puede matarlo.{noaa}'),
        L('Circle hooks, barbless hooks and hooks with the barb pressed flat hurt the fish less and come out faster.{noaa}', 'Los anzuelos circulares, los anzuelos sin lengüeta y los anzuelos con la lengüeta aplastada dañan menos al pez y salen más rápido.{noaa}'),
        L('If the hook is swallowed or deep in the gills, do not pull. Cut the line as close to the hook as you can and let the fish go. Use hooks that rust away, because stainless hooks do not.{noaa}', 'Si el anzuelo está tragado o hondo en las agallas, no jale. Corte la línea lo más cerca del anzuelo que pueda y suelte al pez. Use anzuelos que se oxiden, porque los de acero inoxidable no se disuelven.{noaa}'),
      ],
    },
    { k: 'h', t: L('Reviving a tired fish', 'Reanimar un pez cansado') },
    {
      k: 'ul',
      items: [
        L('Hold the fish upright in the water with its head into the current, or move it gently forward through the water, so water flows over its gills.{noaa}', 'Sostenga el pez derecho en el agua con la cabeza contra la corriente, o muévalo suavemente hacia adelante, para que el agua pase por las agallas.{noaa}'),
        L('Let go only when it kicks and swims away on its own. Do not throw it back or drop it from height.', 'Suéltelo solo cuando patee y se vaya nadando por sí mismo. No lo lance ni lo deje caer desde arriba.'),
        L('If a fish stays limp after several minutes, it will probably not survive. Then it is better to keep it if it is safe to eat and legal, than to waste it. A flagged fish is never kept.', 'Si el pez sigue flojo después de varios minutos, probablemente no sobrevivirá. Entonces es mejor quedárselo, si es seguro para comer y legal, que desperdiciarlo. Un pez marcado nunca se guarda.'),
      ],
    },
    { k: 'h', t: L('Deep-water fish often do not survive release', 'Los peces de aguas profundas a menudo no sobreviven al soltarlos') },
    {
      k: 'warn',
      h: L('Barotrauma', 'Barotrauma'),
      t: L(
        'A fish pulled up quickly from deep water, more than about 10 metres (30 feet), swells as the pressure drops. This is barotrauma. Signs are bulging eyes, a stomach pushed out of the mouth, a bloated belly, lifted scales and slow swimming. A fish that floats away on the surface may look alive but often dies later or is eaten.{noaa}{fwc}',
        'Un pez subido rápido desde aguas profundas, a más de unos 10 metros (30 pies), se hincha al bajar la presión. Esto es barotrauma. Las señales son ojos saltones, el estómago afuera por la boca, el vientre inflado, escamas levantadas y nado lento. Un pez que se aleja flotando en la superficie puede parecer vivo, pero a menudo muere después o se lo comen.{noaa}{fwc}',
      ),
    },
    {
      k: 'ul',
      items: [
        L('The best fix is to send the fish back down fast to the depth where it was caught. A descender device (a weight with a lip clamp or an inverted hook, or a weighted basket) does this in about three minutes.{noaa}{fwc}', 'La mejor solución es mandar el pez de vuelta rápido a la profundidad donde se pescó. Un descendedor (un peso con pinza de labio o anzuelo invertido, o una canasta con peso) lo hace en unos tres minutos.{noaa}{fwc}'),
        L('If you cannot use a descender, venting is a last choice and needs training. Never stab or push back a stomach that comes out of the mouth, because that raises the chance the fish dies.{noaa}', 'Si no puede usar un descendedor, el venteo es la última opción y requiere entrenamiento. Nunca pinche ni empuje hacia adentro un estómago que sale por la boca, porque aumenta la probabilidad de que el pez muera.{noaa}'),
        L('Honest limits: even with a descender, not every fish lives, and survival is worse from very deep water. If you fish deep and will keep what you catch, fish in a way that leaves you few fish to release, and stop when you have enough.', 'Límites honestos: aun con descendedor, no todos los peces viven, y la supervivencia es peor desde aguas muy profundas. Si pesca profundo y se va a quedar lo que pesque, pesque de modo que le queden pocos peces por soltar, y pare cuando tenga suficiente.'),
      ],
    },
    { k: 'h', t: L('Turtles and rays: never lift them', 'Tortugas y rayas: nunca las levante') },
    {
      k: 'ul',
      items: [
        L('Sea turtles are protected. If one is hooked or tangled, do not lift it by the line, shell or flippers. Keep the boat or line still, bring it alongside gently and cut the line close to the hook rather than pulling it out.', 'Las tortugas marinas están protegidas. Si una queda enganchada o enredada, no la levante por la línea, el caparazón ni las aletas. Mantenga quieto el bote o la línea, acérquela con suavidad y corte la línea cerca del anzuelo en vez de sacarlo.'),
        L('Rays have a venomous spine in the tail. Do not lift or hold a ray. Cut the line near the hook and let it go in the water. A stingray wound needs hot water and a doctor: see the First aid tab.', 'Las rayas tienen una espina venenosa en la cola. No levante ni sostenga una raya. Corte la línea cerca del anzuelo y déjela ir en el agua. Una herida de raya necesita agua caliente y un médico: vea la pestaña de Primeros auxilios.'),
        L('Report a hurt, entangled or dead turtle to SINAC or INCOPESCA. Call 911 if anyone is in danger.', 'Reporte una tortuga herida, enredada o muerta a SINAC o INCOPESCA. Llame al 911 si alguien está en peligro.'),
      ],
    },
  ],
  sources: {
    cdc: {
      t: 'CDC Yellow Book: Food Poisoning from Marine Toxins',
      u: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/food-poisoning-from-marine-toxins.html',
      p: 'P',
      what: L('Never eat barracuda or moray; cooking does not remove ciguatoxin.', 'Nunca coma barracuda ni morena; cocinar no elimina la ciguatoxina.'),
    },
    noaa: {
      t: 'NOAA Fisheries, Catch and Release Fishing Best Practices',
      u: 'https://www.fisheries.noaa.gov/national/resources-fishing/catch-and-release-fishing-best-practices',
      p: 'P',
      what: L('Wet hands, under 60 seconds out of water, no gaff, circle and barbless hooks, cutting line, reviving, barotrauma and descenders.', 'Manos mojadas, menos de 60 segundos fuera del agua, sin garfio, anzuelos circulares y sin lengüeta, cortar la línea, reanimar, barotrauma y descendedores.'),
    },
    fwc: {
      t: 'Florida Fish and Wildlife Conservation Commission, Barotrauma',
      u: 'https://myfwc.com/fishing/saltwater/outreach/barotrauma/',
      p: 'S',
      what: L('Descending device types and why they help (search summary only).', 'Tipos de descendedores y por qué ayudan (solo resumen de búsqueda).'),
    },
  },
};
