'use client';

import { Suspense } from 'react';
import { Box } from '@mui/material';
import AppLayout from '@/components/AppLayout';
import Hero from '@/sections/Hero';
import Capabilities from '@/sections/Capabilities';
import Projects from '@/sections/Projects';
import Insights from '@/sections/Insights';
import Contact from '@/sections/Contact';

function HomeContent() {
  return (
    <AppLayout>
      <Hero />
      <Capabilities />
      <Projects />
      <Insights />
      <Contact />
    </AppLayout>
  );
}

export default function ClientWrapper() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: '100vh' }} />}>
      <HomeContent />
    </Suspense>
  );
}
