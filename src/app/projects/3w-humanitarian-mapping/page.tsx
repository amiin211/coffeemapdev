'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Drawer,
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
    () => ({ month: selectedMonth, cluster: selectedCluster, state: selectedState }),
    [selectedMonth, selectedCluster, selectedState]
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

  const detailAndChartsNode = (
    <>
      <ThreeWDetailPanel
        state={selectedState}
        topOrgs={topOrgs}
        orgTypeBreakdown={orgTypeAggregates}
        clustersActive={clusterAggregates.map((c) => c.cluster)}
        onClear={() => setSelectedState(null)}
      />
      <TopOrgsBarChart orgs={topOrgs} />
      <ClusterBreakdownPieChart clusters={clusterAggregates} />
      <OrgTypeDoughnutChart orgTypes={orgTypeAggregates} />
      <MonthlyTrendChart trend={trend} />
    </>
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

  return (
    <AppLayout>
      <Box
        sx={{
          height: isDesktop ? 'calc(100vh - 96px)' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: unBlue.light,
        }}
      >
        <Box sx={{ px: 2, pt: 2, flexShrink: 0 }}>
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
            />
            <IconButton
              onClick={() => setAboutOpen(true)}
              sx={{ position: 'absolute', top: 12, right: 12, color: 'white' }}
              aria-label="About this dashboard"
            >
              <InfoOutlinedIcon />
            </IconButton>
          </Box>
        </Box>

        {isDesktop ? (
          <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
            {mapNode}

            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 392,
                zIndex: 500,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ p: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', alignSelf: 'flex-start', ...floatingPanelSx }}>
                {filtersNode}
              </Box>
              {statsNode}
            </Box>

            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                bottom: 16,
                width: 360,
                zIndex: 500,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                pr: 0.5,
              }}
            >
              {detailAndChartsNode}
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>{filtersNode}</Box>
            {statsNode}
            <Paper elevation={2} sx={{ height: 420, mb: 2, overflow: 'hidden' }}>
              {mapNode}
            </Paper>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{detailAndChartsNode}</Box>
          </Box>
        )}
      </Box>

      <Drawer anchor="right" open={aboutOpen} onClose={() => setAboutOpen(false)}>
        <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, color: unBlue.dark }}>
              About this dashboard
            </Typography>
            <IconButton onClick={() => setAboutOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
            3W (Who, What, Where) mapping is how humanitarian coordination bodies track which
            organizations are running which activities, in which locations — the backbone of
            response monitoring and gap analysis for a crisis the scale of Sudan&apos;s. This
            dashboard turns six months of consolidated 3W reporting across 19 states and 188
            localities into an explorable map: filter by reporting month or sector cluster,
            click a state to see its active partners and coverage, and track how the response
            footprint shifts over time.
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8 }}>
            I built this on <strong>CoffeeMap.dev</strong> to demonstrate how raw partner-reported
            activity data — the kind normally buried in spreadsheets shared across coordination
            meetings — can become an interactive, filterable spatial tool. It aggregates 7,517
            reported activities from 165 organizations across 13 clusters, matched against
            official Sudan administrative boundaries, to make coverage gaps and partner
            presence immediately visible at both the state and locality level.
          </Typography>
        </Box>
      </Drawer>
    </AppLayout>
  );
}

export const revalidate = 0;

export default function ThreeWHumanitarianMapping() {
  return <DashboardContent />;
}
