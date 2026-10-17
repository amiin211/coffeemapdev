'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, Divider, FormControlLabel, IconButton, LinearProgress, Stack, Switch, Tooltip, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TerrainIcon from '@mui/icons-material/Terrain';
import GrassIcon from '@mui/icons-material/Grass';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import PaletteIcon from '@mui/icons-material/Palette';
import CategoryIcon from '@mui/icons-material/Category';
import FlightIcon from '@mui/icons-material/Flight';
import ReplayIcon from '@mui/icons-material/Replay';
import { CONFIG, MosqueEnvironment } from '@/lib/mosqueEnvironment';
import { SurveyLayers, SurveyStatus } from '@/lib/surveyDrone';
import { BimData, BimSelection, CATEGORY_COLORS, ColorMode, UNCATEGORISED_COLOR, UNIT_LABEL, formatSAR, quantityLabel, scheduleCsv } from '@/lib/mosqueBim';
import { CATEGORIES_AR, DISCLAIMER_AR, QUANTITY_LABELS_AR, TYPES_AR, UNIT_LABEL_AR, formatSARAr, standardAr, wordAr, zoneAr } from '@/lib/mosqueBimAr';
import { useI18n } from '@/i18n';

const buttonSx = {
  minWidth: 140,
  color: '#fff',
  bgcolor: 'rgba(20, 28, 40, 0.75)',
  backdropFilter: 'blur(4px)',
  fontFamily: 'Roboto, sans-serif',
  fontWeight: 600,
  textTransform: 'none',
  '&:hover': { bgcolor: 'rgba(20, 28, 40, 0.9)' },
} as const;

