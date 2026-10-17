'use client';

import { Box, Typography, Paper } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupsIcon from '@mui/icons-material/Groups';
import CategoryIcon from '@mui/icons-material/Category';
import PublicIcon from '@mui/icons-material/Public';
import PlaceIcon from '@mui/icons-material/Place';
import { unBlue, unCategorical } from '@/theme/unColors';
import { useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: 'activities' | 'orgs' | 'clusters' | 'states' | 'localities';
  color: string;
}

const iconMap = {
  activities: AssignmentIcon,
  orgs: GroupsIcon,
  clusters: CategoryIcon,
  states: PublicIcon,
  localities: PlaceIcon,
};

function StatCard({ title, value, icon, color }: StatCardProps) {
  const Icon = iconMap[icon];

  return (
    <Paper
      elevation={2}
      sx={{
        p: 1.25,
        height: 64,
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
      <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.08, color }}>
        <Icon sx={{ fontSize: 56 }} />
      </Box>

      <Box
        sx={{
          p: 0.75,
          borderRadius: 1,
          bgcolor: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 1.25,
          minWidth: 34,
        }}
      >
        <Icon sx={{ color, fontSize: 20 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.1, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </Typography>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', color, lineHeight: 1.2 }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
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
  const { isAr, tr } = useI18n();
  const names = useSudanNames(isAr);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.25,
        width: '100%',
        '& > *': {
          flex: '1 1 calc(20% - 16px)',
          minWidth: 130,
        },
      }}
    >
      <StatCard
        title={isStateSelected ? names.state(selectedState!) : tr('Total Activities', 'إجمالي الأنشطة')}
        value={activities}
        icon="activities"
        color={unBlue.dark}
      />
      <StatCard
        title={tr('Organizations', 'المنظمات')}
        value={orgs}
        icon="orgs"
        color={unBlue.DEFAULT}
      />
      <StatCard
        title={tr('Clusters Active', 'القطاعات النشطة')}
        value={clusters}
        icon="clusters"
        color={unCategorical[3]}
      />
      {!isStateSelected && (
        <StatCard title={tr('States Covered', 'الولايات المشمولة')} value={states} icon="states" color={unCategorical[5]} />
      )}
      <StatCard
        title={tr('Localities Reached', 'المحليات المشمولة')}
        value={localities}
        icon="localities"
        color={unCategorical[4]}
      />
    </Box>
  );
}
