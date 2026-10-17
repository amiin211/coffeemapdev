'use client';

import { Box, Typography } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, type ChartEvent, type TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { MonthlyPoint, NamedTotals, formatMonth } from '@/utils/acled';
import { unBlue } from '@/theme/unColors';
import { setChartFontForDocument, chartDir, useI18n } from '@/i18n';

if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
  setChartFontForDocument(ChartJS);
}

export type Measure = 'events' | 'fatalities';

const MEASURE_COLOR: Record<Measure, string> = { events: unBlue.dark, fatalities: '#C62828' };

const axisStyle = {
  grid: { color: 'rgba(0,0,0,0.06)' },
  ticks: { font: { size: 10 }, color: '#666' },
  border: { display: false },
};

function setPointer(event: ChartEvent, elements: unknown[], clickable: boolean) {
  const target = event.native?.target as HTMLElement | null | undefined;
  if (target) target.style.cursor = clickable && elements.length ? 'pointer' : 'default';
}

interface MonthlyChartProps {
  series: MonthlyPoint[];
  measure: Measure;
  monthRange: [number, number];
  partialNote?: string | null; // tooltip note for the last, incomplete month
  onMonthClick?: (index: number) => void;
  height: number;
}

// One measure per chart — fatalities run ~3× events and spike independently,
// so each gets its own y-axis in its own chart rather than a dual axis.
// Bars outside the selected time range stay visible but dimmed.
export function MonthlyChart({ series, measure, monthRange, partialNote, onMonthClick, height }: MonthlyChartProps) {
  const color = MEASURE_COLOR[measure];
  const last = series.length - 1;
  const { isAr, tr } = useI18n();
  const data = {
    labels: series.map((p) => formatMonth(p.month, isAr)),
    datasets: [
      {
        label: measure === 'events' ? tr('Events', 'الأحداث') : tr('Fatalities', 'الوفيات'),
        data: series.map((p) => p[measure]),
        backgroundColor: series.map((_, i) => (i >= monthRange[0] && i <= monthRange[1] ? `${color}dd` : `${color}33`)),
        borderRadius: 3,
        barPercentage: 0.85,
        categoryPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartDir(isAr),
        callbacks: {
          afterLabel: (item: TooltipItem<'bar'>) => (item.dataIndex === last && partialNote ? partialNote : ''),
        },
      },
    },
    scales: {
      x: { ...axisStyle, grid: { display: false }, ticks: { ...axisStyle.ticks, maxRotation: 0, autoSkipPadding: 12 } },
      y: { ...axisStyle, beginAtZero: true },
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (elements.length && onMonthClick) onMonthClick(elements[0].index);
    },
    onHover: (event: ChartEvent, elements: unknown[]) => setPointer(event, elements, !!onMonthClick),
  };

  return (
    <Box sx={{ height }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
        {measure === 'events' ? tr('Political Violence Events per Month', 'أحداث العنف السياسي شهريًا') : tr('Reported Fatalities per Month', 'الوفيات المُبلَّغ عنها شهريًا')}
      </Typography>
      <Box sx={{ height: height - 28 }}>
        <Bar data={data} options={options} />
      </Box>
    </Box>
  );
}

interface TopBarChartProps {
  title: string;
  entries: NamedTotals[];
  measure: Measure;
  selected: string | null;
  onSelect?: (name: string | null) => void;
  labelFor?: (name: string) => string; // display name for an entry (entries keep their data keys)
  height: number;
}

export function TopBarChart({ title, entries, measure, selected, onSelect, labelFor = (n) => n, height }: TopBarChartProps) {
  const color = MEASURE_COLOR[measure];
  const { isAr, tr } = useI18n();
  const measureLabel = (m: Measure) => (m === 'events' ? tr('Events', 'الأحداث') : tr('Fatalities', 'الوفيات'));
  const data = {
    labels: entries.map((e) => labelFor(e.name)),
    datasets: [
      {
        label: measureLabel(measure),
        data: entries.map((e) => e[measure]),
        backgroundColor: entries.map((e) => (!selected || e.name === selected ? `${color}dd` : `${color}33`)),
        borderRadius: 4,
        barPercentage: 0.8,
      },
    ],
  };

  const other: Measure = measure === 'events' ? 'fatalities' : 'events';
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartDir(isAr),
        callbacks: {
          afterLabel: (item: TooltipItem<'bar'>) => `${measureLabel(other)}: ${entries[item.dataIndex][other].toLocaleString()}`,
        },
      },
    },
    // Arabic mirrors the bars: labels on the right, growing leftwards.
    scales: {
      x: { ...axisStyle, beginAtZero: true, reverse: isAr },
      y: { ...axisStyle, position: isAr ? ('right' as const) : ('left' as const), grid: { display: false } },
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length || !onSelect) return;
      const name = entries[elements[0].index].name;
      onSelect(name === selected ? null : name);
    },
    onHover: (event: ChartEvent, elements: unknown[]) => setPointer(event, elements, !!onSelect),
  };

  return (
    <Box sx={{ height }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
        {title}
      </Typography>
      <Box sx={{ height: height - 28 }}>
        {entries.length ? (
          <Bar data={data} options={options} />
        ) : (
          <Typography variant="caption" color="text.secondary">{tr('No events in this period', 'لا أحداث في هذه الفترة')}</Typography>
        )}
      </Box>
    </Box>
  );
}
