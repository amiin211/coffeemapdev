# Builds public/projects-static/ar/serverless-geoai-architecture.html from the
# English page: Arabic text, RTL page, diagram box contents mirrored.
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', 'public', 'projects-static') + os.sep
src = open(ROOT + 'serverless-geoai-architecture.html', encoding='utf-8').read()

# ---- SVG text (exact strings inside <text>…</text>) -------------------------
SVG = {
    'PUBLIC DATA': 'بيانات عامة',
    'S1, S2, Landsat,': 'S1 وS2 وLandsat',
    'WorldCover · keyless': 'وWorldCover · بلا مفتاح',
    'Process API with the': 'واجهة Process API',
    'visitor&#x27;s own token': 'برمز الزائر نفسه',
    'Terrain tiles': 'tiles التضاريس',
    'AWS Terrarium,': 'AWS Terrarium',
    'MapTiler Terrain-RGB': 'وMapTiler Terrain-RGB',
    'Weather APIs': 'واجهات الطقس',
    'Open-Meteo,': 'Open-Meteo',
    'NASA POWER': 'وNASA POWER',
    'Overpass + bundled': 'Overpass مع نسخة',
    'snapshot fallback': 'محفوظة احتياطية',
    'A · LIVE IN THE BROWSER': 'أ · مباشرة في المتصفح',
    'Blue Nile · Riyadh Urban Heat': 'النيل الأزرق · حرارة الرياض',
    'B · PRECOMPUTE ONCE': 'ب · حساب مسبق مرة واحدة',
    'GeoAI Crop Monitoring, Al Jouf': 'مراقبة المحاصيل، الجوف',
    'C · TRAINED MODELS': 'ج · نماذج مدرَّبة',
    'Train offline, infer in browser': 'تدريب دون اتصال، واستدلال في المتصفح',
    'NEXT': 'قادم',
    'Band math on tile server': 'حساب النطاقات في خادم الـtiles',
    'dB, °C and NDVI upstream,': 'dB و°م وNDVI عند المصدر،',
    'sent as byte-encoded PNGs': 'وتُرسل صور PNG مرمّزة بالبايت',
    'Exact decode': 'فك ترميز دقيق',
    'createImageBitmap with no': 'createImageBitmap دون',
    'colour or alpha changes': 'أي تغيير في الألوان أو الشفافية',
    'Tile grid = analysis grid': 'شبكة الـtiles = شبكة التحليل',
    'Web Mercator typed arrays,': 'مصفوفات بإسقاط Web Mercator،',
    '1.2–1.6 million cells': 'من 1.2 إلى 1.6 مليون خلية',
    'Analysis on the device': 'التحليل على الجهاز',
    'distance transforms, blurs,': 'تحويلات المسافة وbox blurs،',
    'k-means, TensorFlow.js GPU': 'وk-means وTensorFlow.js على GPU',
    'STAC + Rasterio reads': 'قراءات STAC وRasterio',
    'only the Al Jouf window,': 'نافذة الجوف فقط،',
    'never the whole scene': 'لا المشهد كاملًا أبدًا',
    'NumPy: indices &amp; series': 'NumPy: المؤشرات والسلاسل',
    'NDVI, EVI, masks, composite,': 'NDVI وEVI والأقنعة والمركّب،',
    'bincount per field': 'وbincount لكل حقل',
    'OpenCV: find the fields': 'OpenCV: رصد الحقول',
    'Hough circles for pivots,': 'دوائر Hough للمحاور،',
    'contours for block fields': 'وحدود للحقول المستطيلة',
    'Static JSON + live tiles': 'JSON ثابت + tiles حية',
    '+ live tiles for any date': '+ tiles حية لأي تاريخ',
    'Train offline': 'التدريب دون اتصال',
    'U-Net and LightGBM on open': 'U-Net وLightGBM على بيانات',
    'and hand-labelled data': 'مفتوحة وموسومة يدويًا',
    'Export to ONNX': 'التصدير إلى ONNX',
    'quantised to a few MB': 'مضغوط إلى بضعة ميغابايت',
    '(int8 or fp16)': '(int8 أو fp16)',
    'Model as a static file': 'النموذج ملف ثابت',
    'served like any other asset': 'يُقدَّم كأي ملف آخر',
    'from shared hosting': 'من استضافة مشتركة',
    'Inference in the browser': 'الاستدلال في المتصفح',
    'with a WebAssembly fallback': 'مع بديل WebAssembly',
    'Static hosting': 'استضافة ثابتة',
    'Next.js static export on shared hosting: HTML, JS, JSON, snapshots and ONNX models. No VPS, no database, no tile server.':
        'تصدير Next.js ثابت على استضافة مشتركة: HTML وJS وJSON ونسخ محفوظة ونماذج ONNX. بلا خادم افتراضي ولا قاعدة بيانات ولا خادم tiles.',
    'The visitor&#x27;s browser': 'متصفح الزائر',
    'MapLibre GL, Chart.js, MUI. Results are painted to a canvas and overlaid on the map, aligned to the grid.':
        'MapLibre GL وChart.js وMUI. تُرسم النتائج على canvas وتوضع فوق الخريطة متطابقة مع الشبكة.',
}

