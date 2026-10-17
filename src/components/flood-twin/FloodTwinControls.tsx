'use client';

import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, Slider, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import { useI18n } from '@/i18n';
import { DEPTH_CLASSES, TIMING } from '@/lib/floodTwin/config';
import type { Calibration } from '@/lib/floodTwin/data';
import type { Layers } from '@/lib/floodTwin/scene';
import { water } from '@/theme/waterColors';

export const SPEEDS = [0.5, 1, 2] as const;
export type Speed = (typeof SPEEDS)[number];

interface Props {
  t: number;
  playing: boolean;
  onPlayPause: () => void;
  onScrub: (t: number) => void;
  speed: Speed;
  onSpeed: (s: Speed) => void;
  freeCamera: boolean;
  onFreeCamera: (free: boolean) => void;
  layers: Layers;
  onLayers: (layers: Layers) => void;
  hasExtent: boolean;
  illustrative: boolean;
  calibration: Calibration | null;
  source: string;
}

const Heading = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, lineHeight: 2 }}>
    {children}
  </Typography>
);

export default function FloodTwinControls(p: Props) {
  const { tr, isAr } = useI18n();
  const ended = p.t >= TIMING.DURATION;
  const layerRows: [keyof Layers, string][] = [
    ['buildings', tr('Buildings', 'المباني')],
    ['water', tr('Water', 'المياه')],
    ['rain', tr('Rain', 'الأمطار')],
    ...(p.hasExtent ? [['floodExtent', tr('ML flood extent', 'امتداد الفيضان (تعلم آلي)')] as [keyof Layers, string]] : []),
    ['satellite', tr('Satellite texture', 'صورة القمر الصناعي')],
  ];

  return (
    <Box>
      <Heading>{tr('Playback', 'التشغيل')}</Heading>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button
          variant="contained"
          disableElevation
          onClick={p.onPlayPause}
          startIcon={p.playing ? <PauseIcon /> : ended ? <ReplayIcon /> : <PlayArrowIcon />}
          sx={{ bgcolor: water.DEFAULT, '&:hover': { bgcolor: water.dark }, minWidth: 110 }}
        >
          {p.playing ? tr('Pause', 'إيقاف') : ended ? tr('Replay', 'إعادة') : tr('Play', 'تشغيل')}
        </Button>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
          {p.t.toFixed(1)} / {TIMING.DURATION} {tr('s', 'ث')}
        </Typography>
      </Stack>
      <Slider
        aria-label={tr('Timeline', 'الخط الزمني')}
        value={p.t}
        min={0}
        max={TIMING.DURATION}
        step={1 / 30}
        onChange={(_, v) => p.onScrub(v as number)}
        marks={[TIMING.FLOOD_START, TIMING.FLOOD_END, TIMING.PEAK_END].map((value) => ({ value }))}
        sx={{ mt: 1, color: water.DEFAULT }}
      />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">{tr('Speed', 'السرعة')}</Typography>
        <ToggleButtonGroup size="small" exclusive value={p.speed} onChange={(_, v: Speed | null) => v && p.onSpeed(v)}>
          {SPEEDS.map((s) => (
            <ToggleButton key={s} value={s} sx={{ px: 1.25, py: 0.25 }}>{s}×</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      <FormControlLabel
        control={<Switch checked={p.freeCamera} onChange={(e) => p.onFreeCamera(e.target.checked)} />}
        label={<Typography variant="body2">{tr('Free camera', 'كاميرا حرة')}</Typography>}
      />
      {p.freeCamera && (
        <Typography variant="caption" color="text.secondary" component="p">
          {tr('Drag to orbit · right-drag to pan · scroll to zoom. The scripted camera is paused.', 'اسحب للدوران · اسحب بالزر الأيمن للتحريك · مرّر للتكبير. الكاميرا المبرمجة متوقفة.')}
        </Typography>
      )}

      <Divider sx={{ my: 1.5 }} />
      <Heading>{tr('Layers', 'الطبقات')}</Heading>
      {layerRows.map(([key, label]) => (
        <FormControlLabel
          key={key}
          sx={{ display: 'flex', my: -0.5 }}
          control={<Checkbox size="small" checked={p.layers[key]} onChange={(e) => p.onLayers({ ...p.layers, [key]: e.target.checked })} />}
          label={<Typography variant="body2">{label}</Typography>}
        />
      ))}

      <Divider sx={{ my: 1.5 }} />
      <Heading>{tr('Water depth at building', 'عمق المياه عند المبنى')}</Heading>
      <Stack spacing={0.5}>
        {DEPTH_CLASSES.map((c) => (
          <Stack key={c.label} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: c.color, border: '1px solid rgba(0,0,0,0.15)' }} />
            <Typography variant="body2">{isAr ? c.labelAr : c.label}</Typography>
          </Stack>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
        {tr('Click a building for its height, ground elevation and water depth.', 'انقر مبنى لعرض ارتفاعه ومنسوب الأرض وعمق المياه.')}
      </Typography>

      <Divider sx={{ my: 1.5 }} />
      {p.illustrative && (
        <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
          <Typography variant="caption" component="p" sx={{ fontWeight: 700 }}>{tr('Illustrative sample', 'عينة توضيحية')}</Typography>
          <Typography variant="caption" component="p">
            {tr('Synthetic terrain, buildings, water levels and rainfall, generated to demonstrate the viewer. Not observed data.', 'تضاريس ومبانٍ ومناسيب مياه وأمطار اصطناعية أُنشئت لعرض الأداة. ليست بيانات مرصودة.')}
          </Typography>
        </Alert>
      )}
      {p.calibration && (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          <Typography variant="caption" component="p">
            {tr(
              `Water levels calibrated to the DEM, approximate (offset ${p.calibration.offset_m.toFixed(2)} m, ${p.calibration.method === 'command-line' ? 'given' : `matched to the river on ${p.calibration.baseline_date}`}).`,
              `مناسيب المياه معايَرة على نموذج الارتفاع، تقريبية (إزاحة ${p.calibration.offset_m.toFixed(2)} م، ${p.calibration.method === 'command-line' ? 'محددة يدويًا' : `مطابقة لمنسوب النهر في ${p.calibration.baseline_date}`}).`,
            )}
          </Typography>
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary" component="p">
        {tr('Flat water surface across the area (bathtub model): indicative, not a hydraulic simulation.', 'سطح مياه مستوٍ عبر المنطقة (نموذج الحوض): استرشادي، وليس محاكاة هيدروليكية.')}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
        {tr('Timeline:', 'الخط الزمني:')} {p.source}
      </Typography>
    </Box>
  );
}
