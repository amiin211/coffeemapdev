import { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { roboto } from '@/theme/fonts';

export const metadata: Metadata = {
  title: 'CoffeeMap.dev - Geospatial Engineering Platform',
  description: 'Brewing Data into Actionable Geospatial Insights',
  icons: { icon: '/logo-icon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lang/dir are switched to Arabic by app/ar/layout before hydration.
    <html lang="en" suppressHydrationWarning>
      <body className={roboto.className}>
        {/* Collects MUI/Emotion styles into <head> during SSR, so the server
            HTML matches the client and pages hydrate cleanly. */}
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
