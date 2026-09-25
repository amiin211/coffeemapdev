'use client';

import { useEffect, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Slider, Typography } from '@mui/material';
import { AcledFilters as Filters, formatMonth } from '@/utils/acled';
import { unBlue } from '@/theme/unColors';

interface AcledFiltersProps {
  filters: Filters;
  months: string[];
  stateOptions: string[];
  localityOptions: string[];
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'Roboto, sans-serif', fontSize: '0.8rem' },
  '& .MuiInputLabel-root': { fontSize: '0.8rem' },
};

export default function AcledFilters({ filters, months, stateOptions, localityOptions, onChange, onReset }: AcledFiltersProps) {
  // The slider tracks its thumbs locally and only commits on release, so
  // dragging doesn't re-aggregate the whole dashboard on every pixel.
  const [range, setRange] = useState(filters.monthRange);
  useEffect(() => setRange(filters.monthRange), [filters.monthRange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
          Time Range
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {range[0] === range[1] ? formatMonth(months[range[0]]) : `${formatMonth(months[range[0]])} – ${formatMonth(months[range[1]])}`}
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            size="small"
            min={0}
            max={months.length - 1}
            value={range}
            onChange={(_, v) => setRange(v as [number, number])}
            onChangeCommitted={(_, v) => onChange({ monthRange: v as [number, number] })}
            valueLabelDisplay="auto"
            valueLabelFormat={(i) => formatMonth(months[i])}
            sx={{ color: unBlue.DEFAULT }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }} color="text.secondary">
            {formatMonth(months[0])}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }} color="text.secondary">
            {formatMonth(months[months.length - 1])}
          </Typography>
        </Box>
      </Box>

      <FormControl size="small" fullWidth sx={fieldSx}>
        <InputLabel>State (Admin 1)</InputLabel>
        <Select
          label="State (Admin 1)"
          value={filters.state ?? ''}
          onChange={(e) => onChange({ state: e.target.value || null, locality: null })}
        >
          <MenuItem value="">All States</MenuItem>
          {stateOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth sx={fieldSx} disabled={!filters.state}>
        <InputLabel>Locality (Admin 2)</InputLabel>
        <Select
          label="Locality (Admin 2)"
          value={filters.locality ?? ''}
          onChange={(e) => onChange({ locality: e.target.value || null })}
          MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
        >
          <MenuItem value="">All Localities</MenuItem>
          {localityOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!filters.state && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
          Select a state to filter by locality.
        </Typography>
      )}

      <Button size="small" variant="outlined" onClick={onReset} sx={{ color: unBlue.dark, borderColor: unBlue.DEFAULT }}>
        Reset Filters
      </Button>
    </Box>
  );
}
