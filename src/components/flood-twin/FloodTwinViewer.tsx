'use client';

// Blue Nile Flood Twin dashboard: stat tiles, controls and the 3D canvas.
// The render loop only advances the timeline time t (wall clock x speed when
// playing); everything on screen is evaluate(t), so playback, scrubbing and
// the video export all show the same frames.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { useI18n } from '@/i18n';
import { TIMING } from '@/lib/floodTwin/config';
import { loadFloodTwinData, type FloodTwinData } from '@/lib/floodTwin/data';
import { drawOverlay } from '@/lib/floodTwin/overlay';
import { FloodTwinScene, type Layers } from '@/lib/floodTwin/scene';
import { createTimelineContext, evaluate, type SceneState, type TimelineContext } from '@/lib/floodTwin/timeline';
import BuildingPanel from './BuildingPanel';
import FloodTwinControls, { type Speed } from './FloodTwinControls';
import FloodTwinStats from './FloodTwinStats';

const UI_INTERVAL_MS = 80; // React state refresh while playing (the canvas renders every frame)

export default function FloodTwinViewer() {
  const { tr, isAr } = useI18n();

  const [data, setData] = useState<FloodTwinData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<SceneState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [freeCamera, setFreeCamera] = useState(false);
  const [layers, setLayers] = useState<Layers>({ buildings: true, water: true, rain: true, floodExtent: true, satellite: true });
  const [selected, setSelected] = useState<number | null>(null);

  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FloodTwinScene | null>(null);
  const ctxRef = useRef<TimelineContext | null>(null);
  // The loop reads these refs, so changing a control never restarts it.
  const live = useRef({ t: 0, playing: false, speed: 1 as Speed, layers, dirty: true, locale: (isAr ? 'ar' : 'en') as 'ar' | 'en' });

  useEffect(() => {
    live.current.layers = layers;
    live.current.speed = speed;
    live.current.playing = playing;
    live.current.locale = isAr ? 'ar' : 'en';
    live.current.dirty = true;
  }, [layers, speed, playing, isAr]);

  // Load the data, then autoplay unless the user prefers reduced motion.
  useEffect(() => {
    let cancelled = false;
    loadFloodTwinData()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Scene and render loop.
  useEffect(() => {
    if (!data || !host.current) return;
    const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    const scene = new FloodTwinScene(host.current, data, { mobile });
    const ctx = createTimelineContext(data.timeline, data.buildings, scene.half, !!data.floodExtent);
    sceneRef.current = scene;
    ctxRef.current = ctx;
    scene.onSelect = (i) => {
      setSelected(i);
      live.current.dirty = true;
    };
    const fontFamily = getComputedStyle(document.body).fontFamily;

    let raf = 0;
    let last = -1;
    let lastUi = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const L = live.current;
      const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      if (L.playing) {
        L.t = Math.min(L.t + dt * L.speed, TIMING.DURATION);
        if (L.t >= TIMING.DURATION) {
          L.playing = false;
          setPlaying(false);
        }
      }
      const free = scene.controls.enabled;
      if (!L.playing && !L.dirty && !free) return;
      L.dirty = false;

      const state = evaluate(ctx, L.t);
      scene.apply(state, L.layers);
      scene.render();

      const c = overlay.current;
      if (c) {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
        if (c.width !== w || c.height !== h) {
          c.width = w;
          c.height = h;
        }
        drawOverlay(c.getContext('2d')!, w, h, state, { locale: L.locale, compact: true, illustrative: data.terrain.illustrative || data.timeline.illustrative, place: data.terrain.place, fontFamily });
      }
      if (!L.playing || now - lastUi > UI_INTERVAL_MS) {
        lastUi = now;
        setUi(state);
      }
    };
    raf = requestAnimationFrame(frame);
    const resize = new ResizeObserver(() => (live.current.dirty = true));
    resize.observe(host.current);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      scene.dispose();
      sceneRef.current = null;
      ctxRef.current = null;
    };
  }, [data]);

  const onPlayPause = useCallback(() => {
    if (!playing && live.current.t >= TIMING.DURATION) live.current.t = 0;
    setPlaying((p) => !p);
  }, [playing]);

  const onScrub = useCallback((t: number) => {
    live.current.t = t;
    live.current.dirty = true;
  }, []);

  const onFreeCamera = useCallback((free: boolean) => {
    sceneRef.current?.setFreeCamera(free);
    live.current.dirty = true;
    setFreeCamera(free);
  }, []);

  const closePanel = useCallback(() => {
    sceneRef.current?.select(null);
    setSelected(null);
    live.current.dirty = true;
  }, []);

  const total = useMemo(
    () => ({
      buildings: data?.buildings.features.length ?? 0,
      people: data?.buildings.features.reduce((s, f) => s + (f.properties.people ?? 0), 0) ?? 0,
    }),
    [data],
  );

  const statsNode = <FloodTwinStats state={ui} total={total} />;

  const controlsNode = data ? (
    <FloodTwinControls
      t={ui?.t ?? 0}
      playing={playing}
      onPlayPause={onPlayPause}
      onScrub={onScrub}
      speed={speed}
      onSpeed={setSpeed}
      freeCamera={freeCamera}
      onFreeCamera={onFreeCamera}
      layers={layers}
      onLayers={setLayers}
      hasExtent={!!data.floodExtent}
      illustrative={data.terrain.illustrative || data.timeline.illustrative}
      calibration={data.timeline.calibration}
      source={data.timeline.source}
    />
  ) : (
    <Typography variant="body2" color="text.secondary">{tr('Loading…', 'جارٍ التحميل…')}</Typography>
  );

  const canvasNode = (
    <Box sx={{ position: 'relative', height: '100%', bgcolor: '#a9c9de' }}>
      <Box ref={host} sx={{ position: 'absolute', inset: 0 }} />
      <Box component="canvas" ref={overlay} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      {!data && !error && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 12, left: 12, right: 12 }}>
          {tr('Could not load the scene data:', 'تعذّر تحميل بيانات المشهد:')} {error}
        </Alert>
      )}
      {data && selected !== null && ui && (
        <BuildingPanel building={data.buildings.features[selected].properties} waterLevel={ui.waterLevel} onClose={closePanel} />
      )}
    </Box>
  );

  // One tree for both layouts (CSS only), so the canvas never remounts at the breakpoint.
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box sx={{ mb: { xs: 2, md: 1.25 } }}>{statsNode}</Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 1.5 }, alignItems: { md: 'flex-start' } }}>
        <Paper elevation={2} sx={{ order: { xs: 2, md: 1 }, width: { md: 300 }, flexShrink: 0, height: { md: 680 }, overflowY: { md: 'auto' }, p: 2 }}>
          {controlsNode}
        </Paper>
        <Paper elevation={2} sx={{ order: { xs: 1, md: 2 }, flex: { md: 1 }, height: { xs: 420, md: 680 }, minWidth: 0, overflow: 'hidden' }}>
          {canvasNode}
        </Paper>
      </Box>
    </Box>
  );
}
