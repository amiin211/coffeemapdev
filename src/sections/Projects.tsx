'use client';

import { Box, Container, Typography, Grid } from '@mui/material';
import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/data/projects';
import { filterProjectsByCategory } from '@/utils/filters';

interface ProjectsProps {
  selectedCategory?: string | null;
}

const Projects = ({ selectedCategory = null }: ProjectsProps) => {
  const filteredProjects = filterProjectsByCategory(projects, selectedCategory);

  return (
    <Box
      id="projects"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: 'background.default',
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
            Featured Projects
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
            Explore our portfolio of geospatial engineering solutions across humanitarian and infrastructure domains
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
              No projects found for the selected category.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Projects;
