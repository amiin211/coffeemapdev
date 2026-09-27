'use client';

import {
  Box,
  Button,
  Collapse,
  Divider,
  FormControlLabel,
  MenuItem,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { SENTINEL_HUB_ENDPOINTS, Weights } from '@/lib/floodRisk';
import type { LayerVisibility } from '@/components/FloodRiskMap';

export type SarProvider = 'planetary' | keyof typeof SENTINEL_HUB_ENDPOINTS;

export interface EventSettings {
  preDate: string;
  floodDate: string;
  sarWindow: number; // days of Sentinel-1 acquisitions mosaicked up to each date
  rainDays: number;
  provider: SarProvider;
  token: string;
  clientId: string;
  clientSecret: string;
}

interface FloodRiskControlsProps {
  event: EventSettings;
  onEventChange: (event: EventSettings) => void;
  onLoadEvent: () => void;
  visible: LayerVisibility;
  onVisibleChange: (visible: LayerVisibility) => void;
  thresholds: { vv: number; vh: number };
  onThresholdsChange: (thresholds: { vv: number; vh: number }) => void;
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  onRecompute: () => void;
  busy: boolean;
  maxDate: string;
}

const LAYERS: [keyof LayerVisibility, string][] = [
  ['hillshade', 'DEM hillshade'],
  ['flood', 'Flood extent (SAR)'],
  ['risk', 'Flood risk'],
  ['rivers', 'Rivers'],
  ['rainfall', 'Rainfall'],
];

const WEIGHTS: [keyof Weights, string, string][] = [
  ['elevation', 'w1', 'Low elevation (height above river)'],
  ['slope', 'w2', 'Flat slope'],
  ['distance', 'w3', 'Near a river'],
  ['rainfall', 'w4', 'Recent rainfall'],
  ['sar', 'w5', 'SAR flood mask'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, lineHeight: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function LabeledSlider({
  label,
  value,
  unit = '',
  ...props
}: { label: string; value: number; unit?: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <Box sx={{ px: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}{unit}</Typography>
      </Box>
      <Slider
        size="small"
        value={value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(_, v) => props.onChange(v as number)}
        sx={{ py: 1, mt: -0.5 }}
      />
    </Box>
  );
}

export default function FloodRiskControls(props: FloodRiskControlsProps) {
  const { event, onEventChange, visible, thresholds, weights, busy } = props;
  const set = (patch: Partial<EventSettings>) => onEventChange({ ...event, ...patch });
  const needsCredentials = event.provider !== 'planetary';

  return (
    <Box>
      <Section title="Flood event">
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            label="Pre-flood"
            type="date"
            size="small"
            value={event.preDate}
            onChange={(e) => set({ preDate: e.target.value })}
            inputProps={{ max: props.maxDate, min: '2015-01-01' }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Flood date"
            type="date"
            size="small"
            value={event.floodDate}
            onChange={(e) => set({ floodDate: e.target.value })}
            inputProps={{ max: props.maxDate, min: '2015-01-01' }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField select label="SAR window" size="small" value={event.sarWindow} onChange={(e) => set({ sarWindow: Number(e.target.value) })} fullWidth>
            {[6, 12, 18, 24].map((d) => <MenuItem key={d} value={d}>{d} days</MenuItem>)}
          </TextField>
          <TextField select label="Rainfall" size="small" value={event.rainDays} onChange={(e) => set({ rainDays: Number(e.target.value) })} fullWidth>
            {[7, 14, 30, 60].map((d) => <MenuItem key={d} value={d}>{d} days</MenuItem>)}
          </TextField>
        </Box>
        <TextField
          select
          label="Sentinel-1 source"
          size="small"
          value={event.provider}
          onChange={(e) => set({ provider: e.target.value as SarProvider })}
          fullWidth
          sx={{ mb: 1 }}
        >
          <MenuItem value="planetary">Planetary Computer (no key)</MenuItem>
          {Object.entries(SENTINEL_HUB_ENDPOINTS).map(([key, ep]) => (
            <MenuItem key={key} value={key}>{ep.label} (token)</MenuItem>
          ))}
        </TextField>
        <Collapse in={needsCredentials}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Paste an access token, or an OAuth client ID and secret. Used in this browser only, never stored.
          </Typography>
          <TextField label="Access token" size="small" type="password" value={event.token} onChange={(e) => set({ token: e.target.value })} fullWidth sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField label="Client ID" size="small" value={event.clientId} onChange={(e) => set({ clientId: e.target.value })} fullWidth />
            <TextField label="Secret" size="small" type="password" value={event.clientSecret} onChange={(e) => set({ clientSecret: e.target.value })} fullWidth />
          </Box>
        </Collapse>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={props.onLoadEvent}
          disabled={busy || (needsCredentials && !event.token && !(event.clientId && event.clientSecret))}
          sx={{ textTransform: 'none' }}
        >
          Load SAR &amp; rainfall
        </Button>
      </Section>

      <Divider sx={{ mb: 1 }} />
      <Section title="Layers">
        {LAYERS.map(([key, label]) => (
          <FormControlLabel
            key={key}
            sx={{ display: 'flex', ml: 0, mr: 0, justifyContent: 'space-between' }}
            labelPlacement="start"
            control={<Switch size="small" checked={visible[key]} onChange={(e) => props.onVisibleChange({ ...visible, [key]: e.target.checked })} />}
            label={<Typography variant="body2">{label}</Typography>}
          />
        ))}
      </Section>

      <Divider sx={{ mb: 1 }} />
      <Section title="SAR water thresholds">
        <LabeledSlider label="VV below" unit=" dB" value={thresholds.vv} min={-30} max={-10} step={0.5} onChange={(vv) => props.onThresholdsChange({ ...thresholds, vv })} />
        <LabeledSlider label="VH below" unit=" dB" value={thresholds.vh} min={-35} max={-15} step={0.5} onChange={(vh) => props.onThresholdsChange({ ...thresholds, vh })} />
      </Section>

      <Divider sx={{ mb: 1 }} />
      <Section title="Risk model weights">
        {WEIGHTS.map(([key, w, label]) => (
          <LabeledSlider
            key={key}
            label={`${w} · ${label}`}
            value={weights[key]}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => props.onWeightsChange({ ...weights, [key]: v })}
          />
        ))}
      </Section>

      <Button
        fullWidth
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={props.onRecompute}
        disabled={busy}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        Recompute Risk
      </Button>
    </Box>
  );
}
