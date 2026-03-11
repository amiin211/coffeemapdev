'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import InsightCard from '@/components/InsightCard';
import { insights } from '@/data/insights';
import { filterInsightsByCategory } from '@/utils/filters';

interface InsightsProps {
  selectedCategory?: string | null;
}

const Insights = ({ selectedCategory = null }: InsightsProps) => {
  const filteredInsights = filterInsightsByCategory(insights, selectedCategory);

  return (
    <Box
      id="insights"
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
            Latest Insights
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
            Technical deep dives and best practices from our geospatial engineering experience
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {filteredInsights.map((insight) => (
            <Grid item xs={12} sm={6} md={3} key={insight.id}>
              <InsightCard insight={insight} />
            </Grid>
          ))}
        </Grid>

        {filteredInsights.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No insights found for the selected category.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Insights;
