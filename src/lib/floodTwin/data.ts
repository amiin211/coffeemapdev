// Loads the static Blue Nile Flood Twin data from public/data/flood-twin/
// (built offline by scripts/build-flood-twin-sample.py or
// scripts/build-flood-twin-data.py). Coordinates are local metres from the
// AOI centre: x east, y north.

import { DATA_URL } from './config';

export interface TerrainMeta {
  illustrative: boolean;
  note?: string;
  place: { en: string; ar: string };
  crs: string;
  origin_utm: [number, number] | null;
  width_m: number;
  height_m: number;
  resolution_m: number;
  heightmap: { file: string; width: number; height: number; encoding: 'rg16'; min_elev_m: number; max_elev_m: number };
  dem_source: string;
  texture: { file: string; source: string; date: string | null };
  buildings: { file: string; count: number; source: string };
  river_centreline?: [number, number][];
  layers: { flood_extent: string | null };
}

export interface Calibration {
  offset_m: number;
  method: 'command-line' | 'dem-river-median';
  baseline_date: string | null;
  note?: string;
}

export interface Timeline {
  illustrative: boolean;
  source: string;
  dates: string[];
  water_level_m: number[];
  rainfall_mm: number[];
  calibration: Calibration | null;
}

export interface BuildingProps {
  id: number;
  height_m: number;
  base_elev_m: number;
  people?: number;
}

export type BuildingCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, BuildingProps> & {
  illustrative?: boolean;
};
export type ExtentCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

/** Terrain elevations (m) on a regular grid; row 0 is the north edge. */
export interface HeightGrid {
  values: Float32Array;
  width: number;
  height: number;
  min: number;
  max: number;
}

export interface FloodTwinData {
  terrain: TerrainMeta;
  heights: HeightGrid;
  texture: ImageBitmap;
  timeline: Timeline;
  buildings: BuildingCollection;
  floodExtent: ExtentCollection | null;
}

async function json<T>(file: string): Promise<T> {
  const res = await fetch(`${DATA_URL}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function bitmap(file: string, options: ImageBitmapOptions): Promise<ImageBitmap> {
  const res = await fetch(`${DATA_URL}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return createImageBitmap(await res.blob(), options);
}

/** Decodes the 16-bit (R * 256 + G) heightmap to elevations in metres. */
function decodeHeights(image: ImageBitmap, meta: TerrainMeta['heightmap']): HeightGrid {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const px = ctx.getImageData(0, 0, image.width, image.height).data;
  const values = new Float32Array(image.width * image.height);
  const scale = (meta.max_elev_m - meta.min_elev_m) / 65535;
  for (let i = 0; i < values.length; i++) values[i] = meta.min_elev_m + (px[i * 4] * 256 + px[i * 4 + 1]) * scale;
  return { values, width: image.width, height: image.height, min: meta.min_elev_m, max: meta.max_elev_m };
}

export async function loadFloodTwinData(): Promise<FloodTwinData> {
  const terrain = await json<TerrainMeta>('terrain.json');
  // The flood extent is optional: terrain.json names it only when the file exists.
  const [heightImage, texture, timeline, buildings, floodExtent] = await Promise.all([
    // Heightmaps must be read without colour management, or the encoded values shift.
    bitmap(terrain.heightmap.file, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }),
    // three.js can't flip ImageBitmaps on upload, so flip here: north (row 0) ends up at v = 1.
    bitmap(terrain.texture.file, { imageOrientation: 'flipY' }),
    json<Timeline>('timeline.json'),
    json<BuildingCollection>(terrain.buildings.file),
    terrain.layers.flood_extent ? json<ExtentCollection>(terrain.layers.flood_extent).catch(() => null) : Promise.resolve(null),
  ]);
  const heights = decodeHeights(heightImage, terrain.heightmap);
  heightImage.close();
  return { terrain, heights, texture, timeline, buildings, floodExtent };
}

/** Bilinear terrain elevation (m) at local metres (x east, y north). */
export function elevationAt(grid: HeightGrid, terrain: TerrainMeta, x: number, y: number): number {
  const { values, width, height } = grid;
  const u = Math.min(Math.max((x / terrain.width_m + 0.5) * (width - 1), 0), width - 1.0001);
  const v = Math.min(Math.max((0.5 - y / terrain.height_m) * (height - 1), 0), height - 1.0001);
  const x0 = Math.floor(u), y0 = Math.floor(v);
  const fx = u - x0, fy = v - y0;
  const i = y0 * width + x0;
  const top = values[i] * (1 - fx) + values[i + 1] * fx;
  const bottom = values[i + width] * (1 - fx) + values[i + width + 1] * fx;
  return top * (1 - fy) + bottom * fy;
}
