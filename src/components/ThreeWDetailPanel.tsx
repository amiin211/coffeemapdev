'use client';

import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import { OrgAggregate, OrgTypeAggregate } from '@/utils/threew';
import { unOrgTypeColors as orgTypeColors } from '@/theme/unColors';

interface ThreeWDetailPanelProps {
  state: string | null;
  topOrgs: OrgAggregate[];
  orgTypeBreakdown: OrgTypeAggregate[];
  clustersActive: string[];
  onClear: () => void;
}

export default function ThreeWDetailPanel({
  state,
  topOrgs,
  orgTypeBreakdown,
  clustersActive,
  onClear,
}: ThreeWDetailPanelProps) {
  return (
    <Paper elevation={2} sx={{ p: 1.5, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOnIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontFamily: 'Fira Code, monospace' }}>
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
          Click on a state in the map to see its active organizations, clusters, and coverage.
        </Typography>
      )}

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
          Org Type Breakdown
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
          {orgTypeBreakdown.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No activity for this selection.
            </Typography>
          )}
          {orgTypeBreakdown.map((t) => (
            <Chip
              key={t.type}
              size="small"
              label={`${t.type}: ${t.orgs}`}
              sx={{
                bgcolor: `${orgTypeColors[t.type] ?? '#616161'}20`,
                color: orgTypeColors[t.type] ?? '#616161',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
          Clusters Active ({clustersActive.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {clustersActive.map((c) => (
            <Chip key={c} label={c} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
          Top Organizations
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          {topOrgs.map(({ org, activities }) => (
            <Box
              key={org.acronym}
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.4, borderBottom: '1px solid #f0f0f0' }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {org.acronym}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  ({org.type})
                </Typography>
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                {activities}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}
