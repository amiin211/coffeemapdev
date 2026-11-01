'use client';

import { Chip } from '@mui/material';
import { useI18n } from '@/i18n';

// Product and library names stay as they are; descriptive tags are translated.
const TAGS_AR: Record<string, string> = {
  'Architecture': 'معمارية',
  'Serverless GeoAI': 'ذكاء جيومكاني بلا خوادم',
  'Static hosting': 'استضافة ثابتة',
  'Data Quality': 'جودة البيانات',
  'Knowledge Management': 'إدارة المعرفة',
  'OCHA Data': 'بيانات أوتشا',
  'OCHA 3W Data': 'بيانات 3W من أوتشا',
  'ACLED Data': 'بيانات ACLED',
};

interface TechBadgeProps {
  technology: string;
}

const TechBadge = ({ technology }: TechBadgeProps) => {
  const { isAr } = useI18n();
  return (
    <Chip
      label={(isAr && TAGS_AR[technology]) || technology}
      size="small"
      sx={{
        backgroundColor: 'rgba(45, 90, 61, 0.1)',
        color: 'secondary.dark',
        fontFamily: 'Roboto, sans-serif',
        fontSize: '0.7rem',
        fontWeight: 500,
        height: 24,
        '& .MuiChip-label': {
          px: 1.5,
        },
      }}
    />
  );
};

export default TechBadge;
