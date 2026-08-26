'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Container, Grid, Typography, Paper, CircularProgress, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import GroupsIcon from '@mui/icons-material/Groups';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import ThreeWStatCards from '@/components/ThreeWStatCards';
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
  loading: () => <Paper sx={{ p: 2, height: 400 }}>Loading map...</Paper>,
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

function DashboardContent() {
  const [data, setData] = useState<ThreeWData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [metric, setMetric] = useState<'activities' | 'orgs' | 'clusters'>('activities');

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
        <Box sx={{ py: 2, minHeight: '100vh', bgcolor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ py: 2, minHeight: '100vh', bgcolor: '#fafafa' }}>
        <Container maxWidth="xl">
          <DashboardHeader
            title="3W Humanitarian Mapping"
            subtitle="Who, What, Where — Sudan Response Monitoring"
            icon={<GroupsIcon sx={{ fontSize: 28 }} />}
            source="OCHA Sudan – 2026 HRP Response Monitoring, Consolidated 3W Data (Jan–Jun 2026)"
            author="Amin Adnan Gasim"
            date="Jan–Jun 2026"
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Month</InputLabel>
              <Select
                label="Month"
                value={selectedMonth ?? ''}
                onChange={(e) => setSelectedMonth(e.target.value || null)}
              >
                <MenuItem value="">All Months</MenuItem>
                {data.months.map((m) => (
                  <MenuItem key={m} value={m}>
                    {monthLabel(m)} 2026
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Cluster</InputLabel>
              <Select
                label="Cluster"
                value={selectedCluster ?? ''}
                onChange={(e) => setSelectedCluster(e.target.value || null)}
              >
                <MenuItem value="">All Clusters</MenuItem>
                {data.clusters.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

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

          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              <Paper elevation={2} sx={{ height: 600 }}>
                <ThreeWMap
                  stateAggregates={stateAggregates}
                  localityAggregates={localityAggregates}
                  selectedState={selectedState}
                  metric={metric}
                  onMetricChange={setMetric}
                  onStateSelect={setSelectedState}
                />
              </Paper>
              <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
                  3W (Who, What, Where) mapping is how humanitarian coordination bodies track which
                  organizations are running which activities, in which locations — the backbone of
                  response monitoring and gap analysis for a crisis the scale of Sudan&apos;s. This
                  dashboard turns six months of consolidated 3W reporting across 19 states and 188
                  localities into an explorable map: filter by reporting month or sector cluster,
                  click a state to see its active partners and coverage, and track how the response
                  footprint shifts over time.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  I built this on <strong>CoffeeMap.dev</strong> to demonstrate how raw partner-reported
                  activity data — the kind normally buried in spreadsheets shared across coordination
                  meetings — can become an interactive, filterable spatial tool. It aggregates 7,517
                  reported activities from 165 organizations across 13 clusters, matched against
                  official Sudan administrative boundaries, to make coverage gaps and partner
                  presence immediately visible at both the state and locality level.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Grid container spacing={2}>
                <Grid item xs={12} sx={{ minHeight: 260 }}>
                  <ThreeWDetailPanel
                    state={selectedState}
                    topOrgs={topOrgs}
                    orgTypeBreakdown={orgTypeAggregates}
                    clustersActive={clusterAggregates.map((c) => c.cluster)}
                    onClear={() => setSelectedState(null)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TopOrgsBarChart orgs={topOrgs} />
                </Grid>
                <Grid item xs={12}>
                  <ClusterBreakdownPieChart clusters={clusterAggregates} />
                </Grid>
                <Grid item xs={12}>
                  <OrgTypeDoughnutChart orgTypes={orgTypeAggregates} />
                </Grid>
                <Grid item xs={12}>
                  <MonthlyTrendChart trend={trend} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </AppLayout>
  );
}

export const revalidate = 0;

export default function ThreeWHumanitarianMapping() {
  return <DashboardContent />;
}
