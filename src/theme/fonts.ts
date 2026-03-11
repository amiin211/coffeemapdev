import { Roboto, Fira_Code } from 'next/font/google';

export const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const firaCode = Fira_Code({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});
