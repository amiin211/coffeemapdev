'use client';

import { Box, Typography, Paper } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Bubble } from 'react-chartjs-2';

if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
  );
}

interface StateData {
  name: string;
  affected: number | null;
  deaths: number | null;
  homes_destroyed: number | null;
  homes_damaged: number | null;
  has_data?: boolean;
}

interface LocalityData {
  name: string;
  state: string;
  lat: number;
  lon: number;
  affected: number | null;
}

interface CholeraData {
  state: string;
  cases: number;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};

const bubbleOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      min: 0,
      max: 120,
      display: false,
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Affected (thousands)',
      },
    },
  },
};

export function TopStatesBarChart({ statesData, localitiesData, selectedStateName }: { 
  statesData: StateData[]; 
  localitiesData?: LocalityData[];
  selectedStateName?: string | null;
}) {
  let data;
  
  if (selectedStateName && localitiesData) {
    const stateLocalities = localitiesData
      .filter(l => l.state === selectedStateName)
      .sort((a, b) => (b.affected || 0) - (a.affected || 0));
    
    data = {
      labels: stateLocalities.map(l => l.name),
      datasets: [
        {
          label: 'People Affected',
          data: stateLocalities.map(l => l.affected || 0),
          backgroundColor: 'rgba(25, 118, 210, 0.8)',
          borderColor: 'rgba(25, 118, 210, 1)',
          borderWidth: 1,
        },
      ],
    };
  } else {
    const statesWithData = statesData.filter(s => s.has_data).sort((a, b) => (b.affected || 0) - (a.affected || 0));
    const topStates = statesWithData.slice(0, 6);
    
    data = {
      labels: topStates.map(s => s.name),
      datasets: [
        {
          label: 'People Affected',
          data: topStates.map(s => s.affected || 0),
          backgroundColor: 'rgba(230, 81, 0, 0.8)',
          borderColor: 'rgba(230, 81, 0, 1)',
          borderWidth: 1,
        },
      ],
    };
  }

  const title = selectedStateName 
    ? `Localities in ${selectedStateName}`
    : 'Top Affected States';

  return (
    <Paper elevation={2} sx={{ p: 2, height: 200 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ height: 160 }}>
        <Bar data={data} options={chartOptions} />
      </Box>
    </Paper>
  );
}

export function HousingPieChart({ homesDestroyed, homesDamaged }: { homesDestroyed: number; homesDamaged: number }) {
  const data = {
    labels: ['Destroyed', 'Damaged'],
    datasets: [
      {
        data: [homesDestroyed, homesDamaged],
        backgroundColor: ['#c62828', '#fb8c00'],
        borderColor: ['#b71c1c', '#ef6c00'],
        borderWidth: 2,
      },
    ],
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: 200 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Housing Damage (National)
      </Typography>
      <Box sx={{ height: 160 }}>
        <Pie data={data} options={pieOptions} />
      </Box>
    </Paper>
  );
}

export function AffectedBubbleChart({ statesData, localitiesData, selectedStateName }: { 
  statesData: StateData[];
  localitiesData?: LocalityData[];
  selectedStateName?: string | null;
}) {
  let datasets;
  
  if (selectedStateName && localitiesData) {
    const stateLocalities = localitiesData
      .filter(l => l.state === selectedStateName)
      .sort((a, b) => (b.affected || 0) - (a.affected || 0))
      .slice(0, 10);
    
    const colors = ['#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#42a5f5', '#1e88e5'];
    
    datasets = stateLocalities.map((loc, index) => ({
      label: loc.name,
      data: [
        {
          x: index * 10 + 5,
          y: (loc.affected || 0) / 1000,
          r: Math.max(8, Math.min(25, ((loc.affected || 0) / 2000))),
        },
      ],
      backgroundColor: colors[index % colors.length] + '80',
      borderColor: colors[index % colors.length],
      borderWidth: 2,
    }));
  } else {
    const statesWithData = statesData.filter(s => s.has_data).sort((a, b) => (b.affected || 0) - (a.affected || 0));
    const topStates = statesWithData.slice(0, 6);
    const colors = ['#e65100', '#1565c0', '#6a1b9a', '#2e7d32', '#c62828', '#00838f'];
    
    datasets = topStates.map((state, index) => ({
      label: state.name,
      data: [
        {
          x: index * 20 + 10,
          y: (state.affected || 0) / 1000,
          r: Math.max(10, Math.min(40, ((state.affected || 0) / 10000))),
        },
      ],
      backgroundColor: colors[index % colors.length] + '80',
      borderColor: colors[index % colors.length],
      borderWidth: 2,
    }));
  }

  const data = { datasets };
  const title = selectedStateName 
    ? `Localities in ${selectedStateName}`
    : 'Affected vs Impact';

  return (
    <Paper elevation={2} sx={{ p: 2, height: 200 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ height: 160 }}>
        <Bubble data={data} options={bubbleOptions} />
      </Box>
    </Paper>
  );
}

export function CholeraBarChart({ choleraData }: { choleraData: CholeraData[] }) {
  const data = {
    labels: choleraData.map(c => c.state),
    datasets: [
      {
        label: 'Cholera Cases',
        data: choleraData.map(c => c.cases),
        backgroundColor: [
          'rgba(198, 40, 40, 0.8)',
          'rgba(25, 118, 210, 0.8)',
          'rgba(106, 27, 154, 0.8)',
          'rgba(46, 125, 50, 0.8)',
          'rgba(0, 131, 143, 0.8)',
        ],
        borderColor: [
          '#c62828',
          '#1976d2',
          '#6a1b9a',
          '#2e7d32',
          '#00838f',
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: 200 }}>
      <Typography variant="subtitle2" sx={{ fontFamily: 'Fira Code, monospace', mb: 1 }}>
        Cholera Cases by State
      </Typography>
      <Box sx={{ height: 160 }}>
        <Bar data={data} options={chartOptions} />
      </Box>
    </Paper>
  );
}
