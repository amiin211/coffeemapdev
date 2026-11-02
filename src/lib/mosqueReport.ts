// PDF report for the 3D mosque viewer: the 4D programme, quantities and
// costs, built from the same data the viewer loads (see ProjectReport).

import type { ReportSpec } from '@/components/ProjectReport';
import type { BimData } from './mosqueBim';
import { CATEGORIES_AR } from './mosqueBimAr';
import { dayToIso, type Schedule } from './mosqueSchedule';
import { midCost, siteWorksCostToDate, type WorkPackage } from './mosqueSiteWorks';

type Tr = (en: string, ar: string) => string;

export interface MosqueReportInput {
  bim: BimData;
  schedule: Schedule;
  siteWorks: WorkPackage[];
  buildDay: number | null; // 4D view day, null = as built
  image: string | null;
}

const sar = (v: number) => Math.round(v).toLocaleString('en-US');
const sarM = (v: number) => `${(v / 1e6).toFixed(1)}M`;
const range = ([lo, hi]: [number, number]) => `${sar(lo)} – ${sar(hi)}`;

export function mosqueReport({ bim, schedule, siteWorks, buildDay, image }: MosqueReportInput, tr: Tr, isAr: boolean, dateLabel: (iso: string) => string): ReportSpec {
  const site = bim.meta.site as Record<string, string | number | string[]>;
  const elements = Object.entries(bim.elements);
  const cat = (c: string) => (isAr ? CATEGORIES_AR[c] ?? c : c);

  // Building cost by category (from the per-type summary).
  const byCat = new Map<string, { count: number; cost: [number, number] }>();
  for (const [typeId, s] of Object.entries(bim.summary)) {
    const c = bim.types[typeId]?.category ?? 'Other';
    const e = byCat.get(c) ?? { count: 0, cost: [0, 0] as [number, number] };
    e.count += s.count;
    e.cost = [e.cost[0] + s.costSAR[0], e.cost[1] + s.costSAR[1]];
    byCat.set(c, e);
  }
  const cats = Array.from(byCat).sort((a, b) => midCost(b[1].cost) - midCost(a[1].cost));

  const building = bim.meta.totalCostSAR;
  const works: [number, number] = siteWorks.reduce<[number, number]>((s, p) => [s[0] + p.cost[0], s[1] + p.cost[1]], [0, 0]);
  const total: [number, number] = [building[0] + works[0], building[1] + works[1]];
  const start = dayToIso(0);
  const finish = dayToIso(schedule.finish);
  const months = Math.round(schedule.finish / 30.4);

  // Progress at the 4D day on screen.
  let progress: string | null = null;
  if (buildDay !== null && buildDay >= 1) {
    let done = 0;
    let doneCost = 0;
    for (const [key, el] of elements) {
      const t = schedule.tasks.get(key);
      if (t && t.end <= buildDay) {
        done++;
        doneCost += midCost(el.costSAR);
      }
    }
    const spent = doneCost + siteWorksCostToDate(siteWorks, buildDay);
    const phase = schedule.phases.find((p) => buildDay >= p.start && buildDay < p.end);
    progress = tr(
      `On ${dateLabel(dayToIso(buildDay))} (day ${Math.round(buildDay)}), ${done} of ${elements.length} elements are complete${phase ? ` and work is in “${phase.name}”` : ''}; about SAR ${sarM(spent)} (mid-range) has been spent, ${Math.round((spent / midCost(total)) * 100)}% of the estimate.`,
      `في ${dateLabel(dayToIso(buildDay))} (اليوم ${Math.round(buildDay)})، اكتمل ${done} من ${elements.length} عنصرًا${phase ? ` والعمل في «${phase.nameAr}»` : ''}؛ وأُنفق نحو ${sarM(spent)} مليون ريال (منتصف النطاق)، أي ${Math.round((spent / midCost(total)) * 100)}٪ من التقدير.`,
    );
  }

  const topCat = cats[0];
  const findings = [
    tr(
      `The programme runs ${months} months, from ${dateLabel(start)} to handover on ${dateLabel(finish)}, in ${schedule.phases.length} phases derived from the model geometry.`,
      `يمتد البرنامج ${months} شهرًا، من ${dateLabel(start)} حتى التسليم في ${dateLabel(finish)}، في ${schedule.phases.length} مراحل مشتقة من هندسة النموذج.`,
    ),
    tr(
      `Estimated cost: SAR ${sarM(total[0])} – ${sarM(total[1])}, of which building elements are SAR ${sarM(building[0])} – ${sarM(building[1])} and site works SAR ${sarM(works[0])} – ${sarM(works[1])}.`,
      `التكلفة التقديرية: ${sarM(total[0])} – ${sarM(total[1])} مليون ريال، منها عناصر المبنى ${sarM(building[0])} – ${sarM(building[1])} مليون، وأعمال الموقع ${sarM(works[0])} – ${sarM(works[1])} مليون.`,
    ),
    ...(topCat
      ? [
          tr(
            `${topCat[0]} are the largest building cost (${Math.round((midCost(topCat[1].cost) / midCost(building)) * 100)}% of the building elements).`,
            `${cat(topCat[0])} هي أكبر بنود تكلفة المبنى (${Math.round((midCost(topCat[1].cost) / midCost(building)) * 100)}٪ من عناصر المبنى).`,
          ),
        ]
      : []),
    ...(progress ? [progress] : []),
  ];

  return {
    title: tr('3D Mosque Viewer & 4D BIM', 'عارض المسجد ثلاثي الأبعاد ونمذجة 4D'),
    subtitle: tr('Construction programme, quantities and indicative costs', 'برنامج التنفيذ والكميات والتكاليف التقديرية'),
    color: '#7d5330',
    path: '/projects/3d-mosque-viewer',
    scope: [
      [tr('Site', 'الموقع'), tr(`Aseer Region, Saudi Arabia · ${sar(Number(site.groundElevation_m ?? 0))} m above sea level`, `منطقة عسير، المملكة العربية السعودية · ${sar(Number(site.groundElevation_m ?? 0))} م فوق سطح البحر`)],
      [tr('Model', 'النموذج'), tr(`${elements.length} BIM elements · roofed area ${sar(Number(site.roofedArea_m2 ?? 0))} m²`, `${elements.length} عنصر BIM · المساحة المسقوفة ${sar(Number(site.roofedArea_m2 ?? 0))} م²`)],
      [tr('View', 'العرض'), buildDay === null ? tr('As built', 'مكتمل') : tr(`4D, ${dateLabel(dayToIso(buildDay))}`, `4D، ${dateLabel(dayToIso(buildDay))}`)],
      [tr('Cost basis', 'أساس التكلفة'), tr('Indicative KSA supply-and-install ranges; not a priced bill of quantities', 'نطاقات توريد وتركيب تقديرية لسوق المملكة؛ ليست جدول كميات مسعّرًا')],
    ],
    summary: tr(
      `A mosque site in Aseer, modelled from a drone survey (0.5 m terrain and orthophoto) and a Revit-derived model of ${elements.length} elements. The 4D programme is generated from each element's position and height, and site-work quantities are measured from the 3D site itself.`,
      `موقع مسجد في عسير، منمذج من مسح بطائرة مسيّرة (تضاريس 0.5 م وصورة جوية) ونموذج مشتق من Revit من ${elements.length} عنصرًا. ويُولَّد برنامج 4D من موضع كل عنصر وارتفاعه، وتُقاس كميات أعمال الموقع من الموقع ثلاثي الأبعاد نفسه.`,
    ),
    findings,
    kpis: [
      { label: tr('BIM elements', 'عناصر BIM'), value: String(elements.length) },
      { label: tr('Programme', 'البرنامج'), value: tr(`${months} months`, `${months} شهرًا`), note: `${start} → ${finish}` },
      { label: tr('Building elements (SAR)', 'عناصر المبنى (ريال)'), value: `${sarM(building[0])}–${sarM(building[1])}` },
      { label: tr('Total incl. site works (SAR)', 'الإجمالي مع أعمال الموقع (ريال)'), value: `${sarM(total[0])}–${sarM(total[1])}` },
    ],
    figures: [
      {
        image,
        caption: buildDay === null ? tr('The mosque on the surveyed terrain, as built.', 'المسجد على تضاريس المساحة، مكتملًا.') : tr(`The site on ${dateLabel(dayToIso(buildDay))} in the 4D programme.`, `الموقع في ${dateLabel(dayToIso(buildDay))} ضمن برنامج 4D.`),
      },
    ],
    tables: [
      {
        title: tr('Construction programme', 'برنامج التنفيذ'),
        columns: [tr('Phase', 'المرحلة'), tr('Start', 'البداية'), tr('Finish', 'النهاية'), tr('Days', 'الأيام')],
        numeric: [false, false, false, true],
        rows: schedule.phases.map((p) => [isAr ? p.nameAr : p.name, dayToIso(p.start), dayToIso(p.end), Math.round(p.end - p.start)]),
        note: tr('Phases overlap where crews work in parallel.', 'تتداخل المراحل حيث تعمل الطواقم بالتوازي.'),
      },
      {
        title: tr('Building elements by category', 'عناصر المبنى حسب الفئة'),
        columns: [tr('Category', 'الفئة'), tr('Elements', 'العناصر'), tr('Cost range (SAR)', 'نطاق التكلفة (ريال)'), tr('Share', 'الحصة')],
        numeric: [false, true, true, true],
        rows: cats.map(([c, v]) => [cat(c), v.count, range(v.cost), `${Math.round((midCost(v.cost) / midCost(building)) * 100)}%`]),
      },
      {
        title: tr('Site works', 'أعمال الموقع'),
        columns: [tr('Package', 'الحزمة'), tr('Start', 'البداية'), tr('Finish', 'النهاية'), tr('Cost range (SAR)', 'نطاق التكلفة (ريال)')],
        numeric: [false, false, false, true],
        rows: siteWorks.map((p) => [`${p.code} ${isAr ? p.nameAr : p.name}`, dayToIso(p.start), dayToIso(p.end), range(p.cost)]),
        note: tr('Quantities measured from the 3D site: drone survey area, cut and fill against the platform level, road length, footprint and landscaping.', 'كميات مقاسة من الموقع ثلاثي الأبعاد: مساحة المسح، والحفر والردم مقابل منسوب المنصة، وطول الطريق، والمسقط، والتنسيق.'),
      },
    ],
    method: [
      tr('Terrain: 0.5 m DTM and orthophoto from drone photogrammetry, decoded from 16-bit PNG height maps.', 'التضاريس: نموذج تضاريس 0.5 م وصورة جوية من المسح الفوتوغرامتري بالطائرة المسيّرة، مفكوكة من خرائط ارتفاع PNG بعمق 16 بت.'),
      tr('Schedule: each element gets a task from its category, base and top heights and plan position; slabs follow the walls below them, with curing pauses.', 'الجدول: يُعطى كل عنصر مهمة من فئته وارتفاعَي قاعدته وقمته وموضعه في المسقط؛ وتتبع البلاطات الجدران تحتها مع فترات معالجة.'),
      tr('Costs: element quantities measured from the geometry × indicative unit-rate ranges; site works priced per work package.', 'التكاليف: كميات العناصر المقاسة من الهندسة × نطاقات أسعار وحدة تقديرية؛ وتُسعّر أعمال الموقع لكل حزمة عمل.'),
    ],
    limits: [
      tr('Illustrative dataset: properties, costs and dates are generated for demonstration, not taken from a real project record.', 'بيانات توضيحية: الخصائص والتكاليف والتواريخ مولّدة للعرض، لا من سجل مشروع حقيقي.'),
      tr('Unit rates are market ranges, not quotations; verify with a quantity surveyor.', 'أسعار الوحدات نطاقات سوقية لا عروض أسعار؛ تحقق منها مع مهندس كميات.'),
      tr('The programme uses typical durations for a building of this size; a real one depends on the contractor\'s method and resources.', 'يستخدم البرنامج مددًا نموذجية لمبنى بهذا الحجم؛ والبرنامج الحقيقي يعتمد على طريقة المقاول وموارده.'),
    ],
    sources: [
      tr('Mosque model: Revit-derived glTF (element names and geometry).', 'نموذج المسجد: glTF مشتق من Revit (أسماء العناصر والهندسة).'),
      tr('Terrain and orthophoto: drone photogrammetry survey of the site (0.5 m).', 'التضاريس والصورة الجوية: مسح فوتوغرامتري للموقع بالطائرة المسيّرة (0.5 م).'),
      tr('BIM properties and costs: illustrative dataset for the Saudi market (SBC references, indicative 2025 rates).', 'خصائص BIM والتكاليف: بيانات توضيحية لسوق المملكة (مراجع كود البناء السعودي، أسعار تقديرية 2025).'),
    ],
  };
}
