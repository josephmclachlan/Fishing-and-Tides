/**
 * SOURCES on the activity pages (Joseph 2026-11-16): where the app takes a number or a rule from is never named in the
 * text or on a tile ("KD490", "SMOC", "WW3"); it is a superscript number, numbered 1, 2, 3 in the order it first
 * appears on the page or sheet, with the numbered list under it. Same markers and same list as the species guide
 * (src/guide/cite.ts), so the look is the same.
 *
 * Use: `const c = citer()`, write `c.mark('crw')` after the claim (or `[^crw]` in a help text, see `citeHelp`), then
 * `c.finish(html, title)` puts the list under the html.
 */
import { activeLang, type Lang } from './i18n';
import { citeTab, type Src } from './guide/cite';

interface Def {
  en: string;
  es: string;
  u?: string;
}

/** Every source the activity pages cite. Names in full; the page never shows the short forms. */
export const SOURCES = {
  ww3: { en: 'NOAA WAVEWATCH III, the US global wave model', es: 'NOAA WAVEWATCH III, el modelo global de olas de EE. UU.', u: 'https://polar.ncep.noaa.gov/waves/' },
  wam: { en: 'ECMWF wave model (open data)', es: 'Modelo de olas del ECMWF (datos abiertos)', u: 'https://www.ecmwf.int/en/forecasts/datasets/open-data' },
  gebco: { en: 'GEBCO seafloor depth map', es: 'Mapa de profundidad del fondo marino GEBCO', u: 'https://www.gebco.net' },
  ecmwf: { en: 'ECMWF forecast (open data)', es: 'Pronóstico del ECMWF (datos abiertos)', u: 'https://www.ecmwf.int/en/forecasts/datasets/open-data' },
  gfs: { en: 'NOAA Global Forecast System', es: 'Sistema Global de Pronóstico de NOAA', u: 'https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast' },
  ascat: { en: 'ASCAT satellite wind measurements (EUMETSAT)', es: 'Vientos medidos por el satélite ASCAT (EUMETSAT)', u: 'https://www.eumetsat.int' },
  models: { en: 'Open-Meteo, which serves the ECMWF, UK Met Office, ICON and GFS forecasts', es: 'Open-Meteo, que ofrece los pronósticos del ECMWF, UK Met Office, ICON y GFS', u: 'https://open-meteo.com' },
  smoc: { en: 'Copernicus Marine surface current forecast', es: 'Pronóstico de corrientes superficiales de Copernicus Marine', u: 'https://marine.copernicus.eu' },
  sst: { en: 'NASA JPL MUR satellite sea temperature', es: 'Temperatura del mar por satélite, NASA JPL MUR', u: 'https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1' },
  chl: { en: 'NOAA VIIRS satellite chlorophyll', es: 'Clorofila por satélite NOAA VIIRS', u: 'https://coastwatch.noaa.gov' },
  kd490: { en: 'Satellite water-clarity measurement (Copernicus GlobColour and NOAA VIIRS)', es: 'Medida de claridad del agua por satélite (Copernicus GlobColour y NOAA VIIRS)', u: 'https://www.globcolour.info' },
  usf: { en: 'University of South Florida Sargassum Watch System', es: 'Sistema de Vigilancia del Sargazo de la Universidad del Sur de Florida', u: 'https://optics.marine.usf.edu' },
  glm: { en: 'NOAA GOES satellite Geostationary Lightning Mapper', es: 'Mapeador de rayos del satélite GOES de NOAA', u: 'https://www.goes-r.gov/spacesegment/glm.html' },
  imerg: { en: 'NASA IMERG satellite rain estimates', es: 'Estimaciones de lluvia por satélite NASA IMERG', u: 'https://gpm.nasa.gov/data/imerg' },
  glofas: { en: 'Copernicus GloFAS river flow forecast', es: 'Pronóstico de caudal de ríos Copernicus GloFAS', u: 'https://www.globalfloods.eu' },
  crw: { en: 'NOAA Coral Reef Watch heat stress', es: 'Estrés por calor de NOAA Coral Reef Watch', u: 'https://coralreefwatch.noaa.gov' },
  ioc: { en: 'IOC sea level station at Limón', es: 'Estación de nivel del mar de la COI en Limón', u: 'https://www.ioc-sealevelmonitoring.org' },
  metar: { en: 'Limón airport weather reports (METAR, MRLM)', es: 'Reportes del tiempo del aeropuerto de Limón (METAR, MRLM)', u: 'https://aviationweather.gov' },
  cams: { en: 'Copernicus Atmosphere Monitoring Service UV forecast', es: 'Pronóstico de UV del Servicio de Monitoreo de la Atmósfera de Copernicus', u: 'https://atmosphere.copernicus.eu' },
  acoral: { en: 'Allen Coral Atlas', es: 'Atlas Allen de Corales', u: 'https://allencoralatlas.org' },
  seamarks: { en: 'OpenStreetMap sea marks', es: 'Marcas marinas de OpenStreetMap', u: 'https://openseamap.org' },
  obis: { en: 'OBIS fish records', es: 'Registros de peces de OBIS', u: 'https://obis.org' },
  sinac: { en: 'SINAC, Costa Rica national parks and protected areas', es: 'SINAC, parques nacionales y áreas protegidas de Costa Rica', u: 'https://www.sinac.go.cr' },
  incopesca: { en: 'INCOPESCA, Costa Rica fishing authority', es: 'INCOPESCA, autoridad de pesca de Costa Rica', u: 'https://www.incopesca.go.cr' },
  nhc: { en: 'US National Hurricane Center', es: 'Centro Nacional de Huracanes de EE. UU.', u: 'https://www.nhc.noaa.gov' },
  aisstream: { en: 'AISStream ship positions', es: 'Posiciones de barcos de AISStream', u: 'https://aisstream.io' },
  uslarip: { en: 'US Lifesaving Association: rip current statistics', es: 'Asociación de Salvavidas de EE. UU.: estadísticas de corrientes de resaca', u: 'https://www.usla.org/page/RIPCURRENTS' },
  noaarip: { en: 'NOAA National Weather Service: rip current safety', es: 'Servicio Meteorológico de NOAA: seguridad ante corrientes de resaca', u: 'https://www.weather.gov/safety/ripcurrent' },
  sunscreen: { en: 'NOAA National Ocean Service: skincare chemicals and coral reefs', es: 'Servicio Oceánico Nacional de NOAA: químicos de protectores solares y arrecifes', u: 'https://oceanservice.noaa.gov/news/sunscreen-corals.html' },
  aya: { en: 'AyA, Costa Rica national water laboratory', es: 'AyA, Laboratorio Nacional de Aguas de Costa Rica', u: 'https://www.aya.go.cr' },
  goesrain: { en: 'NOAA GOES-19 satellite rain-rate estimates', es: 'Estimaciones de lluvia del satélite GOES-19 de NOAA', u: 'https://www.goes-r.gov' },
  who_uv: { en: 'World Health Organization: Global Solar UV Index guide', es: 'Organización Mundial de la Salud: guía del Índice UV Solar Global', u: 'https://www.who.int/publications/i/item/9241590076' },
} as const satisfies Record<string, Def>;

