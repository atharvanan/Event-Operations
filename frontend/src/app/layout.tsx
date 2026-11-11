import './globals.css';
import React from 'react';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { PwaProvider } from '../contexts/PwaContext';
import { RegisterServiceWorker } from '../components/layout/RegisterServiceWorker';

export const metadata: Metadata = {
  title: 'EventOps — Make Event Management Effortless',
  description: 'Event operations, team coordination, checklists, proof verification, and attendee QR check-in.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EventOps',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#221849' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0B1A' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="antialiased selection:bg-brand-600 selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:min-h-[44px] focus:flex focus:items-center focus:bg-brand-600 focus:text-white focus:rounded-xl focus:shadow-xl focus:ring-2 focus:ring-white font-bold text-sm"
        >
          Skip to main content
        </a>
        <RegisterServiceWorker />
        <ThemeProvider>
          <PwaProvider>
            <AuthProvider>{children}</AuthProvider>
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
