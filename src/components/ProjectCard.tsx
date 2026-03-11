'use client';

import {
  Card,
  CardContent,
  CardMedia,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import { Project } from '@/data/projects';
import TechBadge from './TechBadge';
import { getCategoryLabel } from '@/utils/filters';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          height: 180,
          backgroundColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={project.image}
          alt={project.title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.8,
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <Chip
          label={getCategoryLabel(project.category)}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: 'primary.main',
            fontFamily: 'Fira Code, monospace',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}
        />
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 1,
            fontFamily: 'Fira Code, monospace',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          {project.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 2,
            flexGrow: 1,
            lineHeight: 1.6,
          }}
        >
          {project.description}
        </Typography>

        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          {project.tags.map((tag) => (
            <TechBadge key={tag} technology={tag} />
          ))}
        </Stack>

        <Button
          variant="outlined"
          size="small"
          sx={{
            alignSelf: 'flex-start',
            borderColor: 'primary.main',
            color: 'primary.main',
            fontFamily: 'Fira Code, monospace',
            fontSize: '0.75rem',
            '&:hover': {
              backgroundColor: 'rgba(74, 55, 40, 0.08)',
              borderColor: 'primary.dark',
            },
          }}
        >
          View Demo
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
