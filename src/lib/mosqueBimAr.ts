// Arabic text for the mosque's illustrative BIM dataset (public/data/3d/bim.json).
// Type names already carry `nameAr` in the data; the remaining descriptive
// fields are translated here, keyed by type id, so regenerating bim.json with
// scripts/build-bim-data.mjs does not lose them.

interface TypeTextAr {
  construction: string;
  material: string;
  maintenance: string;
}

export const TYPES_AR: Record<string, TypeTextAr> = {
  'WL-PLINTH': {
    construction: 'بلوك خرساني مفرغ 200 مم على قاعدة شريطية من الخرسانة المسلحة، ولياسة إسمنتية 20 مم، وتشطيب محبب من الحجر المجروش (جرانوليت)',
    material: 'وحدات بناء خرسانية، لياسة إسمنتية، تشطيب حجر مجروش',
    maintenance: 'فحص بصري سنوي؛ تنظيف التشطيب وإصلاح الشقوق كل 5 سنوات',
  },
  'WL-TILE': {
    construction: 'بلوك خرساني مفرغ معزول 200 مم، وعزل XPS بسماكة 50 مم، ولياسة إسمنتية، وبلاط بورسلان 10 مم على مادة لاصقة مع مشابك أمان من الفولاذ المقاوم للصدأ',
    material: 'بلوك خرساني معزول، XPS، بلاط بورسلان',
    maintenance: 'فحص سنوي لالتصاق البلاط والفواصل؛ غسل الواجهة كل 6 أشهر (الغبار)',
  },
  'WL-STONE': {
    construction: 'بلوك خرساني مفرغ معزول 200 مم، وعزل XPS بسماكة 50 مم، وحجر طبيعي بني 30 مم (أو بورسلان بمظهر الحجر) على مثبتات من الفولاذ المقاوم للصدأ، بتشطيب على الطراز العسيري',
    material: 'بلوك خرساني معزول، XPS، تكسية حجر طبيعي',
    maintenance: 'فحص سنوي للمثبتات والفواصل؛ إعادة إحكام الفواصل كل 8 سنوات',
  },
  'CR-GRC': {
    construction: 'كورنيش من الخرسانة المسلحة بالألياف الزجاجية (GRC) بمثبتات من الفولاذ المقاوم للصدأ، مطلي في المصنع',
    material: 'خرسانة مسلحة بالألياف الزجاجية (GRC)',
    maintenance: 'فحص سنوي للمثبتات؛ إعادة الطلاء كل 7 سنوات',
  },
  'GZ-FIXED': {
    construction: 'إطار ألمنيوم بعازل حراري، وزجاج مزدوج: 6 مم منخفض الانبعاث + 12 مم هواء + 6 مم شفاف',
    material: 'ألمنيوم، زجاج مزدوج منخفض الانبعاث',
    maintenance: 'تنظيف الزجاج كل 3 أشهر (الغبار)؛ فحص منع التسرب سنويًا',
  },
  'WN-ARCH': {
    construction: 'نافذة مقوّسة من الألمنيوم بعازل حراري، وزجاج مزدوج منخفض الانبعاث، وشبك ألمنيوم زخرفي خارجي (بنقش المشربية)',
    material: 'ألمنيوم، زجاج مزدوج منخفض الانبعاث',
    maintenance: 'تنظيف الزجاج والشبك كل 3 أشهر؛ فحص منع التسرب والتصريف سنويًا',
  },
  'DR-SINGLE': {
    construction: 'ضلفة باب مصمتة بقشرة خشب صلب، وإطار من الخشب الصلب، وإكسسوارات من الفولاذ المقاوم للصدأ',
    material: 'خشب',
    maintenance: 'ضبط الإكسسوارات وتزييتها كل 6 أشهر',
  },
  'DR-SLIDING': {
    construction: 'لوحان خشبيان مصمتان على مجرى انزلاق علوي مخفي',
    material: 'خشب، مجرى فولاذي',
    maintenance: 'تنظيف المجرى وضبطه كل 6 أشهر',
  },
  'RF-FLAT': {
    construction: 'بلاطة خرسانة مسلحة 125 مم، وطبقة ميول، وغشاء عزل مائي بيتوميني، وعزل XPS بسماكة 75 مم، ونسيج أرضي، وبلاط خرساني 50 مم',
    material: 'خرسانة مسلحة، غشاء بيتوميني، XPS',
    maintenance: 'فحص الغشاء وتنظيف مصارف السطح قبل موسم الأمطار في عسير (سنويًا)',
  },
  'DM-MAIN': {
    construction: 'قشرة قبة من الخرسانة المسلحة على كمرة حلقية، وعزل، وتشطيب خارجي ببلاط سيراميك مزجج أخضر، وزخرفة داخلية من GRC / الجبس',
    material: 'خرسانة مسلحة، بلاط سيراميك مزجج، GRC',
    maintenance: 'فحص سنوي للبلاط والعزل المائي؛ فحص مثبتات الهلال',
  },
  'DM-FINIAL': {
    construction: 'غطاء مئذنة من GRC بهلال من الفولاذ المقاوم للصدأ بتشطيب ذهبي',
    material: 'GRC، فولاذ مقاوم للصدأ',
    maintenance: 'فحص سنوي للمثبتات؛ اختبار نظام الحماية من الصواعق',
  },
  'FL-SITE': {
    construction: 'طبقة إسفلت سطحية على طبقة أساس للممرات والمواقف؛ وبلاط خرساني متداخل / رصف حجري في الساحة',
    material: 'إسفلت، بلاط خرساني متداخل',
    maintenance: 'فحص سنوي؛ إغلاق شقوق الإسفلت وإعادة تسوية البلاط عند الحاجة',
  },
  'RL-SS': {
    construction: 'قوائم ودرابزين من الفولاذ المقاوم للصدأ درجة 316 بتشطيب مطفأ، مثبتة في الخرسانة',
    material: 'فولاذ مقاوم للصدأ 316',
    maintenance: 'تنظيف كل 3 أشهر؛ فحص المثبتات سنويًا',
  },
  'RL-TOP': {
    construction: 'مِسكة يد من أنبوب فولاذ مقاوم للصدأ درجة 316 بقطر 40 مم',
    material: 'فولاذ مقاوم للصدأ 316',
    maintenance: 'تنظيف كل 3 أشهر',
  },
  'ST-EXT': {
    construction: 'بلاطة درج من الخرسانة المسلحة بنوائم وقوائم من الجرانيت المعالج باللهب (مانع للانزلاق) 30 مم',
    material: 'خرسانة مسلحة، جرانيت',
    maintenance: 'فحص سنوي للنوائم وحوافها',
  },
  'PS-TENSILE': {
    construction: 'هيكل كابولي من الفولاذ المجلفن والمطلي بالبودرة مع غشاء PVC مغطى بـPVDF ومثبت ضد الأشعة فوق البنفسجية',
    material: 'فولاذ مجلفن، غشاء PVC مغطى بـPVDF',
    maintenance: 'فحص سنوي لشد الغشاء والمثبتات؛ غسل الغشاء كل 6 أشهر',
  },
  'LP-6M': {
    construction: 'عمود فولاذي مجلفن بالغمس الساخن على قاعدة خرسانية، مع كشاف LED وخلية ضوئية',
    material: 'فولاذ مجلفن، كشاف LED',
    maintenance: 'فحص ربع سنوي للمصباح والخلية الضوئية؛ فحص الجلفنة كل 5 سنوات',
  },
  'LP-8M': {
    construction: 'عمود فولاذي ثماني مجلفن بالغمس الساخن على قاعدة خرسانية، مع كشاف شارع LED بذراع واحدة',
    material: 'فولاذ مجلفن، كشاف LED',
    maintenance: 'فحص ربع سنوي للمصباح والخلية الضوئية؛ فحص الجلفنة كل 5 سنوات',
  },
  'LP-10M': {
    construction: 'عمود فولاذي مجلفن بالغمس الساخن على قاعدة خرسانية، مع كشافي شارع LED بذراعين',
    material: 'فولاذ مجلفن، كشافات LED',
    maintenance: 'فحص ربع سنوي للمصباح والخلية الضوئية؛ فحص الجلفنة كل 5 سنوات',
  },
  'PL-TIER': {
    construction: 'حوض زراعة متدرج من الخرسانة المسلحة بغطاء حجري، وري بالتنقيط، ونباتات محلية تتحمل الجفاف',
    material: 'خرسانة مسلحة، غطاء حجري',
    maintenance: 'فحص أسبوعي للري؛ صيانة موسمية للنباتات',
  },
};

