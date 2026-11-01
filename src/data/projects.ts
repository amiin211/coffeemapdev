export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel?: string; // card tag, when more specific than the category's name
  titleAr: string;
  descriptionAr: string;
  categoryLabelAr?: string;
  tags: string[];
  image: string;
  externalUrl: string; // project page, or an absolute URL for an external demo
}

export const projects: Project[] = [
  {
    id: 'riyadh-urban-heat',
    title: 'Riyadh Urban Heat & Tree Canopy Equity',
    titleAr: 'الحرارة الحضرية ومظلة الأشجار في الرياض',
    descriptionAr: 'ذكاء جيومكاني داخل المتصفح لمدينة الرياض: بؤر حرارة سطح الأرض من Landsat، ومظلة الأشجار من Sentinel-2، ومناطق أولوية للتشجير وفق عدالة المظلة، ونموذج يتعلّم من بيانات المدينة نفسها كم تبرّد الأشجار السطح، ومحاكي تشجير يوزّع ميزانية أشجار أو حدائق أو أسطح باردة ويقيس التبريد والمياه والتكلفة مقابل أهداف الرياض الخضراء.',
    categoryLabelAr: 'ذكاء جيومكاني - بيئة',
    description: 'Client-side GeoAI for Riyadh: Landsat surface-temperature hotspots, Sentinel-2 tree canopy and canopy-equity priority zones, a cooling model learned from the city\'s own pixels, and a greening simulator that places a tree budget, parks or cool roofs and reports cooling, water, cost and progress toward Green Riyadh targets.',
    category: 'geoai',
    categoryLabel: 'GeoAI - Environment',
    tags: ['Landsat 8/9', 'Sentinel-2', 'TensorFlow.js', 'MapLibre GL JS', 'Planetary Computer', 'ESA WorldCover', 'NASA POWER', 'Overpass API', 'Next.js', 'TypeScript'],
    image: '/images/urban-heat.png',
    externalUrl: '/projects/riyadh-urban-heat',
  },
  {
    id: 'geoai-crop-monitoring',
    title: 'GeoAI Crop Monitoring',
    titleAr: 'مراقبة المحاصيل بالذكاء الجيومكاني',
    descriptionAr: 'مراقبة 181 حقلًا مرويًا في الجوف بالمملكة العربية السعودية بصور Sentinel-2: رصد آلي لمحاور الري، وتصنيف المحاصيل، وصحة كل حقل مقارنة بنظرائه، ورصد الحصاد والحشّ، وفينولوجيا الموسم، وتقدير الطلب على مياه الري، وموجز مكتوب للمزرعة يتحدث مع كل تاريخ.',
    categoryLabelAr: 'ذكاء جيومكاني - زراعة',
    description: 'Sentinel-2 monitoring of 181 irrigated fields in Al Jouf, Saudi Arabia: auto-detected centre pivots, crop classification, field health against peers, harvest and cutting detection, season phenology, irrigation water-demand estimates and a farm brief that rewrites itself for every date.',
    category: 'geoai',
    categoryLabel: 'GeoAI - Agriculture',
    tags: ['Python', 'OpenCV', 'Rasterio', 'NumPy', 'STAC API', 'Planetary Computer', 'Sentinel-2', 'NASA POWER', 'FAO-56', 'Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js'],
    image: '/images/crop.png',
    externalUrl: '/projects/geoai-crop-monitoring',
  },
  {
    id: 'serverless-geoai-architecture',
    title: 'Serverless GeoAI Architecture',
    titleAr: 'معمارية الذكاء الجيومكاني بلا خوادم',
    descriptionAr: 'معمارية تفاعلية للوحات الذكاء الجيومكاني: مساران عاملان (الحساب في المتصفح، أو الحساب المسبق مرة واحدة وبث الصور) ومسار ثالث مخطط للنماذج المدرَّبة، بلا خادم افتراضي ولا قاعدة بيانات ولا Python وقت التشغيل.',
    categoryLabelAr: 'سير عمل تفاعلي',
    description: 'Interactive architecture of the GeoAI dashboards: two live routes (compute in the browser, or precompute once and stream imagery) and a planned third for trained models, with no VPS, database or Python at runtime.',
    category: 'geoai',
    categoryLabel: 'Interactive Workflow',
    tags: ['Architecture', 'Serverless GeoAI', 'Planetary Computer', 'STAC', 'MapLibre GL JS', 'TensorFlow.js', 'ONNX Runtime Web', 'Static hosting'],
    image: '/images/serverless-architecture.png',
    externalUrl: '/projects/serverless-geoai-architecture',
  },
  {
    id: 'geospatial-qaqc-workbench',
    title: 'Geospatial QA/QC Workbench',
    titleAr: 'منصة ضبط وضمان جودة البيانات الجيومكانية',
    descriptionAr: 'سير عمل تفاعلي لضبط الجودة وضمانها للصور المصححة، ونماذج الارتفاع، والبيانات الطبوغرافية المتجهية، والغطاء الأرضي: ماذا تفحص، وكيف في ArcGIS Pro وQGIS والشيفرة، وعنصر ISO 19157-1 خلف كل خطوة، مع حاسبات لحجم العينة والدقة ومصفوفة الالتباس.',
    categoryLabelAr: 'سير عمل تفاعلي',
    description: 'Interactive QA/QC workflows for orthoimagery, elevation models, topographic vectors and land cover — what to check, how in ArcGIS Pro, QGIS and code, the ISO 19157-1 element behind each step, plus sampling, accuracy and confusion-matrix calculators.',
    category: 'enterprise-gis',
    categoryLabel: 'Interactive Workflow',
    tags: ['ISO 19157-1', 'ISO 2859-1', 'ArcGIS Pro', 'QGIS', 'PostGIS', 'GDAL', 'Python', 'Data Quality', 'Knowledge Management'],
    image: '/images/qaqc-workbench.png',
    externalUrl: '/projects/geospatial-qaqc-workbench',
  },
  {
    id: 'acled-conflict-dashboard',
    title: 'Sudan Conflicts',
    titleAr: 'النزاعات في السودان',
    descriptionAr: 'لوحة لرصد النزاعات في السودان منذ أبريل 2023 من بيانات ACLED، تضيف تحليلات داخل المتصفح: رصد التصاعد الإحصائي لكل محلية، والمحليات المتأثرة حديثًا، والبؤر الساخنة بإحصاء Getis-Ord Gi*، واتجاهات الولايات، مع مساعد ذكاء اصطناعي اختياري يكتب موجز الوضع ويحوّل الأسئلة بلغة طبيعية إلى مرشحات على الخريطة.',
    description: 'Conflict monitoring for Sudan since April 2023 from ACLED data, with in-browser analytics: statistical surge detection per locality, newly affected areas, Getis-Ord Gi* hotspots and state trends, plus an optional AI assistant that writes situation briefs and turns plain-language questions into map filters.',
    category: 'web-mapping',
    tags: ['Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js', 'Spatial Statistics', 'Getis-Ord Gi*', 'Cloudflare Workers', 'ACLED Data'],
    image: '/images/acled.png',
    externalUrl: '/projects/acled-conflict-dashboard',
  },
  {
    id: 'sudan-flood-dashboard',
    title: 'Sudan Flood Dashboard',
    titleAr: 'لوحة فيضانات السودان',
    descriptionAr: 'لوحة إنسانية تفاعلية تتابع أزمة الفيضانات والنزوح وتفشي الأمراض في ولايات السودان باستخدام بيانات حقيقية من أوتشا.',
    description: 'Interactive humanitarian dashboard tracking flood crisis, displacement, and disease outbreaks across Sudan states using real OCHA data.',
    category: 'web-mapping',
    tags: ['Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js', 'Material UI', 'GeoJSON', 'OCHA Data'],
    image: '/images/flood.png',
    externalUrl: '/projects/sudan-flood-dashboard',
  },
  {
    id: '3w-humanitarian-mapping',
    title: '3W Humanitarian Mapping',
    titleAr: 'خرائط العمل الإنساني (3W)',
    descriptionAr: 'لوحة «من يفعل ماذا وأين» للاستجابة الإنسانية في السودان من بيانات 3W لأوتشا، مع مستكشف لفجوات الاستجابة يربطها بأحداث النزاع من ACLED: مؤشر أولوية قابل للضبط، ومحاكاة انسحاب شريك، ومصفوفة تغطية القطاعات الأساسية في أشد المحليات تأثرًا.',
    description: 'Who-does-What-Where dashboard for Sudan\'s humanitarian response from OCHA 3W data, with a Response Gap Explorer that joins it to ACLED conflict events: a tunable priority index, a partner-exit simulator and a core-cluster coverage matrix for the hardest-hit localities.',
    category: 'web-mapping',
    tags: ['Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js', 'Gap Analysis', 'Scenario Simulation', 'OCHA 3W Data', 'ACLED Data'],
    image: '/images/3w.png',
    externalUrl: '/projects/3w-humanitarian-mapping',
  },
  {
    id: '3d-mosque-viewer',
    title: '3D Mosque Viewer & 4D BIM',
    titleAr: 'عارض المسجد ثلاثي الأبعاد ونمذجة 4D',
    descriptionAr: 'موقع مسجد في عسير بالمملكة العربية السعودية بالأبعاد الثلاثة والرابعة: تضاريس DTM مع صورة جوية، وبيانات BIM قابلة للنقر لكل عنصر من Revit، وجدول تنفيذ 4D مولّد من النموذج نفسه من المسح بالطائرة المسيّرة والحفر والردم وطريق الوصول حتى التسليم، مع تكاليف تراكمية بالريال.',
    description: 'A mosque site in Aseer, Saudi Arabia in 3D and 4D: DTM terrain with orthophoto, clickable BIM data for every Revit element, and a construction schedule generated from the model itself, from drone survey, earthworks and access road to handover, with cumulative SAR costs.',
    category: 'gis-bim',
    tags: ['Three.js', '4D BIM', 'Revit', 'glTF', 'WebGL', 'DTM', 'Photogrammetry', 'Earthworks', 'Next.js', 'TypeScript'],
    image: '/images/3d.png',
    externalUrl: '/projects/3d-mosque-viewer',
  },
];
