'use client';

import Link from 'next/link';
import { Box, Typography, Container, Chip, Button } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import SourceIcon from '@mui/icons-material/Source';
import { useI18n } from '@/i18n';

interface DashboardHeaderProps {
  source: string;
  author: string;
  date: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  borderRadius?: number;
  mb?: number;
  articleHref?: string; // "Read the article" button when the project has a write-up
}

export default function DashboardHeader({
  source,
  author,
  date,
  title = 'Sudan Flood Dashboard',
  subtitle = 'Humanitarian Impact of Heavy Rains and Flooding',
  icon = <WaterDropIcon sx={{ fontSize: 28 }} />,
  gradientFrom = '#8d4220',
  gradientTo = '#5d2e10',
  borderRadius = 2,
  mb = 3,
  articleHref,
}: DashboardHeaderProps) {
  const { tr, href } = useI18n();
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        color: 'white',
        py: 1.5,
        mb,
        borderRadius,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Roboto, sans-serif', lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 400, mt: 0.5 }}>
                {subtitle}
              </Typography>
            </Box>
          </Box>
          
          {/* ml: auto keeps this block on the right even when it wraps below the title. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, ml: 'auto' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
              {articleHref && (
                <Button
                  component={Link}
                  href={href(articleHref)}
                  size="small"
                  variant="contained"
                  disableElevation
                  startIcon={<MenuBookIcon sx={{ fontSize: '16px !important' }} />}
                  sx={{
                    bgcolor: 'white',
                    color: gradientTo,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    py: 0.25,
                    borderRadius: 4,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.88)' },
                  }}
                >
                  {tr('Read the article', 'اقرأ المقال')}
                </Button>
              )}
              <Chip 
                size="small"
                icon={<CalendarTodayIcon sx={{ color: 'white !important', fontSize: 16 }} />} 
                label={date}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '0.75rem'
                }} 
              />
              <Chip 
                size="small"
                icon={<PersonIcon sx={{ color: 'white !important', fontSize: 16 }} />} 
                label={tr(author, author === 'Amin Adnan Gasim' ? 'أمين عدنان قاسم' : author)}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }} 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SourceIcon sx={{ fontSize: 14, opacity: 0.7 }} />
              <Typography variant="caption" sx={{ opacity: 0.7, fontStyle: 'italic', textAlign: 'right' }}>
                {source}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
