#!/usr/bin/env python3
"""Builds the GeoAI Crop Monitoring dashboard data from Sentinel-2 L2A on
Microsoft Planetary Computer, for the AOI in AOI.geojson:

  1. Field detection  - a monthly max-NDVI composite (10 m); centre pivots
                        found with a Hough transform + rim-contrast test,
                        remaining vegetated areas kept as block fields.
  2. Time series      - per-field mean NDVI and EVI for every scene since
                        April 2023 (20 m, SCL cloud/shadow masked).
  3. Classification   - rule-based crop type per field per season from
                        the NDVI phenology.
  4. Anomalies        - NDVI < seasonal_mean - 2 * std, the baseline being
                        same-crop fields at the same time of year.

Writes public/data/crop/fields.geojson and public/data/crop/timeseries.json.

Needs numpy, opencv, rasterio, shapely, pyproj, pystac-client and
planetary-computer, e.g. the QGIS GeoAI venv:
  ~/.qgis_geoai/venv_py3.14/bin/python scripts/build-crop-data.py [AOI.geojson]
"""

import hashlib
import json
import math
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

import cv2
import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.features import geometry_mask, geometry_window, rasterize
from rasterio.warp import transform_geom
from shapely.geometry import Point, Polygon, mapping, shape
from shapely.ops import transform as shp_transform

REPO = Path(__file__).resolve().parent.parent
AOI_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / 'AOI.geojson'
OUT_DIR = REPO / 'public' / 'data' / 'crop'
CACHE_DIR = REPO / '.cache' / 'crop-monitoring'

START = '2023-04-01'
END = date.today().isoformat()
MAX_SCENE_CLOUD = 60  # scene-level filter; clouds are masked per pixel with SCL
MIN_VALID_FRACTION = 0.6  # of a field's pixels, for a field-date value to count
SCL_CLEAR = [4, 5, 6, 7]  # vegetation, bare soil, water, unclassified
WORKERS = 12

STAC_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1'


def log(*args):
    print(*args, flush=True)


# --- reading ----------------------------------------------------------------

def read_band(item, band, aoi, out_shape=None, resampling=Resampling.average):
    with rasterio.open(item.assets[band].href) as src:
        window = geometry_window(src, [transform_geom('EPSG:4326', src.crs, aoi)])
        data = src.read(1, window=window, out_shape=out_shape, resampling=resampling)
        return data, src.window_transform(window), src.crs, window


def boa_offset(item):
    # Processing baseline 04.00+ (Jan 2022 on) adds a +1000 DN offset.
    return 1000 if float(item.properties.get('s2:processing_baseline', '0')) >= 4 else 0


def ndvi(nir, red):
    with np.errstate(divide='ignore', invalid='ignore'):
        return (nir - red) / (nir + red)


def evi(nir, red, blue):
    # G * (NIR - Red) / (NIR + C1*Red - C2*Blue + L), reflectance in 0-1.
    with np.errstate(divide='ignore', invalid='ignore'):
        return 2.5 * (nir - red) / (nir + 6 * red - 7.5 * blue + 1)


def reflectance(dn, offset):
    return (dn.astype('float32') - offset) / 10000


# --- 1. field detection -------------------------------------------------------

def max_ndvi_composite(items, aoi):
    by_month = {}
    for it in items:
        if it.properties['eo:cloud_cover'] > 5:
            continue
        month = it.datetime.strftime('%Y-%m')
        if month not in by_month or it.properties['eo:cloud_cover'] < by_month[month].properties['eo:cloud_cover']:
            by_month[month] = it
    chosen = [by_month[m] for m in sorted(by_month)]
    log(f'composite: {len(chosen)} clear monthly scenes')

    def one(it):
        red, transform, crs, _ = read_band(it, 'B04', aoi)
        nir, *_ = read_band(it, 'B08', aoi)
        scl, *_ = read_band(it, 'SCL', aoi, out_shape=red.shape, resampling=Resampling.nearest)
        off = boa_offset(it)
        v = ndvi(reflectance(nir, off), reflectance(red, off))
        v[~np.isin(scl, SCL_CLEAR)] = np.nan
        return v, transform, crs

    with ThreadPoolExecutor(WORKERS) as ex:
        results = list(ex.map(one, chosen))
    transform, crs = results[0][1], results[0][2]
    composite = np.nanmax(np.stack([r[0] for r in results]), axis=0)
    inside = geometry_mask([transform_geom('EPSG:4326', crs, aoi)], composite.shape, transform, invert=True)
    return np.where(inside, composite, np.nan), transform, crs


