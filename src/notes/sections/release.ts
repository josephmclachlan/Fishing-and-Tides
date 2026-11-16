import type { Section } from '../content';
import type { L } from '../../ciguatera/content';

const L = (en: string, es: string): L => ({ en, es });
const step = (n: number) => L(`Step ${n}`, `Paso ${n}`);

/**
 * Putting back fish you will not or must not keep. Edible local fish only. Shown as illustrated steps (art/rigs.ts):
 * handling and unhooking, reviving, barotrauma and the descending devices, turtles and rays.
 */
export const release: Section = {
  id: 'release',
  title: L('Releasing fish', 'Soltar'),
  lede: L(
    'Some fish must go back: too small, protected, not safe to eat, or more than you need. Handled well, many swim away. This tab shows how, and where releasing does not work.',
    'Algunos peces deben volver al agua: muy pequeños, protegidos, no seguros para comer o más de lo que necesita. Bien manejados, muchos se van nadando. Esta pestaña muestra cómo, y dónde soltar no funciona.',
  ),
  blocks: [
    {
      k: 'tiles',
      h: L('When a fish must go back', 'Cuándo debe devolver un pez'),
      items: [
        { ico: 'rgruler', h: L('Undersize', 'Muy pequeño'), t: L('Below the legal or the sensible size, so it has not spawned yet.', 'Bajo la talla legal o la razonable, así que todavía no se ha reproducido.') },
        { ico: 'rgturtle', h: L('Protected species', 'Especie protegida'), t: L('Sea turtles and some rays and sharks may not be kept. Check the species guide and ask INCOPESCA or SINAC.', 'Las tortugas marinas y algunas rayas y tiburones no se pueden quedar. Revise la guía de especies y pregunte a INCOPESCA o SINAC.') },
        {
          ico: 'rgnoeat',
          tone: 'stop',
          h: L('A fish you will not eat', 'Un pez que no va a comer'),
          t: L('Barracuda (picúa), moray eels (morenas) and large reef predators carry ciguatera risk, and cooking does not remove it. The app flags these fish.{cdc}', 'La barracuda (picúa), las morenas y los grandes depredadores de arrecife tienen riesgo de ciguatera, y cocinar no la elimina. La app marca estos peces.{cdc}'),
        },
        { ico: 'rgenough', h: L('Too many', 'Demasiados'), t: L('With enough for the day, stop fishing or put the rest back alive. A fish kept and thrown away later is a waste.', 'Con suficiente para el día, deje de pescar o devuelva vivos los demás. Un pez que se guarda y luego se bota es un desperdicio.') },
      ],
    },

    {
      k: 'cards',
      h: L('Handling and unhooking', 'Manejo y desanzuelado'),
      items: [
        { fig: 'rlready', tag: step(1), h: L('Get ready', 'Prepárese'), t: L('Decide before you land the fish. Have pliers, a wet cloth and a net without knots ready.', 'Decida antes de subir el pez. Tenga listos los alicates, un paño mojado y una red sin nudos.') },
        { fig: 'rlwet', tag: step(2), h: L('Wet hands', 'Manos mojadas'), t: L('Touch the fish as little as you can, and only with wet hands. Dry hands and a dry cloth strip the slime that protects its skin.{noaa}', 'Toque el pez lo menos posible y solo con las manos mojadas. Las manos secas y un paño seco le quitan la baba que protege su piel.{noaa}') },
        { fig: 'rlhold', tag: step(3), h: L('Support the body', 'Sostenga el cuerpo'), t: L('Less than a minute out of the water. Hold it along its length with both hands, fingers away from its eyes and gills.{noaa}', 'Menos de un minuto fuera del agua. Sostenga su cuerpo a lo largo con las dos manos, con los dedos lejos de los ojos y las agallas.{noaa}') },
        { fig: 'rlhook', tag: step(4), h: L('Hook out', 'Saque el anzuelo'), t: L('Use the pliers. A circle hook, a barbless hook or a hook with the barb pressed flat comes out faster.{noaa}', 'Use los alicates. Un anzuelo circular, uno sin lengüeta o uno con la lengüeta aplastada sale más rápido.{noaa}') },
        { fig: 'rlcut', tag: step(4), h: L('Swallowed? Cut', '¿Tragado? Corte'), t: L('If the hook is swallowed or deep in the gills, cut the line as close to the hook as you can and let the fish go.{noaa}', 'Si el anzuelo está tragado o hondo en las agallas, corte la línea lo más cerca del anzuelo que pueda y suelte al pez.{noaa}') },
        { fig: 'rlrevive', tag: step(5), h: L('Revive it', 'Reanímelo'), t: L('Hold it upright in the water with its head into the current, or move it gently forward, so water flows over its gills.{noaa}', 'Sosténgalo derecho en el agua con la cabeza contra la corriente, o muévalo suavemente hacia adelante, para que el agua pase por las agallas.{noaa}') },
        { fig: 'rlgo', tag: step(6), h: L('Let it swim off', 'Déjelo irse'), t: L('Let go only when it kicks and swims away on its own.', 'Suéltelo solo cuando patee y se vaya nadando por sí mismo.') },
      ],
    },
    {
      k: 'dodont',
      do: [
        L('Use circle hooks, barbless hooks or hooks with the barb pressed flat. They hurt the fish less.{noaa}', 'Use anzuelos circulares, sin lengüeta o con la lengüeta aplastada. Dañan menos al pez.{noaa}'),
        L('Use hooks that rust away. Stainless hooks do not.{noaa}', 'Use anzuelos que se oxiden. Los de acero inoxidable no se disuelven.{noaa}'),
      ],
      dont: [
        L('Do not use a gaff on a fish you plan to release. A gaff hole can kill it.{noaa}', 'No use garfio en un pez que piensa soltar. El agujero del garfio puede matarlo.{noaa}'),
        L('Do not hold it only by the lip or jaw.{noaa}', 'No lo sostenga solo por el labio o la mandíbula.{noaa}'),
        L('Do not pull on a swallowed or deep hook.{noaa}', 'No jale un anzuelo tragado o hondo.{noaa}'),
        L('Do not throw it back or drop it from height.', 'No lo lance ni lo deje caer desde arriba.'),
      ],
    },
    {
      k: 'tiles',
      items: [
        {
          ico: 'rglimp',
          tone: 'warn',
          h: L('Still limp after several minutes?', '¿Sigue flojo después de varios minutos?'),
          t: L('It will probably not survive. Then it is better to keep it, if it is safe to eat and legal, than to waste it. A flagged fish is never kept.', 'Probablemente no sobrevivirá. Entonces es mejor quedárselo, si es seguro para comer y legal, que desperdiciarlo. Un pez marcado nunca se guarda.'),
        },
      ],
    },

    { k: 'h', t: L('Deep-water fish often do not survive release', 'Los peces de aguas profundas a menudo no sobreviven al soltarlos') },
    {
      k: 'fig',
      fig: 'rlbaro',
      label: L('Barotrauma: a fish hauled up from deep water swells at the surface; a descender sends it back down', 'Barotrauma: un pez subido de aguas profundas se hincha en la superficie; un descendedor lo devuelve al fondo'),
      tones: ['info', 'warn', 'stop', 'go'],
      marks: [
        L('A fish pulled up quickly from deeper than about 10 m (30 ft) swells as the pressure drops. This is barotrauma.{noaa}{fwc}', 'Un pez subido rápido desde más de unos 10 m (30 pies) se hincha al bajar la presión. Esto es barotrauma.{noaa}{fwc}'),
        L('Signs: bulging eyes, the stomach pushed out of the mouth, a bloated belly, lifted scales and slow swimming.{noaa}{fwc}', 'Señales: ojos saltones, el estómago afuera por la boca, el vientre inflado, escamas levantadas y nado lento.{noaa}{fwc}'),
        L('A fish that floats away on the surface may look alive, but it often dies later or is eaten.{noaa}{fwc}', 'Un pez que se aleja flotando en la superficie puede parecer vivo, pero a menudo muere después o se lo comen.{noaa}{fwc}'),
        L(
          'The best fix is to send it back down fast to the depth where it was caught, with a descending device. Research found this the most effective way to treat barotrauma.{noaa}{fwc}',
          'La mejor solución es mandarlo de vuelta rápido a la profundidad donde se pescó, con un descendedor. La investigación lo encontró el modo más eficaz de tratar el barotrauma.{noaa}{fwc}',
        ),
      ],
    },
    {
      k: 'fig',
      fig: 'rldesc',
      label: L('Three kinds of descending device', 'Tres tipos de descendedor'),
      marks: [
        L('A weight with a lip clamp.{noaa}{fwc}', 'Un peso con pinza de labio.{noaa}{fwc}'),
        L('An inverted hook on a weight.{noaa}{fwc}', 'Un anzuelo invertido con peso.{noaa}{fwc}'),
        L('A fish elevator.{noaa}{fwc}', 'Un elevador de peces.{noaa}{fwc}'),
      ],
    },
    {
      k: 'tiles',
      h: L('If you cannot use a descender', 'Si no puede usar un descendedor'),
      items: [
        { ico: 'rgvent', tone: 'warn', h: L('Venting', 'Venteo'), t: L('The alternative. It needs a proper hollow venting tool.{noaa}{fwc}', 'Es la alternativa. Requiere una herramienta de venteo hueca adecuada.{noaa}{fwc}') },
        { ico: 'rgknife', tone: 'stop', h: L('Not a knife', 'No un cuchillo'), t: L('Never vent with a knife, an ice pick or a hook.{noaa}{fwc}', 'Nunca ventee con un cuchillo, un punzón de hielo ni un anzuelo.{noaa}{fwc}') },
        { ico: 'warn', tone: 'stop', h: L('Leave the stomach', 'No toque el estómago'), t: L('Never pierce a stomach that comes out of the mouth.{fwc}', 'Nunca pinche un estómago que sale por la boca.{fwc}') },
        {
          ico: 'depth',
          tone: 'warn',
          h: L('Honest limits', 'Límites honestos'),
          t: L(
            'Even with a descender, not every fish lives, and survival is worse from very deep water. If you fish deep and will keep what you catch, fish in a way that leaves you few fish to release, and stop when you have enough.',
            'Aun con descendedor, no todos los peces viven, y la supervivencia es peor desde aguas muy profundas. Si pesca profundo y se va a quedar lo que pesque, pesque de modo que le queden pocos peces por soltar, y pare cuando tenga suficiente.',
          ),
        },
      ],
    },

    {
      k: 'cards',
      h: L('Turtles and rays: never lift them', 'Tortugas y rayas: nunca las levante'),
      items: [
        {
          fig: 'rlturtle',
          tone: 'stop',
          h: L('Sea turtle', 'Tortuga marina'),
          t: L('Protected. If one is hooked or tangled, do not lift it by the line, the shell or the flippers.', 'Protegida. Si una queda enganchada o enredada, no la levante por la línea, el caparazón ni las aletas.'),
          list: [
            L('Keep the boat or the line still.', 'Mantenga quieto el bote o la línea.'),
            L('Bring it alongside gently.', 'Acérquela con suavidad.'),
            L('Cut the line close to the hook rather than pulling the hook out.', 'Corte la línea cerca del anzuelo en vez de sacarlo.'),
            L('Report a hurt, entangled or dead turtle to SINAC or INCOPESCA.', 'Reporte una tortuga herida, enredada o muerta a SINAC o INCOPESCA.'),
          ],
        },
        {
          fig: 'rlray',
          tone: 'stop',
          h: L('Ray', 'Raya'),
          t: L('A venomous spine in the tail. Do not lift or hold a ray.', 'Una espina venenosa en la cola. No levante ni sostenga una raya.'),
          list: [L('Cut the line near the hook and let it go in the water.', 'Corte la línea cerca del anzuelo y déjela ir en el agua.')],
        },
      ],
    },
    { k: 'calls', items: [{ n: '911', tel: '911', h: L('If anyone is in danger.', 'Si alguien está en peligro.') }] },
    {
      k: 'go',
      tab: 'aid',
      ico: 'rgray',
      h: L('Stingray wound', 'Herida de raya'),
      t: L('It needs hot water and a doctor: see the First aid tab.', 'Necesita agua caliente y un médico: vea la pestaña de Primeros auxilios.'),
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
      p: 'P',
      what: L('Barotrauma signs, descending device types, venting tools and why they help.', 'Señales de barotrauma, tipos de descendedores, herramientas de venteo y por qué ayudan.'),
    },
  },
};
