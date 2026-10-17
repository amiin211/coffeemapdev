'use client';

import { Box, Paper, Typography } from '@mui/material';
import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/floodTwin/overlay';
import type { SceneState } from '@/lib/floodTwin/timeline';
import { water } from '@/theme/waterColors';

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Paper elevation={2} sx={{ p: 1.25, height: 64, flex: '1 1 150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 500, lineHeight: 1.1 }}>
        {label}
      </Typography>
      <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', color, lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function FloodTwinStats({ state, total }: { state: SceneState | null; total: { buildings: number; people: number } }) {
  const { tr, isAr } = useI18n();
  const n = (v: number, digits = 0) => v.toLocaleString(isAr ? 'ar-u-nu-latn' : 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const m = tr('m', 'م');
  return (
    <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
      <StatTile label={tr('Date', 'التاريخ')} value={state ? formatDate(state.date, isAr ? 'ar' : 'en') : '–'} color={water.dark} />
      <StatTile label={tr('Water level', 'منسوب المياه')} value={state ? `${n(state.waterLevel, 2)} ${m}` : '–'} color={water.DEFAULT} />
      <StatTile label={tr('Rainfall', 'الأمطار')} value={state ? `${n(state.rainfall)} ${tr('mm/day', 'مم/يوم')}` : '–'} color="#455a64" />
      <StatTile
        label={tr('Buildings affected', 'المباني المتأثرة')}
        value={state ? `${n(state.buildingsAffected)} / ${n(total.buildings)}` : '–'}
        color="#e65100"
      />
      <StatTile label={tr('Est. people affected', 'السكان المتأثرون (تقديري)')} value={state ? n(state.peopleAffected) : '–'} color="#c62828" />
    </Box>
  );
}
