'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import GroupsIcon from '@mui/icons-material/Groups';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import ProjectReport, { captureCanvas, type ReportSpec } from '@/components/ProjectReport';
import ThreeWStatCards from '@/components/ThreeWStatCards';
import ThreeWExplorer, { ExplorerMode, matrixCellColor } from '@/components/ThreeWExplorer';
import {
  DEFAULT_WEIGHTS,
  CORE_CLUSTERS,
  EXIT_COLORS,
  PRIORITY_BREAKS,
  PRIORITY_RAMP,
  Weights,
  buildProfiles,
  coverageRows,
  missingCore,
  partnerCount,
  priorityColor,
  priorityIndex,
  simulateExit,
} from '@/utils/threewInsights';
import type { AcledData } from '@/utils/acled';
import { clusterLabel, metricLabels, metricLabelsAr, orgTypeLabel, ThreeWMetric } from '@/utils/threewMetric';
import { formatDate, useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';
import { unBlue } from '@/theme/unColors';
import {
  ThreeWData,
  aggregateByState,
  aggregateByCluster,
  aggregateByOrg,
  aggregateByOrgType,
  aggregateByLocality,
  monthlyTrend,
  filterRows,
} from '@/utils/threew';

const ThreeWMap = nextDynamic(() => import('@/components/ThreeWMap'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: '100%' }}>…</Paper>,
});
const ThreeWDetailPanel = nextDynamic(() => import('@/components/ThreeWDetailPanel'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 300 }}>…</Paper>,
});
const TopOrgsBarChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.TopOrgsBarChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 240 }}>…</Paper>,
});
const ClusterBreakdownPieChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.ClusterBreakdownPieChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 220 }}>…</Paper>,
});
const OrgTypeDoughnutChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.OrgTypeDoughnutChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 200 }}>…</Paper>,
});
const MonthlyTrendChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.MonthlyTrendChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 200 }}>…</Paper>,
});

function monthLabel(month: string) {
  const [, m] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[parseInt(m, 10) - 1] ?? month;
}

const floatingPanelSx = {
  bgcolor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderRadius: 1.5,
  boxShadow: 2,
};