ARIA = {
    'Planetary Computer': 'Planetary Computer',
    'Sentinel Hub / CDSE': 'Sentinel Hub / CDSE',
    'Terrain tiles': 'tiles التضاريس',
    'Weather APIs': 'واجهات الطقس',
    'OpenStreetMap': 'OpenStreetMap',
    'Band math on tile server': 'حساب النطاقات في خادم الـtiles',
    'Exact decode': 'فك ترميز دقيق',
    'Tile grid = analysis grid': 'شبكة الـtiles = شبكة التحليل',
    'Analysis on the device': 'التحليل على الجهاز',
    'STAC + Rasterio reads': 'قراءات STAC وRasterio',
    'NumPy: indices &amp; series': 'NumPy: المؤشرات والسلاسل',
    'OpenCV: find the fields': 'OpenCV: رصد الحقول',
    'Static JSON + live tiles': 'JSON ثابت + tiles حية',
    'Train offline': 'التدريب دون اتصال',
    'Export to ONNX': 'التصدير إلى ONNX',
    'Model as a static file': 'النموذج ملف ثابت',
    'Inference in the browser': 'الاستدلال في المتصفح',
    'Static hosting': 'استضافة ثابتة',
    'The visitor&#x27;s browser': 'متصفح الزائر',
    'Route A: A · LIVE IN THE BROWSER': 'المسار أ: مباشرة في المتصفح',
    'Route B: B · PRECOMPUTE ONCE': 'المسار ب: حساب مسبق مرة واحدة',
    'Route C: C · TRAINED MODELS': 'المسار ج: نماذج مدرَّبة',
    'Serverless GeoAI architecture': 'معمارية الذكاء الجيومكاني بلا خوادم',
}

