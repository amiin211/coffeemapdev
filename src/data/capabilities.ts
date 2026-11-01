// Services I offer. Each one links to the projects and articles that prove it
// (projectIds / insightIds); `category` is the URL slug of its page under
// /expertise/<category> and the project filter at /projects/<category>.

export interface Capability {
  id: string;
  category: string;
  icon: string;
  title: string;
  titleAr: string;
  description: string; // one-line summary for the card
  descriptionAr: string;
  intro: string; // longer paragraph on the service page
  introAr: string;
  deliverables: [string, string][]; // [en, ar]
  audience: string; // who it is for
  audienceAr: string;
  technologies: string[];
  projectIds: string[];
  insightIds: string[];
}

export const capabilities: Capability[] = [
  {
    id: 'geoai',
    category: 'geoai',
    icon: 'Satellite',
    title: 'Satellite Analytics & GeoAI',
    titleAr: 'تحليلات الأقمار الصناعية والذكاء الجيومكاني',
    description: 'Crop and water monitoring, urban heat and greening plans, and change detection from Sentinel, Landsat and open data, delivered as live dashboards.',
    descriptionAr: 'مراقبة المحاصيل والمياه، والحرارة الحضرية وخطط التشجير، ورصد التغيّر من Sentinel وLandsat والبيانات المفتوحة، في لوحات حية.',
    intro: 'I turn free satellite archives into answers to one specific question: which fields are struggling and how much water they use, which city blocks need trees first and how much cooler they would be, what changed and where. The analysis runs on open data and public tile services, so you get a live tool rather than a one-off map, with no servers to maintain.',
    introAr: 'أحوّل أرشيفات الأقمار الصناعية المجانية إلى إجابات عن سؤال محدد: أي الحقول متعثرة وكم تستهلك من المياه، وأي الأحياء تحتاج الأشجار أولًا وكم ستبرد، وما الذي تغيّر وأين. يعمل التحليل على بيانات مفتوحة وخدمات tiles عامة، فتحصل على أداة حية لا خريطة لمرة واحدة، دون خوادم تحتاج إلى صيانة.',
    deliverables: [
      ['Field-level crop monitoring: health, harvest dates, phenology and irrigation demand', 'مراقبة المحاصيل على مستوى الحقل: الصحة، ومواعيد الحصاد، والفينولوجيا، والطلب على الري'],
      ['Urban heat, tree-canopy equity and greening scenarios with cooling, water and cost estimates', 'الحرارة الحضرية وعدالة مظلة الأشجار وسيناريوهات التشجير مع تقديرات التبريد والمياه والتكلفة'],
      ['Change detection and time-series analysis from Sentinel-1/2 and Landsat', 'رصد التغيّر وتحليل السلاسل الزمنية من Sentinel-1/2 وLandsat'],
      ['Models fitted to your area, with their accuracy and limits stated plainly', 'نماذج مدرَّبة على منطقتك، مع توضيح دقتها وحدودها بصراحة'],
    ],
    audience: 'Agriculture and water programmes, municipalities and urban planners, environmental consultancies, NGOs.',
    audienceAr: 'برامج الزراعة والمياه، والبلديات ومخططو المدن، والاستشارات البيئية، والمنظمات غير الحكومية.',
    technologies: ['Sentinel-1/2', 'Landsat 8/9', 'Google Earth Engine', 'Planetary Computer', 'Python', 'Rasterio', 'OpenCV', 'TensorFlow.js'],
    projectIds: ['geoai-crop-monitoring', 'riyadh-urban-heat', 'serverless-geoai-architecture'],
    insightIds: ['al-jouf-crop-monitoring', 'riyadh-urban-heat', 'serverless-geoai-architecture'],
  },
  {
    id: 'humanitarian',
    category: 'humanitarian',
    icon: 'Humanitarian',
    title: 'Humanitarian Information Management',
    titleAr: 'إدارة المعلومات الإنسانية',
    description: 'Conflict analysis, 3W and response-gap mapping, and situation dashboards for Sudan and the region, in Arabic and English.',
    descriptionAr: 'تحليل النزاعات، وخرائط 3W وفجوات الاستجابة، ولوحات الوضع للسودان والمنطقة، بالعربية والإنجليزية.',
    intro: 'I have worked with UNEP, UN-Habitat and UNOPS, and I know what a cluster coordinator or an information manager needs each week: where violence is rising, which localities have no partner for health or WASH, and what happens if one organisation leaves. I build those answers from ACLED, OCHA 3W and HDX data, with methods that hold up to scrutiny and outputs in both languages.',
    introAr: 'عملت مع برنامج الأمم المتحدة للبيئة وموئل الأمم المتحدة ومكتب الأمم المتحدة لخدمات المشاريع، وأعرف ما يحتاجه منسق القطاع أو مدير المعلومات كل أسبوع: أين يتصاعد العنف، وأي المحليات بلا شريك في الصحة أو المياه والصرف الصحي، وماذا يحدث إن انسحبت منظمة. أبني هذه الإجابات من بيانات ACLED و3W لأوتشا وHDX، بمناهج تصمد أمام التدقيق ومخرجات باللغتين.',
    deliverables: [
      ['Conflict trend and hotspot analysis (surge detection, Getis-Ord Gi*)', 'تحليل اتجاهات النزاع وبؤره (رصد التصاعد، Getis-Ord Gi*)'],
      ['3W and response-gap analysis with priority indices and partner-exit scenarios', 'تحليل 3W وفجوات الاستجابة مع مؤشرات الأولوية وسيناريوهات انسحاب الشركاء'],
      ['Situation dashboards and map products for clusters and donors', 'لوحات الوضع والمنتجات الخرائطية للقطاعات والمانحين'],
      ['Arabic and English outputs, with Arabic place names handled properly', 'مخرجات بالعربية والإنجليزية مع معالجة صحيحة لأسماء الأماكن العربية'],
    ],
    audience: 'UN agencies, clusters, INGOs and NGOs, donors and research teams working on Sudan and the region.',
    audienceAr: 'وكالات الأمم المتحدة، والقطاعات، والمنظمات الدولية والمحلية، والمانحون، وفرق البحث العاملة على السودان والمنطقة.',
    technologies: ['ACLED', 'OCHA 3W', 'HDX', 'COD-AB boundaries', 'ArcGIS Dashboards', 'Power BI', 'MapLibre GL JS', 'Chart.js'],
    projectIds: ['acled-conflict-dashboard', '3w-humanitarian-mapping', 'sudan-flood-dashboard'],
    insightIds: ['acled-conflict-analytics', '3w-response-gap-explorer'],
  },
  {
    id: 'web-mapping',
    category: 'web-mapping',
    icon: 'Public',
    title: 'WebGIS Dashboards & Apps',
    titleAr: 'لوحات وتطبيقات نظم المعلومات الجغرافية على الويب',
    description: 'Fast, bilingual map dashboards and tools that run on cheap static hosting, with no servers or databases to maintain.',
    descriptionAr: 'لوحات وأدوات خرائط سريعة وثنائية اللغة تعمل على استضافة ثابتة رخيصة، دون خوادم أو قواعد بيانات تحتاج إلى صيانة.',
    intro: 'Every dashboard on this site is static files on shared hosting. The analysis runs in the visitor\'s browser or is computed once offline. For a client this means low running costs, nothing to patch, and a tool that keeps working after the contract ends. I build in Next.js, MapLibre and Chart.js, in Arabic and English with full right-to-left layout.',
    introAr: 'كل لوحة في هذا الموقع ملفات ثابتة على استضافة مشتركة، ويجري التحليل في متصفح الزائر أو يُحسب مرة واحدة دون اتصال. ويعني ذلك للعميل تكلفة تشغيل منخفضة، ولا تحديثات أمنية، وأداة تستمر في العمل بعد انتهاء العقد. أبني بـNext.js وMapLibre وChart.js، بالعربية والإنجليزية مع تخطيط كامل من اليمين إلى اليسار.',
    deliverables: [
      ['Interactive dashboards with filters, charts, time sliders and click-through details', 'لوحات تفاعلية مع مرشحات ومخططات وشرائح زمنية وتفاصيل عند النقر'],
      ['Client-side analytics: spatial statistics, raster processing and simulations in the browser', 'تحليلات داخل المتصفح: إحصاء مكاني ومعالجة نقطية ومحاكاة'],
      ['Arabic and English interfaces with right-to-left layout', 'واجهات عربية وإنجليزية بتخطيط من اليمين إلى اليسار'],
      ['Handover with documentation, so your team can update the data', 'تسليم مع توثيق ليتمكن فريقك من تحديث البيانات'],
    ],
    audience: 'Organisations that need a public or internal map tool without an IT department behind it.',
    audienceAr: 'الجهات التي تحتاج أداة خرائط عامة أو داخلية دون قسم تقنية معلومات خلفها.',
    technologies: ['Next.js', 'React', 'TypeScript', 'MapLibre GL JS', 'Leaflet', 'Chart.js', 'Three.js', 'ArcGIS Online'],
    projectIds: ['acled-conflict-dashboard', '3w-humanitarian-mapping', 'sudan-flood-dashboard', 'geoai-crop-monitoring'],
    insightIds: ['serverless-geoai-architecture'],
  },
  {
    id: 'surveying',
    category: 'surveying',
    icon: 'Surveying',
    title: 'Surveying, Geodesy & Mapping',
    titleAr: 'المساحة والجيوديسيا ورسم الخرائط',
    description: 'Control networks, GNSS and total-station surveys, drone photogrammetry, terrain models and orthophotos, from a licensed geomatics engineer.',
    descriptionAr: 'شبكات التحكم، والرفع بـGNSS والمحطة الشاملة، والمسح الفوتوغرامتري بالطائرات المسيّرة، ونماذج التضاريس والصور المصححة، من مهندس جيوماتكس مرخّص.',
    intro: 'Before GIS and GeoAI I worked as a surveyor, geodetic engineer and site engineer. I hold an MSc in Geomatics/Surveying Engineering and a Saudi Council of Engineers licence. I can plan and check survey work end to end: control and datums, field methods, adjustment, terrain models and orthophotos, and the accuracy reporting that proves the result is fit for design or construction.',
    introAr: 'قبل نظم المعلومات الجغرافية والذكاء الجيومكاني عملت مساحًا ومهندسًا جيوديسيًا ومهندس موقع، وأحمل ماجستير في هندسة الجيوماتكس/المساحة وترخيص الهيئة السعودية للمهندسين. أستطيع تخطيط أعمال المساحة وتدقيقها من البداية إلى النهاية: التحكم والمراجع الجيوديسية، وطرق العمل الميداني، والضبط، ونماذج التضاريس والصور المصححة، وتقارير الدقة التي تثبت صلاحية النتيجة للتصميم أو التنفيذ.',
    deliverables: [
      ['Control network design, GNSS and total-station observation, least-squares adjustment', 'تصميم شبكات التحكم، والرصد بـGNSS والمحطة الشاملة، والضبط بالمربعات الصغرى'],
      ['Drone photogrammetry: flight planning, ground control, orthophotos, DSM/DTM and point clouds', 'المسح الفوتوغرامتري بالطائرات المسيّرة: تخطيط الطيران، والتحكم الأرضي، والصور المصححة، ونماذج السطح والتضاريس، وسحب النقاط'],
      ['Topographic surveys, setting out, and cut-and-fill quantities', 'الرفع الطبوغرافي، والتوقيع، وكميات الحفر والردم'],
      ['Datum and coordinate transformations, accuracy assessment and reporting', 'تحويلات المراجع والإحداثيات، وتقييم الدقة وإعداد التقارير'],
    ],
    audience: 'Engineering and construction firms, developers, survey contractors and consultants who need survey work planned, checked or audited.',
    audienceAr: 'شركات الهندسة والإنشاءات، والمطوّرون، ومقاولو المساحة والاستشاريون الذين يحتاجون إلى تخطيط أعمال المساحة أو تدقيقها أو مراجعتها.',
    technologies: ['GNSS / RTK', 'Total stations', 'Least-squares adjustment', 'Pix4D', 'AutoCAD Civil 3D', 'GDAL'],
    projectIds: ['3d-mosque-viewer', 'geospatial-qaqc-workbench'],
    insightIds: ['3d-mosque-4d-bim'],
  },
  {
    id: 'enterprise-gis',
    category: 'enterprise-gis',
    icon: 'FactCheck',
    title: 'Geospatial QA/QC & Data Quality',
    titleAr: 'ضبط وضمان جودة البيانات الجيومكانية',
    description: 'Independent quality control of orthoimagery, elevation models, vector data and land cover against ISO 19157, with sampling plans and clear reports.',
    descriptionAr: 'ضبط جودة مستقل للصور المصححة ونماذج الارتفاع والبيانات المتجهية والغطاء الأرضي وفق ISO 19157، مع خطط عينات وتقارير واضحة.',
    intro: 'Quality control of large-scale mapping data is the core of my recent work. I design inspection workflows, sampling plans and checklists, run the checks in ArcGIS Pro, QGIS and code, and report against ISO 19157-1, so producers know exactly what to fix and clients know what they are accepting.',
    introAr: 'ضبط جودة بيانات الخرائط الواسعة النطاق هو جوهر عملي في الفترة الأخيرة. أصمم سير عمل الفحص وخطط العينات وقوائم التحقق، وأنفّذ الفحوص في ArcGIS Pro وQGIS والشيفرة، وأعدّ التقارير وفق ISO 19157-1، ليعرف المنتج بالضبط ما يجب إصلاحه ويعرف العميل ما يتسلّمه.',
    deliverables: [
      ['QA/QC workflows and checklists for orthoimagery, DEMs, topographic vectors and land cover', 'سير عمل وقوائم تحقق لضبط جودة الصور المصححة ونماذج الارتفاع والبيانات الطبوغرافية والغطاء الأرضي'],
      ['Statistical sampling (ISO 2859-1), positional and thematic accuracy assessment', 'العينات الإحصائية (ISO 2859-1)، وتقييم الدقة الموضعية والموضوعية'],
      ['Automated checks in Python, GDAL and PostGIS', 'فحوص آلية بـPython وGDAL وPostGIS'],
      ['Training for QC teams, in Arabic or English', 'تدريب فرق ضبط الجودة بالعربية أو الإنجليزية'],
    ],
    audience: 'Mapping agencies, data producers and their clients, and consultants supervising geospatial contracts.',
    audienceAr: 'جهات المساحة ورسم الخرائط، ومنتجو البيانات وعملاؤهم، والاستشاريون المشرفون على العقود الجيومكانية.',
    technologies: ['ISO 19157-1', 'ISO 2859-1', 'ArcGIS Pro', 'QGIS', 'PostGIS', 'GDAL', 'Python'],
    projectIds: ['geospatial-qaqc-workbench'],
    insightIds: ['geospatial-qaqc-workbench'],
  },
  {
    id: 'gis-bim',
    category: 'gis-bim',
    icon: 'ViewInAr',
    title: '3D, BIM & Digital Twins',
    titleAr: 'النمذجة ثلاثية الأبعاد وBIM والتوائم الرقمية',
    description: 'Web-based 3D and 4D site models that combine survey terrain, BIM data, construction schedules and costs.',
    descriptionAr: 'نماذج مواقع ثلاثية ورباعية الأبعاد على الويب تجمع تضاريس المساحة وبيانات BIM وجداول التنفيذ والتكاليف.',
    intro: 'I bring survey data and BIM together in the browser: terrain from drone photogrammetry, a Revit model with its element data, and a 4D construction sequence that shows what is built when and what it has cost so far. Owners and stakeholders can understand a project without installing anything.',
    introAr: 'أجمع بيانات المساحة وBIM داخل المتصفح: تضاريس من المسح الفوتوغرامتري بالطائرات المسيّرة، ونموذج Revit مع بيانات عناصره، وتسلسل تنفيذ رباعي الأبعاد يُظهر ما يُبنى ومتى وكم كلّف حتى الآن. ويستطيع الملاك وأصحاب المصلحة فهم المشروع دون تثبيت أي برنامج.',
    deliverables: [
      ['Interactive 3D site models from DTM, orthophoto and Revit/IFC exports', 'نماذج مواقع ثلاثية الأبعاد تفاعلية من نماذج التضاريس والصور المصححة وصادرات Revit/IFC'],
      ['4D construction sequencing and cumulative cost visualisation', 'تسلسل التنفيذ رباعي الأبعاد وعرض التكاليف التراكمية'],
      ['Clickable element data: specifications, quantities and lifecycle', 'بيانات عناصر قابلة للنقر: المواصفات والكميات ودورة الحياة'],
      ['Earthworks and access-road visualisation from survey data', 'عرض أعمال الحفر والردم وطرق الوصول من بيانات المساحة'],
    ],
    audience: 'Owners, developers, contractors and design consultancies presenting or tracking a project.',
    audienceAr: 'الملاك والمطوّرون والمقاولون والاستشاريون الذين يعرضون مشروعًا أو يتابعونه.',
    technologies: ['Three.js', 'WebGL', 'Revit', 'glTF', 'Blender', 'AutoCAD Civil 3D'],
    projectIds: ['3d-mosque-viewer'],
    insightIds: ['3d-mosque-4d-bim'],
  },
];
