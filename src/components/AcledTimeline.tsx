'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import { MonthlyPoint, Measure, formatMonth } from '@/utils/acled';
import { unBlue } from '@/theme/unColors';
import { useI18n } from '@/i18n';

export type Speed = 1 | 2 | 4;
export const SPEEDS: Speed[] = [1, 2, 4];
/** How long each month stays on screen at 1x. */
export const MONTH_MS = 1200;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Month-by-month playback inside the selected range. `current` is the month
 *  on screen (always inside the range), or null when the whole range is shown. */
export function usePlayback(range: [number, number]) {
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const current = playhead === null ? null : clamp(playhead, range[0], range[1]);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      if (current === null || current >= range[1]) setPlaying(false);
      else setPlayhead(current + 1);
    }, MONTH_MS / speed);
    return () => clearTimeout(id);
  }, [playing, current, range, speed]);

  return {
    current,
    playing,
    speed,
    setSpeed,
    /** Play from the start of the range, or resume from the current month. */
    toggle: () => {
      if (playing) return setPlaying(false);
      if (current === null || current >= range[1]) setPlayhead(range[0]);
      setPlaying(true);
    },
    /** Show one month, paused. */
    seek: (index: number) => {
      setPlaying(false);
      setPlayhead(index);
    },
    /** Back to the whole range. */
    stop: () => {
      setPlaying(false);
      setPlayhead(null);
    },
  };
}

type DragMode = 'from' | 'to' | 'move' | 'scrub';

interface AcledTimelineProps {
  months: string[];
  series: MonthlyPoint[];
  measure: Measure;
  range: [number, number];
  current: number | null;
  playing: boolean;
  speed: Speed;
  partialNote?: string | null; // the last month is incomplete
  onRangeChange: (range: [number, number]) => void;
  onToggle: () => void;
  onStop: () => void;
  onSeek: (index: number) => void;
  onSpeedChange: (speed: Speed) => void;
  compact?: boolean; // controls above the track instead of beside it
}

const ACCENT = '#F2A900';
const KEY_STEPS = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
const BAR_COLOR: Record<Measure, string> = { events: unBlue.dark, fatalities: '#C62828' };

