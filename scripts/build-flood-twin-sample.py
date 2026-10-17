"""Build the ILLUSTRATIVE SAMPLE data for Blue Nile Flood Twin.

Everything written here is synthetic: a procedural river valley shaped loosely
like the Blue Nile at Sennar, ~2,000 procedural buildings, a placeholder
texture and an invented timeline. Every file is flagged `illustrative: true`
so the page labels it as an illustrative sample. Real data comes from
scripts/build-flood-twin-data.py.

Coordinates are local metres (x east, y north) from the AOI centre, the same
frame the real-data script uses after projecting to UTM 36N.

    python3 scripts/build-flood-twin-sample.py [out_dir]
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/data/flood-twin'
SEED = 20200906
SIZE_M = 3000.0          # AOI is SIZE_M x SIZE_M
GRID = 257               # heightmap pixels per side
TEX = 1024               # texture pixels per side
NOTE = 'Illustrative sample: synthetic terrain, buildings and timeline. Not observed data.'

rng = np.random.default_rng(SEED)
os.makedirs(OUT, exist_ok=True)
res = SIZE_M / (GRID - 1)
half = SIZE_M / 2


def grid_xy(n):
    """Cell-centre x (east) and y (north) for an n x n raster; row 0 is north."""
    c = np.linspace(-half, half, n)
    return np.meshgrid(c, -c)


def smooth_noise(n, cells, amp):
    """Smooth value noise: a coarse random grid upsampled bicubically."""
    coarse = rng.standard_normal((cells, cells)).astype(np.float32)
    img = Image.fromarray(coarse, 'F').resize((n, n), Image.BICUBIC)
    return np.asarray(img, np.float64) * amp


# ------------------------------------------------------------------ river --
# The river runs from the south-east to the north-west across the AOI with a
# gentle meander, like the Blue Nile through Sennar.
s = np.linspace(-1.0, 1.0, 600)
along = s * SIZE_M * 0.8
lateral = 260 * np.sin(s * 2.4 + 0.6) + 90 * np.sin(s * 5.1)
ang = math.radians(135)  # flow direction: towards the north-west
ux, uy = math.cos(ang), math.sin(ang)
river = np.stack([along * ux - lateral * uy, along * uy + lateral * ux], 1)


def distance_to_river(x, y):
    d = np.full(x.shape, np.inf)
    a, b = river[:-1], river[1:]
    ab = b - a
    ab2 = (ab ** 2).sum(1)
    for i in range(len(a)):
        t = np.clip(((x - a[i, 0]) * ab[i, 0] + (y - a[i, 1]) * ab[i, 1]) / ab2[i], 0, 1)
        px, py = a[i, 0] + t * ab[i, 0], a[i, 1] + t * ab[i, 1]
        d = np.minimum(d, np.hypot(x - px, y - py))
    return d


def side_of_river(x, y):
    """+1 on the north-east bank, -1 on the south-west bank."""
    return np.sign(-uy * x + ux * y - np.interp(x * ux + y * uy, along, lateral))


# ---------------------------------------------------------------- terrain --
X, Y = grid_xy(GRID)
D = distance_to_river(X, Y)
side = side_of_river(X, Y)

HALF_WIDTH = 160.0        # river half-width at normal level (m)
BED, BANK, PLAIN, TERRACE = 405.5, 411.0, 414.0, 421.0
elev = np.where(
    D < HALF_WIDTH,
    BED + (BANK - BED) * (D / HALF_WIDTH) ** 2,
    np.where(
        D < 230,
        BANK + (PLAIN - BANK) * (D - HALF_WIDTH) / 70,
        # Floodplain rising ~3 m over 1 km, then a terrace edge.
        PLAIN + 3.0 * np.clip((D - 230) / 1000, 0, 1)
        + (TERRACE - PLAIN - 3.0) / (1 + np.exp(-(D - 1250) / 90)),
    ),
)
# The north-east bank (the town) sits a little higher than the far bank.
elev += np.where(side > 0, 0.6, -0.3) * np.clip((D - HALF_WIDTH) / 400, 0, 1)
# Seasonal channels (khors): shallow depressions running away from the river.
for cx, cy, length, width, depth in [(250, 650, 900, 45, 2.2), (-600, -250, 700, 40, 1.8), (900, -500, 600, 35, 1.5)]:
    nx, ny = -uy, ux  # perpendicular to the flow
    t = (X - cx) * nx + (Y - cy) * ny
    across = (X - cx) * ux + (Y - cy) * uy
    elev -= depth * np.exp(-(across / width) ** 2) * np.clip(1 - np.abs(t) / length, 0, 1)
elev += np.where(D > HALF_WIDTH, smooth_noise(GRID, 14, 0.35) + smooth_noise(GRID, 50, 0.08), 0)
lo, hi = float(elev.min()), float(elev.max())

v = np.round((elev - lo) / (hi - lo) * 65535).astype(np.uint32)
rgb = np.zeros((GRID, GRID, 3), np.uint8)
rgb[..., 0] = v >> 8
rgb[..., 1] = v & 0xFF
Image.fromarray(rgb, 'RGB').save(f'{OUT}/heightmap.png', optimize=True)


def elev_at(x, y):
    """Bilinear terrain elevation at local metres (scalar or arrays)."""
    c = np.clip((np.asarray(x) + half) / res, 0, GRID - 1.001)
    r = np.clip((half - np.asarray(y)) / res, 0, GRID - 1.001)
    c0, r0 = np.floor(c).astype(int), np.floor(r).astype(int)
    fc, fr = c - c0, r - r0
    top = elev[r0, c0] * (1 - fc) + elev[r0, c0 + 1] * fc
    bottom = elev[r0 + 1, c0] * (1 - fc) + elev[r0 + 1, c0 + 1] * fc
    return top * (1 - fr) + bottom * fr


# -------------------------------------------------------------- buildings --
# A town on the north-east bank and a village on the south-west bank, laid out
# on street grids aligned with the river, filled lot by lot.
settlements = [
    # centre x, centre y, half-length along river, half-width across, lot size, fill
    dict(cx=560, cy=760, a=1150, b=640, lot=22, fill=0.64, grid_ang=ang + 0.08),
    dict(cx=-700, cy=-560, a=480, b=260, lot=24, fill=0.7, grid_ang=ang - 0.15),
]
features = []
for st in settlements:
    ga = st['grid_ang']
    gx, gy = math.cos(ga), math.sin(ga)
    lot = st['lot']
    n_a, n_b = int(st['a'] / lot), int(st['b'] / lot)
    for i in range(-n_a, n_a + 1):
        for j in range(-n_b, n_b + 1):
            # Every fifth row / column is a street.
            if i % 5 == 0 or j % 5 == 0:
                continue
            ea, eb = i * lot / st['a'], j * lot / st['b']
            if ea * ea + eb * eb > 1 or rng.random() > st['fill'] * (1.15 - 0.4 * (ea * ea + eb * eb)):
                continue
            cx = st['cx'] + i * lot * gx - j * lot * gy + rng.normal(0, 1.2)
            cy = st['cy'] + i * lot * gy + j * lot * gx + rng.normal(0, 1.2)
            if float(distance_to_river(np.array([cx]), np.array([cy]))[0]) < HALF_WIDTH + 70:
                continue
            w = rng.uniform(7, lot - 7)
            d = rng.uniform(6, lot - 8)
            r = rng.random()
            # Mostly single-storey houses, as in Sennar; a few two- and three-storey buildings.
            height = rng.uniform(3.0, 4.2) if r < 0.84 else rng.uniform(6.0, 7.5) if r < 0.97 else rng.uniform(9.0, 12.0)
            # Rectangles, and some L-shaped compounds.
            if rng.random() < 0.22:
                cut_w, cut_d = w * rng.uniform(0.35, 0.55), d * rng.uniform(0.35, 0.55)
                local = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2 - cut_d), (w / 2 - cut_w, d / 2 - cut_d),
                         (w / 2 - cut_w, d / 2), (-w / 2, d / 2)]
            else:
                local = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
            ring = [(round(cx + px * gx - py * gy, 1), round(cy + px * gy + py * gx, 1)) for px, py in local]
            ring.append(ring[0])
            xs = np.array([p[0] for p in ring[:-1]])
            ys = np.array([p[1] for p in ring[:-1]])
            base = float(min(elev_at(xs, ys).min(), elev_at(cx, cy)))
            area = 0.5 * abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(ring[:-1], ring[1:])))
            floors = max(1, round(height / 3.2))
            people = max(1, round(area * min(floors, 3) / 22))
            features.append({
                'type': 'Feature',
                'properties': {'id': len(features), 'height_m': round(height, 1), 'base_elev_m': round(base, 2), 'people': people},
                'geometry': {'type': 'Polygon', 'coordinates': [ring]},
            })

with open(f'{OUT}/buildings.geojson', 'w') as f:
    json.dump({
        'type': 'FeatureCollection',
        'illustrative': True,
        'note': NOTE + ' People per building are a synthetic estimate (footprint area x floors / 22 m2).',
        'crs_local': 'Local metres from the AOI centre: x east, y north.',
        'features': features,
    }, f, separators=(',', ':'))

# ---------------------------------------------------------------- texture --
TX, TY = grid_xy(TEX)
D_tex = np.asarray(Image.fromarray(D.astype(np.float32), 'F').resize((TEX, TEX), Image.BILINEAR), np.float64)
E_tex = np.asarray(Image.fromarray(elev.astype(np.float32), 'F').resize((TEX, TEX), Image.BILINEAR), np.float64)
side_tex = side_of_river(TX, TY)

def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None]
    return a * (1 - t) + b * t

tan = np.array([196, 172, 132], float)
sand = np.array([214, 196, 158], float)
water = np.array([92, 104, 88], float)
img = np.broadcast_to(tan, (TEX, TEX, 3)).copy()
# Irrigated fields on the floodplain: a patchwork of greens and fallow plots.
field_id = (np.floor((TX * ux + TY * uy) / 140) * 31 + np.floor((-TX * uy + TY * ux) / 90) * 17).astype(int)
palette = np.array([[96, 128, 70], [122, 146, 82], [150, 150, 96], [84, 112, 62], [170, 160, 118], [110, 136, 74]], float)
fields = palette[field_id % len(palette)]
on_plain = (D_tex > 210) & (D_tex < 1150)
img = np.where(on_plain[..., None], fields, img)
img = mix(img, sand, 1 - (D_tex - HALF_WIDTH) / 60)
img = np.where((D_tex < HALF_WIDTH)[..., None], water, img)
# Settlement ground: compacted earth.
for st in settlements:
    ga = st['grid_ang']
    a_ = ((TX - st['cx']) * math.cos(ga) + (TY - st['cy']) * math.sin(ga)) / st['a']
    b_ = (-(TX - st['cx']) * math.sin(ga) + (TY - st['cy']) * math.cos(ga)) / st['b']
    img = mix(img, np.array([190, 168, 138], float), (1.15 - (a_ * a_ + b_ * b_)) * 4)
# Low ground (the khors) shows as darker, damper soil.
img *= (1 - 0.16 * np.clip((PLAIN + 1.2 - E_tex) / 1.5, 0, 1) * (D_tex > 230))[..., None]
shade = np.asarray(Image.fromarray(smooth_noise(TEX, 120, 1).astype(np.float32), 'F'), np.float64)
img *= (1 + 0.05 * shade)[..., None]
img += rng.normal(0, 4, img.shape)
tex = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(0.6))
# Faint street grid in the settlements.
draw = ImageDraw.Draw(tex)
to_px = lambda x, y: ((x + half) / SIZE_M * (TEX - 1), (half - y) / SIZE_M * (TEX - 1))
for st in settlements:
    ga = st['grid_ang']
    gx, gy = math.cos(ga), math.sin(ga)
    lot = st['lot']
    for k in range(-int(st['a'] / lot), int(st['a'] / lot) + 1, 5):
        h = st['b'] * math.sqrt(max(0, 1 - (k * lot / st['a']) ** 2))
        p0 = (st['cx'] + k * lot * gx + h * gy, st['cy'] + k * lot * gy - h * gx)
        p1 = (st['cx'] + k * lot * gx - h * gy, st['cy'] + k * lot * gy + h * gx)
        draw.line([to_px(*p0), to_px(*p1)], fill=(170, 150, 122), width=2)
    for k in range(-int(st['b'] / lot), int(st['b'] / lot) + 1, 5):
        h = st['a'] * math.sqrt(max(0, 1 - (k * lot / st['b']) ** 2))
        p0 = (st['cx'] - k * lot * gy - h * gx, st['cy'] + k * lot * gx - h * gy)
        p1 = (st['cx'] - k * lot * gy + h * gx, st['cy'] + k * lot * gx + h * gy)
        draw.line([to_px(*p0), to_px(*p1)], fill=(170, 150, 122), width=2)
tex.save(f'{OUT}/texture.jpg', quality=85, optimize=True)

# --------------------------------------------------------------- timeline --
# 18 invented days ending on the peak; the scene plays them from 6 s to 30 s.
days = 18
dates = [f'2020-08-{d:02d}' for d in range(20, 32)] + [f'2020-09-{d:02d}' for d in range(1, days - 12 + 1)]
k = np.linspace(0, 1, days)
level = 411.2 + 4.3 * k ** 1.8 + 0.12 * np.sin(k * 9)
level[-1] = 415.6
rain = [0, 4, 12, 28, 6, 0, 0, 18, 42, 24, 3, 0, 9, 31, 47, 15, 2, 0]

terrain = {
    'illustrative': True,
    'note': NOTE,
    'place': {'en': 'Sennar, Sudan', 'ar': 'سنار، السودان'},
    'crs': 'local',
    'crs_note': 'Local metres from the AOI centre: x east, y north (illustrative; real data uses EPSG:32636).',
    'origin_utm': None,
    'width_m': SIZE_M,
    'height_m': SIZE_M,
    'resolution_m': round(res, 3),
    'heightmap': {'file': 'heightmap.png', 'width': GRID, 'height': GRID, 'encoding': 'rg16',
                  'min_elev_m': round(lo, 3), 'max_elev_m': round(hi, 3)},
    'dem_source': 'Synthetic river valley (illustrative sample)',
    'texture': {'file': 'texture.jpg', 'source': 'Procedural placeholder (illustrative sample)', 'date': None},
    'buildings': {'file': 'buildings.geojson', 'count': len(features), 'source': 'Procedural (illustrative sample)'},
    'river_centreline': [[round(float(x), 1), round(float(y), 1)] for x, y in river[::30]],
    'layers': {'flood_extent': None},
}
with open(f'{OUT}/terrain.json', 'w') as f:
    json.dump(terrain, f, ensure_ascii=False, indent=1)

with open(f'{OUT}/timeline.json', 'w') as f:
    json.dump({
        'illustrative': True,
        'source': 'Illustrative sample: invented water levels and rainfall, not gauge or weather observations.',
        'dates': dates,
        'water_level_m': [round(float(x), 2) for x in level],
        'rainfall_mm': rain,
        'water_level_datum': 'Water-surface elevation in the DEM datum (m)',
        'calibration': None,
    }, f, indent=1)

flooded = sum(1 for ft in features if ft['properties']['base_elev_m'] < level[-1])
print(f'{OUT}: terrain {GRID}x{GRID} ({res:.1f} m), {lo:.2f}..{hi:.2f} m; {len(features)} buildings, '
      f'{flooded} below the peak level {level[-1]:.2f} m')
