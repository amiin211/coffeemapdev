'use client';

import { Box, Typography } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, type ChartEvent, type ActiveElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { CHOLERA_COLOR, DAMAGED_COLOR, DESTROYED_COLOR, FLOOD_CLASSES, fmt } from '@/utils/sudanFlood';
import { setChartFontForDocument, chartDir, useI18n } from '@/i18n';

if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
  setChartFontForDocument(ChartJS);
}

const axisStyle = {
  grid: { color: 'rgba(0,0,0,0.06)' },
  ticks: { font: { size: 10 }, color: '#666' },
  border: { display: false },
};

function ChartTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  );
}

interface Bar {
  pcode: string;
  name: string;
  value: number;
}

interface RankedBarsProps {
  title: string;
  subtitle?: string;
  bars: Bar[];
  color: string;
  label: string;
  selected: string | null;
  onSelect: (pcode: string) => void;
  height: number;
}

// Horizontal bars, largest first; the selected state is highlighted and the
// others dim. Clicking a bar selects that state.
export function RankedBars({ title, subtitle, bars, color, label, selected, onSelect, height }: RankedBarsProps) {
  const sorted = [...bars].sort((a, b) => b.value - a.value);
  const { isAr } = useI18n();
  const data = {
    labels: sorted.map((b) => b.name),
    datasets: [
      {
        label,
        data: sorted.map((b) => b.value),
        backgroundColor: sorted.map((b) => (!selected || b.pcode === selected ? color : `${color}40`)),
        borderRadius: 3,
        barPercentage: 0.8,
      },
    ],
  };
  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: { ...chartDir(isAr), callbacks: { label: (ctx: { raw: unknown }) => `${label}: ${fmt(ctx.raw as number)}` } },
    },
    // Arabic mirrors the bars: labels on the right, growing leftwards.
    scales: {
      x: { ...axisStyle, reverse: isAr, ticks: { ...axisStyle.ticks, callback: (v: string | number) => (Number(v) >= 1000 ? `${Number(v) / 1000}k` : v) } },
      y: { ...axisStyle, position: isAr ? ('right' as const) : ('left' as const), grid: { display: false }, ticks: { ...axisStyle.ticks, font: { size: 11 } } },
    },
    onClick: (_e: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length) onSelect(sorted[elements[0].index].pcode);
    },
    onHover: (event: ChartEvent, elements: ActiveElement[]) => {
      const target = event.native?.target as HTMLElement | undefined;
      if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
    },
  };
  return (
    <Box>
      <ChartTitle title={title} subtitle={subtitle} />
      <Box sx={{ height }}>
        <Bar data={data} options={options} />
      </Box>
    </Box>
  );
}

export function HousingChart({ destroyed, damaged, place, height }: { destroyed: number | null; damaged: number | null; place: string; height: number }) {
  const known = destroyed != null || damaged != null;
  const { isAr, tr } = useI18n();
  const data = {
    labels: [tr('Destroyed', 'مدمَّرة'), tr('Damaged', 'متضررة')],
    datasets: [{ data: [destroyed ?? 0, damaged ?? 0], backgroundColor: [DESTROYED_COLOR, DAMAGED_COLOR], borderColor: '#fff', borderWidth: 2 }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    animation: { duration: 300 },
    plugins: {
      legend: { position: 'bottom' as const, ...chartDir(isAr), labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { ...chartDir(isAr), callbacks: { label: (ctx: { label: string; raw: unknown }) => `${ctx.label}: ${fmt(ctx.raw as number)} ${tr('homes', 'منزلًا')}` } },
    },
  };
  const total = (destroyed ?? 0) + (damaged ?? 0);
  return (
    <Box>
      <ChartTitle title={tr('Housing damage', 'أضرار المساكن')} subtitle={place} />
      <Box sx={{ height, position: 'relative' }}>
        {known ? (
          <>
            <Doughnut data={data} options={options} />
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>{fmt(total)}</Typography>
              <Typography variant="caption" color="text.secondary">{tr('homes', 'منزلًا')}</Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">{tr('No housing figures reported for this state.', 'لا توجد أرقام مُبلَّغة عن المساكن لهذه الولاية.')}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export const FLOOD_BAR_COLOR = FLOOD_CLASSES[2].color;
export const CHOLERA_BAR_COLOR = CHOLERA_COLOR;