// A brush over a monthly sparkline: drag a handle to resize the range, drag
// the band to move it, click or drag the sparkline to scrub to a month.
// Time runs left to right in both languages (as on the charts); positions go
// in `style`, not `sx`, so the RTL stylis plugin doesn't mirror them.
export default function AcledTimeline({
  months,
  series,
  measure,
  range,
  current,
  playing,
  speed,
  partialNote,
  onRangeChange,
  onToggle,
  onStop,
  onSeek,
  onSpeedChange,
  compact = false,
}: AcledTimelineProps) {
  const { isAr, tr } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: DragMode; startIndex: number; startRange: [number, number] } | null>(null);
  const n = months.length;
  const [from, to] = range;
  const month = (i: number) => formatMonth(months[i], isAr);
  const max = Math.max(1, ...series.map((p) => p[measure]));
  const color = BAR_COLOR[measure];

  const indexAt = (clientX: number) => {
    const box = trackRef.current!.getBoundingClientRect();
    return clamp(Math.floor(((clientX - box.left) / box.width) * n), 0, n - 1);
  };

  const setRange = (next: [number, number]) => {
    if (next[0] !== from || next[1] !== to) onRangeChange(next);
  };

  const apply = (mode: DragMode, index: number) => {
    const d = drag.current!;
    if (mode === 'scrub') onSeek(index);
    else if (mode === 'from') setRange([Math.min(index, to), to]);
    else if (mode === 'to') setRange([from, Math.max(index, from)]);
    else {
      const width = d.startRange[1] - d.startRange[0];
      const start = clamp(d.startRange[0] + index - d.startIndex, 0, n - 1 - width);
      setRange([start, start + width]);
    }
  };

  const startDrag = (mode: DragMode, event: React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    trackRef.current!.setPointerCapture(event.pointerId);
    const index = indexAt(event.clientX);
    // A click on the empty brush track pulls the nearer edge to it.
    const resolved: DragMode = mode !== 'move' || (index >= from && index <= to) ? mode : index < from ? 'from' : 'to';
    drag.current = { mode: resolved, startIndex: index, startRange: range };
    apply(resolved, index);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (drag.current) apply(drag.current.mode, indexAt(event.clientX));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const handleKey = (edge: 'from' | 'to') => (event: React.KeyboardEvent) => {
    const step = (KEY_STEPS as Record<string, number | undefined>)[event.key];
    const value = edge === 'from' ? from : to;
    let next = step === undefined ? (event.key === 'Home' ? 0 : event.key === 'End' ? n - 1 : null) : value + step;
    if (next === null) return;
    event.preventDefault();
    next = edge === 'from' ? clamp(next, 0, to) : clamp(next, from, n - 1);
    setRange(edge === 'from' ? [next, to] : [from, next]);
  };

  const pct = (i: number) => `${(i / n) * 100}%`;
  const periodText = current !== null ? month(current) : from === to ? month(from) : `${month(from)} – ${month(to)}`;
  const years = months.map((m, i) => ({ i, year: m.slice(0, 4), first: i === 0 || m.endsWith('-01') })).filter((y) => y.first);

  const controls = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
      <Tooltip title={playing ? tr('Pause', 'إيقاف مؤقت') : tr('Play month by month', 'تشغيل شهرًا بشهر')}>
        <IconButton
          onClick={onToggle}
          size="small"
          aria-label={playing ? tr('Pause', 'إيقاف مؤقت') : tr('Play', 'تشغيل')}
          sx={{ bgcolor: unBlue.DEFAULT, color: 'white', '&:hover': { bgcolor: unBlue.dark } }}
        >
          {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title={tr('Stop and show the whole range', 'إيقاف وعرض الفترة كاملة')}>
        <span>
          <IconButton onClick={onStop} size="small" disabled={current === null} aria-label={tr('Stop', 'إيقاف')}>
            <StopIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Box sx={{ minWidth: compact ? 0 : 148, flex: compact ? 1 : undefined, px: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1, fontSize: '0.65rem' }}>
          {current !== null ? tr('Showing month', 'الشهر المعروض') : tr('Time range', 'الفترة الزمنية')}
        </Typography>
        <Typography variant="body2" aria-live="polite" sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
          {periodText}
        </Typography>
      </Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={speed}
        onChange={(_, v) => v && onSpeedChange(v)}
        aria-label={tr('Playback speed', 'سرعة التشغيل')}
      >
        {SPEEDS.map((s) => (
          <ToggleButton key={s} value={s} sx={{ px: 1, py: 0.25, fontSize: '0.7rem', fontFamily: 'Roboto, sans-serif' }}>
            {s}x
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );

  const track = (
    <Box
      ref={trackRef}
      dir="ltr"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      sx={{ position: 'relative', flex: 1, minWidth: 0, userSelect: 'none', touchAction: 'none' }}
    >
      {/* Sparkline: click or drag to scrub */}
      <Box
        onPointerDown={(e) => startDrag('scrub', e)}
        role="group"
        aria-label={tr('Monthly totals; click to show a month', 'المجاميع الشهرية؛ انقر لعرض شهر')}
        sx={{ display: 'flex', alignItems: 'flex-end', height: 38, gap: '1px', cursor: 'pointer' }}
      >
        {series.map((p, i) => {
          const inRange = i >= from && i <= to;
          const isCurrent = i === current;
          return (
            <Box
              key={p.month}
              title={`${month(i)}: ${p[measure].toLocaleString()}${i === n - 1 && partialNote ? ` — ${partialNote}` : ''}`}
              sx={{
                flex: 1,
                height: `${Math.max(4, (p[measure] / max) * 100)}%`,
                bgcolor: isCurrent ? ACCENT : inRange ? `${color}cc` : `${color}2e`,
                borderRadius: '2px 2px 0 0',
                outline: i === n - 1 ? `1px dashed ${color}88` : undefined,
                transition: 'background-color 0.2s',
              }}
            />
          );
        })}
      </Box>

      {/* Brush */}
      <Box onPointerDown={(e) => startDrag('move', e)} sx={{ position: 'relative', height: 16, mt: 0.5, bgcolor: 'rgba(0,0,0,0.06)', borderRadius: 8, cursor: 'pointer' }}>
        <Box
          onPointerDown={(e) => startDrag('move', e)}
          style={{ left: pct(from), width: pct(to - from + 1) }}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            bgcolor: `${unBlue.DEFAULT}55`,
            border: `1px solid ${unBlue.DEFAULT}`,
            borderRadius: 8,
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        />
        {(['from', 'to'] as const).map((edge) => {
          const value = edge === 'from' ? from : to;
          return (
            <Box
              key={edge}
              role="slider"
              tabIndex={0}
              aria-label={edge === 'from' ? tr('Range start', 'بداية الفترة') : tr('Range end', 'نهاية الفترة')}
              aria-valuemin={0}
              aria-valuemax={n - 1}
              aria-valuenow={value}
              aria-valuetext={month(value)}
              onPointerDown={(e) => startDrag(edge, e)}
              onKeyDown={handleKey(edge)}
              style={{ left: `calc(${pct(edge === 'from' ? from : to + 1)} - 6px)` }}
              sx={{
                position: 'absolute',
                top: -3,
                width: 12,
                height: 22,
                bgcolor: 'white',
                border: `2px solid ${unBlue.dark}`,
                borderRadius: 1,
                cursor: 'ew-resize',
                boxShadow: 1,
                '&:focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 1 },
              }}
            />
          );
        })}
        {current !== null && (
          <Box
            style={{ left: `calc(${pct(current)} + ${50 / n}% - 1px)` }}
            sx={{ position: 'absolute', top: -46, bottom: 0, width: 2, bgcolor: ACCENT, pointerEvents: 'none' }}
          />
        )}
      </Box>

      {/* Year ticks */}
      <Box sx={{ position: 'relative', height: 14, mt: 0.25 }}>
        {years.map((y) => (
          <Typography
            key={y.i}
            variant="caption"
            color="text.secondary"
            style={{ left: pct(y.i), borderLeft: '1px solid rgba(0,0,0,0.2)', paddingLeft: 4 }}
            sx={{ position: 'absolute', fontSize: '0.62rem', lineHeight: 1 }}
          >
            {y.year}
          </Typography>
        ))}
      </Box>
    </Box>
  );

  return compact ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {controls}
      {track}
    </Box>
  ) : (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {controls}
      {track}
    </Box>
  );
}
