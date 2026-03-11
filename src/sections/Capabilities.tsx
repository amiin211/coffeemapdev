'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import CapabilityCard from '@/components/CapabilityCard';
import { capabilities } from '@/data/capabilities';

const Capabilities = () => {
  return (
    <Box
      id="capabilities"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'Fira Code, monospace',
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'primary.main',
              mb: 2,
            }}
          >
            What We Do
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
            End-to-end geospatial solutions spanning data collection, analysis, and visualization
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {capabilities.map((capability) => (
            <Grid item xs={12} sm={6} md={3} key={capability.id}>
              <CapabilityCard capability={capability} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Capabilities;
