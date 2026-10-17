'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Container, Typography, Grid, Button, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ProjectCard from '@/components/ProjectCard';
import InsightCard from '@/components/InsightCard';
import { projects } from '@/data/projects';
import { insights } from '@/data/insights';
import { capabilities } from '@/data/capabilities';
import { techCategories } from '@/data/techStack';
import Link from 'next/link';
import { useI18n } from '@/i18n';


function FilterContent() {
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('category');
  const selectedTech = searchParams.get('tech');
  const { isAr, tr, href } = useI18n();

  const filteredProjects = projects.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedTech && !p.tags.includes(selectedTech)) return false;
    return true;
  });

  const filteredInsights = insights.filter((i) => {
    if (selectedCategory && i.category !== selectedCategory) return false;
    return true;
  });

  const selectedCap = capabilities.find((c) => c.category === selectedCategory);
  const selectedTechCategory = techCategories.find((tc) => 
    tc.technologies.includes(selectedTech || '')
  );

  return (
    <Box sx={{ pt: 12, pb: 8, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Button
            component={Link}
            href={href('/')}
            startIcon={<ArrowBackIcon sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} />}
            sx={{
              fontFamily: 'Roboto, sans-serif',
              color: 'text.secondary',
              mb: 2,
            }}
          >
            {tr('Back to Home', 'العودة إلى الرئيسية')}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontFamily: 'Roboto, sans-serif',
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'primary.main',
              mb: 2,
            }}
          >
            {selectedCap
              ? (isAr ? selectedCap.titleAr : selectedCap.title)
              : selectedTech
                ? tr(`Projects using ${selectedTech}`, `مشاريع تستخدم ${selectedTech}`)
                : tr('All Projects', 'كل المشاريع')
            }
          </Typography>
          {selectedCap && (
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 600,
                mx: 'auto',
                mb: 2,
              }}
            >
              {isAr ? selectedCap.descriptionAr : selectedCap.description}
            </Typography>
          )}
          {selectedTechCategory && (
            <Chip
              label={isAr ? selectedTechCategory.nameAr : selectedTechCategory.name}
              sx={{
                backgroundColor: 'secondary.light',
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
              }}
            />
          )}
        </Box>

        {filteredProjects.length > 0 ? (
          <Box sx={{ mb: 8 }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'primary.main',
                mb: 3,
              }}
            >
              {tr('Projects', 'المشاريع')} ({filteredProjects.length})
            </Typography>
            <Grid container spacing={3}>
              {filteredProjects.map((project) => (
                <Grid item xs={12} sm={6} md={4} key={project.id}>
                  <ProjectCard project={project} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {tr('No projects found for this filter.', 'لا توجد مشاريع مطابقة لهذه التصفية.')}
            </Typography>
          </Box>
        )}

        {filteredInsights.length > 0 && (
          <Box>
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'primary.main',
                mb: 3,
              }}
            >
              {tr('Insights', 'المقالات')} ({filteredInsights.length})
            </Typography>
            <Grid container spacing={3}>
              {filteredInsights.map((insight) => (
                <Grid item xs={12} sm={6} md={3} key={insight.id}>
                  <InsightCard insight={insight} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default function FilterPage() {
  return (
    <Suspense fallback={<Box sx={{ pt: 12, textAlign: 'center' }}>…</Box>}>
      <FilterContent />
    </Suspense>
  );
}
