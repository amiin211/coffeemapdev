'use client';

import { Box } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import EmbeddedPage from '@/components/EmbeddedPage';
import { useI18n } from '@/i18n';

export default function ServerlessGeoAIArchitecture() {
  const { tr } = useI18n();
  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', bgcolor: '#FBF7F2', px: 2, pt: 1.5, pb: 3 }}>
        <DashboardHeader
          title={tr('Serverless GeoAI Architecture', 'معمارية الذكاء الجيومكاني بلا خوادم')}
          subtitle={tr('How CoffeeMap.dev runs satellite analysis with no VPS, no database and no Python at runtime', 'كيف يشغّل CoffeeMap.dev تحليل صور الأقمار الصناعية بلا خادم افتراضي ولا قاعدة بيانات ولا Python وقت التشغيل')}
          icon={<AccountTreeIcon sx={{ fontSize: 28 }} />}
          source={tr('Blue Nile Flood Risk · Riyadh Urban Heat · GeoAI Crop Monitoring', 'مخاطر فيضانات النيل الأزرق · الحرارة الحضرية في الرياض · مراقبة المحاصيل بالذكاء الجيومكاني')}
          author="Amin Adnan Gasim"
          date={tr('Sep 2026', 'سبتمبر 2026')}
          gradientFrom="#5B4A3D"
          gradientTo="#2B1D14"
          mb={1.5}
          articleHref="/insights/serverless-geoai-architecture"
        />
        <EmbeddedPage src="/projects-static/serverless-geoai-architecture.html" title={tr('Interactive serverless GeoAI architecture', 'معمارية تفاعلية للذكاء الجيومكاني بلا خوادم')} initialHeight={1100} />
      </Box>
    </AppLayout>
  );
}
