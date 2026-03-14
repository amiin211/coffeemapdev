import { Box, Typography, Paper, Chip, Grid } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import HomeIcon from '@mui/icons-material/Home';
import WarningIcon from '@mui/icons-material/Warning';

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
  notes?: string;
}

interface StateDetailPanelProps {
  state: StateInfo | null;
  localities: LocalityInfo[];
}

export default function StateDetailPanel({ state, localities }: StateDetailPanelProps) {
  if (!state) {
    return (
      <Paper elevation={2} sx={{ p: 3, height: '100%', minHeight: 300 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LocationOnIcon color="primary" />
          <Typography variant="h6" sx={{ fontFamily: 'Fira Code, monospace' }}>
            State Details
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Click on a state in the map to view detailed information and affected localities.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%', minHeight: 300, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <LocationOnIcon color="primary" />
        <Typography variant="h5" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 700 }}>
          {state.name}
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon sx={{ color: '#e65100', fontSize: 20 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon sx={{ color: '#c62828', fontSize: 20 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon sx={{ color: '#fb8c00', fontSize: 20 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeIcon sx={{ color: '#6a1b9a', fontSize: 20 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {(state.homes_destroyed || 0).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Homes Destroyed
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HomeIcon sx={{ color: '#fb8c00', fontSize: 20 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {(state.homes_damaged || 0).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Homes Damaged
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {localities.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontFamily: 'Fira Code, monospace', mb: 2 }}>
            Affected Localities ({localities.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {localities.map((loc, idx) => (
              <Chip
                key={`${loc.name}-${idx}`}
                label={loc.name}
                size="small"
                sx={{
                  bgcolor: loc.affected ? 'error.light' : 'grey.200',
                  color: loc.affected ? 'error.dark' : 'text.primary',
                  fontWeight: loc.affected ? 600 : 400,
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
