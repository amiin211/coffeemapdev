'use client';

// Smart panels for the GeoAI Crop Monitoring dashboard: map mode bar with
// timeline playback, farm health distribution, the auto-written farm brief,
// and per-field intelligence (peer health, phenology, cuttings, water use,
// look-alike fields). Analytics live in src/lib/cropInsights.ts.

import { Box, Chip, IconButton, MenuItem, Select, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined';
import {
  BriefItem,
  CutEvent,
  FieldHealth,
  HEALTH_COLORS,
  HEALTH_LABEL,
  HEALTH_ORDER,
  Health,
  Phenology,
  WaterUse,
} from '@/lib/cropInsights';
import { CROP_COLORS, FieldProperties, cropLabel, fieldLabel, formatDate } from '@/utils/crop';
import { useI18n } from '@/i18n';
import { agriGreen } from '@/theme/agriColors';

export type CropMapMode = 'index' | 'health' | 'change' | 'water' | 'crop';

export const CHANGE_RAMP = ['#8c510a', '#d8b365', '#f6e8c3', '#f5f5f5', '#c7eae5', '#5ab4ac', '#01665e'];
export const WATER_RAMP = ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'];
export const WATER_MAX = 25_000; // m³/ha/yr at the top of the ramp

const MODES: [CropMapMode, string, string][] = [
  ['index', 'Index', 'المؤشر'],
  ['health', 'Health', 'الصحة'],
  ['change', 'Change', 'التغيّر'],
  ['water', 'Water', 'المياه'],
  ['crop', 'Crop', 'المحصول'],
];

// One plain-language line under the mode buttons, for the selected mode.
const MODE_HELP: Record<CropMapMode, [string, string]> = {
  index: ['Satellite image of plant greenness on the selected date: red is bare ground, green is a dense crop. Press play to watch the season.', 'صورة قمر صناعي لخضرة النبات في التاريخ المختار: الأحمر أرض جرداء، والأخضر محصول كثيف. اضغط تشغيل لمشاهدة الموسم.'],
  health: ['Each field compared with fields growing the same crop on this date: dark green is ahead, yellow and red are falling behind, brown was just harvested or cut.', 'كل حقل مقارنة بالحقول التي تزرع المحصول نفسه في هذا التاريخ: الأخضر الداكن متقدم، والأصفر والأحمر متأخران، والبني حُصد أو حُشّ للتو.'],
  change: ['How much greener (teal) or browner (brown) each field became since the earlier date you choose next to the buttons.', 'كم صار كل حقل أكثر خضرة (أزرق مخضر) أو أكثر جفافًا (بني) منذ التاريخ السابق الذي تختاره بجانب الأزرار.'],
  water: ['Estimated irrigation water each field used over the last 12 months, per hectare: darker blue means thirstier. Modelled from greenness and weather, not metered.', 'تقدير مياه الري التي استهلكها كل حقل خلال آخر 12 شهرًا لكل هكتار: الأزرق الأغمق أكثر عطشًا. مقدّر من الخضرة والطقس، لا من عدادات.'],
  crop: ['The crop type the model assigned to each field for this season.', 'نوع المحصول الذي أسنده النموذج لكل حقل في هذا الموسم.'],
};

const panelSx = { bgcolor: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', borderRadius: 1.5, boxShadow: 2 };

// ------------------------------------------------------------------ mode bar --
export function MapModeBar({
  mode,
  onMode,
  playing,
  onPlay,
  compareDays,
  onCompareDays,
}: {
  mode: CropMapMode;
  onMode: (m: CropMapMode) => void;
  playing: boolean;
  onPlay: () => void;
  compareDays: number;
  onCompareDays: (d: number) => void;
}) {
  const { isAr, tr } = useI18n();
  return (
    <Box sx={{ p: 0.5, maxWidth: 520, ...panelSx }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
      <Tooltip title={playing ? tr('Pause', 'إيقاف مؤقت') : tr('Play the season scene by scene', 'تشغيل الموسم مشهدًا بمشهد')}>
        <IconButton size="small" onClick={onPlay} sx={{ bgcolor: agriGreen.DEFAULT, color: 'white', '&:hover': { bgcolor: agriGreen.dark } }} aria-label={tr('Play timeline', 'تشغيل الخط الزمني')}>
          {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} />}
        </IconButton>
      </Tooltip>
      <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && onMode(v)} sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1, fontSize: '0.72rem', textTransform: 'none' } }}>
        {MODES.map(([m, en, ar]) => (
          <ToggleButton key={m} value={m}>
            {tr(en, ar)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {mode === 'change' && (
        <Select size="small" value={compareDays} onChange={(e) => onCompareDays(Number(e.target.value))} sx={{ fontSize: '0.72rem', height: 28 }}>
          {[10, 30, 60, 90, 365].map((d) => (
            <MenuItem key={d} value={d} sx={{ fontSize: '0.75rem' }}>
              {d === 365 ? tr('vs 1 year earlier', 'مقارنة بقبل سنة') : tr(`vs ${d} days earlier`, `مقارنة بقبل ${d} يومًا`)}
            </MenuItem>
          ))}
        </Select>
      )}
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.75, pt: 0.5, lineHeight: 1.4 }}>
      {tr(MODE_HELP[mode][0], MODE_HELP[mode][1])}
    </Typography>
    </Box>
  );
}

