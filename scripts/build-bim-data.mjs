// Builds public/data/3d/bim.json: an ILLUSTRATIVE BIM property dataset for the
// Aseer mosque model, written for the Saudi market.
//
// The GLB came out of Revit via Blender and kept only element names
// ("<Family> <Type> [<ElementId>]"). This script reads those names and the
// geometry, and attaches:
//   - type-level properties (construction, Saudi codes / SASO, performance,
//     indicative SAR costs, warranty, maintenance) from TYPES below;
//   - element-level data measured from the geometry (area, length, height,
//     level) plus asset tags and a plausible install timeline.
// None of it is surveyed or as-built data.
//
// Usage: node scripts/build-bim-data.mjs [public/data/3d/mosque.glb] [public/data/3d/bim.json]
import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const [input = 'public/data/3d/mosque.glb', output = 'public/data/3d/bim.json'] = process.argv.slice(2);

// ------------------------------------------------------------------ types --
// `match` is tested against the original Revit-derived node name. Units:
// m2 (area), m (length), nr (count). Costs are indicative 2025 KSA supply +
// install ranges in SAR per unit, for illustration only.
const TYPES = [
  {
    id: 'WL-PLINTH', match: /^Basic Wall 001 Chips Wall/, tag: 'WL',
    category: 'Walls', ifc: 'IfcWall', uniformat: 'B2010 Exterior Walls',
    name: 'Plinth / boundary wall, stone-chip render', nameAr: 'جدار قاعدة / سور بتشطيب حجر مجروش',
    construction: '200 mm hollow concrete block on RC strip footing, 20 mm cement plaster, stone-chip (granolite) textured render',
    material: 'Concrete masonry units, cement plaster, stone-chip render',
    standards: ['SBC 201', 'SBC 304 (concrete)', 'SASO concrete masonry unit standard'],
    fireResistance: '2 h (design assumption)', uValue: null,
    unit: 'm2', costSAR: [280, 420], lifeYears: 60, warrantyYears: 10,
    maintenance: 'Annual visual inspection; clean render and repair cracks every 5 years',
  },
  {
    id: 'WL-TILE', match: /^Basic Wall 002 Tiles Wall/, tag: 'WL',
    category: 'Walls', ifc: 'IfcWall', uniformat: 'B2010 Exterior Walls',
    name: 'External wall, porcelain tile cladding', nameAr: 'جدار خارجي مكسو ببلاط بورسلان',
    construction: '200 mm insulated hollow concrete block, 50 mm XPS insulation, cement plaster, 10 mm porcelain tiles on adhesive with stainless steel safety clips',
    material: 'Insulated concrete block, XPS, porcelain tiles',
    standards: ['SBC 201', 'SBC 601 (energy)', 'SBC 801 (fire)', 'SASO ceramic tile standard'],
    fireResistance: '2 h (design assumption); cladding non-combustible', uValue: 0.45,
    unit: 'm2', costSAR: [320, 480], lifeYears: 60, warrantyYears: 10,
    maintenance: 'Annual inspection of tile adhesion and joints; wash facade every 6 months (dust)',
  },
  {
    id: 'WL-STONE', match: /^Basic Wall 003 Brown Tile Wall/, tag: 'WL',
    category: 'Walls', ifc: 'IfcWall', uniformat: 'B2010 Exterior Walls',
    name: 'External wall, brown natural stone / tile cladding', nameAr: 'جدار خارجي مكسو بحجر طبيعي بني',
    construction: '200 mm insulated hollow concrete block, 50 mm XPS insulation, 30 mm brown natural stone (or stone-look porcelain) on stainless steel anchors, Asiri-style finish',
    material: 'Insulated concrete block, XPS, natural stone cladding',
    standards: ['SBC 201', 'SBC 601 (energy)', 'SBC 801 (fire)'],
    fireResistance: '2 h (design assumption); cladding non-combustible', uValue: 0.42,
    unit: 'm2', costSAR: [380, 560], lifeYears: 60, warrantyYears: 10,
    maintenance: 'Annual anchor and joint inspection; reseal joints every 8 years',
  },
  {
    id: 'CR-GRC', match: /^Wall Sweep/, tag: 'CR',
    category: 'Wall Sweeps', ifc: 'IfcCovering', uniformat: 'B2010 Exterior Walls',
    name: 'GRC cornice band', nameAr: 'كورنيش GRC زخرفي',
    construction: 'Glass-fibre reinforced concrete (GRC) cornice, stainless steel fixings, factory-painted',
    material: 'GRC', standards: ['SBC 201', 'SBC 801 (fire)'],
    fireResistance: 'Non-combustible', uValue: null,
    unit: 'm', costSAR: [180, 320], lifeYears: 40, warrantyYears: 5,
    maintenance: 'Annual inspection of fixings; repaint every 7 years',
  },
  {
    id: 'GZ-FIXED', match: /^M_Fixed 0406 x 1220mm/, tag: 'GZ',
    category: 'Windows', ifc: 'IfcWindow', uniformat: 'B2020 Exterior Windows',
    name: 'Fixed window 406 x 1220 mm, aluminium, double glazed', nameAr: 'نافذة ثابتة ألمنيوم زجاج مزدوج ٤٠٦×١٢٢٠ مم',
    construction: 'Thermally broken aluminium frame, 6 mm low-e + 12 mm air + 6 mm clear double glazing',
    material: 'Aluminium, low-e double glazing', standards: ['SBC 601 (energy)', 'SASO flat glass standard'],
    fireResistance: null, uValue: 2.8, shgc: 0.25,
    unit: 'nr', costSAR: [700, 1100], lifeYears: 30, warrantyYears: 10,
    maintenance: 'Clean glass every 3 months (dust); check seals annually',
  },
  {
    id: 'WN-ARCH', match: /^Masjid Window/, tag: 'WN',
    category: 'Windows', ifc: 'IfcWindow', uniformat: 'B2020 Exterior Windows',
    name: 'Arched mosque window, aluminium with decorative grille', nameAr: 'نافذة مسجد مقوسة ألمنيوم مع مشربية زخرفية',
    construction: 'Arched thermally broken aluminium window, low-e double glazing, external decorative aluminium grille (mashrabiya pattern)',
    material: 'Aluminium, low-e double glazing', standards: ['SBC 601 (energy)', 'SASO flat glass standard'],
    fireResistance: null, uValue: 2.8, shgc: 0.25,
    unit: 'nr', costSAR: [3500, 6000], lifeYears: 30, warrantyYears: 10,
    maintenance: 'Clean glass and grille every 3 months; check seals and drainage annually',
  },
  {
    id: 'DR-SINGLE', match: /^M_Door-Interior-Single-Flush/, tag: 'DR',
    category: 'Doors', ifc: 'IfcDoor', uniformat: 'C1020 Interior Doors',
    name: 'Single flush door, solid-core wood', nameAr: 'باب داخلي مفرد خشب مصمت',
    construction: 'Solid-core hardwood-veneer door leaf, hardwood frame, stainless steel ironmongery',
    material: 'Timber', standards: ['SBC 201', 'SBC 801 (fire)'],
    fireResistance: 'Non-rated (FD30 where on escape route)', uValue: null,
    unit: 'nr', costSAR: [2200, 3500], lifeYears: 25, warrantyYears: 2,
    maintenance: 'Adjust and lubricate hardware every 6 months',
  },
  {
    id: 'DR-SLIDING', match: /^M_Door-Interior-Double-Sliding/, tag: 'DR',
    category: 'Doors', ifc: 'IfcDoor', uniformat: 'C1020 Interior Doors',
    name: 'Double sliding door, 2-panel wood', nameAr: 'باب داخلي منزلق مزدوج خشب',
    construction: 'Two solid-core wood panels on concealed top-hung sliding track',
    material: 'Timber, steel track', standards: ['SBC 201'],
    fireResistance: 'Non-rated', uValue: null,
    unit: 'nr', costSAR: [5500, 8500], lifeYears: 25, warrantyYears: 2,
    maintenance: 'Clean and adjust track every 6 months',
  },
  {
    id: 'RF-FLAT', match: /^Basic Roof Generic - 125mm/, tag: 'RF',
    category: 'Roofs', ifc: 'IfcRoof', uniformat: 'B3010 Roof Coverings',
    name: 'Flat roof, 125 mm RC slab, inverted insulated system', nameAr: 'سقف مسطح خرساني ١٢٥ مم مع عزل مقلوب',
    construction: '125 mm RC slab, screed to falls, bituminous waterproofing membrane, 75 mm XPS insulation, geotextile, 50 mm concrete tiles',
    material: 'Reinforced concrete, bitumen membrane, XPS', standards: ['SBC 304 (concrete)', 'SBC 601 (energy)'],
    fireResistance: '2 h (design assumption)', uValue: 0.3,
    unit: 'm2', costSAR: [520, 780], lifeYears: 25, warrantyYears: 10,
    maintenance: 'Inspect membrane and clear roof drains before the Aseer rainy season (annual)',
  },
  {
    id: 'DM-MAIN', match: /^Masjid Dome Masjid Dome/, tag: 'DM',
    category: 'Domes', ifc: 'IfcRoof', uniformat: 'B1020 Roof Construction',
    name: 'Main prayer hall dome', nameAr: 'القبة الرئيسية لقاعة الصلاة',
    construction: 'RC dome shell on ring beam, insulation, green glazed ceramic tile finish outside, decorative GRC / plaster inside',
    material: 'Reinforced concrete, glazed ceramic tiles, GRC', standards: ['SBC 301 (loads)', 'SBC 304 (concrete)'],
    fireResistance: '2 h (design assumption)', uValue: 0.35,
    unit: 'm2', costSAR: [1400, 2200], lifeYears: 60, warrantyYears: 10,
    maintenance: 'Annual inspection of tiles and waterproofing; check crescent finial fixings',
  },
  {
    id: 'DM-FINIAL', match: /^Masjid Dome 02/, tag: 'DM',
    category: 'Domes', ifc: 'IfcBuildingElementProxy', uniformat: 'B1020 Roof Construction',
    name: 'Minaret cap with crescent finial', nameAr: 'قمة المئذنة مع الهلال',
    construction: 'GRC minaret cap with gold-finish stainless steel crescent (hilal) finial',
    material: 'GRC, stainless steel', standards: ['SBC 301 (wind loads)'],
    fireResistance: null, uValue: null,
    unit: 'nr', costSAR: [4500, 9000], lifeYears: 40, warrantyYears: 5,
    maintenance: 'Annual fixings inspection; lightning protection test',
  },
  {
    id: 'FL-SITE', match: /^Floor New Floor/, tag: 'FL',
    category: 'Floors', ifc: 'IfcSlab', uniformat: 'G2020 Parking Lots / G2030 Pedestrian Paving',
    name: 'Site hardscape: asphalt driveways and plaza paving', nameAr: 'أرضيات الموقع: أسفلت وممرات مرصوفة',
    construction: 'Asphalt wearing course on base course for driveways and parking; interlocking concrete pavers / stone paving on the plaza',
    material: 'Asphalt, concrete pavers', standards: ['MOMRAH municipal road and paving specifications'],
    fireResistance: null, uValue: null,
    unit: 'm2', costSAR: [110, 190], lifeYears: 20, warrantyYears: 2,
    maintenance: 'Annual inspection; reseal asphalt cracks and relevel pavers as needed',
  },
  {
    id: 'RL-SS', match: /^Railing Building Railing/, tag: 'RL',
    category: 'Railings', ifc: 'IfcRailing', uniformat: 'G2040 Site Development',
    name: 'Stainless steel ramp / stair railing', nameAr: 'درابزين ستانلس ستيل للدرج والمنحدر',
    construction: 'Grade 316 stainless steel posts and balusters, satin finish, anchored to concrete',
    material: 'Stainless steel 316', standards: ['SBC 201 (guards, handrails)', 'SBC 1001 (accessibility)'],
    fireResistance: null, uValue: null,
    unit: 'm', costSAR: [650, 1000], lifeYears: 30, warrantyYears: 5,
    maintenance: 'Clean every 3 months; check anchors annually',
  },
  {
    id: 'RL-TOP', match: /^Top Rail Type Circular - 40mm/, tag: 'RL',
    category: 'Railings', ifc: 'IfcRailing', uniformat: 'G2040 Site Development',
    name: 'Handrail, 40 mm circular stainless steel', nameAr: 'مقبض درابزين دائري ستانلس ستيل ٤٠ مم',
    construction: '40 mm diameter grade 316 stainless steel tube handrail',
    material: 'Stainless steel 316', standards: ['SBC 201 (handrails)', 'SBC 1001 (accessibility)'],
    fireResistance: null, uValue: null,
    unit: 'm', costSAR: [250, 400], lifeYears: 30, warrantyYears: 5,
    maintenance: 'Clean every 3 months',
  },
  {
    id: 'ST-EXT', match: /^P1- Stairs Step|^P3-Steps|^P1-Sloped Step/, tag: 'ST',
    category: 'Stairs', ifc: 'IfcStair', uniformat: 'C2010 Stair Construction',
    name: 'External entrance steps, granite treads', nameAr: 'درج خارجي للمداخل بدرجات جرانيت',
    construction: 'RC stepped slab with 30 mm flamed (anti-slip) granite treads and risers',
    material: 'Reinforced concrete, granite', standards: ['SBC 201 (means of egress)', 'SBC 1001 (accessibility)'],
    fireResistance: null, uValue: null,
    unit: 'm2', costSAR: [450, 750], lifeYears: 50, warrantyYears: 2,
    maintenance: 'Annual inspection of treads and nosings',
  },
  {
    id: 'PS-TENSILE', match: /^Parking Shade/, tag: 'PS',
    category: 'Site Structures', ifc: 'IfcBuildingElementProxy', uniformat: 'G2020 Parking Lots',
    name: 'Car park shade, 2 bays, tensile membrane', nameAr: 'مظلة مواقف سيارات لموقفين بقماش مشدود',
    construction: 'Galvanized, powder-coated steel cantilever frame with UV-stabilised PVDF-coated PVC membrane',
    material: 'Galvanized steel, PVDF-coated PVC membrane', standards: ['SBC 301 (wind loads)', 'SASO steel standard'],
    fireResistance: null, uValue: null,
    unit: 'nr', costSAR: [5500, 9000], lifeYears: 15, warrantyYears: 10,
    maintenance: 'Annual membrane tension and fixings check; wash membrane every 6 months',
  },
  {
    id: 'LP-6M', match: /^Electric Poll Family 2A/, tag: 'LP',
    category: 'Lighting', ifc: 'IfcLightFixture', uniformat: 'G4020 Site Lighting',
    name: 'Area lighting pole 6 m, LED', nameAr: 'عمود إنارة ٦ م مع كشاف LED',
    construction: 'Hot-dip galvanized steel pole on concrete base, LED luminaire with photocell',
    material: 'Galvanized steel, LED luminaire', standards: ['SASO IEC 60598 (luminaires)', 'Saudi Electricity Code'],
    fireResistance: null, uValue: null,
    unit: 'nr', costSAR: [2800, 4500], lifeYears: 25, warrantyYears: 5,
    maintenance: 'Quarterly lamp and photocell check; galvanizing inspection every 5 years',
  },
  {
    id: 'LP-8M', match: /^Electric Poll Family 1|^Electric Poll Family Round/, tag: 'LP',
    category: 'Lighting', ifc: 'IfcLightFixture', uniformat: 'G4020 Site Lighting',
    name: 'Street lighting pole 8 m, LED', nameAr: 'عمود إنارة شارع ٨ م مع كشاف LED',
    construction: 'Hot-dip galvanized octagonal steel pole on concrete base, single-arm LED street luminaire',
    material: 'Galvanized steel, LED luminaire', standards: ['SASO IEC 60598 (luminaires)', 'Saudi Electricity Code'],
    fireResistance: null, uValue: null,
    unit: 'nr', costSAR: [3800, 6000], lifeYears: 25, warrantyYears: 5,
    maintenance: 'Quarterly lamp and photocell check; galvanizing inspection every 5 years',
  },
  {
    id: 'LP-10M', match: /^Electric Poll 1 /, tag: 'LP',
    category: 'Lighting', ifc: 'IfcLightFixture', uniformat: 'G4020 Site Lighting',
    name: 'Street lighting pole 10 m, double-arm LED', nameAr: 'عمود إنارة شارع ١٠ م بذراعين LED',
    construction: 'Hot-dip galvanized steel pole on concrete base, double-arm LED street luminaires',
    material: 'Galvanized steel, LED luminaires', standards: ['SASO IEC 60598 (luminaires)', 'Saudi Electricity Code'],
    fireResistance: null, uValue: null,
    unit: 'nr', costSAR: [5000, 8000], lifeYears: 25, warrantyYears: 5,
    maintenance: 'Quarterly lamp and photocell check; galvanizing inspection every 5 years',
  },
  {
    id: 'PL-TIER', match: /^Generic Models/, tag: 'PL',
    category: 'Landscape', ifc: 'IfcBuildingElementProxy', uniformat: 'G2050 Landscaping',
    name: 'Tiered landscape planter (assumed use)', nameAr: 'حوض زراعة متدرج (استخدام مفترض)',
    construction: 'RC tiered planter with stone coping, drip irrigation, native drought-tolerant planting',
    material: 'Reinforced concrete, stone coping', standards: ['MOMRAH landscape guidelines'],
    fireResistance: null, uValue: null,
    unit: 'm2', costSAR: [350, 600], lifeYears: 20, warrantyYears: 1,
    maintenance: 'Weekly irrigation check; seasonal planting maintenance',
  },
];

