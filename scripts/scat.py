"""
Scatterometer wind passes (PLAN 2.14): ASCAT on Metop-B and Metop-C, from Copernicus Marine
WIND_GLO_PHY_L3_NRT_012_002 (L3 swaths on a 0.125° grid, near real time, a few hours late).

Each dataset is one satellite and one direction (ascending ~03 UTC, descending ~15 UTC here) with one
daily frame; a frame is the swath that crossed the box that day, with NaN outside it. This writes
every frame that saw any of the box, stamped with the median per-cell measurement time, to JSON for
scripts/forecast/satellite.ts (buildScatPass) to pack. Run by the data build:

    COPERNICUSMARINE_USERNAME=… COPERNICUSMARINE_PASSWORD=… \
      python3 -I scripts/scat.py --box=-84,8.75,-81.5,11 --days 4 --out scat.json

Needs the copernicusmarine toolbox (pinned in .github/workflows/pages.yml) and a free Copernicus
Marine account, read from the environment and never printed. ASCAT does not see within ~20 km of land.
"""
import argparse, json, logging, math, os, sys
from datetime import datetime, timedelta, timezone

DATASETS = [
    ("cmems_obs-wind_glo_phy_nrt_l3-metopb-ascat-asc-0.125deg_P1D-i", "Metop-B ASCAT", "asc"),
    ("cmems_obs-wind_glo_phy_nrt_l3-metopb-ascat-des-0.125deg_P1D-i", "Metop-B ASCAT", "des"),
    ("cmems_obs-wind_glo_phy_nrt_l3-metopc-ascat-asc-0.125deg_P1D-i", "Metop-C ASCAT", "asc"),
    ("cmems_obs-wind_glo_phy_nrt_l3-metopc-ascat-des-0.125deg_P1D-i", "Metop-C ASCAT", "des"),
]
VARS = ["eastward_wind", "northward_wind", "measurement_time"]
STEP = 0.125


def open_remote(dataset_id: str, box, start: datetime):
    """The dataset's subset over `box` from `start`, lazily, through the toolbox (ARCO zarr)."""
    import copernicusmarine

    user, pw = os.environ.get("COPERNICUSMARINE_USERNAME"), os.environ.get("COPERNICUSMARINE_PASSWORD")
    if not user or not pw:
        sys.exit("COPERNICUSMARINE_USERNAME and COPERNICUSMARINE_PASSWORD are not set")
    w, s, e, n = box
    return copernicusmarine.open_dataset(
        dataset_id=dataset_id, username=user, password=pw, variables=VARS,
        minimum_longitude=w, maximum_longitude=e, minimum_latitude=s, maximum_latitude=n,
        start_datetime=start.strftime("%Y-%m-%dT%H:%M:%S"),
    )


def frames(ds, dataset_id: str, sat: str, direction: str):
    """One pass per daily frame that saw any cell: north-first rows, NaN as None, median measurement time."""
    import numpy as np

    ds = ds.sortby("latitude", ascending=False).sortby("longitude").load()
    lon, lat = ds.longitude.values, ds.latitude.values
    out = []
    for k in range(ds.sizes["time"]):
        u = ds.eastward_wind.isel(time=k).values.astype("float64")
        v = ds.northward_wind.isel(time=k).values.astype("float64")
        t = ds.measurement_time.isel(time=k).values
        ok = np.isfinite(u) & np.isfinite(v) & ~np.isnat(t)
        if not ok.any():
            continue
        ts = np.sort(t[ok].astype("datetime64[ms]").astype("int64"))
        out.append({
            "id": dataset_id, "sat": sat, "dir": direction, "ms": int(ts[len(ts) // 2]),
            "spanMin": round(float(ts[-1] - ts[0]) / 60e3, 1), "n": int(ok.sum()),
            "u": [round(float(x), 2) if m else None for x, m in zip(u.ravel(), ok.ravel())],
            "v": [round(float(x), 2) if m else None for x, m in zip(v.ravel(), ok.ravel())],
        })
    grid = {"cols": int(lon.size), "rows": int(lat.size), "lon0": round(float(lon[0]), 4), "lat0": round(float(lat[0]), 4), "dlon": STEP, "dlat": STEP}
    return grid, out


def collect(box, days: int, opener=open_remote):
    start = (datetime.now(timezone.utc) - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    grid, passes, errors = None, [], []
    for dataset_id, sat, direction in DATASETS:
        try:
            g, ps = frames(opener(dataset_id, box, start), dataset_id, sat, direction)
        except SystemExit:
            raise
        except Exception as err:  # one satellite down must not lose the others
            errors.append(f"{dataset_id}: {type(err).__name__}: {str(err)[:200]}")
            continue
        if grid is None:
            grid = g
        elif any(not math.isclose(grid[k], g[k], abs_tol=1e-6) for k in grid):
            raise SystemExit(f"{dataset_id}: grid {g} differs from {grid}")
        passes += ps
    if grid is None:
        raise SystemExit("no ASCAT dataset could be read: " + "; ".join(errors))
    passes.sort(key=lambda p: p["ms"])
    return {"grid": grid, "passes": passes, "errors": errors}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--box", required=True, help="w,s,e,n")
    ap.add_argument("--days", type=int, default=4)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    logging.getLogger("copernicusmarine").setLevel(logging.WARNING)
    out = collect([float(x) for x in a.box.split(",")], a.days)
    with open(a.out, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    for e in out["errors"]:
        print(f"skipped {e}", file=sys.stderr)
    print(f"{len(out['passes'])} passes over {out['grid']['cols']}x{out['grid']['rows']} cells")


if __name__ == "__main__":
    main()
