'use client';

import { Box, Container, Typography, Button, Stack, Grid } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CoffeeIcon from '@mui/icons-material/Coffee';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/i18n';

export default function About() {
  const { isAr, tr, href } = useI18n();
  return (
    <AppLayout>
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: 'background.default' }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  backgroundColor: 'background.paper',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 600,
                    color: 'primary.main',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  {tr('About', 'نبذة عن')}
                  <Box
                    component="img"
                    src="/logo.svg"
                    alt="CoffeeMap.dev"
                    sx={{ height: { xs: 28, md: 32 } }}
                  />
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '1rem',
                    lineHeight: 1.8,
                  }}
                >
                  {tr(
                    'CoffeeMap.dev is a simple space for experimenting with geospatial engineering. It brings together web technologies and GIS to create clear, interactive tools from complex spatial data. It also collects ideas, notes, and small demos showing how geospatial systems can run directly in the browser.',
                    'CoffeeMap.dev مساحة بسيطة للتجريب في الهندسة الجيومكانية. تجمع بين تقنيات الويب ونظم المعلومات الجغرافية لصنع أدوات واضحة وتفاعلية من البيانات المكانية المعقدة. وتضم أيضًا أفكارًا وملاحظات وعروضًا صغيرة تُظهر كيف يمكن للأنظمة الجيومكانية أن تعمل مباشرة في المتصفح.',
                  )}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  backgroundColor: 'background.paper',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 600,
                    color: 'primary.main',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {tr('Why coffee?', 'لماذا القهوة؟')}
                  <CoffeeIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '1rem',
                    lineHeight: 1.8,
                    mb: 2,
                  }}
                >
                  {tr('Because great ideas often begin with a cup.', 'لأن الأفكار العظيمة كثيرًا ما تبدأ بفنجان.')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '1rem',
                    lineHeight: 1.8,
                  }}
                >
                  {tr(
                    'CoffeeMap.dev is a small corner where maps, data, and experiments come together—sometimes smooth, sometimes messy, but always fun.',
                    'CoffeeMap.dev ركن صغير تلتقي فيه الخرائط والبيانات والتجارب؛ أحيانًا بسلاسة، وأحيانًا بفوضى، لكنها ممتعة دائمًا.',
                  )}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              p: 4,
              backgroundColor: 'background.paper',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Box
                  component="img"
                  src="/images/amin.png"
                  alt={tr('Amin Adnan Gasim', 'أمين عدنان قاسم')}
                  sx={{
                    width: '100%',
                    maxWidth: 280,
                    borderRadius: 3,
                    display: 'block',
                    mx: 'auto',
                  }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 600,
                    color: 'primary.main',
                    mb: 3,
                  }}
                >
                  {tr('Creator', 'المؤسس')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.8,
                    fontSize: '1rem',
                    mb: 2,
                  }}
                >
                  {isAr ? (
                    <>
                      بنى CoffeeMap.dev <strong>أمين عدنان قاسم</strong>، مهندس جيومكاني سوداني مقيم في المملكة العربية السعودية، يملك أكثر من
                      10 سنوات من الخبرة في نظم المعلومات الجغرافية والاستشعار عن بعد وأنظمة البيانات المكانية، وعمل مع منظمات مثل برنامج الأمم
                      المتحدة للبيئة (UNEP) وموئل الأمم المتحدة (UN‑Habitat) ومكتب الأمم المتحدة لخدمات المشاريع (UNOPS) في مشاريع البنية التحتية
                      والرصد البيئي والاستجابة للطوارئ.
                    </>
                  ) : (
                    <>
                      CoffeeMap.dev is built by <strong>Amin Adnan Gasim</strong>, a Sudanese geospatial engineer based in
                      Saudi Arabia. He has over 10 years of experience in GIS, remote sensing, and spatial
                      data systems, working with organizations such as UNEP, UN‑Habitat, and UNOPS on
                      projects related to infrastructure, environmental monitoring, and emergency response.
                    </>
                  )}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.8,
                    fontSize: '1rem',
                  }}
                >
                  {tr('His work focuses on practical, data‑driven geospatial solutions.', 'يركّز عمله على حلول جيومكانية عملية قائمة على البيانات.')}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Roboto, sans-serif',
                fontSize: { xs: '1.5rem', md: '2rem' },
                fontWeight: 700,
                color: 'primary.main',
                mb: 4,
              }}
            >
              {tr('Let’s Work Together', 'لنعمل معًا')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} />}
                href={href('/')}
                sx={{
                  backgroundColor: 'primary.main',
                  fontFamily: 'Roboto, sans-serif',
                }}
              >
                {tr('View Projects', 'عرض المشاريع')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                href={href('/#contact')}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  fontFamily: 'Roboto, sans-serif',
                }}
              >
                {tr('Get in Touch', 'تواصل معنا')}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </AppLayout>
  );
}
