'use client';

import { Box, Container, Typography, Stack } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'rgba(253, 251, 249, 0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.12)',
        color: 'text.primary',
        py: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 3,
            minHeight: 48,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              height: '100%',
            }}
          >
            <Box
              component="img"
              src="/logo.svg"
              alt="CoffeeMap.dev"
              sx={{ height: 32 }}
            />
            <Box>
              <Typography
                sx={{
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                Brewing Data into Actionable Geospatial Insights
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  mt: 0.5,
                }}
              >
                Created by Amin Adnan Gasim
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2} sx={{ height: '100%', alignItems: 'center' }}>
            <Box
              component="a"
              href="https://x.com/@coffeemapdev"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(81, 40, 18, 0.08)',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(81, 40, 18, 0.16)',
                },
              }}
            >
              <XIcon fontSize="small" />
            </Box>
            <Box
              component="a"
              href="https://linkedin.com/in/amiin211"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(81, 40, 18, 0.08)',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(81, 40, 18, 0.16)',
                },
              }}
            >
              <LinkedInIcon fontSize="small" />
            </Box>
            <Box
              component="a"
              href="https://github.com/amiin211"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(81, 40, 18, 0.08)',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(81, 40, 18, 0.16)',
                },
              }}
            >
              <GitHubIcon fontSize="small" />
            </Box>
            <Box
              component="a"
              href="mailto:info@coffeemap.dev"
              sx={{
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(81, 40, 18, 0.08)',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(81, 40, 18, 0.16)',
                },
              }}
            >
              <EmailIcon fontSize="small" />
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'Fira Code, monospace',
              color: 'text.secondary',
            }}
          >
            © {currentYear} CoffeeMap.dev. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
