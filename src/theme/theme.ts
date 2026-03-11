'use client';

import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#512812',
      light: '#8d4220',
      dark: '#2a1008',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#8d4220',
      light: '#b5633d',
      dark: '#6a3118',
      contrastText: '#FFFFFF',
    },
    accent: {
      main: '#c4956a',
      light: '#d4b08c',
      dark: '#9e744a',
      contrastText: '#1A1A1A',
    },
    background: {
      default: '#FDFBF9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2a1008',
      secondary: '#5a4a3e',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h1: {
      fontFamily: 'Fira Code, monospace',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Fira Code, monospace',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Fira Code, monospace',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Fira Code, monospace',
      fontWeight: 600,
    },
    h5: {
      fontFamily: 'Fira Code, monospace',
      fontWeight: 600,
    },
    h6: {
      fontFamily: 'Fira Code, monospace',
      fontWeight: 600,
    },
    button: {
      fontFamily: 'Fira Code, monospace',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(81, 40, 18, 0.08)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(81, 40, 18, 0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(253, 251, 249, 0.95)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
  },
});

export default theme;
