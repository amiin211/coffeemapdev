'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  IconButton,
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
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import AcledFilters from '@/components/AcledFilters';
import type { AcledMetric } from '@/components/AcledMap';
import { unBlue, unCategorical } from '@/theme/unColors';
import {
  AcledData,
  AcledFilters as Filters,
  byLocality,
  byState,
  formatMonth,
  monthlySeries,
  totals as computeTotals,
} from '@/utils/acled';

const AcledMap = nextDynamic(() => import('@/components/AcledMap'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: '100%' }}>Loading map...</Paper>,
});
const MonthlyChart = nextDynamic(() => import('@/components/AcledCharts').then((m) => ({ default: m.MonthlyChart })), {
  ssr: false,
  loading: () => <Box sx={{ height: 190 }}>Loading...</Box>,
});
const TopBarChart = nextDynamic(() => import('@/components/AcledCharts').then((m) => ({ default: m.TopBarChart })), {
  ssr: false,
  loading: () => <Box sx={{ height: 280 }}>Loading...</Box>,
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
  const [admin1, setAdmin1] = useState<any>(null);
  const [admin2, setAdmin2] = useState<any>(null);
  const [filters, setFilters] = useState<Filters>({ monthRange: [0, 0], state: null, locality: null });
  const [metric, setMetric] = useState<AcledMetric>('events');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

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

  const stateTotals = useMemo(() => (data ? byState(data, filters) : new Map()), [data, filters]);
  const localityTotals = useMemo(() => (data ? byLocality(data, filters) : []), [data, filters]);
  const series = useMemo(() => (data ? monthlySeries(data, filters) : []), [data, filters]);
  const totals = useMemo(() => (data ? computeTotals(data, filters) : { events: 0, fatalities: 0 }), [data, filters]);

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
        .map((l) => ({ name: l.locality.name, events: l.events, fatalities: l.fatalities, state: l.locality.state })),
    [localityTotals, metric]
  );

  const inRange = series.slice(filters.monthRange[0], filters.monthRange[1] + 1);
  const peak = inRange.reduce<(typeof series)[number] | null>((best, p) => (!best || p[metric] > best[metric] ? p : best), null);
  const statesAffected = Array.from(stateTotals.values()).filter((s) => s.events > 0).length;
  const localitiesAffected = localityTotals.filter((l) => l.events > 0 && (!filters.locality || l.locality.name === filters.locality)).length;

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
  const periodLabel = from === to ? formatMonth(months[from]) : `${formatMonth(months[from])} – ${formatMonth(months[to])}`;
  const partialNote = data.asOf ? `Partial month — data as of ${data.asOf}` : null;

  const updateFilters = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => setFilters({ monthRange: [0, months.length - 1], state: null, locality: null });
  const handleMonthClick = (i: number) =>
    updateFilters({ monthRange: from === i && to === i ? [0, months.length - 1] : [i, i] });

  const stateOptions = data.states;
  const localityOptions = filters.state
    ? data.localities.filter((l) => l.state === filters.state).map((l) => l.name)
    : [];

  const filtersNode = (
    <AcledFilters
      filters={filters}
      months={months}
      stateOptions={stateOptions}
      localityOptions={localityOptions}
      onChange={updateFilters}
      onReset={resetFilters}
    />
  );

  const statsNode = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
      <StatTile label={`${filters.locality ?? filters.state ?? 'Sudan'} · Events`} value={totals.events} color={unBlue.dark} />
      <StatTile label="Reported Fatalities" value={totals.fatalities} color="#C62828" />
      {!filters.state && <StatTile label="States Affected" value={statesAffected} color={unCategorical[3]} />}
      <StatTile label="Localities Affected" value={localitiesAffected} color={unCategorical[4]} />
      <StatTile
        label={`Peak Month (${metric})`}
        value={peak && peak[metric] > 0 ? `${formatMonth(peak.month)} · ${peak[metric].toLocaleString()}` : '—'}
        color={unCategorical[5]}
      />
    </Box>
  );

  const metricToggleNode = (
    <ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, value) => value && setMetric(value)}>
      {(['events', 'fatalities'] as AcledMetric[]).map((m) => (
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
          {m === 'events' ? 'Events' : 'Fatalities'}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );

  const mapNode = (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <AcledMap
        admin1={admin1}
        admin2={admin2}
        stateTotals={stateTotals}
        localityTotals={localityTotals}
        periodLabel={periodLabel}
        metric={metric}
        selectedState={filters.state}
        selectedLocality={filters.locality}
        onStateSelect={(state) => updateFilters({ state, locality: null })}
        onLocalitySelect={(locality) => updateFilters({ locality })}
      />
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 500, ...floatingPanelSx }}>{metricToggleNode}</Box>
    </Box>
  );

  const barChartsNode = (
    <>
      <TopBarChart
        title={`Top States by ${metric === 'events' ? 'Events' : 'Fatalities'}`}
        entries={topStates}
        measure={metric}
        selected={filters.state}
        onSelect={(state) => updateFilters({ state, locality: null })}
        height={isDesktop ? 290 : 280}
      />
      <Divider />
      <TopBarChart
        title={`Top Localities${filters.state ? ` in ${filters.state}` : ''}`}
        entries={topLocalities}
        measure={metric}
        selected={filters.locality}
        onSelect={(locality) => {
          const match = topLocalities.find((l) => l.name === locality);
          updateFilters(locality && match ? { state: match.state, locality } : { locality: null });
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
              partialNote={partialNote}
              onMonthClick={handleMonthClick}
              height={190}
            />
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Click a month to focus on it. {formatMonth(lastMonth)} is a partial month{data.asOf ? ` (data as of ${data.asOf})` : ''}.
      </Typography>
    </>
  );

  const aboutContent = (
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
  );

  const aboutHeader = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Typography variant="h6" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark }}>
        About this dashboard
      </Typography>
      <IconButton onClick={() => setAboutOpen(false)} size="small" aria-label="Close">
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
            <DashboardHeader
              title="Sudan Conflicts"
              subtitle="Political Violence Events & Fatalities — Sudan"
              icon={<CrisisAlertIcon sx={{ fontSize: 28 }} />}
              source={`ACLED – Sudan HRP Political Violence Events and Fatalities by Month${data.asOf ? ` (as of ${data.asOf})` : ''}`}
              author="Amin Adnan Gasim"
              date={`${formatMonth(months[0])} – ${formatMonth(lastMonth)}`}
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
                      Filters
                    </Typography>
                  )}
                  <IconButton size="small" onClick={() => setSidebarOpen((v) => !v)} aria-label={sidebarOpen ? 'Collapse filters' : 'Expand filters'}>
                    {sidebarOpen ? <ChevronLeftIcon /> : <TuneIcon />}
                  </IconButton>
                </Box>
                {sidebarOpen && <Box sx={{ px: 2, pb: 2, overflowY: 'auto', minWidth: 248 }}>{filtersNode}</Box>}
              </Paper>

              <Box sx={{ flex: 1, position: 'relative', height: 620, minWidth: 0 }}>
                <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden' }}>
                  {mapNode}
                </Paper>

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
                  Filters
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sidebarOpen ? 'Hide' : 'Show'}
                </Typography>
              </Box>
              {sidebarOpen && <Box sx={{ px: 2, pb: 2, pt: 1 }}>{filtersNode}</Box>}
            </Paper>
            <Paper elevation={2} sx={{ height: 440, mb: 2, overflow: 'hidden' }}>
              {mapNode}
            </Paper>
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
