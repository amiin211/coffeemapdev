// Types + helpers for the GeoAI Crop Monitoring dashboard, built on
// public/data/crop/{fields.geojson,timeseries.json} (see
// scripts/build-crop-data.py).

export type CropIndex = 'ndvi' | 'evi';

export interface SeasonClass {
  season: string; // e.g. "2024-25" (Sep–Aug)
  crop: string;
  confidence: number;
}

export interface FieldProperties {
  id: string;
  name: string;
  type: 'pivot' | 'block';
  area_ha: number;
  crop: string; // latest season
  confidence: number | null;
  anomaly: boolean; // anomalous at its latest observation
  seasons: SeasonClass[];
}

export interface FieldsCollection {
  type: 'FeatureCollection';
  features: { type: 'Feature'; geometry: GeoJSON.Polygon; properties: FieldProperties }[];
}

export interface FieldSeries {
  ndvi: (number | null)[];
  evi: (number | null)[];
  anomalies: number[]; // indices into dates
}

export interface CropTimeSeries {
  generated: string;
  aoi: GeoJSON.Polygon;
  dates: string[];
  items: string[]; // Sentinel-2 L2A item id per date
  overall: { ndvi: (number | null)[]; evi: (number | null)[] };
  fields: Record<string, FieldSeries>;
}

export const CROP_TYPES = [
  'Winter cereal',
  'Summer crop',
  'Double crop',
  'Alfalfa / perennial forage',
  'Orchard',
  'Fallow',
  'Unclassified',
];

// Fixed order, one hue per crop — color follows the crop, never its rank.
export const CROP_COLORS: Record<string, string> = {
  'Winter cereal': '#E0A526',
  'Summer crop': '#2E7D32',
  'Double crop': '#7B1FA2',
  'Alfalfa / perennial forage': '#00897B',
  Orchard: '#5D4037',
  Fallow: '#9E9E9E',
  Unclassified: '#BDBDBD',
};

export const INDEX_LABEL: Record<CropIndex, string> = { ndvi: 'NDVI', evi: 'EVI' };

// Planetary Computer data API tiles for one Sentinel-2 L2A item. DNs carry
// the +1000 offset of processing baseline 04.00+, folded into the formulas:
//   NDVI = (NIR - Red) / (NIR + Red)
//   EVI  = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)   (reflectance)
const PC_TILES = 'https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png';
const EXPRESSIONS: Record<CropIndex, string> = {
  ndvi: '(B08-B04)/(B08+B04-2000)',
  evi: '2.5*(B08-B04)/(B08+6*B04-7.5*B02+10500)',
};

export function indexTileUrl(item: string, index: CropIndex): string {
  const params = new URLSearchParams({
    collection: 'sentinel-2-l2a',
    item,
    expression: EXPRESSIONS[index],
    asset_as_band: 'true',
    rescale: '0,0.8',
    colormap_name: 'rdylgn',
    nodata: '0',
  });
  return `${PC_TILES}?${params}`;
}

export function trueColorTileUrl(item: string): string {
  const params = new URLSearchParams({ collection: 'sentinel-2-l2a', item, assets: 'visual', asset_bidx: 'visual|1,2,3', nodata: '0' });
  return `${PC_TILES}?${params}`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Latest non-null value at or before `index`, and how many days old it is,
// so a cloudy field on the selected date still shows its last clear reading.
export function valueAt(values: (number | null)[], dates: string[], index: number, maxAgeDays = 20) {
  for (let i = index; i >= 0; i--) {
    const v = values[i];
    if (v === null) continue;
    const age = (Date.parse(dates[index]) - Date.parse(dates[i])) / 86_400_000;
    return age <= maxAgeDays ? { value: v, date: dates[i], index: i } : null;
  }
  return null;
}

// Whether a field's latest clear NDVI reading at or before `index` was
// flagged — the same rule for the map outline, alerts and field panel.
export function anomalyAt(s: FieldSeries, dates: string[], index: number): boolean {
  const reading = valueAt(s.ndvi, dates, index);
  return !!reading && s.anomalies.includes(reading.index);
}

export function formatMonthYear(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Crop class of the agricultural season (Sep–Aug) containing `iso`, or the
// latest classified season before it (a season just begun isn't classified yet).
export function cropOn(field: FieldProperties, iso: string): SeasonClass | null {
  const y = Number(iso.slice(0, 4));
  const start = Number(iso.slice(5, 7)) >= 9 ? y : y - 1;
  const season = `${start}-${String(start + 1).slice(2)}`;
  const earlier = field.seasons.filter((s) => s.season <= season);
  return earlier[earlier.length - 1] ?? null;
}
