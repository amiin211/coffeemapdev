import { Metadata } from 'next';
import { roboto } from '@/theme/fonts';
import ClientWrapper from './ClientWrapper';

export const metadata: Metadata = {
  title: 'CoffeeMap.dev - Geospatial Engineering Platform',
  description: 'Brewing Data into Actionable Geospatial Insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        {children}
      </body>
    </html>
  );
}
