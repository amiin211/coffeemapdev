'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  IconButton,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import TuneIcon from '@mui/icons-material/Tune';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import AcledFilters from '@/components/AcledFilters';
import AcledTimeline, { MONTH_MS, usePlayback } from '@/components/AcledTimeline';
import AcledInsights from '@/components/AcledInsights';
import AcledAssistant from '@/components/AcledAssistant';
import ProjectReport, { captureCanvas, type ReportSpec } from '@/components/ProjectReport';
import type { AcledMapMode, AcledMetric } from '@/components/AcledMap';
import { unBlue, unCategorical } from '@/theme/unColors';
import type { Admin1Collection, Admin2Collection } from '@/utils/geo';
import {
  AcledData,
  AcledFilters as Filters,
  AreaRef,
  byLocality,
  byState,
  formatMonth,
  monthlyMax,
  monthlySeries,
  totals as computeTotals,
} from '@/utils/acled';
import {
  HOTSPOT_COLORS,
  InsightOverlay,
  OVERLAY_COLORS,
  briefData,
  buildMatrix,
  computeInsights,
  overlayColors,
} from '@/utils/acledInsights';
import { AiQueryResult, aiEnabled } from '@/utils/ai';
import { useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';

const AcledMap = nextDynamic(() => import('@/components/AcledMap'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: '100%' }}>…</Paper>,
});
const MonthlyChart = nextDynamic(() => import('@/components/AcledCharts').then((m) => ({ default: m.MonthlyChart })), {
  ssr: false,
  loading: () => <Box sx={{ height: 190 }}>…</Box>,
});
const TopBarChart = nextDynamic(() => import('@/components/AcledCharts').then((m) => ({ default: m.TopBarChart })), {
  ssr: false,
  loading: () => <Box sx={{ height: 280 }}>…</Box>,
});

const floatingPanelSx = {
  bgcolor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderRadius: 1.5,
  boxShadow: 2,
};

function StatTile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Paper elevation={2} sx={{ p: 1.25, height: 64, flex: '1 1 150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 500, lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', color, lineHeight: 1.2 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
    </Paper>
  );
}

