'use client';

import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import { Project } from '@/data/projects';
import TechBadge from './TechBadge';
import { getCategoryLabel } from '@/utils/filters';
import Link from 'next/link';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const isExternal = project.externalUrl?.startsWith('http');

  // The whole card is the link (when there is one); the "View Demo" button
  // below is just a visual cue inside it, since links can't be nested.
  const linkProps = project.externalUrl
    ? isExternal
      ? { component: 'a' as const, href: project.externalUrl, target: '_blank', rel: 'noopener noreferrer' }
      : { component: Link, href: project.externalUrl }
    : {};

  return (
    <Card
      {...linkProps}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        ...(project.externalUrl && {
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
          '&:hover .view-demo': { backgroundColor: 'rgba(74, 55, 40, 0.08)', borderColor: 'primary.dark' },
        }),
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
            fontFamily: 'Roboto, sans-serif',
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
            fontFamily: 'Roboto, sans-serif',
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
          component="span"
          className="view-demo"
          variant="outlined"
          size="small"
          sx={{
            alignSelf: 'flex-start',
            borderColor: 'primary.main',
            color: 'primary.main',
            fontFamily: 'Roboto, sans-serif',
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
