'use client';

import { Chip } from '@mui/material';

interface TechBadgeProps {
  technology: string;
}

const TechBadge = ({ technology }: TechBadgeProps) => {
  return (
    <Chip
      label={technology}
      size="small"
      sx={{
        backgroundColor: 'rgba(45, 90, 61, 0.1)',
        color: 'secondary.dark',
        fontFamily: 'Fira Code, monospace',
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
