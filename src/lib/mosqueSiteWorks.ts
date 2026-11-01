// Costed work packages for the parts of the project that are not BIM
// elements: drone survey and setting out, earthworks, the access road,
// foundations and soft landscaping. Quantities are measured from the 3D site
// itself (survey box, DTM cut and fill, road length, footprint, lawn cells and
// plant counts); unit rates are indicative 2023-24 Saudi market ranges (SAR,
// excl. VAT), not a priced bill of quantities.

import type { PhaseId } from '@/lib/mosqueSchedule';

export type CostUnit = 'm2' | 'm3' | 'm' | 'ha' | 'nr' | 'item';
export const COST_UNIT_LABEL: Record<CostUnit, [string, string]> = {
  m2: ['m²', 'م²'],
  m3: ['m³', 'م³'],
  m: ['m', 'م'],
  ha: ['ha', 'هكتار'],
  nr: ['nr', 'عدد'],
  item: ['item', 'بند'],
};

export interface CostItem {
  code: string;
  name: string;
  nameAr: string;
  quantity: number;
  unit: CostUnit;
  rate: [number, number]; // SAR per unit
  cost: [number, number];
}

export interface WorkPackage {
  id: 'survey' | 'earthworks' | 'road' | 'foundations' | 'landscape';
  code: string;
  name: string;
  nameAr: string;
  phase: PhaseId;
  start: number; // days from the project start
  end: number;
  items: CostItem[];
  cost: [number, number];
}

/** Quantities measured from the 3D site. */
export interface SiteQuantities {
  surveyHa: number; // area flown by the drone
  siteArea: number; // m², the platform cleared and graded
  cut: number; // m³, from the DTM to the platform level
  fill: number; // m³
  roadLength: number; // m
  roadArea: number; // m²
  foundationArea: number; // m², building footprint (roof plan area)
  lawnArea: number; // m²
  palms: number;
  shrubs: number;
  infillPaving: number; // m² of paving filling gaps inside the building footprint
}

export type PackageWindows = Record<WorkPackage['id'], [number, number]>;

const item = (code: string, name: string, nameAr: string, quantity: number, unit: CostUnit, rate: [number, number]): CostItem => {
  const q = Math.round(quantity * 10) / 10;
  return { code, name, nameAr, quantity: q, unit, rate, cost: [Math.round(q * rate[0]), Math.round(q * rate[1])] };
};

export function buildSiteWorks(q: SiteQuantities, windows: PackageWindows): WorkPackage[] {
  const pkg = (id: WorkPackage['id'], code: string, name: string, nameAr: string, phase: PhaseId, items: CostItem[]): WorkPackage => ({
    id,
    code,
    name,
    nameAr,
    phase,
    start: windows[id][0],
    end: windows[id][1],
    items: items.filter((i) => i.quantity > 0),
    cost: items.reduce<[number, number]>((s, i) => [s[0] + i.cost[0], s[1] + i.cost[1]], [0, 0]),
  });
  const surplus = Math.max(0, q.cut - q.fill);
  return [
    pkg('survey', 'WP-01', 'Drone survey & setting out', 'المسح بالطائرة المسيّرة والتوقيع', 'survey', [
      item('WP-01.1', 'Mobilisation, RTK base and ground control points', 'التجهيز ومحطة RTK ونقاط التحكم الأرضية', 1, 'item', [6000, 9000]),
      item('WP-01.2', 'Photogrammetry flight and processing (orthophoto, DSM, point cloud)', 'طيران المسح الفوتوغرامتري والمعالجة (صورة مصححة، نموذج سطح، سحابة نقاط)', q.surveyHa, 'ha', [900, 1500]),
      item('WP-01.3', 'Setting out by licensed surveyor', 'التوقيع بواسطة مساح مرخّص', 1, 'item', [18000, 30000]),
    ]),
    pkg('earthworks', 'WP-02', 'Earthworks', 'أعمال الحفر والردم', 'earthworks', [
      item('WP-02.1', 'Site clearance and grubbing', 'تنظيف الموقع وإزالة النباتات', q.siteArea, 'm2', [3, 6]),
      item('WP-02.2', 'Excavation to platform level, soil and weathered rock', 'الحفر حتى منسوب المنصة، تربة وصخور متجوية', q.cut, 'm3', [22, 45]),
      item('WP-02.3', 'Engineered fill from site-won material, compacted in layers', 'ردم هندسي من ناتج الحفر مدكوك على طبقات', q.fill, 'm3', [18, 32]),
      item('WP-02.4', 'Disposal of surplus material off site', 'نقل الفائض خارج الموقع', surplus, 'm3', [15, 30]),
      item('WP-02.5', 'Subgrade compaction and proof rolling', 'دمك طبقة التأسيس واختبارها', q.siteArea, 'm2', [5, 9]),
    ]),
    pkg('road', 'WP-03', 'Access road', 'طريق الوصول', 'road', [
      item('WP-03.1', 'Asphalt road: subbase, base course and 70 mm wearing course', 'طريق أسفلتي: طبقة تحت الأساس والأساس وطبقة سطحية 70 مم', q.roadArea, 'm2', [140, 210]),
      item('WP-03.2', 'Precast concrete kerbs, both sides', 'بردورات خرسانية مسبقة الصب على الجانبين', q.roadLength * 2, 'm', [55, 85]),
    ]),
    pkg('foundations', 'WP-04', 'Foundations & ground slab', 'الأساسات والبلاطة الأرضية', 'foundations', [
      item('WP-04.1', 'Reinforced-concrete foundations and ground-bearing slab', 'أساسات خرسانية مسلحة وبلاطة أرضية', q.foundationArea, 'm2', [480, 720]),
    ]),
    pkg('landscape', 'WP-05', 'Soft landscaping', 'تنسيق المواقع الطبيعي', 'external', [
      item('WP-05.1', 'Imported topsoil and soil improvement, 300 mm', 'تربة زراعية مستوردة وتحسين التربة بسماكة 300 مم', q.lawnArea, 'm2', [18, 30]),
      item('WP-05.2', 'Irrigation system (drip and pop-up sprinklers)', 'شبكة ري (تنقيط ورشاشات منبثقة)', q.lawnArea, 'm2', [25, 45]),
      item('WP-05.3', 'Turf lawn (seashore paspalum)', 'مسطح أخضر (باسبالم)', q.lawnArea, 'm2', [20, 35]),
      item('WP-05.4', 'Palms, 3-4 m clear trunk', 'نخيل بارتفاع جذع 3-4 م', q.palms, 'nr', [2500, 4500]),
      item('WP-05.5', 'Shrubs (conocarpus, bougainvillea)', 'شجيرات (كونوكاربس، جهنمية)', q.shrubs, 'nr', [180, 350]),
      item('WP-05.6', 'White marble paving to infill areas', 'رصف بالرخام الأبيض للمساحات المتبقية', q.infillPaving, 'm2', [260, 420]),
    ]),
  ];
}

export const midCost = (c: [number, number]) => (c[0] + c[1]) / 2;

/** Mid-range cost of the site works done by `day` (each package spread evenly over its window). */
export function siteWorksCostToDate(packages: WorkPackage[], day: number) {
  return packages.reduce((s, p) => s + midCost(p.cost) * Math.min(1, Math.max(0, (day - p.start) / Math.max(1, p.end - p.start))), 0);
}
