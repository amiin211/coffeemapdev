'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { LocaleProvider } from '@/i18n';

// Arabic subtree: an Emotion cache that mirrors every MUI/sx style
// (margin-left <-> margin-right, etc.), and the 'ar' locale.
export default function ArProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] }}>
      <LocaleProvider locale="ar">{children}</LocaleProvider>
    </AppRouterCacheProvider>
  );
}
