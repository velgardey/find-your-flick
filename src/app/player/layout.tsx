'use client';


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
    <div className={`${sol.variable} ${geistSans.variable} ${geistMono.variable} player-layout`}>
      <Providers>
        <main className="relative z-30 min-h-[100dvh] bg-black">
          {children}
        </main>
      </Providers>
    </div>
  );
}
