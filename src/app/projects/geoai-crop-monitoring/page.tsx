'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, Divider, CircularProgress, IconButton, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import GrassIcon from '@mui/icons-material/Grass';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import TuneIcon from '@mui/icons-material/Tune';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import { AnomalyAlerts, CropFilters, FieldInfoPanel } from '@/components/CropPanels';
import { CropMapMode, FarmBrief, FieldIntel, HealthBar, MapModeBar, fieldNameFor } from '@/components/CropIntel';
import {
  CutEvent,
  Et0Source,
  FieldHealth,
  Phenology,
  HEALTH_COLORS,
  HEALTH_LABEL,
  HEALTH_ORDER,
  Health,
  buildFarmBrief,
  changeBetween,
  computeHealth,
  computePhenology,
  detectCuts,
  fetchEt0,
  indexDaysBefore,
  similarFields,
  waterUse,
} from '@/lib/cropInsights';
import { agriGreen, agriAccents } from '@/theme/agriColors';
import {
  CROP_TYPES,
  CropIndex,
  CropTimeSeries,
  FieldsCollection,
  INDEX_LABEL,
  anomalyAt,
  cropLabel,
  cropOn,
  fieldLabel,
  formatDate,
  formatMonthYear,
  valueAt,
} from '@/utils/crop';
import { useI18n } from '@/i18n';

