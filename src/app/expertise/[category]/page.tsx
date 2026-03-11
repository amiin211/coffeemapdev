'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import PublicIcon from '@mui/icons-material/Public';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppLayout from '@/components/AppLayout';
import ProjectCard from '@/components/ProjectCard';
import InsightCard from '@/components/InsightCard';
import { capabilities } from '@/data/capabilities';
import { projects } from '@/data/projects';
import { insights } from '@/data/insights';
import Link from 'next/link';

const iconMap: Record<string, React.ReactNode> = {
  Map: <MapIcon sx={{ fontSize: 64 }} />,
  Public: <PublicIcon sx={{ fontSize: 64 }} />,
  Analytics: <AnalyticsIcon sx={{ fontSize: 64 }} />,
  Architecture: <ArchitectureIcon sx={{ fontSize: 64 }} />,
};

interface ExpertisePageProps {
  params: {
    category: string;
  };
}

export default function ExpertisePage({ params }: ExpertisePageProps) {
  const capability = capabilities.find((cap) => cap.category === params.category);
  const filteredProjects = projects.filter((proj) => proj.category === params.category);
  const filteredInsights = insights.filter((insight) => insight.category === params.category);

  if (!capability) {
    return (
      <AppLayout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography>Category not found</Typography>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Link href="/" passHref legacyBehavior>
              <Box
                component="a"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'primary.main',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                <ArrowBackIcon fontSize="small" />
                Back to Home
              </Box>
            </Link>
          </Box>

          <Box
            sx={{
              p: 4,
              mb: 6,
              backgroundColor: 'background.paper',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ color: 'secondary.main' }}>
                {iconMap[capability.icon]}
              </Box>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: 'Fira Code, monospace',
                  fontWeight: 700,
                  color: 'primary.main',
                }}
              >
                {capability.title}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: '1.1rem',
                lineHeight: 1.8,
                mb: 3,
              }}
            >
              {capability.description}
            </Typography>
            <Grid container spacing={1}>
              {capability.technologies.map((tech) => (
                <Grid item key={tech}>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.5,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderRadius: 1,
                      fontFamily: 'Fira Code, monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    {tech}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {filteredProjects.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'Fira Code, monospace',
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                }}
              >
                Projects
              </Typography>
              <Grid container spacing={3}>
                {filteredProjects.map((project) => (
                  <Grid item xs={12} sm={6} md={4} key={project.id}>
                    <ProjectCard project={project} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {filteredInsights.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'Fira Code, monospace',
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                }}
              >
                Insights
              </Typography>
              <Grid container spacing={3}>
                {filteredInsights.map((insight) => (
                  <Grid item xs={12} sm={6} md={4} key={insight.id}>
                    <InsightCard insight={insight} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {filteredProjects.length === 0 && filteredInsights.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No projects or insights available for this category yet.
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </AppLayout>
  );
}
