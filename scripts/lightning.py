"""
Recent lightning flashes over the region from GOES-East GLM (PLAN 7.6).

Reads the last WINDOW_MIN minutes of NOAA's public GLM-L2-LCFA files (NetCDF4, one per 20 s, on S3),
keeps flashes inside the box, and writes lightning.json. The browser cannot read NetCDF4 cheaply, so
this runs in a scheduled workflow (.github/workflows/lightning.yml). Needs h5py (installed by the workflow).

    python3 -I scripts/lightning.py --bbox="$(node scripts/lightning-bbox.ts)" --out lightning.json

GLM sees optical flashes from space, cloud-to-cloud as well as to ground, with a few minutes of
latency. It is a nowcast aid, not a warning system.
"""
import argparse, json, os, re, sys, tempfile, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
import h5py

BUCKET = "https://noaa-goes19.s3.amazonaws.com"  # GOES-East
PREFIX = "GLM-L2-LCFA"
WINDOW_MIN = 30
UA = "fishing-and-tides data build (github.com/josephmclachlan/Fishing-and-Tides)"


def get(url: str, tries: int = 3) -> bytes:
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return r.read()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * 2**i)


def list_hour(t: datetime) -> list[tuple[datetime, str]]:
    """Keys for one UTC hour with their start time."""
    prefix = f"{PREFIX}/{t:%Y}/{t.timetuple().tm_yday:03d}/{t:%H}/"
    out, token = [], None
    while True:
        url = f"{BUCKET}/?list-type=2&prefix={prefix}" + (f"&continuation-token={urllib.parse.quote(token)}" if token else "")
        root = ET.fromstring(get(url))
        ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
        for c in root.findall("s:Contents", ns):
            key = c.find("s:Key", ns).text
            m = re.search(r"_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})", key)
            if m:
                y, doy, hh, mm, ss = map(int, m.groups())
                out.append((datetime(y, 1, 1, hh, mm, ss, tzinfo=timezone.utc) + timedelta(days=doy - 1), key))
        if root.find("s:IsTruncated", ns).text != "true":
            return out
        token = root.find("s:NextContinuationToken", ns).text


def flashes(path: str, bbox):
    w, s, e, n = bbox
    with h5py.File(path) as f:
        if f["flash_lat"].shape[0] == 0:
            return []
        lat, lon = f["flash_lat"][:], f["flash_lon"][:]
        off = f["flash_time_offset_of_first_event"]
        secs = off[:].astype("float64") * float(off.attrs["scale_factor"][0]) + float(off.attrs["add_offset"][0])
        base = datetime.fromisoformat(f.attrs["time_coverage_start"].decode().replace("Z", "+00:00")).timestamp()
        return [(int((base + t) * 1000), float(x), float(y)) for t, x, y in zip(secs, lon, lat) if w <= x <= e and s <= y <= n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbox", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    bbox = [float(x) for x in a.bbox.split(",")]
    now = datetime.now(timezone.utc)
    since = now - timedelta(minutes=WINDOW_MIN)
    keys = [(t, k) for h in {now, since} for t, k in list_hour(h) if t >= since - timedelta(seconds=20)]
    if not keys:
        sys.exit("no GLM files in the window: the feed is down or the collector is wrong")
    found, newest = [], None
    with tempfile.TemporaryDirectory() as d:
        for t, k in sorted(keys):
            p = os.path.join(d, "g.nc")
            with open(p, "wb") as fh:
                fh.write(get(f"{BUCKET}/{k}"))
            found += flashes(p, bbox)
            newest = t
    # 0.01° is ~1 km, finer than GLM's own ~8 km pixels.
    seen, rows = set(), []
    for ms, x, y in sorted(found):
        r = (ms, round(x, 2), round(y, 2))
        if r not in seen:
            seen.add(r)
            rows.append(list(r))
    out = {
        "fetchedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "windowMin": WINDOW_MIN,
        "newestFileAt": newest.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "bbox": bbox,
        "flashes": rows,  # [epoch ms, lng, lat]
    }
    with open(a.out, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(f"{len(rows)} flashes from {len(keys)} files, newest {out['newestFileAt']}")


if __name__ == "__main__":
    main()
