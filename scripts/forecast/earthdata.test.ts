import { describe, expect, it } from 'vitest';
import { earthdata } from './earthdata.ts';

type Seen = { url: string; headers: Record<string, string> };

/** GES DISC and Earthdata Login as they answer: data → login (Basic) → back with a code → cookie → data. */
function fakeNasa(opts: { goodLogin?: boolean; approved?: boolean } = {}) {
  const { goodLogin = true, approved = true } = opts;
  const seen: Seen[] = [];
  const res = (status: number, headers: Record<string, string> = {}, body = '', cookies: string[] = []) => {
    const h = new Headers(headers);
    for (const c of cookies) h.append('set-cookie', c);
    return new Response(status >= 300 && status < 400 ? null : body, { status, headers: h });
  };
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    seen.push({ url, headers });
    expect(init?.redirect).toBe('manual');
    const u = new URL(url);
    if (u.host === 'gpm1.gesdisc.eosdis.nasa.gov' && u.pathname.startsWith('/data-redirect')) {
      return res(302, { location: u.searchParams.get('state')! }, '', ['nasa_gesdisc_data_archive=abc123; Path=/; Secure; HttpOnly']);
    }
    if (u.host === 'gpm1.gesdisc.eosdis.nasa.gov') {
      if (headers.Cookie?.includes('nasa_gesdisc_data_archive=abc123')) return res(200, {}, 'precipitation[0][0], 1');
      return res(302, { location: `https://urs.earthdata.nasa.gov/oauth/authorize/?client_id=x&redirect_uri=x&state=${encodeURIComponent(url)}` });
    }
    if (u.host === 'urs.earthdata.nasa.gov') {
      if (!goodLogin || headers.Authorization !== `Basic ${Buffer.from('joe:pw').toString('base64')}`) return res(401);
      if (!approved) return res(200, {}, '<html>Approve application</html>');
      return res(302, { location: `https://gpm1.gesdisc.eosdis.nasa.gov/data-redirect?code=c&state=${encodeURIComponent(u.searchParams.get('state')!)}` }, '', ['urs_user_already_logged=yes; Path=/']);
    }
    return res(404);
  }) as typeof fetch;
  return { fetchImpl, seen };
}

describe('earthdata', () => {
  it('logs in once, then reads with the cookie', async () => {
    const n = fakeNasa();
    const ed = earthdata('joe', 'pw', n.fetchImpl, 1);
    expect(await ed.text('https://gpm1.gesdisc.eosdis.nasa.gov/opendap/a.ascii?x')).toBe('precipitation[0][0], 1');
    const first = n.seen.length;
    expect(first).toBe(4);
    expect(await ed.text('https://gpm1.gesdisc.eosdis.nasa.gov/opendap/b.ascii?x')).toBe('precipitation[0][0], 1');
    expect(n.seen.length).toBe(first + 1);
  });

  it('sends the password only to the login host', async () => {
    const n = fakeNasa();
    await earthdata('joe', 'pw', n.fetchImpl, 1).text('https://gpm1.gesdisc.eosdis.nasa.gov/opendap/a.ascii?x');
    for (const s of n.seen) expect(Boolean(s.headers.Authorization), s.url).toBe(new URL(s.url).host === 'urs.earthdata.nasa.gov');
  });

  it('says which setting is wrong, without the password', async () => {
    const bad = earthdata('joe', 'nope', fakeNasa().fetchImpl, 1).text('https://gpm1.gesdisc.eosdis.nasa.gov/opendap/a.ascii?x');
    await expect(bad).rejects.toThrow(/EARTHDATA_USERNAME/);
    await expect(bad).rejects.not.toThrow(/nope/);
    await expect(earthdata('joe', 'pw', fakeNasa({ approved: false }).fetchImpl, 1).text('https://gpm1.gesdisc.eosdis.nasa.gov/opendap/a')).rejects.toThrow(/GESDISC DATA ARCHIVE/);
  });
});
