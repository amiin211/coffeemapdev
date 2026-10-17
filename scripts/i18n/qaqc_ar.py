# Builds public/projects-static/ar/geospatial-qaqc-workbench.html from the English
# page. The data objects (P, ERR, E, PH) keep their English source; a translation
# table is applied to them at load time, so code snippets and logic stay identical.
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qaqc_ar_1 import AR as A1
from qaqc_ar_2 import AR as A2
from qaqc_ar_3 import AR as A3

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', 'public', 'projects-static') + os.sep
src = open(ROOT + 'geospatial-qaqc-workbench.html', encoding='utf-8').read()
strings = json.load(open(os.path.join(HERE, 'qaqc_strings.json'), encoding='utf-8'))
AR = {**A1, **A2, **A3}
missing = [i for i in range(len(strings)) if i not in AR]
if missing:
    sys.exit(f'missing translations: {missing}')
TR = {strings[i]: AR[i] for i in range(len(strings))}

out = src

def rep(en, ar, count=1):
    global out
    if en not in out:
        sys.exit(f'not found: {en[:80]!r}')
    out = out.replace(en, ar, count)

# ---- document, fonts, direction ---------------------------------------------
rep('<html lang="en" data-theme="light">', '<html lang="ar" dir="rtl" data-theme="light">')
rep('<title>Geospatial QA/QC Workbench</title>', '<title>منصة ضبط وضمان جودة البيانات الجيومكانية</title>')
rep('content="Hands-on QA/QC for orthoimagery, elevation models, topographic vector data and land cover maps: what to check, how to check it in ArcGIS Pro, QGIS and code, and the ISO 19157-1 quality element behind each step."',
    'content="ضبط وضمان الجودة عمليًا للصور المصححة ونماذج الارتفاع والبيانات الطبوغرافية المتجهية وخرائط الغطاء الأرضي: ماذا تفحص، وكيف تفحصه في ArcGIS Pro وQGIS والشيفرة، وعنصر الجودة وفق ISO 19157-1 خلف كل خطوة."')
rep('<style>\n', "<style>\n@font-face{font-family:'Cairo';src:url(/fonts/Cairo-Arabic.woff2) format('woff2');font-weight:200 1000;font-display:swap;unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}\n")
rep('font:15px/1.55 Inter,system-ui,', 'font:15px/1.75 Cairo,Inter,system-ui,')
# Code, numbers and the residuals box stay left-to-right.
rep('pre{background:var(--code);', 'pre{direction:ltr;text-align:left;background:var(--code);')
rep('textarea{min-height:180px;', 'textarea{direction:ltr;text-align:left;min-height:180px;')
rep('.detail ul,.detail ol{margin:0;padding-left:20px}', '.detail ul,.detail ol{margin:0;padding-right:20px;padding-left:0}')
rep('table.cm input{width:64px;padding:4px 6px;text-align:right}', 'table.cm input{direction:ltr;width:64px;padding:4px 6px;text-align:right}')
rep('table.std th,table.std td{text-align:left;', 'table.std th,table.std td{text-align:right;')
rep('.prod{text-align:left;', '.prod{text-align:right;')
rep('.step{display:flex;gap:10px;text-align:left;', '.step{display:flex;gap:10px;text-align:right;')
rep('.err{background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:8px;text-align:left}', '.err{background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:8px;text-align:right}')
rep('.fact b{color:var(--muted);font-weight:600;margin-right:4px}', '.fact b{color:var(--muted);font-weight:600;margin-left:4px}')
rep('.detail .kick{font-size:12px;font-weight:700;letter-spacing:.08em;', '.detail .kick{font-size:12px;font-weight:700;letter-spacing:0;')

