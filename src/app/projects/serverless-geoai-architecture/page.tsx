'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Paper } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';

// The interactive diagram is a self-contained HTML page (public/projects-static),
// embedded as-is; the iframe grows to fit its content.
const DIAGRAM = '/projects-static/serverless-geoai-architecture.html';

export default function ServerlessGeoAIArchitecture() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1100);

  const fit = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (doc?.body) setHeight(doc.documentElement.scrollHeight);
  }, []);

  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    // Refit when the diagram's layout changes (panel text, window width).
    const observer = new ResizeObserver(fit);
    observer.observe(doc.body);
    return () => observer.disconnect();
  });

  return (
    <AppLayout>
      <Box sx={{ minHeight: 'calc(100vh - 96px)', bgcolor: '#FBF7F2', px: 2, pt: 1.5, pb: 3 }}>
        <DashboardHeader
          title="Serverless GeoAI Architecture"
          subtitle="How CoffeeMap.dev runs satellite analysis with no VPS, no database and no Python at runtime"
          icon={<AccountTreeIcon sx={{ fontSize: 28 }} />}
          source="Blue Nile Flood Risk · Riyadh Urban Heat · GeoAI Crop Monitoring"
          author="Amin Adnan Gasim"
          date="Sep 2026"
          gradientFrom="#5B4A3D"
          gradientTo="#2B1D14"
          mb={1.5}
          articleHref="/insights/serverless-geoai-architecture"
        />
        <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
          <Box
            component="iframe"
            ref={frame}
            src={DIAGRAM}
            title="Interactive serverless GeoAI architecture"
            onLoad={fit}
            sx={{ display: 'block', width: '100%', height, border: 0 }}
          />
        </Paper>
      </Box>
    </AppLayout>
  );
}
