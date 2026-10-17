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

// ----------------------------------------------------------------- Arabic --
// State and locality names in Arabic come from the OCHA boundaries
// (adm1_name1 / adm2_name1); the free text in the data files is translated here.
export function arabicNames(data: FloodData) {
  const names = new Map<string, string>();
  for (const f of [...data.admin1.features, ...data.admin2.features]) {
    const p = f.properties as Record<string, string | null>;
    if (p.adm2_pcode && p.adm2_name1) names.set(p.adm2_pcode, p.adm2_name1);
    else if (p.adm1_pcode && p.adm1_name1 && !p.adm2_pcode) names.set(p.adm1_pcode, p.adm1_name1);
  }
  for (const s of data.states) if (s.arabic_name) names.set(s.pcode, s.arabic_name);
  return (pcode: string, fallback: string) => names.get(pcode) ?? fallback;
}

export const NOTES_AR: Record<string, string> = {
  'Flood affected, 25,800 at risk of famine (IPC 5)': 'متأثرة بالفيضانات، و25,800 شخص معرّضون لخطر المجاعة (IPC 5)',
  'Affected locality in Kassala': 'محلية متأثرة في كسلا',
  '37 villages affected': '37 قرية متأثرة',
  'Also known as Sergaila': 'تُعرف أيضًا باسم سرقيلا',
  'Flood affected locality': 'محلية متأثرة بالفيضانات',
  'Flood affected, 18,700 at risk of famine': 'متأثرة بالفيضانات، و18,700 شخص معرّضون لخطر المجاعة',
  'All seven localities affected in Northern State': 'المحليات السبع كلها متأثرة في الولاية الشمالية',
  'West Kassala locality': 'محلية غرب كسلا',
  'Kassala city area': 'منطقة مدينة كسلا',
  'Zamzam IDP camp in famine conditions': 'مخيم زمزم للنازحين في ظروف مجاعة',
  'Aroma locality': 'محلية أروما',
  'Most affected locality in South Darfur': 'أكثر المحليات تأثرًا في جنوب دارفور',
  'Central Darfur capital': 'عاصمة وسط دارفور',
  'Khashm Elgirba locality': 'محلية خشم القربة',
  'Flood affected together with Kutum': 'متأثرة بالفيضانات مع كتم',
  'Kassala locality': 'محلية كسلا',
};

export const TEXT_AR: Record<string, string> = {
  'OCHA Sudan Flash Update No. 04 (5 September 2024)': 'تحديث أوتشا العاجل للسودان رقم 04 (5 سبتمبر 2024)',
  'Data covers period from June 2024 to September 2024': 'تغطي البيانات الفترة من يونيو 2024 إلى سبتمبر 2024',
  'Sudan Federal Ministry of Health (FMoH)': 'وزارة الصحة الاتحادية السودانية',
  '22 July - 1 September 2024': '22 يوليو - 1 سبتمبر 2024',
};