# ---- static page text --------------------------------------------------------
for en, ar in [
    ('<h1>Geospatial QA/QC Workbench</h1>', '<h1>منصة ضبط وضمان جودة البيانات الجيومكانية</h1>'),
    ('<p class="sub"><b>QA/QC</b> means checking a delivered dataset against its specification before anyone uses it. Pick the product you are checking. Each step shows <b>what to check</b>, <b>how to do it</b> in ArcGIS Pro, QGIS and code, the <b>ISO 19157-1</b> quality element it tests, and the <b>errors</b> it catches.</p>',
     '<p class="sub"><b>ضبط الجودة وضمانها (QA/QC)</b> يعني فحص مجموعة البيانات المسلَّمة مقابل مواصفتها قبل أن يستخدمها أحد. اختر المنتج الذي تفحصه. تعرض كل خطوة <b>ماذا تفحص</b>، و<b>كيف تنفّذه</b> في ArcGIS Pro وQGIS والشيفرة، وعنصر الجودة وفق <b>ISO 19157-1</b> الذي تختبره، و<b>الأخطاء</b> التي ترصدها.</p>'),
    ('aria-label="Sections"', 'aria-label="الأقسام"'),
    ('id="b-work">Workflow by product</button>', 'id="b-work">سير العمل حسب المنتج</button>'),
    ('id="b-tools">Calculators</button>', 'id="b-tools">الحاسبات</button>'),
    ('id="b-el">ISO quality elements</button>', 'id="b-el">عناصر الجودة وفق ISO</button>'),
    ('id="b-std">Standards</button>', 'id="b-std">المواصفات</button>'),
    ('aria-label="Choose a product"', 'aria-label="اختر منتجًا"'),
    ('aria-label="Steps"', 'aria-label="الخطوات"'),
    ('<h2>Typical errors in this product</h2>', '<h2>أخطاء شائعة في هذا المنتج</h2>'),
    ('<p class="small muted">Click an error to see what it is, why it matters and which step catches it.</p>', '<p class="small muted">انقر خطأً لترى ما هو، ولماذا يهم، وأي خطوة ترصده.</p>'),
    ('aria-label="Calculators"', 'aria-label="الحاسبات"'),
    ('data-sub="c-aql">Sample size (ISO 2859-1)</button>', 'data-sub="c-aql">حجم العينة (ISO 2859-1)</button>'),
    ('data-sub="c-pos">Positional accuracy</button>', 'data-sub="c-pos">الدقة الموضعية</button>'),
    ('data-sub="c-cm">Confusion matrix</button>', 'data-sub="c-cm">مصفوفة الالتباس</button>'),
    ('<h2>How many items to inspect?</h2>', '<h2>كم عنصرًا يجب فحصه؟</h2>'),
    ('<p class="muted small">For manual review you inspect a sample. Enter the number of items in the lot, for example map tiles, 1 km grid cells, buildings or DEM tiles.</p>',
     '<p class="muted small">في المراجعة اليدوية تفحص عينة. أدخل عدد العناصر في الدفعة، مثل tiles الخريطة، أو خلايا شبكة 1 كم، أو المباني، أو tiles نموذج الارتفاع.</p>'),
    ('<label for="lot">Lot size (items in the lot)</label>', '<label for="lot">حجم الدفعة (عدد العناصر فيها)</label>'),
    ('<label for="lvl">Inspection level</label>', '<label for="lvl">مستوى الفحص</label>'),
    ('<option value="I">General I (lighter)</option><option value="II" selected>General II (default)</option><option value="III">General III (stricter)</option>',
     '<option value="I">عام I (أخف)</option><option value="II" selected>عام II (افتراضي)</option><option value="III">عام III (أشد)</option>'),
    ('<label for="aql">AQL, % defective allowed</label>', '<label for="aql">AQL، نسبة العيوب المسموحة %</label>'),
    ('<label for="found">Defective items found in the sample</label>', '<label for="found">العناصر المعيبة الموجودة في العينة</label>'),
    ('<h2>Sampling plan</h2>', '<h2>خطة المعاينة</h2>'),
    ('<div class="k">Code letter</div>', '<div class="k">الحرف الرمزي</div>'),
    ('<div class="k">Inspect (n)</div>', '<div class="k">افحص (n)</div>'),
    ('<div class="k">Accept if ≤</div>', '<div class="k">اقبل إذا ≤</div>'),
    ('<div class="k">Reject if ≥</div>', '<div class="k">ارفض إذا ≥</div>'),
    ('<p class="note">Single sampling, normal inspection (ISO 2859-1 Table 1 and Table 2-A). Pick the sample at random, for example with ArcGIS Pro <i>Subset Features</i> or QGIS <i>Random selection</i>. Confirm plans for contractual work against the standard.</p>',
     '<p class="note">معاينة مفردة، فحص عادي (ISO 2859-1 الجدول 1 والجدول 2-A). اختر العينة عشوائيًا، مثلًا بأداة <i>Subset Features</i> في ArcGIS Pro أو <i>Random selection</i> في QGIS. تحقق من الخطط للأعمال التعاقدية مقابل المواصفة نفسها.</p>'),
    ('<h2>RMSE, CE90 and LE90 from check points</h2>', '<h2>RMSE وCE90 وLE90 من نقاط التحقق</h2>'),
    ('<p class="muted small">One point per line: <code>dx, dy</code> or <code>dx, dy, dz</code> in metres (dataset minus check point). Export them from ArcGIS Pro <i>Extract Values to Points</i> or QGIS <i>Sample raster values</i> and paste here.</p>',
     '<p class="muted small">نقطة واحدة في كل سطر: <code>dx, dy</code> أو <code>dx, dy, dz</code> بالأمتار (البيانات ناقص نقطة التحقق). صدّرها من <i>Extract Values to Points</i> في ArcGIS Pro أو <i>Sample raster values</i> في QGIS والصقها هنا.</p>'),
    ('<label for="res">Residuals</label>', '<label for="res">البواقي</label>'),
    ('<label for="tolH">Horizontal tolerance, CE90 (m)</label>', '<label for="tolH">التفاوت الأفقي، CE90 (م)</label>'),
    ('<label for="tolV">Vertical tolerance, LE90 (m)</label>', '<label for="tolV">التفاوت الرأسي، LE90 (م)</label>'),
    ('<button class="btn" id="ex">Load example</button><button class="btn" id="clr">Clear</button>', '<button class="btn" id="ex">تحميل مثال</button><button class="btn" id="clr">مسح</button>'),
    ('<h2>Results</h2>', '<h2>النتائج</h2>'),
    ('<div class="k">Points</div>', '<div class="k">النقاط</div>'),
    ('<div class="k">RMSE x (m)</div>', '<div class="k">RMSE x (م)</div>'),
    ('<div class="k">RMSE y (m)</div>', '<div class="k">RMSE y (م)</div>'),
    ('<div class="k">CE90 (m)</div>', '<div class="k">CE90 (م)</div>'),
    ('<div class="k">RMSE z (m)</div>', '<div class="k">RMSE z (م)</div>'),
    ('<div class="k">LE90 (m)</div>', '<div class="k">LE90 (م)</div>'),
    ('aria-label="Scatter of horizontal residuals with the CE90 circle"', 'aria-label="انتشار البواقي الأفقية مع دائرة CE90"'),
    ('<p class="note">CE90 ≈ 1.5175 × RMSE<sub>r</sub>, LE90 ≈ 1.6449 × RMSE<sub>z</sub>, assuming normal errors with no bias and similar RMSE in x and y. Use at least 20 independent, well-distributed check points.</p>',
     '<p class="note">CE90 ≈ 1.5175 × RMSE<sub>r</sub>، وLE90 ≈ 1.6449 × RMSE<sub>z</sub>، بافتراض أخطاء طبيعية بلا انحياز وقيم RMSE متقاربة في x وy. استخدم 20 نقطة تحقق مستقلة وموزعة جيدًا على الأقل.</p>'),
    ('<h2>Land cover confusion matrix</h2>', '<h2>مصفوفة الالتباس للغطاء الأرضي</h2>'),
    ('<p class="muted small">Rows: class on the <b>map</b>. Columns: class in the <b>reference</b> (what the checker saw). Enter the number of sample points in each cell.</p>',
     '<p class="muted small">الصفوف: الفئة على <b>الخريطة</b>. الأعمدة: الفئة في <b>المرجع</b> (ما رآه المراجع). أدخل عدد نقاط العينة في كل خلية.</p>'),
    ('<button class="btn" id="cmex">Load example</button><button class="btn" id="cmclr">Clear</button>', '<button class="btn" id="cmex">تحميل مثال</button><button class="btn" id="cmclr">مسح</button>'),
    ('<h2>Accuracy</h2>', '<h2>الدقة</h2>'),
    ('<div class="k">Overall accuracy</div>', '<div class="k">الدقة الكلية</div>'),
    ('<div class="k">Kappa</div>', '<div class="k">معامل كابا</div>'),
    ('<div class="k">Sample points</div>', '<div class="k">نقاط العينة</div>'),
    ('<p class="note"><b>User\'s accuracy</b>: of the points mapped as a class, how many really are that class (reliability for map users). <b>Producer\'s accuracy</b>: of the real class, how much the map captured. In ArcGIS Pro, <i>Compute Confusion Matrix</i> produces the same table; in QGIS, the AcATaMa plugin.</p>',
     '<p class="note"><b>دقة المستخدم</b>: من النقاط المرسومة ضمن فئة ما، كم منها ينتمي فعلًا إلى تلك الفئة (موثوقية الخريطة لمستخدميها). <b>دقة المنتج</b>: من الفئة الحقيقية، كم التقطت الخريطة منها. في ArcGIS Pro تنتج <i>Compute Confusion Matrix</i> الجدول نفسه؛ وفي QGIS إضافة AcATaMa.</p>'),
    ('<p>Every check in the workflow tests one of the six ISO 19157-1 quality elements. Open a sub-element for a plain definition and an example from the four products.</p>',
     '<p>كل فحص في سير العمل يختبر أحد عناصر الجودة الستة في ISO 19157-1. افتح عنصرًا فرعيًا لتعريف مبسّط ومثال من المنتجات الأربعة.</p>'),
    ('<h2>Standards used</h2>', '<h2>المواصفات المستخدمة</h2>'),
    ('<th>Standard</th><th>Covers</th><th>Used for</th>', '<th>المواصفة</th><th>تغطي</th><th>تُستخدم في</th>'),
    ('<td>Data quality: elements, measures, evaluation and reporting</td><td>Every check and the quality report</td>', '<td>جودة البيانات: العناصر والمقاييس والتقييم والتقرير</td><td>كل فحص وتقرير الجودة</td>'),
    ('<td>Data product specifications</td><td>The requirements each product is checked against</td>', '<td>مواصفات منتجات البيانات</td><td>المتطلبات التي يُفحص كل منتج مقابلها</td>'),
    ('<td>Feature cataloguing</td><td>Feature types, attributes and allowed values for vector data</td>', '<td>فهرسة المعالم</td><td>أنواع المعالم وسماتها والقيم المسموحة للبيانات المتجهية</td>'),
    ('<td>Metadata</td><td>Checking delivered metadata and recording quality results</td>', '<td>البيانات الوصفية</td><td>فحص البيانات الوصفية المسلَّمة وتسجيل نتائج الجودة</td>'),
    ('<td>Quality assurance of data supply</td><td>Assessing a producer\'s process, not just one delivery</td>', '<td>ضمان جودة توريد البيانات</td><td>تقييم عمليات المنتِج، لا تسليمًا واحدًا فقط</td>'),
    ('<td>Sampling by attributes (AQL)</td><td>Sample sizes and accept/reject numbers for manual review</td>', '<td>المعاينة بالسمات (AQL)</td><td>أحجام العينات وأرقام القبول/الرفض للمراجعة اليدوية</td>'),
    ('<p class="note">Tolerances marked "example" are illustrations. Real values come from each product\'s specification. This page describes general practice, not the procedure of any particular organisation.</p>',
     '<p class="note">التفاوتات الموسومة «مثال» توضيحية. القيم الحقيقية تأتي من مواصفة كل منتج. تصف هذه الصفحة الممارسة العامة، لا إجراءات جهة بعينها.</p>'),
    ('<p class="foot"><b>Amin Adnan Gasim</b> · <a href="https://coffeemap.dev" target="_top">coffeemap.dev</a></p>',
     '<p class="foot"><b>أمين عدنان قاسم</b> · <a href="https://coffeemap.dev/ar/" target="_top">coffeemap.dev</a></p>'),
]:
    rep(en, ar)

