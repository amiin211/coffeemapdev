// Shared client-side raster toolkit for the GeoAI dashboards (Blue Nile Flood
// Risk, Riyadh Urban Heat).
//
// Analyses run on a Grid: the Web Mercator pixel grid of one zoom level
// clipped to an area of interest. Every map-tile pixel at that zoom lands on
// exactly one cell, so rasters from tile APIs need no resampling, and results
// drop onto the map as image overlays that line up exactly.

export interface Bounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

// ------------------------------------------------------------ web mercator --
export const TILE = 256;
export const EARTH_RADIUS = 6378137;
export const worldPx = (zoom: number) => TILE * 2 ** zoom;
export const lonToPx = (lon: number, zoom: number) => ((lon + 180) / 360) * worldPx(zoom);
export const latToPx = (lat: number, zoom: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(Math.PI / 4 + r / 2)) / Math.PI) / 2) * worldPx(zoom);
};
export const pxToLon = (x: number, zoom: number) => (x / worldPx(zoom)) * 360 - 180;
export const pxToLat = (y: number, zoom: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / worldPx(zoom)))) * 180) / Math.PI;
// Global pixel -> EPSG:3857 metres.
export const pxToMercatorX = (x: number, zoom: number) => (x / worldPx(zoom)) * 2 * Math.PI * EARTH_RADIUS - Math.PI * EARTH_RADIUS;
export const pxToMercatorY = (y: number, zoom: number) => Math.PI * EARTH_RADIUS - (y / worldPx(zoom)) * 2 * Math.PI * EARTH_RADIUS;

// ------------------------------------------------------------------- grid --
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

export function makeGrid(aoi: Bounds, zoom: number): Grid {
  const x0 = Math.floor(lonToPx(aoi.minLon, zoom));
  const x1 = Math.ceil(lonToPx(aoi.maxLon, zoom));
  const y0 = Math.floor(latToPx(aoi.maxLat, zoom));
  const y1 = Math.ceil(latToPx(aoi.minLat, zoom));
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

// The same area as the grid, `scale` times finer (scale a power of two).
export function scaledFrame(g: Frame, scale: number): Frame {
  return { zoom: g.zoom + Math.log2(scale), x0: g.x0 * scale, y0: g.y0 * scale, width: g.width * scale, height: g.height * scale };
}

// Corner coordinates for a MapLibre image source covering the grid.
export function gridCorners(g: Grid): [[number, number], [number, number], [number, number], [number, number]] {
  return [[g.west, g.north], [g.east, g.north], [g.east, g.south], [g.west, g.south]];
}

export function cellAt(g: Frame, lon: number, lat: number): number | null {
  const i = Math.floor(lonToPx(lon, g.zoom) - g.x0);
  const j = Math.floor(latToPx(lat, g.zoom) - g.y0);
  return i < 0 || j < 0 || i >= g.width || j >= g.height ? null : j * g.width + i;
}

export const cellLon = (g: Frame, i: number) => pxToLon(g.x0 + i + 0.5, g.zoom);

// Grid pixel coordinates (fractional) of a lon/lat.
export const toGridPx = (g: Frame, lon: number, lat: number): [number, number] => [lonToPx(lon, g.zoom) - g.x0, latToPx(lat, g.zoom) - g.y0];

// ---------------------------------------------------------- tile fetching --
export type Progress = (message: string) => void;

// Decodes an image's raw pixel values (no colour management or alpha
// premultiplication, which would corrupt encoded data).
export async function decodeImage(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

const TILE_ATTEMPTS = 3;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One tile's pixels, or null where the server has no data: Planetary Computer
// answers 204 (empty body) where no scene in the mosaic covers the tile, and
// decoding that body fails with "The source image could not be decoded".
// Busy tile servers sometimes answer 429/5xx, or 200 with an error page or a
// truncated image; those are retried.
async function fetchTile(url: string): Promise<ImageData | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 204 || (!res.ok && res.status !== 429 && res.status < 500)) return null;
      if (res.ok && res.headers.get('content-type')?.startsWith('image/')) return await decodeImage(await res.blob());
      if (attempt === TILE_ATTEMPTS) throw new Error(`tile server answered ${res.status}`);
    } catch (err) {
      // Network error or undecodable body.
      if (attempt === TILE_ATTEMPTS) throw err;
    }
    await wait(400 * 2 ** (attempt - 1));
  }
}