export const CATEGORIES_AR: Record<string, string> = {
  Walls: 'الجدران',
  Domes: 'القباب',
  Roofs: 'الأسطح',
  Floors: 'الأرضيات',
  'Wall Sweeps': 'الكرانيش',
  Windows: 'النوافذ',
  Doors: 'الأبواب',
  Stairs: 'الأدراج',
  Railings: 'الدرابزين',
  'Site Structures': 'منشآت الموقع',
  Lighting: 'الإنارة',
  Landscape: 'تنسيق الموقع',
};

const ZONES_AR: Record<string, string> = {
  'External Works': 'الأعمال الخارجية',
  Minaret: 'المئذنة',
  'Prayer Hall': 'قاعة الصلاة',
  'Annex (ablution / services, assumed)': 'الملحق (الوضوء / الخدمات، مفترض)',
};

const WORDS_AR: [RegExp, string][] = [
  // Levels: "Roof (+14.15)" -> "السطح (+14.15)"
  [/^Site\b/, 'الموقع'],
  [/^Ground Floor\b/, 'الطابق الأرضي'],
  [/^Minaret Top\b/, 'قمة المئذنة'],
  [/^Roof\b/, 'السطح'],
  // Fire ratings
  [/^Non-combustible$/, 'غير قابل للاحتراق'],
  [/^Non-rated \(FD30 where on escape route\)$/, 'غير مصنّف (FD30 على مسارات الهروب)'],
  [/^Non-rated$/, 'غير مصنّف'],
  [/^2 h \(design assumption\); cladding non-combustible$/, 'ساعتان (افتراض تصميمي)؛ التكسية غير قابلة للاحتراق'],
  [/^2 h \(design assumption\)$/, 'ساعتان (افتراض تصميمي)'],
  // Condition and status
  [/^Good$/, 'جيدة'],
  [/^Fair$/, 'مقبولة'],
  [/^Existing$/, 'قائم'],
];

