'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, IconButton, Paper, Typography, useMediaQuery, useTheme } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import UrbanHeatControls, { DateWindow } from '@/components/UrbanHeatControls';
import type { CellInfo, UrbanImages, UrbanLayerVisibility } from '@/components/UrbanHeatMap';
import {
  AirClimate,
  DEFAULT_WEIGHTS,
  DEM_SOURCE,
  Grid,
  LAND_COVER,
  Layers,
  ParkCollection,
  Results,
  TreeCollection,
  Weights,
  accessAt,
  cellAt,
  computeResults,
  deriveLayers,
  districtSummaries,
  fetchAirClimate,
  fetchDem,
  fetchLandCover,
  fetchLst,
  fetchNdvi,
  fetchOsmLive,
  fetchOsmSnapshots,
  heatAt,
  makeGrid,
  renderCanopy,
  renderEquity,
  renderHeat,
  renderHotspots,
  renderNdvi,
  renderPriority,
  summarize,
} from '@/lib/urbanHeat';
import { shiftDate } from '@/lib/geoRaster';

const UrbanHeatMap = nextDynamic(() => import('@/components/UrbanHeatMap'), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>Loading map...</Box>,
});

const desert = { light: '#FBF3EC', DEFAULT: '#D84315', dark: '#8E2412' };

// Default: the peak of the 2025 summer, when surface heat is strongest.
const DEFAULT_WINDOW: DateWindow = { start: '2025-06-15', end: '2025-08-31' };

interface Data {
  dem: Float32Array | null;
  landCover: Uint8Array;
  lst: Float32Array | null;
  ndvi: Float32Array | null;
  trees: TreeCollection;
  parks: ParkCollection;
  layers: Layers | null;
  results: Results | null;
}

type Stats = ReturnType<typeof summarize>;
type District = ReturnType<typeof districtSummaries>[number];

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Paper elevation={2} sx={{ p: 1.25, height: 64, flex: '1 1 150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 500, lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', color, lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Paper>
  );
}

const fmt = (v: number | null | undefined, digits = 1, unit = '') => (v == null || !Number.isFinite(v) ? '–' : `${v.toFixed(digits)}${unit}`);
const metres = (v: number) => (!Number.isFinite(v) ? '–' : v < 1000 ? `${Math.round(v)} m` : `${(v / 1000).toFixed(1)} km`);