# ---- Node descriptions (the page's D object) ---------------------------------
D_AR = {
 "pc": {"k": "بيانات عامة", "t": "Microsoft Planetary Computer", "p": [
   "مصدر البيانات الرئيسي للمشاريع الثلاثة. يجد كتالوج STAC الخاص به المشاهد، وتُنتج واجهة البيانات الـtiles لحظيًا، مع حساب النطاقات وخرائط الألوان على خوادمه.",
   "المجموعات المستخدمة: Sentinel-1 RTC (رادار)، وSentinel-2 L2A (بصري)، وLandsat 8/9 Collection 2 Level-2 (حرارة السطح)، وESA WorldCover 2021 (الغطاء الأرضي). لا حاجة إلى حساب أو مفتاح."],
   "u": ["النيل الأزرق", "الرياض", "الجوف", "المسار ج"]},
 "sh": {"k": "بيانات عامة", "t": "Sentinel Hub / Copernicus Data Space", "p": [
   "مصدر رادار اختياري لمشروع النيل الأزرق. يعيد سكربت evalscript قيم VV/VH بالديسيبل للشبكة كلها في استدعاء واحد لواجهة Process API.",
   "يجري تسجيل الدخول عبر OAuth في المتصفح (نقطتا الرموز تسمحان بـCORS) ببيانات الزائر نفسه. لا يُخزَّن شيء، ولا يظهر أي مفتاح لي في الصفحة."],
   "u": ["النيل الأزرق"]},
 "ter": {"k": "بيانات عامة", "t": "tiles التضاريس", "p": [
   "ارتفاعات مرمّزة في قنوات الألوان لـtiles PNG عادية. AWS Terrarium بلا مفتاح؛ ويُستخدم MapTiler Terrain-RGB عند ضبط مفتاح.",
   "تُفك لكل بكسل إلى Float32Array، ثم تُستخدم لحساب الانحدار والارتفاع فوق أقرب نهر."],
   "c": "Terrarium:     h = R*256 + G + B/256 - 32768\nTerrain-RGB:   h = (R*65536 + G*256 + B)*0.1 - 10000",
   "u": ["النيل الأزرق"]},
 "wx": {"k": "بيانات عامة", "t": "واجهات الطقس", "p": [
   "يمنح Open-Meteo مشروع النيل الأزرق بيانات الأمطار: طلب واحد لشبكة 7 × 7 من 49 نقطة، مجموعة على الفترة المختارة ومستكملة لكل خلية.",
   "ويمنح NASA POWER مشروع الرياض حرارة الهواء والإشعاع الشمسي (متوسط أقصى يومي 44 °م في صيف 2025). كلاهما بلا مفتاح."],
   "u": ["النيل الأزرق", "الرياض"]},
 "osm": {"k": "بيانات عامة", "t": "OpenStreetMap عبر Overpass", "p": [
   "الأنهار لمشروع النيل الأزرق، والأشجار والحدائق لمشروع الرياض. تُحوَّل الخطوط والمضلعات إلى خلايا على شبكة التحليل.",
   "خوادم Overpass العامة مزدحمة غالبًا (أخطاء 504، واستجابة استغرقت 85 ثانية في الاختبار)، لذا تبدأ الصفحات من نسخة محفوظة مرفقة وتستبدلها بالبيانات الحية عندما يستجيب أحد الخوادم."],
   "u": ["النيل الأزرق", "الرياض"]},
 "laneA": {"k": "المسار أ", "t": "مباشرة في المتصفح", "p": [
   "يُستخدم عندما تعتمد النتيجة على اختيارات الزائر: التواريخ، وعتبات الرادار، وأوزان النموذج. يُعاد حساب كل شيء على جهازه، فتحدّث أشرطة التمرير الخريطة في ثوانٍ.",
   "النيل الأزرق: نحو 1.2 مليون خلية بدقة 300 م، والمسار كاملًا في نحو 13 ثانية على حاسوب محمول. الرياض: 1.6 مليون خلية بدقة 70 م."],
   "u": ["النيل الأزرق", "الرياض"]},
 "laneB": {"k": "المسار ب", "t": "حساب مسبق مرة واحدة، وبث حي", "p": [
   "يُستخدم عندما تكون الإجابة واحدة للجميع وثقيلة جدًا على الإعادة في كل زيارة: كل مشهد Sentinel-2 منذ أبريل 2023 × كل حقل في الجوف.",
   "يكتب مسار Python يعمل دون اتصال ملفين صغيرين؛ ويحمّلهما الموقع ويبث الصور الحية لأي تاريخ. الموقع لا يشغّل Python أبدًا."],
   "u": ["الجوف"]},
 "laneC": {"k": "المسار ج · قادم", "t": "نماذج مدرَّبة في المتصفح", "p": [
   "الخطوة التالية للمشاريع: استبدال القواعد والعتبات المضبوطة يدويًا بنماذج مدرَّبة، دون إضافة خادم.",
   "يجري التدريب دون اتصال (كالمسار ب)، ويعمل الاستدلال على جهاز الزائر (كالمسار أ). النموذج مجرد ملف ثابت آخر."],
   "u": ["المسار ج"]},
 "a1": {"k": "المسار أ · الخطوة 1", "t": "حساب النطاقات في خادم الـtiles", "p": [
   "يحوّل خادم الـtiles القيم الخام إلى وحدات فيزيائية قبل أن يصل أي شيء إلى المتصفح، ثم يضعها في بايت (0–255) من قناة PNG بإعادة التحجيم.",
   "كلفة الدقة صغيرة ومعروفة: نحو 0.16 dB للرادار و0.24 °م للحرارة، وكلاهما أدق من ضوضاء المستشعرات نفسها."],
   "c": "# Sentinel-1 to decibels (Blue Nile)\nexpression = 10*log10(vv);10*log10(vh);10*log10(vv)\nrescale    = -35,5\n\n# Landsat surface temperature to °C (Riyadh)\nexpression = lwir11*0.00341802+149.0-273.15\nrescale    = 10,70",
   "u": ["النيل الأزرق", "الرياض"]},
 "a2": {"k": "المسار أ · الخطوة 2", "t": "فك ترميز دقيق في المتصفح", "p": [
   "تدير المتصفحات ألوان الصور، وهذا صحيح للصور الفوتوغرافية وخاطئ بصمت للبيانات. تُفك كل tile بيانات مع إيقاف تحويل الألوان وضرب الشفافية المسبق، فيصل كل بايت دون تغيير.",
   "ثم يُعاد كل بايت إلى dB أو °م أو NDVI أو أمتار."],
   "c": "const bitmap = await createImageBitmap(blob, {\n  colorSpaceConversion: 'none',\n  premultiplyAlpha: 'none',\n});\nctx.drawImage(bitmap, 0, 0);\nconst px = ctx.getImageData(0, 0, bitmap.width, bitmap.height);",
   "u": ["النيل الأزرق", "الرياض"]},
 "a3": {"k": "المسار أ · الخطوة 3", "t": "شبكة الـtiles هي شبكة التحليل", "p": [
   "القرار الذي يُلغي الحاجة إلى حزمة نظم المعلومات الجغرافية. يجري التحليل على شبكة بكسلات Web Mercator لمستوى تكبير واحد، وهي الشبكة نفسها التي تستخدمها tiles الخريطة، فيقع كل بكسل على خلية واحدة بالضبط. لا إعادة إسقاط، ولا إعادة معاينة، ولا GDAL.",
   "النيل الأزرق: مستوى التكبير 9، خلايا نحو 300 م، و1.2 مليون خلية. الرياض: مستوى التكبير 11، خلايا نحو 70 م، 1,456 × 1,117. تُحفظ الطبقات في Float32Array وUint8Array."],
   "u": ["النيل الأزرق", "الرياض"]},
 "a4": {"k": "المسار أ · الخطوة 4", "t": "التحليل على جهاز الزائر", "p": [
   "خوارزميات مختارة لتعمل في زمن خطي على مليون خلية: تحويلات المسافة الإقليدية الدقيقة (Felzenszwalb وHuttenlocher)، وSeparable box blurs with running sums، وk-means بتهيئة من الكميات.",
   "يقيّم مشروع الرياض 1.6 مليون خلية كضرب مصفوفات واحد في TensorFlow.js على GPU (WebGL)، ولا يُحمَّل إلا في تلك الصفحة. تُرسم النتائج على canvas وتوضع فوق الخريطة."],
   "u": ["النيل الأزرق", "الرياض"]},
 "b1": {"k": "المسار ب · الخطوة 1 · pystac-client وRasterio", "t": "Rasterio يجلب البكسلات", "p": [
   "يجد pystac-client مشاهد Sentinel-2 في كتالوج Planetary Computer. ثم يقرأ Rasterio كل ملف GeoTIFF محسّن للسحابة عبر HTTP، لكن نافذة الجوف فقط، نطاقًا نطاقًا (B02 وB04 وB08 وقناع الغيوم SCL).",
   "تحتفظ كل مصفوفة بإسنادها الجغرافي، فتبقى البكسلات مرتبطة بإحداثيات حقيقية. تجري القراءات في خيوط متوازية وتُخزَّن مؤقتًا، فلا تجلب إعادة التشغيل إلا المشاهد الجديدة."],
   "c": "from rasterio.windows import from_bounds\n\nwith rasterio.open(signed_href) as src:\n    win = from_bounds(*aoi_bounds_utm, transform=src.transform)\n    nir = src.read(1, window=win)",
   "u": ["الجوف"]},
 "b2": {"k": "المسار ب · الخطوة 2 · NumPy", "t": "NumPy يتولى الحساب", "p": [
   "يجري كل الحساب على المصفوفات كاملة دفعة واحدة: إزالة الإزاحة +1000، وتحجيم الانعكاسية إلى 0–1، وNDVI وEVI لكل بكسل، وحجب الغيوم، ومركّب أقصى NDVI المستخدم لرصد الحقول.",
   "تُحوَّل الحقول مرة واحدة إلى صورة وسوم؛ ثم يحسب np.bincount متوسط بكسلات كل حقل في مرور واحد. آلاف الحقول تكلّف تقريبًا ما يكلّفه حقل واحد."],
   "c": "sums   = np.bincount(labels[clear], weights=ndvi[clear], minlength=n)\ncounts = np.bincount(labels[clear], minlength=n)\nfield_mean = sums / np.maximum(counts, 1)",
   "u": ["الجوف"]},
 "b3": {"k": "المسار ب · الخطوة 3 · OpenCV", "t": "OpenCV يرى الأشكال", "p": [
   "يُعامل مركّب NDVI كصورة فوتوغرافية. تقترح HoughCircles محاور بنصف قطر 200–480 م (20–48 بكسلًا بدقة 10 م)؛ ويُبقي فحص الخضرة واختبار تباين الحافة على الحقيقية منها فقط.",
   "تنظّف العمليات المورفولوجية المساحات الخضراء المتبقية، ويُبقي connectedComponentsWithStats الحقول التي تزيد على 8 هكتارات، ويحوّلها findContours مع approxPolyDP إلى مضلعات. هذه رؤية حاسوبية كلاسيكية: قواعد، دون بيانات تدريب."],
   "c": "circles = cv2.HoughCircles(blurred, cv2.HOUGH_GRADIENT,\n                           minRadius=20, maxRadius=48, ...)",
   "u": ["الجوف"]},
 "b4": {"k": "المسار ب · الخطوة 4", "t": "JSON ثابت وصور حية", "p": [
   "يحوّل Shapely وpyproj الأشكال إلى مضلعات مرسومة (مساحات، WGS 84). يكتب المسار fields.geojson وtimeseries.json، ويُرفعان بجوار التطبيق كأي ملف آخر.",
   "لا تُخزَّن الصور أبدًا. عندما يحرّك الزائر شريط الزمن، تطلب الخريطة tile NDVI أو EVI أو الألوان الحقيقية لذلك التاريخ مباشرة من Planetary Computer."],
   "c": "expression = (B08-B04)/(B08+B04-2000)   # NDVI, offset folded in\nrescale    = 0,0.8\ncolormap   = rdylgn",
   "u": ["الجوف"]},
 "c1": {"k": "المسار ج · الخطوة 1 · مخطط", "t": "التدريب دون اتصال", "p": [
   "تدريب نماذج صغيرة على موارد حوسبة مجانية: شبكة U-Net لمياه الفيضانات على Sentinel-1 (معيار Sen1Floods11 مع مشاهد السودان 2020 الموسومة يدويًا)، ومصنّف محاصيل LightGBM للجوف.",
   "التحقق على مناطق لم يرها النموذج، والإبقاء على قواعد اليوم خط أساس يجب التفوق عليه."],
   "u": ["المسار ج"]},
 "c2": {"k": "المسار ج · الخطوة 2 · مخطط", "t": "التصدير إلى ONNX", "p": [
   "تصدير النموذج المدرَّب إلى ONNX، الصيغة المحمولة التي تستطيع المتصفحات تشغيلها، وضغطه (int8 أو fp16) إلى بضعة ميغابايت ليُحمَّل بسرعة على اتصال مكتب ميداني."],
   "u": ["المسار ج"]},
 "c3": {"k": "المسار ج · الخطوة 3 · مخطط", "t": "النموذج ملف ثابت", "p": [
   "يوضع ملف ‎.onnx على الاستضافة المشتركة بجوار JavaScript وJSON. لا خادم نماذج، ولا خادم GPU، ولا كلفة لكل طلب."],
   "u": ["المسار ج"]},
 "c4": {"k": "المسار ج · الخطوة 4 · مخطط", "t": "الاستدلال في المتصفح", "p": [
   "يشغّل ONNX Runtime Web النموذج على GPU الزائر عبر WebGPU، مع بديل WebAssembly. تدخل الـtiles عبر خطوتي فك الترميز والشبكة في المسار أ؛ ويحل النموذج محل العتبات.",
   "ستعرض اللوحة العتبات والنموذج جنبًا إلى جنب، مع دقة كل منهما."],
   "c": "const session = await ort.InferenceSession.create(\n  '/models/floodnet.onnx',\n  { executionProviders: ['webgpu', 'wasm'] });",
   "u": ["المسار ج"]},
 "host": {"k": "التقديم", "t": "استضافة ثابتة", "p": [
   "تصدير Next.js ثابت على استضافة مشتركة عادية: HTML وJavaScript ومخرجات JSON ونسخ محفوظة مرفقة، وقريبًا نماذج ONNX.",
   "بلا خادم افتراضي، ولا قاعدة بيانات، ولا خادم tiles يحتاج إلى تحديث أو دفع لكل طلب."],
   "u": ["النيل الأزرق", "الرياض", "الجوف", "المسار ج"]},
 "browser": {"k": "التقديم", "t": "متصفح الزائر", "p": [
   "يرسم MapLibre GL الخريطة، وChart.js السلاسل الزمنية، وMUI أدوات التحكم. تُرسم النتائج على canvas وتُضاف مصدرَ صورة بإحداثيات أركانه الأربعة، فتتطابق تمامًا مع الخريطة الأساسية.",
   "لا تُحمَّل المكتبات الثقيلة مثل TensorFlow.js إلا في الصفحات التي تستخدمها."],
   "u": ["النيل الأزرق", "الرياض", "الجوف", "المسار ج"]},
}
P_LABELS_AR = {
    'bluenile': 'مخاطر فيضانات النيل الأزرق',
    'riyadh': 'الحرارة الحضرية في الرياض',
    'aljouf': 'مراقبة المحاصيل في الجوف',
    'next': 'المسار ج: نماذج مدرَّبة (قادم)',
}

