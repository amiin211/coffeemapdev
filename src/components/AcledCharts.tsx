'use client';

import { Box, Typography } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { MonthlyPoint, NamedTotals, formatMonth } from '@/utils/acled';
import { unBlue } from '@/theme/unColors';

if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
}

export type Measure = 'events' | 'fatalities';

const MEASURE_COLOR: Record<Measure, string> = { events: unBlue.dark, fatalities: '#C62828' };

const axisStyle = {
  grid: { color: 'rgba(0,0,0,0.06)' },
  ticks: { font: { size: 10 }, color: '#666' },
  border: { display: false },
};

function setPointer(event: any, elements: unknown[], clickable: boolean) {
  if (event.native?.target) event.native.target.style.cursor = clickable && elements.length ? 'pointer' : 'default';
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
  const data = {
    labels: series.map((p) => formatMonth(p.month)),
    datasets: [
      {
        label: measure === 'events' ? 'Events' : 'Fatalities',
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
        callbacks: {
          afterLabel: (item: any) => (item.dataIndex === last && partialNote ? partialNote : ''),
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
    onHover: (event: any, elements: unknown[]) => setPointer(event, elements, !!onMonthClick),
  };

  return (
    <Box sx={{ height }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
        {measure === 'events' ? 'Political Violence Events per Month' : 'Reported Fatalities per Month'}
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
  height: number;
}

export function TopBarChart({ title, entries, measure, selected, onSelect, height }: TopBarChartProps) {
  const color = MEASURE_COLOR[measure];
  const data = {
    labels: entries.map((e) => e.name),
    datasets: [
      {
        label: measure === 'events' ? 'Events' : 'Fatalities',
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
        callbacks: {
          afterLabel: (item: any) =>
            `${other === 'events' ? 'Events' : 'Fatalities'}: ${entries[item.dataIndex][other].toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { ...axisStyle, beginAtZero: true },
      y: { ...axisStyle, grid: { display: false } },
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length || !onSelect) return;
      const name = entries[elements[0].index].name;
      onSelect(name === selected ? null : name);
    },
    onHover: (event: any, elements: unknown[]) => setPointer(event, elements, !!onSelect),
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
          <Typography variant="caption" color="text.secondary">No events in this period</Typography>
        )}
      </Box>
    </Box>
  );
}
