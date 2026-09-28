'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import type { MapMode } from '@/components/SudanFloodMap';
import { FloodData, FLOOD_CLASSES, CHOLERA_COLOR, floodBrown, fmt, loadFloodData } from '@/utils/sudanFlood';

const SudanFloodMap = nextDynamic(() => import('@/components/SudanFloodMap'), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>Loading map...</Box>,
});
const RankedBars = nextDynamic(() => import('@/components/SudanFloodCharts').then((m) => ({ default: m.RankedBars })), { ssr: false });
const HousingChart = nextDynamic(() => import('@/components/SudanFloodCharts').then((m) => ({ default: m.HousingChart })), { ssr: false });

const FLOOD_BAR = FLOOD_CLASSES[2].color;

function StatTile({ label, value, note, color }: { label: string; value: string; note?: string; color: string }) {
  return (
    <Paper elevation={2} sx={{ p: 1.25, height: 70, flex: '1 1 150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 500, lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem', lineHeight: 1.1 }}>
          {note}
        </Typography>
      )}
    </Paper>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, lineHeight: 2 }}>
      {children}
    </Typography>
  );
}

export default function SudanFloodDashboard() {
  const [data, setData] = useState<FloodData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>('both');
  const [selected, setSelected] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    loadFloodData().then(setData).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const cholera = useMemo(() => new Map((data?.cholera.states ?? []).map((c) => [c.pcode, c])), [data]);
  const state = data?.states.find((s) => s.pcode === selected) ?? null;
  const stateLocalities = data?.localities.filter((l) => l.state_pcode === selected) ?? [];

  if (!data) {
    return (
      <AppLayout>
        <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: floodBrown.light }}>
          {error ? <Alert severity="error">Could not load the flood data: {error}</Alert> : <CircularProgress sx={{ color: floodBrown.DEFAULT }} />}
        </Box>
      </AppLayout>
    );
  }

  const { summary } = data;
  const stateCholera = state ? cholera.get(state.pcode) : undefined;
  const scope = state ? state.name : 'Sudan';
  const notReported = state ? 'not reported for this state' : undefined;

  const statsNode = (
    <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
      <StatTile
        label={`People affected · ${scope}`}
        value={fmt(state ? state.affected : summary.total_affected)}
        note={state ? (state.affected == null ? notReported : undefined) : `${summary.families_affected.toLocaleString()} families · ${summary.localities_affected} localities`}
        color="#1565c0"
      />
      <StatTile label={`Displaced · ${scope}`} value={fmt(state ? state.displaced : summary.displaced)} note={state && state.displaced == null ? notReported : undefined} color="#0277bd" />
      <StatTile
        label={`Deaths · ${scope}`}
        value={fmt(state ? state.deaths : summary.deaths)}
        note={state ? (state.deaths == null ? notReported : state.injured != null ? `${state.injured} injured` : undefined) : `${summary.injured} injured`}
        color="#c62828"
      />
      <StatTile label={`Homes destroyed · ${scope}`} value={fmt(state ? state.homes_destroyed : summary.homes_destroyed)} note={state && state.homes_destroyed == null ? notReported : undefined} color="#b71c1c" />
      <StatTile label={`Homes damaged · ${scope}`} value={fmt(state ? state.homes_damaged : summary.homes_damaged)} note={state && state.homes_damaged == null ? notReported : undefined} color="#e65100" />
      <StatTile
        label={`Cholera cases · ${scope}`}
        value={fmt(state ? stateCholera?.cases ?? null : data.cholera.total_cases)}
        note={state ? (stateCholera ? undefined : 'no cases reported') : `${data.cholera.total_deaths} deaths · CFR ${data.cholera.case_fatality_rate}%`}
        color={CHOLERA_COLOR}
      />
    </Box>
  );

  const ranked = [...data.states].sort((a, b) => (b.affected ?? -1) - (a.affected ?? -1));
  const maxAffected = Math.max(...data.states.map((s) => s.affected ?? 0));

  const stateList = (
    <Box>
      <SectionTitle>States by people affected</SectionTitle>
      {ranked.map((s) => {
        const c = cholera.get(s.pcode);
        return (
          <Box
            key={s.pcode}
            onClick={() => setSelected(s.pcode)}
            sx={{ py: 0.6, px: 0.75, mx: -0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: '#f3ece6' } }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: s.has_data ? 600 : 400, color: s.has_data ? 'text.primary' : 'text.secondary' }} noWrap>
                {s.name}
                {c && <Box component="span" sx={{ ml: 0.75, px: 0.5, borderRadius: 0.5, fontSize: '0.65rem', bgcolor: '#ede7f6', color: CHOLERA_COLOR }}>cholera</Box>}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: s.has_data ? 'text.primary' : 'text.disabled' }}>
                {s.affected != null ? fmt(s.affected) : 'no data'}
              </Typography>
            </Box>
            {s.affected != null && (
              <Box sx={{ height: 4, mt: 0.4, borderRadius: 2, bgcolor: '#eee' }}>
                <Box sx={{ height: '100%', width: `${(s.affected / maxAffected) * 100}%`, borderRadius: 2, bgcolor: FLOOD_BAR }} />
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );

  const stateDetails = state && (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <IconButton size="small" onClick={() => setSelected(null)} aria-label="Back to all states">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{state.name}</Typography>
          <Typography variant="caption" color="text.secondary" dir="rtl">{state.arabic_name}</Typography>
        </Box>
      </Box>
      {!state.has_data && (
        <Alert severity="info" sx={{ mb: 1.5, py: 0 }}>
          <Typography variant="caption">The flash update reports no flood figures for this state.</Typography>
        </Alert>
      )}
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mb: 1.5, '& td': { py: 0.4, fontSize: '0.8rem', borderBottom: '1px solid #f0f0f0' } }}>
        <tbody>
          {([
            ['People affected', state.affected],
            ['Displaced', state.displaced],
            ['Deaths', state.deaths],
            ['Injured', state.injured],
            ['Homes destroyed', state.homes_destroyed],
            ['Homes damaged', state.homes_damaged],
            ['Cholera cases', stateCholera?.cases ?? null],
          ] as [string, number | null][]).map(([k, v]) => (
            <tr key={k}>
              <td style={{ color: '#666' }}>{k}</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: v == null ? '#aaa' : undefined }}>{fmt(v)}</td>
            </tr>
          ))}
        </tbody>
      </Box>
      <SectionTitle>Flood-affected localities ({stateLocalities.length})</SectionTitle>
      {stateLocalities.length ? (
        stateLocalities.map((l) => (
          <Box key={l.adm2_pcode} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.35 }}>
            <Typography variant="body2">{l.adm2_name}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: l.affected == null ? 'text.disabled' : 'text.primary' }}>
              {l.affected != null ? fmt(l.affected) : 'affected'}
            </Typography>
          </Box>
        ))
      ) : (
        <Typography variant="body2" color="text.secondary">No localities named in the flash update.</Typography>
      )}
      {stateLocalities.find((l) => l.notes)?.notes && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
          {stateLocalities.find((l) => l.notes)?.notes}
        </Typography>
      )}
    </Box>
  );

  const sidebar = (
    <Box>
      <SectionTitle>Map layer</SectionTitle>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={mode}
        onChange={(_e, v) => v && setMode(v)}
        sx={{ mb: 2, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600 } }}
      >
        <ToggleButton value="floods">Floods</ToggleButton>
        <ToggleButton value="cholera">Cholera</ToggleButton>
        <ToggleButton value="both">Both</ToggleButton>
      </ToggleButtonGroup>
      <Divider sx={{ mb: 1 }} />
      {state ? stateDetails : stateList}
    </Box>
  );

  const mapNode = <SudanFloodMap data={data} mode={mode} selected={selected} onSelect={setSelected} />;

  const affectedBars = data.states.filter((s) => s.affected != null).map((s) => ({ pcode: s.pcode, name: s.name, value: s.affected! }));
  const choleraBars = data.cholera.states.map((c) => ({ pcode: c.pcode, name: c.name, value: c.cases }));
  const chartsNode = (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' }, gap: 1.5 }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <RankedBars
          title="People affected by state"
          subtitle="States with reported figures · click a bar to select"
          bars={affectedBars}
          color={FLOOD_BAR}
          label="People affected"
          selected={selected}
          onSelect={setSelected}
          height={230}
        />
      </Paper>
      <Paper elevation={2} sx={{ p: 2 }}>
        <HousingChart
          destroyed={state ? state.homes_destroyed : summary.homes_destroyed}
          damaged={state ? state.homes_damaged : summary.homes_damaged}
          place={state ? state.name : 'All of Sudan'}
          height={230}
        />
      </Paper>
      <Paper elevation={2} sx={{ p: 2 }}>
        <RankedBars
          title="Cholera cases by state"
          subtitle={data.cholera.period}
          bars={choleraBars}
          color={CHOLERA_COLOR}
          label="Cholera cases"
          selected={selected}
          onSelect={setSelected}
          height={230}
        />
      </Paper>
    </Box>
  );

  const aboutData = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Data sources</Typography>
        <IconButton size="small" onClick={() => setAboutOpen(false)} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <b>Floods:</b> {summary.source}; {summary.notes.toLowerCase()}. State and locality figures are as reported; many states have no figures yet.
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <b>Cholera:</b> {data.cholera.source}, {data.cholera.period}.
      </Typography>
      <Typography variant="body2">
        <b>Boundaries:</b> OCHA Sudan administrative boundaries (COD-AB, admin 1 and 2). <b>Basemap:</b> OpenStreetMap.
      </Typography>
    </Box>
  );

  const header = (
    <Box sx={{ position: 'relative' }}>
      <DashboardHeader source={summary.source} author={summary.author} date={summary.date} mb={isDesktop ? 1.5 : 3} />
      <IconButton onClick={() => setAboutOpen((v) => !v)} sx={{ position: 'absolute', top: 12, right: 12, color: 'white' }} aria-label="About the data">
        <InfoOutlinedIcon />
      </IconButton>
    </Box>
  );

  const aboutProject = (
    <Paper elevation={2} sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', mb: 1.5, color: floodBrown.DEFAULT }}>
        About the project
      </Typography>
      <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.75 }}>
        This dashboard maps the humanitarian impact of the 2024 rainy-season floods in Sudan, as reported in OCHA&apos;s Flash Update of 5 September 2024,
        together with the cholera outbreak that followed. It shows how many people were affected in each state, where homes were destroyed or damaged,
        deaths and displacement, and which localities were hit, alongside cholera cases reported by the Federal Ministry of Health, giving responders and
        researchers a clear, spatial picture of where the crisis is most severe and where flooding and disease overlap.
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.75 }}>
        I transformed the OCHA Sudan Flash Update on the humanitarian impact of heavy rains and flooding into an interactive dashboard on <strong>CoffeeMap.dev</strong>,
        turning a dense situation report into a clearer, more accessible spatial story. The dashboard highlights the scale and geography of the crisis by
        visualizing affected states and localities, key humanitarian indicators such as people affected, displaced populations, deaths, injuries, destroyed
        and damaged homes, and the broader public health risks linked to flooding, including the cholera outbreak. By structuring the report into a more
        intuitive data experience, I demonstrated how geospatial design and dashboard thinking can support faster understanding, better communication, and
        more informed humanitarian decision-making from complex emergency data.{' '}
        <a
          href="https://www.unocha.org/publications/report/sudan/sudan-humanitarian-impact-heavy-rains-and-flooding-flash-update-no-04-5-september-2024"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: floodBrown.DEFAULT, fontWeight: 600 }}
        >
          Read the flash update
        </a>
      </Typography>
    </Paper>
  );

  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', bgcolor: floodBrown.light }}>
        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>{header}</Box>

        {isDesktop ? (
          <>
            <Box sx={{ px: 2, pb: 1.25 }}>{statsNode}</Box>
            <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Paper elevation={2} sx={{ width: 300, flexShrink: 0, height: 640, overflowY: 'auto', p: 2 }}>{sidebar}</Paper>
              <Box sx={{ flex: 1, position: 'relative', height: 640, minWidth: 0 }}>
                <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden' }}>{mapNode}</Paper>
                {aboutOpen && (
                  <Paper
                    elevation={6}
                    sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 460, maxWidth: 'calc(100% - 48px)', zIndex: 700, p: 3 }}
                  >
                    {aboutData}
                  </Paper>
                )}
              </Box>
            </Box>
            <Box sx={{ px: 2, pb: 1.5 }}>{chartsNode}</Box>
          </>
        ) : (
          <Box sx={{ p: 2, pt: 0 }}>
            <Box sx={{ mb: 2 }}>{statsNode}</Box>
            {aboutOpen && <Paper elevation={2} sx={{ p: 2.5, mb: 2 }}>{aboutData}</Paper>}
            <Paper elevation={2} sx={{ height: 460, mb: 2, overflow: 'hidden' }}>{mapNode}</Paper>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>{sidebar}</Paper>
            <Box sx={{ mb: 2 }}>{chartsNode}</Box>
          </Box>
        )}

        <Box sx={{ px: 2, pb: 3, pt: isDesktop ? 0 : 1 }}>{aboutProject}</Box>
      </Box>
    </AppLayout>
  );
}
