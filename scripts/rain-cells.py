"""
Rain cells over the region from GOES-East ABI (PLAN 7.24 item 3), for the rain nowcast.

Every 10 minutes (.github/workflows/lightning.yml, job `rain`) this reads the last FRAMES full-disk
scans, crops them to the rain box on a regular lat/lon grid and writes rain.json. The phone tracks the
cells' motion from those frames and extrapolates them 0 to 2 hours (src/rain/nowcast.ts).

Source, best first:
  RRQPE  ABI-L2-RRQPEF, NOAA's rain-rate product (mm/h, ~2 km). Calibrated against microwave
         rain, so it sees some warm-cloud rain the IR alone misses. NOAA's feed has gaps (it stopped
         for 2+ days on 2026-11-02), hence the fallback.
  IR     ABI-L2-CMIPF band 13 (10.3 um brightness temperature, ~2 km), turned into rain with the
         Auto-Estimator (Vicente, Scofield and Menzel 1998, BAMS 79:1883):
             R = 1.1183e11 * exp(-3.6382e-2 * T^1.2)  mm/h,  T in K, capped at 72 mm/h,
         and R = 0 for T > 250 K (about 0.1 mm/h, below that it is cloud, not rain). Cold tops
         rain; warm trade-wind showers do not show, so the IR under-counts light coastal rain.

The files are NetCDF4 (HDF5) of ~2 MB (RRQPE) or ~25 MB (band 13), stored in strips of rows. We read
only the strips over the box with HTTP range requests, about 1 MB per frame. Needs h5py and numpy.

    python3 -I scripts/rain-cells.py --bbox="$(node scripts/rain-bbox.ts)" --out rain.json
"""
import argparse, base64, io, json, math, re, sys, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
import h5py
import numpy as np

BUCKET = "https://noaa-goes19.s3.amazonaws.com"  # GOES-East
FRAMES = 7  # 60 minutes at the full-disk 10-minute cadence
STEP = 0.02  # output grid, degrees (~2.2 km, about the ABI pixel here)
QUANT = 4  # stored as round(mm/h * QUANT) in one byte: 0.25 mm/h steps up to 63.75 mm/h
UA = "fishing-and-tides data build (github.com/josephmclachlan/Fishing-and-Tides)"
SOURCES = {
    "rrqpe": {"prefix": "ABI-L2-RRQPEF", "match": "RRQPEF", "var": "RRQPE"},
    "ir": {"prefix": "ABI-L2-CMIPF", "match": "M6C13_", "var": "CMI"},
}


def get(url: str, headers=None, tries: int = 3) -> bytes:
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})}), timeout=30) as r:
                return r.read()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * 2**i)


class RangeFile(io.RawIOBase):
    """A read-only file over HTTP range requests, in 1 MB blocks, so h5py reads only the parts it needs."""

    BS = 1 << 20

    def __init__(self, url: str, size: int):
        self.url, self.size, self.pos, self.cache, self.requests = url, size, 0, {}, 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def _block(self, i):
        if i not in self.cache:
            a = i * self.BS
            b = min(self.size, a + self.BS) - 1
            self.requests += 1
            self.cache[i] = get(self.url, {"Range": f"bytes={a}-{b}"})
        return self.cache[i]

    def readinto(self, buf):
        want = min(len(buf), self.size - self.pos)
        out = bytearray()
        while len(out) < want:
            i, o = divmod(self.pos + len(out), self.BS)
            out += self._block(i)[o : o + want - len(out)]
        buf[:want] = out
        self.pos += want
        return want


def list_hour(prefix: str, match: str, t: datetime):
    """(start time, key, size) for one UTC hour of a product."""
    p = f"{prefix}/{t:%Y}/{t.timetuple().tm_yday:03d}/{t:%H}/"
    out, token = [], None
    ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
    while True:
        url = f"{BUCKET}/?list-type=2&prefix={p}" + (f"&continuation-token={urllib.parse.quote(token)}" if token else "")
        root = ET.fromstring(get(url))
        for c in root.findall("s:Contents", ns):
            key = c.find("s:Key", ns).text
            m = re.search(r"_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})", key)
            if m and match in key:
                y, doy, hh, mm, ss = map(int, m.groups())
                out.append((datetime(y, 1, 1, hh, mm, ss, tzinfo=timezone.utc) + timedelta(days=doy - 1), key, int(c.find("s:Size", ns).text)))
        if root.find("s:IsTruncated", ns).text != "true":
            return out
        token = root.find("s:NextContinuationToken", ns).text


def recent(src: str, now: datetime, n: int):
    s = SOURCES[src]
    keys = []
    for h in range(3):
        keys += list_hour(s["prefix"], s["match"], now - timedelta(hours=h))
    return sorted(keys)[-n:]