// Standards: codes stay as they are; the words in brackets are translated.
const STANDARD_WORDS_AR: [RegExp, string][] = [
  [/\(concrete\)/, '(الخرسانة)'],
  [/\(energy\)/, '(الطاقة)'],
  [/\(fire\)/, '(الحماية من الحريق)'],
  [/\(loads\)/, '(الأحمال)'],
  [/\(wind loads\)/, '(أحمال الرياح)'],
  [/\(accessibility\)/, '(إمكانية الوصول)'],
  [/\(means of egress\)/, '(وسائل الخروج)'],
  [/\(guards, handrails\)/, '(الحواجز ومساكات الأيدي)'],
  [/\(handrails\)/, '(مساكات الأيدي)'],
  [/\(luminaires\)/, '(الكشافات)'],
  [/^SASO concrete masonry unit standard$/, 'مواصفة SASO لوحدات البناء الخرسانية'],
  [/^SASO ceramic tile standard$/, 'مواصفة SASO للبلاط الخزفي'],
  [/^SASO flat glass standard$/, 'مواصفة SASO للزجاج المسطح'],
  [/^SASO steel standard$/, 'مواصفة SASO للفولاذ'],
  [/^Saudi Electricity Code$/, 'كود الكهرباء السعودي'],
  [/^MOMRAH municipal road and paving specifications$/, 'مواصفات وزارة الشؤون البلدية والقروية والإسكان للطرق والرصف'],
  [/^MOMRAH landscape guidelines$/, 'أدلة وزارة الشؤون البلدية والقروية والإسكان لتنسيق المواقع'],
];

const replaceAll = (text: string, table: [RegExp, string][]) => table.reduce((t, [from, to]) => t.replace(from, to), text);

export const zoneAr = (zone: string) => ZONES_AR[zone] ?? zone;
export const wordAr = (text: string) => replaceAll(text, WORDS_AR);
export const standardAr = (standard: string) => replaceAll(standard, STANDARD_WORDS_AR);

export const QUANTITY_LABELS_AR: Record<string, string> = {
  netArea_m2: 'المساحة الصافية (م²)',
  area_m2: 'المساحة (م²)',
  surfaceArea_m2: 'المساحة السطحية (م²)',
  planArea_m2: 'المساحة المسقطة (م²)',
  glazedArea_m2: 'المساحة المزججة (م²)',
  coveredArea_m2: 'المساحة المغطاة (م²)',
  length_m: 'الطول (م)',
  height_m: 'الارتفاع (م)',
  width_m: 'العرض (م)',
  diameter_m: 'القطر (م)',
  elevation_m: 'المنسوب (م)',
  count: 'العدد',
};

export const formatSARAr = ([lo, hi]: [number, number]) => `${lo.toLocaleString()} – ${hi.toLocaleString()} ريال`;

export const UNIT_LABEL_AR = { m2: 'م²', m: 'م', nr: 'عدد' } as const;

export const DISCLAIMER_AR =
  'بيانات اصطناعية أُنشئت لأغراض العرض. المواصفات والأكواد والتكاليف والتواريخ معقولة للسوق السعودي، لكنها ليست قيمًا مساحية أو منفّذة فعليًا أو عروض أسعار.';
