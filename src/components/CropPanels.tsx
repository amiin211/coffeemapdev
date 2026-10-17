'use client';

import {
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItemButton,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import {
  CROP_COLORS,
  CROP_TYPES,
  CropIndex,
  FieldProperties,
  INDEX_LABEL,
  cropLabel,
  cropOn,
  fieldLabel,
  formatDate,
} from '@/utils/crop';
import { useI18n } from '@/i18n';
import { agriGreen } from '@/theme/agriColors';

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'Roboto, sans-serif', fontSize: '0.8rem' },
  '& .MuiInputLabel-root': { fontSize: '0.8rem' },
};

const INDEX_HELP_AR: Record<CropIndex, React.ReactNode> = {
  ndvi: (
    <Box sx={{ p: 0.5, fontSize: '0.75rem', lineHeight: 1.7 }}>
      <strong>NDVI — مؤشر الفرق المعياري للغطاء النباتي</strong>
      <br />
      (NIR − Red) / (NIR + Red). تعكس النباتات الخضراء السليمة الأشعة تحت الحمراء القريبة وتمتص الضوء الأحمر، لذا يرتفع NDVI مع الغطاء
      النباتي الأخضر النشط.
      <br />
      <strong>0–0.2</strong> تربة جرداء · <strong>0.2–0.4</strong> نبات متناثر أو مجهد · <strong>&gt; 0.5</strong> محصول كثيف وسليم.
      يميل إلى التشبع فوق المظلات الكثيفة جدًا.
    </Box>
  ),
  evi: (
    <Box sx={{ p: 0.5, fontSize: '0.75rem', lineHeight: 1.7 }}>
      <strong>EVI — مؤشر الغطاء النباتي المحسّن</strong>
      <br />
      2.5 × (NIR − Red) / (NIR + 6·Red − 7.5·Blue + 1). يشبه NDVI، لكنه يستخدم النطاق الأزرق لتصحيح أثر الغبار والضباب ويخفف خلفية
      التربة الصحراوية الساطعة.
      <br />
      يبقى حساسًا فوق المحاصيل الكثيفة العالية الكتلة الحيوية حيث يستقر NDVI، فيميّز الحقول القوية بشكل أفضل. وعادة ما يكون أقل قليلًا من NDVI.
    </Box>
  ),
};

const INDEX_HELP: Record<CropIndex, React.ReactNode> = {
  ndvi: (
    <Box sx={{ p: 0.5, fontSize: '0.75rem', lineHeight: 1.5 }}>
      <strong>NDVI — Normalized Difference Vegetation Index</strong>
      <br />
      (NIR − Red) / (NIR + Red). Healthy green plants reflect near-infrared and absorb red light, so NDVI rises with
      green, actively growing vegetation.
      <br />
      <strong>0–0.2</strong> bare soil · <strong>0.2–0.4</strong> sparse or stressed · <strong>&gt; 0.5</strong> dense,
      healthy crop. Tends to saturate over very dense canopies.
    </Box>
  ),
  evi: (
    <Box sx={{ p: 0.5, fontSize: '0.75rem', lineHeight: 1.5 }}>
      <strong>EVI — Enhanced Vegetation Index</strong>
      <br />
      2.5 × (NIR − Red) / (NIR + 6·Red − 7.5·Blue + 1). Like NDVI, but uses the blue band to correct for haze and
      dampens the bright desert-soil background.
      <br />
      Stays sensitive over dense, high-biomass crops where NDVI levels off, so it separates vigorous fields better.
      Usually a little lower than NDVI.
    </Box>
  ),
};

// --- Sidebar filters -------------------------------------------------------------

interface CropFiltersProps {
  fields: FieldProperties[];
  dates: string[];
  dateIndex: number;
  onDateChange: (i: number) => void;
  onDateCommit: (i: number) => void;
  index: CropIndex;
  onIndexChange: (index: CropIndex) => void;
  showIndexLayer: boolean;
  onShowIndexLayerChange: (show: boolean) => void;
  cropFilter: string | null;
  onCropFilterChange: (crop: string | null) => void;
  selectedField: string | null;
  onFieldSelect: (id: string | null) => void;
  onReset: () => void;
}

