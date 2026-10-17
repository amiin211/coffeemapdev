'use client';

import { Box, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useI18n } from '@/i18n';
import { DEPTH_CLASSES, depthClass } from '@/lib/floodTwin/config';
import type { BuildingProps } from '@/lib/floodTwin/data';

export default function BuildingPanel({ building, waterLevel, onClose }: { building: BuildingProps; waterLevel: number; onClose: () => void }) {
  const { tr, isAr } = useI18n();
  const m = tr('m', 'م');
  const depth = waterLevel - building.base_elev_m;
  const cls = DEPTH_CLASSES[depthClass(depth)];
  const rows: [string, string][] = [
    [tr('Height', 'الارتفاع'), `${building.height_m.toFixed(1)} ${m}`],
    [tr('Ground elevation', 'منسوب الأرض'), `${building.base_elev_m.toFixed(2)} ${m}`],
    [tr('Water level', 'منسوب المياه'), `${waterLevel.toFixed(2)} ${m}`],
    [tr('Water depth', 'عمق المياه'), depth > 0 ? `${depth.toFixed(2)} ${m}` : tr('Dry', 'جاف')],
  ];
  if (building.people !== undefined) rows.push([tr('Est. residents', 'السكان (تقديري)'), String(building.people)]);

  return (
    <Paper elevation={6} sx={{ position: 'absolute', top: 12, insetInlineEnd: 12, width: 250, p: 1.5, zIndex: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {tr('Building', 'مبنى')} #{building.id}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label={tr('Close', 'إغلاق')}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: cls.color }} />
        <Typography variant="caption">{isAr ? cls.labelAr : cls.label}</Typography>
      </Box>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td': { py: 0.3, fontSize: '0.8rem' } }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ color: '#666' }}>{k}</td>
              <td style={{ fontWeight: 600, textAlign: isAr ? 'left' : 'right' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Paper>
  );
}
