'use client';

import { Card, CardContent, Box, Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import PublicIcon from '@mui/icons-material/Public';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import { Capability } from '@/data/capabilities';
import Link from 'next/link';

interface CapabilityCardProps {
  capability: Capability;
  isActive?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  Map: <MapIcon sx={{ fontSize: 48 }} />,
  Public: <PublicIcon sx={{ fontSize: 48 }} />,
  Analytics: <AnalyticsIcon sx={{ fontSize: 48 }} />,
  Architecture: <ArchitectureIcon sx={{ fontSize: 48 }} />,
};

const CapabilityCard = ({ capability, isActive }: CapabilityCardProps) => {
  return (
    <Card
      component={Link}
      href={`/expertise/${capability.category}`}
      sx={{
        cursor: 'pointer',
        height: '100%',
        backgroundColor: isActive ? 'primary.main' : 'background.paper',
        color: isActive ? 'primary.contrastText' : 'text.primary',
        border: isActive ? 'none' : '1px solid',
        borderColor: 'divider',
        textDecoration: 'none',
        '&:hover': {
          backgroundColor: isActive ? 'primary.dark' : 'rgba(74, 55, 40, 0.04)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            color: isActive ? 'accent.main' : 'secondary.main',
            mb: 2,
          }}
        >
          {iconMap[capability.icon]}
        </Box>
        <Typography
          variant="h6"
          sx={{
            mb: 1,
            fontFamily: 'Fira Code, monospace',
            fontWeight: 600,
          }}
        >
          {capability.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: isActive ? 'rgba(255,255,255,0.85)' : 'text.secondary',
            lineHeight: 1.6,
          }}
        >
          {capability.description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default CapabilityCard;
