'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Paper } from '@mui/material';
import { useI18n } from '@/i18n';

interface EmbeddedPageProps {
  src: string; // self-contained HTML page in public/projects-static (Arabic copy in projects-static/ar)
  title: string;
  initialHeight: number;
}

// Embeds a same-origin static page in an iframe that resizes to its content.
export default function EmbeddedPage({ src, title, initialHeight }: EmbeddedPageProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(initialHeight);
  const { isAr } = useI18n();
  const page = isAr ? src.replace('/projects-static/', '/projects-static/ar/') : src;

  // Measure <body>, not the document: the document's scrollHeight never drops
  // below the iframe's current height, so the frame could grow but not shrink.
  const fit = useCallback(() => {
    const body = frame.current?.contentDocument?.body;
    if (body) setHeight(body.scrollHeight);
  }, []);

  useEffect(() => {
    const body = frame.current?.contentDocument?.body;
    if (!body) return;
    // Refit when the page's layout changes (tabs, panels, window width).
    const observer = new ResizeObserver(fit);
    observer.observe(body);
    return () => observer.disconnect();
  });

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      <Box
        component="iframe"
        ref={frame}
        src={page}
        title={title}
        onLoad={fit}
        sx={{ display: 'block', width: '100%', height, border: 0 }}
      />
    </Paper>
  );
}
