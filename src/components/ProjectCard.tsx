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
import { useI18n } from '@/i18n';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const { locale, isAr, tr, href } = useI18n();
  const title = isAr ? project.titleAr : project.title;
  // The whole card is the link; the "View Demo" button below is just a
  // visual cue inside it, since links can't be nested.
  const linkProps = project.externalUrl.startsWith('http')
    ? { component: 'a' as const, href: project.externalUrl, target: '_blank', rel: 'noopener noreferrer' }
    : { component: Link, href: href(project.externalUrl) };

  return (
    <Card
      {...linkProps}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
        '&:hover .view-demo': { backgroundColor: 'rgba(74, 55, 40, 0.08)', borderColor: 'primary.dark' },
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
          alt={title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.8,
          }}
        />
        <Chip
          label={(isAr ? project.categoryLabelAr : project.categoryLabel) ?? getCategoryLabel(project.category, locale)}
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
          {title}
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
          {isAr ? project.descriptionAr : project.description}
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
          {tr('View Demo', 'عرض المشروع')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
