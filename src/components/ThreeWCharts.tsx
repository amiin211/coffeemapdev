'use client';

import type { ReactNode } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';
import { OrgAggregate, ClusterAggregate, OrgTypeAggregate, MonthlyTrendPoint } from '@/utils/threew';
import { unBlue, unCategorical, unOrgTypeColors } from '@/theme/unColors';

if (typeof window !== 'undefined') {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);
}

const pieOptionsBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

const palette = unCategorical;

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

// Full opacity for the active selection (or everything, when nothing is
// selected in that dimension), dimmed for the rest — makes every chart
// visibly reflect the current cross-filter.
function emphasize(colors: string[], selectedIndex: number) {
  return colors.map((c, i) => (selectedIndex === -1 || i === selectedIndex ? withAlpha(c, 'ee') : withAlpha(c, '33')));
}

// A left-anchored, fixed-size chart circle + a custom legend list to its
// right — chart.js's built-in side legend re-centers the circle based on
// its own label widths, so two charts with differently-sized legends end
// up with their circles at different x positions. Rendering the legend
// ourselves keeps the circle's box a constant size regardless of labels.
interface LegendEntry {
  key: string;
  label: string;
  color: string;
  dimmed: boolean;
  onClick?: () => void;
}

function ChartWithLegend({ size, chart, entries }: { size: number; chart: ReactNode; entries: LegendEntry[] }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', height: size }}>
      <Box sx={{ width: size, height: size, flexShrink: 0 }}>{chart}</Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, overflowY: 'auto', height: '100%', flex: 1, minWidth: 0 }}>
        {entries.map((e) => (
          <Box
            key={e.key}
            onClick={e.onClick}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: e.onClick ? 'pointer' : 'default', opacity: e.dimmed ? 0.4 : 1 }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.color, flexShrink: 0 }} />
            <Typography variant="caption" noWrap sx={{ fontSize: '0.68rem' }}>
              {e.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

interface TopOrgsBarChartProps {
  orgs: OrgAggregate[];
  selectedOrg?: string | null;
  onOrgClick?: (acronym: string) => void;
  height?: number;
  bare?: boolean;
}

export function TopOrgsBarChart({ orgs, selectedOrg, onOrgClick, height = 240, bare = false }: TopOrgsBarChartProps) {
  const selectedIndex = selectedOrg ? orgs.findIndex((o) => o.org.acronym === selectedOrg) : -1;
  const colors = emphasize(orgs.map(() => unBlue.DEFAULT), selectedIndex);

  const data = {
    labels: orgs.map((o) => o.org.acronym),
    datasets: [
      {
        label: 'Activities',
        data: orgs.map((o) => o.activities),
        backgroundColor: colors,
        borderColor: unBlue.DEFAULT,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length || !onOrgClick) return;
      const acronym = orgs[elements[0].index].org.acronym;
      onOrgClick(acronym === selectedOrg ? '' : acronym);
    },
    onHover: (event: any, elements: unknown[]) => {
      if (event.native?.target) event.native.target.style.cursor = onOrgClick && elements.length ? 'pointer' : 'default';
    },
  };

  const content = (
    <>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Top Organizations
      </Typography>
      <Box sx={{ height: height - 40 }}>
        <Bar data={data} options={options} />
      </Box>
    </>
  );

  return bare ? <Box sx={{ height }}>{content}</Box> : <Paper elevation={2} sx={{ p: 2, height }}>{content}</Paper>;
}

interface ClusterBreakdownPieChartProps {
  clusters: ClusterAggregate[];
  selectedCluster?: string | null;
  onClusterClick?: (cluster: string) => void;
  height?: number;
  bare?: boolean;
}

export function ClusterBreakdownPieChart({ clusters, selectedCluster, onClusterClick, height = 220, bare = false }: ClusterBreakdownPieChartProps) {
  const selectedIndex = selectedCluster ? clusters.findIndex((c) => c.cluster === selectedCluster) : -1;
  const colors = emphasize(clusters.map((_, i) => palette[i % palette.length]), selectedIndex);

  const data = {
    labels: clusters.map((c) => c.cluster),
    datasets: [
      {
        data: clusters.map((c) => c.activities),
        backgroundColor: colors,
        borderColor: clusters.map((_, i) => palette[i % palette.length]),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...pieOptionsBase,
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length || !onClusterClick) return;
      const cluster = clusters[elements[0].index].cluster;
      onClusterClick(cluster === selectedCluster ? '' : cluster);
    },
    onHover: (event: any, elements: unknown[]) => {
      if (event.native?.target) event.native.target.style.cursor = onClusterClick && elements.length ? 'pointer' : 'default';
    },
  };

  const entries: LegendEntry[] = clusters.map((c, i) => ({
    key: c.cluster,
    label: c.cluster,
    color: palette[i % palette.length],
    dimmed: selectedIndex !== -1 && i !== selectedIndex,
    onClick: onClusterClick ? () => onClusterClick(c.cluster === selectedCluster ? '' : c.cluster) : undefined,
  }));

  const content = (
    <>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Cluster Breakdown
      </Typography>
      <ChartWithLegend size={height - 40} chart={<Pie data={data} options={options} />} entries={entries} />
    </>
  );

  return bare ? <Box sx={{ height }}>{content}</Box> : <Paper elevation={2} sx={{ p: 2, height }}>{content}</Paper>;
}

const orgTypeColors = unOrgTypeColors;

interface OrgTypeDoughnutChartProps {
  orgTypes: OrgTypeAggregate[];
  selectedOrgType?: string | null;
  onOrgTypeClick?: (type: string) => void;
  height?: number;
  bare?: boolean;
}

export function OrgTypeDoughnutChart({ orgTypes, selectedOrgType, onOrgTypeClick, height = 200, bare = false }: OrgTypeDoughnutChartProps) {
  const selectedIndex = selectedOrgType ? orgTypes.findIndex((t) => t.type === selectedOrgType) : -1;
  const colors = emphasize(orgTypes.map((t) => orgTypeColors[t.type] ?? '#616161'), selectedIndex);

  const data = {
    labels: orgTypes.map((t) => t.type),
    datasets: [
      {
        data: orgTypes.map((t) => t.activities),
        backgroundColor: colors,
        borderColor: orgTypes.map((t) => orgTypeColors[t.type] ?? '#616161'),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...pieOptionsBase,
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length || !onOrgTypeClick) return;
      const type = orgTypes[elements[0].index].type;
      onOrgTypeClick(type === selectedOrgType ? '' : type);
    },
    onHover: (event: any, elements: unknown[]) => {
      if (event.native?.target) event.native.target.style.cursor = onOrgTypeClick && elements.length ? 'pointer' : 'default';
    },
  };

  const entries: LegendEntry[] = orgTypes.map((t) => ({
    key: t.type,
    label: t.type,
    color: orgTypeColors[t.type] ?? '#616161',
    dimmed: selectedIndex !== -1 && t.type !== selectedOrgType,
    onClick: onOrgTypeClick ? () => onOrgTypeClick(t.type === selectedOrgType ? '' : t.type) : undefined,
  }));

  const content = (
    <>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Organization Type
      </Typography>
      <ChartWithLegend size={height - 40} chart={<Doughnut data={data} options={options} />} entries={entries} />
    </>
  );

  return bare ? <Box sx={{ height }}>{content}</Box> : <Paper elevation={2} sx={{ p: 2, height }}>{content}</Paper>;
}

interface MonthlyTrendChartProps {
  trend: MonthlyTrendPoint[];
  selectedMonth?: string | null;
  onMonthClick?: (month: string) => void;
  height?: number;
}

export function MonthlyTrendChart({ trend, selectedMonth, onMonthClick, height = 200 }: MonthlyTrendChartProps) {
  const selectedIndex = selectedMonth ? trend.findIndex((t) => t.month === selectedMonth) : -1;
  const pointRadius = trend.map((_, i) => (selectedIndex === i ? 7 : 4));
  const pointColor = trend.map((_, i) => (selectedIndex === -1 || selectedIndex === i ? unBlue.dark : `${unBlue.dark}55`));

  const data = {
    labels: trend.map((t) => t.month),
    datasets: [
      {
        label: 'Activities',
        data: trend.map((t) => t.activities),
        borderColor: unBlue.dark,
        backgroundColor: `${unBlue.DEFAULT}26`,
        pointBackgroundColor: pointColor,
        pointBorderColor: pointColor,
        pointRadius,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
    onClick: (_: unknown, elements: { index: number }[]) => {
      if (!elements.length || !onMonthClick) return;
      const month = trend[elements[0].index].month;
      onMonthClick(month === selectedMonth ? '' : month);
    },
    onHover: (event: any, elements: unknown[]) => {
      if (event.native?.target) event.native.target.style.cursor = onMonthClick && elements.length ? 'pointer' : 'default';
    },
  };

  return (
    <Box sx={{ height }}>
      <Line data={data} options={options} />
    </Box>
  );
}
