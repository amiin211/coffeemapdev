'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import InsightCard from '@/components/InsightCard';
import { insights } from '@/data/insights';
import { filterInsightsByCategory } from '@/utils/filters';
import { useI18n } from '@/i18n';

interface InsightsProps {
  selectedCategory?: string | null;
}

const Insights = ({ selectedCategory = null }: InsightsProps) => {
  const filteredInsights = filterInsightsByCategory(insights, selectedCategory);
  const { tr } = useI18n();

  return (
    <Box
      id="insights"
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
            {tr('Latest Insights', 'أحدث المقالات')}
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
            {tr('Technical deep dives and best practices from our geospatial engineering experience', 'شروحات تقنية معمّقة وأفضل الممارسات من خبرتنا في الهندسة الجيومكانية')}
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
              {tr('No insights found for the selected category.', 'لا توجد مقالات في هذه الفئة.')}
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Insights;
