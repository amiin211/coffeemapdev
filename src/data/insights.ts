export interface Insight {
  id: string;
  title: string;
  summary: string;
  titleAr: string;
  summaryAr: string;
  category: string;
  date: string;
  href: string; // article page
}

export const insights: Insight[] = [
  {
    id: 'serverless-geoai-architecture',
    title: 'Serverless GeoAI: The Architecture Behind CoffeeMap.dev',
    summary: 'How three satellite dashboards run with no VPS, no database and no Python at runtime: two routes, six patterns and one rule for where each computation belongs.',
    titleAr: 'الذكاء الجيومكاني بلا خوادم: المعمارية خلف CoffeeMap.dev',
    summaryAr: 'كيف تعمل ثلاث لوحات للأقمار الصناعية بلا خادم افتراضي ولا قاعدة بيانات ولا Python وقت التشغيل: مساران، وستة أنماط، وقاعدة واحدة تحدد أين ينتمي كل حساب.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/serverless-geoai-architecture',
  },
  {
    id: 'blue-nile-flood-risk',
    title: 'Flood Risk Mapping on the Blue Nile, Entirely in the Browser',
    summary: 'Sentinel-1 radar, terrain tiles, rainfall and OpenStreetMap rivers become a flood-risk screening model for Sennar and Gezira, with no server at all.',
    titleAr: 'رسم خرائط مخاطر الفيضانات على النيل الأزرق داخل المتصفح بالكامل',
    summaryAr: 'رادار Sentinel-1 وtiles التضاريس والأمطار وأنهار OpenStreetMap تتحول إلى نموذج فرز أولي لمخاطر الفيضانات في سنار والجزيرة، دون أي خادم.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/blue-nile-flood-risk',
  },
  {
    id: 'riyadh-urban-heat',
    title: 'Where Riyadh Needs Trees Most',
    summary: 'Landsat heat, Sentinel-2 vegetation, WorldCover and OpenStreetMap on a 1.6-million-cell grid, client-side, to rank the blocks where one more tree matters most.',
    titleAr: 'أين تحتاج الرياض إلى الأشجار أكثر',
    summaryAr: 'حرارة Landsat، والغطاء النباتي من Sentinel-2، وWorldCover، وOpenStreetMap على شبكة من 1.6 مليون خلية داخل المتصفح، لترتيب الأحياء التي تُحدث فيها شجرة إضافية أكبر فرق.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/riyadh-urban-heat',
  },
  {
    id: 'al-jouf-crop-monitoring',
    title: 'Crop Monitoring for Al Jouf Without a Server',
    summary: 'Centre-pivot detection, NDVI/EVI time series, crop classification and anomaly alerts, built offline in Python and served as static files plus live tiles.',
    titleAr: 'مراقبة المحاصيل في الجوف دون خادم',
    summaryAr: 'رصد محاور الري المحوري، وسلاسل NDVI/EVI الزمنية، وتصنيف المحاصيل، وتنبيهات الشذوذ، مبنية دون اتصال بـPython ومقدَّمة كملفات ثابتة مع tiles صور حية.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/al-jouf-crop-monitoring',
  },
  {
    id: 'geospatial-qaqc-workbench',
    title: 'A Practical QA/QC Workbench for Geospatial Data',
    summary: 'What to check, how to check it in ArcGIS Pro, QGIS and code, and which ISO 19157-1 element it tests, for orthoimagery, elevation models, vector data and land cover.',
    titleAr: 'منصة عملية لضبط جودة البيانات الجيومكانية',
    summaryAr: 'ماذا تفحص، وكيف تفحصه في ArcGIS Pro وQGIS والشيفرة، وأي عنصر من ISO 19157-1 يختبره، للصور المصححة ونماذج الارتفاع والبيانات المتجهية والغطاء الأرضي.',
    category: 'enterprise-gis',
    date: '2026-09-28',
    href: '/insights/geospatial-qaqc-workbench',
  },
];
