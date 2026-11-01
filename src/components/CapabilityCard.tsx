'use client';

import { Card, CardContent, Box, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Capability } from '@/data/capabilities';
import ServiceIcon from '@/components/ServiceIcon';
import Link from 'next/link';
import { useI18n } from '@/i18n';

interface CapabilityCardProps {
  capability: Capability;
  isActive?: boolean;
}

const CapabilityCard = ({ capability, isActive }: CapabilityCardProps) => {
  const { isAr, tr, href } = useI18n();
  return (
    <Card
      component={Link}
      href={href(`/expertise/${capability.category}`)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
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
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            color: isActive ? 'accent.main' : 'secondary.main',
            mb: 2,
          }}
        >
          <ServiceIcon name={capability.icon} />
        </Box>
        <Typography
          variant="h6"
          sx={{
            mb: 1,
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 600,
          }}
        >
          {isAr ? capability.titleAr : capability.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: isActive ? 'rgba(255,255,255,0.85)' : 'text.secondary',
            lineHeight: 1.6,
          }}
        >
          {isAr ? capability.descriptionAr : capability.description}
        </Typography>
        <Box sx={{ mt: 'auto', pt: 2, display: 'flex', alignItems: 'center', gap: 0.5, color: isActive ? 'accent.main' : 'secondary.main', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Roboto, sans-serif' }}>
          {tr(`What I deliver · ${capability.projectIds.length} project${capability.projectIds.length === 1 ? '' : 's'}`, `ما أقدّمه · ${capability.projectIds.length} ${capability.projectIds.length === 1 ? 'مشروع' : capability.projectIds.length === 2 ? 'مشروعان' : 'مشاريع'}`)}
          <ArrowForwardIcon sx={{ fontSize: 16, transform: isAr ? 'scaleX(-1)' : undefined }} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default CapabilityCard;
