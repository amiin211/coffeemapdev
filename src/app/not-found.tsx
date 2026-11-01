'use client';

import Link from 'next/link';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import AppLayout from '@/components/AppLayout';

// Exported as out/404.html; Apache serves it through ErrorDocument 404 for
// every missing URL, so it speaks both languages.
export default function NotFound() {
  return (
    <AppLayout>
      <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Typography variant="h1" sx={{ fontFamily: 'Roboto, sans-serif', fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 700, color: 'primary.main', mb: 2 }}>
            Page not found
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            The page you are looking for does not exist or has moved.
          </Typography>
          <Box lang="ar" dir="rtl" sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.8rem' }, fontWeight: 700, color: 'primary.main', mb: 1 }}>الصفحة غير موجودة</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>الصفحة التي تبحث عنها غير موجودة أو نُقلت.</Typography>
          </Box>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button component={Link} href="/" variant="contained">Back to Home</Button>
            <Button component={Link} href="/ar/" variant="outlined" lang="ar">العودة إلى الرئيسية</Button>
          </Stack>
        </Container>
      </Box>
    </AppLayout>
  );
}
