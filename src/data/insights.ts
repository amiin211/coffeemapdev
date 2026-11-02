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
    id: '3w-response-gap-explorer',
    title: "Finding the Gaps in Sudan's Humanitarian Response",
    summary: 'OCHA 3W joined to ACLED conflict data: a tunable priority index, a partner-exit simulator and a core-cluster coverage matrix for the hardest-hit localities.',
    titleAr: 'البحث عن الفجوات في الاستجابة الإنسانية في السودان',
    summaryAr: 'بيانات 3W لأوتشا مربوطة ببيانات النزاع من ACLED: مؤشر أولوية قابل للضبط، ومحاكي انسحاب الشركاء، ومصفوفة تغطية القطاعات الأساسية في أشد المحليات تأثرًا.',
    category: 'humanitarian',
    date: '2026-10-31',
    href: '/insights/3w-response-gap-explorer',
  },
  {
    id: 'acled-conflict-analytics',
    title: "Reading Sudan's Conflict Data: Surges, Hotspots and Trends",
    summary: 'Poisson z-scores against each locality\'s own baseline, newly affected areas and Getis-Ord Gi* hotspots from 17,027 ACLED events (to October 2026), computed in the browser.',
    titleAr: 'قراءة بيانات النزاع في السودان: التصاعد والبؤر والاتجاهات',
    summaryAr: 'درجات z لبواسون مقابل خط الأساس لكل محلية، والمحليات المتأثرة حديثًا، وبؤر Getis-Ord Gi* من 17,027 حدثًا (حتى أكتوبر 2026) في ACLED، محسوبة داخل المتصفح.',
    category: 'humanitarian',
    date: '2026-10-31',
    href: '/insights/acled-conflict-analytics',
  },
  {
    id: '3d-mosque-4d-bim',
    title: 'From Drone Survey to Handover: a 4D BIM Mosque in the Browser',
    summary: 'Survey terrain, 674 clickable BIM elements and a construction programme generated from the model\'s own geometry, with site-works and building costs that build up day by day.',
    titleAr: 'من المسح بالطائرة المسيّرة إلى التسليم: مسجد بنمذجة 4D داخل المتصفح',
    summaryAr: 'تضاريس المساحة، و674 عنصر BIM قابلًا للنقر، وجدول تنفيذ مولّد من هندسة النموذج نفسه، مع تكاليف أعمال الموقع والمبنى تتراكم يومًا بيوم.',
    category: 'gis-bim',
    date: '2026-10-31',
    href: '/insights/3d-mosque-4d-bim',
  },
  {
    id: 'riyadh-urban-heat',
    title: 'Where Riyadh Needs Trees Most',
    summary: 'Heat, canopy equity and a greening simulator on a 1.6-million-cell grid in the browser: where one more tree matters most, how much canopy cools the city, and what a plan would deliver against Green Riyadh targets.',
    titleAr: 'أين تحتاج الرياض إلى الأشجار أكثر',
    summaryAr: 'الحرارة وعدالة المظلة ومحاكي تشجير على شبكة من 1.6 مليون خلية داخل المتصفح: أين تُحدث الشجرة الإضافية أكبر فرق، وكم تبرّد المظلة المدينة، وماذا تحقق الخطة مقابل أهداف الرياض الخضراء.',
    category: 'geoai',
    date: '2026-10-31',
    href: '/insights/riyadh-urban-heat',
  },
  {
    id: 'al-jouf-crop-monitoring',
    title: 'Crop Monitoring for Al Jouf Without a Server',
    summary: '181 irrigated fields followed through 442 Sentinel-2 dates: crop types, health against peers, harvest detection, phenology and about 166 million m³ of estimated irrigation demand a year.',
    titleAr: 'مراقبة المحاصيل في الجوف دون خادم',
    summaryAr: '181 حقلًا مرويًا عبر 442 تاريخًا من Sentinel-2: أنواع المحاصيل، والصحة مقارنة بالنظراء، ورصد الحصاد، والفينولوجيا، ونحو 166 مليون م³ من الطلب التقديري على الري سنويًا.',
    category: 'geoai',
    date: '2026-10-31',
    href: '/insights/al-jouf-crop-monitoring',
  },
  {
    id: 'serverless-geoai-architecture',
    title: 'Serverless GeoAI: The Architecture Behind CoffeeMap.dev',
    summary: 'How my satellite and humanitarian dashboards run with no VPS, no database and no Python at runtime: two routes, seven patterns and one rule for where each computation belongs.',
    titleAr: 'الذكاء الجيومكاني بلا خوادم: المعمارية خلف CoffeeMap.dev',
    summaryAr: 'كيف تعمل لوحاتي للأقمار الصناعية والعمل الإنساني بلا خادم افتراضي ولا قاعدة بيانات ولا Python وقت التشغيل: مساران، وسبعة أنماط، وقاعدة واحدة تحدد أين ينتمي كل حساب.',
    category: 'geoai',
    date: '2026-10-31',
    href: '/insights/serverless-geoai-architecture',
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
