// Client-side GeoAI for the Blue Nile (Sennar / Gezira) flood risk dashboard.
//
// Everything runs in the browser: rasters are fetched from public tile APIs,
// decoded from PNG pixels, and processed on one shared grid. The grid is the
// Web Mercator pixel grid of zoom GRID_ZOOM clipped to the AOI, so every tile
// pixel lands on exactly one cell, and results drop onto the map as image
// overlays with no resampling.

// ------------------------------------------------------------------ config --
export const AOI = { minLon: 32.0, maxLon: 35.0, minLat: 12.0, maxLat: 15.0 };
export const GRID_ZOOM = 9; // ~300 m cells at 13° N
// SAR is read one zoom finer (~150 m): at 300 m a river pixel mixes water
// with its banks and no longer looks like water.
export const SAR_ZOOM = GRID_ZOOM + 1;
const SAR_SCALE = 2 ** (SAR_ZOOM - GRID_ZOOM);

// DEM: AWS Terrain Tiles (Terrarium encoding, keyless) by default. With a
// MapTiler key the MapTiler Terrain-RGB tiles are used instead.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';
export const DEM_SOURCE = MAPTILER_KEY
  ? {
      name: 'MapTiler Terrain RGB',
      tiles: `https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`,
      tileSize: 512,
      encoding: 'mapbox' as const,
      maxzoom: 12,
    }
  : {
      name: 'AWS Terrain Tiles (Terrarium)',
      tiles: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
      tileSize: 256,
      encoding: 'terrarium' as const,
      maxzoom: 15,
    };

const PC_API = 'https://planetarycomputer.microsoft.com/api/data/v1';
export const SENTINEL_HUB_ENDPOINTS = {
  cdse: {
    label: 'Copernicus Data Space',
    process: 'https://sh.dataspace.copernicus.eu/api/v1/process',
    token: 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
  },
  sentinelhub: {
    label: 'Sentinel Hub',
    process: 'https://services.sentinel-hub.com/api/v1/process',
    token: 'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
  },
};
export type SentinelHubEndpoint = keyof typeof SENTINEL_HUB_ENDPOINTS;

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
export const RIVERS_SNAPSHOT = '/data/flood-risk/rivers-osm.geojson';

// Backscatter is exchanged as 8-bit PNG: dB mapped linearly from
// [DB_MIN, DB_MAX] to 0..255 (on the server for Planetary Computer tiles,
// in the evalscript for Sentinel Hub).
const DB_MIN = -35;
const DB_MAX = 5;

// Feature scaling for the risk model (see computeRisk).
const HAND_MAX = 20; // m above the nearest river: at or above this, no elevation risk
const SLOPE_MAX = 5; // degrees: at or above this, no slope risk
const DIST_SCALE = 5000; // m: river-proximity risk falls to 1/e over this distance

export const RISK_CLASSES = [
  { label: 'Low', min: 0, color: [254, 217, 118], alpha: 60 },
  { label: 'Medium', min: 0.25, color: [253, 141, 60], alpha: 170 },
  { label: 'High', min: 0.5, color: [227, 26, 28], alpha: 190 },
  { label: 'Very High', min: 0.75, color: [128, 0, 38], alpha: 210 },
] as const;
export const FLOOD_COLOR = [30, 136, 229];
export const PERMANENT_WATER_COLOR = [13, 71, 161];

export interface Weights {
  elevation: number;
  slope: number;
  distance: number;
  rainfall: number;
  sar: number;
}
export const DEFAULT_WEIGHTS: Weights = { elevation: 0.3, slope: 0.1, distance: 0.25, rainfall: 0.1, sar: 0.25 };
export const DEFAULT_THRESHOLDS = { vv: -18, vh: -24 }; // dB, for terrain-flattened gamma0

// ------------------------------------------------------------------- grid --
const TILE = 256;
const EARTH_RADIUS = 6378137;
const worldPx = (zoom: number) => TILE * 2 ** zoom;
const lonToPx = (lon: number, zoom: number) => ((lon + 180) / 360) * worldPx(zoom);
const latToPx = (lat: number, zoom: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(Math.PI / 4 + r / 2)) / Math.PI) / 2) * worldPx(zoom);
};
const pxToLon = (x: number, zoom: number) => (x / worldPx(zoom)) * 360 - 180;
const pxToLat = (y: number, zoom: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / worldPx(zoom)))) * 180) / Math.PI;

