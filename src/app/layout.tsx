import type { Metadata } from "next";
import localFont from 'next/font/local'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar';
import Providers from '@/components/Providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sol = localFont({
  src: '../../public/fonts/solander.ttf',
  variable: '--font-sol'
})

export const metadata: Metadata = {
  title: "Find Your Flick - Discover Your Next Favorite Movie",
  description: "Find Your Flick is your personalized movie recommendation engine. Discover new movies, share with friends, and keep track of your watchlist. Get tailored suggestions based on your taste.",
  keywords: "movies, movie recommendations, tv shows, watchlist, movie tracking, film recommendations, entertainment",
  authors: [{ name: "Find Your Flick" }],
  openGraph: {
    title: "Find Your Flick - Discover Your Next Favorite Movie",
    description: "Your personalized movie recommendation engine. Discover, share, and track your favorite movies and TV shows.",
    type: "website",
    locale: "en_US",
    siteName: "Find Your Flick",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Your Flick - Discover Your Next Favorite Movie",
    description: "Your personalized movie recommendation engine. Discover, share, and track your favorite movies and TV shows.",
  },
  metadataBase: new URL("https://findyourflick.com"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body
        className={`${sol.variable} ${geistSans.variable} ${geistMono.variable} antialiased relative min-h-[100dvh] overflow-x-hidden bg-background`}
      >
        <Providers>
          <Navbar />
          <main id="content-wrapper" className="relative z-30 min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