function DashboardContent() {
  const [data, setData] = useState<ThreeWData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedOrgType, setSelectedOrgType] = useState<string | null>(null);
  const [metric, setMetric] = useState<ThreeWMetric>('activities');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [acled, setAcled] = useState<AcledData | null>(null);
  const [mode, setMode] = useState<ExplorerMode>('priority');
  const [showOnMap, setShowOnMap] = useState(true);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [exitOrg, setExitOrg] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [report, setReport] = useState<ReportSpec | null>(null);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { locale, isAr, tr } = useI18n();
  const names = useSudanNames(isAr);

  useEffect(() => {
    fetch('/data/threew_data.json')
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error('Error loading 3W data:', err));
    // Conflict events for the response-gap analysis (optional: the dashboard works without it).
    fetch('/data/acled_data.json')
      .then((res) => res.json())
      .then(setAcled)
      .catch((err) => console.error('Error loading ACLED data:', err));
  }, []);

  const filters = useMemo(
    () => ({ month: selectedMonth, cluster: selectedCluster, state: selectedState, org: selectedOrg, orgType: selectedOrgType }),
    [selectedMonth, selectedCluster, selectedState, selectedOrg, selectedOrgType]
  );

  const stateAggregates = useMemo(() => (data ? aggregateByState(data, filters) : []), [data, filters]);
  const localityAggregates = useMemo(() => (data ? aggregateByLocality(data, filters) : []), [data, filters]);
  const clusterAggregates = useMemo(() => (data ? aggregateByCluster(data, filters) : []), [data, filters]);
  const orgTypeAggregates = useMemo(() => (data ? aggregateByOrgType(data, filters) : []), [data, filters]);
  const topOrgs = useMemo(() => (data ? aggregateByOrg(data, filters, 10) : []), [data, filters]);
  const trend = useMemo(() => (data ? monthlyTrend(data, filters) : []), [data, filters]);

  const totalActivities = useMemo(
    () => stateAggregates.reduce((sum, s) => sum + s.activities, 0),
    [stateAggregates]
  );

  const selectedStateAgg = selectedState ? stateAggregates.find((s) => s.state === selectedState) : null;
  const totalOrgsCount = useMemo(
    () => (data ? new Set(filterRows(data, filters, 'state').map((r) => r[4])).size : 0),
    [data, filters]
  );
  const totalStatesCovered = stateAggregates.filter((s) => s.activities > 0).length;

  // Response Gap Explorer: locality profiles (3W + ACLED), then each tool.
  const profileSet = useMemo(() => (data ? buildProfiles(data, acled, filters) : null), [data, acled, filters]);
  const priority = useMemo(() => (profileSet ? priorityIndex(profileSet, weights, selectedState) : []), [profileSet, weights, selectedState]);
  const priorityByKey = useMemo(() => new Map(priority.map((p) => [p.profile.key, p])), [priority]);
  // Default the exit simulator to the organization reporting the most activities.
  const defaultExitOrg = useMemo(() => {
    if (!data) return null;
    const counts = new Map<number, number>();
    for (const row of data.rows) counts.set(row[4], (counts.get(row[4]) ?? 0) + 1);
    return Array.from(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [data]);
  const activeExitOrg = exitOrg ?? defaultExitOrg;
  const exit = useMemo(
    () => (profileSet && activeExitOrg !== null ? simulateExit(profileSet, activeExitOrg, selectedState) : []),
    [profileSet, activeExitOrg, selectedState],
  );
  const matrix = useMemo(() => (profileSet ? coverageRows(profileSet, selectedState) : []), [profileSet, selectedState]);
  // ACLED fatalities over the 3W months, for the map's 3D view.
  const fatalitiesByKey = useMemo(
    () => (profileSet && acled ? new Map(Array.from(profileSet.profiles.values(), (p) => [p.key, p.fatalities])) : null),
    [profileSet, acled],
  );
  const overlayFill = useMemo(() => {
    if (!showOnMap) return null;
    if (mode === 'priority') return new Map(priority.map((p) => [p.profile.key, priorityColor(p.score)]));
    if (mode === 'exit') return new Map(exit.map((e) => [e.profile.key, EXIT_COLORS[e.impact]]));
    return new Map(matrix.map((r) => [r.profile.key, matrixCellColor(Math.min(...r.cells))]));
  }, [showOnMap, mode, priority, exit, matrix]);
  const selectedProfile = (selectedKey && profileSet?.profiles.get(selectedKey)) || null;

  const handleClusterClick = (cluster: string) => setSelectedCluster(cluster || null);
  const handleOrgTypeClick = (type: string) => setSelectedOrgType(type || null);
  const handleOrgClick = (acronym: string) => setSelectedOrg(acronym || null);
  const handleMonthClick = (month: string) => setSelectedMonth(month || null);

  if (!data) {
    return (
      <AppLayout>
        <Box sx={{ py: 2, minHeight: '100vh', bgcolor: unBlue.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: unBlue.DEFAULT }} />
        </Box>
      </AppLayout>
    );
  }

  const compactSelectSx = {
    '& .MuiOutlinedInput-root': { fontFamily: 'Roboto, sans-serif', fontSize: '0.7rem' },
    '& .MuiSelect-select': { py: '5px', display: 'flex', alignItems: 'center' },
    '& .MuiInputLabel-root': { fontSize: '0.7rem' },
    '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: '0.75rem' },
  };

  const filtersNode = (
    <>
      <FormControl size="small" sx={{ minWidth: 130, ...compactSelectSx }}>
        <InputLabel>{tr('Month', 'الشهر')}</InputLabel>
        <Select label={tr('Month', 'الشهر')} value={selectedMonth ?? ''} onChange={(e) => setSelectedMonth(e.target.value || null)}>
          <MenuItem value="">{tr('All Months', 'كل الأشهر')}</MenuItem>
          {data.months.map((m) => (
            <MenuItem key={m} value={m}>
              {isAr ? formatDate(`${m}-01`, locale, { month: 'long', year: 'numeric' }) : `${monthLabel(m)} 2026`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 170, ...compactSelectSx }}>
        <InputLabel>{tr('Cluster', 'القطاع')}</InputLabel>
        <Select label={tr('Cluster', 'القطاع')} value={selectedCluster ?? ''} onChange={(e) => setSelectedCluster(e.target.value || null)}>
          <MenuItem value="">{tr('All Clusters', 'كل القطاعات')}</MenuItem>
          {data.clusters.map((c) => (
            <MenuItem key={c} value={c}>
              {clusterLabel(c, isAr)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedState && (
        <Chip label={`${tr('State', 'الولاية')}: ${names.state(selectedState)}`} size="small" onDelete={() => setSelectedState(null)} sx={{ bgcolor: `${unBlue.DEFAULT}20` }} />
      )}
      {selectedOrg && (
        <Chip label={`${tr('Org', 'المنظمة')}: ${selectedOrg}`} size="small" onDelete={() => setSelectedOrg(null)} sx={{ bgcolor: `${unBlue.DEFAULT}20` }} />
      )}
      {selectedOrgType && (
        <Chip label={`${tr('Type', 'النوع')}: ${orgTypeLabel(selectedOrgType, isAr)}`} size="small" onDelete={() => setSelectedOrgType(null)} sx={{ bgcolor: `${unBlue.DEFAULT}20` }} />
      )}
    </>
  );

  const metricToggleNode = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={metric}
      onChange={(_, value) => value && setMetric(value)}
      sx={{ bgcolor: 'transparent' }}
    >
      {(Object.keys(metricLabels) as ThreeWMetric[]).map((m) => (
        <ToggleButton
          key={m}
          value={m}
          sx={{
            fontFamily: 'Roboto, sans-serif',
            fontSize: '0.7rem',
            px: 1.5,
            '&.Mui-selected': { bgcolor: unBlue.DEFAULT, color: 'white', '&:hover': { bgcolor: unBlue.dark } },
          }}
        >
          {isAr ? metricLabelsAr[m] : metricLabels[m]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );

  const statsNode = (
    <ThreeWStatCards
      activities={selectedStateAgg ? selectedStateAgg.activities : totalActivities}
      orgs={selectedStateAgg ? selectedStateAgg.orgs : totalOrgsCount}
      clusters={selectedStateAgg ? selectedStateAgg.clusters : clusterAggregates.length}
      states={totalStatesCovered}
      localities={selectedState
        ? localityAggregates.filter((l) => l.locality.state === selectedState).length
        : localityAggregates.length}
      selectedState={selectedState}
    />
  );

  const detailPanelNode = (
    <ThreeWDetailPanel
      state={selectedState}
      topOrgs={topOrgs}
      orgTypeBreakdown={orgTypeAggregates}
      clustersActive={clusterAggregates.map((c) => c.cluster)}
      onClear={() => setSelectedState(null)}
      selectedCluster={selectedCluster}
      selectedOrgType={selectedOrgType}
      selectedOrg={selectedOrg}
      onClusterClick={handleClusterClick}
      onOrgTypeClick={handleOrgTypeClick}
      onOrgClick={handleOrgClick}
    />
  );

  const chartsNode = (
    <>
      <TopOrgsBarChart orgs={topOrgs} selectedOrg={selectedOrg} onOrgClick={handleOrgClick} height={isDesktop ? 208 : 240} />
      <ClusterBreakdownPieChart clusters={clusterAggregates} selectedCluster={selectedCluster} onClusterClick={handleClusterClick} height={isDesktop ? 192 : 220} />
      <OrgTypeDoughnutChart orgTypes={orgTypeAggregates} selectedOrgType={selectedOrgType} onOrgTypeClick={handleOrgTypeClick} height={isDesktop ? 176 : 200} />
    </>
  );

  const chartsNodeBare = (
    <>
      <TopOrgsBarChart orgs={topOrgs} selectedOrg={selectedOrg} onOrgClick={handleOrgClick} height={180} bare />
      <Divider />
      <ClusterBreakdownPieChart clusters={clusterAggregates} selectedCluster={selectedCluster} onClusterClick={handleClusterClick} height={180} bare />
      <Divider />
      <OrgTypeDoughnutChart orgTypes={orgTypeAggregates} selectedOrgType={selectedOrgType} onOrgTypeClick={handleOrgTypeClick} height={180} bare />
    </>
  );

  const sidebarNode = (
    <>
      {detailPanelNode}
      {chartsNode}
    </>
  );

  const trendNode = (
    <MonthlyTrendChart trend={trend} selectedMonth={selectedMonth} onMonthClick={handleMonthClick} height={isDesktop ? 110 : 200} />
  );

  const mapNode = (
    <ThreeWMap
      stateAggregates={stateAggregates}
      localityAggregates={localityAggregates}
      selectedState={selectedState}
      metric={metric}
      onStateSelect={setSelectedState}
      fatalities={fatalitiesByKey}
      fatalityPeriod={data.months.length ? (isAr ? `${formatDate(`${data.months[0]}-01`, locale, { month: 'short', year: 'numeric' })} – ${formatDate(`${data.months[data.months.length - 1]}-01`, locale, { month: 'short', year: 'numeric' })}` : `${monthLabel(data.months[0])}–${monthLabel(data.months[data.months.length - 1])} ${data.months[data.months.length - 1].slice(0, 4)}`) : ''}
      overlayFill={overlayFill}
      overlayTitle={
        mode === 'priority'
          ? tr('Priority index (your weights)', 'مؤشر الأولوية (أوزانك)')
          : mode === 'exit'
            ? tr(`If ${activeExitOrg !== null ? data.orgs[activeExitOrg].acronym || data.orgs[activeExitOrg].name : ''} left`, `لو غادرت ${activeExitOrg !== null ? data.orgs[activeExitOrg].acronym || data.orgs[activeExitOrg].name : ''}`)
            : tr('Weakest core cluster', 'أضعف قطاع أساسي')
      }
      overlayLegend={
        mode === 'priority'
          ? PRIORITY_RAMP.map((color, i) => ({
              color,
              label: i === 0 ? `< ${PRIORITY_BREAKS[0] * 100}` : i === PRIORITY_RAMP.length - 1 ? `${PRIORITY_BREAKS[i - 1] * 100}+` : `${PRIORITY_BREAKS[i - 1] * 100}–${PRIORITY_BREAKS[i] * 100}`,
            })).reverse()
          : mode === 'exit'
            ? [
                { color: EXIT_COLORS.uncovered, label: tr('No partner left', 'لا شريك متبقٍ') },
                { color: EXIT_COLORS['cluster-lost'], label: tr('Loses a core cluster', 'تفقد قطاعًا أساسيًا') },
                { color: EXIT_COLORS.reduced, label: tr('Other partners remain', 'يبقى شركاء آخرون') },
              ]
            : [
                { color: matrixCellColor(0), label: tr('A core cluster has no partner', 'قطاع أساسي بلا شريك') },
                { color: matrixCellColor(1), label: tr('Only one partner', 'شريك واحد فقط') },
                { color: matrixCellColor(2), label: tr('Two partners', 'شريكان') },
                { color: matrixCellColor(3), label: tr('Three or more', 'ثلاثة أو أكثر') },
              ]
      }
      overlayTooltip={(key) => {
        const p = profileSet?.profiles.get(key);
        if (!p) return null;
        const rank = priorityByKey.get(key);
        const missing = missingCore(p);
        return [
          `${names.locality(p.name)} · ${names.state(p.state)}`,
          tr(`${p.events} conflict events · ${partnerCount(p)} partners · ${p.activities} activities`, `${p.events} حدث نزاع · ${partnerCount(p)} شريك · ${p.activities} نشاط`),
          rank ? tr(`Priority #${rank.rank} (score ${Math.round(rank.score * 100)})`, `الأولوية رقم ${rank.rank} (الدرجة ${Math.round(rank.score * 100)})`) : '',
          missing.length ? tr(`Missing: ${missing.join(', ')}`, `غائب: ${missing.map((c) => clusterLabel(c, true)).join('، ')}`) : '',
          tr('Click for the full profile', 'انقر لعرض الملف كاملًا'),
        ]
          .filter(Boolean)
          .join('\n');
      }}
      selectedLocality={selectedKey}
      onLocalityClick={(key) => setSelectedKey((k) => (k === key ? null : key))}
    />
  );

  const filterNote = [
    selectedCluster && clusterLabel(selectedCluster, isAr),
    selectedOrgType && orgTypeLabel(selectedOrgType, isAr),
  ]
    .filter(Boolean)
    .join(' · ');

  // PDF report of the view on screen.
  const openReport = () => {
    const n = (v: number) => Math.round(v).toLocaleString('en-US');
    const ml = (m: string) => (isAr ? formatDate(`${m}-01`, locale, { month: 'long', year: 'numeric' }) : `${monthLabel(m)} ${m.slice(0, 4)}`);
    const period = selectedMonth ? ml(selectedMonth) : `${ml(data.months[0])} – ${ml(data.months[data.months.length - 1])}`;
    const area = selectedState ? names.state(selectedState) : tr('Sudan, all states', 'السودان، كل الولايات');
    const exitOrgInfo = activeExitOrg !== null ? data.orgs[activeExitOrg] : null;
    const exitName = exitOrgInfo ? exitOrgInfo.acronym || exitOrgInfo.name : '';
    const uncovered = exit.filter((e) => e.impact === 'uncovered').length;
    const clusterLost = exit.filter((e) => e.impact === 'cluster-lost').length;
    const gapRows = matrix.filter((r) => r.cells.some((c) => c === 0));
    const loc = (p: { name: string; state: string }) => `${names.locality(p.name)}, ${names.state(p.state)}`;
    const findings: string[] = [];
    if (priority[0])
      findings.push(
        tr(
          `Highest priority: ${loc(priority[0].profile)} (score ${priority[0].score.toFixed(2)}), with ${n(priority[0].profile.events)} conflict events, ${n(priority[0].profile.fatalities)} fatalities and ${priority[0].profile.orgActivities.size} partners.`,
          `أعلى أولوية: ${loc(priority[0].profile)} (الدرجة ${priority[0].score.toFixed(2)})، مع ${n(priority[0].profile.events)} حدث نزاع و${n(priority[0].profile.fatalities)} وفاة و${priority[0].profile.orgActivities.size} شريكًا.`,
        ),
      );
    if (gapRows.length)
      findings.push(
        tr(
          `${gapRows.length} of the ${matrix.length} most conflict-affected localities lack at least one core cluster (Health, WASH, Food Security, Protection, Nutrition).`,
          `تفتقر ${gapRows.length} من أكثر ${matrix.length} محليات تأثرًا بالنزاع إلى قطاع أساسي واحد على الأقل (الصحة، والمياه والإصحاح، والأمن الغذائي، والحماية، والتغذية).`,
        ),
      );
    if (exitOrgInfo)
      findings.push(
        tr(
          `If ${exitName} left, ${exit.length} localities would lose its activities: ${uncovered} would have no partner left and ${clusterLost} would lose a core cluster.`,
          `إن غادرت ${exitName}، تفقد ${exit.length} محلية أنشطتها: ${uncovered} لن يبقى فيها أي شريك، و${clusterLost} ستفقد قطاعًا أساسيًا.`,
        ),
      );
    if (topOrgs[0])
      findings.push(
        tr(
          `${topOrgs[0].org.acronym || topOrgs[0].org.name} reported the most activities (${n(topOrgs[0].activities)} across ${topOrgs[0].states} states).`,
          `أبلغت ${topOrgs[0].org.acronym || topOrgs[0].org.name} عن أكبر عدد من الأنشطة (${n(topOrgs[0].activities)} في ${topOrgs[0].states} ولايات).`,
        ),
      );
    const fatalTotal = fatalitiesByKey ? Array.from(fatalitiesByKey.values()).reduce((a, b) => a + b, 0) : 0;
    setReport({
      title: tr('3W Humanitarian Mapping', 'خرائط العمل الإنساني (3W)'),
      subtitle: tr('Who does what, where — and where the response falls short', 'من يفعل ماذا وأين — وأين تقصر الاستجابة'),
      color: unBlue.dark,
      path: '/projects/3w-humanitarian-mapping',
      scope: [
        [tr('Period', 'الفترة'), period],
        [tr('Area', 'المنطقة'), area],
        [tr('Filters', 'عوامل التصفية'), [filterNote, selectedOrg].filter(Boolean).join(' · ') || tr('None', 'لا شيء')],
        [tr('Priority weights', 'أوزان الأولوية'), tr(`conflict ${weights.conflict}, scarcity ${weights.scarcity}, missing clusters ${weights.missing}, decline ${weights.decline}`, `النزاع ${weights.conflict}، الندرة ${weights.scarcity}، القطاعات الغائبة ${weights.missing}، التراجع ${weights.decline}`)],
      ],
      summary: tr(
        `${n(totalOrgsCount)} organizations reported ${n(totalActivities)} activities in ${totalStatesCovered} states (${period}). Combined with ${n(fatalTotal)} conflict fatalities recorded by ACLED over the same months, the analysis ranks localities by need against coverage, tests what one partner's exit would leave behind, and shows which core clusters are missing where conflict is heaviest.`,
        `أبلغت ${n(totalOrgsCount)} منظمة عن ${n(totalActivities)} نشاطًا في ${totalStatesCovered} ولاية (${period}). وبدمجها مع ${n(fatalTotal)} وفاة سجّلتها ACLED في الأشهر نفسها، يرتّب التحليل المحليات حسب الحاجة مقابل التغطية، ويختبر ما يتركه انسحاب شريك واحد، ويُظهر القطاعات الأساسية الغائبة حيث النزاع أشد.`,
      ),
      findings,
      kpis: [
        { label: tr('Activities', 'الأنشطة'), value: n(totalActivities) },
        { label: tr('Organizations', 'المنظمات'), value: n(totalOrgsCount) },
        { label: tr('States covered', 'الولايات المغطاة'), value: String(totalStatesCovered) },
        { label: tr('Conflict fatalities', 'وفيات النزاع'), value: n(fatalTotal), note: tr('ACLED, same months', 'ACLED، الأشهر نفسها') },
      ],
      figures: [
        {
          image: captureCanvas('.maplibregl-canvas'),
          caption: showOnMap
            ? mode === 'priority'
              ? tr('Priority index by locality (darker = higher need against coverage).', 'مؤشر الأولوية حسب المحلية (الأغمق = حاجة أعلى مقابل التغطية).')
              : mode === 'exit'
                ? tr(`Localities affected if ${exitName} left.`, `المحليات المتأثرة إن غادرت ${exitName}.`)
                : tr('Core-cluster coverage in the most conflict-affected localities.', 'تغطية القطاعات الأساسية في أكثر المحليات تأثرًا بالنزاع.')
            : tr(`${metricLabels[metric]} by state and locality.`, `${metricLabelsAr[metric]} حسب الولاية والمحلية.`),
          legend:
            showOnMap && mode === 'exit'
              ? [
                  { color: EXIT_COLORS.uncovered, label: tr('No partner left', 'لا يبقى أي شريك') },
                  { color: EXIT_COLORS['cluster-lost'], label: tr('Core cluster lost', 'فقدان قطاع أساسي') },
                  { color: EXIT_COLORS.reduced, label: tr('Reduced', 'تغطية أقل') },
                ]
              : showOnMap && mode === 'priority'
                ? [
                    { color: priorityColor(0.1), label: tr('Low', 'منخفضة') },
                    { color: priorityColor(0.42), label: tr('Medium', 'متوسطة') },
                    { color: priorityColor(0.7), label: tr('Highest', 'الأعلى') },
                  ]
                : undefined,
        },
      ],
      tables: [
        {
          title: tr('Priority localities', 'المحليات ذات الأولوية'),
          columns: [tr('#', '#'), tr('Locality', 'المحلية'), tr('Score', 'الدرجة'), tr('Events', 'الأحداث'), tr('Fatalities', 'الوفيات'), tr('Partners', 'الشركاء'), tr('Missing core clusters', 'القطاعات الأساسية الغائبة')],
          numeric: [true, false, true, true, true, true, false],
          rows: priority.slice(0, 12).map((p) => [p.rank, loc(p.profile), p.score.toFixed(2), p.profile.events, p.profile.fatalities, p.profile.orgActivities.size, missingCore(p.profile).map((c) => clusterLabel(c, isAr)).join(', ') || '—']),
          note: tr('Score 0–1: weighted percentile ranks of conflict, partner scarcity, missing core clusters and declining presence.', 'الدرجة 0–1: رتب مئينية موزونة للنزاع وندرة الشركاء والقطاعات الأساسية الغائبة وتراجع الحضور.'),
        },
        {
          title: tr('Core-cluster coverage where conflict is heaviest', 'تغطية القطاعات الأساسية حيث النزاع أشد'),
          columns: [tr('Locality', 'المحلية'), tr('Events', 'الأحداث'), ...CORE_CLUSTERS.map((c) => clusterLabel(c, isAr))],
          numeric: [false, true, true, true, true, true, true],
          rows: matrix.map((r) => [loc(r.profile), r.profile.events, ...r.cells.map((c) => (c ? c : '✕'))]),
          note: tr('Cells show the number of partners per cluster; ✕ = no partner.', 'تُظهر الخلايا عدد الشركاء لكل قطاع؛ ✕ = لا شريك.'),
        },
        ...(exitOrgInfo && exit.length
          ? [
              {
                title: tr(`Exit test: ${exitName}`, `اختبار الانسحاب: ${exitName}`),
                columns: [tr('Locality', 'المحلية'), tr('Impact', 'الأثر'), tr('Its activities', 'أنشطتها'), tr('Partners left', 'الشركاء الباقون'), tr('Clusters lost', 'القطاعات المفقودة')],
                numeric: [false, false, true, true, false],
                rows: exit.slice(0, 12).map((e) => [
                  loc(e.profile),
                  e.impact === 'uncovered' ? tr('No partner left', 'لا شريك') : e.impact === 'cluster-lost' ? tr('Core cluster lost', 'فقدان قطاع') : tr('Reduced', 'تغطية أقل'),
                  e.orgActivities,
                  e.remainingPartners,
                  e.lostClusters.map((c) => clusterLabel(c, isAr)).join(', ') || '—',
                ]),
              },
            ]
          : []),
      ],
      method: [
        tr('OCHA 3W activity rows are counted per locality, organization and cluster; ACLED events and fatalities are summed over the same months and joined by state and locality name.', 'تُعدّ صفوف أنشطة 3W من أوتشا لكل محلية ومنظمة وقطاع؛ وتُجمع أحداث ACLED ووفياتها للأشهر نفسها وتُربط باسم الولاية والمحلية.'),
        tr('The priority index ranks each factor as a percentile across localities, then combines them with the weights shown in the scope table.', 'يرتّب مؤشر الأولوية كل عامل كرتبة مئينية بين المحليات، ثم يجمعها بالأوزان الموضحة في جدول النطاق.'),
        tr('The exit test removes one organization and recounts partners and core clusters in each locality it served.', 'يزيل اختبار الانسحاب منظمة واحدة ويعيد عدّ الشركاء والقطاعات الأساسية في كل محلية خدمتها.'),
      ],
      limits: [
        tr('3W data records reported activities, not people reached or funding; partners that do not report are invisible.', 'تسجّل بيانات 3W الأنشطة المُبلغ عنها، لا الأشخاص المستفيدين أو التمويل؛ والشركاء غير المُبلغين لا يظهرون.'),
        tr('Locality names are matched across two datasets; a few may not join.', 'تُطابق أسماء المحليات بين مجموعتي بيانات؛ وقد لا يتطابق بعضها.'),
        tr('Conflict counts are a proxy for need; they do not measure displacement or food insecurity directly.', 'أعداد النزاع مؤشر تقريبي للحاجة؛ ولا تقيس النزوح أو انعدام الأمن الغذائي مباشرة.'),
      ],
      sources: [
        tr('OCHA Sudan, 2026 HRP Response Monitoring, consolidated 3W data (Jan–Jun 2026), via HDX.', 'أوتشا السودان، رصد الاستجابة لخطة الاستجابة الإنسانية 2026، بيانات 3W الموحّدة (يناير–يونيو 2026)، عبر HDX.'),
        tr(`ACLED (Armed Conflict Location & Event Data), Sudan HRP political violence events and fatalities by month, via HDX${acled?.asOf ? `, as of ${acled.asOf}` : ''}. acleddata.com`, `ACLED، أحداث العنف السياسي والوفيات شهريًا في السودان، عبر HDX${acled?.asOf ? `، حتى ${acled.asOf}` : ''}. acleddata.com`),
        tr('Administrative boundaries: OCHA COD-AB for Sudan, via HDX. Basemap © OpenStreetMap contributors, © CARTO.', 'الحدود الإدارية: OCHA COD-AB للسودان، عبر HDX. الخريطة الأساسية © مساهمو OpenStreetMap، © CARTO.'),
      ],
    });
  };

  const insightsNode = profileSet && acled && (
    <ThreeWExplorer
      data={data}
      months={data.months}
      mode={mode}
      onModeChange={setMode}
      showOnMap={showOnMap}
      onShowOnMapChange={setShowOnMap}
      weights={weights}
      onWeightsChange={setWeights}
      priority={priority}
      exitOrg={activeExitOrg}
      onExitOrgChange={setExitOrg}
      exit={exit}
      matrix={matrix}
      selected={selectedProfile}
      selectedRank={selectedKey ? priorityByKey.get(selectedKey) ?? null : null}
      onSelect={setSelectedKey}
      onStateSelect={(state) => setSelectedState(state)}
      filterNote={filterNote || null}
    />
  );

  const aboutContent = (
    <>
      {isAr ? (
        <>
          <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.9 }}>
            خرائط 3W (من يفعل ماذا وأين) هي الطريقة التي تتابع بها هيئات التنسيق الإنساني أي المنظمات تنفّذ أي الأنشطة وفي أي المواقع، وهي عماد
            رصد الاستجابة وتحليل الفجوات في أزمة بحجم أزمة السودان. تحوّل هذه اللوحة ستة أشهر من تقارير 3W الموحّدة في 19 ولاية و188 محلية إلى
            خريطة قابلة للاستكشاف: صفِّ حسب الشهر أو القطاع أو المنظمة أو نوع المنظمة، وانقر ولاية أو عنصرًا في مخطط أو شريحة في أي مكان من
            الصفحة لتتبعك بقية اللوحة.
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.9 }}>
            بنيتُ هذه اللوحة على <strong>CoffeeMap.dev</strong> لأوضح كيف يمكن لبيانات الأنشطة التي يبلّغ عنها الشركاء، وهي عادة مدفونة في جداول
            تُتبادل في اجتماعات التنسيق، أن تصبح أداة مكانية تفاعلية قابلة للتصفية. تجمع اللوحة 7,517 نشاطًا مُبلَّغًا عنه من 165 منظمة في 13 قطاعًا،
            مطابقة مع الحدود الإدارية الرسمية للسودان.
          </Typography>
        </>
      ) : (
        <>
      <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
        3W (Who, What, Where) mapping is how humanitarian coordination bodies track which
        organizations are running which activities, in which locations — the backbone of
        response monitoring and gap analysis for a crisis the scale of Sudan&apos;s. This
        dashboard turns six months of consolidated 3W reporting across 19 states and 188
        localities into an explorable map: filter by month, cluster, organization, or
        organization type — click a state, a chart element, or a chip anywhere on the page
        and the rest of the dashboard follows.
      </Typography>
      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
        I built this on <strong>CoffeeMap.dev</strong> to demonstrate how raw partner-reported
        activity data — the kind normally buried in spreadsheets shared across coordination
        meetings — can become an interactive, filterable spatial tool. It aggregates 7,517
        reported activities from 165 organizations across 13 clusters, matched against
        official Sudan administrative boundaries.
      </Typography>
        </>
      )}
    </>
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
              articleHref="/insights/3w-response-gap-explorer"
              onReport={openReport}
              title={tr('3W Humanitarian Mapping', 'خرائط العمل الإنساني (3W)')}
              subtitle={tr('Who, What, Where — Sudan Response Monitoring', 'من يفعل ماذا وأين — رصد الاستجابة في السودان')}
              icon={<GroupsIcon sx={{ fontSize: 28 }} />}
              source={tr('OCHA Sudan – 2026 HRP Response Monitoring, Consolidated 3W Data (Jan–Jun 2026)', 'أوتشا السودان – رصد الاستجابة لخطة الاستجابة الإنسانية 2026، بيانات 3W الموحّدة (يناير–يونيو 2026)')}
              author="Amin Adnan Gasim"
              date={tr('Jan–Jun 2026', 'يناير–يونيو 2026')}
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
                  width: 360,
                  flexShrink: 0,
                  height: 600,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-evenly',
                  overflow: 'hidden',
                }}
              >
                {chartsNodeBare}
              </Paper>

              <Box sx={{ flex: 1, position: 'relative', height: 600 }}>
                <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden' }}>
                  {mapNode}
                </Paper>

                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    right: 16,
                    zIndex: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    pointerEvents: 'none',
                  }}
                >
                  <Box sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'auto', ...floatingPanelSx }}>
                    {filtersNode}
                  </Box>
                  <Box sx={{ pointerEvents: 'auto', ...floatingPanelSx }}>{metricToggleNode}</Box>
                </Box>

                {aboutOpen && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 420,
                      maxWidth: 'calc(100% - 48px)',
                      zIndex: 600,
                      p: 3,
                      ...floatingPanelSx,
                      bgcolor: 'rgba(255,255,255,0.98)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark }}>
                        {tr('About this dashboard', 'حول لوحة المعلومات')}
                      </Typography>
                      <IconButton onClick={() => setAboutOpen(false)} size="small" aria-label={tr('Close', 'إغلاق')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    {aboutContent}
                  </Box>
                )}
              </Box>

              <Box sx={{ width: 360, flexShrink: 0, height: 600, '& > *': { height: '100%', overflowY: 'auto' } }}>
                {detailPanelNode}
              </Box>
            </Box>

            {insightsNode && <Paper elevation={2} sx={{ mx: 2, mb: 1.25, p: 1.5, flexShrink: 0 }}>{insightsNode}</Paper>}

            <Paper elevation={2} sx={{ mx: 2, mb: 1.5, p: 1.25, flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
                {tr('Monthly Trend (Jan–Jun 2026)', 'الاتجاه الشهري (يناير–يونيو 2026)')}
              </Typography>
              {trendNode}
            </Paper>
          </>
        ) : (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>{filtersNode}</Box>
            <Box sx={{ mb: 2, overflowX: 'auto' }}>{metricToggleNode}</Box>
            <Box sx={{ mb: 2 }}>{statsNode}</Box>
            <Paper elevation={2} sx={{ height: 420, mb: 2, overflow: 'hidden' }}>
              {mapNode}
            </Paper>
            {aboutOpen && (
              <Paper elevation={2} sx={{ p: 2.5, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark }}>
                    {tr('About this dashboard', 'حول لوحة المعلومات')}
                  </Typography>
                  <IconButton onClick={() => setAboutOpen(false)} size="small" aria-label={tr('Close', 'إغلاق')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                {aboutContent}
              </Paper>
            )}
            {insightsNode && <Paper elevation={2} sx={{ p: 2, mb: 2 }}>{insightsNode}</Paper>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{sidebarNode}</Box>
            <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 1 }}>
                {tr('Monthly Trend (Jan–Jun 2026)', 'الاتجاه الشهري (يناير–يونيو 2026)')}
              </Typography>
              {trendNode}
            </Paper>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
}

export default function ThreeWHumanitarianMapping() {
  return <DashboardContent />;
}
