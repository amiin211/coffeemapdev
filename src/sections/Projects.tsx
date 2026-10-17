'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/data/projects';
import { filterProjectsByCategory } from '@/utils/filters';
import { useI18n } from '@/i18n';

interface ProjectsProps {
  selectedCategory?: string | null;
}

const Projects = ({ selectedCategory = null }: ProjectsProps) => {
  const filteredProjects = filterProjectsByCategory(projects, selectedCategory);
  const { tr } = useI18n();

  return (
    <Box
      id="projects"
      sx={{
        py: { xs: 5, md: 7 },
        backgroundColor: 'background.default',
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
            {tr('Featured Projects', 'مشاريع مختارة')}
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
            {tr('Explore our portfolio of geospatial engineering solutions across humanitarian and infrastructure domains', 'استكشف أعمالنا في الهندسة الجيومكانية عبر المجالين الإنساني والبنية التحتية')}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <ProjectCard project={project} />
            </Grid>
          ))}
        </Grid>

        {filteredProjects.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {tr('No projects found for the selected category.', 'لا توجد مشاريع في هذه الفئة.')}
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Projects;