export type SourceId = keyof typeof SOURCES;

export interface Citer {
  /** The marker to write after a claim; the number is worked out when the page is finished. */
  mark: (...ids: SourceId[]) => string;
  /** The html with its markers numbered in reading order and the list of sources under it (nothing added if none were cited). */
  finish: (html: string, title: string) => string;
  /** Whether anything was cited. */
  readonly used: boolean;
}

export function citer(lang: Lang = activeLang()): Citer {
  const list: Src[] = [];
  const at = new Map<SourceId, number>();
  const idx = (id: SourceId) => {
    let k = at.get(id);
    if (k === undefined) {
      const d: Def = SOURCES[id];
      k = list.push({ t: d[lang], u: d.u }) - 1;
      at.set(id, k);
    }
    return k + 1;
  };
  return {
    mark: (...ids) => ids.map((id) => `[^${idx(id)}]`).join(''),
    finish: (html, title) => citeTab(html, list, title),
    get used() {
      return list.length > 0;
    },
  };
}

/**
 * A help text with `[^id]` markers (ids from SOURCES) as html: the text escaped, each marker a superscript number in
 * order of first appearance, and the numbered list under it. `esc` is the caller's escaper.
 */
export function citeHelp(text: string, esc: (s: string) => string, title: string, lang: Lang = activeLang()): string {
  const c = citer(lang);
  const body = esc(text)
    .replace(/\[\^([a-z0-9]+)\]/g, (_m, id: string) => (id in SOURCES ? c.mark(id as SourceId) : ''))
    .split('\n\n')
    .map((p) => `<p class="help-text">${p}</p>`)
    .join('');
  return c.finish(body, title);
}
