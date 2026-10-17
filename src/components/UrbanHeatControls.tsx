'use client';

import { Box, Button, Divider, FormControlLabel, Slider, Switch, TextField, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import type { Weights } from '@/lib/urbanHeat';
import type { UrbanLayerVisibility } from '@/components/UrbanHeatMap';
import { Bi, useI18n } from '@/i18n';

export interface DateWindow {
  start: string;
  end: string;
}

interface UrbanHeatControlsProps {
  window: DateWindow;
  onWindowChange: (w: DateWindow) => void;
  onLoad: () => void;
  visible: UrbanLayerVisibility;
  onVisibleChange: (v: UrbanLayerVisibility) => void;
  weights: Weights;
  onWeightsChange: (w: Weights) => void;
  onRecompute: () => void;
  busy: boolean;
  maxDate: string;
}

const LAYERS: [keyof UrbanLayerVisibility, Bi][] = [
  ['heat', { en: 'Heat (land surface temp.)', ar: 'الحرارة (حرارة سطح الأرض)' }],
  ['hotspots', { en: 'Heat hotspots', ar: 'البؤر الحرارية' }],
  ['vegetation', { en: 'Vegetation (NDVI)', ar: 'الغطاء النباتي (NDVI)' }],
  ['canopy', { en: 'Tree canopy', ar: 'مظلة الأشجار' }],
  ['equity', { en: 'Canopy equity', ar: 'عدالة مظلة الأشجار' }],
  ['priority', { en: 'Priority zones', ar: 'مناطق الأولوية' }],
  ['trees', { en: 'Trees (OSM)', ar: 'الأشجار (OSM)' }],
  ['parks', { en: 'Parks (OSM)', ar: 'الحدائق (OSM)' }],
  ['hillshade', { en: 'Hillshade', ar: 'تظليل التضاريس' }],
];

const WEIGHTS: [keyof Weights, string, Bi][] = [
  ['heat', 'w1', { en: 'Land surface temperature', ar: 'حرارة سطح الأرض' }],
  ['density', 'w2', { en: 'Building density', ar: 'كثافة المباني' }],
  ['vegetation', 'w3', { en: 'Lack of vegetation (1 − NDVI)', ar: 'نقص الغطاء النباتي (1 − NDVI)' }],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, lineHeight: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default function UrbanHeatControls(props: UrbanHeatControlsProps) {
  const { window: win, visible, weights, busy } = props;
  const { tr, pick } = useI18n();
  return (
    <Box>
      <Section title={tr('Imagery window', 'فترة الصور')}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            label={tr('From', 'من')}
            type="date"
            size="small"
            value={win.start}
            onChange={(e) => props.onWindowChange({ ...win, start: e.target.value })}
            inputProps={{ min: '2019-01-01', max: props.maxDate }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label={tr('To', 'إلى')}
            type="date"
            size="small"
            value={win.end}
            onChange={(e) => props.onWindowChange({ ...win, end: e.target.value })}
            inputProps={{ min: '2019-01-01', max: props.maxDate }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {tr('Least-cloudy Landsat 8/9 (LST) and Sentinel-2 (NDVI) scenes in the window. Summer shows the strongest heat.', 'أقل مشاهد Landsat 8/9 (حرارة السطح) وSentinel-2 (NDVI) غيومًا خلال الفترة. يُظهر الصيف أشد الحرارة.')}
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={props.onLoad}
          disabled={busy || !win.start || !win.end || win.start > win.end}
          sx={{ textTransform: 'none' }}
        >
          {tr('Load LST & NDVI', 'تحميل حرارة السطح وNDVI')}
        </Button>
      </Section>

      <Divider sx={{ mb: 1 }} />
      <Section title={tr('Layers', 'الطبقات')}>
        {LAYERS.map(([key, label]) => (
          <FormControlLabel
            key={key}
            sx={{ display: 'flex', ml: 0, mr: 0, justifyContent: 'space-between' }}
            labelPlacement="start"
            control={<Switch size="small" checked={visible[key]} onChange={(e) => props.onVisibleChange({ ...visible, [key]: e.target.checked })} />}
            label={<Typography variant="body2">{pick(label)}</Typography>}
          />
        ))}
      </Section>

      <Divider sx={{ mb: 1 }} />
      <Section title={tr('Heat risk model weights', 'أوزان نموذج مخاطر الحرارة')}>
        {WEIGHTS.map(([key, w, label]) => (
          <Box key={key} sx={{ px: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">{w} · {pick(label)}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{weights[key]}</Typography>
            </Box>
            <Slider
              size="small"
              value={weights[key]}
              min={0}
              max={1}
              step={0.05}
              onChange={(_, v) => props.onWeightsChange({ ...weights, [key]: v as number })}
              sx={{ py: 1, mt: -0.5 }}
            />
          </Box>
        ))}
      </Section>

      <Button
        fullWidth
        variant="contained"
        color="error"
        startIcon={<RefreshIcon />}
        onClick={props.onRecompute}
        disabled={busy}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        {tr('Recompute Equity', 'إعادة حساب العدالة')}
      </Button>
    </Box>
  );
}
