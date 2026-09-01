import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Silkscreen } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { DiagnosticsProvider } from '@/components/system/DiagnosticsProvider';
import { ServiceWorkerRegistrar } from '@/components/system/ServiceWorkerRegistrar';

// Self-hosted at build time via next/font: no external stylesheet requests,
// so the studio CSP cannot block them (and production gets them for free).
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const silkscreen = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-silkscreen',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PixiBun — A cozy pixel art studio that lives in your browser',
  description:
    'Draw sprites, build animations, and ship game-ready sheets from a warm little desk in your browser tab. 100% offline-capable, no account, nothing leaves your machine.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PixiBun Atelier',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#140C1E' },
    { media: '(prefers-color-scheme: light)', color: '#fbf8f3' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${jakarta.variable} ${jetbrainsMono.variable} ${silkscreen.variable}`}>
      <head>
        <Script src="/theme.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-desk text-text-primary antialiased font-sans">
        <a
          href="#main-workspace"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[99999] px-4 py-2 bg-[var(--desk-surface)] text-[var(--accent-gold)] border-2 border-[var(--accent-gold)] font-mono text-xs rounded shadow-lg"
        >
          Skip to workspace
        </a>
        <DiagnosticsProvider>
          <ServiceWorkerRegistrar />
          {children}
        </DiagnosticsProvider>
      </body>
    </html>
  );
}
