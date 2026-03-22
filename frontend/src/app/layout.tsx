'use client';

import './globals.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/api/queryClient';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>AnomaNet — FIU Intelligence Platform</title>
        <meta name="description" content="Intelligent Fund Flow Tracking & Fraud Detection" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Figtree:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#121829',
              color: '#dde3f8',
              border: '1px solid rgba(82,108,255,0.2)',
              borderRadius: '10px',
              fontFamily: 'Figtree, sans-serif',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  );
}