// A block of Web Mercator pixels at one zoom level.
export interface Frame {
  zoom: number;
  x0: number; // global pixel of the first column / row at `zoom`
  y0: number;
  width: number;
  height: number;
}

export interface Grid extends Frame {
  west: number;
  east: number;
  north: number;
  south: number;
  rowLat: Float64Array; // latitude of each row's centre
  rowCellSize: Float64Array; // ground size of a (square) cell in each row, m
}

export function makeGrid(zoom = GRID_ZOOM): Grid {
  const x0 = Math.floor(lonToPx(AOI.minLon, zoom));
  const x1 = Math.ceil(lonToPx(AOI.maxLon, zoom));
  const y0 = Math.floor(latToPx(AOI.maxLat, zoom));
  const y1 = Math.ceil(latToPx(AOI.minLat, zoom));
  const height = y1 - y0;
  const rowLat = new Float64Array(height);
  const rowCellSize = new Float64Array(height);
  for (let j = 0; j < height; j++) {
    rowLat[j] = pxToLat(y0 + j + 0.5, zoom);
    rowCellSize[j] = ((2 * Math.PI * EARTH_RADIUS) / worldPx(zoom)) * Math.cos((rowLat[j] * Math.PI) / 180);
  }
  return {
    zoom, x0, y0, width: x1 - x0, height,
    west: pxToLon(x0, zoom), east: pxToLon(x1, zoom), north: pxToLat(y0, zoom), south: pxToLat(y1, zoom),
    rowLat, rowCellSize,
  };
}

// The same area as the grid, SAR_SCALE times finer, for the SAR rasters.
export function sarFrame(g: Grid): Frame {
  return { zoom: SAR_ZOOM, x0: g.x0 * SAR_SCALE, y0: g.y0 * SAR_SCALE, width: g.width * SAR_SCALE, height: g.height * SAR_SCALE };
}

// Corner coordinates for a MapLibre image source covering the grid.
export function gridCorners(g: Grid): [[number, number], [number, number], [number, number], [number, number]] {
  return [[g.west, g.north], [g.east, g.north], [g.east, g.south], [g.west, g.south]];
}

export function cellAt(g: Grid, lon: number, lat: number): number | null {
  const i = Math.floor(lonToPx(lon, g.zoom) - g.x0);
  const j = Math.floor(latToPx(lat, g.zoom) - g.y0);
  return i < 0 || j < 0 || i >= g.width || j >= g.height ? null : j * g.width + i;
}

const cellLon = (g: Grid, i: number) => pxToLon(g.x0 + i + 0.5, g.zoom);

// ---------------------------------------------------------- tile fetching --
type Progress = (message: string) => void;