# ---- labels drawn inside the error illustrations -------------------------------
for en, ar in [
    ('>class: primary road</text>', '>الفئة: طريق رئيسي</text>'),
    ('>image: dirt track</text>', '>الصورة: طريق ترابي</text>'),
    ('>"water" on a roof</text>', '>«ماء» على سقف</text>'),
]:
    rep(en, ar)
# SVG text keeps its left anchor; draw it right-to-left from the right edge instead.
rep('<text x="8" y="30" font-size="12" font-weight="700" fill="${B}">', '<text x="152" y="30" direction="rtl" font-size="12" font-weight="700" fill="${B}">')
rep('<text x="8" y="92" font-size="11" fill="var(--ink)">', '<text x="152" y="92" direction="rtl" font-size="11" fill="var(--ink)">')
rep('<text x="96" y="90" font-size="11" font-weight="700" fill="${B}">', '<text x="150" y="90" direction="rtl" font-size="11" font-weight="700" fill="${B}">')

# ---- translate the data objects before the first render ----------------------
tr_js = ('/* ============ Arabic: translate the data above ============ */\n'
         'const TR=' + json.dumps(TR, ensure_ascii=False) + ';\n'
         'const t_=s=>TR[s]??s;\n'
         'Object.values(PH).forEach(v=>{v[1]=t_(v[1]);});\n'
         "Object.values(P).forEach(p=>{['name','type','formats','source','unit'].forEach(k=>p[k]=t_(p[k]));\n"
         " p.steps.forEach(s=>{s.t=t_(s.t);s.iso=t_(s.iso);s.tol=t_(s.tol);['what','arc','qgis'].forEach(k=>s[k]=s[k].map(t_));if(s.calc)s.calc=[s.calc[0],t_(s.calc[1])];});});\n"
         'Object.values(ERR).forEach(v=>{v[0]=t_(v[0]);v[1]=t_(v[1]);});\n\n')
