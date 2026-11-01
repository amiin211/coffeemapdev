'use client';

import { Box, Paper, Typography } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import MosqueIcon from '@mui/icons-material/Mosque';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import { useI18n } from '@/i18n';

const MosqueViewer = nextDynamic(() => import('@/components/MosqueViewer'), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>…</Box>,
});

export default function ThreeDMosqueViewer() {
  const { tr } = useI18n();
  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', px: 2, pt: 1.5, pb: 2 }}>
        <DashboardHeader
          articleHref="/insights/3d-mosque-4d-bim"
          title={tr('3D Mosque Viewer & 4D BIM', 'عارض المسجد ثلاثي الأبعاد ونمذجة 4D')}
          subtitle={tr('Mosque site with BIM data, terrain, traffic, day / night lighting and a drone photogrammetry survey — Aseer, Saudi Arabia', 'موقع مسجد مع بيانات BIM والتضاريس وحركة المرور والإضاءة النهارية والليلية ومسح فوتوغرامتري بطائرة مسيّرة — عسير، المملكة العربية السعودية')}
          icon={<MosqueIcon sx={{ fontSize: 28 }} />}
          source={tr('Mosque GLB model, Aseer DTM (0.5 m) and orthophoto, rendered with Three.js', 'نموذج GLB للمسجد، ونموذج تضاريس عسير (0.5 م) وصورة جوية مصححة، معروضة بمكتبة Three.js')}
          author="Amin Adnan Gasim"
          date={tr('Sep 2026', 'سبتمبر 2026')}
          gradientFrom="#b9854f"
          gradientTo="#7d5330"
          borderRadius={1.5}
          mb={1.5}
        />

        {/* The viewer fills the window height below the site's navigation bar
            (scroll past the header to see it all); full screen is in the viewer. */}
        <Paper elevation={2} sx={{ position: 'relative', height: { xs: 'calc(100svh - 120px)', md: 'calc(100vh - 110px)' }, minHeight: { xs: 460, md: 600 }, overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <MosqueViewer />
          </Box>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {tr('Drag to orbit · Right-drag to pan · Scroll to zoom · Click an element for BIM data · 4D construction plays the build schedule', 'اسحب للدوران · اسحب بالزر الأيمن للتحريك · مرّر للتكبير · انقر عنصرًا لعرض بيانات BIM · زر مراحل الإنشاء 4D يعرض الجدول الزمني للبناء')}
        </Typography>
      </Box>
    </AppLayout>
  );
}