// Decodes an image's raw pixel values (no colour management or alpha
// premultiplication, which would corrupt encoded data).
async function decodeImage(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

// Fetches every tile covering the frame and copies their pixels into one RGBA
// buffer the size of the frame. Tiles are fetched at the zoom where one tile
// pixel = one frame pixel (one level up for 512 px tiles). Missing tiles stay
// transparent (alpha 0).
async function fetchTileMosaic(
  g: Frame,
  urlFor: (z: number, x: number, y: number) => string,
  tileSize: number,
  onTile?: (done: number, total: number) => void,
): Promise<Uint8ClampedArray> {
  const z = g.zoom - Math.log2(tileSize / TILE);
  const out = new Uint8ClampedArray(g.width * g.height * 4);
  const tiles: [number, number][] = [];
  for (let ty = Math.floor(g.y0 / tileSize); ty <= Math.floor((g.y0 + g.height - 1) / tileSize); ty++) {
    for (let tx = Math.floor(g.x0 / tileSize); tx <= Math.floor((g.x0 + g.width - 1) / tileSize); tx++) tiles.push([tx, ty]);
  }
  let done = 0;
  await pool(tiles, 12, async ([tx, ty]) => {
    const res = await fetch(urlFor(z, tx, ty));
    if (res.ok) {
      const img = await decodeImage(await res.blob());
      for (let py = 0; py < tileSize; py++) {
        const j = ty * tileSize + py - g.y0;
        if (j < 0 || j >= g.height) continue;
        for (let px = 0; px < tileSize; px++) {
          const i = tx * tileSize + px - g.x0;
          if (i < 0 || i >= g.width) continue;
          const src = (py * img.width + px) * 4;
          out.set(img.data.subarray(src, src + 4), (j * g.width + i) * 4);
        }
      }
    }
    onTile?.(++done, tiles.length);
  });
  return out;
}

const fillTemplate = (template: string, z: number, x: number, y: number) =>
  template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

// -------------------------------------------------------------------- DEM --
// Terrain tiles store elevation in the RGB channels of a PNG/WebP:
//   Mapbox / MapTiler Terrain-RGB: h = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000
//   Terrarium (AWS):               h = R * 256 + G + B / 256 - 32768
// Both give metres above sea level; we decode every pixel into a Float32 grid.
export async function fetchDem(g: Grid, progress: Progress): Promise<Float32Array> {
  const rgba = await fetchTileMosaic(
    g,
    (z, x, y) => fillTemplate(DEM_SOURCE.tiles, z, x, y),
    DEM_SOURCE.tileSize,
    (d, n) => progress(`Elevation tiles ${d}/${n}`),
  );
  const dem = new Float32Array(g.width * g.height);
  for (let k = 0; k < dem.length; k++) {
    const r = rgba[k * 4], gr = rgba[k * 4 + 1], b = rgba[k * 4 + 2];
    dem[k] = DEM_SOURCE.encoding === 'mapbox'
      ? (r * 256 * 256 + gr * 256 + b) * 0.1 - 10000
      : r * 256 + gr + b / 256 - 32768;
  }
  return dem;
}

// Slope in degrees from central differences, using each row's real cell size.
export function computeSlope(g: Grid, dem: Float32Array): Float32Array {
  const { width: w, height: h } = g;
  const slope = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const jn = Math.max(j - 1, 0), js = Math.min(j + 1, h - 1);
    const size = g.rowCellSize[j];
    for (let i = 0; i < w; i++) {
      const iw = Math.max(i - 1, 0), ie = Math.min(i + 1, w - 1);
      const dzdx = (dem[j * w + ie] - dem[j * w + iw]) / ((ie - iw) * size);
      const dzdy = (dem[js * w + i] - dem[jn * w + i]) / ((js - jn) * size);
      slope[j * w + i] = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
    }
  }
  return slope;
}

// ----------------------------------------------------------------- rivers --
export type RiverCollection = GeoJSON.FeatureCollection<GeoJSON.LineString, { name: string }>;

export async function fetchRiversSnapshot(): Promise<RiverCollection> {
  return (await fetch(RIVERS_SNAPSHOT)).json();
}

// Live river network from OpenStreetMap. Public Overpass servers are often
// busy, so mirrors are tried in turn; returns null if all of them fail.
export async function fetchRiversOverpass(): Promise<RiverCollection | null> {
  const { minLat, minLon, maxLat, maxLon } = AOI;
  const query = `[out:json][timeout:90];way["waterway"="river"](${minLat},${minLon},${maxLat},${maxLon});out geom;`;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(100_000),
      });
      if (!res.ok) continue;
      const json: { elements: { geometry?: { lon: number; lat: number }[]; tags?: Record<string, string> }[] } = await res.json();
      return {
        type: 'FeatureCollection',
        features: json.elements
          .filter((e) => e.geometry && e.geometry.length > 1)
          .map((e) => ({
            type: 'Feature',
            properties: { name: e.tags?.['name:en'] || e.tags?.name || '' },
            geometry: { type: 'LineString', coordinates: e.geometry!.map((p) => [p.lon, p.lat]) },
          })),
      };
    } catch {
      // try the next mirror
    }
  }
  return null;
}

