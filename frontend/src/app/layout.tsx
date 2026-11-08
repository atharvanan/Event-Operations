import './globals.css';
import React from 'react';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '../contexts/AuthContext';
import { RegisterServiceWorker } from '../components/layout/RegisterServiceWorker';

export const metadata: Metadata = {
  title: 'EventOps — Live Operations & Team Coordination',
  description: 'Jira-inspired on-ground event operations and team coordination platform',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased selection:bg-blue-500 selection:text-white">
        <RegisterServiceWorker />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
