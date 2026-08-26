import { Box, Typography, Paper } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupsIcon from '@mui/icons-material/Groups';
import CategoryIcon from '@mui/icons-material/Category';
import PublicIcon from '@mui/icons-material/Public';
import PlaceIcon from '@mui/icons-material/Place';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: 'activities' | 'orgs' | 'clusters' | 'states' | 'localities';
  color: string;
  subtitle?: string;
}

const iconMap = {
  activities: AssignmentIcon,
  orgs: GroupsIcon,
  clusters: CategoryIcon,
  states: PublicIcon,
  localities: PlaceIcon,
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
      <Box sx={{ position: 'absolute', top: -15, right: -15, opacity: 0.08, color }}>
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
          sx={{ fontWeight: 700, fontFamily: 'Fira Code, monospace', color, lineHeight: 1.2 }}
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

interface ThreeWStatCardsProps {
  activities: number;
  orgs: number;
  clusters: number;
  states: number;
  localities: number;
  selectedState?: string | null;
}

export default function ThreeWStatCards({
  activities,
  orgs,
  clusters,
  states,
  localities,
  selectedState,
}: ThreeWStatCardsProps) {
  const isStateSelected = !!selectedState;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        mb: 4,
        width: '100%',
        '& > *': {
          flex: '1 1 calc(20% - 16px)',
          minWidth: 140,
        },
      }}
    >
      <StatCard
        title={isStateSelected ? selectedState! : 'Total Activities'}
        value={activities}
        icon="activities"
        color="#e65100"
        subtitle="reported activities"
      />
      <StatCard
        title="Organizations"
        value={orgs}
        icon="orgs"
        color="#1565c0"
        subtitle={isStateSelected ? 'active in state' : 'active partners'}
      />
      <StatCard
        title="Clusters Active"
        value={clusters}
        icon="clusters"
        color="#6a1b9a"
        subtitle="sectors present"
      />
      {!isStateSelected && (
        <StatCard title="States Covered" value={states} icon="states" color="#2e7d32" subtitle="of 19 states" />
      )}
      <StatCard
        title="Localities Reached"
        value={localities}
        icon="localities"
        color="#c62828"
        subtitle={isStateSelected ? 'in state' : 'of 188 localities'}
      />
    </Box>
  );
}
