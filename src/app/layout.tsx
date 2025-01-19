import type { Metadata } from "next";
import localFont from 'next/font/local'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MouseGlow from '@/components/MouseGlow';

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
      <body
        className={`${sol.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MouseGlow />
        <div id="content-wrapper">
          {children}
        </div>
      </body>
    </html>
  );
}
