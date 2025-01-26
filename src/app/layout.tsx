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
  title: "Find Your Flick",
  description: "Movie recommendation engine for movies",
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
      </head>
      <body
        className={`${sol.variable} ${geistSans.variable} ${geistMono.variable} antialiased relative min-h-[100dvh] overflow-x-hidden`}
      >
        <Providers>
          <Navbar />
          <div id="content-wrapper" className="relative z-30 pt-14 sm:pt-16 px-3 sm:px-6 lg:px-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