function Section({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!shown.length) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, lineHeight: 2 }}>
        {title}
      </Typography>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td': { py: 0.4, verticalAlign: 'top', fontSize: '0.78rem' } }}>
        <tbody>
          {shown.map(([label, value]) => (
            <tr key={label}>
              <td style={{ color: '#666', width: '42%', paddingInlineEnd: 8 }}>{label}</td>
              <td style={{ fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

function PropertiesPanel({ selection, disclaimer, onClose }: { selection: BimSelection; disclaimer: string; onClose: () => void }) {
  const { element: e, type: t } = selection;
  const { isAr, tr } = useI18n();
  // Arabic: translated descriptive fields; codes, IDs and numbers stay as they are.
  const ar = isAr ? TYPES_AR[t.id] : undefined;
  const word = (v: string | null) => (v && isAr ? wordAr(v) : v);
  const sar = isAr ? formatSARAr : formatSAR;
  const years = (n: number) => tr(`${n} years`, `${n} سنة`);
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: 16,
        width: 360,
        maxWidth: 'calc(100% - 32px)',
        bgcolor: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        borderRadius: 1.5,
        boxShadow: 4,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, pb: 1.5, bgcolor: '#23384d', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{isAr ? t.nameAr : t.name}</Typography>
            <Typography variant="body2" dir={isAr ? 'ltr' : 'rtl'} sx={{ opacity: 0.85, mt: 0.5, textAlign: 'end' }}>{isAr ? t.name : t.nameAr}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'white', mt: -0.5 }} aria-label={tr('Close properties', 'إغلاق الخصائص')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          <Chip size="small" label={isAr ? CATEGORIES_AR[t.category] ?? t.category : t.category} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip size="small" label={e.assetTag} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'monospace' }} />
        </Stack>
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        <Section
          title={tr('Identity', 'التعريف')}
          rows={[
            [tr('Revit element ID', 'معرّف عنصر Revit'), e.elementId ?? '–'],
            [tr('IFC class', 'فئة IFC'), t.ifc],
            ['UniFormat', t.uniformat],
            [tr('Level', 'المنسوب'), word(e.level)],
            [tr('Zone', 'المنطقة'), isAr ? zoneAr(e.zone) : e.zone],
            [tr('Status / condition', 'الوضع / الحالة'), `${word(e.status)} · ${word(e.condition)}`],
          ]}
        />
        <Divider sx={{ mb: 1 }} />
        <Section
          title={tr('Specification', 'المواصفات')}
          rows={[
            [tr('Construction', 'طريقة الإنشاء'), ar?.construction ?? t.construction],
            [tr('Material', 'المادة'), ar?.material ?? t.material],
            [tr('Fire resistance', 'مقاومة الحريق'), word(t.fireResistance)],
            [tr('U-value', 'معامل انتقال الحرارة (U)'), t.uValue != null ? `${t.uValue} W/m²K` : null],
            [tr('Solar heat gain (SHGC)', 'معامل الكسب الحراري الشمسي (SHGC)'), t.shgc ?? null],
            [tr('Codes & standards', 'الأكواد والمواصفات'), (isAr ? t.standards.map(standardAr) : t.standards).join(tr(', ', '، '))],
          ]}
        />
        <Divider sx={{ mb: 1 }} />
        <Section
          title={tr('Quantities & cost', 'الكميات والتكلفة')}
          rows={[
            ...Object.entries(e.quantities).map(([k, v]): [string, React.ReactNode] => [isAr ? QUANTITY_LABELS_AR[k] ?? k : quantityLabel(k), v.toLocaleString()]),
            [tr('Unit rate', 'سعر الوحدة'), `${sar(t.costSAR)} / ${(isAr ? UNIT_LABEL_AR : UNIT_LABEL)[t.unit]}`],
            [tr('Element cost', 'تكلفة العنصر'), sar(e.costSAR)],
          ]}
        />
        <Divider sx={{ mb: 1 }} />
        <Section
          title={tr('Lifecycle', 'دورة الحياة')}
          rows={[
            [tr('Installed', 'تاريخ التركيب'), tr(`${e.installDate} (${e.installDateHijri} AH)`, `${e.installDate} م (${e.installDateHijri} هـ)`)],
            [tr('Warranty', 'الضمان'), years(t.warrantyYears)],
            [tr('Design life', 'العمر التصميمي'), years(t.lifeYears)],
            [tr('Maintenance', 'الصيانة'), ar?.maintenance ?? t.maintenance],
          ]}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic', lineHeight: 1.4 }}>
          {isAr ? DISCLAIMER_AR : disclaimer}
        </Typography>
      </Box>
    </Box>
  );
}

const floatingDarkSx = {
  color: 'white',
  bgcolor: 'rgba(20, 28, 40, 0.75)',
  backdropFilter: 'blur(4px)',
  borderRadius: 1,
} as const;

// Categories in the model with their element counts, most common first.
function CategoryLegend({ bim }: { bim: BimData }) {
  const counts: Record<string, number> = {};
  for (const e of Object.values(bim.elements)) {
    const category = bim.types[e.type].category;
    counts[category] = (counts[category] ?? 0) + 1;
  }
  const { isAr, tr } = useI18n();
  return (
    <Box sx={{ ...floatingDarkSx, px: 1.5, py: 1, pointerEvents: 'none' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>{tr('BIM categories', 'فئات BIM')}</Typography>
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([category, n]) => (
        <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, flexShrink: 0, bgcolor: CATEGORY_COLORS[category] ?? UNCATEGORISED_COLOR }} />
          <Typography variant="caption" sx={{ flex: 1, lineHeight: 1.45 }}>{isAr ? CATEGORIES_AR[category] ?? category : category}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, pl: 1.5 }}>{n}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// Light switch track so the off state reads on the dark panel.
const switchSx = { '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.45)' } } as const;

// Survey drone toggles and flight read-out.
function SurveyPanel({ layers, status, onLayers, onRestart }: {
  layers: SurveyLayers;
  status: SurveyStatus | null;
  onLayers: (layers: Partial<SurveyLayers>) => void;
  onRestart: () => void;
}) {
  const { tr } = useI18n();
  const phases: Record<SurveyStatus['phase'], string> = {
    takeoff: tr('Take-off', 'الإقلاع'),
    survey: status ? tr(`Survey line ${status.line} / ${status.lines}`, `خط المسح ${status.line} / ${status.lines}`) : '',
    turn: tr('Turning to next line', 'الالتفاف إلى الخط التالي'),
    return: tr('Returning home', 'العودة إلى نقطة الإقلاع'),
    landing: tr('Landing', 'الهبوط'),
    complete: tr('Survey complete', 'اكتمل المسح'),
  };
  const toggle = (key: keyof SurveyLayers, label: string, disabled = false) => (
    <FormControlLabel
      disabled={disabled}
      label={<Typography variant="caption" sx={{ fontWeight: 500 }}>{label}</Typography>}
      control={<Switch size="small" sx={switchSx} checked={layers[key]} onChange={(e) => onLayers({ [key]: e.target.checked })} />}
      sx={{ m: 0, gap: 0.5, '& .MuiFormControlLabel-label.Mui-disabled': { color: 'rgba(255,255,255,0.4)' } }}
    />
  );
  return (
    <Box sx={{ ...floatingDarkSx, px: 1.5, py: 1, width: 236 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FlightIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, flex: 1 }}>{tr('Survey drone', 'طائرة المسح')}</Typography>
        <Switch size="small" sx={switchSx} checked={layers.drone} onChange={(e) => onLayers({ drone: e.target.checked })} inputProps={{ 'aria-label': tr('Survey drone', 'طائرة المسح') }} />
      </Box>
      {layers.drone && (
        <>
          <Stack sx={{ mt: 0.5 }}>
            {toggle('beam', tr('Camera beam', 'شعاع الكاميرا'))}
            {toggle('footprints', tr('Photo footprints', 'بصمات الصور'))}
          </Stack>
          {status && (
            <Box component="table" sx={{ width: '100%', mt: 0.75, borderCollapse: 'collapse', '& td': { py: 0.2, fontSize: '0.72rem' }, '& td:last-of-type': { textAlign: 'end', fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }}>
              <tbody>
                <tr><td>{tr('Phase', 'المرحلة')}</td><td>{phases[status.phase]}</td></tr>
                <tr><td>{tr('Altitude (AGL)', 'الارتفاع فوق الأرض')}</td><td>{status.altitude.toFixed(1)} {tr('m', 'م')}</td></tr>
                <tr><td>{tr('Line spacing', 'المسافة بين الخطوط')}</td><td>{status.lineSpacing.toFixed(1)} {tr('m', 'م')}</td></tr>
                <tr><td>{tr('Photos', 'الصور')}</td><td>{status.photos} / {status.plannedPhotos}</td></tr>
              </tbody>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="caption" sx={{ flex: 1, opacity: 0.7, fontSize: '0.68rem' }}>
              {tr(
                `${Math.round(CONFIG.SURVEY_SIDE_OVERLAP * 100)}% side · ${Math.round(CONFIG.SURVEY_FRONT_OVERLAP * 100)}% front overlap`,
                `تداخل جانبي ${Math.round(CONFIG.SURVEY_SIDE_OVERLAP * 100)}% · أمامي ${Math.round(CONFIG.SURVEY_FRONT_OVERLAP * 100)}%`,
              )}
            </Typography>
            <Tooltip title={tr('Restart survey', 'إعادة المسح')}>
              <IconButton size="small" onClick={onRestart} sx={{ color: 'white' }} aria-label={tr('Restart survey', 'إعادة المسح')}>
                <ReplayIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );
}

export default function MosqueViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<MosqueEnvironment | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [night, setNight] = useState(CONFIG.START_AT_NIGHT);
  const [terrain, setTerrain] = useState(CONFIG.START_IN_TERRAIN);
  const [selection, setSelection] = useState<BimSelection | null>(null);
  const [bim, setBim] = useState<BimData | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>(CONFIG.START_COLOR_MODE);
  const [surveyLayers, setSurveyLayers] = useState<SurveyLayers>({ drone: CONFIG.START_SURVEY, beam: true, footprints: true });
  const [surveyStatus, setSurveyStatus] = useState<SurveyStatus | null>(null);
  const { tr } = useI18n();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const world = new MosqueEnvironment(container);
    world.onSelect = setSelection;
    world.onSurveyStatus = setSurveyStatus;
    let disposed = false;
    world
      .load((fraction) => !disposed && setProgress(Math.round(fraction * 100)))
      .then(() => {
        if (disposed) return;
        worldRef.current = world;
        world.start();
        setBim(world.bim ?? null);
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        if (!disposed) setStatus('error');
      });

    return () => {
      disposed = true;
      worldRef.current = null;
      world.dispose();
    };
  }, []);

  const toggleNight = () => {
    worldRef.current?.setNight(!night);
    setNight(!night);
  };
  const toggleTerrain = () => {
    worldRef.current?.setTerrainMode(!terrain);
    setTerrain(!terrain);
  };
  const toggleColorMode = () => {
    const next = colorMode === 'category' ? 'realistic' : 'category';
    worldRef.current?.setColorMode(next);
    setColorMode(next);
  };
  const changeSurveyLayers = (layers: Partial<SurveyLayers>) => {
    worldRef.current?.setSurveyLayers(layers);
    setSurveyLayers({ ...surveyLayers, ...layers });
  };
  const restartSurvey = () => worldRef.current?.restartSurvey();
  const clearSelection = () => worldRef.current?.select(null);
  const downloadSchedule = () => {
    if (!bim) return;
    const url = URL.createObjectURL(new Blob([scheduleCsv(bim)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aseer-mosque-bim-schedule.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', bgcolor: '#87ceeb' }}>
      {status === 'ready' && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ position: 'absolute', top: 16, left: 16, flexWrap: 'wrap', maxWidth: selection ? 'calc(100% - 408px)' : 'calc(100% - 32px)' }}>
          {/* Each button shows the mode it switches to. */}
          <Button
            variant="contained"
            disableElevation
            startIcon={night ? <LightModeIcon /> : <DarkModeIcon />}
            onClick={toggleNight}
            sx={buttonSx}
          >
            {night ? tr('Day mode', 'الوضع النهاري') : tr('Night mode', 'الوضع الليلي')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={terrain ? <GrassIcon /> : <TerrainIcon />}
            onClick={toggleTerrain}
            sx={buttonSx}
          >
            {terrain ? tr('Grass mode', 'وضع العشب') : tr('Terrain mode', 'وضع التضاريس')}
          </Button>
          {bim && (
            <Button
              variant="contained"
              disableElevation
              startIcon={colorMode === 'category' ? <PaletteIcon /> : <CategoryIcon />}
              onClick={toggleColorMode}
              sx={buttonSx}
            >
              {colorMode === 'category' ? tr('Realistic colours', 'ألوان واقعية') : tr('Category colours', 'ألوان الفئات')}
            </Button>
          )}
          {bim && (
            <Button variant="contained" disableElevation startIcon={<DownloadIcon />} onClick={downloadSchedule} sx={buttonSx}>
              {tr('BIM schedule (CSV)', 'جدول BIM (CSV)')}
            </Button>
          )}
        </Stack>
      )}

      {status === 'ready' && bim && (
        <Stack spacing={1} sx={{ position: 'absolute', left: 16, bottom: 16, alignItems: 'flex-start' }}>
          {colorMode === 'category' && <CategoryLegend bim={bim} />}
          {!selection && (
            <Box sx={{ ...floatingDarkSx, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, pointerEvents: 'none' }}>
              <TouchAppIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {tr(`Click any building element for its BIM data · ${Object.keys(bim.elements).length} elements`, `انقر أي عنصر في المبنى لعرض بيانات BIM · ${Object.keys(bim.elements).length} عنصرًا`)}
              </Typography>
            </Box>
          )}
        </Stack>
      )}

      {status === 'ready' && (
        <Box sx={{ position: 'absolute', bottom: 16, right: selection ? 392 : 16, display: selection ? { xs: 'none', md: 'block' } : 'block' }}>
          <SurveyPanel layers={surveyLayers} status={surveyStatus} onLayers={changeSurveyLayers} onRestart={restartSurvey} />
        </Box>
      )}

      {selection && bim && (
        <PropertiesPanel selection={selection} disclaimer={bim.meta.disclaimer} onClose={clearSelection} />
      )}

      {status !== 'ready' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            pointerEvents: 'none',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {status === 'error' ? tr('Failed to load the 3D scene.', 'تعذّر تحميل المشهد ثلاثي الأبعاد.') : tr(`Loading scene… ${progress}%`, `جارٍ تحميل المشهد… ${progress}%`)}
          </Typography>
          {status === 'loading' && <LinearProgress variant="determinate" value={progress} sx={{ width: 200 }} />}
        </Box>
      )}
    </Box>
  );
}
