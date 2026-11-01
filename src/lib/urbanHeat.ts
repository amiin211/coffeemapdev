// Client-side GeoAI for the Riyadh Urban Heat Island + Tree Canopy Equity
// dashboard. Rasters come from public tile APIs and are processed in the
// browser on one Web Mercator grid (~70 m cells, see geoRaster.ts).
//
// Pipeline:
//   Landsat 8/9 surface temperature ─┐
//   Sentinel-2 NDVI ─────────────────┼─> canopy, access, heat, hotspots
//   ESA WorldCover land cover ───────┤      -> equity = access - heat
//   OSM trees + parks (Overpass) ────┘      -> TF.js risk model -> priority zones
import {
  Bounds,
  Grid,
  Progress,
  boxBlur,
  clamp01,
  distanceTransform,
  fetchTileMosaic,
  makeGrid as makeGridFor,
  mosaicTileUrl,
  overpass,
  rampColor,
  rasterizePolygon,
  registerMosaic,
  searchDates,
  toDataUrl,
  toGridPx,
  TILE,
} from '@/lib/geoRaster';

export { DEM_SOURCE, cellAt, fetchDem, gridCorners } from '@/lib/geoRaster';
export type { Grid } from '@/lib/geoRaster';

// ------------------------------------------------------------------ config --
export const AOI: Bounds = { minLon: 46.4, maxLon: 47.4, minLat: 24.3, maxLat: 25.0 };
export const GRID_ZOOM = 11; // ~70 m cells at 24.6° N (Landsat thermal is 100 m)
export const makeGrid = () => makeGridFor(AOI, GRID_ZOOM);

// labelBelow: put the map label under the point where it would collide with a neighbour.
export const DISTRICTS: { name: string; nameAr: string; lon: number; lat: number; labelBelow?: boolean }[] = [
  { name: 'Ishbiliyah', nameAr: 'إشبيلية', lon: 46.79, lat: 24.793 },
  { name: 'Al-Malaz', nameAr: 'الملز', lon: 46.7275, lat: 24.6561, labelBelow: true },
  { name: 'Al-Murabba', nameAr: 'المربع', lon: 46.7098, lat: 24.6599 },
  { name: 'Ad-Diriyah', nameAr: 'الدرعية', lon: 46.5718, lat: 24.7483 },
  { name: 'Wadi Hanifa', nameAr: 'وادي حنيفة', lon: 46.61, lat: 24.66 },
  { name: 'An-Nasim (east)', nameAr: 'النسيم', lon: 46.8256, lat: 24.7189, labelBelow: true },
  { name: 'Ar-Rawdah (east)', nameAr: 'الروضة', lon: 46.7672, lat: 24.7341 },
  { name: 'As-Sulayy (east)', nameAr: 'السلي', lon: 46.8349, lat: 24.6599 },
];
const DISTRICT_RADIUS = 1500; // m, for district summaries

export const TREES_SNAPSHOT = '/data/urban-heat/trees-osm.geojson';
export const PARKS_SNAPSHOT = '/data/urban-heat/parks-osm.geojson';

// Byte encodings of the server-rendered tiles.
const LST_MIN = 10, LST_MAX = 70; // °C
const NDVI_MIN = -1, NDVI_MAX = 1;

// Model scales.
const URBAN_MIN_BUILT = 0.2; // built-up share (within ~250 m) that counts as city
const BUILT_RADIUS = 250; // m, neighbourhood for building density
const CANOPY_RADIUS = 300; // m, walkable neighbourhood canopy
const CANOPY_FULL = 0.25; // neighbourhood canopy share that counts as full access
const TREE_SCALE = 200; // m, tree access falls to 1/e over this distance
const PARK_SCALE = 500; // m, park access falls to 1/e over this distance
// Priority zones: the top PRIORITY_SHARE of built-up cells by
// risk × (1 − access). Riyadh is hot and sparsely planted almost everywhere,
// so absolute thresholds flag most of the city; ranking picks where to act first.
export const PRIORITY_SHARE = 0.15;
const HOTSPOT_CLUSTERS = 4;