function DashboardContent() {
  const [data, setData] = useState<AcledData | null>(null);
  const [admin1, setAdmin1] = useState<Admin1Collection | null>(null);
  const [admin2, setAdmin2] = useState<Admin2Collection | null>(null);
  const [filters, setFilters] = useState<Filters>({ monthRange: [0, 0], state: null, locality: null });
  const [metric, setMetric] = useState<AcledMetric>('events');
  const [mapMode, setMapMode] = useState<AcledMapMode>('2d');
  // Linked views: an area hovered on the map or a bar chart, or a month
  // hovered on the trend charts (previewed on the map only).
  const [hoverArea, setHoverArea] = useState<AreaRef | null>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  // One time state for the whole dashboard: the range, and while playing (or
  // paused on a month) the single month on screen.
  const playback = usePlayback(filters.monthRange);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [overlay, setOverlay] = useState<InsightOverlay | null>(null);
  const [report, setReport] = useState<ReportSpec | null>(null);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { isAr, tr } = useI18n();
  const names = useSudanNames(isAr);
  const month = (m: string) => formatMonth(m, isAr);

  useEffect(() => {
    fetch('/data/acled_data.json')
      .then((res) => res.json())
      .then((json: AcledData) => {
        setData(json);
        setFilters((f) => ({ ...f, monthRange: [0, json.months.length - 1] }));
      })
      .catch((err) => console.error('Error loading ACLED data:', err));
    fetch('/data/sdn_admin1.geojson').then((res) => res.json()).then(setAdmin1);
    fetch('/data/sdn_admin2.geojson').then((res) => res.json()).then(setAdmin2);
  }, []);

  const current = playback.current;
  const view = useMemo<Filters>(() => (current === null ? filters : { ...filters, monthRange: [current, current] }), [filters, current]);
  const mapMonth = hoverMonth ?? current;
  const mapView = useMemo<Filters>(() => (mapMonth === null ? filters : { ...filters, monthRange: [mapMonth, mapMonth] }), [filters, mapMonth]);

  const stateTotals = useMemo(() => (data ? byState(data, view) : new Map()), [data, view]);
  const localityTotals = useMemo(() => (data ? byLocality(data, view) : []), [data, view]);
  const series = useMemo(() => (data ? monthlySeries(data, filters) : []), [data, filters]);
  const totals = useMemo(() => (data ? computeTotals(data, view) : { events: 0, fatalities: 0 }), [data, view]);

  const mapStateTotals = useMemo(() => (data ? byState(data, mapView) : new Map()), [data, mapView]);
  const mapLocalityTotals = useMemo(() => (data ? byLocality(data, mapView) : []), [data, mapView]);
  const nationalLocalityTotals = useMemo(() => (data ? byLocality(data, { ...mapView, state: null, locality: null }) : []), [data, mapView]);
  const singleMonth = mapMonth !== null;
  const scaleMax = useMemo(() => (data && singleMonth ? monthlyMax(data, filters, metric) : null), [data, filters, metric, singleMonth]);
  // 3D bars show both measures, each on its own (month-fixed) scale.
  const barMax = useMemo(
    () => (data && singleMonth ? { events: monthlyMax(data, filters, 'events').national, fatalities: monthlyMax(data, filters, 'fatalities').national } : null),
    [data, filters, singleMonth],
  );

  const topStates = useMemo(
    () => Array.from(stateTotals.values()).filter((s) => s[metric] > 0).sort((a, b) => b[metric] - a[metric]).slice(0, 10),
    [stateTotals, metric]
  );
  const topLocalities = useMemo(
    () =>
      localityTotals
        .filter((l) => l[metric] > 0)
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, 10)
        .map((l) => ({ name: l.locality.name, events: l.events, fatalities: l.fatalities, state: l.locality.state, pcode: l.locality.pcode })),
    [localityTotals, metric]
  );

  const inRange = series.slice(filters.monthRange[0], filters.monthRange[1] + 1);
  const peak = inRange.reduce<(typeof series)[number] | null>((best, p) => (!best || p[metric] > best[metric] ? p : best), null);
  const statesAffected = Array.from(stateTotals.values()).filter((s) => s.events > 0).length;
  const localitiesAffected = localityTotals.filter((l) => l.events > 0 && (!filters.locality || l.locality.name === filters.locality)).length;
  const hoveredLocalityName = hoverArea?.pcode ? data?.localities.find((l) => l.pcode === hoverArea.pcode)?.name ?? null : null;

  // Smart insights: computed here, in the browser, for the current view.
  const matrix = useMemo(() => (data ? buildMatrix(data) : null), [data]);
  const insights = useMemo(() => (data && matrix ? computeInsights(data, matrix, view, metric) : null), [data, matrix, view, metric]);
  const overlayFill = useMemo(() => (insights && overlay ? overlayColors(insights, overlay) : null), [insights, overlay]);
  // What "Ask this map" may choose from: the model only routes to these.
  const aiSchema = useMemo(() => {
    if (!data) return null;
    const localitiesByState: Record<string, string[]> = {};
    data.localities.forEach((l) => (localitiesByState[l.state] ??= []).push(l.name));
    return {
      dataset: 'ACLED political violence events and fatalities per locality per month, Sudan',
      filters: { state: data.states, locality: localitiesByState },
      metrics: ['events', 'fatalities'],
      period: { first: data.months[0], last: data.months[data.months.length - 1], format: 'YYYY-MM' },
      overlays: {
        surges: 'localities well above their own recent baseline (last 3 months vs 6 before)',
        new: 'localities newly affected after a quiet baseline',
        hotspots: 'statistically significant clusters (Getis-Ord Gi*) over the period',
      },
      notes: 'Rankings are shown by the dashboard bar charts: for "top"/"most" questions set filters, period and metric. Use "overlay" for questions about surges, escalation, new areas, spread or hotspots/clusters. Put a locality in filters.locality together with its state in filters.state.',
    };
  }, [data]);

  if (!data || !admin1 || !admin2) {
    return (
      <AppLayout>
        <Box sx={{ py: 2, minHeight: '100vh', bgcolor: unBlue.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: unBlue.DEFAULT }} />
        </Box>
      </AppLayout>
    );
  }

  const { months } = data;
  const lastMonth = months[months.length - 1];
  const [from, to] = filters.monthRange;
  const rangeLabel = from === to ? month(months[from]) : `${month(months[from])} – ${month(months[to])}`;
  const periodLabel = current === null ? rangeLabel : month(months[current]);
  const mapPeriodLabel = mapMonth === null ? rangeLabel : month(months[mapMonth]);
  const partialNote = data.asOf ? tr(`Partial month — data as of ${data.asOf}`, `شهر جزئي — البيانات حتى ${data.asOf}`) : null;
  const metricName = (m: 'events' | 'fatalities') => (m === 'events' ? tr('Events', 'الأحداث') : tr('Fatalities', 'الوفيات'));

  const updateFilters = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => {
    setFilters({ monthRange: [0, months.length - 1], state: null, locality: null });
    playback.stop();
    setHoverArea(null);
    setOverlay(null);
  };
  const isFiltered = !!filters.state || from !== 0 || to !== months.length - 1 || current !== null;
  // Clicking a month on the trend charts jumps the timeline there (again to
  // go back to the whole range).
  const handleMonthClick = (i: number) => {
    if (current === i) return playback.stop();
    if (i < from || i > to) updateFilters({ monthRange: [Math.min(from, i), Math.max(to, i)] });
    playback.seek(i);
  };
  const selectState = (state: string | null) => updateFilters({ state, locality: null });
  const selectLocality = (locality: string, state: string) => updateFilters({ state, locality });
  const changeOverlay = (next: InsightOverlay | null) => {
    setOverlay(next);
    if (next) setMapMode('2d');
  };

  // Apply an "Ask this map" answer. Everything is checked against the data, so
  // a wrong or made-up name from the model can't break the view.
  const applyQuery = (q: AiQueryResult): { ok: boolean; note: string } => {
    if (!q || q.action === 'unsupported')
      return { ok: false, note: q?.explain || tr("That question can't be answered from this dataset.", 'لا يمكن الإجابة عن هذا السؤال من هذه البيانات.') };
    const f = (q.filters ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const lower = (v: string) => v.toLowerCase();
    let state = str(f.state) && data.states.find((s) => lower(s) === lower(str(f.state)!)) || null;
    let locality: string | null = null;
    for (const name of [str(f.locality), str(q.flyTo)]) {
      if (!name || locality) continue;
      const match = data.localities.find((l) => lower(l.name) === lower(name) && (!state || l.state === state));
      if (match) {
        locality = match.name;
        state = match.state;
      } else if (!state) state = data.states.find((s) => lower(s) === lower(name)) ?? null;
    }
    let range: [number, number] = [0, months.length - 1];
    const fromStr = str(q.period?.from);
    const toStr = str(q.period?.to);
    if (fromStr || toStr) {
      const toKey = toStr && toStr.length === 4 ? `${toStr}-12` : toStr;
      let a = fromStr ? months.findIndex((m) => m >= fromStr) : 0;
      let b = toKey ? months.reduce((last, m, i) => (m <= toKey ? i : last), -1) : months.length - 1;
      if (a < 0) a = months.length - 1;
      if (b < 0) b = 0;
      range = a <= b ? [a, b] : [b, a];
    }
    const nextMetric = q.metric === 'fatalities' || q.metric === 'events' ? q.metric : metric;
    const nextOverlay = q.overlay === 'surges' || q.overlay === 'new' || q.overlay === 'hotspots' ? q.overlay : null;
    playback.stop();
    setFilters({ monthRange: range, state, locality });
    setMetric(nextMetric);
    changeOverlay(nextOverlay);
    return { ok: true, note: q.explain || tr('Updated the map.', 'تم تحديث الخريطة.') };
  };

  const getBriefData = () =>
    insights &&
    briefData(data, insights, {
      period: current === null ? `${months[from]} to ${months[to]}` : months[current],
      area: filters.locality ? `${filters.locality}, ${filters.state}` : filters.state ?? 'Sudan (all states)',
      totals,
      topStates: topStates.map((s) => ({ name: s.name, events: s.events, fatalities: s.fatalities })),
    });

  const overlayLegend =
    overlay === 'hotspots'
      ? [
          { color: HOTSPOT_COLORS[99], label: tr('Hotspot · 99% confidence', 'بؤرة ساخنة · ثقة 99٪') },
          { color: HOTSPOT_COLORS[95], label: tr('Hotspot · 95%', 'بؤرة ساخنة · 95٪') },
          { color: HOTSPOT_COLORS[90], label: tr('Hotspot · 90%', 'بؤرة ساخنة · 90٪') },
        ]
      : overlay === 'surges'
        ? [{ color: OVERLAY_COLORS.surges, label: tr('Surging locality', 'محلية تشهد تصاعدًا') }]
        : overlay === 'new'
          ? [{ color: OVERLAY_COLORS.new, label: tr('Newly affected locality', 'محلية متأثرة حديثًا') }]
          : null;
  const transitionMs = playback.playing ? Math.min(700, (MONTH_MS / playback.speed) * 0.75) : 450;

  const stateOptions = data.states;
  const localityOptions = filters.state
    ? data.localities.filter((l) => l.state === filters.state).map((l) => l.name)
    : [];

  // PDF report of the view on screen (period, area, measure and map as set).
  const openReport = () => {
    const n = (v: number) => Math.round(v).toLocaleString('en-US');
    const area = filters.locality
      ? `${names.locality(filters.locality)}, ${names.state(filters.state!)}`
      : filters.state
        ? names.state(filters.state)
        : tr('Sudan, all states', 'السودان، كل الولايات');
    const m = metricName(metric).toLowerCase();
    const perEvent = totals.events ? (totals.fatalities / totals.events).toFixed(1) : '0';
    const findings: string[] = [];
    if (topStates[0])
      findings.push(
        tr(
          `${names.state(topStates[0].name)} recorded the most ${m}: ${n(topStates[0][metric])} (${Math.round((topStates[0][metric] / Math.max(1, totals[metric])) * 100)}% of the total).`,
          `سجّلت ${names.state(topStates[0].name)} أعلى ${metricName(metric)}: ${n(topStates[0][metric])} (${Math.round((topStates[0][metric] / Math.max(1, totals[metric])) * 100)}٪ من الإجمالي).`,
        ),
      );
    if (topLocalities[0])
      findings.push(
        tr(
          `The most affected locality was ${names.pcode(topLocalities[0].pcode, topLocalities[0].name)} (${names.state(topLocalities[0].state)}), with ${n(topLocalities[0].events)} events and ${n(topLocalities[0].fatalities)} fatalities.`,
          `كانت أكثر المحليات تأثرًا ${names.pcode(topLocalities[0].pcode, topLocalities[0].name)} (${names.state(topLocalities[0].state)})، بـ${n(topLocalities[0].events)} حدثًا و${n(topLocalities[0].fatalities)} وفاة.`,
        ),
      );
    if (peak && from !== to)
      findings.push(
        tr(
          `The peak month for ${m} was ${month(peak.month)}, with ${n(peak[metric])}.`,
          `كان شهر الذروة لـ${metricName(metric)} ${month(peak.month)}، بـ${n(peak[metric])}.`,
        ),
      );
    if (insights?.window) {
      const w = insights.window;
      const label = `${month(months[w.recent[0]])} – ${month(months[w.recent[1]])}`;
      findings.push(
        tr(
          `Against each locality's own baseline, ${insights.surges.length} localities surged, ${insights.declines.length} declined and ${insights.newlyAffected.length} were newly affected in ${label}.`,
          `مقارنةً بخط الأساس لكل محلية، تصاعدت ${insights.surges.length} محلية، وتراجعت ${insights.declines.length}، وتأثرت ${insights.newlyAffected.length} حديثًا في ${label}.`,
        ),
      );
    }
    if (insights?.hotspots.length)
      findings.push(
        tr(
          `${insights.hotspots.length} localities form statistically significant hotspots (Getis-Ord Gi*, 90% confidence or higher).`,
          `تشكّل ${insights.hotspots.length} محلية بؤرًا ساخنة ذات دلالة إحصائية (Getis-Ord Gi*، بثقة 90٪ أو أكثر).`,
        ),
      );
    const legend =
      overlayLegend ??
      (mapMode === '3d'
        ? [
            { color: '#1B4F91', label: tr('Events (bar height)', 'الأحداث (ارتفاع العمود)') },
            { color: '#D32F2F', label: tr('Fatalities (bar height)', 'الوفيات (ارتفاع العمود)') },
          ]
        : [{ color: unBlue.DEFAULT, label: tr(`Darker = more ${m}`, `الأغمق = ${metricName(metric)} أكثر`) }]);
    setReport({
      title: tr('Sudan Conflicts', 'النزاعات في السودان'),
      subtitle: tr('Political violence events and fatalities', 'أحداث العنف السياسي والوفيات'),
      color: unBlue.dark,
      path: '/projects/acled-conflict-dashboard',
      scope: [
        [tr('Period', 'الفترة'), periodLabel],
        [tr('Area', 'المنطقة'), area],
        [tr('Measure on the map', 'المقياس على الخريطة'), mapMode === '3d' ? tr('Events and fatalities (3D bars)', 'الأحداث والوفيات (أعمدة ثلاثية الأبعاد)') : metricName(metric)],
        [tr('Data as of', 'البيانات حتى'), data.asOf ?? month(lastMonth)],
      ],
      summary: tr(
        `Between ${periodLabel}, ACLED recorded ${n(totals.events)} political violence events and ${n(totals.fatalities)} reported fatalities in ${area}, across ${statesAffected} states and ${localitiesAffected} localities (${perEvent} fatalities per event).`,
        `خلال ${periodLabel}، سجّلت ACLED ‏${n(totals.events)} حدث عنف سياسي و${n(totals.fatalities)} وفاة مُبلغًا عنها في ${area}، في ${statesAffected} ولاية و${localitiesAffected} محلية (${perEvent} وفاة لكل حدث).`,
      ),
      findings,
      kpis: [
        { label: tr('Events', 'الأحداث'), value: n(totals.events) },
        { label: tr('Fatalities', 'الوفيات'), value: n(totals.fatalities) },
        { label: tr('States affected', 'الولايات المتأثرة'), value: String(statesAffected) },
        { label: tr('Localities affected', 'المحليات المتأثرة'), value: String(localitiesAffected), note: tr(`${perEvent} fatalities per event`, `${perEvent} وفاة لكل حدث`) },
      ],
      figures: [
        {
          image: captureCanvas('.maplibregl-canvas'),
          caption:
            mapMode === '3d'
              ? tr(`Events and fatalities by locality as paired 3D bars (each on its own scale), ${mapPeriodLabel}. ${area}.`, `الأحداث والوفيات حسب المحلية كأعمدة ثلاثية الأبعاد متجاورة (لكلٍّ مقياسه)، ${mapPeriodLabel}. ${area}.`)
              : tr(`${metricName(metric)} by locality, ${mapPeriodLabel}. ${area}.`, `${metricName(metric)} حسب المحلية، ${mapPeriodLabel}. ${area}.`),
          legend,
        },
      ],
      tables: [
        {
          title: tr('States ranked', 'ترتيب الولايات'),
          columns: [tr('State', 'الولاية'), tr('Events', 'الأحداث'), tr('Fatalities', 'الوفيات'), tr('Share of ' + m, 'الحصة')],
          numeric: [false, true, true, true],
          rows: topStates.map((s) => [names.state(s.name), s.events, s.fatalities, `${Math.round((s[metric] / Math.max(1, totals[metric])) * 100)}%`]),
          note: tr(`Ranked by ${m}; top 10.`, `مرتبة حسب ${metricName(metric)}؛ أعلى 10.`),
        },
        {
          title: tr('Localities ranked', 'ترتيب المحليات'),
          columns: [tr('Locality', 'المحلية'), tr('State', 'الولاية'), tr('Events', 'الأحداث'), tr('Fatalities', 'الوفيات')],
          numeric: [false, false, true, true],
          rows: topLocalities.map((l) => [names.pcode(l.pcode, l.name), names.state(l.state), l.events, l.fatalities]),
        },
        ...(insights && insights.surges.length
          ? [
              {
                title: tr('Surging localities', 'المحليات المتصاعدة'),
                columns: [tr('Locality', 'المحلية'), tr('State', 'الولاية'), tr('Recent', 'الأخيرة'), tr('Expected', 'المتوقع'), 'z'],
                numeric: [false, false, true, true, true],
                rows: insights.surges.slice(0, 8).map((c) => [names.pcode(c.locality.pcode, c.locality.name), names.state(c.locality.state), Math.round(c.recent), Math.round(c.expected), c.z.toFixed(1)]),
                note: tr('Recent window against the locality\'s own monthly baseline (Poisson z-score).', 'النافذة الأخيرة مقارنةً بخط الأساس الشهري للمحلية نفسها (درجة z لتوزيع بواسون).'),
              },
            ]
          : []),
      ],
      method: [
        tr('Monthly ACLED counts per locality (admin 2) are summed in the browser for the period and area selected.', 'تُجمع أعداد ACLED الشهرية لكل محلية (المستوى الإداري 2) داخل المتصفح للفترة والمنطقة المختارتين.'),
        tr('Surges, declines and new areas compare the latest months with the same locality\'s earlier monthly mean; hotspots use Getis-Ord Gi* over neighbouring localities.', 'تقارن التصاعدات والتراجعات والمناطق الجديدة الأشهر الأخيرة بمتوسط المحلية نفسها سابقًا؛ وتستخدم البؤر الساخنة Getis-Ord Gi* على المحليات المجاورة.'),
        tr('The last month is partial until ACLED\'s next update and is left out of trend tests.', 'الشهر الأخير جزئي حتى تحديث ACLED التالي، ويُستبعد من اختبارات الاتجاه.'),
      ],
      limits: [
        tr('Fatality figures are reported estimates and are often revised; treat them as lower bounds.', 'أرقام الوفيات تقديرات مُبلغ عنها وكثيرًا ما تُراجع؛ تعامل معها كحد أدنى.'),
        tr('Reporting is uneven: areas with poor access or communications are likely under-counted.', 'الإبلاغ غير متساوٍ: المناطق ضعيفة الوصول أو الاتصالات يُرجّح أن تكون أقل تمثيلًا.'),
        tr('Counts describe recorded events, not their causes or the actors involved.', 'تصف الأعداد الأحداث المسجلة، لا أسبابها أو الأطراف المشاركة فيها.'),
      ],
      sources: [
        tr(`ACLED (Armed Conflict Location & Event Data), Sudan HRP political violence events and fatalities by month, via HDX, as of ${data.asOf ?? month(lastMonth)}. acleddata.com`, `ACLED (بيانات مواقع وأحداث النزاعات المسلحة)، أحداث العنف السياسي والوفيات شهريًا في السودان، عبر HDX، حتى ${data.asOf ?? month(lastMonth)}. acleddata.com`),
        tr('Administrative boundaries: OCHA COD-AB for Sudan (admin 1 and 2), via HDX.', 'الحدود الإدارية: OCHA COD-AB للسودان (المستويان 1 و2)، عبر HDX.'),
        tr('Basemap © OpenStreetMap contributors, © CARTO.', 'الخريطة الأساسية © مساهمو OpenStreetMap، © CARTO.'),
      ],
    });
  };

  const filtersNode = (
    <AcledFilters
      filters={filters}
      stateOptions={stateOptions}
      localityOptions={localityOptions}
      onChange={updateFilters}
      onReset={resetFilters}
    />
  );

  const timelineNode = (
    <AcledTimeline
      months={months}
      series={series}
      measure={metric}
      range={filters.monthRange}
      current={current}
      playing={playback.playing}
      speed={playback.speed}
      partialNote={partialNote}
      onRangeChange={(monthRange) => updateFilters({ monthRange })}
      onToggle={playback.toggle}
      onStop={playback.stop}
      onSeek={playback.seek}
      onSpeedChange={playback.setSpeed}
      compact={!isDesktop}
    />
  );

  const statsNode = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
      <StatTile label={current === null ? tr('Period', 'الفترة') : tr('Showing month', 'الشهر المعروض')} value={periodLabel} color={unBlue.DEFAULT} />
      <StatTile
        label={`${filters.locality ? names.locality(filters.locality) : filters.state ? names.state(filters.state) : tr('Sudan', 'السودان')} · ${tr('Events', 'الأحداث')}`}
        value={totals.events}
        color={unBlue.dark}
      />
      <StatTile label={tr('Reported Fatalities', 'الوفيات المُبلَّغ عنها')} value={totals.fatalities} color="#C62828" />
      {!filters.state && <StatTile label={tr('States Affected', 'الولايات المتأثرة')} value={statesAffected} color={unCategorical[3]} />}
      <StatTile label={tr('Localities Affected', 'المحليات المتأثرة')} value={localitiesAffected} color={unCategorical[4]} />
      <StatTile
        label={tr(`Peak Month in Range (${metric})`, `شهر الذروة في الفترة (${metricName(metric)})`)}
        value={peak && peak[metric] > 0 ? `${month(peak.month)} · ${peak[metric].toLocaleString()}` : '—'}
        color={unCategorical[5]}
      />
    </Box>
  );

  const toggleSx = {
    fontFamily: 'Roboto, sans-serif',
    fontSize: '0.7rem',
    px: 1.25,
    gap: 0.5,
    '&.Mui-selected': { bgcolor: unBlue.DEFAULT, color: 'white', '&:hover': { bgcolor: unBlue.dark } },
  };

  const metricToggleNode = (
    <ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, value) => value && setMetric(value)} aria-label={tr('Measure', 'المقياس')}>
      {(['events', 'fatalities'] as AcledMetric[]).map((m) => (
        <ToggleButton
          key={m}
          value={m}
          sx={toggleSx}
        >
          {metricName(m)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );

  const modeToggleNode = (
    <ToggleButtonGroup size="small" exclusive value={mapMode} onChange={(_, value) => value && setMapMode(value)} aria-label={tr('Map view', 'عرض الخريطة')}>
      <ToggleButton value="2d" sx={toggleSx}>
        <MapOutlinedIcon sx={{ fontSize: 16 }} />
        {tr('Choropleth', 'خريطة تظليلية')}
      </ToggleButton>
      <ToggleButton value="3d" sx={toggleSx}>
        <ViewInArIcon sx={{ fontSize: 16 }} />
        {tr('3D bars', 'أعمدة ثلاثية الأبعاد')}
      </ToggleButton>
    </ToggleButtonGroup>
  );

  // Active filters as removable chips, plus one reset for everything.
  const activeFiltersNode = isFiltered && (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
      {filters.state && <Chip size="small" label={names.state(filters.state)} onDelete={() => selectState(null)} />}
      {filters.locality && <Chip size="small" label={names.locality(filters.locality)} onDelete={() => updateFilters({ locality: null })} />}
      {(from !== 0 || to !== months.length - 1) && (
        <Chip size="small" label={rangeLabel} onDelete={() => updateFilters({ monthRange: [0, months.length - 1] })} />
      )}
      <Button
        size="small"
        variant="contained"
        startIcon={<RestartAltIcon />}
        onClick={resetFilters}
        sx={{ bgcolor: unBlue.dark, fontSize: '0.7rem', py: 0.25, '&:hover': { bgcolor: unBlue.DEFAULT } }}
      >
        {tr('Reset', 'إعادة ضبط')}
      </Button>
    </Box>
  );

  const mapNode = (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <AcledMap
        admin1={admin1}
        admin2={admin2}
        stateTotals={mapStateTotals}
        localityTotals={mapLocalityTotals}
        nationalLocalityTotals={nationalLocalityTotals}
        scaleMax={scaleMax}
        barMax={barMax}
        periodLabel={mapPeriodLabel}
        metric={metric}
        mode={mapMode}
        selectedState={filters.state}
        selectedLocality={filters.locality}
        highlight={hoverArea}
        transitionMs={transitionMs}
        onStateSelect={selectState}
        onLocalitySelect={(locality, state) => updateFilters(locality ? { state, locality } : { locality: null })}
        onHover={setHoverArea}
        overlayFill={overlayFill}
        overlayLegend={overlayLegend}
      />
      <Box sx={{ position: 'absolute', top: 12, left: 12, right: 64, zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.75, pointerEvents: 'none', '& > *': { pointerEvents: 'auto' } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Box sx={floatingPanelSx}>{metricToggleNode}</Box>
          <Box sx={floatingPanelSx}>{modeToggleNode}</Box>
        </Box>
        {activeFiltersNode && <Box sx={{ ...floatingPanelSx, p: 0.5 }}>{activeFiltersNode}</Box>}
      </Box>
      {/* What the map shows right now — follows playback and month previews */}
      <Box
        aria-live="polite"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        sx={{ position: 'absolute', bottom: 20, zIndex: 500, px: 1.5, py: 0.5, ...floatingPanelSx, pointerEvents: 'none', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}
      >
        <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark }}>
          {hoverMonth !== null ? tr(`Preview: ${mapPeriodLabel}`, `معاينة: ${mapPeriodLabel}`) : mapPeriodLabel}
        </Typography>
      </Box>
    </Box>
  );

  const barChartsNode = (
    <>
      <TopBarChart
        title={tr(`Top States by ${metric === 'events' ? 'Events' : 'Fatalities'}`, `أعلى الولايات حسب ${metricName(metric)}`)}
        entries={topStates}
        labelFor={names.state}
        measure={metric}
        selected={filters.state}
        highlighted={hoverArea?.state ?? null}
        onSelect={selectState}
        onHover={(state) => setHoverArea(state ? { state, pcode: null } : null)}
        height={isDesktop ? 290 : 280}
      />
      <Divider />
      <TopBarChart
        title={tr(`Top Localities${filters.state ? ` in ${filters.state}` : ''}`, `أعلى المحليات${filters.state ? ` في ${names.state(filters.state)}` : ''}`)}
        entries={topLocalities}
        labelFor={names.locality}
        measure={metric}
        selected={filters.locality}
        highlighted={hoveredLocalityName}
        onSelect={(locality) => {
          const match = topLocalities.find((l) => l.name === locality);
          updateFilters(locality && match ? { state: match.state, locality } : { locality: null });
        }}
        onHover={(locality) => {
          const match = topLocalities.find((l) => l.name === locality);
          setHoverArea(match ? { state: match.state, pcode: match.pcode } : null);
        }}
        height={isDesktop ? 290 : 280}
      />
    </>
  );

  const trendNode = (
    <>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: isDesktop ? 'row' : 'column' }}>
        {(['events', 'fatalities'] as const).map((measure) => (
          <Box key={measure} sx={{ flex: 1, minWidth: 0 }}>
            <MonthlyChart
              series={series}
              measure={measure}
              monthRange={filters.monthRange}
              current={current}
              partialNote={partialNote}
              onMonthClick={handleMonthClick}
              onMonthHover={setHoverMonth}
              height={190}
            />
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {tr(
          `Hover a month to preview it on the map; click to jump the timeline to it. ${formatMonth(lastMonth)} is a partial month${data.asOf ? ` (data as of ${data.asOf})` : ''}.`,
          `مرّر المؤشر على شهر لمعاينته على الخريطة، وانقره لنقل الخط الزمني إليه. ${month(lastMonth)} شهر جزئي${data.asOf ? ` (البيانات حتى ${data.asOf})` : ''}.`,
        )}
      </Typography>
    </>
  );

  const smartNode = insights && aiSchema && (
    <Box sx={{ display: 'flex', gap: 3, flexDirection: isDesktop ? 'row' : 'column' }}>
      <Box sx={{ flex: 2, minWidth: 0 }}>
        <AcledInsights
          data={data}
          insights={insights}
          overlay={overlay}
          onOverlayChange={changeOverlay}
          onLocalitySelect={selectLocality}
          onHover={setHoverArea}
          compact={!isDesktop}
        />
      </Box>
      {aiEnabled && (
        <>
          {isDesktop && <Divider orientation="vertical" flexItem />}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: isDesktop ? 420 : 'none' }}>
            <AcledAssistant schema={aiSchema} getBriefData={getBriefData} onQuery={applyQuery} />
          </Box>
        </>
      )}
    </Box>
  );

  const aboutContent = (
    <>
      {isAr ? (
        <>
          <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.9 }}>
            منذ اندلاع القتال بين القوات المسلحة السودانية وقوات الدعم السريع في أبريل 2023، سجّلت ACLED {data.rows.reduce((s, r) => s + r[2], 0).toLocaleString()} حدثًا
            من أحداث العنف السياسي و{data.rows.reduce((s, r) => s + r[3], 0).toLocaleString()} حالة وفاة مُبلَّغًا عنها في أنحاء السودان. ترسم هذه اللوحة تلك المجاميع الشهرية
            حسب الولاية والمحلية؛ صفِّ حسب الفترة الزمنية أو الولاية أو المحلية، أو انقر ولاية أو محلية أو شريطًا في مخطط لتتبعك بقية اللوحة.
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.9 }}>
            بنيتُ هذه اللوحة على <strong>CoffeeMap.dev</strong> باستخدام MapLibre GL JS من مجموعة بيانات ACLED لخطة الاستجابة الإنسانية عن أحداث العنف السياسي
            والوفيات شهريًا، مربوطة بحدود أوتشا الرسمية للمستويين الإداريين 1 و2 عبر الرموز المكانية (P-codes).
          </Typography>
        </>
      ) : (
        <>
      <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
        Since fighting broke out between the Sudanese Armed Forces and the Rapid Support Forces
        in April 2023, ACLED has recorded {data.rows.reduce((s, r) => s + r[2], 0).toLocaleString()} political
        violence events and {data.rows.reduce((s, r) => s + r[3], 0).toLocaleString()} reported fatalities
        across Sudan. This dashboard maps those monthly totals by state and locality — filter by time
        range, state or locality, or click a state, a locality or a chart bar and the rest of the
        dashboard follows.
      </Typography>
      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
        I built this on <strong>CoffeeMap.dev</strong> with MapLibre GL JS from ACLED&apos;s
        HRP dataset of political violence events and fatalities by month, joined to the official
        OCHA admin 1 and admin 2 boundaries by pcode.
      </Typography>
        </>
      )}
    </>
  );

  const aboutHeader = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Typography variant="h6" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark }}>
        {tr('About this dashboard', 'حول لوحة المعلومات')}
      </Typography>
      <IconButton onClick={() => setAboutOpen(false)} size="small" aria-label={tr('Close', 'إغلاق')}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <AppLayout>
      <Box
        sx={{
          minHeight: 'calc(100vh - 96px)',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: unBlue.light,
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>
          <Box sx={{ position: 'relative' }}>
            {report && <ProjectReport spec={report} onClose={() => setReport(null)} />}
            <DashboardHeader
              articleHref="/insights/acled-conflict-analytics"
              onReport={openReport}
              title={tr('Sudan Conflicts', 'النزاعات في السودان')}
              subtitle={tr('Political Violence Events & Fatalities — Sudan', 'أحداث العنف السياسي والوفيات — السودان')}
              icon={<CrisisAlertIcon sx={{ fontSize: 28 }} />}
              source={tr(
                `ACLED – Sudan HRP Political Violence Events and Fatalities by Month${data.asOf ? ` (as of ${data.asOf})` : ''}`,
                `ACLED – أحداث العنف السياسي والوفيات شهريًا في السودان (خطة الاستجابة الإنسانية)${data.asOf ? ` (حتى ${data.asOf})` : ''}`,
              )}
              author="Amin Adnan Gasim"
              date={`${month(months[0])} – ${month(lastMonth)}`}
              gradientFrom={unBlue.DEFAULT}
              gradientTo={unBlue.dark}
              mb={isDesktop ? 1.5 : 3}
            />
            <IconButton
              onClick={() => setAboutOpen((v) => !v)}
              sx={{ position: 'absolute', top: 12, right: 12, color: 'white' }}
              aria-label={tr('About this dashboard', 'حول لوحة المعلومات')}
            >
              <InfoOutlinedIcon />
            </IconButton>
          </Box>
        </Box>

        {isDesktop ? (
          <>
            <Box sx={{ px: 2, pb: 1.25, flexShrink: 0 }}>{statsNode}</Box>

            <Box sx={{ px: 2, pb: 1.25, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Paper
                elevation={2}
                sx={{
                  width: sidebarOpen ? 280 : 44,
                  flexShrink: 0,
                  height: 620,
                  overflow: 'hidden',
                  transition: 'width 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', p: 0.5, pl: sidebarOpen ? 2 : 0.5 }}>
                  {sidebarOpen && (
                    <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif' }}>
                      {tr('Filters', 'عوامل التصفية')}
                    </Typography>
                  )}
                  <IconButton size="small" onClick={() => setSidebarOpen((v) => !v)} aria-label={sidebarOpen ? tr('Collapse filters', 'طي عوامل التصفية') : tr('Expand filters', 'توسيع عوامل التصفية')}>
                    {sidebarOpen ? <ChevronLeftIcon sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} /> : <TuneIcon />}
                  </IconButton>
                </Box>
                {sidebarOpen && <Box sx={{ px: 2, pt: 1, pb: 2, overflowY: 'auto', minWidth: 248 }}>{filtersNode}</Box>}
              </Paper>

              <Box sx={{ flex: 1, position: 'relative', height: 620, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Paper elevation={2} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {mapNode}
                </Paper>
                <Paper elevation={2} sx={{ px: 1.5, py: 1, flexShrink: 0 }}>{timelineNode}</Paper>

                {aboutOpen && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 420,
                      maxWidth: 'calc(100% - 48px)',
                      zIndex: 700,
                      p: 3,
                      ...floatingPanelSx,
                      bgcolor: 'rgba(255,255,255,0.98)',
                    }}
                  >
                    {aboutHeader}
                    {aboutContent}
                  </Box>
                )}
              </Box>

              <Paper
                elevation={2}
                sx={{ width: 360, flexShrink: 0, height: 620, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', overflow: 'hidden' }}
              >
                {barChartsNode}
              </Paper>
            </Box>

            <Paper elevation={2} sx={{ mx: 2, mb: 1.25, p: 1.5, flexShrink: 0 }}>{smartNode}</Paper>
            <Paper elevation={2} sx={{ mx: 2, mb: 1.5, p: 1.5, flexShrink: 0 }}>{trendNode}</Paper>
          </>
        ) : (
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>{statsNode}</Box>
            <Paper elevation={2} sx={{ mb: 2 }}>
              <Box
                onClick={() => setSidebarOpen((v) => !v)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, cursor: 'pointer' }}
              >
                <TuneIcon fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', flex: 1 }}>
                  {tr('Filters', 'عوامل التصفية')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sidebarOpen ? tr('Hide', 'إخفاء') : tr('Show', 'إظهار')}
                </Typography>
              </Box>
              {sidebarOpen && <Box sx={{ px: 2, pb: 2, pt: 1 }}>{filtersNode}</Box>}
            </Paper>
            <Paper elevation={2} sx={{ height: 440, mb: 1.25, overflow: 'hidden' }}>
              {mapNode}
            </Paper>
            <Paper elevation={2} sx={{ p: 1.5, mb: 2 }}>{timelineNode}</Paper>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>{smartNode}</Paper>
            {aboutOpen && (
              <Paper elevation={2} sx={{ p: 2.5, mb: 2 }}>
                {aboutHeader}
                {aboutContent}
              </Paper>
            )}
            <Paper elevation={2} sx={{ p: 2, mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {barChartsNode}
            </Paper>
            <Paper elevation={2} sx={{ p: 2 }}>{trendNode}</Paper>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
}

export default function SudanConflictsDashboard() {
  return <DashboardContent />;
}