def scan_angles(lon, lat, proj):
    """GOES-R fixed-grid scan angles (x, y) in radians for geodetic lon/lat in degrees (GOES-R PUG vol. 5, 4.2.8.1)."""
    a = float(proj["semi_major_axis"][0])
    b = float(proj["semi_minor_axis"][0])
    H = float(proj["perspective_point_height"][0]) + a
    lon0 = math.radians(float(proj["longitude_of_projection_origin"][0]))
    phi = np.radians(lat)
    lam = np.radians(lon)
    e2 = (a * a - b * b) / (a * a)
    phic = np.arctan((b * b) / (a * a) * np.tan(phi))
    rc = b / np.sqrt(1 - e2 * np.cos(phic) ** 2)
    sx = H - rc * np.cos(phic) * np.cos(lam - lon0)
    sy = -rc * np.cos(phic) * np.sin(lam - lon0)
    sz = rc * np.sin(phic)
    return np.arcsin(-sy / np.sqrt(sx * sx + sy * sy + sz * sz)), np.arctan(sz / sx)


def coord(ds):
    v = ds[:].astype("float64")
    return v * float(ds.attrs["scale_factor"][0]) + float(ds.attrs["add_offset"][0])


def auto_estimator(tb):
    """Auto-Estimator rain rate, mm/h, from 10.3 um brightness temperature in K (see module docstring)."""
    r = 1.1183e11 * np.exp(-3.6382e-2 * np.power(tb, 1.2))
    return np.where(tb > 250, 0.0, np.minimum(r, 72.0))


def frame(src: str, key: str, size: int, lon, lat):
    """Rain rate mm/h on the lon/lat grid (NaN where the satellite has no value)."""
    rf = RangeFile(f"{BUCKET}/{key}", size)
    with h5py.File(rf, "r") as f:
        x, y = coord(f["x"]), coord(f["y"])
        sx, sy = scan_angles(lon, lat, f["goes_imager_projection"].attrs)
        col = np.rint((sx - x[0]) / (x[1] - x[0])).astype(int)
        row = np.rint((sy - y[0]) / (y[1] - y[0])).astype(int)
        r0, r1, c0, c1 = row.min(), row.max() + 1, col.min(), col.max() + 1
        d = f[SOURCES[src]["var"]]
        raw = d[r0:r1, c0:c1].astype("float64")
        fill = d.attrs.get("_FillValue")
        bad = raw == fill[0] if fill is not None else np.zeros_like(raw, bool)
        val = raw * float(d.attrs["scale_factor"][0]) + float(d.attrs["add_offset"][0]) if "scale_factor" in d.attrs else raw
        val[bad] = np.nan
        v = val[row - r0, col - c0]
    rate = auto_estimator(v) if src == "ir" else v
    return np.where(np.isfinite(v), rate, np.nan), rf.requests


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbox", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--source", choices=["auto", "rrqpe", "ir"], default="auto")
    a = ap.parse_args()
    w, s, e, n = (float(v) for v in a.bbox.split(","))
    nx, ny = int(round((e - w) / STEP)), int(round((n - s) / STEP))
    # Cell centres, row 0 at the north edge (image order).
    lon, lat = np.meshgrid(w + (np.arange(nx) + 0.5) * STEP, n - (np.arange(ny) + 0.5) * STEP)
    now = datetime.now(timezone.utc)
    src, keys = None, []
    for cand in (["rrqpe", "ir"] if a.source == "auto" else [a.source]):
        keys = recent(cand, now, FRAMES)
        # A source only counts if its newest scan is under 40 minutes old.
        if keys and now - keys[-1][0] <= timedelta(minutes=40):
            src = cand
            break
    if not src:
        sys.exit("no recent ABI rain or band-13 files: the feed is down or the collector is wrong")
    frames, reqs = [], 0
    for t, key, size in keys:
        r, q = frame(src, key, size, lon, lat)
        reqs += q
        b = np.where(np.isfinite(r), np.clip(np.rint(r * QUANT), 0, 254), 255).astype(np.uint8)
        frames.append({"t": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "rate": base64.b64encode(b.tobytes()).decode()})
    out = {
        "fetchedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": src,
        "grid": {"west": w, "north": n, "step": STEP, "nx": nx, "ny": ny},
        "quant": QUANT,  # byte = round(mm/h * quant); 255 = no data
        "frames": frames,
    }
    with open(a.out, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    wet = sum(int((np.frombuffer(base64.b64decode(f["rate"]), np.uint8) >= QUANT).sum()) for f in frames[-1:])
    print(f"{src}: {len(frames)} frames, newest {frames[-1]['t']}, {wet} cells >= 1 mm/h now, {reqs} range requests")


if __name__ == "__main__":
    main()
