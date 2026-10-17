'use client';

import { Box } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import EmbeddedPage from '@/components/EmbeddedPage';
import { useI18n } from '@/i18n';

export default function GeospatialQaqcWorkbench() {
  const { tr } = useI18n();
  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', bgcolor: '#FBF7F2', px: 2, pt: 1.5, pb: 3 }}>
        <DashboardHeader
          title={tr('Geospatial QA/QC Workbench', 'منصة ضبط وضمان جودة البيانات الجيومكانية')}
          subtitle={tr('Quality checks for imagery, elevation, vector and land cover data · ISO 19157-1', 'فحوص الجودة للصور ونماذج الارتفاع والبيانات المتجهية والغطاء الأرضي · ISO 19157-1')}
          icon={<FactCheckIcon sx={{ fontSize: 28 }} />}
          source={tr('ISO 19157-1 data quality · ISO 2859-1 sampling', 'جودة البيانات ISO 19157-1 · المعاينة ISO 2859-1')}
          author="Amin Adnan Gasim"
          date={tr('Sep 2026', 'سبتمبر 2026')}
          gradientFrom="#1F6FB2"
          gradientTo="#1A4F4F"
          mb={1.5}
          articleHref="/insights/geospatial-qaqc-workbench"
        />
        <EmbeddedPage src="/projects-static/geospatial-qaqc-workbench.html" title={tr('Geospatial QA/QC Workbench', 'منصة ضبط وضمان جودة البيانات الجيومكانية')} initialHeight={1400} />
      </Box>
    </AppLayout>
  );
}
