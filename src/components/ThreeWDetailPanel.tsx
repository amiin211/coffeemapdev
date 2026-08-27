'use client';

import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import { OrgAggregate, OrgTypeAggregate } from '@/utils/threew';
import { unOrgTypeColors as orgTypeColors, unBlue } from '@/theme/unColors';

interface ThreeWDetailPanelProps {
  state: string | null;
  topOrgs: OrgAggregate[];
  orgTypeBreakdown: OrgTypeAggregate[];
  clustersActive: string[];
  onClear: () => void;
  selectedCluster?: string | null;
  selectedOrgType?: string | null;
  selectedOrg?: string | null;
  onClusterClick?: (cluster: string) => void;
  onOrgTypeClick?: (type: string) => void;
  onOrgClick?: (acronym: string) => void;
}

export default function ThreeWDetailPanel({
  state,
  topOrgs,
  orgTypeBreakdown,
  clustersActive,
  onClear,
  selectedCluster,
  selectedOrgType,
  selectedOrg,
  onClusterClick,
  onOrgTypeClick,
  onOrgClick,
}: ThreeWDetailPanelProps) {
  return (
    <Paper elevation={2} sx={{ p: 1.5, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOnIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontFamily: 'Roboto, sans-serif' }}>
            {state ?? 'Response Overview'}
          </Typography>
        </Box>
        {state && (
          <Button size="small" startIcon={<CloseIcon fontSize="small" />} onClick={onClear} sx={{ fontSize: '0.7rem' }}>
            Clear
          </Button>
        )}
      </Box>

      {!state && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Click on a state in the map, or any chip/row/chart below, to filter the whole dashboard.
        </Typography>
      )}

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 600 }}>
          Org Type Breakdown
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
          {orgTypeBreakdown.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No activity for this selection.
            </Typography>
          )}
          {orgTypeBreakdown.map((t) => {
            const isSelected = selectedOrgType === t.type;
            const color = orgTypeColors[t.type] ?? '#616161';
            return (
              <Chip
                key={t.type}
                size="small"
                label={`${t.type}: ${t.orgs}`}
                onClick={onOrgTypeClick ? () => onOrgTypeClick(isSelected ? '' : t.type) : undefined}
                sx={{
                  bgcolor: isSelected ? color : `${color}20`,
                  color: isSelected ? 'white' : color,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  cursor: onOrgTypeClick ? 'pointer' : 'default',
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 600 }}>
          Clusters Active ({clustersActive.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {clustersActive.map((c) => {
            const isSelected = selectedCluster === c;
            return (
              <Chip
                key={c}
                label={c}
                size="small"
                onClick={onClusterClick ? () => onClusterClick(isSelected ? '' : c) : undefined}
                sx={{
                  fontSize: '0.65rem',
                  height: 20,
                  cursor: onClusterClick ? 'pointer' : 'default',
                  bgcolor: isSelected ? unBlue.DEFAULT : undefined,
                  color: isSelected ? 'white' : undefined,
                  fontWeight: isSelected ? 700 : 400,
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 600 }}>
          Top Organizations
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          {topOrgs.map(({ org, activities }) => {
            const isSelected = selectedOrg === org.acronym;
            return (
              <Box
                key={org.acronym}
                onClick={onOrgClick ? () => onOrgClick(isSelected ? '' : org.acronym) : undefined}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 0.4,
                  px: isSelected ? 0.5 : 0,
                  borderBottom: '1px solid #f0f0f0',
                  cursor: onOrgClick ? 'pointer' : 'default',
                  bgcolor: isSelected ? `${unBlue.DEFAULT}20` : 'transparent',
                  borderRadius: isSelected ? 0.5 : 0,
                }}
              >
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 400 }}>
                  {org.acronym}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    ({org.type})
                  </Typography>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  {activities}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}