export default function RiyadhUrbanHeat() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [osm, setOsm] = useState<{ trees: TreeCollection; parks: ParkCollection } | null>(null);
  const [osmSource, setOsmSource] = useState('');
  const [images, setImages] = useState<UrbanImages>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [air, setAir] = useState<AirClimate | null>(null);
  const [scenes, setScenes] = useState<{ lst: string[]; ndvi: string[] }>({ lst: [], ndvi: [] });
  const [backend, setBackend] = useState('');
  const [win, setWin] = useState(DEFAULT_WINDOW);
  const [visible, setVisible] = useState<UrbanLayerVisibility>({
    hillshade: false, heat: true, hotspots: false, vegetation: false, canopy: false, equity: false, priority: true, trees: true, parks: true,
  });
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [focus, setFocus] = useState<{ lon: number; lat: number } | null>(null);
  const [lstRange, setLstRange] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState('Starting…');
  const [busy, setBusy] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Large rasters live in a ref; React state only holds what the UI renders.
  const data = useRef<Data | null>(null);
  const gridRef = useRef<Grid | null>(null);
  const weightsRef = useRef(weights);
  useEffect(() => {
    weightsRef.current = weights;
  });

  // Weights -> k-means hotspots, TF.js risk, equity and priority -> images, stats.
  const recompute = useCallback(async () => {
    const d = data.current, g = gridRef.current;
    if (!d?.layers || !g) return;
    setStatus('Running the equity model…');
    await new Promise((r) => setTimeout(r, 30)); // let the status paint
    const results = await computeResults(d.layers, weightsRef.current);
    d.results = results;
    setBackend(results.backend);
    setImages((prev) => ({ ...prev, hotspots: renderHotspots(g, results), equity: renderEquity(g, results), priority: renderPriority(g, results) }));
    setStats(summarize(g, d.layers, results));
    setDistricts(districtSummaries(g, d.layers, results));
    setStatus('');
  }, []);

  // Rebuild the weight-independent layers from whatever data is loaded.
  const derive = useCallback(async () => {
    const d = data.current, g = gridRef.current;
    if (!d?.lst || !d.ndvi || !g) return;
    setStatus('Computing canopy, distances and building density…');
    await new Promise((r) => setTimeout(r, 30));
    d.layers = deriveLayers(g, d.lst, d.ndvi, d.landCover, d.dem, d.trees, d.parks);
    setLstRange(d.layers.lstRange);
    setImages((prev) => ({ ...prev, heat: renderHeat(g, d.layers!), vegetation: renderNdvi(g, d.layers!), canopy: renderCanopy(g, d.layers!) }));
    await recompute();
  }, [recompute]);

  const loadWindow = useCallback(async (w: DateWindow) => {
    const d = data.current, g = gridRef.current;
    if (!d || !g) return;
    setBusy(true);
    const problems: string[] = [];
    try {
      setStatus('Fetching Landsat LST, Sentinel-2 NDVI and NASA POWER…');
      const [lst, ndvi, climate] = await Promise.allSettled([
        fetchLst(g, w.start, w.end, setStatus),
        fetchNdvi(g, w.start, w.end, setStatus),
        fetchAirClimate(w.start, w.end),
      ]);
      if (lst.status === 'fulfilled' && lst.value.dates.length) d.lst = lst.value.values;
      else problems.push(lst.status === 'rejected' ? `Landsat: ${String(lst.reason?.message ?? lst.reason).slice(0, 160)}` : 'No clear Landsat 8/9 scenes in this window.');
      if (ndvi.status === 'fulfilled' && ndvi.value.dates.length) d.ndvi = ndvi.value.values;
      else problems.push(ndvi.status === 'rejected' ? `Sentinel-2: ${String(ndvi.reason?.message ?? ndvi.reason).slice(0, 160)}` : 'No clear Sentinel-2 scenes in this window.');
      setScenes({
        lst: lst.status === 'fulfilled' ? lst.value.dates : [],
        ndvi: ndvi.status === 'fulfilled' ? ndvi.value.dates : [],
      });
      if (climate.status === 'fulfilled') setAir(climate.value);
      else problems.push(`NASA POWER: ${String(climate.reason?.message ?? climate.reason).slice(0, 160)}`);
      await derive();
    } catch (err) {
      problems.push(String((err as Error).message ?? err));
    } finally {
      setErrors(problems);
      setStatus('');
      setBusy(false);
    }
  }, [derive]);

  // Static layers (land cover, DEM, OSM snapshots), then the default window,
  // then a live OSM refresh in the background.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = makeGrid();
      gridRef.current = g;
      setGrid(g);
      try {
        const [landCover, dem, snapshots] = await Promise.all([
          fetchLandCover(g, (m) => !cancelled && setStatus(m)),
          fetchDem(g, () => {}).catch(() => null),
          fetchOsmSnapshots(),
        ]);
        if (cancelled) return;
        data.current = { dem, landCover, lst: null, ndvi: null, trees: snapshots.trees, parks: snapshots.parks, layers: null, results: null };
        setOsm(snapshots);
        setOsmSource('OSM snapshot');
        await loadWindow(DEFAULT_WINDOW);

        const live = await fetchOsmLive();
        if (live && !cancelled && data.current && live.parks.features.length) {
          data.current.trees = live.trees;
          data.current.parks = live.parks;
          setOsm(live);
          setOsmSource('OSM live (Overpass)');
          await derive();
        }
      } catch (err) {
        if (!cancelled) {
          setErrors([String((err as Error).message ?? err)]);
          setStatus('');
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWindow, derive]);

  const describeCell = useCallback((lng: number, lat: number): CellInfo | null => {
    const d = data.current, g = gridRef.current;
    const L = d?.layers, R = d?.results;
    if (!d || !g || !L || !R) return null;
    const k = cellAt(g, lng, lat);
    if (k === null) return null;
    const heatClass = R.hotspots[k];
    const rows: [string, string][] = [
      ['Land cover', LAND_COVER[L.landCover[k]] ?? '–'],
      ['Land surface temp.', fmt(L.lst[k], 1, ' °C')],
      ['NDVI', fmt(L.ndvi[k], 2)],
      ['Tree canopy (cell)', fmt(L.canopy[k] * 100, 0, '%')],
      ['Canopy within 300 m', fmt(L.canopyNearby[k] * 100, 0, '%')],
      ['Nearest tree canopy', metres(L.distTree[k])],
      ['Nearest park', metres(L.distPark[k])],
      ['Building density', fmt(L.builtDensity[k] * 100, 0, '%')],
      ['Elevation', L.dem ? fmt(L.dem[k], 0, ' m') : '–'],
    ];
    if (L.urban[k]) {
      rows.push(
        ['Heat class (k-means)', heatClass ? `${heatClass} of 4${heatClass === 4 ? ' · hotspot' : ''}` : '–'],
        ['Heat exposure', fmt(heatAt(L, k), 2)],
        ['Vegetation access', fmt(accessAt(L, k), 2)],
        ['Canopy equity', fmt(R.equity[k], 2)],
        ['Heat risk (TF.js)', fmt(R.risk[k], 2)],
        ['Priority zone', R.priority[k] ? 'Yes' : 'No'],
      );
    } else {
      rows.push(['Equity', 'Not assessed (outside the built-up city)']);
    }
    return { lng, lat, rows };
  }, []);

  const maxDate = shiftDate(new Date().toISOString().slice(0, 10), -7);
  const dateSpan = (dates: string[]) => (dates.length ? `${dates.length} dates, ${dates[0]} → ${dates[dates.length - 1]}` : 'none');

  const controlsNode = (
    <UrbanHeatControls
      window={win}
      onWindowChange={setWin}
      onLoad={() => loadWindow(win)}
      visible={visible}
      onVisibleChange={setVisible}
      weights={weights}
      onWeightsChange={setWeights}
      onRecompute={async () => {
        setBusy(true);
        await recompute();
        setBusy(false);
      }}
      busy={busy}
      maxDate={maxDate}
    />
  );

  const statsNode = (
    <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
      <StatTile label="Mean urban surface temp." value={fmt(stats?.meanUrbanLst, 1, ' °C')} color={desert.DEFAULT} />
      <StatTile label="Surface UHI (city − surroundings)" value={stats ? `${stats.suhi > 0 ? '+' : ''}${fmt(stats.suhi, 1, ' °C')}` : '–'} color={desert.dark} />
      <StatTile label="Urban tree canopy" value={fmt(stats?.urbanCanopyPct, 1, '%')} color="#2e7d32" />
      <StatTile label="Heat hotspots" value={stats ? `${Math.round(stats.hotspotKm2)} km²` : '–'} color="#6a1b9a" />
      <StatTile label="Priority planting zones" value={stats ? `${Math.round(stats.priorityKm2)} km²` : '–'} color="#c51b7d" />
      <StatTile label="Air temp. max · solar (NASA POWER)" value={air ? `${fmt(air.meanTmax, 1, ' °C')} · ${fmt(air.meanSolar, 1)} kWh/m²` : '–'} color="#455a64" />
    </Box>
  );

  const mapNode = (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <UrbanHeatMap
        grid={grid}
        images={images}
        trees={osm?.trees ?? null}
        parks={osm?.parks ?? null}
        visible={visible}
        lstRange={lstRange}
        focus={focus}
        describeCell={describeCell}
      />
      {(status || errors.length > 0) && (
        <Box sx={{ position: 'absolute', top: 12, left: 12, right: 60, display: 'flex', flexDirection: 'column', gap: 1, pointerEvents: 'none' }}>
          {status && (
            <Paper elevation={2} sx={{ px: 1.5, py: 0.75, display: 'inline-flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start' }}>
              <CircularProgress size={14} />
              <Typography variant="caption">{status}</Typography>
            </Paper>
          )}
          {errors.map((e) => (
            <Alert key={e} severity="warning" sx={{ py: 0, pointerEvents: 'auto', alignSelf: 'flex-start', maxWidth: 520 }} onClose={() => setErrors((list) => list.filter((x) => x !== e))}>
              <Typography variant="caption">{e}</Typography>
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );

  const districtsNode = (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Focus districts <Typography component="span" variant="caption" color="text.secondary">(within 1.5 km · click to zoom)</Typography></Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            '& th, & td': { py: 0.6, px: 1, fontSize: '0.8rem', textAlign: 'right', whiteSpace: 'nowrap' },
            '& th:first-of-type, & td:first-of-type': { textAlign: 'left' },
            '& th': { color: 'text.secondary', fontWeight: 600, borderBottom: '1px solid #eee' },
            '& tbody tr': { cursor: 'pointer' },
            '& tbody tr:hover': { bgcolor: '#fdf1ea' },
          }}
        >
          <thead>
            <tr>
              <th>District</th>
              <th>Surface temp.</th>
              <th>Canopy</th>
              <th>Equity</th>
              <th>Priority area</th>
            </tr>
          </thead>
          <tbody>
            {[...districts].sort((a, b) => (b.lst || 0) - (a.lst || 0)).map((d) => (
              <tr key={d.name} onClick={() => setFocus({ lon: d.lon, lat: d.lat })}>
                <td>
                  <b>{d.name}</b> <Typography component="span" variant="caption" color="text.secondary">{d.nameAr}</Typography>
                </td>
                <td>{fmt(d.lst, 1, ' °C')}</td>
                <td>{fmt(d.canopyPct, 1, '%')}</td>
                <td style={{ color: d.equity < -0.3 ? '#b2182b' : d.equity > 0 ? '#1b7837' : undefined, fontWeight: 600 }}>{fmt(d.equity, 2)}</td>
                <td>{fmt(d.priorityPct, 0, '%')}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Paper>
  );

  const aboutNode = (
    <Box sx={{ '& p': { mb: 1 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Data &amp; method</Typography>
        <IconButton size="small" onClick={() => setAboutOpen(false)} aria-label="Close"><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <Typography variant="body2" component="p">
        All processing runs in your browser on a ~70 m Web Mercator grid. <b>Heat:</b> Landsat 8/9 surface temperature ({dateSpan(scenes.lst)}).{' '}
        <b>Vegetation:</b> Sentinel-2 NDVI ({dateSpan(scenes.ndvi)}), both via Microsoft Planetary Computer. <b>Land cover:</b> ESA WorldCover 2021.{' '}
        <b>Trees &amp; parks:</b> OpenStreetMap via Overpass ({osmSource || 'loading'}). <b>Air climate:</b> NASA POWER. <b>DEM:</b> {DEM_SOURCE.name}.
      </Typography>
      <Typography variant="body2" component="p">
        Hotspots are the hottest of four k-means clusters of urban surface temperature. Vegetation access averages canopy within 300 m, nearness to tree canopy and
        nearness to a park; <b>equity = access − heat</b>. The heat risk model (w1·heat + w2·building density + w3·(1 − NDVI)) runs as a TensorFlow.js matrix product
        ({backend || '…'} backend). Priority zones are the top 15% of built-up cells by risk × (1 − access). Equity is assessed only in the built-up city.
      </Typography>
    </Box>
  );

  const header = (
    <Box sx={{ position: 'relative' }}>
      <DashboardHeader
        title="Riyadh Urban Heat & Tree Canopy Equity"
        subtitle="Client-side GeoAI — Landsat LST, Sentinel-2 NDVI, WorldCover, OSM trees & parks · Riyadh, Saudi Arabia"
        icon={<ThermostatIcon sx={{ fontSize: 28 }} />}
        source="Landsat 8/9 & Sentinel-2 via Planetary Computer, ESA WorldCover, NASA POWER, OpenStreetMap"
        author="Amin Adnan Gasim"
        date={`${win.start} → ${win.end}`}
        gradientFrom={desert.DEFAULT}
        gradientTo={desert.dark}
        mb={isDesktop ? 1.5 : 3}
        articleHref="/insights/riyadh-urban-heat"
      />
      <IconButton onClick={() => setAboutOpen((v) => !v)} sx={{ position: 'absolute', top: 12, right: 12, color: 'white' }} aria-label="About this dashboard">
        <InfoOutlinedIcon />
      </IconButton>
    </Box>
  );

  const aboutProject = (
    <Paper elevation={2} sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', mb: 1.5, color: desert.dark }}>
        About the project
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.75, mb: 2 }}>
        Riyadh is one of the hottest large cities in the world, and summer surface temperatures regularly pass 50 °C. That heat is not shared equally:
        dense, paved districts with few trees trap far more of it than neighbourhoods along the green Wadi Hanifa corridor or around well-planted parks.
        This dashboard maps land surface temperature from Landsat, vegetation from Sentinel-2, and tree canopy and parks from satellite and OpenStreetMap
        data, then scores every built-up cell for <b>tree canopy equity</b>: how much vegetation its residents can reach compared with how much heat they face.
        Cells that are hot, dense and poorly served by trees become <b>priority zones</b> for planting and cooling interventions, directly relevant to
        city greening efforts such as the Green Riyadh programme.
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.75 }}>
        The analysis runs entirely in your browser. Satellite mosaics, land cover, terrain, climate records and OSM features are fetched from public APIs,
        decoded pixel by pixel and processed on a ~70 m grid: k-means clustering finds heat hotspots, exact distance transforms measure how far each cell is
        from tree canopy and parks, and a TensorFlow.js model weighs heat, building density and lack of vegetation into a heat-risk score. Note that by day
        Riyadh&apos;s desert surroundings heat up faster than the city itself, so the analysis compares districts within the built-up area rather than the city
        with the desert. Change the imagery window or the model weights and press Recompute Equity to explore the result, or click any location to see the
        values behind it. It is a screening tool for planning conversations, not a substitute for field surveys.
      </Typography>
    </Paper>
  );

  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', bgcolor: desert.light }}>
        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>{header}</Box>

        {isDesktop ? (
          <>
            <Box sx={{ px: 2, pb: 1.25 }}>{statsNode}</Box>
            <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Paper elevation={2} sx={{ width: 300, flexShrink: 0, height: 700, overflowY: 'auto', p: 2 }}>{controlsNode}</Paper>
              <Box sx={{ flex: 1, position: 'relative', height: 700, minWidth: 0 }}>
                <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden' }}>{mapNode}</Paper>
                {aboutOpen && (
                  <Paper
                    elevation={6}
                    sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, maxWidth: 'calc(100% - 48px)', zIndex: 700, p: 3 }}
                  >
                    {aboutNode}
                  </Paper>
                )}
              </Box>
            </Box>
            <Box sx={{ px: 2, pb: 1.5 }}>{districtsNode}</Box>
          </>
        ) : (
          <Box sx={{ p: 2, pt: 0 }}>
            <Box sx={{ mb: 2 }}>{statsNode}</Box>
            {aboutOpen && <Paper elevation={2} sx={{ p: 2.5, mb: 2 }}>{aboutNode}</Paper>}
            <Paper elevation={2} sx={{ height: 480, mb: 2, overflow: 'hidden' }}>{mapNode}</Paper>
            <Box sx={{ mb: 2 }}>{districtsNode}</Box>
            <Paper elevation={2} sx={{ p: 2 }}>{controlsNode}</Paper>
          </Box>
        )}

        <Box sx={{ px: 2, pb: 3, pt: isDesktop ? 0 : 2 }}>{aboutProject}</Box>
      </Box>
    </AppLayout>
  );
}
