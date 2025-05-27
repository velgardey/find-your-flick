'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from 'next/font/local';
import "../globals.css";
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
  src: '../../../public/fonts/solander.ttf',
  variable: '--font-sol'
});

export default function PlayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={`${sol.variable} ${geistSans.variable} ${geistMono.variable} antialiased relative min-h-[100dvh] overflow-x-hidden bg-background`}
      >
        <Providers>
          <main className="relative z-30 min-h-[100dvh]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
