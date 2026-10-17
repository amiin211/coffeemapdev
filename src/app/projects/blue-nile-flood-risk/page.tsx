'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, IconButton, Paper, Typography, useMediaQuery, useTheme } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import FloodIcon from '@mui/icons-material/Flood';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import FloodRiskControls, { EventSettings } from '@/components/FloodRiskControls';
import type { CellInfo, LayerVisibility } from '@/components/FloodRiskMap';
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  DEM_SOURCE,
  FloodMask,
  Grid,
  RISK_CLASSES,
  RiverCollection,
  SarImage,
  SarSource,
  Weights,
  cellAt,
  computeFloodMask,
  computeHeightAboveRiver,
  computeRiverDistance,
  computeRisk,
  computeSlope,
  fetchDem,
  fetchRainfall,
  fetchRiversOverpass,
  fetchRiversSnapshot,
  fetchSar,
  fetchSentinelHubToken,
  makeGrid,
  renderFlood,
  renderRainfall,
  renderRisk,
  riskClass,
  sarCellSummary,
  shiftDate,
  summarize,
} from '@/lib/floodRisk';
import { useI18n } from '@/i18n';
import { progressAr } from '@/i18n/progress';
import { water } from '@/theme/waterColors';

const FloodRiskMap = nextDynamic(() => import('@/components/FloodRiskMap'), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>…</Box>,
});

// Default event: the record Blue Nile flood of late Aug – Sep 2020, with a
// July pre-flood baseline. Both windows have good Sentinel-1 coverage.
const DEFAULT_EVENT: EventSettings = {
  preDate: '2020-07-13',
  floodDate: '2020-09-12',
  sarWindow: 12,
  rainDays: 30,
  provider: 'planetary',
  token: '',
  clientId: '',
  clientSecret: '',
};

interface Data {
  dem: Float32Array;
  slope: Float32Array;
  distance: Float32Array;
  hand: Float32Array;
  rain: Float32Array | null;
  sarPre: SarImage | null;
  sarPost: SarImage | null;
  mask: FloodMask | null;
  sarWater: Float32Array | null;
  risk: Float32Array | null;
  rainDays: number;
}

type Stats = ReturnType<typeof summarize> & { coverage: number | null; rainDays: number };

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

const km2 = (v: number) => `${Math.round(v).toLocaleString()} km²`;