// ------------------------------------------------------------- mode legends --
export function ModeLegend({ mode, compareLabel }: { mode: CropMapMode; compareLabel: string }) {
  const { isAr, tr } = useI18n();
  if (mode === 'health') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 1.5, rowGap: 0.25 }}>
        {HEALTH_ORDER.filter((h) => h !== 'nodata').map((h) => (
          <Box key={h} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 11, height: 11, borderRadius: 0.5, bgcolor: HEALTH_COLORS[h], border: '1px solid rgba(0,0,0,0.15)' }} />
            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{HEALTH_LABEL[h][isAr ? 1 : 0]}</Typography>
          </Box>
        ))}
      </Box>
    );
  }
  if (mode === 'crop') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 1.5, rowGap: 0.25 }}>
        {Object.entries(CROP_COLORS).filter(([c]) => c !== 'Unclassified').map(([c, color]) => (
          <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 11, height: 11, borderRadius: 0.5, bgcolor: color }} />
            <Typography variant="caption" sx={{ fontSize: '0.65rem' }} noWrap>{cropLabel(c, isAr)}</Typography>
          </Box>
        ))}
      </Box>
    );
  }
  const ramp = mode === 'change' ? CHANGE_RAMP : WATER_RAMP;
  const ticks = mode === 'change' ? ['−0.4', '0', '+0.4'] : ['0', '12.5k', '25k+'];
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', fontSize: '0.68rem' }}>
        {mode === 'change' ? tr(`NDVI change since ${compareLabel}`, `تغيّر NDVI منذ ${compareLabel}`) : tr('Irrigation demand, last 12 months (m³/ha)', 'الطلب على الري، آخر 12 شهرًا (م³/هكتار)')}
      </Typography>
      <Box sx={{ width: 200, height: 10, borderRadius: 1, background: `linear-gradient(to ${isAr ? 'left' : 'right'}, ${ramp.join(',')})` }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
        {ticks.map((t) => (
          <Typography key={t} variant="caption" sx={{ fontSize: '0.62rem' }}>{t}</Typography>
        ))}
      </Box>
    </Box>
  );
}

