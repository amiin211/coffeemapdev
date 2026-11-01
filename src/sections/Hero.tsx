'use client';

import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { useI18n } from '@/i18n';

const Hero = () => {
  const { tr } = useI18n();
  const handleExploreClick = () => {
    const element = document.querySelector('#projects');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box
      id="hero"
      sx={{
        minHeight: { xs: '100vh', md: '80vh' },
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #FDFBF9 0%, #F5F0EB 100%)',
        pt: { xs: 8, md: 0 },
        pb: { xs: 8, md: 0 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography
              variant="h1"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                color: 'primary.main',
                mb: 2,
                lineHeight: 1.2,
              }}
            >
              {tr('Brewing Data into', 'أحوّل البيانات إلى')}
              <Box
                component="span"
                sx={{
                  display: 'block',
                  color: 'secondary.main',
                }}
              >
                {tr('Actionable Geospatial Insights', 'رؤى جيومكانية قابلة للتنفيذ')}
              </Box>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                fontSize: '1.125rem',
                color: 'text.secondary',
                mb: 4,
                maxWidth: 540,
                lineHeight: 1.7,
              }}
            >
              {tr("I'm ", 'أنا ')}<b>{tr('Amin Adnan Gasim', 'أمين عدنان قاسم')}</b>
              {tr(
                ', a licensed geomatics engineer with over 10 years in surveying, GIS, remote sensing and humanitarian mapping. CoffeeMap.dev is where I build what I offer clients: satellite analytics, humanitarian dashboards, data-quality workflows and 3D/BIM site models that run in any browser.',
                '، مهندس جيوماتكس مرخّص بخبرة تتجاوز 10 سنوات في المساحة ونظم المعلومات الجغرافية والاستشعار عن بعد والخرائط الإنسانية. وCoffeeMap.dev هو المكان الذي أبني فيه ما أقدّمه لعملائي: تحليلات الأقمار الصناعية، ولوحات العمل الإنساني، وسير عمل جودة البيانات، ونماذج المواقع ثلاثية الأبعاد وBIM التي تعمل في أي متصفح.',
              )}
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent={{ xs: 'center', md: 'flex-start' }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleExploreClick}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '0.9rem',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                {tr('Explore Projects', 'استكشف المشاريع')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  const element = document.querySelector('#contact');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '0.9rem',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: 'rgba(74, 55, 40, 0.04)',
                  },
                }}
              >
                {tr('Get in Touch', 'تواصل معي')}
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Box
              component="img"
              src="/logo.svg"
              alt={tr('CoffeeMap Geospatial Platform', 'منصة CoffeeMap الجيومكانية')}
              sx={{
                maxWidth: '100%',
                height: 'auto',
                maxHeight: 400,
              }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;
