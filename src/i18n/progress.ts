// The data loaders in src/lib report progress in English, e.g.
// "Landsat LST tiles 3/20" or "SAR tiles 2020-09-06 → 2020-09-18: 4/12".
// Arabic pages pass them through here.
const TERMS: [RegExp, string][] = [
  [/Landsat LST/, 'حرارة السطح من Landsat'],
  [/Sentinel-2 NDVI/, 'NDVI من Sentinel-2'],
  [/WorldCover/, 'الغطاء الأرضي WorldCover'],
  [/Elevation/, 'الارتفاعات'],
  [/Sentinel Hub request/, 'طلب Sentinel Hub'],
  [/ tiles/, ' · الـtiles'],
  [/(\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2})/, 'من $1 إلى $2'],
];

export function progressAr(message: string): string {
  return TERMS.reduce((m, [from, to]) => m.replace(from, to), message);
}