// --------------------------------------------------------- health breakdown --
export function HealthBar({
  counts,
  areas,
  selected,
  onSelect,
}: {
  counts: Record<Health, number>;
  areas: Record<Health, number>;
  selected: Health | null;
  onSelect: (h: Health | null) => void;
}) {
  const { isAr, tr } = useI18n();
  const total = HEALTH_ORDER.reduce((s, h) => s + counts[h], 0) || 1;
  const shown = HEALTH_ORDER.filter((h) => counts[h] > 0);
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
        {tr('Field health vs peers', 'صحة الحقول مقارنة بالنظراء')}
        <Typography component="span" variant="caption" color="text.secondary"> · {tr('click to filter the map', 'انقر لتصفية الخريطة')}</Typography>
      </Typography>
      <Box sx={{ display: 'flex', height: 14, borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', mb: 0.75 }}>
        {shown.map((h) => (
          <Tooltip key={h} title={`${HEALTH_LABEL[h][isAr ? 1 : 0]}: ${counts[h]} · ${Math.round(areas[h]).toLocaleString()} ${tr('ha', 'هكتار')}`}>
            <Box
              onClick={() => onSelect(selected === h ? null : h)}
              sx={{ width: `${(counts[h] / total) * 100}%`, bgcolor: HEALTH_COLORS[h], cursor: 'pointer', opacity: !selected || selected === h ? 1 : 0.3, transition: 'opacity .2s' }}
            />
          </Tooltip>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {shown.map((h) => (
          <Chip
            key={h}
            size="small"
            onClick={() => onSelect(selected === h ? null : h)}
            label={`${HEALTH_LABEL[h][isAr ? 1 : 0]} ${counts[h]}`}
            variant={selected === h ? 'filled' : 'outlined'}
            sx={{
              height: 22,
              fontSize: '0.68rem',
              borderColor: HEALTH_COLORS[h] === '#FFFFFF' || HEALTH_COLORS[h] === '#E0E0E0' ? '#bbb' : HEALTH_COLORS[h],
              bgcolor: selected === h ? HEALTH_COLORS[h] : undefined,
              color: selected === h && ['thriving', 'stressed', 'harvested'].includes(h) ? 'white' : undefined,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------- the brief --
const TONE: Record<BriefItem['tone'], string> = { good: '#2E7D32', warn: '#F9A825', bad: '#D50000', info: '#546E7A' };

export function FarmBrief({ items, onField, onHealth }: { items: BriefItem[]; onField: (id: string) => void; onHealth: (h: Health) => void }) {
  const { isAr, tr } = useI18n();
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <AutoAwesomeIcon sx={{ fontSize: 17, color: agriGreen.DEFAULT }} />
        <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif' }}>
          {tr('Farm brief', 'موجز المزرعة')}
        </Typography>
        <Typography variant="caption" color="text.secondary">{tr('· written from the data, updates with the date', '· يُكتب من البيانات ويتحدث مع التاريخ')}</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        {items.map((it, i) => {
          const clickable = !!(it.fieldId || it.health);
          return (
            <Box
              key={i}
              onClick={() => (it.fieldId ? onField(it.fieldId) : it.health ? onHealth(it.health) : undefined)}
              sx={{
                borderInlineStart: `3px solid ${TONE[it.tone]}`,
                pl: 1,
                pr: 0.5,
                py: 0.4,
                borderRadius: 0.5,
                bgcolor: 'rgba(0,0,0,0.02)',
                cursor: clickable ? 'pointer' : 'default',
                '&:hover': clickable ? { bgcolor: 'rgba(46,125,50,0.08)' } : undefined,
              }}
            >
              <Typography variant="caption" sx={{ lineHeight: 1.5, display: 'block' }}>
                {isAr ? it.ar : it.en}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ------------------------------------------------------------ field details --
interface FieldIntelProps {
  field: FieldProperties;
  health: FieldHealth | undefined;
  phenology: Phenology[];
  cuts: CutEvent[];
  dateIso: string;
  water: WaterUse;
  waterPeerMedian: number | null; // m³/ha of the same crop
  similar: { id: string; r: number }[];
  fieldName: (id: string) => string;
  onSelect: (id: string) => void;
  showSimilar: boolean;
  onToggleSimilar: () => void;
}

function Row({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.3, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, color, textAlign: 'end' }}>{value}</Typography>
    </Box>
  );
}

export function FieldIntel(p: FieldIntelProps) {
  const { isAr, tr } = useI18n();
  const h = p.health;
  const d = (iso: string | null) => (iso ? formatDate(iso, isAr) : '—');
  const yearAgo = Date.parse(p.dateIso) - 365 * 86_400_000;
  const cuts12 = p.cuts.filter((c) => Date.parse(c.date) <= Date.parse(p.dateIso) && Date.parse(c.date) > yearAgo);
  const seasons = p.phenology.filter((s) => s.vigour > 0).slice(-3).reverse();
  const TrendIcon = h?.trend == null ? TrendingFlatIcon : h.trend > 0.03 ? TrendingUpIcon : h.trend < -0.03 ? TrendingDownIcon : TrendingFlatIcon;
  const trendColor = h?.trend == null ? undefined : h.trend > 0.03 ? '#2E7D32' : h.trend < -0.03 ? '#D50000' : undefined;
  const waterVsPeers = p.waterPeerMedian && p.water.perHa ? p.water.perHa / p.waterPeerMedian : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {h && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: HEALTH_COLORS[h.health], border: '1px solid rgba(0,0,0,0.2)' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{HEALTH_LABEL[h.health][isAr ? 1 : 0]}</Typography>
            <TrendIcon sx={{ fontSize: 18, color: trendColor }} />
          </Box>
          <Row label={tr(`NDVI vs ${cropLabel(h.crop, false).toLowerCase()} peers`, `NDVI مقارنة بنظراء ${cropLabel(h.crop, true)}`)} value={h.value !== null && h.peerMedian !== null ? `${h.value.toFixed(2)} / ${h.peerMedian.toFixed(2)} (${Math.round((h.ratio ?? 0) * 100)}%)` : '—'} />
          <Row label={tr('How unusual vs peers (z; below −1.5 is a concern)', 'مدى الاختلاف عن النظراء (z؛ أقل من −1.5 مقلق)')} value={h.z !== null ? h.z.toFixed(1) : '—'} color={h.z !== null && h.z < -1.5 ? '#D50000' : undefined} />
          <Row label={tr('Trend, last 30 days', 'الاتجاه، آخر 30 يومًا')} value={h.trend !== null ? `${h.trend > 0 ? '+' : ''}${h.trend.toFixed(3)} ${tr('/ 10 days', '/ 10 أيام')}` : '—'} color={trendColor} />
          {h.harvestedOn && <Row label={tr('Harvest / cut detected', 'رُصد حصاد / حش')} value={d(h.harvestedOn)} color="#6D4C41" />}
        </Box>
      )}

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{tr('Phenology by season (model)', 'الفينولوجيا حسب الموسم (نموذج)')}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontSize: '0.66rem', lineHeight: 1.4 }}>
          {tr('When the crop greened up, peaked and dried down each season. Vigour ranks this field against the same crop: P100 is the best field, P0 the weakest.', 'متى اخضرّ المحصول وبلغ ذروته وجفّ في كل موسم. وترتّب القوة هذا الحقل مقابل المحصول نفسه: P100 أفضل حقل، وP0 أضعفها.')}
        </Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { fontFamily: 'inherit', fontSize: '0.68rem', py: 0.3, px: 0.4, textAlign: 'center', borderBottom: '1px solid #eee' }, '& th': { color: 'text.secondary', fontWeight: 600 } }}>
          <thead>
            <tr>
              <th>{tr('Season', 'الموسم')}</th>
              <th>{tr('Peak', 'الذروة')}</th>
              <th>{tr('Green-up → senesc.', 'الاخضرار ← الشيخوخة')}</th>
              <th>{tr('Cycles', 'الدورات')}</th>
              <th>
                <Tooltip title={tr('Season-integrated NDVI ranked among fields of the same crop — a yield-potential proxy.', 'NDVI المتكامل عبر الموسم مرتبًا بين حقول المحصول نفسه — مؤشر تقريبي لإمكانات الإنتاج.')}>
                  <span style={{ textDecoration: 'underline dotted' }}>{tr('Vigour', 'القوة')}</span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr key={s.season}>
                <td>{s.season}</td>
                <td>{s.peak.toFixed(2)}<br /><span style={{ color: '#888' }}>{s.peakDate ? formatDate(s.peakDate, isAr).replace(/ \d{4}$/, '') : ''}</span></td>
                <td>{s.cycles > 1 ? tr('multi-cycle', 'متعدد الدورات') : s.greenUp && s.senescence ? `${formatDate(s.greenUp, isAr).replace(/ \d{4}$/, '')} → ${formatDate(s.senescence, isAr).replace(/ \d{4}$/, '')}` : '—'}</td>
                <td>{s.cycles}</td>
                <td style={{ fontWeight: 700, color: s.vigourPct == null ? undefined : s.vigourPct >= 66 ? '#2E7D32' : s.vigourPct <= 33 ? '#D50000' : '#F9A825' }}>{s.vigourPct == null ? '—' : `P${s.vigourPct}`}</td>
              </tr>
            ))}
          </tbody>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
          {tr(`${cuts12.length} harvests / cuttings detected in the last 12 months.`, `رُصد ${cuts12.length} حصادًا / حشّة خلال آخر 12 شهرًا.`)}
        </Typography>
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          <WaterDropOutlinedIcon sx={{ fontSize: 15, color: '#1565C0' }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{tr('Irrigation demand, last 12 months', 'الطلب على الري، آخر 12 شهرًا')}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontSize: '0.66rem', lineHeight: 1.4 }}>
          {tr('How much water the crop used (ETc) and how much the pivot had to apply to deliver it. Estimated from greenness and daily weather, not from meters.', 'كم استهلك المحصول من الماء (ETc) وكم كان على المحور أن يضخ ليوصله. تقدير من الخضرة والطقس اليومي، لا من العدادات.')}
        </Typography>
        <Row label={tr('Crop evapotranspiration (ETc)', 'التبخر-نتح للمحصول (ETc)')} value={`${p.water.etcMm.toLocaleString()} mm`} />
        <Row label={tr('Gross irrigation (85% efficiency)', 'الري الإجمالي (كفاءة 85%)')} value={`${Math.round(p.water.grossM3).toLocaleString()} m³`} color="#1565C0" />
        <Row
          label={tr('Per hectare vs same crop', 'لكل هكتار مقارنة بالمحصول نفسه')}
          value={`${p.water.perHa.toLocaleString()} m³/ha${waterVsPeers ? ` (${waterVsPeers >= 1 ? '+' : ''}${Math.round((waterVsPeers - 1) * 100)}%)` : ''}`}
          color={waterVsPeers && waterVsPeers > 1.2 ? '#E65100' : undefined}
        />
      </Box>

      {p.similar.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{tr('Fields behaving like this one', 'حقول تتصرف مثل هذا الحقل')}</Typography>
            <Chip size="small" label={p.showSimilar ? tr('Hide on map', 'إخفاء من الخريطة') : tr('Show on map', 'إظهار على الخريطة')} onClick={p.onToggleSimilar} variant={p.showSimilar ? 'filled' : 'outlined'} color="info" sx={{ height: 20, fontSize: '0.64rem' }} />
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {p.similar.map((s) => (
              <Chip key={s.id} size="small" onClick={() => p.onSelect(s.id)} label={`${p.fieldName(s.id)} · r ${s.r.toFixed(2)}`} sx={{ height: 22, fontSize: '0.66rem' }} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.64rem' }}>
            {tr('Pearson correlation of NDVI profiles over the past year — same crop, timing or management.', 'ارتباط بيرسون لمنحنيات NDVI خلال السنة الماضية — المحصول أو التوقيت أو الإدارة نفسها.')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export const fieldNameFor = (fields: FieldProperties[], ar: boolean) => {
  const byId = new Map(fields.map((f) => [f.id, f.name]));
  return (id: string) => fieldLabel(byId.get(id) ?? id, ar);
};
