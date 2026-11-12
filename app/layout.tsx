import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Завантажуємо Plus Jakarta Sans із підтримкою кирилиці
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'cyrillic-ext'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Party Vault',
  description:
    'Спільний бюджет компанії друзів: внески, витрати та баланс в одному місці.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Party Vault',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={`dark ${jakarta.variable} h-full bg-zinc-950`}>
      <body className="h-full bg-zinc-950 font-sans text-zinc-100 antialiased overscroll-none">
        {children}
      </body>
    </html>
  );
}