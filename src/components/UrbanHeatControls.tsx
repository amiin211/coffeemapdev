'use client';

import { Box, Button, Divider, FormControlLabel, Slider, Switch, TextField, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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
  ['cooling', { en: 'Simulated cooling', ar: 'التبريد المحاكى' }],
  ['trees', { en: 'Trees (OSM)', ar: 'الأشجار (OSM)' }],
  ['parks', { en: 'Parks (OSM)', ar: 'الحدائق (OSM)' }],
  ['hillshade', { en: 'Hillshade', ar: 'تظليل التضاريس' }],
];

// Hover help for each layer switch: what it shows and how to read it.
const LAYER_HELP: Record<keyof UrbanLayerVisibility, Bi> = {
  heat: { en: 'How hot the ground surface was in the summer imagery (Landsat), yellow to dark red. It is the surface, not the air, so it reads hotter than the weather forecast.', ar: 'مدى سخونة سطح الأرض في صور الصيف (Landsat)، من الأصفر إلى الأحمر الداكن. إنه السطح لا الهواء، لذا يبدو أسخن من نشرة الطقس.' },
  hotspots: { en: 'The hottest group of built-up areas, found by clustering surface temperature into four groups (k-means).', ar: 'أشد مجموعات المناطق المبنية حرارة، محددة بتجميع حرارة السطح في أربع مجموعات (k-means).' },
  vegetation: { en: 'How green the ground is (NDVI from Sentinel-2): brown is bare or built, green is planted.', ar: 'مدى خضرة الأرض (NDVI من Sentinel-2): البني أرض جرداء أو مبنية، والأخضر مزروع.' },
  canopy: { en: 'Estimated tree cover in each ~70 m block, from satellite greenness, land-cover maps and mapped trees. Darker green means more shade.', ar: 'الغطاء الشجري المقدّر في كل قطعة بنحو 70 م، من خضرة الأقمار الصناعية وخرائط الغطاء الأرضي والأشجار المرسومة. الأخضر الأغمق يعني ظلًا أكثر.' },
  equity: { en: 'Greenery residents can reach minus the heat they face. Red blocks are hot with little shade or park nearby; green blocks are cool and well served.', ar: 'الخضرة التي يصل إليها السكان ناقص الحرارة التي يواجهونها. القطع الحمراء حارة بلا ظل أو حديقة قريبة؛ والخضراء باردة ومخدومة جيدًا.' },
  priority: { en: 'The 15% of built-up blocks that most need trees: highest heat risk and least access to greenery. Start planting here.', ar: 'أعلى 15% من القطع المبنية حاجة إلى الأشجار: أعلى مخاطر حرارة وأقل وصول إلى الخضرة. ابدأ التشجير هنا.' },
  cooling: { en: 'Where your greening plan cools the ground, in blue. Appears after you set a tree budget or place an intervention in the Greening simulator.', ar: 'أين تبرّد خطة التشجير الأرض، باللون الأزرق. تظهر بعد تحديد ميزانية أشجار أو وضع تدخل في محاكي التشجير.' },
  trees: { en: 'Individual trees mapped by volunteers in OpenStreetMap. Far from complete, so canopy uses satellite data as well.', ar: 'أشجار مفردة رسمها متطوعون في OpenStreetMap. غير مكتملة، لذا تعتمد المظلة على بيانات الأقمار الصناعية أيضًا.' },
  parks: { en: 'Parks mapped in OpenStreetMap, used to measure how far each block is from a park.', ar: 'الحدائق المرسومة في OpenStreetMap، وتُستخدم لقياس بُعد كل قطعة عن حديقة.' },
  hillshade: { en: 'Terrain shading from the elevation model, to show valleys such as Wadi Hanifa.', ar: 'تظليل التضاريس من نموذج الارتفاع، لإظهار الأودية مثل وادي حنيفة.' },
};

const WEIGHT_HELP: Record<keyof Weights, Bi> = {
  heat: { en: 'How much surface heat counts in the heat-risk score.', ar: 'وزن حرارة السطح في درجة مخاطر الحرارة.' },
  density: { en: 'How much dense building counts: packed blocks trap more heat.', ar: 'وزن كثافة المباني: القطع المكتظة تحتبس حرارة أكثر.' },
  vegetation: { en: 'How much missing greenery counts in the heat-risk score.', ar: 'وزن نقص الخضرة في درجة مخاطر الحرارة.' },
};

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
            label={
              <Tooltip title={pick(LAYER_HELP[key])} placement="right" arrow enterDelay={150}>
                <Typography variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                  {pick(label)}
                  <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </Typography>
              </Tooltip>
            }
          />
        ))}
      </Section>

      <Divider sx={{ mb: 1 }} />
      <Section title={tr('Heat risk model weights', 'أوزان نموذج مخاطر الحرارة')}>
        {WEIGHTS.map(([key, w, label]) => (
          <Box key={key} sx={{ px: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Tooltip title={pick(WEIGHT_HELP[key])} placement="right" arrow enterDelay={150}>
                <Typography variant="caption" sx={{ cursor: 'help' }}>{w} · {pick(label)}</Typography>
              </Tooltip>
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
