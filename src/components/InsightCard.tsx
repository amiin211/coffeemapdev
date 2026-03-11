'use client';

import { Card, CardContent, Box, Typography, Button, Chip } from '@mui/material';
import { Insight } from '@/data/insights';
import { getCategoryLabel } from '@/utils/filters';

interface InsightCardProps {
  insight: Insight;
}

const InsightCard = ({ insight }: InsightCardProps) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Chip
            label={getCategoryLabel(insight.category)}
            size="small"
            sx={{
              backgroundColor: 'accent.light',
              color: 'primary.main',
              fontFamily: 'Fira Code, monospace',
              fontSize: '0.65rem',
              fontWeight: 600,
              height: 22,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: 'Fira Code, monospace',
            }}
          >
            {insight.date}
          </Typography>
        </Box>

        <Typography
          variant="h6"
          sx={{
            mb: 1.5,
            fontFamily: 'Fira Code, monospace',
            fontWeight: 600,
            fontSize: '1rem',
            lineHeight: 1.4,
          }}
        >
          {insight.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 2,
            lineHeight: 1.6,
            flexGrow: 1,
          }}
        >
          {insight.summary}
        </Typography>

        <Button
          size="small"
          sx={{
            color: 'secondary.main',
            fontFamily: 'Fira Code, monospace',
            fontSize: '0.75rem',
            fontWeight: 500,
            p: 0,
            '&:hover': {
              backgroundColor: 'transparent',
              textDecoration: 'underline',
            },
          }}
        >
          Read More →
        </Button>
      </CardContent>
    </Card>
  );
};

export default InsightCard;