// Construction programme used to spread install dates (element order within
// each window is deterministic).
const PROGRAMME = {
  Walls: ['2023-04-01', '2023-09-30'],
  'Wall Sweeps': ['2023-09-01', '2023-11-15'],
  Roofs: ['2023-07-01', '2023-10-15'],
  Domes: ['2023-10-01', '2023-12-31'],
  Windows: ['2023-11-01', '2024-01-31'],
  Doors: ['2024-01-01', '2024-02-15'],
  Stairs: ['2023-12-01', '2024-01-31'],
  Railings: ['2024-02-01', '2024-03-15'],
  Floors: ['2024-01-15', '2024-03-31'],
  'Site Structures': ['2024-02-15', '2024-04-15'],
  Lighting: ['2024-03-01', '2024-04-30'],
  Landscape: ['2024-03-15', '2024-05-15'],
};

// ---------------------------------------------------------------- helpers --
const hash = (s) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
};
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: '2-digit', day: '2-digit' });
function toHijri(date) {
  const parts = Object.fromEntries(hijri.formatToParts(new Date(`${date}T12:00:00Z`)).map((p) => [p.type, p.value]));
  return `${parts.year.replace(/\D/g, '')}-${parts.month}-${parts.day}`;
}
function dateIn([from, to], t) {
  const a = Date.parse(from), b = Date.parse(to);
  return new Date(a + (b - a) * t).toISOString().slice(0, 10);
}

