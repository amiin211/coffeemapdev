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
  cropOn,
  formatDate,
} from '@/utils/crop';
import { agriGreen } from '@/theme/agriColors';

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'Roboto, sans-serif', fontSize: '0.8rem' },
  '& .MuiInputLabel-root': { fontSize: '0.8rem' },
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
          Scene Date
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDate(dates[dateIndex])} · scene {dateIndex + 1} of {dates.length}
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
            valueLabelFormat={(i) => formatDate(dates[i])}
            sx={{ color: agriGreen.DEFAULT }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }} color="text.secondary">
            {formatDate(dates[0])}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }} color="text.secondary">
            {formatDate(dates[dates.length - 1])}
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          fullWidth
          label="Jump to date"
          value={dateIndex}
          onChange={(e) => onDateCommit(Number(e.target.value))}
          SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
          sx={{ mt: 1, ...fieldSx }}
        >
          {dates.map((d, i) => (
            <MenuItem key={d} value={i} sx={{ fontSize: '0.8rem' }}>
              {formatDate(d)}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          Index
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
              <Tooltip title={INDEX_HELP[i]} arrow placement="right" enterDelay={200}>
                <Box component="span" sx={{ width: '100%' }}>
                  {INDEX_LABEL[i]}
                </Box>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Switch size="small" checked={showIndexLayer} onChange={(e) => onShowIndexLayerChange(e.target.checked)} />}
          label={<Typography variant="caption">Show {INDEX_LABEL[index]} imagery (off: per-field means)</Typography>}
          sx={{ mt: 0.5, ml: 0 }}
        />
      </Box>

      <FormControl size="small" fullWidth sx={fieldSx}>
        <InputLabel>Crop Type</InputLabel>
        <Select label="Crop Type" value={cropFilter ?? ''} onChange={(e) => onCropFilterChange(e.target.value || null)}>
          <MenuItem value="">All Crops</MenuItem>
          {presentCrops.map((c) => (
            <MenuItem key={c} value={c}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CROP_COLORS[c], mr: 1 }} />
              {c}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Autocomplete
        size="small"
        options={options}
        value={selected}
        onChange={(_, v) => onFieldSelect(v?.id ?? null)}
        getOptionLabel={(f) => `${f.name} · ${f.crop}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => <TextField {...params} label={`Field (${options.length})`} sx={fieldSx} />}
      />

      <Button size="small" variant="outlined" onClick={onReset} sx={{ color: agriGreen.dark, borderColor: agriGreen.DEFAULT }}>
        Reset Filters
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
  if (!field) {
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
          Field Details
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click a field on the map, an alert, or pick one in the filters to see its crop classification and {INDEX_LABEL[index]} history.
        </Typography>
      </Box>
    );
  }
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700 }}>
          {field.name}
        </Typography>
        <Button size="small" startIcon={<CloseIcon fontSize="small" />} onClick={onClear} sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          Clear
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {field.type === 'pivot' ? 'Centre pivot' : 'Block field'} · {field.area_ha.toLocaleString()} ha
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={reading ? `${INDEX_LABEL[index]} ${reading.value.toFixed(2)}` : 'No clear view'}
          sx={{ fontWeight: 600, bgcolor: '#E8F5E9' }}
        />
        <Chip
          size="small"
          icon={anomalyNow ? <WarningAmberIcon /> : <CheckCircleOutlineIcon />}
          label={anomalyNow ? 'Anomaly' : 'Normal'}
          color={anomalyNow ? 'error' : 'success'}
          variant={anomalyNow ? 'filled' : 'outlined'}
        />
        <Chip size="small" label={`${anomalyCount} anomalous dates`} variant="outlined" />
      </Box>

      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1.5, mb: 0.5 }}>
        Crop classification by season
      </Typography>
      {field.seasons.length ? (
        field.seasons.map((s) => (
          <Box key={s.season} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.4, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ width: 52, color: 'text.secondary' }}>
              {s.season}
            </Typography>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CROP_COLORS[s.crop] ?? '#BDBDBD' }} />
            <Typography variant="caption" sx={{ flex: 1 }}>
              {s.crop}
            </Typography>
            <Box sx={{ width: 60, height: 6, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }} title={`Confidence ${Math.round(s.confidence * 100)}%`}>
              <Box sx={{ width: `${s.confidence * 100}%`, height: '100%', bgcolor: agriGreen.DEFAULT }} />
            </Box>
            <Typography variant="caption" sx={{ width: 30, textAlign: 'right' }}>
              {Math.round(s.confidence * 100)}%
            </Typography>
          </Box>
        ))
      ) : (
        <Typography variant="caption" color="text.secondary">
          Not enough clear observations to classify.
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
                  {field.name} · {cropOn(field, date)?.crop ?? field.crop}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  NDVI {value?.toFixed(2) ?? '—'} on {formatDate(date)} — below seasonal mean − 2σ
                </Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Typography variant="caption" color="text.secondary">
          No fields below their seasonal NDVI range.
        </Typography>
      )}
    </Box>
  );
}
