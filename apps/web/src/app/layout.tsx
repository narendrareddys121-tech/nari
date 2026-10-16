import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'BidRush — Bid Fast. Win Big.',
    template: '%s | BidRush',
  },
  description:
    'BidRush is Bengaluru\'s premier online auction marketplace. Discover unique products, place live bids, and win amazing deals.',
  keywords: ['auction', 'bidding', 'marketplace', 'Bengaluru', 'India', 'live auction', 'BidRush'],
  authors: [{ name: 'BidRush' }],
  creator: 'BidRush',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://bidrush.in',
    siteName: 'BidRush',
    title: 'BidRush — Bid Fast. Win Big.',
    description: 'Bengaluru\'s live auction marketplace.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BidRush',
    description: 'Bid Fast. Win Big.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
