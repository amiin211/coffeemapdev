'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TerrainIcon from '@mui/icons-material/Terrain';
import GrassIcon from '@mui/icons-material/Grass';
import { CONFIG, MosqueEnvironment } from '@/lib/mosqueEnvironment';

const buttonSx = {
  minWidth: 140,
  color: '#fff',
  bgcolor: 'rgba(20, 28, 40, 0.75)',
  backdropFilter: 'blur(4px)',
  fontFamily: 'Roboto, sans-serif',
  fontWeight: 600,
  textTransform: 'none',
  '&:hover': { bgcolor: 'rgba(20, 28, 40, 0.9)' },
} as const;

export default function MosqueViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<MosqueEnvironment | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [night, setNight] = useState(CONFIG.START_AT_NIGHT);
  const [terrain, setTerrain] = useState(CONFIG.START_IN_TERRAIN);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const world = new MosqueEnvironment(container);
    let disposed = false;
    world
      .load((fraction) => !disposed && setProgress(Math.round(fraction * 100)))
      .then(() => {
        if (disposed) return;
        worldRef.current = world;
        world.start();
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        if (!disposed) setStatus('error');
      });

    return () => {
      disposed = true;
      worldRef.current = null;
      world.dispose();
    };
  }, []);

  const toggleNight = () => {
    worldRef.current?.setNight(!night);
    setNight(!night);
  };
  const toggleTerrain = () => {
    worldRef.current?.setTerrainMode(!terrain);
    setTerrain(!terrain);
  };

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', bgcolor: '#87ceeb' }}>
      {status === 'ready' && (
        <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 16, left: 16, flexWrap: 'wrap' }}>
          {/* Each button shows the mode it switches to. */}
          <Button
            variant="contained"
            disableElevation
            startIcon={night ? <LightModeIcon /> : <DarkModeIcon />}
            onClick={toggleNight}
            sx={buttonSx}
          >
            {night ? 'Day mode' : 'Night mode'}
          </Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={terrain ? <GrassIcon /> : <TerrainIcon />}
            onClick={toggleTerrain}
            sx={buttonSx}
          >
            {terrain ? 'Grass mode' : 'Terrain mode'}
          </Button>
        </Stack>
      )}

      {status !== 'ready' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            pointerEvents: 'none',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {status === 'error' ? 'Failed to load the 3D scene.' : `Loading scene… ${progress}%`}
          </Typography>
          {status === 'loading' && <LinearProgress variant="determinate" value={progress} sx={{ width: 200 }} />}
        </Box>
      )}
    </Box>
  );
}