export interface Weights {
  heat: number; // w1: land surface temperature
  density: number; // w2: building density
  vegetation: number; // w3: lack of vegetation (1 - NDVI)
}
export const DEFAULT_WEIGHTS: Weights = { heat: 0.5, density: 0.25, vegetation: 0.25 };

// ESA WorldCover 2021 classes.
export const LAND_COVER: Record<number, string> = {
  10: 'Tree cover', 20: 'Shrubland', 30: 'Grassland', 40: 'Cropland', 50: 'Built-up',
  60: 'Bare / sparse vegetation', 70: 'Snow and ice', 80: 'Open water', 90: 'Herbaceous wetland', 95: 'Mangroves', 100: 'Moss and lichen',
};

// ------------------------------------------------------------ satellite data --
const bbox = [AOI.minLon, AOI.minLat, AOI.maxLon, AOI.maxLat];

export interface Imagery {
  values: Float32Array; // NaN where no data
  dates: string[]; // acquisitions in the window
}

function decodeBand(rgba: Uint8ClampedArray, min: number, max: number) {
  const n = rgba.length / 4;
  const values = new Float32Array(n);
  for (let k = 0; k < n; k++) values[k] = rgba[k * 4 + 3] > 0 ? (rgba[k * 4] / 255) * (max - min) + min : NaN;
  return values;
}

async function fetchMosaicBand(
  g: Grid,
  search: object,
  collection: string,
  expression: string,
  range: [number, number],
  nodata: string,
  label: string,
  progress: Progress,
): Promise<Imagery> {
  const [searchid, dates] = await Promise.all([registerMosaic(search), searchDates(search)]);
  const query = new URLSearchParams({ collection, asset_as_band: 'True', expression, rescale: `${range[0]},${range[1]}`, nodata });
  const rgba = await fetchTileMosaic(g, mosaicTileUrl(searchid, query), TILE, (d, n) => progress(`${label} tiles ${d}/${n}`));
  return { values: decodeBand(rgba, range[0], range[1]), dates };
}

// Land surface temperature from Landsat 8/9 Collection 2 Level-2 (band 10,
// 100 m thermal): ST = DN * 0.00341802 + 149.0 K, converted to °C. The least
// cloudy scenes in the window are on top of the mosaic.
export function fetchLst(g: Grid, start: string, end: string, progress: Progress) {
  return fetchMosaicBand(
    g,
    {
      collections: ['landsat-c2-l2'],
      bbox,
      datetime: `${start}T00:00:00Z/${end}T23:59:59Z`,
      sortby: [{ field: 'eo:cloud_cover', direction: 'asc' }],
      'filter-lang': 'cql2-json',
      filter: {
        op: 'and',
        args: [
          { op: 'in', args: [{ property: 'platform' }, ['landsat-8', 'landsat-9']] },
          { op: '<', args: [{ property: 'eo:cloud_cover' }, 20] },
        ],
      },
    },
    'landsat-c2-l2',
    'lwir11*0.00341802+149.0-273.15',
    [LST_MIN, LST_MAX],
    '0',
    'Landsat LST',
    progress,
  );
}

// NDVI from Sentinel-2 L2A (10 m, read at grid resolution). From processing
// baseline 04.00 (25 Jan 2022) reflectances carry a +1000 offset, which the
// expression removes: NDVI = (B08 - B04) / (B08 + B04 - 2000).
export function fetchNdvi(g: Grid, start: string, end: string, progress: Progress) {
  const offset = start >= '2022-01-25';
  return fetchMosaicBand(
    g,
    {
      collections: ['sentinel-2-l2a'],
      bbox,
      datetime: `${start}T00:00:00Z/${end}T23:59:59Z`,
      sortby: [{ field: 'eo:cloud_cover', direction: 'asc' }],
      'filter-lang': 'cql2-json',
      filter: { op: '<', args: [{ property: 'eo:cloud_cover' }, 10] },
    },
    'sentinel-2-l2a',
    offset ? '(B08-B04)/(B08+B04-2000)' : '(B08-B04)/(B08+B04)',
    [NDVI_MIN, NDVI_MAX],
    '0',
    'Sentinel-2 NDVI',
    progress,
  );
}

