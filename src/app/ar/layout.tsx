import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import ArProviders from '@/i18n/ArProviders';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: 'CoffeeMap.dev - منصة الهندسة الجيومكانية',
  description: 'نحوّل البيانات إلى رؤى جيومكانية قابلة للتنفيذ',
};

// Components hard-code 'Roboto', which has no Arabic glyphs; everything
// marked Arabic uses Cairo instead (code stays monospace).
const fontCss = `
:lang(ar) { font-family: ${cairo.style.fontFamily}, Roboto, sans-serif !important; }
:lang(ar) :is(pre, code, pre *, code *) { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important; }
`;

// Set the document language before first paint, so the static HTML does not
// flash left-to-right; LocaleProvider keeps it in sync after navigation.
const setDir = `document.documentElement.lang='ar';document.documentElement.dir='rtl';`;

export default function ArLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: setDir }} />
      <style dangerouslySetInnerHTML={{ __html: fontCss }} />
      <div lang="ar" dir="rtl" className={cairo.className}>
        <ArProviders>{children}</ArProviders>
      </div>
    </>
  );
}