// Distance to the nearest river for every cell, plus which river cell that is.
// Rivers are rasterised onto the grid, then an exact Euclidean distance
// transform (Felzenszwalb & Huttenlocher) finds each cell's nearest river cell
// in two 1-D passes (columns, then rows).
export function computeRiverDistance(g: Grid, rivers: RiverCollection) {
  const { width: w, height: h } = g;
  const n = w * h;
  const INF = 1e20;
  const f = new Float64Array(n).fill(INF);

  for (const feature of rivers.features) {
    const pts = feature.geometry.coordinates.map(([lon, lat]) => [lonToPx(lon, g.zoom) - g.x0, latToPx(lat, g.zoom) - g.y0]);
    for (let s = 1; s < pts.length; s++) {
      const [ax, ay] = pts[s - 1], [bx, by] = pts[s];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1; // half-cell steps
      for (let t = 0; t <= steps; t++) {
        const i = Math.floor(ax + ((bx - ax) * t) / steps);
        const j = Math.floor(ay + ((by - ay) * t) / steps);
        if (i >= 0 && j >= 0 && i < w && j < h) f[j * w + i] = 0;
      }
    }
  }

  const size = Math.max(w, h);
  const line = new Float64Array(size), d = new Float64Array(size), z = new Float64Array(size + 1);
  const arg = new Int32Array(size), v = new Int32Array(size);

  // 1-D squared distance transform of `line[0..len)`, recording the argmin.
  const dt1d = (len: number) => {
    let k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < len; q++) {
      let s = (line[q] + q * q - (line[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (line[q] + q * q - (line[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + line[v[k]];
      arg[q] = v[k];
    }
  };

  const colD = new Float64Array(n), colArg = new Int32Array(n);
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) line[j] = f[j * w + i];
    dt1d(h);
    for (let j = 0; j < h; j++) { colD[j * w + i] = d[j]; colArg[j * w + i] = arg[j]; }
  }
  const distance = new Float32Array(n); // metres
  const nearest = new Int32Array(n).fill(-1); // index of the nearest river cell
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) line[i] = colD[j * w + i];
    dt1d(w);
    for (let i = 0; i < w; i++) {
      if (d[i] >= INF / 2) { distance[j * w + i] = Infinity; continue; }
      distance[j * w + i] = Math.sqrt(d[i]) * g.rowCellSize[j];
      nearest[j * w + i] = colArg[j * w + arg[i]] * w + arg[i];
    }
  }
  return { distance, nearest };
}

// Height above the nearest river (a simple "HAND" index): floodplains sit a
// few metres above their river, whatever their absolute elevation. Each cell's
// reference is the elevation of its nearest river cell; that reference field
// jumps where two rivers' nearest-cell zones meet, so it is box-blurred over
// RIVER_BASE_BLUR metres before subtracting.
const RIVER_BASE_BLUR = 7500;

export function computeHeightAboveRiver(g: Grid, dem: Float32Array, nearest: Int32Array): Float32Array {
  const base = new Float32Array(dem.length);
  for (let k = 0; k < dem.length; k++) base[k] = nearest[k] < 0 ? dem[k] : dem[nearest[k]];
  const radius = Math.round(RIVER_BASE_BLUR / g.rowCellSize[g.height >> 1]);
  boxBlur(base, g.width, g.height, radius);
  const hand = new Float32Array(dem.length);
  for (let k = 0; k < dem.length; k++) hand[k] = nearest[k] < 0 ? Infinity : Math.max(0, dem[k] - base[k]);
  return hand;
}

// In-place separable box blur (running sums, edges clamped).
function boxBlur(values: Float32Array, w: number, h: number, r: number) {
  const pass = (len: number, count: number, index: (line: number, i: number) => number) => {
    const tmp = new Float64Array(len);
    for (let line = 0; line < count; line++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += values[index(line, Math.min(Math.max(i, 0), len - 1))];
      for (let i = 0; i < len; i++) {
        tmp[i] = sum / (2 * r + 1);
        sum += values[index(line, Math.min(i + r + 1, len - 1))] - values[index(line, Math.max(i - r, 0))];
      }
      for (let i = 0; i < len; i++) values[index(line, i)] = tmp[i];
    }
  };
  pass(w, h, (row, i) => row * w + i);
  pass(h, w, (col, i) => i * w + col);
}

// --------------------------------------------------------------- rainfall --
// Daily precipitation from the Open-Meteo historical weather API (keyless,
// CORS-enabled; ERA5-family reanalysis) on a RAIN_POINTS x RAIN_POINTS lattice
// over the AOI, summed over the window and interpolated bilinearly per cell.
const RAIN_POINTS = 7;

export async function fetchRainfall(g: Grid, endDate: string, days: number): Promise<Float32Array> {
  const lats: number[] = [], lons: number[] = [];
  for (let a = 0; a < RAIN_POINTS; a++) {
    for (let b = 0; b < RAIN_POINTS; b++) {
      lats.push(AOI.minLat + ((AOI.maxLat - AOI.minLat) * a) / (RAIN_POINTS - 1));
      lons.push(AOI.minLon + ((AOI.maxLon - AOI.minLon) * b) / (RAIN_POINTS - 1));
    }
  }
  const params = new URLSearchParams({
    latitude: lats.map((v) => v.toFixed(3)).join(','),
    longitude: lons.map((v) => v.toFixed(3)).join(','),
    start_date: shiftDate(endDate, -(days - 1)),
    end_date: endDate,
    daily: 'precipitation_sum',
    timezone: 'GMT',
  });
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo: ${res.status} ${await res.text()}`);
  const json: { daily: { precipitation_sum: (number | null)[] } }[] = await res.json();
  const totals = json.map((p) => p.daily.precipitation_sum.reduce<number>((s, v) => s + (v ?? 0), 0));

  const rain = new Float32Array(g.width * g.height);
  const at = (a: number, b: number) => totals[a * RAIN_POINTS + b];
  for (let j = 0; j < g.height; j++) {
    const fa = clamp(((g.rowLat[j] - AOI.minLat) / (AOI.maxLat - AOI.minLat)) * (RAIN_POINTS - 1), 0, RAIN_POINTS - 1);
    const a0 = Math.min(Math.floor(fa), RAIN_POINTS - 2), ta = fa - a0;
    for (let i = 0; i < g.width; i++) {
      const fb = clamp(((cellLon(g, i) - AOI.minLon) / (AOI.maxLon - AOI.minLon)) * (RAIN_POINTS - 1), 0, RAIN_POINTS - 1);
      const b0 = Math.min(Math.floor(fb), RAIN_POINTS - 2), tb = fb - b0;
      rain[j * g.width + i] =
        (at(a0, b0) * (1 - tb) + at(a0, b0 + 1) * tb) * (1 - ta) + (at(a0 + 1, b0) * (1 - tb) + at(a0 + 1, b0 + 1) * tb) * ta;
    }
  }
  return rain;
}

// -------------------------------------------------------------- SAR (S1) --
// Sentinel-1 C-band SAR sees through cloud, which is why it is the standard
// sensor for flood mapping. Calm open water is a mirror for radar: the pulse
// reflects away from the satellite, so water shows very low backscatter in
// both VV and VH polarisations (roughly < -18 dB VV, < -24 dB VH), while land,
// vegetation and buildings scatter energy back.
// Backscatter bytes on the SAR frame (see DB_MIN / DB_MAX), 4 bytes per pixel
// kept as-is from the tiles: VV, VH, (unused), valid (0 / 255).
export interface SarImage {
  rgba: Uint8ClampedArray;
  coverage: number; // share of the frame with data
}

export type SarSource =
  | { kind: 'planetary' }
  | { kind: 'sentinelhub'; endpoint: SentinelHubEndpoint; token: string };

export const decodeDb = (byte: number) => (byte / 255) * (DB_MAX - DB_MIN) + DB_MIN;
const encodeDb = (db: number) => ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 255;

// Normalises a response so the validity flag is in the alpha channel.
function toSarImage(rgba: Uint8ClampedArray, validChannel: 2 | 3): SarImage {
  let valid = 0;
  for (let o = 0; o < rgba.length; o += 4) {
    const ok = rgba[o + validChannel] >= 128;
    rgba[o + 3] = ok ? 255 : 0;
    if (ok) valid++;
  }
  return { rgba, coverage: valid / (rgba.length / 4) };
}

// Keyless: Microsoft Planetary Computer's Sentinel-1 RTC (radiometrically
// terrain-corrected gamma0) collection. A STAC search over the AOI and date
// window is registered as a mosaic (most recent scene on top), and its tiles
// are rendered server-side as dB bytes with a band-math expression.
async function fetchSarPlanetary(g: Frame, start: string, end: string, progress: Progress): Promise<SarImage> {
  const search = {
    collections: ['sentinel-1-rtc'],
    bbox: [AOI.minLon, AOI.minLat, AOI.maxLon, AOI.maxLat],
    datetime: `${start}T00:00:00Z/${end}T23:59:59Z`,
    sortby: [{ field: 'datetime', direction: 'desc' }],
    'filter-lang': 'cql2-json',
    filter: { op: 'a_contains', args: [{ property: 'sar:polarizations' }, ['VV', 'VH']] },
  };
  const reg = await fetch(`${PC_API}/mosaic/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(search),
  });
  if (!reg.ok) throw new Error(`Planetary Computer: ${reg.status} ${await reg.text()}`);
  const { searchid } = await reg.json();

  const query = new URLSearchParams({
    collection: 'sentinel-1-rtc',
    asset_as_band: 'True',
    expression: '10*log10(vv);10*log10(vh);10*log10(vv)',
    nodata: '-32768',
  });
  for (let b = 0; b < 3; b++) query.append('rescale', `${DB_MIN},${DB_MAX}`);
  const rgba = await fetchTileMosaic(
    g,
    (z, x, y) => `${PC_API}/mosaic/${searchid}/tiles/WebMercatorQuad/${z}/${x}/${y}.png?${query}`,
    TILE,
    (d, n) => progress(`SAR tiles ${start} → ${end}: ${d}/${n}`),
  );
  return toSarImage(rgba, 3); // alpha = valid
}

