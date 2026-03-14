import { Box, Typography, Paper } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import HomeIcon from '@mui/icons-material/Home';
import WarningIcon from '@mui/icons-material/Warning';
import MovingIcon from '@mui/icons-material/Moving';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

interface StateInfo {
  name: string;
  affected: number | null;
  deaths: number | null;
  injured?: number | null;
  homes_destroyed: number | null;
  homes_damaged: number | null;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: 'people' | 'home' | 'death' | 'evacuation' | 'cholera_cases' | 'cholera_deaths';
  color: string;
  subtitle?: string;
}

const iconMap = {
  people: PeopleIcon,
  home: HomeIcon,
  death: WarningIcon,
  evacuation: MovingIcon,
  cholera_cases: HealthAndSafetyIcon,
  cholera_deaths: LocalHospitalIcon,
};

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const Icon = iconMap[icon];
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        height: 100,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -15,
          right: -15,
          opacity: 0.08,
          color: color,
        }}
      >
        <Icon sx={{ fontSize: 80 }} />
      </Box>
      
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 2,
          minWidth: 48,
        }}
      >
        <Icon sx={{ color, fontSize: 28 }} />
      </Box>
      
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            fontFamily: 'Fira Code, monospace',
            color: color,
            lineHeight: 1.2
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

interface CholeraInfo {
  state: string;
  cases: number;
}

interface StatCardsProps {
  total_affected: number;
  displaced: number;
  deaths: number;
  homes_total: number;
  total_cholera: number;
  choleraData?: CholeraInfo[];
  selectedState?: StateInfo | null;
}

export default function StatCards({ total_affected, displaced, deaths, homes_total, total_cholera, choleraData, selectedState }: StatCardsProps) {
  const isStateSelected = !!selectedState;
  const stateCholera = isStateSelected && choleraData ? choleraData.find(c => c.state === selectedState!.name) : null;
  const choleraValue = stateCholera ? stateCholera.cases : (isStateSelected ? "N/A" : total_cholera);

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        mb: 4,
        width: '100%',
        '& > *': {
          flex: '1 1 calc(16.67% - 16px)',
          minWidth: 140,
        }
      }}
    >
      <StatCard
        title={isStateSelected ? selectedState!.name : "People Affected"}
        value={selectedState?.affected ?? total_affected}
        icon="people"
        color="#e65100"
        subtitle={isStateSelected ? "affected" : "in 63 localities"}
      />
      <StatCard
        title={isStateSelected ? "Deaths" : "Deaths"}
        value={selectedState?.deaths ?? deaths}
        icon="death"
        color="#c62828"
        subtitle="flood deaths"
      />
      {!isStateSelected && (
        <StatCard
          title="Displaced"
          value={displaced}
          icon="evacuation"
          color="#1565c0"
          subtitle="people displaced"
        />
      )}
      <StatCard
        title={isStateSelected ? "Homes Destroyed" : "Homes Destroyed"}
        value={selectedState?.homes_destroyed ?? homes_total}
        icon="home"
        color="#c62828"
        subtitle="destroyed"
      />
      <StatCard
        title={isStateSelected ? "Homes Damaged" : "Homes Damaged"}
        value={selectedState?.homes_damaged ?? homes_total}
        icon="home"
        color="#6a1b9a"
        subtitle="damaged"
      />
      <StatCard
        title={isStateSelected ? "Cholera Affected" : "Cholera Affected"}
        value={choleraValue}
        icon="cholera_cases"
        color="#9c27b0"
        subtitle="cases"
      />
    </Box>
  );
}