const CropMap = nextDynamic(() => import('@/components/CropMap'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: '100%' }}>…</Paper>,
});
const TimeSeriesChart = nextDynamic(() => import('@/components/CropCharts').then((m) => ({ default: m.TimeSeriesChart })), {
  ssr: false,
  loading: () => <Box sx={{ height: 200 }}>…</Box>,
});
const CropSummaryChart = nextDynamic(() => import('@/components/CropCharts').then((m) => ({ default: m.CropSummaryChart })), {
  ssr: false,
  loading: () => <Box sx={{ height: 200 }}>…</Box>,
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
  const [fields, setFields] = useState<FieldsCollection | null>(null);
  const [series, setSeries] = useState<CropTimeSeries | null>(null);
  const [dateIndex, setDateIndex] = useState(0);
  const [sliderIndex, setSliderIndex] = useState(0); // follows the thumb; dateIndex commits on release
  const [index, setIndex] = useState<CropIndex>('ndvi');
  const [showIndexLayer, setShowIndexLayer] = useState(false);
  const [cropFilter, setCropFilter] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mapMode, setMapMode] = useState<CropMapMode>('index');
  const [compareDays, setCompareDays] = useState(30);
  const [healthFilter, setHealthFilter] = useState<Health | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sideTab, setSideTab] = useState<'insights' | 'field' | 'alerts'>('insights');
  const [showSimilar, setShowSimilar] = useState(true);
  const [et0, setEt0] = useState<Et0Source>({ daily: new Map(), source: 'climatology' });

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { isAr, tr } = useI18n();
  const date = (iso: string) => formatDate(iso, isAr);

  useEffect(() => {
    Promise.all([
      fetch('/data/crop/fields.geojson').then((r) => r.json()),
      fetch('/data/crop/timeseries.json').then((r) => r.json()),
    ])
      .then(([f, s]: [FieldsCollection, CropTimeSeries]) => {
        setFields(f);
        setSeries(s);
        setDateIndex(s.dates.length - 1);
        setSliderIndex(s.dates.length - 1);
      })
      .catch((err) => console.error('Error loading crop data:', err));
  }, []);

  // Daily reference evapotranspiration for the farm (NASA POWER, keyless);
  // falls back to an Al Jouf monthly climatology when unreachable.
  useEffect(() => {
    if (!series) return;
    let live = true;
    fetchEt0(series.dates[0], series.dates[series.dates.length - 1], 38.29, 29.93).then((e) => live && setEt0(e));
    return () => {
      live = false;
    };
  }, [series]);

  // Timeline playback: one scene every 1.4 s, stopping at the latest scene.
  useEffect(() => {
    if (!playing || !series) return;
    const id = setInterval(() => {
      setDateIndex((i) => {
        const next = Math.min(series.dates.length - 1, i + 1);
        setSliderIndex(next);
        if (next === series.dates.length - 1) setPlaying(false);
        return next;
      });
    }, 1400);
    return () => clearInterval(id);
  }, [playing, series]);

  const commitDate = (i: number) => {
    setSliderIndex(i);
    setDateIndex(i);
  };

  const fieldProps = useMemo(() => fields?.features.map((f) => f.properties) ?? [], [fields]);
  const selected = fieldProps.find((f) => f.id === selectedField) ?? null;

  // ---- crop intelligence (src/lib/cropInsights.ts) ----
  const cuts = useMemo(() => {
    const m = new Map<string, CutEvent[]>();
    if (series) fieldProps.forEach((f) => m.set(f.id, detectCuts(series.fields[f.id].ndvi, series.dates)));
    return m;
  }, [series, fieldProps]);
  const phenology = useMemo(() => (series ? computePhenology(fieldProps, series) : new Map<string, Phenology[]>()), [series, fieldProps]);
  const health = useMemo(() => (series ? computeHealth(fieldProps, series, dateIndex, cuts) : new Map<string, FieldHealth>()), [series, fieldProps, dateIndex, cuts]);
  const compareIndex = series ? indexDaysBefore(series.dates, dateIndex, compareDays) : 0;
  const change = useMemo(() => {
    const m = new Map<string, number | null>();
    if (series) fieldProps.forEach((f) => m.set(f.id, changeBetween(series, f.id, compareIndex, dateIndex)));
    return m;
  }, [series, fieldProps, compareIndex, dateIndex]);
  const water = useMemo(() => {
    const m = new Map<string, ReturnType<typeof waterUse>>();
    if (!series) return m;
    const from = indexDaysBefore(series.dates, dateIndex, 365);
    fieldProps.forEach((f) => m.set(f.id, waterUse(series.fields[f.id].ndvi, series.dates, from, dateIndex, f.area_ha, et0)));
    return m;
  }, [series, fieldProps, dateIndex, et0]);
  const modeValues = useMemo(() => {
    const m = new Map<string, number | null>();
    if (mapMode === 'change') change.forEach((v, k) => m.set(k, v));
    if (mapMode === 'water') water.forEach((v, k) => m.set(k, v.perHa));
    return m;
  }, [mapMode, change, water]);
  const healthStats = useMemo(() => {
    const counts = Object.fromEntries(HEALTH_ORDER.map((h) => [h, 0])) as Record<Health, number>;
    const areas = Object.fromEntries(HEALTH_ORDER.map((h) => [h, 0])) as Record<Health, number>;
    fieldProps.forEach((f) => {
      if (cropFilter && f.crop !== cropFilter) return;
      const h = health.get(f.id)?.health;
      if (h) { counts[h]++; areas[h] += f.area_ha; }
    });
    return { counts, areas };
  }, [fieldProps, health, cropFilter]);
  const similar = useMemo(() => (series && selectedField ? similarFields(selectedField, series, dateIndex) : []), [series, selectedField, dateIndex]);
  const nameOf = useMemo(() => fieldNameFor(fieldProps, isAr), [fieldProps, isAr]);
  const brief = useMemo(() => {
    if (!series) return [];
    const scope = fieldProps.filter((f) => !cropFilter || f.crop === cropFilter);
    const deltas = scope.map((f) => ({ id: f.id, d: change.get(f.id) ?? null, ha: f.area_ha })).filter((x): x is { id: string; d: number; ha: number } => x.d !== null);
    const area = deltas.reduce((s, x) => s + x.ha, 0);
    const sorted = [...deltas].sort((a, b) => a.d - b.d);
    return buildFarmBrief({
      fields: scope,
      health,
      dateLabel: [formatDate(series.dates[dateIndex]), formatDate(series.dates[dateIndex], true)],
      compareLabel: [formatDate(series.dates[compareIndex]), formatDate(series.dates[compareIndex], true)],
      meanChange: area ? deltas.reduce((s, x) => s + x.d * x.ha, 0) / area : null,
      losers: sorted.slice(0, 3),
      gainers: sorted.slice(-3).reverse(),
      yearWaterM3: scope.reduce((s, f) => s + (water.get(f.id)?.grossM3 ?? 0), 0),
      et0Source: et0.source,
      label: (id, ar) => fieldNameFor(fieldProps, ar)(id),
      crop: (c, ar) => cropLabel(c, ar),
    });
  }, [series, fieldProps, cropFilter, change, health, dateIndex, compareIndex, water, et0.source]);
  const waterPeerMedian = useMemo(() => {
    if (!selected) return null;
    const crop = health.get(selected.id)?.crop ?? selected.crop;
    const v = fieldProps.filter((f) => (health.get(f.id)?.crop ?? f.crop) === crop).map((f) => water.get(f.id)?.perHa ?? 0).filter((x) => x > 0).sort((a, b) => a - b);
    return v.length >= 3 ? v[v.length >> 1] : null;
  }, [selected, fieldProps, health, water]);

  const selectField = (id: string | null) => {
    setSelectedField(id);
    if (id) setSideTab('field');
  };

  const cropSummary = useMemo(
    () =>
      CROP_TYPES.map((crop) => {
        const matching = fieldProps.filter((f) => f.crop === crop);
        return { crop, fields: matching.length, area: matching.reduce((s, f) => s + f.area_ha, 0) };
      }).filter((e) => e.fields > 0),
    [fieldProps]
  );

  const alerts = useMemo(() => {
    if (!series) return [];
    return fieldProps
      .filter((f) => (!cropFilter || f.crop === cropFilter) && anomalyAt(series.fields[f.id], series.dates, dateIndex))
      .map((f) => {
        const reading = valueAt(series.fields[f.id].ndvi, series.dates, dateIndex);
        return { field: f, value: reading?.value ?? null, date: reading?.date ?? series.dates[dateIndex] };
      })
      .sort((a, b) => (a.value ?? 1) - (b.value ?? 1));
  }, [series, fieldProps, cropFilter, dateIndex]);

  const meanOnDate = useMemo(() => {
    if (!series) return null;
    const ids = fieldProps.filter((f) => !cropFilter || f.crop === cropFilter).map((f) => f.id);
    let sum = 0;
    let area = 0;
    ids.forEach((id) => {
      const r = valueAt(series.fields[id][index], series.dates, dateIndex);
      const ha = fieldProps.find((f) => f.id === id)!.area_ha;
      if (r) {
        sum += r.value * ha;
        area += ha;
      }
    });
    return area ? sum / area : null;
  }, [series, fieldProps, cropFilter, index, dateIndex]);

  if (!fields || !series) {
    return (
      <AppLayout>
        <Box sx={{ py: 2, minHeight: '100vh', bgcolor: agriGreen.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: agriGreen.DEFAULT }} />
        </Box>
      </AppLayout>
    );
  }

  const { dates } = series;
  const visibleFields = fieldProps.filter((f) => !cropFilter || f.crop === cropFilter);
  const selectedSeries = selected ? series.fields[selected.id] : null;
  const selectedReading = selectedSeries ? valueAt(selectedSeries[index], dates, dateIndex) : null;

  const filtersNode = (
    <CropFilters
      fields={fieldProps}
      dates={dates}
      dateIndex={sliderIndex}
      onDateChange={setSliderIndex}
      onDateCommit={commitDate}
      index={index}
      onIndexChange={setIndex}
      showIndexLayer={showIndexLayer}
      onShowIndexLayerChange={setShowIndexLayer}
      cropFilter={cropFilter}
      onCropFilterChange={(crop) => {
        setCropFilter(crop);
        if (selected && crop && selected.crop !== crop) setSelectedField(null);
      }}
      selectedField={selectedField}
      onFieldSelect={selectField}
      onReset={() => {
        commitDate(dates.length - 1);
        setIndex('ndvi');
        setShowIndexLayer(false);
        setCropFilter(null);
        setSelectedField(null);
        setHealthFilter(null);
        setMapMode('index');
        setPlaying(false);
      }}
    />
  );

  // With a field selected the cards describe that field; otherwise the farm.
  const selectedCrop = selected ? cropOn(selected, dates[dateIndex]) : null;
  const selectedAnomaly = selectedSeries ? anomalyAt(selectedSeries, dates, dateIndex) : false;
  const selectedHealth = selected ? health.get(selected.id) : undefined;
  const clearViews = selectedSeries ? selectedSeries.ndvi.filter((v) => v !== null).length : 0;

  const statsNode = selected ? (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
      <StatTile
        label={tr(`Selected field · ${selected.type === 'pivot' ? 'centre pivot' : 'block'}`, `الحقل المحدد · ${selected.type === 'pivot' ? 'ري محوري' : 'حقل مستطيل'}`)}
        value={fieldLabel(selected.name, isAr)}
        color={agriGreen.dark}
      />
      <StatTile label={tr('Field Area (ha)', 'مساحة الحقل (هكتار)')} value={selected.area_ha} color={agriAccents[1]} />
      <StatTile
        label={`${INDEX_LABEL[index]} · ${date(selectedReading?.date ?? dates[dateIndex])}`}
        value={selectedReading ? selectedReading.value.toFixed(2) : tr('No clear view', 'لا توجد رؤية صافية')}
        color="#2E7D32"
      />
      <StatTile
        label={tr(`Health vs peers${selectedAnomaly ? ' · seasonal anomaly' : ''}`, `الصحة مقارنة بالنظراء${selectedAnomaly ? ' · شذوذ موسمي' : ''}`)}
        value={selectedHealth ? HEALTH_LABEL[selectedHealth.health][isAr ? 1 : 0] : '—'}
        color={selectedHealth ? (selectedHealth.health === 'normal' ? agriAccents[2] : HEALTH_COLORS[selectedHealth.health] === '#E0E0E0' || HEALTH_COLORS[selectedHealth.health] === '#B0BEC5' ? '#78909C' : HEALTH_COLORS[selectedHealth.health]) : agriAccents[2]}
      />
      <StatTile
        label={tr(`Crop · ${selectedCrop?.season ?? 'season'} (${clearViews} clear scenes)`, `المحصول · ${selectedCrop?.season ?? 'الموسم'} (${clearViews} مشهدًا صافيًا)`)}
        value={selectedCrop ? `${cropLabel(selectedCrop.crop, isAr)} · ${Math.round(selectedCrop.confidence * 100)}%` : cropLabel('Unclassified', isAr)}
        color={agriAccents[3]}
      />
    </Box>
  ) : (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
      <StatTile
        label={cropFilter ? tr(`${cropFilter} fields`, `حقول ${cropLabel(cropFilter, true)}`) : tr('Fields Detected', 'الحقول المرصودة')}
        value={visibleFields.length}
        color={agriGreen.dark}
      />
      <StatTile label={tr('Cropped Area (ha)', 'المساحة المزروعة (هكتار)')} value={Math.round(visibleFields.reduce((s, f) => s + f.area_ha, 0))} color={agriAccents[1]} />
      <StatTile label={tr(`Mean ${INDEX_LABEL[index]} · ${date(dates[dateIndex])}`, `متوسط ${INDEX_LABEL[index]} · ${date(dates[dateIndex])}`)} value={meanOnDate !== null ? meanOnDate.toFixed(2) : '—'} color="#2E7D32" />
      <StatTile label={tr('Fields in Anomaly', 'حقول في حالة شذوذ')} value={alerts.length} color={alerts.length ? '#D50000' : agriAccents[2]} />
      <StatTile
        label={tr('Irrigation demand · last 12 months', 'الطلب على الري · آخر 12 شهرًا')}
        value={`${(visibleFields.reduce((s, f) => s + (water.get(f.id)?.grossM3 ?? 0), 0) / 1e6).toFixed(1)} ${tr('M m³', 'مليون م³')}`}
        color="#1565C0"
      />
    </Box>
  );

  const mapNode = (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <CropMap
        fields={fields}
        series={series}
        dateIndex={dateIndex}
        index={index}
        showIndexLayer={showIndexLayer}
        cropFilter={cropFilter}
        selectedField={selectedField}
        onFieldSelect={selectField}
        mode={mapMode}
        health={health}
        modeValues={modeValues}
        highlight={showSimilar ? similar.map((x) => x.id) : []}
        healthFilter={healthFilter}
        compareLabel={date(dates[compareIndex])}
      />
      <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 500, maxWidth: 'calc(100% - 70px)' }}>
        <MapModeBar
          mode={mapMode}
          onMode={setMapMode}
          playing={playing}
          onPlay={() => {
            if (!playing && dateIndex >= dates.length - 1) commitDate(Math.max(0, dates.length - 40));
            setPlaying((v) => !v);
          }}
          compareDays={compareDays}
          onCompareDays={setCompareDays}
        />
        {(playing || sliderIndex !== dateIndex) && (
          <Box sx={{ mt: 0.75, display: 'inline-block', px: 1.5, py: 0.5, ...floatingPanelSx }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{date(dates[sliderIndex])}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  const fieldIntelNode = selected ? (
    <FieldIntel
      field={selected}
      health={health.get(selected.id)}
      phenology={phenology.get(selected.id) ?? []}
      cuts={cuts.get(selected.id) ?? []}
      dateIso={dates[dateIndex]}
      water={water.get(selected.id) ?? { etcMm: 0, grossM3: 0, perHa: 0, days: 0 }}
      waterPeerMedian={waterPeerMedian}
      similar={similar}
      fieldName={nameOf}
      onSelect={selectField}
      showSimilar={showSimilar}
      onToggleSimilar={() => setShowSimilar((v) => !v)}
    />
  ) : null;

  const sidePanelNode = (
    <>
      <Tabs
        value={sideTab}
        onChange={(_, v) => setSideTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 34, flexShrink: 0, '& .MuiTab-root': { minHeight: 34, py: 0.5, fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 } }}
      >
        <Tab value="insights" label={tr('Insights', 'الرؤى')} />
        <Tab value="field" label={selected ? fieldLabel(selected.name, isAr) : tr('Field', 'الحقل')} />
        <Tab value="alerts" label={`${tr('Alerts', 'التنبيهات')} (${alerts.length})`} />
      </Tabs>
      <Box sx={{ overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5, pr: 0.5 }}>
        {sideTab === 'insights' && (
          <>
            <HealthBar counts={healthStats.counts} areas={healthStats.areas} selected={healthFilter} onSelect={(h) => { setHealthFilter(h); if (h) setMapMode('health'); }} />
            <FarmBrief items={brief} onField={selectField} onHealth={(h) => { setHealthFilter(h); setMapMode('health'); }} />
            <Divider />
            <Box sx={{ flexShrink: 0 }}>
              <CropSummaryChart entries={cropSummary} selected={cropFilter} onSelect={setCropFilter} height={190} />
            </Box>
          </>
        )}
        {sideTab === 'field' && (
          <>
            <FieldInfoPanel
              field={selected}
              index={index}
              reading={selectedReading}
              anomalyNow={selectedSeries ? anomalyAt(selectedSeries, dates, dateIndex) : false}
              anomalyCount={selectedSeries?.anomalies.length ?? 0}
              onClear={() => setSelectedField(null)}
            />
            {fieldIntelNode && <Divider />}
            {fieldIntelNode}
          </>
        )}
        {sideTab === 'alerts' && (
          <AnomalyAlerts alerts={alerts} title={tr(`Alerts · ${date(dates[dateIndex])}`, `التنبيهات · ${date(dates[dateIndex])}`)} selectedField={selectedField} onSelect={selectField} />
        )}
      </Box>
    </>
  );

  const trendNode = (
    <>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif' }}>
        {tr(`${INDEX_LABEL[index]} Time Series`, `السلسلة الزمنية لـ${INDEX_LABEL[index]}`)} —{' '}
        {selected
          ? fieldLabel(selected.name, isAr)
          : cropFilter
            ? tr(`${cropFilter} (all fields mean)`, `${cropLabel(cropFilter, true)} (متوسط كل الحقول)`)
            : tr('All fields (mean)', 'كل الحقول (المتوسط)')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {tr('Red points: NDVI below the field’s seasonal mean − 2σ. Click the chart to jump to that scene.', 'النقاط الحمراء: NDVI أقل من المتوسط الموسمي للحقل − 2σ. انقر على المخطط للانتقال إلى ذلك المشهد.')}
      </Typography>
      <TimeSeriesChart
        dates={dates}
        values={selectedSeries ? selectedSeries[index] : series.overall[index]}
        reference={selectedSeries ? series.overall[index] : undefined}
        label={selected ? fieldLabel(selected.name, isAr) : tr('All fields (mean)', 'كل الحقول (المتوسط)')}
        index={index}
        anomalies={selectedSeries?.anomalies ?? []}
        dateIndex={dateIndex}
        onDateClick={commitDate}
        height={isDesktop ? 200 : 220}
      />
    </>
  );

  const aboutContent = (
    <>
      {isAr ? (
        <>
          <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.9 }}>
            لوحة لمراقبة المحاصيل بالذكاء الجيومكاني للأراضي الزراعية المروية قرب طبرجل في الجوف بالمملكة العربية السعودية. تُرصد حدود الحقول آليًا من
            Sentinel-2: {fieldProps.filter((f) => f.type === 'pivot').length} محور ري محوري رُصدت بتحويل هوف (Hough) على مركّب أقصى NDVI لعدة سنوات،
            إضافة إلى {fieldProps.filter((f) => f.type === 'block').length} حقلًا مستطيلًا من المساحة المزروعة المتبقية.
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.9 }}>
            يُتتبَّع مؤشرا NDVI وEVI لكل حقل عبر {dates.length} مشهدًا من Sentinel-2 L2A مع حجب الغيوم منذ أبريل 2023 (Microsoft Planetary Computer).
            تُحدَّد أنواع المحاصيل لكل موسم بمصنّف فينولوجي قائم على القواعد، ويُعلَّم الحقل عندما ينخفض NDVI عن متوسطه الموسمي − 2σ لذلك الوقت من
            السنة. الحدود وأنواع المحاصيل والتنبيهات مخرجات نموذج، وليست حقائق ميدانية.
          </Typography>
        </>
      ) : (
        <>
      <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
        A GeoAI crop monitoring dashboard for irrigated farmland near Tabarjal, Al Jouf, Saudi Arabia. Field boundaries
        are detected automatically from Sentinel-2: {fieldProps.filter((f) => f.type === 'pivot').length} centre pivots found with a
        Hough transform on a multi-year maximum-NDVI composite, plus {fieldProps.filter((f) => f.type === 'block').length} block fields
        from the remaining vegetated area.
      </Typography>
      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
        Each field&apos;s NDVI and EVI are tracked across {dates.length} cloud-masked Sentinel-2 L2A scenes since April 2023
        (Microsoft Planetary Computer). Crop types are assigned per season by a rule-based phenology classifier, and a field
        is flagged when its NDVI falls below its seasonal mean − 2σ for that time of year. Boundaries, crop types and alerts
        are model output, not ground truth.
      </Typography>
        </>
      )}
    </>
  );

  const aboutHeader = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Typography variant="h6" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: agriGreen.dark }}>
        {tr('About this dashboard', 'حول لوحة المعلومات')}
      </Typography>
      <IconButton onClick={() => setAboutOpen(false)} size="small" aria-label={tr('Close', 'إغلاق')}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', bgcolor: agriGreen.light }}>
        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>
          <Box sx={{ position: 'relative' }}>
            <DashboardHeader
              title={tr('GeoAI Crop Monitoring', 'مراقبة المحاصيل بالذكاء الجيومكاني')}
              subtitle={tr('Sentinel-2 NDVI / EVI — Al Jouf, Saudi Arabia', 'NDVI / EVI من Sentinel-2 — الجوف، المملكة العربية السعودية')}
              icon={<GrassIcon sx={{ fontSize: 28 }} />}
              source={tr('Sentinel-2 L2A (ESA Copernicus) via Microsoft Planetary Computer', 'Sentinel-2 L2A (كوبرنيكوس/ESA) عبر Microsoft Planetary Computer')}
              author="Amin Adnan Gasim"
              date={`${formatMonthYear(dates[0], isAr)} – ${formatMonthYear(dates[dates.length - 1], isAr)}`}
              gradientFrom={agriGreen.DEFAULT}
              gradientTo={agriGreen.dark}
              mb={isDesktop ? 1.5 : 3}
              articleHref="/insights/al-jouf-crop-monitoring"
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
                  height: 640,
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
                {sidebarOpen && <Box sx={{ px: 2, pb: 2, overflowY: 'auto', minWidth: 248 }}>{filtersNode}</Box>}
              </Paper>

              <Box sx={{ flex: 1, position: 'relative', height: 640, minWidth: 0 }}>
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
                      width: 440,
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
                sx={{ width: 370, flexShrink: 0, height: 640, p: 1.5, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', '& > :last-child': { flex: 1 } }}
              >
                {sidePanelNode}
              </Paper>
            </Box>

            <Paper elevation={2} sx={{ mx: 2, mb: 1.5, p: 1.5, flexShrink: 0 }}>{trendNode}</Paper>
          </>
        ) : (
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>{statsNode}</Box>
            <Paper elevation={2} sx={{ mb: 2 }}>
              <Box onClick={() => setSidebarOpen((v) => !v)} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, cursor: 'pointer' }}>
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
            <Paper elevation={2} sx={{ height: 460, mb: 2, overflow: 'hidden' }}>
              {mapNode}
            </Paper>
            {aboutOpen && (
              <Paper elevation={2} sx={{ p: 2.5, mb: 2 }}>
                {aboutHeader}
                {aboutContent}
              </Paper>
            )}
            <Paper elevation={2} sx={{ p: 2, pt: 0.5, mb: 2, display: 'flex', flexDirection: 'column', gap: 1, '& > :last-child': { maxHeight: 520 } }}>
              {sidePanelNode}
            </Paper>
            <Paper elevation={2} sx={{ p: 2 }}>{trendNode}</Paper>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
}

export default function GeoAICropMonitoring() {
  return <DashboardContent />;
}
