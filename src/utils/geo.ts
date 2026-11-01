// Shared GeoJSON types and helpers for the MapLibre dashboards.

export type LngLatBounds = [[number, number], [number, number]];

// COD administrative boundaries (public/data/sdn_admin{1,2}.geojson); only the
// properties the dashboards read are typed.
export interface Admin1Properties {
  adm1_name: string;
  adm1_pcode: string;
  center_lat: number;
  center_lon: number;
}

export interface Admin2Properties extends Admin1Properties {
  adm2_name: string;
  adm2_pcode: string;
}

export type Admin1Collection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Admin1Properties>;
export type Admin2Collection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Admin2Properties>;

// Bounding box of a GeoJSON geometry (for zooming to a feature).
export function geometryBounds(geometry: GeoJSON.Geometry): LngLatBounds {
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

export function featuresBounds(features: GeoJSON.Feature[]): LngLatBounds {
  const boxes = features.filter((f) => f.geometry).map((f) => geometryBounds(f.geometry));
  return [
    [Math.min(...boxes.map((b) => b[0][0])), Math.min(...boxes.map((b) => b[0][1]))],
    [Math.max(...boxes.map((b) => b[1][0])), Math.max(...boxes.map((b) => b[1][1]))],
  ];
}

export const collectionBounds = (fc: GeoJSON.FeatureCollection) => featuresBounds(fc.features);