// With credentials: the Sentinel Hub Process API (also on the free Copernicus
// Data Space). One request returns the whole grid in Web Mercator; the
// evalscript converts VV / VH to dB bytes and puts the data mask in blue.
const EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: [{ bands: ["VV", "VH", "dataMask"] }], output: { bands: 3, sampleType: "UINT8" } };
}
function db(x) { return 10 * Math.log(Math.max(x, 1e-6)) / Math.LN10; }
function enc(x) { return Math.max(0, Math.min(255, Math.round((db(x) - (${DB_MIN})) / ${DB_MAX - DB_MIN} * 255))); }
function evaluatePixel(s) { return [enc(s.VV), enc(s.VH), s.dataMask * 255]; }`;

async function fetchSarSentinelHub(
  g: Frame,
  start: string,
  end: string,
  source: Extract<SarSource, { kind: 'sentinelhub' }>,
  progress: Progress,
): Promise<SarImage> {
  progress(`SAR ${start} → ${end}: Sentinel Hub request`);
  const m = (px: number) => (px / worldPx(g.zoom)) * 2 * Math.PI * EARTH_RADIUS - Math.PI * EARTH_RADIUS;
  const bbox = [m(g.x0), -m(g.y0 + g.height), m(g.x0 + g.width), -m(g.y0)];
  const res = await fetch(SENTINEL_HUB_ENDPOINTS[source.endpoint].process, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${source.token}`, Accept: 'image/png' },
    body: JSON.stringify({
      input: {
        bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/3857' } },
        data: [{
          type: 'sentinel-1-grd',
          dataFilter: {
            timeRange: { from: `${start}T00:00:00Z`, to: `${end}T23:59:59Z` },
            acquisitionMode: 'IW',
            polarization: 'DV',
            mosaickingOrder: 'mostRecent',
          },
          // Same gamma0 terrain-flattened product as Planetary Computer's RTC,
          // so the thresholds mean the same for both sources.
          processing: { backCoeff: 'GAMMA0_TERRAIN', orthorectify: true, demInstance: 'COPERNICUS_30' },
        }],
      },
      output: { width: g.width, height: g.height, responses: [{ identifier: 'default', format: { type: 'image/png' } }] },
      evalscript: EVALSCRIPT,
    }),
  });
  if (!res.ok) throw new Error(`Sentinel Hub: ${res.status} ${await res.text()}`);
  const img = await decodeImage(await res.blob());
  return toSarImage(img.data, 2); // blue = dataMask
}