out = src

# Page language, direction and fonts
out = out.replace('<html lang="en" data-theme="light">', '<html lang="ar" dir="rtl" data-theme="light">')
out = out.replace('<title>Serverless GeoAI Architecture</title>', '<title>معمارية الذكاء الجيومكاني بلا خوادم</title>')
out = out.replace('content="Interactive architecture of CoffeeMap.dev: satellite analysis with no VPS, no database and no Python at runtime."',
                  'content="معمارية CoffeeMap.dev التفاعلية: تحليل صور الأقمار الصناعية بلا خادم افتراضي ولا قاعدة بيانات ولا Python وقت التشغيل."')
out = out.replace('<style>\n', "<style>\n@font-face{font-family:'Cairo';src:url(/fonts/Cairo-Arabic.woff2) format('woff2');font-weight:200 1000;font-display:swap;unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}\n", 1)
out = out.replace('font:15px/1.55 Inter,system-ui,', "font:15px/1.7 Cairo,Inter,system-ui,")
# Code stays left-to-right; SVG labels use the Arabic font too.
out = out.replace('.panel pre{', '.panel pre{direction:ltr;text-align:left;', 1)
# The SVG inherits direction:rtl, so text-anchor "start" is each label's right edge.
out = out.replace('.legend i{display:inline-block;width:22px;height:0;border-top:2px solid var(--edge);vertical-align:middle;margin-right:6px}',
                  '.legend i{display:inline-block;width:22px;height:0;border-top:2px solid var(--edge);vertical-align:middle;margin-left:6px}')

