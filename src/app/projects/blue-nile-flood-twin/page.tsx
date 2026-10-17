'use client';

import { Box, Paper, Typography } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import WavesIcon from '@mui/icons-material/Waves';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import { useI18n } from '@/i18n';
import { water } from '@/theme/waterColors';

const FloodTwinViewer = nextDynamic(() => import('@/components/flood-twin/FloodTwinViewer'), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>…</Box>,
});

export default function BlueNileFloodTwin() {
  const { tr, isAr } = useI18n();
  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', bgcolor: water.light }}>
        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>
          <DashboardHeader
            title={tr('Blue Nile Flood Twin', 'التوأم الرقمي لفيضان النيل الأزرق')}
            subtitle={tr('Animated 3D flood of a Blue Nile town · Sennar, Sudan, September 2020', 'محاكاة ثلاثية الأبعاد متحركة لفيضان مدينة على النيل الأزرق · سنار، السودان، سبتمبر 2020')}
            icon={<WavesIcon sx={{ fontSize: 28 }} />}
            source={tr('Illustrative sample data (synthetic terrain, buildings and timeline), rendered with Three.js', 'بيانات عينة توضيحية (تضاريس ومبانٍ وخط زمني اصطناعية)، معروضة بمكتبة Three.js')}
            author="Amin Adnan Gasim"
            date={tr('Oct 2026', 'أكتوبر 2026')}
            gradientFrom={water.DEFAULT}
            gradientTo={water.dark}
            borderRadius={1.5}
            mb={1.5}
          />
        </Box>

        <FloodTwinViewer />

        <Box sx={{ px: 2, pb: 3 }}>
          <Paper elevation={2} sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', mb: 1.5, color: water.dark }}>
              {tr('About the project', 'عن المشروع')}
            </Typography>
            {isAr ? (
              <>
                <Typography variant="body1" sx={{ lineHeight: 2, mb: 2 }}>
                  يعيد هذا المشروع بناء فيضان النيل الأزرق في سبتمبر 2020 حول مدينة سنار في مشهد ثلاثي الأبعاد: تضاريس من نموذج ارتفاع رقمي مكسوّة بصورة
                  قمر صناعي، ومبانٍ مجسّمة من مضلعاتها، وسطح ماء يرتفع يومًا بعد يوم مع منسوب النهر، ومطر تتبع شدته الهطول اليومي. يتلوّن كل مبنى بعمق المياه عند
                  قاعدته (جاف، أقل من 0.5 م، 0.5–1.5 م، أكثر من 1.5 م)، وتُحصى المباني والسكان المتأثرون في كل لحظة.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 2 }}>
                  الرسوم المتحركة دالة نقية للزمن: كل إطار يُحسب من موضعه على الخط الزمني وحده، لذا يعرض التشغيل التفاعلي والتصدير إلى فيديو الإطارات نفسها تمامًا.
                  تُعالج البيانات كلها مسبقًا دون اتصال بالإنترنت، ولا يحمّل المتصفح سوى ملفات ثابتة. البيانات المعروضة حاليًا عينة توضيحية اصطناعية لعرض الأداة،
                  وليست بيانات مرصودة. السطح المائي مستوٍ عبر المنطقة (نموذج الحوض)، فالنتائج استرشادية وليست محاكاة هيدروليكية.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body1" sx={{ lineHeight: 2, mb: 2 }}>
                  This project rebuilds the September 2020 Blue Nile flood around Sennar town as an animated 3D scene: terrain from a digital elevation
                  model draped with satellite imagery, buildings extruded from their footprints, a water surface that rises day by day with the river level,
                  and rain whose intensity follows daily rainfall. Every building is coloured by the water depth at its base (dry, under 0.5 m, 0.5–1.5 m,
                  over 1.5 m), and the buildings and people affected are counted at every moment.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 2 }}>
                  The animation is a pure function of time: every frame is computed from its position on the timeline alone, so interactive playback and the
                  video export show exactly the same frames. All the data is processed offline; the browser only loads static files. The data shown now is an
                  illustrative synthetic sample built to demonstrate the viewer, not observed data. The water surface is flat across the area (a bathtub
                  model), so results are indicative, not a hydraulic simulation.
                </Typography>
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </AppLayout>
  );
}