export async function fetchSar(grid: Grid, date: string, windowDays: number, source: SarSource, progress: Progress) {
  const g = sarFrame(grid);
  const start = shiftDate(date, -(windowDays - 1));
  return source.kind === 'planetary'
    ? fetchSarPlanetary(g, start, date, progress)
    : fetchSarSentinelHub(g, start, date, source, progress);
}

// OAuth client-credentials login for Sentinel Hub / Copernicus Data Space.
// Runs in the browser (both token endpoints allow CORS); nothing is stored.
export async function fetchSentinelHubToken(endpoint: SentinelHubEndpoint, clientId: string, clientSecret: string) {
  const res = await fetch(SENTINEL_HUB_ENDPOINTS[endpoint].token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  return (await res.json()).access_token as string;
}

// Flood mask by thresholding, with change detection, on the SAR frame:
//   water(image) = VV < thresholdVV && VH < thresholdVH
//   flood           = water(flood date) && !water(pre-flood)   -> 1
//   permanent water = water(flood date) &&  water(pre-flood)   -> 2
// Pixels without flood-date data are 0. Without pre-flood data, flood-date
// water counts as flood. For the risk model each grid cell gets the share of
// its SAR pixels that are water on the flood date.
export interface FloodMask {
  pixels: Uint8Array; // on the SAR frame
  water: Float32Array; // per grid cell, 0..1
}

export function computeFloodMask(g: Grid, post: SarImage, pre: SarImage | null, thresholds: { vv: number; vh: number }): FloodMask {
  const tvv = encodeDb(thresholds.vv), tvh = encodeDb(thresholds.vh);
  const isWater = (rgba: Uint8ClampedArray, o: number) => rgba[o + 3] > 0 && rgba[o] < tvv && rgba[o + 1] < tvh;
  const f = sarFrame(g);
  const pixels = new Uint8Array(f.width * f.height);
  const water = new Float32Array(g.width * g.height);
  const valid = new Uint8Array(g.width * g.height);
  for (let y = 0; y < f.height; y++) {
    for (let x = 0; x < f.width; x++) {
      const p = y * f.width + x, o = p * 4;
      const cell = Math.floor(y / SAR_SCALE) * g.width + Math.floor(x / SAR_SCALE);
      if (post.rgba[o + 3] === 0) continue;
      valid[cell]++;
      if (!isWater(post.rgba, o)) continue;
      pixels[p] = pre && isWater(pre.rgba, o) ? 2 : 1;
      water[cell]++;
    }
  }
  for (let k = 0; k < water.length; k++) water[k] = valid[k] ? water[k] / valid[k] : 0;
  return { pixels, water };
}

// Mean backscatter and flood state of one grid cell's SAR pixels.
export function sarCellSummary(g: Grid, post: SarImage, mask: FloodMask | null, k: number) {
  const f = sarFrame(g);
  const i = k % g.width, j = Math.floor(k / g.width);
  let n = 0, vv = 0, vh = 0, flooded = 0, permanent = 0;
  for (let dy = 0; dy < SAR_SCALE; dy++) {
    for (let dx = 0; dx < SAR_SCALE; dx++) {
      const p = (j * SAR_SCALE + dy) * f.width + i * SAR_SCALE + dx;
      if (post.rgba[p * 4 + 3] === 0) continue;
      n++;
      vv += decodeDb(post.rgba[p * 4]);
      vh += decodeDb(post.rgba[p * 4 + 1]);
      if (mask?.pixels[p] === 1) flooded++;
      if (mask?.pixels[p] === 2) permanent++;
    }
  }
  return n ? { vv: vv / n, vh: vh / n, flooded: flooded / n, permanent: permanent / n } : null;
}

// ------------------------------------------------------------- risk model --
// A transparent weighted-overlay model. Each feature is scaled to 0..1 so
// that 1 = more flood-prone:
//   elevation: 1 - HAND / HAND_MAX    (low ground relative to the nearest river)
//   slope:     1 - slope / SLOPE_MAX  (flat ground pools water)
//   distance:  exp(-d / DIST_SCALE)   (close to a river)
//   rainfall:  min-max over the AOI   (wetter than elsewhere this window)
//   sar:       share of the cell SAR sees as water on the flood date
// risk = sum(w_k * f_k) / sum(w_k), in 0..1, then binned into RISK_CLASSES.
export interface Layers {
  dem: Float32Array;
  slope: Float32Array;
  distance: Float32Array;
  hand: Float32Array;
  rain: Float32Array | null;
  sarWater: Float32Array | null;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function featureVector(layers: Layers, k: number, rainRange: [number, number]) {
  const { slope, distance, hand, rain, sarWater } = layers;
  const [rMin, rMax] = rainRange;
  return {
    elevation: Number.isFinite(hand[k]) ? 1 - clamp01(hand[k] / HAND_MAX) : 0,
    slope: 1 - clamp01(slope[k] / SLOPE_MAX),
    distance: Number.isFinite(distance[k]) ? Math.exp(-distance[k] / DIST_SCALE) : 0,
    rainfall: rain && rMax > rMin ? clamp01((rain[k] - rMin) / (rMax - rMin)) : 0,
    sar: sarWater ? sarWater[k] : 0,
  };
}

export function rainRange(rain: Float32Array | null): [number, number] {
  if (!rain) return [0, 0];
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < rain.length; k++) { if (rain[k] < lo) lo = rain[k]; if (rain[k] > hi) hi = rain[k]; }
  return [lo, hi];
}

export function computeRisk(layers: Layers, weights: Weights): Float32Array {
  const n = layers.dem.length;
  const risk = new Float32Array(n);
  const keys = Object.keys(weights) as (keyof Weights)[];
  const total = keys.reduce((s, key) => s + weights[key], 0) || 1;
  const range = rainRange(layers.rain);
  for (let k = 0; k < n; k++) {
    const f = featureVector(layers, k, range);
    let sum = 0;
    for (const key of keys) sum += weights[key] * f[key];
    risk[k] = sum / total;
  }
  return risk;
}

export function riskClass(score: number) {
  let c = 0;
  for (let i = 0; i < RISK_CLASSES.length; i++) if (score >= RISK_CLASSES[i].min) c = i;
  return c;
}

export function summarize(g: Grid, risk: Float32Array, mask: FloodMask | null, rain: Float32Array | null) {
  let floodKm2 = 0, highKm2 = 0, rainSum = 0;
  const classKm2 = RISK_CLASSES.map(() => 0);
  for (let j = 0; j < g.height; j++) {
    const area = g.rowCellSize[j] ** 2 / 1e6;
    for (let i = 0; i < g.width; i++) {
      const k = j * g.width + i;
      const c = riskClass(risk[k]);
      classKm2[c] += area;
      if (c >= 2) highKm2 += area;
      if (rain) rainSum += rain[k];
    }
  }
  if (mask) {
    const f = sarFrame(g);
    for (let y = 0; y < f.height; y++) {
      const area = (g.rowCellSize[Math.floor(y / SAR_SCALE)] / SAR_SCALE) ** 2 / 1e6;
      for (let x = 0; x < f.width; x++) if (mask.pixels[y * f.width + x] === 1) floodKm2 += area;
    }
  }
  return { floodKm2, highKm2, classKm2, meanRain: rain ? rainSum / rain.length : null };
}

// -------------------------------------------------------------- rendering --
// Paints a grid-sized RGBA image and returns it as a PNG data URL for a
// MapLibre image source.
function toDataUrl(g: Frame, paint: (k: number, out: Uint8ClampedArray, o: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = g.width;
  canvas.height = g.height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(g.width, g.height);
  for (let k = 0; k < g.width * g.height; k++) paint(k, img.data, k * 4);
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export function renderRisk(g: Grid, risk: Float32Array) {
  return toDataUrl(g, (k, out, o) => {
    const c = RISK_CLASSES[riskClass(risk[k])];
    out[o] = c.color[0]; out[o + 1] = c.color[1]; out[o + 2] = c.color[2]; out[o + 3] = c.alpha;
  });
}

export function renderFlood(g: Grid, mask: FloodMask) {
  const flood = mask.pixels;
  return toDataUrl(sarFrame(g), (k, out, o) => {
    if (!flood[k]) return;
    const c = flood[k] === 1 ? FLOOD_COLOR : PERMANENT_WATER_COLOR;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 200;
  });
}

// Blues ramp for rainfall.
const RAIN_RAMP = [[239, 243, 255], [189, 215, 231], [107, 174, 214], [49, 130, 189], [8, 81, 156]];
export function renderRainfall(g: Grid, rain: Float32Array) {
  const [lo, hi] = rainRange(rain);
  return toDataUrl(g, (k, out, o) => {
    const t = hi > lo ? ((rain[k] - lo) / (hi - lo)) * (RAIN_RAMP.length - 1) : 0;
    const a = Math.min(Math.floor(t), RAIN_RAMP.length - 2), f = t - a;
    for (let c = 0; c < 3; c++) out[o + c] = RAIN_RAMP[a][c] * (1 - f) + RAIN_RAMP[a + 1][c] * f;
    out[o + 3] = 150;
  });
}

// ------------------------------------------------------------------ dates --
export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
