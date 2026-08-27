'use client';

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

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } },
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right' as const, labels: { boxWidth: 10, font: { size: 10 } } } },
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } },
};

const palette = unCategorical;

export function TopOrgsBarChart({ orgs }: { orgs: OrgAggregate[] }) {
  const data = {
    labels: orgs.map((o) => o.org.acronym),
    datasets: [
      {
        label: 'Activities',
        data: orgs.map((o) => o.activities),
        backgroundColor: `${unBlue.DEFAULT}cc`,
        borderColor: unBlue.DEFAULT,
        borderWidth: 1,
      },
    ],
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: 240 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Top Organizations
      </Typography>
      <Box sx={{ height: 200 }}>
        <Bar data={data} options={barOptions} />
      </Box>
    </Paper>
  );
}

export function ClusterBreakdownPieChart({ clusters }: { clusters: ClusterAggregate[] }) {
  const data = {
    labels: clusters.map((c) => c.cluster),
    datasets: [
      {
        data: clusters.map((c) => c.activities),
        backgroundColor: clusters.map((_, i) => palette[i % palette.length] + 'cc'),
        borderColor: clusters.map((_, i) => palette[i % palette.length]),
        borderWidth: 1,
      },
    ],
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: 220 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Cluster Breakdown
      </Typography>
      <Box sx={{ height: 180 }}>
        <Pie data={data} options={pieOptions} />
      </Box>
    </Paper>
  );
}

const orgTypeColors = unOrgTypeColors;

export function OrgTypeDoughnutChart({ orgTypes }: { orgTypes: OrgTypeAggregate[] }) {
  const data = {
    labels: orgTypes.map((t) => t.type),
    datasets: [
      {
        data: orgTypes.map((t) => t.activities),
        backgroundColor: orgTypes.map((t) => (orgTypeColors[t.type] ?? '#616161') + 'cc'),
        borderColor: orgTypes.map((t) => orgTypeColors[t.type] ?? '#616161'),
        borderWidth: 1,
      },
    ],
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: 200 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Organization Type
      </Typography>
      <Box sx={{ height: 160 }}>
        <Doughnut data={data} options={pieOptions} />
      </Box>
    </Paper>
  );
}

export function MonthlyTrendChart({ trend }: { trend: MonthlyTrendPoint[] }) {
  const data = {
    labels: trend.map((t) => t.month),
    datasets: [
      {
        label: 'Activities',
        data: trend.map((t) => t.activities),
        borderColor: unBlue.dark,
        backgroundColor: `${unBlue.DEFAULT}26`,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: 200 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Monthly Trend (Jan–Jun 2026)
      </Typography>
      <Box sx={{ height: 160 }}>
        <Line data={data} options={lineOptions} />
      </Box>
    </Paper>
  );
}
