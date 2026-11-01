'use client';

import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { AcledFilters as Filters } from '@/utils/acled';
import { unBlue } from '@/theme/unColors';
import { useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';

interface AcledFiltersProps {
  filters: Filters;
  stateOptions: string[];
  localityOptions: string[];
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'Roboto, sans-serif', fontSize: '0.8rem' },
  '& .MuiInputLabel-root': { fontSize: '0.8rem' },
};

export default function AcledFilters({ filters, stateOptions, localityOptions, onChange, onReset }: AcledFiltersProps) {
  const { isAr, tr } = useI18n();
  const names = useSudanNames(isAr);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl size="small" fullWidth sx={fieldSx}>
        <InputLabel>{tr('State (Admin 1)', 'الولاية (المستوى الإداري 1)')}</InputLabel>
        <Select
          label={tr('State (Admin 1)', 'الولاية (المستوى الإداري 1)')}
          value={filters.state ?? ''}
          onChange={(e) => onChange({ state: e.target.value || null, locality: null })}
        >
          <MenuItem value="">{tr('All States', 'كل الولايات')}</MenuItem>
          {stateOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {names.state(name)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth sx={fieldSx} disabled={!filters.state}>
        <InputLabel>{tr('Locality (Admin 2)', 'المحلية (المستوى الإداري 2)')}</InputLabel>
        <Select
          label={tr('Locality (Admin 2)', 'المحلية (المستوى الإداري 2)')}
          value={filters.locality ?? ''}
          onChange={(e) => onChange({ locality: e.target.value || null })}
          MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
        >
          <MenuItem value="">{tr('All Localities', 'كل المحليات')}</MenuItem>
          {localityOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {names.locality(name)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!filters.state && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
          {tr('Select a state to filter by locality.', 'اختر ولاية للتصفية حسب المحلية.')}
        </Typography>
      )}

      <Button size="small" variant="outlined" onClick={onReset} sx={{ color: unBlue.dark, borderColor: unBlue.DEFAULT }}>
        {tr('Reset All', 'إعادة ضبط الكل')}
      </Button>
    </Box>
  );
}