// Surface area (m²) of all meshes under `obj`, in world space: total, and
// the part facing up (the top of a roof or floor slab).
function surfaceArea(obj) {
  let area = 0, up = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const pos = m.geometry.attributes.position;
    const index = m.geometry.index;
    const count = index ? index.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const [i0, i1, i2] = index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2];
      a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld);
      const n = b.sub(a).cross(c.sub(a));
      const triangle = n.length() / 2;
      area += triangle;
      if (n.normalize().y > 0.5) up += triangle;
    }
  });
  return { area, up };
}

const fmtLevel = (y) => `${y >= 0 ? '+' : ''}${y.toFixed(2)}`;

// ------------------------------------------------------------------- main --
const buf = fs.readFileSync(input);
const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
const root = gltf.scene;
root.getObjectByName('Cube')?.removeFromParent();
// Same centring as the viewer: base on y = 0, centred horizontally.
const siteBox = new THREE.Box3().setFromObject(root);
const centre = siteBox.getCenter(new THREE.Vector3());
root.position.set(-centre.x, -siteBox.min.y, -centre.z);
root.updateMatrixWorld(true);

// Levels and zones from the model itself: every roof slab defines a level at
// its elevation; the largest roof covers the prayer hall and the smallest,
// highest ones cap the two minarets.
const roofs = root.children
  .filter((o) => /^Basic Roof/.test(o.userData.name ?? ''))
  .map((o) => ({ box: new THREE.Box3().setFromObject(o), area: surfaceArea(o).up }));