def detect_fields(composite, transform, crs, aoi):
    inside = ~np.isnan(composite)
    m = np.nan_to_num(composite, nan=0)
    img = cv2.GaussianBlur(np.clip(m / 0.8 * 255, 0, 255).astype('uint8'), (5, 5), 1.5)
    found = cv2.HoughCircles(img, cv2.HOUGH_GRADIENT, dp=1, minDist=30, param1=80, param2=22, minRadius=20, maxRadius=48)
    found = [] if found is None else found[0]

    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
    occupied = np.zeros(m.shape, bool)
    pivots = []
    for x, y, r in sorted(found, key=lambda c: -c[2]):
        y0, y1 = int(max(0, y - r - 8)), int(min(m.shape[0], y + r + 9))
        x0, x1 = int(max(0, x - r - 8)), int(min(m.shape[1], x + r + 9))
        dist = np.sqrt((xx[y0:y1, x0:x1] - x) ** 2 + (yy[y0:y1, x0:x1] - y) ** 2)
        disk = dist <= r
        sub = m[y0:y1, x0:x1]
        if inside[y0:y1, x0:x1][disk].mean() < 0.9:  # cut by the AOI edge
            continue
        if (sub[disk] > 0.4).mean() < 0.6:  # not green enough, ever
            continue
        if occupied[y0:y1, x0:x1][disk].mean() > 0.15:  # overlaps a kept pivot
            continue
        # A real pivot has a sharp rim: green just inside, bare just outside.
        # Circles "found" inside gridded block farms fail this.
        rim_in = sub[(dist > r - 7) & (dist <= r - 2)]
        rim_out = sub[(dist > r + 2) & (dist <= r + 7)]
        if np.median(rim_in) - np.median(rim_out) < 0.2:
            continue
        pivots.append((float(x), float(y), float(r)))
        occupied[y0:y1, x0:x1] |= disk

    veg = (m > 0.3) & inside & ~cv2.dilate(occupied.astype('uint8'), np.ones((9, 9), np.uint8)).astype(bool)
    veg = cv2.morphologyEx(veg.astype('uint8'), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    veg = cv2.morphologyEx(veg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(veg, 8)
    blocks = []
    for i in range(1, count):
        if stats[i, cv2.CC_STAT_AREA] < 800:  # < 8 ha
            continue
        contours, _ = cv2.findContours((labels == i).astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contour = cv2.approxPolyDP(max(contours, key=cv2.contourArea), 4, True)[:, 0, :]
        if len(contour) >= 3:
            blocks.append(contour)

    to_wgs = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True).transform
    aoi_utm = shape(transform_geom('EPSG:4326', crs, aoi))
    px = lambda col, row: transform * (col, row)  # noqa: E731
    fields = []
    # Order north-west to south-east so ids read naturally on the map.
    for x, y, r in sorted(pivots, key=lambda p: (round(p[1] / 60), p[0])):
        cx, cy = px(x, y)
        poly = Point(cx, cy).buffer(r * transform.a, 64).intersection(aoi_utm)
        fields.append(('pivot', poly))
    for contour in sorted(blocks, key=lambda c: (round(c[:, 1].mean() / 60), c[:, 0].mean())):
        poly = Polygon([px(c + 0.5, r + 0.5) for c, r in contour]).buffer(0).intersection(aoi_utm)
        if poly.area > 0:
            fields.append(('block', poly))

    features = []
    counters = defaultdict(int)
    for kind, poly in fields:
        counters[kind] += 1
        fid = f"{'P' if kind == 'pivot' else 'B'}-{counters[kind]:03d}"
        geom = shp_transform(to_wgs, poly.simplify(2))
        features.append({
            'type': 'Feature',
            'geometry': json.loads(json.dumps(mapping(geom)), parse_float=lambda s: round(float(s), 6)),
            'properties': {
                'id': fid,
                'name': f"{'Pivot' if kind == 'pivot' else 'Block'} {fid[2:]}",
                'type': kind,
                'area_ha': round(poly.area / 10000, 1),
            },
            '_utm': poly,
        })
    log(f'fields: {counters["pivot"]} pivots, {counters["block"]} blocks')
    return features


# --- 2. time series -----------------------------------------------------------

def dedupe(items):
    # Reprocessed scenes appear twice (same datatake, newer processing time);
    # keep the newest per (date, orbit), then one scene per date.
    best = {}
    for it in items:
        key = (it.datetime.date(), it.properties.get('sat:relative_orbit'))
        if key not in best or it.id > best[key].id:
            best[key] = it
    per_date = {}
    for (d, _), it in best.items():
        if d not in per_date or it.properties['eo:cloud_cover'] < per_date[d].properties['eo:cloud_cover']:
            per_date[d] = it
    return [per_date[d] for d in sorted(per_date)]


def field_means(item, aoi, features, fields_key):
    cache = CACHE_DIR / f'{item.id}.{fields_key}.json'
    if cache.exists():
        return json.loads(cache.read_text())

    with rasterio.open(item.assets['B04'].href) as src:
        window = geometry_window(src, [transform_geom('EPSG:4326', src.crs, aoi)])
        shape20 = (math.ceil(window.height / 2), math.ceil(window.width / 2))
    red, transform10, crs, _ = read_band(item, 'B04', aoi, out_shape=shape20)
    nir, *_ = read_band(item, 'B08', aoi, out_shape=shape20)
    blue, *_ = read_band(item, 'B02', aoi, out_shape=shape20)
    scl, *_ = read_band(item, 'SCL', aoi, out_shape=shape20, resampling=Resampling.nearest)
    transform = transform10 * rasterio.Affine.scale(window.width / shape20[1], window.height / shape20[0])

    labels = rasterize(
        [(f['_utm'], i + 1) for i, f in enumerate(features)],
        out_shape=shape20, transform=transform, fill=0, dtype='int32', all_touched=False,
    )
    off = boa_offset(item)
    r, n, b = reflectance(red, off), reflectance(nir, off), reflectance(blue, off)
    v_ndvi, v_evi = ndvi(n, r), evi(n, r, b)
    clear = np.isin(scl, SCL_CLEAR) & np.isfinite(v_ndvi) & np.isfinite(v_evi) & (red > 0)

    k = len(features) + 1
    total = np.bincount(labels.ravel(), minlength=k)
    ok = np.bincount(labels[clear], minlength=k)
    s_ndvi = np.bincount(labels[clear], weights=v_ndvi[clear], minlength=k)
    s_evi = np.bincount(labels[clear], weights=v_evi[clear], minlength=k)
    out = {'ndvi': [], 'evi': []}
    for i in range(1, k):
        good = total[i] > 0 and ok[i] / total[i] >= MIN_VALID_FRACTION
        out['ndvi'].append(round(s_ndvi[i] / ok[i], 3) if good else None)
        out['evi'].append(round(s_evi[i] / ok[i], 3) if good else None)

    # AOI-wide farmland mean (all fields together) for the overview curve.
    in_fields = clear & (labels > 0)
    frac = in_fields.sum() / max(1, (labels > 0).sum())
    out['all_ndvi'] = round(float(v_ndvi[in_fields].mean()), 3) if frac >= MIN_VALID_FRACTION else None
    out['all_evi'] = round(float(v_evi[in_fields].mean()), 3) if frac >= MIN_VALID_FRACTION else None
    cache.write_text(json.dumps(out))
    return out


# --- 3. classification ----------------------------------------------------------

CROPS = [
    'Winter cereal',
    'Summer crop',
    'Double crop',
    'Alfalfa / perennial forage',
    'Orchard',
    'Fallow',
]


def monthly_max(dates, values):
    months = defaultdict(list)
    for d, v in zip(dates, values):
        if v is not None:
            months[d[:7]].append(v)
    return {m: max(v) for m, v in months.items()}


def classify_season(monthly):
    """Rule-based crop type from 12 monthly max-NDVI values (Sep..Aug)."""
    vals = np.array([v for v in monthly if v is not None])
    if len(vals) < 8:
        return None
    green = np.array([v is not None and v >= 0.4 for v in monthly])
    peak = float(vals.max())
    amplitude = float(np.percentile(vals, 90) - np.percentile(vals, 10))

    # Green spells (consecutive green months).
    spells, run = [], 0
    for g in green:
        if g:
            run += 1
        elif run:
            spells.append(run)
            run = 0
    if run:
        spells.append(run)
    green_months = int(green.sum())
    peak_month = int(np.nanargmax([v if v is not None else -1 for v in monthly]))  # 0 = Sep

    if peak < 0.3:  # sparse/bare all season (orchards need real canopy)
        return 'Fallow', min(0.95, 0.6 + (0.3 - peak) * 2)
    if green_months >= 8:
        return 'Alfalfa / perennial forage', min(0.95, 0.55 + green_months * 0.035)
    if peak < 0.5 and amplitude < 0.15:
        return 'Orchard', min(0.9, 0.6 + (0.15 - amplitude) * 2)
    if len(spells) >= 2 and green_months >= 5:
        return 'Double crop', min(0.9, 0.55 + 0.05 * green_months)
    if peak_month in range(3, 8):  # Dec-Apr peak
        return 'Winter cereal', min(0.95, 0.55 + (peak - 0.4) * 0.8 + (0.1 if peak_month in range(4, 7) else 0))
    if peak_month in range(9, 12) or peak_month in (0, 1, 2):  # Jun-Nov peak
        return 'Summer crop', min(0.9, 0.5 + (peak - 0.4) * 0.8)
    return 'Orchard', 0.5


def seasons_between(start, end):
    # Agricultural seasons run Sep-Aug; label by starting year.
    y0 = int(start[:4]) - (1 if int(start[5:7]) < 9 else 0)
    y1 = int(end[:4]) - (1 if int(end[5:7]) < 9 else 0)
    return list(range(y0, y1 + 1))


# --- 4. anomalies ---------------------------------------------------------------

def season_of(d):
    y, m = int(d[:4]), int(d[5:7])
    y0 = y - (1 if m < 9 else 0)
    return f'{y0}-{str(y0 + 1)[2:]}'


def anomaly_flags(dates, ndvi_by_field, crop_by_field_season, window_days=8, min_peers=8):
    """NDVI < seasonal_mean - 2*std. The seasonal baseline for a field on a
    date is every field classed as the *same crop that season*, observed
    within +-window_days: a per-field baseline from only 2-3 prior seasons
    flags ordinary rotation and planting-date shifts. A flag needs two
    consecutive clear readings below the line; fallow fields are skipped."""
    ordinals = [date.fromisoformat(d).toordinal() for d in dates]
    below = {fid: [] for fid in ndvi_by_field}
    for i, d in enumerate(dates):
        season = season_of(d)
        near = [j for j in range(len(dates)) if abs(ordinals[j] - ordinals[i]) <= window_days]
        by_crop = defaultdict(list)
        for fid, values in ndvi_by_field.items():
            crop = crop_by_field_season.get((fid, season))
            if crop:
                by_crop[crop].extend(values[j] for j in near if values[j] is not None)
        stats = {c: (float(np.mean(v)), float(np.std(v))) for c, v in by_crop.items() if len(v) >= min_peers}
        for fid, values in ndvi_by_field.items():
            crop = crop_by_field_season.get((fid, season))
            v = values[i]
            if v is None or crop in (None, 'Fallow') or crop not in stats:
                continue
            mean, std = stats[crop]
            if mean >= 0.25 and v < mean - 2 * std:
                below[fid].append(i)

    flags = {}
    for fid, idx in below.items():
        clear = [i for i, v in enumerate(ndvi_by_field[fid]) if v is not None]
        nxt = {a: b for a, b in zip(clear, clear[1:])}
        prv = {b: a for a, b in zip(clear, clear[1:])}
        hit = set(idx)
        flags[fid] = sorted(i for i in hit if nxt.get(i) in hit or prv.get(i) in hit)
    return flags


# --- main -----------------------------------------------------------------------

def main():
    aoi_doc = json.loads(AOI_PATH.read_text())
    aoi = aoi_doc['geometry'] if aoi_doc.get('type') == 'Feature' else aoi_doc['features'][0]['geometry'] if aoi_doc.get('type') == 'FeatureCollection' else aoi_doc
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    catalog = pystac_client.Client.open(STAC_URL, modifier=pc.sign_inplace)
    items = list(catalog.search(
        collections=['sentinel-2-l2a'], intersects=aoi, datetime=f'{START}/{END}',
        query={'eo:cloud_cover': {'lt': MAX_SCENE_CLOUD}},
    ).items())
    log(f'STAC: {len(items)} Sentinel-2 L2A items')

    composite, transform, crs = max_ndvi_composite(items, aoi)
    features = detect_fields(composite, transform, crs, aoi)
    fields_key = hashlib.sha1(json.dumps([f['geometry'] for f in features]).encode()).hexdigest()[:10]

    scenes = dedupe(items)
    log(f'time series: {len(scenes)} scene dates')
    results = {}
    with ThreadPoolExecutor(WORKERS) as ex:
        futures = {ex.submit(field_means, it, aoi, features, fields_key): it for it in scenes}
        for n, fut in enumerate(as_completed(futures), 1):
            it = futures[fut]
            try:
                results[it.id] = fut.result()
            except Exception as err:  # a flaky read skips one date, not the run
                log(f'  skipped {it.id}: {err}')
            if n % 25 == 0:
                log(f'  {n}/{len(scenes)}')

    scenes = [it for it in scenes if it.id in results and results[it.id]['all_ndvi'] is not None]
    dates = [it.datetime.date().isoformat() for it in scenes]
    log(f'{len(dates)} dates with clear farmland')

    series = {}
    for i, f in enumerate(features):
        fid = f['properties']['id']
        nd = [results[it.id]['ndvi'][i] for it in scenes]
        ev = [results[it.id]['evi'][i] for it in scenes]
        series[fid] = {'ndvi': nd, 'evi': ev, 'anomalies': []}

        monthly = monthly_max(dates, nd)
        seasons = []
        for y in seasons_between(START, END):
            months = [f'{y + (m >= 4)}-{((m + 8) % 12) + 1:02d}' for m in range(12)]  # Sep..Aug
            result = classify_season([monthly.get(mm) for mm in months])
            if result:
                seasons.append({'season': f'{y}-{str(y + 1)[2:]}', 'crop': result[0], 'confidence': round(result[1], 2)})
        props = f['properties']
        props['seasons'] = seasons
        latest = seasons[-1] if seasons else None
        props['crop'] = latest['crop'] if latest else 'Unclassified'
        props['confidence'] = latest['confidence'] if latest else None
        del f['_utm']

    crop_by_field_season = {
        (f['properties']['id'], s['season']): s['crop'] for f in features for s in f['properties']['seasons']
    }
    flags = anomaly_flags(dates, {fid: s['ndvi'] for fid, s in series.items()}, crop_by_field_season)
    for f in features:
        fid = f['properties']['id']
        series[fid]['anomalies'] = flags[fid]
        nd = series[fid]['ndvi']
        last_obs = max((j for j, v in enumerate(nd) if v is not None), default=None)
        f['properties']['anomaly'] = last_obs is not None and last_obs in flags[fid] and last_obs >= len(dates) - 6

    fc = {'type': 'FeatureCollection', 'features': features}
    (OUT_DIR / 'fields.geojson').write_text(json.dumps(fc, separators=(',', ':')))
    (OUT_DIR / 'timeseries.json').write_text(json.dumps({
        'generated': date.today().isoformat(),
        'aoi': aoi,
        'dates': dates,
        'items': [it.id for it in scenes],
        'overall': {
            'ndvi': [results[it.id]['all_ndvi'] for it in scenes],
            'evi': [results[it.id]['all_evi'] for it in scenes],
        },
        'fields': series,
    }, separators=(',', ':')))

    crops = defaultdict(int)
    for f in features:
        crops[f['properties']['crop']] += 1
    log('crops (latest season):', dict(crops))
    log('fields with a current anomaly:', sum(f['properties']['anomaly'] for f in features))
    log('anomalous field-dates:', sum(len(s['anomalies']) for s in series.values()))


if __name__ == '__main__':
    main()
