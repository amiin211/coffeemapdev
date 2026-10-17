'use client';

import { Box, Typography } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  type ChartDataset,
  type ChartEvent,
  type ChartOptions,
  type ChartType,
  type Plugin,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { CROP_COLORS, CropIndex, INDEX_LABEL, cropLabel, formatDate, formatMonthYear } from '@/utils/crop';
import { setChartFontForDocument, chartDir, useI18n } from '@/i18n';

if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);
  setChartFontForDocument(ChartJS);
}

const FIELD_COLOR = '#2E7D32';
const REFERENCE_COLOR = '#90A4AE';
const ANOMALY_COLOR = '#D50000';

const axisStyle = {
  grid: { color: 'rgba(0,0,0,0.06)' },
  ticks: { font: { size: 10 }, color: '#666' },
  border: { display: false },
};

interface DateMarkerOptions {
  index?: number;
}

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match Chart.js's generic signature
  interface PluginOptionsByType<TType extends ChartType> {
    dateMarker?: DateMarkerOptions;
  }
}

// Vertical rule at the selected date.
const dateMarker: Plugin<'line', DateMarkerOptions> = {
  id: 'dateMarker',
  afterDatasetsDraw(chart, _args, opts) {
    if (opts?.index == null) return;
    const x = chart.scales.x.getPixelForValue(opts.index);
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(27,94,32,0.75)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

interface TimeSeriesChartProps {
  dates: string[];
  values: (number | null)[];
  reference?: (number | null)[]; // farmland-wide mean, for comparison
  label: string;
  index: CropIndex;
  anomalies: number[];
  dateIndex: number;
  onDateClick: (i: number) => void;
  height: number;
}

export function TimeSeriesChart({ dates, values, reference, label, index, anomalies, dateIndex, onDateClick, height }: TimeSeriesChartProps) {
  const anomalySet = new Set(anomalies);
  const { isAr, tr } = useI18n();
  const datasets: ChartDataset<'line', (number | null)[]>[] = [
    {
      label,
      data: values,
      borderColor: FIELD_COLOR,
      backgroundColor: `${FIELD_COLOR}1f`,
      fill: true,
      borderWidth: 2,
      tension: 0.25,
      spanGaps: true,
      // Anomalies drawn as red markers on the curve; other points hidden.
      pointRadius: values.map((_, i) => (anomalySet.has(i) ? 4.5 : 0)),
      pointHoverRadius: values.map((_, i) => (anomalySet.has(i) ? 6 : 4)),
      pointBackgroundColor: values.map((_, i) => (anomalySet.has(i) ? ANOMALY_COLOR : FIELD_COLOR)),
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
    },
  ];
  if (reference) {
    datasets.push({
      label: tr('All fields (mean)', 'كل الحقول (المتوسط)'),
      data: reference,
      borderColor: REFERENCE_COLOR,
      borderWidth: 1.5,
      borderDash: [4, 3],
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.25,
      spanGaps: true,
    });
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: !!reference, position: 'top', align: 'end', ...chartDir(isAr), labels: { boxWidth: 14, boxHeight: 2, font: { size: 10 } } },
      tooltip: {
        ...chartDir(isAr),
        callbacks: {
          title: (items) => formatDate(dates[items[0].dataIndex], isAr),
          label: (item) => (item.raw == null ? `${item.dataset.label}: ${tr('no clear view', 'لا توجد رؤية صافية')}` : `${item.dataset.label}: ${(item.raw as number).toFixed(2)}`),
          afterBody: (items) => (anomalySet.has(items[0].dataIndex) ? tr('Anomaly: below seasonal mean − 2σ', 'شذوذ: أقل من المتوسط الموسمي − 2σ') : ''),
        },
      },
      dateMarker: { index: dateIndex },
    },
    scales: {
      x: {
        ...axisStyle,
        grid: { display: false },
        ticks: {
          ...axisStyle.ticks,
          maxRotation: 0,
          autoSkip: false,
          // One tick per quarter.
          callback: (_: unknown, i: number) => {
            const d = dates[i];
            const prev = dates[i - 1];
            return d && (!prev || d.slice(0, 7) !== prev.slice(0, 7)) && ['01', '04', '07', '10'].includes(d.slice(5, 7))
              ? formatMonthYear(d, isAr)
              : null;
          },
        },
      },
      y: { ...axisStyle, min: index === 'ndvi' ? -0.1 : -0.1, suggestedMax: 0.8, title: { display: true, text: INDEX_LABEL[index], font: { size: 10 } } },
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (elements.length) onDateClick(elements[0].index);
    },
  };

  return (
    <Box sx={{ height }}>
      <Line data={{ labels: dates, datasets }} options={options} plugins={[dateMarker]} />
    </Box>
  );
}

interface CropSummaryChartProps {
  entries: { crop: string; fields: number; area: number }[];
  selected: string | null;
  onSelect: (crop: string | null) => void;
  height: number;
}

export function CropSummaryChart({ entries, selected, onSelect, height }: CropSummaryChartProps) {
  const { isAr, tr } = useI18n();
  const data = {
    labels: entries.map((e) => cropLabel(e.crop, isAr)),
    datasets: [
      {
        label: tr('Area (ha)', 'المساحة (هكتار)'),
        data: entries.map((e) => e.area),
        backgroundColor: entries.map((e) => `${CROP_COLORS[e.crop]}${!selected || e.crop === selected ? 'dd' : '44'}`),
        borderRadius: 4,
        barPercentage: 0.8,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartDir(isAr),
        callbacks: {
          label: (item) => `${Math.round(item.raw as number).toLocaleString()} ${tr('ha', 'هكتار')}`,
          afterLabel: (item) => tr(`${entries[item.dataIndex].fields} fields`, `${entries[item.dataIndex].fields} حقلًا`),
        },
      },
    },
    // Arabic mirrors the bars: labels on the right, growing leftwards.
    scales: {
      x: { ...axisStyle, reverse: isAr, beginAtZero: true, title: { display: true, text: tr('hectares', 'هكتار'), font: { size: 10 } } },
      y: { ...axisStyle, position: isAr ? 'right' : 'left', grid: { display: false } },
    },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length) return;
      const crop = entries[elements[0].index].crop;
      onSelect(crop === selected ? null : crop);
    },
    onHover: (event: ChartEvent, elements: unknown[]) => {
      const target = event.native?.target as HTMLElement | null | undefined;
      if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
    },
  };
  return (
    <Box sx={{ height }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', mb: 0.5 }}>
        {tr('Crop Classification (latest season)', 'تصنيف المحاصيل (أحدث موسم)')}
      </Typography>
      <Box sx={{ height: height - 28 }}>
        <Bar data={data} options={options} />
      </Box>
    </Box>
  );
}