const hallRoof = roofs.reduce((a, b) => (b.area > a.area ? b : a));
const topY = Math.max(...roofs.map((r) => r.box.min.y));
const minaretRoofs = roofs.filter((r) => r.box.min.y === topY);
const roofLevels = [...new Set(roofs.map((r) => Math.round(r.box.min.y * 20) / 20))].sort((a, b) => a - b);

const levelFor = (b) => {
  // An element belongs to the highest roof level at or just below its base.
  const below = roofLevels.filter((l) => l <= b.min.y + 0.3);
  if (!below.length) return 'Ground Floor (±0.00)';
  const y = Math.max(...below);
  return y === Math.round(topY * 20) / 20 ? `Minaret Top (${fmtLevel(y)})` : `Roof (${fmtLevel(y)})`;
};
const inside = (b, r, pad) => {
  const c = b.getCenter(new THREE.Vector3());
  return c.x > r.box.min.x - pad && c.x < r.box.max.x + pad && c.z > r.box.min.z - pad && c.z < r.box.max.z + pad;
};
const zoneFor = (b) => {
  if (minaretRoofs.some((r) => inside(b, r, 1.5))) return 'Minaret';
  if (inside(b, hallRoof, 0.5)) return 'Prayer Hall';
  return 'Annex (ablution / services, assumed)';
};