# Visible text outside the SVG
for en, ar in [
    ('<h1>Serverless GeoAI: the architecture</h1>', '<h1>الذكاء الجيومكاني بلا خوادم: المعمارية</h1>'),
    ('<p class="sub">Three CoffeeMap.dev projects · no VPS · no database · no Python at runtime</p>',
     '<p class="sub">ثلاثة مشاريع من CoffeeMap.dev · بلا خادم افتراضي · بلا قاعدة بيانات · بلا Python وقت التشغيل</p>'),
    ('aria-label="Filter by project"', 'aria-label="التصفية حسب المشروع"'),
    ('<span class="dot all"></span>All routes', '<span class="dot all"></span>كل المسارات'),
    ('<span class="dot a"></span>Blue Nile Flood Risk', '<span class="dot a"></span>مخاطر فيضانات النيل الأزرق'),
    ('<span class="dot a"></span>Riyadh Urban Heat', '<span class="dot a"></span>الحرارة الحضرية في الرياض'),
    ('<span class="dot b"></span>Al Jouf Crop Monitoring', '<span class="dot b"></span>مراقبة المحاصيل في الجوف'),
    ('<span class="dot c"></span>Route C: trained models (next)', '<span class="dot c"></span>المسار ج: نماذج مدرَّبة (قادم)'),
    ('aria-pressed="false">Animate data flow</button>', 'aria-pressed="false">تحريك تدفق البيانات</button>'),
    ('aria-pressed="false">▶ Walk me through</button>', 'aria-pressed="false">▶ جولة إرشادية</button>'),
    ('<span><i></i>Live and running</span><span><i class="dash"></i>Planned: Route C</span><span>Click any box for details</span>',
     '<span><i></i>يعمل الآن</span><span><i class="dash"></i>مخطط: المسار ج</span><span>انقر أي مربع للتفاصيل</span>'),
    ('<p class="kick">How to read this</p><h2>Two routes live, one on the way</h2><p>Every box is clickable. Pick a project above to light up the path its data takes, turn on the data flow, or press <b>Walk me through</b> for a guided tour.</p><p><b style="color:var(--a)">Route A</b> computes everything in the visitor\'s browser. <b style="color:var(--b)">Route B</b> precomputes once offline and streams imagery live. <b style="color:var(--c)">Route C</b> (next) trains models offline and runs them in the browser.</p><div class="uses"><span>No VPS</span><span>No database</span><span>No Python at runtime</span></div>',
     '<p class="kick">كيف تقرأ المخطط</p><h2>مساران يعملان، وثالث في الطريق</h2><p>كل مربع قابل للنقر. اختر مشروعًا في الأعلى لإضاءة المسار الذي تسلكه بياناته، أو شغّل تدفق البيانات، أو اضغط <b>جولة إرشادية</b>.</p><p><b style="color:var(--a)">المسار أ</b> يحسب كل شيء في متصفح الزائر. <b style="color:var(--b)">المسار ب</b> يحسب مسبقًا مرة واحدة دون اتصال ويبث الصور حية. <b style="color:var(--c)">المسار ج</b> (قادم) يدرّب النماذج دون اتصال ويشغّلها في المتصفح.</p><div class="uses"><span>بلا خادم افتراضي</span><span>بلا قاعدة بيانات</span><span>بلا Python وقت التشغيل</span></div>'),
    ('<p class="rule">Rule of thumb: if it depends on the visitor\'s settings, compute it in the browser. If it is the same for everyone, compute it once and ship it as a file.</p>',
     '<p class="rule">القاعدة العامة: إن كان يعتمد على إعدادات الزائر فاحسبه في المتصفح، وإن كان واحدًا للجميع فاحسبه مرة واحدة وقدّمه ملفًا.</p>'),
    ('<p class="foot"><b>Amin Adnan Gasim</b> · <a href="https://coffeemap.dev">coffeemap.dev</a></p>',
     '<p class="foot"><b>أمين عدنان قاسم</b> · <a href="https://coffeemap.dev/ar/" target="_top">coffeemap.dev</a></p>'),
]:
    assert en in out, en[:60]
    out = out.replace(en, ar)

