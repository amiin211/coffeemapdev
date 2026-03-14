'use client';

import { Box, Typography, Paper, Chip, Grid } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import HomeIcon from '@mui/icons-material/Home';
import WarningIcon from '@mui/icons-material/Warning';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface StateInfo {
  name: string;
  affected: number | null;
  deaths: number | null;
  injured?: number | null;
  homes_destroyed: number | null;
  homes_damaged: number | null;
}

interface LocalityInfo {
  name: string;
  state: string;
  affected: number | null;
}

interface CholeraData {
  state: string;
  cases: number;
}

interface DataPanelProps {
  state: StateInfo | null;
  localities: LocalityInfo[];
  choleraData: CholeraData[];
  totalCholeraDeaths?: number;
}

export default function DataPanel({ state, localities, choleraData, totalCholeraDeaths = 112 }: DataPanelProps) {
  const totalCholeraCases = choleraData.reduce((sum, c) => sum + c.cases, 0);
  const stateCholera = state ? choleraData.find(c => c.state === state.name) : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  const choleraChartData = {
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
        borderColor: ['#c62828', '#1976d2', '#6a1b9a', '#2e7d32', '#00838f'],
        borderWidth: 2,
      },
    ],
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Paper elevation={2} sx={{ p: 1, flex: '1 1 auto', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LocationOnIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontFamily: 'Fira Code, monospace' }}>
            {state ? state.name : 'State Details'}
          </Typography>
        </Box>

        <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600, color: '#9c27b0' }}>
            Cholera
          </Typography>
          {state ? (
            stateCholera ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <HealthAndSafetyIcon sx={{ color: '#9c27b0', fontSize: 14 }} />
                <Typography variant="body2">
                  <strong>{stateCholera.cases.toLocaleString()}</strong> cases
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                N/A
              </Typography>
            )
          ) : (
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HealthAndSafetyIcon sx={{ color: '#9c27b0', fontSize: 14 }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {totalCholeraCases.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocalHospitalIcon sx={{ color: '#d32f2f', fontSize: 14 }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {totalCholeraDeaths}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </Box>

        {!state ? (
          <Typography variant="body2" color="text.secondary">
            Click on a state in the map to view detailed information and affected localities.
          </Typography>
        ) : (
          <>
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PeopleIcon sx={{ color: '#e65100', fontSize: 14 }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {state.affected?.toLocaleString() || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Affected
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {state.deaths !== null && (
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WarningIcon sx={{ color: '#c62828', fontSize: 14 }} />
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {state.deaths}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Deaths
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              
              {state.injured !== null && (
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WarningIcon sx={{ color: '#fb8c00', fontSize: 14 }} />
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {state.injured}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Injured
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HomeIcon sx={{ color: '#6a1b9a', fontSize: 14 }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {(state.homes_destroyed || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Destroyed
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HomeIcon sx={{ color: '#fb8c00', fontSize: 14 }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {(state.homes_damaged || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Damaged
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {localities.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
                  Localities ({localities.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.5 }}>
                  {localities.map((loc, idx) => (
                    <Chip
                      key={`${loc.name}-${idx}`}
                      label={loc.name}
                      size="small"
                      sx={{
                        bgcolor: loc.affected ? 'error.light' : 'grey.200',
                        color: loc.affected ? 'error.dark' : 'text.primary',
                        fontWeight: loc.affected ? 600 : 400,
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 1, height: 150 }}>
        <Typography variant="caption" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
          Cholera by State
        </Typography>
        <Box sx={{ height: 120 }}>
          <Bar data={choleraChartData} options={chartOptions} />
        </Box>
      </Paper>
    </Box>
  );
}
