'use client';

import { Box, Paper, Typography } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import MosqueIcon from '@mui/icons-material/Mosque';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';

const MosqueViewer = nextDynamic(() => import('@/components/MosqueViewer'), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>Loading viewer...</Box>,
});

export default function ThreeDMosqueViewer() {
  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', px: 2, pt: 1.5, pb: 2 }}>
        <DashboardHeader
          title="3D Mosque Viewer"
          subtitle="Mosque site with BIM data, terrain, traffic, day / night lighting and a drone photogrammetry survey — Aseer, Saudi Arabia"
          icon={<MosqueIcon sx={{ fontSize: 28 }} />}
          source="Mosque GLB model, Aseer DTM (0.5 m) and orthophoto, rendered with Three.js"
          author="Amin Adnan Gasim"
          date="Sep 2026"
          gradientFrom="#3b5a78"
          gradientTo="#23384d"
          borderRadius={1.5}
          mb={1.5}
        />

        <Paper elevation={2} sx={{ flex: 1, position: 'relative', minHeight: { xs: 420, md: 640 }, overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <MosqueViewer />
          </Box>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Drag to orbit · Right-drag to pan · Scroll to zoom · Click an element for BIM data
        </Typography>
      </Box>
    </AppLayout>
  );
}