// Fetches every tile covering the frame and copies their pixels into one RGBA
// buffer the size of the frame. Tiles are fetched at the zoom where one tile
// pixel = one frame pixel (one level up for 512 px tiles). Tiles with no data
// stay transparent (alpha 0); tiles that still fail after retries are counted
// and reported once every other tile has loaded.
export async function fetchTileMosaic(
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
  let failed = 0;
  await pool(tiles, 12, async ([tx, ty]) => {
    const img = await fetchTile(urlFor(z, tx, ty)).catch(() => {
      failed++;
      return null;
    });
    if (img) {
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
  if (failed) throw new Error(`${failed} of ${tiles.length} tiles could not be loaded from the imagery server; try again.`);
  return out;
}

export const fillTemplate = (template: string, z: number, x: number, y: number) =>
  template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

// ------------------------------------------------------- planetary computer --
// Microsoft Planetary Computer: keyless STAC search + dynamic tiles, CORS-enabled.
export const PC_API = 'https://planetarycomputer.microsoft.com/api/data/v1';
export const PC_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1';

// Registers a STAC search as a mosaic and returns its id for tile requests.
export async function registerMosaic(search: object): Promise<string> {
  const res = await fetch(`${PC_API}/mosaic/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(search),
  });
  if (!res.ok) throw new Error(`Planetary Computer: ${res.status} ${await res.text()}`);
  return (await res.json()).searchid;
}

// Acquisition dates of the items a search matches (for display).
export async function searchDates(search: object): Promise<string[]> {
  const res = await fetch(`${PC_STAC}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...search, limit: 200 }),
  });
  if (!res.ok) return [];
  const json: { features: { properties: { datetime: string } }[] } = await res.json();
  return Array.from(new Set(json.features.map((f) => f.properties.datetime.slice(0, 10)))).sort();
}

export const mosaicTileUrl = (searchid: string, query: URLSearchParams) => (z: number, x: number, y: number) =>
  `${PC_API}/mosaic/${searchid}/tiles/WebMercatorQuad/${z}/${x}/${y}.png?${query}`;

// -------------------------------------------------------------------- DEM --
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

// ------------------------------------------------------------ rasterising --
// Marks every cell a line string passes through (half-cell steps).
export function rasterizeLine(g: Frame, coords: number[][], mask: Uint8Array) {
  const pts = coords.map(([lon, lat]) => toGridPx(g, lon, lat));
  for (let s = 1; s < pts.length; s++) {
    const [ax, ay] = pts[s - 1], [bx, by] = pts[s];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1;
    for (let t = 0; t <= steps; t++) {
      const i = Math.floor(ax + ((bx - ax) * t) / steps);
      const j = Math.floor(ay + ((by - ay) * t) / steps);
      if (i >= 0 && j >= 0 && i < g.width && j < g.height) mask[j * g.width + i] = 1;
    }
  }
}

// Fills a polygon's outer ring (scanline, cell centres), plus its outline so
// polygons thinner than a cell still register.
export function rasterizePolygon(g: Frame, ring: number[][], mask: Uint8Array) {
  const pts = ring.map(([lon, lat]) => toGridPx(g, lon, lat));
  const ys = pts.map((p) => p[1]);
  const j0 = Math.max(0, Math.floor(Math.min(...ys))), j1 = Math.min(g.height - 1, Math.ceil(Math.max(...ys)));
  for (let j = j0; j <= j1; j++) {
    const y = j + 0.5;
    const xs: number[] = [];
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let i = Math.max(0, Math.ceil(xs[k] - 0.5)); i <= Math.min(g.width - 1, Math.floor(xs[k + 1] - 0.5)); i++) mask[j * g.width + i] = 1;
    }
  }
  rasterizeLine(g, ring, mask);
}

// ------------------------------------------------------ distance transform --
// Exact Euclidean distance transform (Felzenszwalb & Huttenlocher): for every
// cell, the distance in metres to the nearest seed cell (mask = 1) and that
// cell's index, in two 1-D passes (columns, then rows).
export function distanceTransform(g: Grid, seeds: Uint8Array) {
  const { width: w, height: h } = g;
  const n = w * h;
  const INF = 1e20;
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
    for (let j = 0; j < h; j++) line[j] = seeds[j * w + i] ? 0 : INF;
    dt1d(h);
    for (let j = 0; j < h; j++) { colD[j * w + i] = d[j]; colArg[j * w + i] = arg[j]; }
  }
  const distance = new Float32Array(n);
  const nearest = new Int32Array(n).fill(-1);
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

// In-place separable box blur (running sums, edges clamped), radius in cells.
export function boxBlur(values: Float32Array, w: number, h: number, r: number) {
  if (r < 1) return;
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

// -------------------------------------------------------------- rendering --
// Paints a frame-sized RGBA image and returns it as a PNG data URL for a
// MapLibre image source.
export function toDataUrl(g: Frame, paint: (k: number, out: Uint8ClampedArray, o: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = g.width;
  canvas.height = g.height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(g.width, g.height);
  for (let k = 0; k < g.width * g.height; k++) paint(k, img.data, k * 4);
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

// Linear interpolation along a colour ramp; t in 0..1.
export function rampColor(ramp: number[][], t: number, out: Uint8ClampedArray, o: number) {
  const x = Math.min(Math.max(t, 0), 1) * (ramp.length - 1);
  const a = Math.min(Math.floor(x), ramp.length - 2), f = x - a;
  for (let c = 0; c < 3; c++) out[o + c] = ramp[a][c] * (1 - f) + ramp[a + 1][c] * f;
}

// ------------------------------------------------------------------- misc --
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Overpass API mirrors; public servers are often busy, so they are tried in turn.
export const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export async function overpass<T>(query: string, timeoutMs = 100_000): Promise<T | null> {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return (await res.json()) as T;
    } catch {
      // try the next mirror
    }
  }
  return null;
}