const elements = {};
const counters = {};
const unmatched = [];
const box = new THREE.Box3(), size = new THREE.Vector3();

for (const obj of root.children) {
  const original = obj.userData.name ?? obj.name;
  const type = TYPES.find((t) => t.match.test(original));
  if (!type) { unmatched.push(original); continue; }

  box.setFromObject(obj).getSize(size);
  const idMatch = original.match(/\[(\d+)\]$/);
  const horizontal = Math.max(size.x, size.z);
  const { area, up } = surfaceArea(obj);

  // Quantity in the type's unit, measured from the geometry.
  const q = {};
  if (type.unit === 'nr') q.count = 1;
  if (type.category === 'Walls') {
    q.netArea_m2 = round(area / 2); // both faces of a thin wall ≈ 2 × face area
    q.height_m = round(size.y, 2);
    q.length_m = round(q.netArea_m2 / Math.max(size.y, 0.01), 2);
  } else if (type.category === 'Roofs' || type.category === 'Floors') {
    q.area_m2 = round(up);
    q.elevation_m = round(box.min.y, 2);
  } else if (type.id === 'DM-MAIN') {
    q.surfaceArea_m2 = round(area / 2);
    q.diameter_m = round(horizontal, 2);
    q.height_m = round(size.y, 2);
  } else if (type.unit === 'm') {
    // Railings run up slopes (true length along the slope); cornice pieces
    // can run horizontally or vertically (longest dimension).
    q.length_m = round(type.category === 'Railings' ? Math.hypot(horizontal, size.y) : Math.max(size.x, size.y, size.z), 2);
  } else if (type.unit === 'm2') {
    q.planArea_m2 = round(size.x * size.z);
  } else {
    q.width_m = round(horizontal, 2);
    q.height_m = round(size.y, 2);
  }
  if (type.id === 'GZ-FIXED') q.glazedArea_m2 = 0.5;
  if (type.id === 'PS-TENSILE') q.coveredArea_m2 = round(size.x * size.z);

  const external = ['Floors', 'Site Structures', 'Lighting', 'Landscape', 'Railings', 'Stairs'].includes(type.category) || type.id === 'WL-PLINTH';
  const quantity = type.unit === 'nr' ? 1 : type.unit === 'm' ? q.length_m : (q.netArea_m2 ?? q.area_m2 ?? q.surfaceArea_m2 ?? q.planArea_m2);
  const n = (counters[type.tag] = (counters[type.tag] ?? 0) + 1);
  const t = hash(obj.name);
  const installed = dateIn(PROGRAMME[type.category], t);

  elements[obj.name] = {
    elementId: idMatch ? Number(idMatch[1]) : null,
    revitName: original,
    type: type.id,
    assetTag: `ASR-MSQ-${type.tag}-${String(n).padStart(4, '0')}`,
    level: external ? 'Site (±0.00)' : levelFor(box),
    zone: external ? 'External Works' : zoneFor(box),
    quantities: q,
    quantity: { value: quantity, unit: type.unit },
    costSAR: type.costSAR.map((c) => Math.round((c * quantity) / 10) * 10),
    installDate: installed,
    installDateHijri: toHijri(installed),
    condition: t < 0.9 ? 'Good' : 'Fair',
    status: 'Existing',
  };
}

