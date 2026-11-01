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
                    'CoffeeMap.dev is my workshop. It is where I build working examples of what I offer clients: satellite analytics, humanitarian dashboards, data-quality workflows and 3D site models, all running directly in the browser on simple static hosting. Each project comes with an article on the question, the data, the method and its limits.',
                    'CoffeeMap.dev ورشتي. فيه أبني أمثلة عاملة لما أقدّمه للعملاء: تحليلات الأقمار الصناعية، ولوحات العمل الإنساني، وسير عمل جودة البيانات، ونماذج المواقع ثلاثية الأبعاد، وكلها تعمل مباشرة في المتصفح على استضافة ثابتة بسيطة. ولكل مشروع مقال عن السؤال والبيانات والمنهج وحدوده.',
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
                  {tr('About me', 'نبذة عني')}
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
                      أنا <strong>أمين عدنان قاسم</strong>، مهندس جيوماتكس سوداني مقيم في الرياض، مرخّص من الهيئة السعودية للمهندسين، وأحمل
                      الماجستير والبكالوريوس في هندسة الجيوماتكس/المساحة من جامعة الخرطوم. بدأت مساحًا ومهندسًا جيوديسيًا ومهندس موقع، ثم عملت
                      أكثر من 10 سنوات في نظم المعلومات الجغرافية والاستشعار عن بعد والخرائط الإنسانية، منها مشاريع مع برنامج الأمم المتحدة للبيئة
                      (UNEP) وموئل الأمم المتحدة (UN‑Habitat) ومكتب الأمم المتحدة لخدمات المشاريع (UNOPS) في الرصد البيئي والبنية التحتية والاستجابة
                      للطوارئ.
                    </>
                  ) : (
                    <>
                      I&apos;m <strong>Amin Adnan Gasim</strong>, a Sudanese geomatics engineer based in Riyadh, licensed with the Saudi Council of
                      Engineers, with an MSc and BSc in Geomatics/Surveying Engineering from the University of Khartoum. I started as a surveyor,
                      geodetic engineer and site engineer, and have since spent more than 10 years in GIS, remote sensing and humanitarian mapping,
                      including projects with UNEP, UN‑Habitat and UNOPS on environmental monitoring, infrastructure and emergency response.
                    </>
                  )}
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
                  {tr(
                    'My recent work is quality control of large-scale mapping data: inspection workflows, sampling plans and accuracy assessment against ISO 19157. Alongside it I build GeoAI and WebGIS tools that turn open satellite and humanitarian data into answers people can act on. I work in Arabic and English.',
                    'يتركّز عملي في الفترة الأخيرة على ضبط جودة بيانات الخرائط الواسعة النطاق: سير عمل الفحص، وخطط العينات، وتقييم الدقة وفق ISO 19157. وإلى جانب ذلك أبني أدوات للذكاء الجيومكاني ونظم المعلومات الجغرافية على الويب تحوّل بيانات الأقمار الصناعية والبيانات الإنسانية المفتوحة إلى إجابات يمكن العمل بها. وأعمل بالعربية والإنجليزية.',
                  )}
                </Typography>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(74, 55, 40, 0.05)', borderInlineStart: '4px solid', borderColor: 'secondary.main' }}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                    {tr('Available for consulting', 'متاح للاستشارات')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                    {tr(
                      'I take on consulting work and short-term contracts, remotely or on site: satellite analytics, humanitarian information management, WebGIS dashboards, surveying and geodesy, geospatial QA/QC and training, and 3D/BIM site models.',
                      'أقبل أعمال الاستشارات والعقود القصيرة، عن بُعد أو في الموقع: تحليلات الأقمار الصناعية، وإدارة المعلومات الإنسانية، ولوحات نظم المعلومات الجغرافية على الويب، والمساحة والجيوديسيا، وضبط جودة البيانات الجيومكانية والتدريب، ونماذج المواقع ثلاثية الأبعاد وBIM.',
                    )}
                  </Typography>
                  <Button
                    size="small"
                    href={href('/#capabilities')}
                    endIcon={<ArrowForwardIcon sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} />}
                    sx={{ mt: 1, px: 0, fontFamily: 'Roboto, sans-serif', textTransform: 'none', color: 'secondary.main', fontWeight: 600 }}
                  >
                    {tr('See my services', 'اطّلع على خدماتي')}
                  </Button>
                </Box>
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
                {tr('Get in Touch', 'تواصل معي')}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </AppLayout>
  );
}
