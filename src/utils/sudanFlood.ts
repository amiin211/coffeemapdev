// Data types, loaders and styling for the Sudan Flood Dashboard (OCHA Sudan
// Flash Update No. 04, 5 September 2024, and FMoH cholera figures).

export interface FloodSummary {
  source: string;
  author: string;
  date: string;
  total_affected: number;
  families_affected: number;
  states_affected: number;
  localities_affected: number;
  deaths: number;
  injured: number;
  homes_destroyed: number;
  homes_damaged: number;
  displaced: number;
  cholera_cases: number;
  cholera_deaths: number;
  cholera_cfr: number;
  notes: string;
}

export interface StateData {
  name: string;
  arabic_name: string;
  pcode: string;
  affected: number | null;
  displaced: number | null;
  deaths: number | null;
  injured: number | null;
  homes_destroyed: number | null;
  homes_damaged: number | null;
  lat: number;
  lon: number;
  has_data: boolean;
}

export interface LocalityData {
  name: string;
  state: string;
  state_pcode: string;
  adm2_pcode: string;
  adm2_name: string;
  lat: number;
  lon: number;
  affected: number | null;
  notes?: string;
}

export interface CholeraState {
  name: string;
  pcode: string;
  cases: number;
  deaths: number | null;
  lat: number;
  lon: number;
}

export interface CholeraData {
  source: string;
  period: string;
  total_cases: number;
  total_deaths: number;
  case_fatality_rate: number;
  states: CholeraState[];
}

export interface FloodData {
  summary: FloodSummary;
  states: StateData[];
  localities: LocalityData[];
  cholera: CholeraData;
  admin1: GeoJSON.FeatureCollection;
  admin2: GeoJSON.FeatureCollection;
}

export async function loadFloodData(): Promise<FloodData> {
  const get = (path: string) =>
    fetch(path).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    });
  const [summary, states, localities, cholera, admin1, admin2] = await Promise.all([
    get('/data/flood_summary.json'),
    get('/data/states_flood_data.json'),
    get('/data/localities.json'),
    get('/data/cholera_data.json'),
    get('/data/sdn_admin1.geojson'),
    get('/data/sdn_admin2.geojson'),
  ]);
  return { summary, states: states.states, localities: localities.localities, cholera, admin1, admin2 };
}

// ----------------------------------------------------------------- styling --
export const floodBrown = { light: '#F7F1EC', DEFAULT: '#8D4220', dark: '#5D2E10' };

// People affected (blue) and cholera cases (purple), low -> high.
export const FLOOD_CLASSES = [
  { min: 1, label: '< 15,000', color: '#9ecae1' },
  { min: 15000, label: '15,000 – 50,000', color: '#4292c6' },
  { min: 50000, label: '50,000 – 100,000', color: '#2171b5' },
  { min: 100000, label: '> 100,000', color: '#08306b' },
];
export const CHOLERA_CLASSES = [
  { min: 1, label: '< 100', color: '#dadaeb' },
  { min: 100, label: '100 – 500', color: '#9e9ac8' },
  { min: 500, label: '500 – 1,000', color: '#6a51a3' },
  { min: 1000, label: '> 1,000', color: '#3f007d' },
];
export const NO_DATA_COLOR = '#d9d9d9';
export const CHOLERA_COLOR = '#6a1b9a';
export const DESTROYED_COLOR = '#b71c1c';
export const DAMAGED_COLOR = '#ef8a3c';

export const fmt = (v: number | null | undefined) => (v == null ? '–' : v.toLocaleString());

// Bounding box of a GeoJSON geometry (for zooming to a state).
export function geometryBounds(geometry: GeoJSON.Geometry): [[number, number], [number, number]] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as number[];
      w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y);
    } else if (Array.isArray(c)) c.forEach(visit);
  };
  if ('coordinates' in geometry) visit(geometry.coordinates);
  return [[w, s], [e, n]];
}

export function collectionBounds(fc: GeoJSON.FeatureCollection) {
  const boxes = fc.features.filter((f) => f.geometry).map((f) => geometryBounds(f.geometry));
  return [
    [Math.min(...boxes.map((b) => b[0][0])), Math.min(...boxes.map((b) => b[0][1]))],
    [Math.max(...boxes.map((b) => b[1][0])), Math.max(...boxes.map((b) => b[1][1]))],
  ] as [[number, number], [number, number]];
}
