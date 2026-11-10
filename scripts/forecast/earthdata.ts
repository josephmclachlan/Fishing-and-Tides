/**
 * NASA Earthdata Login for the data build (PLAN 7.51). GES DISC answers a data request with a
 * redirect to urs.earthdata.nasa.gov; the login there (HTTP Basic, only ever sent to that host over
 * HTTPS) redirects back with a code, GES DISC sets a session cookie and redirects to the file. The
 * cookies are kept, so the login happens once per run. Needs a free Earthdata account that has
 * approved the "NASA GESDISC DATA ARCHIVE" application; the credentials come from the environment
 * and are never printed.
 */
import { UA, sleep } from './common.ts';

const URS = 'urs.earthdata.nasa.gov';
/** Per request, ms. */
const TIMEOUT_MS = 60e3;
/** Path only, so an error never carries a query string or a login code. */
const short = (url: string) => {
  const u = new URL(url);
  return `${u.host}${u.pathname}`.slice(0, 160);
};

export interface Earthdata {
  /** GET a URL as text, logging in on the way when asked. Retries server errors. */
  text(url: string): Promise<string>;
}

export function earthdata(user: string, pass: string, fetchImpl: typeof fetch = fetch, pauseMs = 2000): Earthdata {
  const basic = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  const jar = new Map<string, Map<string, string>>();

  const keep = (host: string, res: Response) => {
    const set = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    if (!set.length) return;
    const c = jar.get(host) ?? jar.set(host, new Map()).get(host)!;
    for (const line of set) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) c.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  };

  async function once(url: string): Promise<string> {
    let at = url;
    for (let hop = 0; hop < 10; hop++) {
      const u = new URL(at);
      const headers: Record<string, string> = { 'User-Agent': UA };
      const c = jar.get(u.host);
      if (c?.size) headers.Cookie = [...c].map(([k, v]) => `${k}=${v}`).join('; ');
      if (u.host === URS && u.protocol === 'https:') headers.Authorization = basic;
      // A stuck request must not hold up the whole data build.
      const res = await fetchImpl(at, { headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
      keep(u.host, res);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        await res.body?.cancel();
        if (!loc) throw new Error(`${res.status} without a location from ${short(at)}`);
        at = new URL(loc, at).href;
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        await res.body?.cancel();
        throw Object.assign(new Error(u.host === URS ? 'Earthdata login refused: check EARTHDATA_USERNAME and EARTHDATA_PASSWORD' : `${res.status} from ${short(at)}`), { fatal: true });
      }
      if (!res.ok) throw Object.assign(new Error(`${res.status} from ${short(at)}`), { fatal: res.status < 500 && res.status !== 429 });
      // A page from the login host itself means it stopped there (usually: the application isn't approved yet).
      if (u.host === URS) {
        await res.body?.cancel();
        throw Object.assign(new Error('Earthdata login did not hand back to GES DISC: approve the "NASA GESDISC DATA ARCHIVE" application in the Earthdata profile'), { fatal: true });
      }
      return res.text();
    }
    throw new Error(`too many redirects for ${short(url)}`);
  }

  return {
    async text(url) {
      for (let i = 0; ; i++) {
        try {
          return await once(url);
        } catch (err) {
          if ((err as { fatal?: boolean }).fatal || i >= 3) throw err;
          await sleep(pauseMs * 2 ** i);
        }
      }
    },
  };
}
