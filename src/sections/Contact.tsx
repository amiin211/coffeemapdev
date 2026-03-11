'use client';

import { Box, Container, Typography, Grid, TextField, Button, Stack } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';

const Contact = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <Box
      id="contact"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'Fira Code, monospace',
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'primary.main',
              mb: 2,
            }}
          >
            Get in Touch
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontSize: '1rem',
              lineHeight: 1.7,
            }}
          >
            Have a project in mind? Let&apos;s discuss how we can help with your geospatial needs.
          </Typography>
        </Box>

        <Grid container spacing={6} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                backgroundColor: 'background.default',
                p: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack spacing={3}>
                <TextField
                  label="Name"
                  fullWidth
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'Roboto, sans-serif',
                    },
                  }}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'Roboto, sans-serif',
                    },
                  }}
                />
                <TextField
                  label="Message"
                  multiline
                  rows={4}
                  fullWidth
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'Roboto, sans-serif',
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    py: 1.5,
                    fontFamily: 'Fira Code, monospace',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  Send Message
                </Button>
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: 'Fira Code, monospace',
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                }}
              >
                Connect With Us
              </Typography>

              <Stack spacing={2}>
                <Box
                  component="a"
                  href="https://x.com/@coffeemapdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    textDecoration: 'none',
                    color: 'text.primary',
                    p: 2,
                    borderRadius: 2,
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(74, 55, 40, 0.04)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <XIcon sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 500, fontFamily: 'Fira Code, monospace' }}
                    >
                      X (Twitter)
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      @coffeemapdev
                    </Typography>
                  </Box>
                </Box>

                <Box
                  component="a"
                  href="https://linkedin.com/in/amiin211"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    textDecoration: 'none',
                    color: 'text.primary',
                    p: 2,
                    borderRadius: 2,
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(74, 55, 40, 0.04)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: '#0077B5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <LinkedInIcon sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 500, fontFamily: 'Fira Code, monospace' }}
                    >
                      LinkedIn
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      @amiin211
                    </Typography>
                  </Box>
                </Box>

                <Box
                  component="a"
                  href="https://github.com/amiin211"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    textDecoration: 'none',
                    color: 'text.primary',
                    p: 2,
                    borderRadius: 2,
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(74, 55, 40, 0.04)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <GitHubIcon sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 500, fontFamily: 'Fira Code, monospace' }}
                    >
                      GitHub
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      @amiin211
                    </Typography>
                  </Box>
                </Box>

                <Box
                  component="a"
                  href="mailto:info@coffeemap.dev"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    textDecoration: 'none',
                    color: 'text.primary',
                    p: 2,
                    borderRadius: 2,
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(74, 55, 40, 0.04)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'secondary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <EmailIcon sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 500, fontFamily: 'Fira Code, monospace' }}
                    >
                      Email
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      info@coffeemap.dev
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Contact;
