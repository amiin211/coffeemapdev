import { Box, Typography, Container, Chip } from '@mui/material';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import SourceIcon from '@mui/icons-material/Source';

interface DashboardHeaderProps {
  source: string;
  author: string;
  date: string;
}

export default function DashboardHeader({ source, author, date }: DashboardHeaderProps) {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #8d4220 0%, #5d2e10 100%)',
        color: 'white',
        py: 1.5,
        mb: 3,
        borderRadius: 2,
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
            <WaterDropIcon sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Fira Code, monospace', lineHeight: 1.2 }}>
                Sudan Flood Dashboard
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 400, mt: 0.5 }}>
                Humanitarian Impact of Heavy Rains and Flooding
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                size="small"
                icon={<CalendarTodayIcon sx={{ color: 'white !important', fontSize: 16 }} />} 
                label={date}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.75rem'
                }} 
              />
              <Chip 
                size="small"
                icon={<PersonIcon sx={{ color: 'white !important', fontSize: 16 }} />} 
                label={author}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.75rem'
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
