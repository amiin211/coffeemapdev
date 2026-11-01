'use client';

// One service page: what I deliver, who it is for, the tools, and the
// projects and articles that prove it (src/data/capabilities.ts).

import { Box, Container, Typography, Grid, Button, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AppLayout from '@/components/AppLayout';
import ProjectCard from '@/components/ProjectCard';
import InsightCard from '@/components/InsightCard';
import CapabilityCard from '@/components/CapabilityCard';
import ServiceIcon from '@/components/ServiceIcon';
import { capabilities } from '@/data/capabilities';
import { projects } from '@/data/projects';
import { insights } from '@/data/insights';
import Link from 'next/link';
import { useI18n } from '@/i18n';

const panelSx = {
  p: { xs: 3, md: 4 },
  backgroundColor: 'background.paper',
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
};

const headingSx = {
  fontFamily: 'Roboto, sans-serif',
  fontSize: { xs: '1.4rem', md: '1.75rem' },
  fontWeight: 600,
  color: 'primary.main',
  mb: 3,
};

const subheadSx = { fontFamily: 'Roboto, sans-serif', fontWeight: 600, color: 'primary.main', mb: 1.5 };

export default function ExpertiseContent({ category }: { category: string }) {
  const { isAr, tr, href } = useI18n();
  const capability = capabilities.find((cap) => cap.category === category);

  if (!capability) {
    return (
      <AppLayout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography>{tr('Service not found', 'الخدمة غير موجودة')}</Typography>
        </Container>
      </AppLayout>
    );
  }

  const proofProjects = projects.filter((p) => capability.projectIds.includes(p.id));
  const proofInsights = insights.filter((i) => capability.insightIds.includes(i.id));
  const others = capabilities.filter((c) => c.id !== capability.id);

  return (
    <AppLayout>
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Box
              component={Link}
              href={href('/#capabilities')}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                color: 'primary.main',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              <ArrowBackIcon fontSize="small" sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} />
              {tr('All services', 'كل الخدمات')}
            </Box>
          </Box>

          <Box sx={{ ...panelSx, mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
              <Box sx={{ color: 'secondary.main' }}>
                <ServiceIcon name={capability.icon} size={56} />
              </Box>
              <Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1.5 }}>
                  {tr('Service', 'خدمة')}
                </Typography>
                <Typography variant="h2" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
                  {isAr ? capability.titleAr : capability.title}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1.85, mb: 3, maxWidth: 900 }}>
              {isAr ? capability.introAr : capability.intro}
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" sx={subheadSx}>
                  {tr('What I deliver', 'ما أقدّمه')}
                </Typography>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {capability.deliverables.map(([en, ar]) => (
                    <Box component="li" key={en} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                      <CheckCircleOutlineIcon sx={{ color: 'secondary.main', fontSize: 20, mt: '3px', flexShrink: 0 }} />
                      <Typography variant="body1" sx={{ lineHeight: 1.6 }}>{isAr ? ar : en}</Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={5}>
                <Typography variant="h6" sx={subheadSx}>
                  {tr('Who it is for', 'لمن هذه الخدمة')}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 3 }}>
                  {isAr ? capability.audienceAr : capability.audience}
                </Typography>
                <Typography variant="h6" sx={subheadSx}>
                  {tr('Tools', 'الأدوات')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {capability.technologies.map((tech) => (
                    <Chip key={tech} label={tech} size="small" sx={{ bgcolor: 'primary.main', color: 'white', fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem' }} />
                  ))}
                </Box>
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 4,
                p: 2.5,
                borderRadius: 2,
                bgcolor: 'rgba(74, 55, 40, 0.05)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                gap: 2,
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {tr('I am available for consulting and short-term contracts, remotely or on site, in Arabic and English.', 'أنا متاح للاستشارات والعقود القصيرة، عن بُعد أو في الموقع، بالعربية والإنجليزية.')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<MailOutlineIcon />}
                href={`mailto:info@coffeemap.dev?subject=${encodeURIComponent(capability.title)}`}
                sx={{ flexShrink: 0, textTransform: 'none', fontFamily: 'Roboto, sans-serif', bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                {tr('Discuss a project', 'ناقش مشروعًا')}
              </Button>
            </Box>
          </Box>

          {proofProjects.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography variant="h3" sx={headingSx}>
                {tr('Projects that show it', 'مشاريع تُظهر ذلك')}
              </Typography>
              <Grid container spacing={3}>
                {proofProjects.map((project) => (
                  <Grid item xs={12} sm={6} md={4} key={project.id}>
                    <ProjectCard project={project} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {proofInsights.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography variant="h3" sx={headingSx}>
                {tr('Read more', 'اقرأ المزيد')}
              </Typography>
              <Grid container spacing={3}>
                {proofInsights.map((insight) => (
                  <Grid item xs={12} sm={6} md={4} key={insight.id}>
                    <InsightCard insight={insight} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Box>
            <Typography variant="h3" sx={headingSx}>
              {tr('Other services', 'خدمات أخرى')}
            </Typography>
            <Grid container spacing={3}>
              {others.map((c) => (
                <Grid item xs={12} sm={6} md={4} key={c.id}>
                  <CapabilityCard capability={c} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>
    </AppLayout>
  );
}
