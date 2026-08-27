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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import GroupsIcon from '@mui/icons-material/Groups';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import ThreeWStatCards from '@/components/ThreeWStatCards';
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
  loading: () => <Paper sx={{ p: 2, height: '100%' }}>Loading map...</Paper>,
});
const ThreeWDetailPanel = nextDynamic(() => import('@/components/ThreeWDetailPanel'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 300 }}>Loading...</Paper>,
});
const TopOrgsBarChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.TopOrgsBarChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 240 }}>Loading...</Paper>,
});
const ClusterBreakdownPieChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.ClusterBreakdownPieChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 220 }}>Loading...</Paper>,
});
const OrgTypeDoughnutChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.OrgTypeDoughnutChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 200 }}>Loading...</Paper>,
});
const MonthlyTrendChart = nextDynamic(() => import('@/components/ThreeWCharts').then((m) => ({ default: m.MonthlyTrendChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 200 }}>Loading...</Paper>,
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
  const [metric, setMetric] = useState<'activities' | 'orgs' | 'clusters'>('activities');
  const [aboutOpen, setAboutOpen] = useState(false);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    fetch('/data/threew_data.json')
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error('Error loading 3W data:', err));
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

  const filtersNode = (
    <>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Month</InputLabel>
        <Select label="Month" value={selectedMonth ?? ''} onChange={(e) => setSelectedMonth(e.target.value || null)}>
          <MenuItem value="">All Months</MenuItem>
          {data.months.map((m) => (
            <MenuItem key={m} value={m}>
              {monthLabel(m)} 2026
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Cluster</InputLabel>
        <Select label="Cluster" value={selectedCluster ?? ''} onChange={(e) => setSelectedCluster(e.target.value || null)}>
          <MenuItem value="">All Clusters</MenuItem>
          {data.clusters.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedState && (
        <Chip label={`State: ${selectedState}`} size="small" onDelete={() => setSelectedState(null)} sx={{ bgcolor: `${unBlue.DEFAULT}20` }} />
      )}
      {selectedOrg && (
        <Chip label={`Org: ${selectedOrg}`} size="small" onDelete={() => setSelectedOrg(null)} sx={{ bgcolor: `${unBlue.DEFAULT}20` }} />
      )}
      {selectedOrgType && (
        <Chip label={`Type: ${selectedOrgType}`} size="small" onDelete={() => setSelectedOrgType(null)} sx={{ bgcolor: `${unBlue.DEFAULT}20` }} />
      )}
    </>
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
      onMetricChange={setMetric}
      onStateSelect={setSelectedState}
    />
  );

  const aboutContent = (
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
            <DashboardHeader
              title="3W Humanitarian Mapping"
              subtitle="Who, What, Where — Sudan Response Monitoring"
              icon={<GroupsIcon sx={{ fontSize: 28 }} />}
              source="OCHA Sudan – 2026 HRP Response Monitoring, Consolidated 3W Data (Jan–Jun 2026)"
              author="Amin Adnan Gasim"
              date="Jan–Jun 2026"
              gradientFrom={unBlue.DEFAULT}
              gradientTo={unBlue.dark}
              mb={isDesktop ? 1.5 : 3}
            />
            <IconButton
              onClick={() => setAboutOpen((v) => !v)}
              sx={{ position: 'absolute', top: 12, right: 12, color: 'white' }}
              aria-label="About this dashboard"
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
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                {chartsNodeBare}
              </Paper>

              <Box sx={{ flex: 1, position: 'relative', height: 600 }}>
                <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden' }}>
                  {mapNode}
                </Paper>

                <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 500, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', ...floatingPanelSx }}>
                    {filtersNode}
                  </Box>
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
                      <Typography variant="h6" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, color: unBlue.dark }}>
                        About this dashboard
                      </Typography>
                      <IconButton onClick={() => setAboutOpen(false)} size="small" aria-label="Close">
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

            <Paper elevation={2} sx={{ mx: 2, mb: 1.5, p: 1.25, flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 0.5 }}>
                Monthly Trend (Jan–Jun 2026)
              </Typography>
              {trendNode}
            </Paper>
          </>
        ) : (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>{filtersNode}</Box>
            <Box sx={{ mb: 2 }}>{statsNode}</Box>
            <Paper elevation={2} sx={{ height: 420, mb: 2, overflow: 'hidden' }}>
              {mapNode}
            </Paper>
            {aboutOpen && (
              <Paper elevation={2} sx={{ p: 2.5, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, color: unBlue.dark }}>
                    About this dashboard
                  </Typography>
                  <IconButton onClick={() => setAboutOpen(false)} size="small" aria-label="Close">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                {aboutContent}
              </Paper>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{sidebarNode}</Box>
            <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
                Monthly Trend (Jan–Jun 2026)
              </Typography>
              {trendNode}
            </Paper>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
}

export const revalidate = 0;

export default function ThreeWHumanitarianMapping() {
  return <DashboardContent />;
}