export default function BlueNileFloodRisk() {
  const { isAr, tr } = useI18n();
  const progress = useCallback((m: string) => (isAr ? progressAr(m) : m), [isAr]);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [rivers, setRivers] = useState<RiverCollection | null>(null);
  const [riversSource, setRiversSource] = useState('');
  const [images, setImages] = useState<{ risk?: string; flood?: string; rainfall?: string }>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [event, setEvent] = useState(DEFAULT_EVENT);
  const [visible, setVisible] = useState<LayerVisibility>({ hillshade: true, rainfall: false, risk: true, flood: true, rivers: true });
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [status, setStatus] = useState(tr('Starting…', 'جارٍ البدء…'));
  const [busy, setBusy] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Large rasters live in a ref; React state only holds what the UI renders.
  const data = useRef<Data | null>(null);
  const gridRef = useRef<Grid | null>(null);
  const params = useRef({ thresholds, weights });
  useEffect(() => {
    params.current = { thresholds, weights };
  });

  // Flood mask (from the current thresholds) -> risk (from the current
  // weights) -> map images and stats.
  const recompute = useCallback(() => {
    const d = data.current, g = gridRef.current;
    if (!d || !g) return;
    const { thresholds: t, weights: w } = params.current;
    d.mask = d.sarPost ? computeFloodMask(g, d.sarPost, d.sarPre, t) : null;
    d.sarWater = d.mask?.water ?? null;
    d.risk = computeRisk(d, w);
    setImages({
      risk: renderRisk(g, d.risk),
      flood: d.mask ? renderFlood(g, d.mask) : undefined,
      rainfall: d.rain ? renderRainfall(g, d.rain) : undefined,
    });
    setStats({ ...summarize(g, d.risk, d.mask, d.rain), coverage: d.sarPost?.coverage ?? null, rainDays: d.rainDays });
  }, []);

  const setRiverNetwork = useCallback((collection: RiverCollection) => {
    const d = data.current, g = gridRef.current;
    if (!d || !g) return;
    const { distance, nearest } = computeRiverDistance(g, collection);
    d.distance = distance;
    d.hand = computeHeightAboveRiver(g, d.dem, nearest);
    setRivers(collection);
  }, []);

  const loadEvent = useCallback(async (ev: EventSettings) => {
    const d = data.current, g = gridRef.current;
    if (!d || !g) return;
    setBusy(true);
    const problems: string[] = [];
    try {
      let source: SarSource = { kind: 'planetary' };
      if (ev.provider !== 'planetary') {
        const token = ev.token || (await fetchSentinelHubToken(ev.provider, ev.clientId, ev.clientSecret));
        source = { kind: 'sentinelhub', endpoint: ev.provider, token };
      }
      setStatus(tr('Fetching Sentinel-1 and rainfall…', 'جارٍ جلب صور Sentinel-1 والأمطار…'));
      const [rain, pre, post] = await Promise.allSettled([
        fetchRainfall(g, ev.floodDate, ev.rainDays),
        fetchSar(g, ev.preDate, ev.sarWindow, source, (m) => setStatus(progress(m))),
        fetchSar(g, ev.floodDate, ev.sarWindow, source, (m) => setStatus(progress(m))),
      ]);
      d.rain = rain.status === 'fulfilled' ? rain.value : null;
      d.rainDays = ev.rainDays;
      d.sarPre = pre.status === 'fulfilled' && pre.value.coverage > 0 ? pre.value : null;
      d.sarPost = post.status === 'fulfilled' && post.value.coverage > 0 ? post.value : null;
      for (const [name, r] of [[tr('Rainfall', 'الأمطار'), rain], [tr('Pre-flood SAR', 'رادار ما قبل الفيضان'), pre], [tr('Flood-date SAR', 'رادار تاريخ الفيضان'), post]] as const) {
        if (r.status === 'rejected') problems.push(`${name}: ${String(r.reason?.message ?? r.reason).slice(0, 200)}`);
      }
      if (post.status === 'fulfilled' && post.value.coverage === 0) problems.push(tr('No Sentinel-1 scenes in the flood-date window; try another date or a longer window.', 'لا توجد مشاهد Sentinel-1 في فترة تاريخ الفيضان؛ جرّب تاريخًا آخر أو فترة أطول.'));
      setStatus(tr('Computing flood mask and risk…', 'جارٍ حساب قناع الفيضان والمخاطر…'));
      recompute();
    } catch (err) {
      problems.push(String((err as Error).message ?? err));
    } finally {
      setErrors(problems);
      setStatus('');
      setBusy(false);
    }
  }, [recompute, tr, progress]);

  // Base layers (DEM, slope, rivers) once, then the default event.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = makeGrid();
      gridRef.current = g;
      setGrid(g);
      try {
        const [dem, snapshot] = await Promise.all([fetchDem(g, (m) => !cancelled && setStatus(progress(m))), fetchRiversSnapshot()]);
        if (cancelled) return;
        setStatus(tr('Computing slope and distance to rivers…', 'جارٍ حساب الانحدار والمسافة إلى الأنهار…'));
        const slope = computeSlope(g, dem);
        data.current = { dem, slope, distance: new Float32Array(0), hand: new Float32Array(0), rain: null, sarPre: null, sarPost: null, mask: null, sarWater: null, risk: null, rainDays: DEFAULT_EVENT.rainDays };
        setRiverNetwork(snapshot);
        setRiversSource(tr('OSM snapshot', 'نسخة محفوظة من OSM'));
        await loadEvent(DEFAULT_EVENT);

        // Refresh the river network live from Overpass in the background.
        const live = await fetchRiversOverpass();
        if (live && !cancelled && live.features.length) {
          setRiverNetwork(live);
          setRiversSource(tr('OSM live (Overpass)', 'OSM مباشر (Overpass)'));
          recompute();
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
  }, [loadEvent, recompute, setRiverNetwork, tr, progress]);

  const describeCell = useCallback((lng: number, lat: number): CellInfo | null => {
    const d = data.current, g = gridRef.current;
    if (!d || !g) return null;
    const k = cellAt(g, lng, lat);
    if (k === null) return null;
    const sar = d.sarPost ? sarCellSummary(g, d.sarPost, d.mask, k) : null;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const sarText = !sar ? tr('No data', 'لا توجد بيانات')
      : sar.flooded + sar.permanent === 0 ? tr('Dry', 'جاف')
      : [sar.flooded && tr(`${pct(sar.flooded)} flooded`, `${pct(sar.flooded)} مغمور`), sar.permanent && tr(`${pct(sar.permanent)} permanent water`, `${pct(sar.permanent)} مياه دائمة`)].filter(Boolean).join(tr(', ', '، '));
    const m = tr('m', 'م');
    const rows: [string, string][] = [
      [tr('Elevation', 'الارتفاع'), `${d.dem[k].toFixed(0)} ${m}`],
      [tr('Slope', 'الانحدار'), `${d.slope[k].toFixed(2)}°`],
      [tr('Distance to river', 'المسافة إلى النهر'), Number.isFinite(d.distance[k]) ? `${(d.distance[k] / 1000).toFixed(2)} ${tr('km', 'كم')}` : '–'],
      [tr('Height above river', 'الارتفاع فوق النهر'), Number.isFinite(d.hand[k]) ? `${d.hand[k].toFixed(1)} ${m}` : '–'],
      [tr(`Rainfall (${d.rainDays} d)`, `الأمطار (${d.rainDays} يومًا)`), d.rain ? `${d.rain[k].toFixed(0)} ${tr('mm', 'مم')}` : '–'],
      [tr('SAR (flood date)', 'الرادار (تاريخ الفيضان)'), sarText],
    ];
    if (sar) rows.push(['VV / VH', `${sar.vv.toFixed(1)} / ${sar.vh.toFixed(1)} dB`]);
    if (d.risk) {
      const cls = RISK_CLASSES[riskClass(d.risk[k])];
      rows.push([tr('Risk score', 'درجة المخاطر'), `${d.risk[k].toFixed(2)} · ${isAr ? cls.labelAr : cls.label}`]);
    }
    return { lng, lat, rows };
  }, [tr, isAr]);

  const maxDate = shiftDate(new Date().toISOString().slice(0, 10), -7);

  const controlsNode = (
    <FloodRiskControls
      event={event}
      onEventChange={setEvent}
      onLoadEvent={() => loadEvent(event)}
      visible={visible}
      onVisibleChange={setVisible}
      thresholds={thresholds}
      onThresholdsChange={setThresholds}
      weights={weights}
      onWeightsChange={setWeights}
      onRecompute={recompute}
      busy={busy}
      maxDate={maxDate}
    />
  );

  const statsNode = (
    <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
      <StatTile label={tr('SAR flood extent', 'امتداد الفيضان بالرادار')} value={stats ? km2(stats.floodKm2) : '–'} color={water.DEFAULT} />
      <StatTile label={tr('High + very high risk', 'مخاطر مرتفعة ومرتفعة جدًا')} value={stats ? km2(stats.highKm2) : '–'} color="#c62828" />
      <StatTile label={tr(`Mean rainfall (${stats?.rainDays ?? event.rainDays} d)`, `متوسط الأمطار (${stats?.rainDays ?? event.rainDays} يومًا)`)} value={stats?.meanRain != null ? `${stats.meanRain.toFixed(0)} ${tr('mm', 'مم')}` : '–'} color="#1565c0" />
      <StatTile label={tr('SAR coverage (flood date)', 'تغطية الرادار (تاريخ الفيضان)')} value={stats?.coverage != null ? `${Math.round(stats.coverage * 100)}%` : '–'} color="#455a64" />
    </Box>
  );

  const mapNode = (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <FloodRiskMap grid={grid} images={images} rivers={rivers} visible={visible} describeCell={describeCell} />
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

  const aboutNode = (
    <Box sx={{ '& p': { mb: 1 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{tr('About this model', 'عن هذا النموذج')}</Typography>
        <IconButton size="small" onClick={() => setAboutOpen(false)} aria-label={tr('Close', 'إغلاق')}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      {isAr ? (
        <>
          <Typography variant="body2" component="p">
            يجري كل شيء في متصفحك: تأتي البيانات من واجهات برمجية عامة وتُعالج على جهازك على شبكة بدقة ~300 م بإسقاط Web Mercator.
          </Typography>
          <Typography variant="body2" component="p">
            <b>نموذج الارتفاع:</b> {DEM_SOURCE.name}؛ يُستخرج الارتفاع من قيم RGB في الـtiles، ثم يُشتق الانحدار والارتفاع فوق أقرب نهر.{' '}
            <b>الأنهار:</b> OpenStreetMap عبر Overpass ({riversSource || 'جارٍ التحميل'})، تُحوَّل إلى شبكة نقطية لحساب تحويل المسافة الدقيق.{' '}
            <b>الأمطار:</b> الهطول اليومي التاريخي من Open-Meteo (عائلة ERA5)، مجموعًا على طول الفترة.{' '}
            <b>الرادار:</b> قيم gamma0 من Sentinel-1 باستقطابي VV / VH؛ تظهر المياه داكنة في كليهما. الفيضان = مياه في تاريخ الفيضان لم تكن مياهًا قبله.
          </Typography>
          <Typography variant="body2" component="p">
            <b>المخاطر</b> = متوسط موزون لانخفاض الارتفاع فوق النهر، واستواء الانحدار، والقرب من النهر، والأمطار النسبية، وقناع الفيضان من الرادار، مقسَّمًا إلى أربع فئات. إنه نموذج فرز أولي استرشادي، وليس خريطة مخاطر معايَرة.
          </Typography>
        </>
      ) : (
        <>
      <Typography variant="body2" component="p">
        Everything runs in your browser: data comes from public APIs and is processed client-side on a ~300 m Web Mercator grid.
      </Typography>
      <Typography variant="body2" component="p">
        <b>DEM:</b> {DEM_SOURCE.name}; elevation is decoded from the tiles&apos; RGB values, then slope and the height above the nearest river are derived.{' '}
        <b>Rivers:</b> OpenStreetMap via Overpass ({riversSource || 'loading'}), rasterised for an exact distance transform.{' '}
        <b>Rainfall:</b> Open-Meteo historical daily precipitation (ERA5 family), summed over the window.{' '}
        <b>SAR:</b> Sentinel-1 VV / VH gamma0; water is dark in both polarisations. Flood = water on the flood date that was not water before.
      </Typography>
      <Typography variant="body2" component="p">
        <b>Risk</b> = weighted mean of low height above river, flat slope, river proximity, relative rainfall and the SAR flood mask, binned into four classes. It is an indicative screening model, not a calibrated hazard map.
      </Typography>
        </>
      )}
    </Box>
  );

  const header = (
    <Box sx={{ position: 'relative' }}>
      <DashboardHeader
        title={tr('Blue Nile Flood Risk', 'مخاطر الفيضانات على النيل الأزرق')}
        subtitle={tr('Client-side GeoAI — Sentinel-1 SAR, DEM, rainfall and rivers · Sennar & Gezira, Sudan', 'ذكاء جيومكاني في المتصفح — رادار Sentinel-1 ونموذج الارتفاع والأمطار والأنهار · سنار والجزيرة، السودان')}
        icon={<FloodIcon sx={{ fontSize: 28 }} />}
        source={tr('Sentinel-1 (ESA Copernicus), AWS Terrain Tiles, Open-Meteo, OpenStreetMap', 'Sentinel-1 (كوبرنيكوس/ESA)، وAWS Terrain Tiles، وOpen-Meteo، وOpenStreetMap')}
        author="Amin Adnan Gasim"
        date={tr(`Event ${event.floodDate}`, `حدث ${event.floodDate}`)}
        gradientFrom={water.DEFAULT}
        gradientTo={water.dark}
        mb={isDesktop ? 1.5 : 3}
        articleHref="/insights/blue-nile-flood-risk"
      />
      <IconButton onClick={() => setAboutOpen((v) => !v)} sx={{ position: 'absolute', top: 12, right: 12, color: 'white' }} aria-label={tr('About this dashboard', 'حول لوحة المعلومات')}>
        <InfoOutlinedIcon />
      </IconButton>
    </Box>
  );

  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', bgcolor: water.light }}>
        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>{header}</Box>

        {isDesktop ? (
          <>
            <Box sx={{ px: 2, pb: 1.25 }}>{statsNode}</Box>
            <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Paper elevation={2} sx={{ width: 300, flexShrink: 0, height: 680, overflowY: 'auto', p: 2 }}>
                {controlsNode}
              </Paper>
              <Box sx={{ flex: 1, position: 'relative', height: 680, minWidth: 0 }}>
                <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden' }}>{mapNode}</Paper>
                {aboutOpen && (
                  <Paper
                    elevation={6}
                    sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 480, maxWidth: 'calc(100% - 48px)', zIndex: 700, p: 3 }}
                  >
                    {aboutNode}
                  </Paper>
                )}
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ p: 2, pt: 0 }}>
            <Box sx={{ mb: 2 }}>{statsNode}</Box>
            {aboutOpen && <Paper elevation={2} sx={{ p: 2.5, mb: 2 }}>{aboutNode}</Paper>}
            <Paper elevation={2} sx={{ height: 480, mb: 2, overflow: 'hidden' }}>{mapNode}</Paper>
            <Paper elevation={2} sx={{ p: 2 }}>{controlsNode}</Paper>
          </Box>
        )}

        <Box sx={{ px: 2, pb: 3, pt: isDesktop ? 0 : 2 }}>
          <Paper elevation={2} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', mb: 1.5, color: water.dark }}>
              {tr('About the project', 'عن المشروع')}
            </Typography>
            {isAr ? (
              <>
                <Typography variant="body1" sx={{ lineHeight: 2, mb: 2 }}>
                  سهل فيضان النيل الأزرق في سنار والجزيرة من أكثر مناطق السودان تعرضًا للفيضانات: فالمدن والقرى ومشروع الجزيرة المروي تقع على سهول طينية
                  مستوية ترتفع أمتارًا قليلة فوق النهر، وقد أغرق الفيضان القياسي في أغسطس وسبتمبر 2020 الأراضي الزراعية والمنازل على ضفافه. ترسم هذه اللوحة
                  أين وقعت الفيضانات وأين تكون الأرض أكثر عرضة لها. فلأي حدث فيضان، تقارن صور رادار Sentinel-1 قبل الفيضان وأثناءه: الرادار يخترق الغيوم،
                  والمياه الهادئة تعكس الإشارة بعيدًا عن القمر الصناعي، لذا تدل البكسلات التي أصبحت داكنة في استقطابي VV وVH على مياه الفيضان. ويُدمج هذا
                  الامتداد المرصود مع شكل الأرض (الارتفاع، والارتفاع فوق أقرب نهر، والانحدار)، والمسافة إلى شبكة أنهار OpenStreetMap، والأمطار الأخيرة، في
                  خريطة لمخاطر الفيضانات بأربع فئات، من منخفضة إلى مرتفعة جدًا.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 2 }}>
                  يجري التحليل كله في متصفحك دون أي خادم خلفه. تُجلب tiles الارتفاع وموزاييك الرادار وسجلات الأمطار وخطوط الأنهار من واجهات برمجية عامة
                  (AWS Terrain Tiles، وMicrosoft Planetary Computer أو Sentinel Hub، وOpen-Meteo، وOverpass)، وتُفك بكسلًا بكسلًا، وتُعالج على شبكة بدقة ~300 م:
                  الانحدار من نموذج الارتفاع، وتحويل مسافة دقيق إلى الأنهار، ورصد المياه بالعتبات على صور الرادار، ودرجة مخاطر موزونة لكل خلية. النموذج شفاف
                  عن قصد: يمكنك تغيير تواريخ الفيضان، وعتبات المياه في الرادار، ووزن كل عامل، ثم الضغط على «إعادة حساب المخاطر» لترى كيف تستجيب الخريطة، والنقر
                  في أي مكان لفحص القيم خلف الخلية. إنها أداة فرز أولي لاستكشاف التعرض للفيضانات وليست خريطة مخاطر معايَرة، لكنها تُظهر كيف يمكن لبيانات الأقمار
                  الصناعية المفتوحة والذكاء الجيومكاني في المتصفح أن يقدّما رؤى سريعة عن الفيضانات في المناطق الشحيحة البيانات.
                </Typography>
              </>
            ) : (
              <>
            <Typography variant="body1" sx={{ lineHeight: 1.75, mb: 2 }}>
              The Blue Nile floodplain in Sennar and Gezira is one of Sudan&apos;s most flood-exposed regions: towns, villages and
              the irrigated Gezira Scheme sit on flat clay plains a few metres above the river, and the record flood of
              August–September 2020 inundated farmland and homes along its banks. This dashboard maps where flooding occurred and
              where the ground is most prone to it. For any flood event it compares Sentinel-1 radar images from before and
              during the flood: radar sees through cloud, and calm water reflects the signal away from the satellite, so newly
              dark pixels in both VV and VH polarisations mark flood water. That observed extent is combined with the shape of
              the land (elevation, height above the nearest river and slope), the distance to the OpenStreetMap river network
              and recent rainfall into a flood risk map with four classes, from Low to Very High.
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.75 }}>
              The whole analysis runs in your browser, with no server behind it. Elevation tiles, radar mosaics, rainfall
              records and river lines are fetched from public APIs (AWS Terrain Tiles, Microsoft Planetary Computer or Sentinel
              Hub, Open-Meteo and Overpass), decoded pixel by pixel, and processed on a ~300 m grid: slope from the elevation
              model, an exact distance transform to the rivers, threshold-based water detection on the radar, and a weighted
              risk score for every cell. The model is deliberately transparent. You can change the flood dates, the radar water
              thresholds and the weight of each factor, then press Recompute Risk to see how the map responds, and click
              anywhere to inspect the values behind a cell. It is a screening tool for exploring flood exposure rather than a
              calibrated hazard map, but it shows how open satellite data and client-side GeoAI can deliver rapid flood
              insight for data-scarce regions.
            </Typography>
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </AppLayout>
  );
}
