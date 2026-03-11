'use client';

import { useState, useEffect, Suspense } from 'react';
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

const categoryLabels: Record<string, string> = {
  'enterprise-gis': 'Enterprise GIS',
  'web-mapping': 'Web Mapping',
  'geoai': 'GeoAI & Remote Sensing',
  'gis-bim': 'BIM & Infrastructure',
};

function FilterContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const tech = searchParams.get('tech');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(category);
  const [selectedTech, setSelectedTech] = useState<string | null>(tech);

  useEffect(() => {
    setSelectedCategory(category);
  }, [category]);

  useEffect(() => {
    setSelectedTech(tech);
  }, [tech]);

  const filteredProjects = projects.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedTech && !p.tags.includes(selectedTech)) return true;
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
          <Link href="/" passHref>
            <Button
              startIcon={<ArrowBackIcon />}
              sx={{
                fontFamily: 'Fira Code, monospace',
                color: 'text.secondary',
                mb: 2,
              }}
            >
              Back to Home
            </Button>
          </Link>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontFamily: 'Fira Code, monospace',
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'primary.main',
              mb: 2,
            }}
          >
            {selectedCategory 
              ? categoryLabels[selectedCategory] 
              : selectedTech 
                ? `Projects using ${selectedTech}`
                : 'All Projects'
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
              {selectedCap.description}
            </Typography>
          )}
          {selectedTechCategory && (
            <Chip
              label={selectedTechCategory.name}
              sx={{
                backgroundColor: 'secondary.light',
                color: 'white',
                fontFamily: 'Fira Code, monospace',
              }}
            />
          )}
        </Box>

        {filteredProjects.length > 0 ? (
          <Box sx={{ mb: 8 }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Fira Code, monospace',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'primary.main',
                mb: 3,
              }}
            >
              Projects ({filteredProjects.length})
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
              No projects found for this filter.
            </Typography>
          </Box>
        )}

        {filteredInsights.length > 0 && (
          <Box>
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Fira Code, monospace',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'primary.main',
                mb: 3,
              }}
            >
              Insights ({filteredInsights.length})
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
    <Suspense fallback={<Box sx={{ pt: 12, textAlign: 'center' }}>Loading...</Box>}>
      <FilterContent />
    </Suspense>
  );
}
