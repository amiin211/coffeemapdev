'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import CapabilityCard from '@/components/CapabilityCard';
import { capabilities } from '@/data/capabilities';
import { useI18n } from '@/i18n';

// One card per service; each links to its page with the projects that prove it.
const shownCapabilities = capabilities;

const Capabilities = () => {
  const { tr } = useI18n();
  return (
    <Box
      id="capabilities"
      sx={{
        py: { xs: 5, md: 7 },
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'Roboto, sans-serif',
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'primary.main',
              mb: 2,
            }}
          >
            {tr('Services', 'الخدمات')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontSize: '1rem',
              lineHeight: 1.7,
            }}
          >
            {tr('What I can do for your team, from field survey and data quality to satellite analytics and dashboards. Each service links to live projects that show it.', 'ما أستطيع تقديمه لفريقك، من المسح الميداني وجودة البيانات إلى تحليلات الأقمار الصناعية واللوحات التفاعلية. ولكل خدمة مشاريع حية تثبتها.')}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {shownCapabilities.map((capability) => (
            <Grid item xs={12} sm={6} md={4} key={capability.id}>
              <CapabilityCard capability={capability} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Capabilities;