# ---- SVG: translate, then mirror each box's contents --------------------------
svg_start, svg_end = out.index('<svg id="arch"'), out.index('</svg>') + 6
svg = out[svg_start:svg_end]

def tr_text(m):
    inner = m.group(2)
    if inner in SVG:
        return m.group(1) + SVG[inner] + m.group(3)
    if re.fullmatch(r'\d', inner) or inner in ('Planetary Computer', 'Sentinel Hub / CDSE', 'OpenStreetMap', 'fields.geojson + timeseries', 'ONNX Runtime Web, WebGPU'):
        return m.group(0)
    sys.exit(f'untranslated SVG text: {inner!r}')
svg = re.sub(r'(<text[^>]*>)([^<]*)(</text>)', tr_text, svg)
for en, ar in ARIA.items():
    svg = svg.replace(f'aria-label="{en}"', f'aria-label="{ar}"')

def mirror_group(m):
    g = m.group(0)
    rect = re.search(r'<rect(?: class="lane-bg")? x="([\d.]+)" y="[\d.]+" width="([\d.]+)"', g)
    if not rect:
        return g
    x0, w = float(rect.group(1)), float(rect.group(2))
    flip = lambda x: x0 + w - (x - x0)
    fmt = lambda v: str(int(v)) if v == int(v) else str(v)
    # Text starting at the left edge -> ends at the right edge.
    def text(t):
        tag = t.group(0)
        x = float(re.search(r' x="([\d.]+)"', tag).group(1))
        return re.sub(r' x="[\d.]+"', f' x="{fmt(flip(x))}"', tag, count=1)
    g = re.sub(r'<text [^>]*>', text, g)
    g = re.sub(r'<circle cx="([\d.]+)"', lambda c: f'<circle cx="{fmt(flip(float(c.group(1))))}"', g)
    # The NEXT badge (a small rect after the lane rect) moves to the left.
    def badge(b):
        bx, by, bw, bh = (float(v) for v in b.groups())
        return f'<rect x="{fmt(x0 + w - (bx - x0) - bw)}" y="{fmt(by)}" width="{fmt(bw)}" height="{fmt(bh)}" rx="11" class="badge"/>'
    g = re.sub(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="11" class="badge"/>', badge, g)
    return g
svg = re.sub(r'<g class="(?:lane|node)[^"]*"[^>]*>.*?</g>', mirror_group, svg, flags=re.S)
# Row title at the far right.
svg = svg.replace('<text x="30" y="14" class="row-t">', '<text x="970" y="14" class="row-t">')
out = out[:svg_start] + svg + out[svg_end:]

# ---- Script data and UI strings --------------------------------------------
d_start = out.index('const D = ') + len('const D = ')
d_end = out.index(', P = {', d_start)
D_en = json.loads(out[d_start:d_end])
assert set(D_en) == set(D_AR), set(D_en) ^ set(D_AR)
for k in D_en:  # code blocks must stay identical
    assert D_en[k].get('c') == D_AR[k].get('c'), k
out = out[:d_start] + json.dumps(D_AR, ensure_ascii=False) + out[d_end:]

p_start = out.index(', P = ') + len(', P = ')
p_end = out.index(', ALL_TOUR', p_start)
P = json.loads(out[p_start:p_end])
for k, label in P_LABELS_AR.items():
    P[k]['label'] = label
out = out[:p_start] + json.dumps(P, ensure_ascii=False) + out[p_end:]

for en, ar in [
    ("${i===0?'disabled':''}>← Previous</button>", "${i===0?'disabled':''}>→ السابق</button>"),
    ("${i===order.length-1?'disabled':''}>Next →</button>", "${i===order.length-1?'disabled':''}>التالي ←</button>"),
    ("b.textContent='▶ Walk me through'", "b.textContent='▶ جولة إرشادية'"),
    ("b.textContent='■ Stop'", "b.textContent='■ إيقاف'"),
]:
    assert en in out, en
    out = out.replace(en, ar)

open(ROOT + 'ar/serverless-geoai-architecture.html', 'w', encoding='utf-8').write(out)
print('ok', len(out))
