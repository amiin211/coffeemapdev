'use client';

// Two languages, one set of components. English is the default and lives at
// the existing URLs; Arabic mirrors every page under /ar/ (see src/app/ar).
// Components pick their text with tr('English', 'العربية').

import { createContext, useCallback, useContext, useEffect } from 'react';

export type Locale = 'en' | 'ar';

/** Text in both languages, for strings kept in data files and constants. */
export interface Bi {
  en: string;
  ar: string;
}

const LocaleContext = createContext<Locale>('en');

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // Portals (menus, tooltips, dialogs) render into <body>, so the document
  // itself carries the language and direction, not only this subtree.
  // English is the document default, so only the Arabic subtree sets and
  // then restores it (e.g. when a link leaves /ar/ without a reload).
  useEffect(() => {
    if (locale !== 'ar') return;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    return () => {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    };
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

/** Internal path in the given locale: '/about' -> '/ar/about'. */
export function localizePath(path: string, locale: Locale): string {
  if (locale === 'en' || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === '/ar' || path.startsWith('/ar/') || path.startsWith('/ar#')) return path;
  // Files served as-is (data, images, static tools) are shared by both languages.
  if (/^\/(data|images|fonts|maplibre|projects-static|_next)\//.test(path) || /\.[a-z0-9]+$/i.test(path.split(/[?#]/)[0])) return path;
  return path === '/' ? '/ar/' : path.startsWith('/#') ? `/ar/${path.slice(1)}` : `/ar${path}`;
}

/** The same page in the other language. */
export function switchLocalePath(pathname: string, to: Locale): string {
  let bare = pathname === '/ar' ? '/' : pathname.startsWith('/ar/') ? pathname.slice(3) : pathname;
  if (bare.includes('_not-found')) bare = '/'; // the 404 page switches to the other home page
  return to === 'ar' ? localizePath(bare, 'ar') : bare;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  const isAr = locale === 'ar';
  const tr = useCallback((en: string, ar: string) => (isAr ? ar : en), [isAr]);
  const pick = useCallback((text: Bi) => (isAr ? text.ar : text.en), [isAr]);
  const href = useCallback((path: string) => localizePath(path, locale), [locale]);
  return { locale, isAr, tr, pick, href };
}

// Western digits in both languages; Arabic month names for Arabic dates.
export function formatDate(iso: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return date.toLocaleDateString(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { timeZone: 'UTC', ...opts });
}

// Chart.js draws on a canvas, outside CSS: Arabic pages set its font and
// text direction here. Time axes stay left-to-right in both languages.
const CHART_FONT_AR = 'Cairo, Roboto, sans-serif';

/** Call once where a chart module registers Chart.js; the document language is
 *  already set (app/ar/layout), and switching language reloads the page. */
export function setChartFontForDocument(chart: { defaults: { font: { family?: string } } }) {
  if (document.documentElement.lang === 'ar') chart.defaults.font.family = CHART_FONT_AR;
}
export const chartDir = (isAr: boolean) => ({ rtl: isAr, textDirection: isAr ? 'rtl' : 'ltr' }) as const;
