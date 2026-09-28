'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, Divider, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TerrainIcon from '@mui/icons-material/Terrain';
import GrassIcon from '@mui/icons-material/Grass';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import PaletteIcon from '@mui/icons-material/Palette';
import CategoryIcon from '@mui/icons-material/Category';
import { CONFIG, MosqueEnvironment } from '@/lib/mosqueEnvironment';
import { BimData, BimSelection, CATEGORY_COLORS, ColorMode, UNCATEGORISED_COLOR, UNIT_LABEL, formatSAR, quantityLabel, scheduleCsv } from '@/lib/mosqueBim';

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

function Section({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!shown.length) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, lineHeight: 2 }}>
        {title}
      </Typography>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td': { py: 0.4, verticalAlign: 'top', fontSize: '0.78rem' } }}>
        <tbody>
          {shown.map(([label, value]) => (
            <tr key={label}>
              <td style={{ color: '#666', width: '42%', paddingRight: 8 }}>{label}</td>
              <td style={{ fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

function PropertiesPanel({ selection, disclaimer, onClose }: { selection: BimSelection; disclaimer: string; onClose: () => void }) {
  const { element: e, type: t } = selection;
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: 16,
        width: 360,
        maxWidth: 'calc(100% - 32px)',
        bgcolor: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        borderRadius: 1.5,
        boxShadow: 4,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, pb: 1.5, bgcolor: '#23384d', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{t.name}</Typography>
            <Typography variant="body2" dir="rtl" sx={{ opacity: 0.85, mt: 0.5, textAlign: 'right' }}>{t.nameAr}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'white', mt: -0.5 }} aria-label="Close properties">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          <Chip size="small" label={t.category} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip size="small" label={e.assetTag} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'monospace' }} />
        </Stack>
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        <Section
          title="Identity"
          rows={[
            ['Revit element ID', e.elementId ?? '–'],
            ['IFC class', t.ifc],
            ['UniFormat', t.uniformat],
            ['Level', e.level],
            ['Zone', e.zone],
            ['Status / condition', `${e.status} · ${e.condition}`],
          ]}
        />
        <Divider sx={{ mb: 1 }} />
        <Section
          title="Specification"
          rows={[
            ['Construction', t.construction],
            ['Material', t.material],
            ['Fire resistance', t.fireResistance],
            ['U-value', t.uValue != null ? `${t.uValue} W/m²K` : null],
            ['Solar heat gain (SHGC)', t.shgc ?? null],
            ['Codes & standards', t.standards.join(', ')],
          ]}
        />
        <Divider sx={{ mb: 1 }} />
        <Section
          title="Quantities & cost"
          rows={[
            ...Object.entries(e.quantities).map(([k, v]): [string, React.ReactNode] => [quantityLabel(k), v.toLocaleString()]),
            ['Unit rate', `${formatSAR(t.costSAR)} / ${UNIT_LABEL[t.unit]}`],
            ['Element cost', formatSAR(e.costSAR)],
          ]}
        />
        <Divider sx={{ mb: 1 }} />
        <Section
          title="Lifecycle"
          rows={[
            ['Installed', `${e.installDate} (${e.installDateHijri} AH)`],
            ['Warranty', `${t.warrantyYears} years`],
            ['Design life', `${t.lifeYears} years`],
            ['Maintenance', t.maintenance],
          ]}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic', lineHeight: 1.4 }}>
          {disclaimer}
        </Typography>
      </Box>
    </Box>
  );
}

const floatingDarkSx = {
  color: 'white',
  bgcolor: 'rgba(20, 28, 40, 0.75)',
  backdropFilter: 'blur(4px)',
  borderRadius: 1,
} as const;

// Categories in the model with their element counts, most common first.
function CategoryLegend({ bim }: { bim: BimData }) {
  const counts: Record<string, number> = {};
  for (const e of Object.values(bim.elements)) {
    const category = bim.types[e.type].category;
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return (
    <Box sx={{ ...floatingDarkSx, px: 1.5, py: 1, pointerEvents: 'none' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>BIM categories</Typography>
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([category, n]) => (
        <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, flexShrink: 0, bgcolor: CATEGORY_COLORS[category] ?? UNCATEGORISED_COLOR }} />
          <Typography variant="caption" sx={{ flex: 1, lineHeight: 1.45 }}>{category}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, pl: 1.5 }}>{n}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function MosqueViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<MosqueEnvironment | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [night, setNight] = useState(CONFIG.START_AT_NIGHT);
  const [terrain, setTerrain] = useState(CONFIG.START_IN_TERRAIN);
  const [selection, setSelection] = useState<BimSelection | null>(null);
  const [bim, setBim] = useState<BimData | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>(CONFIG.START_COLOR_MODE);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const world = new MosqueEnvironment(container);
    world.onSelect = setSelection;
    let disposed = false;
    world
      .load((fraction) => !disposed && setProgress(Math.round(fraction * 100)))
      .then(() => {
        if (disposed) return;
        worldRef.current = world;
        world.start();
        setBim(world.bim ?? null);
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
  const toggleColorMode = () => {
    const next = colorMode === 'category' ? 'realistic' : 'category';
    worldRef.current?.setColorMode(next);
    setColorMode(next);
  };
  const clearSelection = () => worldRef.current?.select(null);
  const downloadSchedule = () => {
    if (!bim) return;
    const url = URL.createObjectURL(new Blob([scheduleCsv(bim)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aseer-mosque-bim-schedule.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', bgcolor: '#87ceeb' }}>
      {status === 'ready' && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ position: 'absolute', top: 16, left: 16, flexWrap: 'wrap', maxWidth: selection ? 'calc(100% - 408px)' : 'calc(100% - 32px)' }}>
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
          {bim && (
            <Button
              variant="contained"
              disableElevation
              startIcon={colorMode === 'category' ? <PaletteIcon /> : <CategoryIcon />}
              onClick={toggleColorMode}
              sx={buttonSx}
            >
              {colorMode === 'category' ? 'Realistic colours' : 'Category colours'}
            </Button>
          )}
          {bim && (
            <Button variant="contained" disableElevation startIcon={<DownloadIcon />} onClick={downloadSchedule} sx={buttonSx}>
              BIM schedule (CSV)
            </Button>
          )}
        </Stack>
      )}

      {status === 'ready' && bim && (
        <Stack spacing={1} sx={{ position: 'absolute', left: 16, bottom: 16, alignItems: 'flex-start' }}>
          {colorMode === 'category' && <CategoryLegend bim={bim} />}
          {!selection && (
            <Box sx={{ ...floatingDarkSx, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, pointerEvents: 'none' }}>
              <TouchAppIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                Click any building element for its BIM data · {Object.keys(bim.elements).length} elements
              </Typography>
            </Box>
          )}
        </Stack>
      )}

      {selection && bim && (
        <PropertiesPanel selection={selection} disclaimer={bim.meta.disclaimer} onClose={clearSelection} />
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