export function CropFilters({
  fields,
  dates,
  dateIndex,
  onDateChange,
  onDateCommit,
  index,
  onIndexChange,
  showIndexLayer,
  onShowIndexLayerChange,
  cropFilter,
  onCropFilterChange,
  selectedField,
  onFieldSelect,
  onReset,
}: CropFiltersProps) {
  const options = fields.filter((f) => !cropFilter || f.crop === cropFilter);
  const selected = fields.find((f) => f.id === selectedField) ?? null;
  const presentCrops = CROP_TYPES.filter((c) => fields.some((f) => f.crop === c));
  const { isAr, tr } = useI18n();
  const date = (iso: string) => formatDate(iso, isAr);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
          {tr('Scene Date', 'تاريخ المشهد')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {date(dates[dateIndex])} · {tr(`scene ${dateIndex + 1} of ${dates.length}`, `المشهد ${dateIndex + 1} من ${dates.length}`)}
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            size="small"
            min={0}
            max={dates.length - 1}
            value={dateIndex}
            onChange={(_, v) => onDateChange(v as number)}
            onChangeCommitted={(_, v) => onDateCommit(v as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(i) => date(dates[i])}
            sx={{ color: agriGreen.DEFAULT }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }} color="text.secondary">
            {date(dates[0])}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }} color="text.secondary">
            {date(dates[dates.length - 1])}
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          fullWidth
          label={tr('Jump to date', 'الانتقال إلى تاريخ')}
          value={dateIndex}
          onChange={(e) => onDateCommit(Number(e.target.value))}
          SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
          sx={{ mt: 1, ...fieldSx }}
        >
          {dates.map((d, i) => (
            <MenuItem key={d} value={i} sx={{ fontSize: '0.8rem' }}>
              {date(d)}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          {tr('Index', 'المؤشر')}
        </Typography>
        <ToggleButtonGroup size="small" exclusive fullWidth value={index} onChange={(_, v) => v && onIndexChange(v)}>
          {(['ndvi', 'evi'] as CropIndex[]).map((i) => (
            <ToggleButton
              key={i}
              value={i}
              sx={{
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.75rem',
                '&.Mui-selected': { bgcolor: agriGreen.DEFAULT, color: 'white', '&:hover': { bgcolor: agriGreen.dark } },
              }}
            >
              {/* Tooltip wraps the label, not the button, so ToggleButtonGroup still controls selection. */}
              <Tooltip title={(isAr ? INDEX_HELP_AR : INDEX_HELP)[i]} arrow placement="right" enterDelay={200}>
                <Box component="span" sx={{ width: '100%' }}>
                  {INDEX_LABEL[i]}
                </Box>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Switch size="small" checked={showIndexLayer} onChange={(e) => onShowIndexLayerChange(e.target.checked)} />}
          label={<Typography variant="caption">{tr(`Show ${INDEX_LABEL[index]} imagery (off: per-field means)`, `عرض صور ${INDEX_LABEL[index]} (عند الإيقاف: متوسط كل حقل)`)}</Typography>}
          sx={{ mt: 0.5, ml: 0 }}
        />
      </Box>

      <FormControl size="small" fullWidth sx={fieldSx}>
        <InputLabel>{tr('Crop Type', 'نوع المحصول')}</InputLabel>
        <Select label={tr('Crop Type', 'نوع المحصول')} value={cropFilter ?? ''} onChange={(e) => onCropFilterChange(e.target.value || null)}>
          <MenuItem value="">{tr('All Crops', 'كل المحاصيل')}</MenuItem>
          {presentCrops.map((c) => (
            <MenuItem key={c} value={c}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CROP_COLORS[c], mr: 1 }} />
              {cropLabel(c, isAr)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Autocomplete
        size="small"
        options={options}
        value={selected}
        onChange={(_, v) => onFieldSelect(v?.id ?? null)}
        getOptionLabel={(f) => `${fieldLabel(f.name, isAr)} · ${cropLabel(f.crop, isAr)}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => <TextField {...params} label={tr(`Field (${options.length})`, `الحقل (${options.length})`)} sx={fieldSx} />}
      />

      <Button size="small" variant="outlined" onClick={onReset} sx={{ color: agriGreen.dark, borderColor: agriGreen.DEFAULT }}>
        {tr('Reset Filters', 'إعادة ضبط التصفية')}
      </Button>
    </Box>
  );
}

// --- Field info / classification panel ---------------------------------------------

interface FieldInfoPanelProps {
  field: FieldProperties | null;
  index: CropIndex;
  reading: { value: number; date: string } | null;
  anomalyNow: boolean;
  anomalyCount: number;
  onClear: () => void;
}

export function FieldInfoPanel({ field, index, reading, anomalyNow, anomalyCount, onClear }: FieldInfoPanelProps) {
  const { isAr, tr } = useI18n();
  if (!field) {
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
          {tr('Field Details', 'تفاصيل الحقل')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tr(`Click a field on the map, an alert, or pick one in the filters to see its crop classification and ${INDEX_LABEL[index]} history.`, `انقر حقلًا على الخريطة أو تنبيهًا، أو اختر حقلًا من عوامل التصفية لعرض تصنيف محصوله وسجل ${INDEX_LABEL[index]}.`)}
        </Typography>
      </Box>
    );
  }
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
          {fieldLabel(field.name, isAr)}
        </Typography>
        <Button size="small" startIcon={<CloseIcon fontSize="small" />} onClick={onClear} sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          {tr('Clear', 'مسح')}
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {field.type === 'pivot' ? tr('Centre pivot', 'ري محوري') : tr('Block field', 'حقل مستطيل')} · {field.area_ha.toLocaleString()} {tr('ha', 'هكتار')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={reading ? `${INDEX_LABEL[index]} ${reading.value.toFixed(2)}` : tr('No clear view', 'لا توجد رؤية صافية')}
          sx={{ fontWeight: 600, bgcolor: '#E8F5E9' }}
        />
        <Chip
          size="small"
          icon={anomalyNow ? <WarningAmberIcon /> : <CheckCircleOutlineIcon />}
          label={anomalyNow ? tr('Anomaly', 'شذوذ') : tr('Normal', 'طبيعي')}
          color={anomalyNow ? 'error' : 'success'}
          variant={anomalyNow ? 'filled' : 'outlined'}
        />
        <Chip size="small" label={tr(`${anomalyCount} anomalous dates`, `${anomalyCount} تاريخًا شاذًا`)} variant="outlined" />
      </Box>

      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1.5, mb: 0.5 }}>
        {tr('Crop classification by season', 'تصنيف المحصول حسب الموسم')}
      </Typography>
      {field.seasons.length ? (
        field.seasons.map((s) => (
          <Box key={s.season} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.4, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ width: 52, color: 'text.secondary' }}>
              {s.season}
            </Typography>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CROP_COLORS[s.crop] ?? '#BDBDBD' }} />
            <Typography variant="caption" sx={{ flex: 1 }}>
              {cropLabel(s.crop, isAr)}
            </Typography>
            <Box sx={{ width: 60, height: 6, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }} title={tr(`Confidence ${Math.round(s.confidence * 100)}%`, `الثقة ${Math.round(s.confidence * 100)}%`)}>
              <Box sx={{ width: `${s.confidence * 100}%`, height: '100%', bgcolor: agriGreen.DEFAULT }} />
            </Box>
            <Typography variant="caption" sx={{ width: 30, textAlign: 'right' }}>
              {Math.round(s.confidence * 100)}%
            </Typography>
          </Box>
        ))
      ) : (
        <Typography variant="caption" color="text.secondary">
          {tr('Not enough clear observations to classify.', 'لا توجد أرصاد صافية كافية للتصنيف.')}
        </Typography>
      )}
    </Box>
  );
}

// --- Anomaly alerts -----------------------------------------------------------------

interface AnomalyAlertsProps {
  alerts: { field: FieldProperties; value: number | null; date: string }[];
  title: string;
  selectedField: string | null;
  onSelect: (id: string) => void;
}

export function AnomalyAlerts({ alerts, title, selectedField, onSelect }: AnomalyAlertsProps) {
  const { isAr, tr } = useI18n();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <WarningAmberIcon sx={{ fontSize: 18, color: alerts.length ? '#D50000' : 'text.disabled' }} />
        <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif' }}>
          {title} ({alerts.length})
        </Typography>
      </Box>
      {alerts.length ? (
        <List dense disablePadding sx={{ overflowY: 'auto', minHeight: 0 }}>
          {alerts.map(({ field, value, date }) => (
            <ListItemButton
              key={field.id}
              selected={field.id === selectedField}
              onClick={() => onSelect(field.id)}
              sx={{ borderLeft: '3px solid #D50000', mb: 0.5, borderRadius: 0.5, py: 0.25 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                  {fieldLabel(field.name, isAr)} · {cropLabel(cropOn(field, date)?.crop ?? field.crop, isAr)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tr(`NDVI ${value?.toFixed(2) ?? '—'} on ${formatDate(date)} — below seasonal mean − 2σ`, `NDVI ${value?.toFixed(2) ?? '—'} في ${formatDate(date, true)} — أقل من المتوسط الموسمي − 2σ`)}
                </Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {tr('No fields below their seasonal NDVI range.', 'لا توجد حقول أقل من نطاق NDVI الموسمي لها.')}
        </Typography>
      )}
    </Box>
  );
}
