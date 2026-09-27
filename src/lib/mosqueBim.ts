// Types and helpers for the mosque's illustrative BIM dataset
// (public/data/3d/bim.json, made by scripts/build-bim-data.mjs).

export const BIM_URL = '/data/3d/bim.json';

export interface BimType {
  id: string;
  category: string;
  ifc: string;
  uniformat: string;
  name: string;
  nameAr: string;
  construction: string;
  material: string;
  standards: string[];
  fireResistance: string | null;
  uValue: number | null;
  shgc?: number;
  unit: 'm2' | 'm' | 'nr';
  costSAR: [number, number];
  lifeYears: number;
  warrantyYears: number;
  maintenance: string;
}

export interface BimElement {
  elementId: number | null;
  revitName: string;
  type: string;
  assetTag: string;
  level: string;
  zone: string;
  quantities: Record<string, number>;
  quantity: { value: number; unit: 'm2' | 'm' | 'nr' };
  costSAR: [number, number];
  installDate: string;
  installDateHijri: string;
  condition: string;
  status: string;
}

export interface BimData {
  meta: {
    title: string;
    disclaimer: string;
    currency: string;
    costBasis: string;
    site: Record<string, string | number | string[]>;
    totalCostSAR: [number, number];
  };
  types: Record<string, BimType>;
  summary: Record<string, { count: number; quantity: number; unit: string; costSAR: [number, number] }>;
  elements: Record<string, BimElement>; // keyed by the model's node name
}

export interface BimSelection {
  key: string;
  element: BimElement;
  type: BimType;
}

// Colour per BIM category for the "colour by category" view: white, green and
// brown for the big surfaces (walls, domes, roofs, floors), muted earthy
// tones for the smaller categories. No reds.
export const CATEGORY_COLORS: Record<string, string> = {
  Walls: '#f4f1ea', // white
  Domes: '#2e7d32', // green
  Roofs: '#8b5a2b', // brown
  Floors: '#c9ad85', // light brown
  'Wall Sweeps': '#e3d3b0', // sand
  Windows: '#6f9c7a', // sage green
  Doors: '#5b3a1e', // dark brown
  Stairs: '#a08878', // taupe
  Railings: '#9e9e9e', // grey
  'Site Structures': '#d6e8c3', // pale green
  Lighting: '#4e342e', // espresso
  Landscape: '#7cb342', // leaf green
};
export const UNCATEGORISED_COLOR = '#bab0ac';

export type ColorMode = 'realistic' | 'category';

export const UNIT_LABEL = { m2: 'm²', m: 'm', nr: 'nr' } as const;

export const formatSAR = ([lo, hi]: [number, number]) => `SAR ${lo.toLocaleString()} – ${hi.toLocaleString()}`;

const QUANTITY_LABELS: Record<string, string> = {
  netArea_m2: 'Net area (m²)',
  area_m2: 'Area (m²)',
  surfaceArea_m2: 'Surface area (m²)',
  planArea_m2: 'Plan area (m²)',
  glazedArea_m2: 'Glazed area (m²)',
  coveredArea_m2: 'Covered area (m²)',
  length_m: 'Length (m)',
  height_m: 'Height (m)',
  width_m: 'Width (m)',
  diameter_m: 'Diameter (m)',
  elevation_m: 'Elevation (m)',
  count: 'Count',
};
export const quantityLabel = (key: string) => QUANTITY_LABELS[key] ?? key;

// Element schedule as CSV (UTF-8 with BOM so Excel shows the Arabic names).
export function scheduleCsv(data: BimData): string {
  const header = [
    'Asset tag', 'Revit element ID', 'Category', 'IFC class', 'UniFormat', 'Type', 'Type (Arabic)', 'Level', 'Zone',
    'Quantity', 'Unit', 'Cost low (SAR)', 'Cost high (SAR)', 'Construction', 'Fire resistance', 'U-value (W/m²K)',
    'Standards', 'Install date', 'Install date (Hijri)', 'Warranty (years)', 'Design life (years)', 'Maintenance',
    'Condition', 'Status',
  ];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = Object.values(data.elements)
    .sort((a, b) => a.assetTag.localeCompare(b.assetTag))
    .map((e) => {
      const t = data.types[e.type];
      return [
        e.assetTag, e.elementId, t.category, t.ifc, t.uniformat, t.name, t.nameAr, e.level, e.zone,
        e.quantity.value, UNIT_LABEL[e.quantity.unit], e.costSAR[0], e.costSAR[1], t.construction, t.fireResistance,
        t.uValue, t.standards.join('; '), e.installDate, e.installDateHijri, t.warrantyYears, t.lifeYears, t.maintenance,
        e.condition, e.status,
      ];
    });
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}