rep('/* ============ product icons ============ */', tr_js + '/* ============ product icons ============ */')
rep("const E=[", "const E_EN=[")
rep("$('elements').innerHTML=E.map(", "const E=E_EN.map(([n,q,subs])=>[t_(n),t_(q),subs.map(s=>s.map(t_))]);\n$('elements').innerHTML=E.map(")

# ---- strings built in the render functions ------------------------------------
for en, ar in [
    ("<span class=\"fact\"><b>Data type</b>${p.type}</span><span class=\"fact\"><b>Formats</b>${p.formats}</span><span class=\"fact\"><b>Typical source</b>${p.source}</span>",
     "<span class=\"fact\"><b>نوع البيانات</b>${p.type}</span><span class=\"fact\"><b>الصيغ</b>${p.formats}</span><span class=\"fact\"><b>المصدر المعتاد</b>${p.source}</span>"),
    ("$('phases').innerHTML='Phases: '", "$('phases').innerHTML='المراحل: '"),
    ("<span>Caught in step ${p.steps.findIndex(s=>s.errs.includes(k))+1}</span>", "<span>تُرصد في الخطوة ${p.steps.findIndex(s=>s.errs.includes(k))+1}</span>"),
    ("<p class=\"kick\" style=\"color:${c}\">Step ${stepIdx+1} of ${p.steps.length} · ${PH[s.ph][1]}</p>", "<p class=\"kick\" style=\"color:${c}\">الخطوة ${stepIdx+1} من ${p.steps.length} · ${PH[s.ph][1]}</p>"),
    ("<h4>What to check</h4>", "<h4>ماذا تفحص</h4>"),
    ("<h4>How to do it</h4>", "<h4>كيف تنفّذه</h4>"),
    ("<h4>In code · ${s.code.l}</h4>", "<h4>بالشيفرة · ${s.code.l}</h4>"),
    ("<h4>Quality reference</h4><div class=\"iso\"><div><b>ISO 19157-1 element and measure</b>${s.iso}</div><div><b>Tolerance</b>${s.tol}</div></div>",
     "<h4>مرجع الجودة</h4><div class=\"iso\"><div><b>عنصر ISO 19157-1 ومقياسه</b>${s.iso}</div><div><b>التفاوت المسموح</b>${s.tol}</div></div>"),
    ("<h4>Errors this step catches</h4>", "<h4>أخطاء ترصدها هذه الخطوة</h4>"),
    ("${s.calc[1]} →</button>", "${s.calc[1]} ←</button>"),
    ("${stepIdx===0?'disabled':''}>← Previous</button>", "${stepIdx===0?'disabled':''}>→ السابق</button>"),
    ("${stepIdx===p.steps.length-1?'disabled':''}>Next step →</button>", "${stepIdx===p.steps.length-1?'disabled':''}>الخطوة التالية ←</button>"),
    ("<p class=\"small\"><b>Caught in step ${i+1}:</b> ${s.t}. <b>ISO element:</b> ${s.iso.split(' · ')[0]}.</p><button class=\"btn\" id=\"goerr\">Open step ${i+1}</button>",
     "<p class=\"small\"><b>تُرصد في الخطوة ${i+1}:</b> ${s.t}. <b>عنصر ISO:</b> ${s.iso.split(' · ')[0]}.</p><button class=\"btn\" id=\"goerr\">افتح الخطوة ${i+1}</button>"),
    ("<p><b>Example:</b> ${ex}</p>", "<p><b>مثال:</b> ${ex}</p>"),
    ("`<p class=\"verdict warn\">Check your count<span>More defects than items inspected.</span></p>`", "`<p class=\"verdict warn\">راجع العدد<span>العيوب أكثر من العناصر المفحوصة.</span></p>`"),
    ("${ok?'Accept the lot':'Reject the lot'}<span>${found} defective in ${n.toLocaleString()} inspected (accept if ≤ ${p.ac}).</span>",
     "${ok?'اقبل الدفعة':'ارفض الدفعة'}<span>${found} معيبة من ${n.toLocaleString()} مفحوصة (اقبل إذا ≤ ${p.ac}).</span>"),
    ("`Lot of ${lot.toLocaleString()} at level ${lvl} → code letter <b>${p.code}</b>`+(p.used!==p.code?`; at AQL ${AQLS[ai]} the table points to letter <b>${p.used}</b>.`:'.')+(full?' The sample reaches the lot size: inspect every item.':'')",
     "`دفعة من ${lot.toLocaleString()} عند المستوى ${lvl} ← الحرف الرمزي <b>${p.code}</b>`+(p.used!==p.code?`؛ وعند AQL ${AQLS[ai]} يشير الجدول إلى الحرف <b>${p.used}</b>.`:'.')+(full?' العينة تبلغ حجم الدفعة: افحص كل عنصر.':'')"),
    ("$('p-notes').textContent='Enter residuals or load the example.'", "$('p-notes').textContent='أدخل البواقي أو حمّل المثال.'"),
    ("${hOK&&vOK?'Meets the tolerance':'Fails the tolerance'}<span>CE90 ${f(ce)} m vs ${tH} m${dz.length?` · LE90 ${f(le)} m vs ${tV} m`:''}</span>",
     "${hOK&&vOK?'ضمن التفاوت المسموح':'خارج التفاوت المسموح'}<span>CE90 ${f(ce)} م مقابل ${tH} م${dz.length?` · LE90 ${f(le)} م مقابل ${tV} م`:''}</span>"),
    ("notes.push(`Only ${n} points: use at least 20.`)", "notes.push(`${n} نقطة فقط: استخدم 20 على الأقل.`)"),
    ("notes.push(`RMSE x and y differ (ratio ${ratio.toFixed(2)}): CE90 is approximate.`)", "notes.push(`RMSE في x وy مختلفان (النسبة ${ratio.toFixed(2)}): قيمة CE90 تقريبية.`)"),
    ("notes.push(`Possible systematic shift (mean dx ${f(mx)}, dy ${f(my)} m).`)", "notes.push(`إزاحة منتظمة محتملة (متوسط dx ${f(mx)}، dy ${f(my)} م).`)"),
    ("notes.push(`Possible outliers: point ${out.map(o=>o[0]).join(', ')}.`)", "notes.push(`قيم شاذة محتملة: النقطة ${out.map(o=>o[0]).join('، ')}.`)"),
    ("notes.join(' ')||'No warnings: enough points, no obvious bias or outliers.'", "notes.join(' ')||'لا تحذيرات: النقاط كافية، ولا انحياز أو قيم شاذة واضحة.'"),
    ("<text x=\"24\" y=\"312\" font-size=\"11\" fill=\"var(--muted)\">dashed: tolerance · solid: CE90 · dots: residuals</text>",
     "<text x=\"296\" y=\"312\" direction=\"rtl\" font-size=\"11\" fill=\"var(--muted)\">المتقطع: التفاوت · المتصل: CE90 · النقاط: البواقي</text>"),
    ("const CLS=['Built-up','Cropland','Trees','Water','Bare'];", "const CLS=['مبانٍ','أراضٍ زراعية','أشجار','مياه','أرض جرداء'];"),
    ("'<tr><th>Map ↓ / Reference →</th>'", "'<tr><th>الخريطة ↓ / المرجع ←</th>'"),
    ("aria-label=\"Map ${r}, reference ${c}\"", "aria-label=\"الخريطة ${r}، المرجع ${c}\""),
    ("'<thead><tr><th>Class</th><th>User\\'s accuracy</th><th>Producer\\'s accuracy</th></tr></thead><tbody>'", "'<thead><tr><th>الفئة</th><th>دقة المستخدم</th><th>دقة المنتج</th></tr></thead><tbody>'"),
]:
    rep(en, ar)

open(ROOT + 'ar/geospatial-qaqc-workbench.html', 'w', encoding='utf-8').write(out)
print('ok', len(out), 'translations', len(TR))
