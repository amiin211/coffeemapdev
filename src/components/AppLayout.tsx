'use client';

import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme, { rtlTheme } from '@/theme/theme';
import { useI18n } from '@/i18n';
import { roboto } from '@/theme/fonts';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAr } = useI18n();
  return (
    <ThemeProvider theme={isAr ? rtlTheme : theme}>
      <CssBaseline />
      <style jsx global>{`
        :root {
          --font-roboto: ${roboto.style.fontFamily};
        }
        body {
          font-family: var(--font-roboto);
        }
      `}</style>
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Navbar />
        
        <Box component="main" sx={{ flexGrow: 1, pt: 12 }}>
          {children}
        </Box>
        
        <Footer />
      </Box>
    </ThemeProvider>
  );
}