// ---------------------------------------------------------------- summary --
const summary = {};
for (const e of Object.values(elements)) {
  const s = (summary[e.type] ??= { count: 0, quantity: 0, unit: e.quantity.unit, costSAR: [0, 0] });
  s.count++;
  s.quantity = round(s.quantity + e.quantity.value, 1);
  s.costSAR[0] += e.costSAR[0];
  s.costSAR[1] += e.costSAR[1];
}
const roofArea = Object.values(elements).filter((e) => e.type === 'RF-FLAT').reduce((s, e) => s + e.quantity.value, 0);
const totalCost = Object.values(summary).reduce((s, v) => [s[0] + v.costSAR[0], s[1] + v.costSAR[1]], [0, 0]);

const data = {
  meta: {
    title: 'Aseer Mosque, illustrative BIM dataset',
    disclaimer: 'Synthetic data generated for demonstration. Specifications, codes, costs and dates are plausible for the Saudi market but are not surveyed, as-built or quoted values.',
    generated: new Date().toISOString().slice(0, 10),
    source: 'Element names and geometry from the Revit-derived GLB; properties from scripts/build-bim-data.mjs',
    currency: 'SAR',
    costBasis: 'Indicative 2025 KSA supply + install ranges; verify with a quantity surveyor',
    site: {
      name: 'Aseer Mosque (illustrative)',
      region: 'Aseer Region, Kingdom of Saudi Arabia',
      latitude: 18.71838,
      longitude: 42.23708,
      crs: 'WGS 84 / UTM zone 38N (EPSG:32638)',
      groundElevation_m: 2780,
      qiblaBearing_deg: 320.5,
      occupancy: 'SBC 201 Group A-3 (Assembly: place of religious worship)',
      constructionType: 'Type II-A, non-combustible (assumed)',
      owner: 'Ministry of Islamic Affairs, Dawah and Guidance (assumed typical owner)',
      permit: 'Balady building permit no. [illustrative]',
      roofedArea_m2: Math.round(roofArea),
      prayerHallArea_m2: Math.round(hallRoof.area),
      estimatedCapacity: Math.floor(hallRoof.area / 10) * 10, // ~1 m² per worshipper in the prayer hall
      levels: ['Ground Floor (±0.00)', ...roofLevels.map((y) => (y === Math.round(topY * 20) / 20 ? `Minaret Top (${fmtLevel(y)})` : `Roof (${fmtLevel(y)})`))],
      applicableCodes: ['SBC 201', 'SBC 301', 'SBC 304', 'SBC 601', 'SBC 801', 'SBC 1001'],
      completion: '2024-05-15',
      completionHijri: toHijri('2024-05-15'),
    },
    totalCostSAR: totalCost,
  },
  types: Object.fromEntries(TYPES.map(({ match, tag, ...t }) => [t.id, t])),
  summary,
  elements,
};

fs.writeFileSync(output, JSON.stringify(data));
console.log(`${Object.keys(elements).length} elements, ${TYPES.length} types -> ${output} (${(fs.statSync(output).size / 1024).toFixed(0)} KB)`);
console.log('roofed area', Math.round(roofArea), 'm² | total cost SAR', totalCost.map((v) => v.toLocaleString()).join(' – '));
if (unmatched.length) console.log('unmatched:', unmatched);
