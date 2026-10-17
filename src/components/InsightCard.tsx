'use client';

import Link from 'next/link';
import { Card, CardContent, Box, Typography, Button, Chip } from '@mui/material';
import { Insight } from '@/data/insights';
import { getCategoryLabel } from '@/utils/filters';
import { formatDate, useI18n } from '@/i18n';

interface InsightCardProps {
  insight: Insight;
}

const InsightCard = ({ insight }: InsightCardProps) => {
  const { locale, isAr, tr, href } = useI18n();
  // The whole card links to the article.
  return (
    <Card
      component={Link}
      href={href(insight.href)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
        '&:hover .read-more': { textDecoration: 'underline' },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Chip
            label={getCategoryLabel(insight.category, locale)}
            size="small"
            sx={{
              backgroundColor: 'accent.light',
              color: 'primary.main',
              fontFamily: 'Roboto, sans-serif',
              fontSize: '0.65rem',
              fontWeight: 600,
              height: 22,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: 'Roboto, sans-serif',
            }}
          >
            {formatDate(insight.date, locale, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Typography>
        </Box>

        <Typography
          variant="h6"
          sx={{
            mb: 1.5,
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 600,
            fontSize: '1rem',
            lineHeight: 1.4,
          }}
        >
          {isAr ? insight.titleAr : insight.title}
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
          {isAr ? insight.summaryAr : insight.summary}
        </Typography>

        <Button
          component="span"
          className="read-more"
          size="small"
          sx={{
            alignSelf: 'flex-start',
            color: 'secondary.main',
            fontFamily: 'Roboto, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 500,
            p: 0,
            '&:hover': { backgroundColor: 'transparent' },
          }}
        >
          {tr('Read More →', 'اقرأ المزيد ←')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default InsightCard;