// ESA WorldCover 2021 (10 m) land cover classes, read at grid resolution.
export async function fetchLandCover(g: Grid, progress: Progress): Promise<Uint8Array> {
  const search = { collections: ['esa-worldcover'], bbox, datetime: '2021-01-01T00:00:00Z/2021-12-31T23:59:59Z' };
  const searchid = await registerMosaic(search);
  const query = new URLSearchParams({ collection: 'esa-worldcover', assets: 'map', nodata: '0' });
  const rgba = await fetchTileMosaic(g, mosaicTileUrl(searchid, query), TILE, (d, n) => progress(`WorldCover tiles ${d}/${n}`));
  const classes = new Uint8Array(g.width * g.height);
  for (let k = 0; k < classes.length; k++) classes[k] = rgba[k * 4 + 3] > 0 ? rgba[k * 4] : 0;
  return classes;
}

// ------------------------------------------------------------- air climate --
// Daily air temperature and solar radiation from NASA POWER (MERRA-2 / CERES,
// ~0.5°) at central Riyadh, for context next to the satellite surface data.
export interface AirClimate {
  meanT2M: number;
  meanTmax: number;
  meanSolar: number; // kWh/m²/day
  days: number;
}

export async function fetchAirClimate(start: string, end: string): Promise<AirClimate> {
  const params = new URLSearchParams({
    parameters: 'T2M,T2M_MAX,ALLSKY_SFC_SW_DWN',
    community: 'RE',
    longitude: '46.72',
    latitude: '24.69',
    start: start.replace(/-/g, ''),
    end: end.replace(/-/g, ''),
    format: 'JSON',
  });
  const res = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`);
  if (!res.ok) throw new Error(`NASA POWER: ${res.status}`);
  const json: { properties: { parameter: Record<string, Record<string, number>> } } = await res.json();
  const mean = (key: string) => {
    const v = Object.values(json.properties.parameter[key]).filter((x) => x > -900); // -999 = missing
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  };
  return {
    meanT2M: mean('T2M'),
    meanTmax: mean('T2M_MAX'),
    meanSolar: mean('ALLSKY_SFC_SW_DWN'),
    days: Object.keys(json.properties.parameter.T2M).length,
  };
}

// ---------------------------------------------------------------- OSM data --
export type TreeCollection = GeoJSON.FeatureCollection<GeoJSON.Point>;
export type ParkCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon, { name: string }>;

export async function fetchOsmSnapshots(): Promise<{ trees: TreeCollection; parks: ParkCollection }> {
  const [trees, parks] = await Promise.all([fetch(TREES_SNAPSHOT).then((r) => r.json()), fetch(PARKS_SNAPSHOT).then((r) => r.json())]);
  return { trees, parks };
}

// Live OSM trees (natural=tree) and parks (leisure=park) from Overpass;
// null if every mirror fails.
export async function fetchOsmLive(): Promise<{ trees: TreeCollection; parks: ParkCollection } | null> {
  const box = `${AOI.minLat},${AOI.minLon},${AOI.maxLat},${AOI.maxLon}`;
  type Element = { type: string; lat?: number; lon?: number; geometry?: { lat: number; lon: number }[]; members?: { role: string; geometry?: { lat: number; lon: number }[] }[]; tags?: Record<string, string> };
  const [t, p] = await Promise.all([
    overpass<{ elements: Element[] }>(`[out:json][timeout:180];node["natural"="tree"](${box});out skel qt;`),
    overpass<{ elements: Element[] }>(`[out:json][timeout:180];(way["leisure"="park"](${box});relation["leisure"="park"](${box}););out geom qt;`),
  ]);
  if (!t || !p) return null;
  const ring = (geom: { lat: number; lon: number }[]) => geom.map((q) => [q.lon, q.lat]);
  const closed = (r: number[][]) => r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];
  const parks: ParkCollection['features'] = [];
  for (const e of p.elements) {
    const name = e.tags?.['name:en'] || e.tags?.name || '';
    const rings = e.type === 'way' && e.geometry ? [ring(e.geometry)]
      : (e.members ?? []).filter((m) => m.role === 'outer' && m.geometry).map((m) => ring(m.geometry!));
    for (const r of rings) if (closed(r)) parks.push({ type: 'Feature', properties: { name }, geometry: { type: 'Polygon', coordinates: [r] } });
  }
  return {
    trees: {
      type: 'FeatureCollection',
      features: t.elements.filter((e) => e.lat !== undefined).map((e) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [e.lon!, e.lat!] } })),
    },
    parks: { type: 'FeatureCollection', features: parks },
  };
}

// -------------------------------------------------------------- vegetation --
// Tree canopy (0..1) per cell: the strongest of
//   - vegetation density from NDVI: (NDVI - 0.1) / 0.4, clamped (0.5 ≈ healthy irrigated trees),
//   - WorldCover "tree cover",
//   - a mapped OSM tree in the cell (0.6).
export function computeCanopy(g: Grid, ndvi: Float32Array, landCover: Uint8Array, trees: TreeCollection) {
  const canopy = new Float32Array(g.width * g.height);
  for (let k = 0; k < canopy.length; k++) {
    const v = Number.isFinite(ndvi[k]) ? clamp01((ndvi[k] - 0.1) / 0.4) : 0;
    canopy[k] = landCover[k] === 10 ? Math.max(v, 1) : v;
  }
  for (const f of trees.features) {
    const [x, y] = toGridPx(g, f.geometry.coordinates[0], f.geometry.coordinates[1]);
    const i = Math.floor(x), j = Math.floor(y);
    if (i >= 0 && j >= 0 && i < g.width && j < g.height) canopy[j * g.width + i] = Math.max(canopy[j * g.width + i], 0.6);
  }
  return canopy;
}

const radiusCells = (g: Grid, metres: number) => Math.max(1, Math.round(metres / g.rowCellSize[g.height >> 1]));

// Share of each cell's neighbourhood (radius in metres) where `test` holds.
function neighbourhoodShare(g: Grid, values: ArrayLike<number>, test: (v: number) => number, metres: number) {
  const out = new Float32Array(g.width * g.height);
  for (let k = 0; k < out.length; k++) out[k] = test(values[k]);
  boxBlur(out, g.width, g.height, radiusCells(g, metres));
  return out;
}

// ------------------------------------------------------------- the layers --
export interface Layers {
  lst: Float32Array;
  ndvi: Float32Array;
  landCover: Uint8Array;
  dem: Float32Array | null;
  canopy: Float32Array;
  canopyNearby: Float32Array; // neighbourhood canopy share
  builtDensity: Float32Array;
  urban: Uint8Array;
  distTree: Float32Array; // m to the nearest tree canopy
  distPark: Float32Array; // m to the nearest park
  lstRange: [number, number]; // urban 5th..95th percentile, °C
}

// Derives everything that doesn't depend on the model weights.
export function deriveLayers(
  g: Grid,
  lst: Float32Array,
  ndvi: Float32Array,
  landCover: Uint8Array,
  dem: Float32Array | null,
  trees: TreeCollection,
  parks: ParkCollection,
): Layers {
  const n = g.width * g.height;
  const canopy = computeCanopy(g, ndvi, landCover, trees);
  const canopyNearby = neighbourhoodShare(g, canopy, (v) => v, CANOPY_RADIUS);
  const builtDensity = neighbourhoodShare(g, landCover, (c) => (c === 50 ? 1 : 0), BUILT_RADIUS);
  const urban = new Uint8Array(n);
  for (let k = 0; k < n; k++) urban[k] = builtDensity[k] >= URBAN_MIN_BUILT ? 1 : 0;

  // Nearest tree canopy: any cell at least half canopy (OSM trees included).
  const treeSeeds = new Uint8Array(n);
  for (let k = 0; k < n; k++) treeSeeds[k] = canopy[k] >= 0.5 ? 1 : 0;
  const distTree = distanceTransform(g, treeSeeds).distance;

  const parkSeeds = new Uint8Array(n);
  for (const f of parks.features) rasterizePolygon(g, f.geometry.coordinates[0], parkSeeds);
  const distPark = distanceTransform(g, parkSeeds).distance;

  // Heat is judged against the city itself: the 5th–95th percentile of urban LST.
  const urbanLst: number[] = [];
  for (let k = 0; k < n; k += 3) if (urban[k] && Number.isFinite(lst[k])) urbanLst.push(lst[k]);
  urbanLst.sort((a, b) => a - b);
  const pct = (p: number) => urbanLst[Math.min(urbanLst.length - 1, Math.floor(p * urbanLst.length))] ?? NaN;

  return { lst, ndvi, landCover, dem, canopy, canopyNearby, builtDensity, urban, distTree, distPark, lstRange: [pct(0.05), pct(0.95)] };
}

// Heat exposure 0..1 (relative within the city).
export const heatAt = (L: Layers, k: number) =>
  Number.isFinite(L.lst[k]) ? clamp01((L.lst[k] - L.lstRange[0]) / (L.lstRange[1] - L.lstRange[0])) : NaN;

// Vegetation access 0..1: mean of neighbourhood canopy, nearness to tree
// canopy and nearness to a park.
export const accessAt = (L: Layers, k: number) =>
  (clamp01(L.canopyNearby[k] / CANOPY_FULL) + Math.exp(-L.distTree[k] / TREE_SCALE) + Math.exp(-L.distPark[k] / PARK_SCALE)) / 3;

export const vegetationAt = (L: Layers, k: number) => (Number.isFinite(L.ndvi[k]) ? clamp01((L.ndvi[k] - 0.1) / 0.4) : 0);

// --------------------------------------------------------------- hotspots --
// 1-D k-means on urban LST (quantile-initialised, so results are repeatable).
// Returns each urban cell's heat class 1..k (k = hottest; 0 outside the city)
// and the cluster centres in °C.
export function kmeansHotspots(L: Layers, k = HOTSPOT_CLUSTERS) {
  const n = L.lst.length;
  const sample: number[] = [];
  for (let i = 0; i < n; i += 5) if (L.urban[i] && Number.isFinite(L.lst[i])) sample.push(L.lst[i]);
  sample.sort((a, b) => a - b);
  let centres = Array.from({ length: k }, (_, c) => sample[Math.floor(((c + 0.5) / k) * sample.length)] ?? 0);
  for (let iter = 0; iter < 25; iter++) {
    const sum = new Float64Array(k), count = new Float64Array(k);
    for (const v of sample) {
      let best = 0;
      for (let c = 1; c < k; c++) if (Math.abs(v - centres[c]) < Math.abs(v - centres[best])) best = c;
      sum[best] += v; count[best]++;
    }
    const next = centres.map((c, i) => (count[i] ? sum[i] / count[i] : c));
    const moved = next.some((c, i) => Math.abs(c - centres[i]) > 0.01);
    centres = next.sort((a, b) => a - b);
    if (!moved) break;
  }
  const classes = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!L.urban[i] || !Number.isFinite(L.lst[i])) continue;
    let best = 0;
    for (let c = 1; c < k; c++) if (Math.abs(L.lst[i] - centres[c]) < Math.abs(L.lst[i] - centres[best])) best = c;
    classes[i] = best + 1;
  }
  return { classes, centres };
}

// ------------------------------------------------------ risk model (TF.js) --
// Heat vulnerability: risk = (w1 * heat + w2 * buildingDensity + w3 * (1 - vegetation)) / (w1 + w2 + w3),
// evaluated for every cell as one [n x 3] · [3 x 1] matrix product in
// TensorFlow.js on the GPU (WebGL), falling back to the CPU backend.
let tfReady: Promise<typeof import('@tensorflow/tfjs-core')> | null = null;
function loadTf() {
  tfReady ??= (async () => {
    const tf = await import('@tensorflow/tfjs-core');
    await import('@tensorflow/tfjs-backend-cpu');
    await import('@tensorflow/tfjs-backend-webgl');
    try {
      if (!(await tf.setBackend('webgl'))) await tf.setBackend('cpu');
    } catch {
      await tf.setBackend('cpu');
    }
    await tf.ready();
    return tf;
  })();
  return tfReady;
}

export async function computeRisk(L: Layers, w: Weights): Promise<{ risk: Float32Array; backend: string }> {
  const tf = await loadTf();
  const n = L.lst.length;
  const features = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const heat = heatAt(L, k);
    features[k * 3] = Number.isFinite(heat) ? heat : 0;
    features[k * 3 + 1] = L.builtDensity[k];
    features[k * 3 + 2] = 1 - vegetationAt(L, k);
  }
  const total = w.heat + w.density + w.vegetation || 1;
  const risk = tf.tidy(() => {
    const x = tf.tensor2d(features, [n, 3]);
    const weights = tf.tensor2d([w.heat / total, w.density / total, w.vegetation / total], [3, 1]);
    return tf.reshape(tf.matMul(x, weights), [n]);
  });
  const data = (await risk.data()) as Float32Array;
  risk.dispose();
  return { risk: data, backend: tf.getBackend() };
}

// ---------------------------------------------------------------- equity --
// Tree canopy equity = vegetation access - heat exposure (-1..1) in the city.
// Priority zones: the built-up cells with the highest risk × (1 − access).
export interface Results {
  equity: Float32Array; // NaN outside the city
  risk: Float32Array;
  priority: Uint8Array;
  hotspots: Uint8Array; // heat class 1..4, 4 = hotspot
  centres: number[];
  backend: string;
}

export async function computeResults(L: Layers, w: Weights): Promise<Results> {
  const n = L.lst.length;
  const { classes, centres } = kmeansHotspots(L);
  const { risk, backend } = await computeRisk(L, w);
  const equity = new Float32Array(n).fill(NaN);
  const score = new Float32Array(n).fill(NaN);
  const scores: number[] = [];
  for (let k = 0; k < n; k++) {
    if (!L.urban[k]) continue;
    const heat = heatAt(L, k);
    if (!Number.isFinite(heat)) continue;
    const access = accessAt(L, k);
    equity[k] = access - heat;
    score[k] = risk[k] * (1 - access);
    scores.push(score[k]);
  }
  scores.sort((a, b) => a - b);
  const cutoff = scores[Math.floor((1 - PRIORITY_SHARE) * scores.length)] ?? Infinity;
  const priority = new Uint8Array(n);
  for (let k = 0; k < n; k++) if (score[k] >= cutoff) priority[k] = 1;
  return { equity, risk, priority, hotspots: classes, centres, backend };
}

// ------------------------------------------------------------------ stats --
export function summarize(g: Grid, L: Layers, R: Results) {
  let urbanKm2 = 0, hotspotKm2 = 0, priorityKm2 = 0, urbanLst = 0, ruralLst = 0, urbanN = 0, ruralN = 0, canopy = 0;
  for (let j = 0; j < g.height; j++) {
    const area = g.rowCellSize[j] ** 2 / 1e6;
    for (let i = 0; i < g.width; i++) {
      const k = j * g.width + i;
      const t = L.lst[k];
      if (L.urban[k]) {
        urbanKm2 += area;
        canopy += L.canopy[k] * area;
        if (Number.isFinite(t)) { urbanLst += t; urbanN++; }
        if (R.hotspots[k] === HOTSPOT_CLUSTERS) hotspotKm2 += area;
        if (R.priority[k]) priorityKm2 += area;
      } else if (L.builtDensity[k] < 0.02 && Number.isFinite(t)) {
        ruralLst += t; ruralN++;
      }
    }
  }
  return {
    urbanKm2,
    hotspotKm2,
    priorityKm2,
    urbanCanopyPct: urbanKm2 ? (canopy / urbanKm2) * 100 : 0,
    meanUrbanLst: urbanN ? urbanLst / urbanN : NaN,
    // Surface urban heat island intensity: city minus its non-built surroundings.
    suhi: urbanN && ruralN ? urbanLst / urbanN - ruralLst / ruralN : NaN,
  };
}

// Mean values within DISTRICT_RADIUS of each focus district.
export function districtSummaries(g: Grid, L: Layers, R: Results) {
  return DISTRICTS.map((d) => {
    const [cx, cy] = toGridPx(g, d.lon, d.lat);
    const r = DISTRICT_RADIUS / g.rowCellSize[Math.min(g.height - 1, Math.max(0, Math.floor(cy)))];
    let n = 0, lst = 0, canopy = 0, equity = 0, eqN = 0, priority = 0;
    for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(g.height - 1, Math.ceil(cy + r)); j++) {
      for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(g.width - 1, Math.ceil(cx + r)); i++) {
        if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) > r) continue;
        const k = j * g.width + i;
        if (!Number.isFinite(L.lst[k])) continue;
        n++;
        lst += L.lst[k];
        canopy += L.canopy[k];
        priority += R.priority[k];
        if (Number.isFinite(R.equity[k])) { equity += R.equity[k]; eqN++; }
      }
    }
    return {
      ...d,
      lst: n ? lst / n : NaN,
      canopyPct: n ? (canopy / n) * 100 : NaN,
      equity: eqN ? equity / eqN : NaN,
      priorityPct: n ? (priority / n) * 100 : NaN,
    };
  });
}

// -------------------------------------------------------------- rendering --
export const HEAT_RAMP = [[255, 255, 178], [254, 204, 92], [253, 141, 60], [240, 59, 32], [189, 0, 38]]; // YlOrRd
export const NDVI_RAMP = [[166, 97, 26], [223, 194, 125], [245, 245, 220], [128, 205, 110], [26, 150, 65]];
export const EQUITY_RAMP = [[178, 24, 43], [239, 138, 98], [247, 247, 247], [127, 191, 123], [27, 120, 55]]; // deficit -> good
export const HOTSPOT_COLOR = [106, 27, 154];
export const PRIORITY_COLOR = [197, 27, 125];
export const CANOPY_COLOR = [0, 90, 50];
export const NDVI_LEGEND: [number, number] = [-0.1, 0.6];

const rgba = (out: Uint8ClampedArray, o: number, c: number[], a: number) => {
  out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = a;
};

export function renderHeat(g: Grid, L: Layers) {
  const [lo, hi] = L.lstRange;
  // Stretch a little past the urban range so the desert stays readable.
  const a = lo - 4, b = hi + 4;
  return toDataUrl(g, (k, out, o) => {
    if (!Number.isFinite(L.lst[k])) return;
    rampColor(HEAT_RAMP, (L.lst[k] - a) / (b - a), out, o);
    out[o + 3] = 175;
  });
}

export function renderNdvi(g: Grid, L: Layers) {
  return toDataUrl(g, (k, out, o) => {
    if (!Number.isFinite(L.ndvi[k])) return;
    rampColor(NDVI_RAMP, (L.ndvi[k] - NDVI_LEGEND[0]) / (NDVI_LEGEND[1] - NDVI_LEGEND[0]), out, o);
    out[o + 3] = 170;
  });
}

export function renderCanopy(g: Grid, L: Layers) {
  return toDataUrl(g, (k, out, o) => {
    if (L.canopy[k] < 0.05) return;
    rgba(out, o, CANOPY_COLOR, Math.round(60 + 190 * L.canopy[k]));
  });
}

export function renderHotspots(g: Grid, R: Results) {
  return toDataUrl(g, (k, out, o) => {
    if (R.hotspots[k] === HOTSPOT_CLUSTERS) rgba(out, o, HOTSPOT_COLOR, 190);
  });
}

export function renderEquity(g: Grid, R: Results) {
  return toDataUrl(g, (k, out, o) => {
    if (!Number.isFinite(R.equity[k])) return;
    rampColor(EQUITY_RAMP, (R.equity[k] + 1) / 2, out, o);
    out[o + 3] = 190;
  });
}

export function renderPriority(g: Grid, R: Results) {
  return toDataUrl(g, (k, out, o) => {
    if (R.priority[k]) rgba(out, o, PRIORITY_COLOR, 220);
  });
}
