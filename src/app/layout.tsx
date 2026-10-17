import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import localFont from 'next/font/local';
import './globals.css';
import './themes.generated.css';
import './theme-transition.css';
import './surfaces.css';
import { ThemeSync } from '@/components/system/ThemeSync';
import { DiagnosticsProvider } from '@/components/system/DiagnosticsProvider';
import { ServiceWorkerRegistrar } from '@/components/system/ServiceWorkerRegistrar';
import { SkipToContent } from '@/components/system/SkipToContent';
import { PressMotion } from '@/components/system/PressMotion';
import { Analytics } from '@vercel/analytics/next';

// Self-hosted via next/font/local: 100% offline-capable, zero external network egress
// during build or runtime, satisfying CSP and air-gapped environment requirements.
const jakarta = localFont({
  src: './fonts/PlusJakartaSans-Variable.woff2',
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono-Variable.woff2',
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const silkscreen = localFont({
  src: [
    {
      path: './fonts/Silkscreen-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Silkscreen-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-silkscreen',
  display: 'block',
});

export const metadata: Metadata = {
  title: 'PixiBun — A cozy pixel art studio that lives in your browser',
  description:
    'Draw sprites and animate a few frames from a warm little desk in your browser. No account needed; offline editing follows your first online load. Projects save locally, with optional sharing and diagnostic reports.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PixiBun',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nonce-based CSP (src/proxy.ts): reading headers() opts every route into
  // dynamic rendering, which is required for Next.js to inject the per-request
  // nonce into its bootstrap <script> tags. Explicitly forwarded to any
  // manually declared <Script> components (nonce props are not auto-injected).
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${jetbrainsMono.variable} ${silkscreen.variable}`}>
      <head>
        <script src="/theme.js" nonce={nonce} />
      </head>
      <body className="bg-desk text-text-primary antialiased font-sans">
        <SkipToContent />
        <DiagnosticsProvider>
          <ServiceWorkerRegistrar />
          <ThemeSync />
          <PressMotion />
          {children}
        </DiagnosticsProvider>
        {/* Vercel Web Analytics (cookieless page views) only where Vercel serves it from this
            origin. Elsewhere it would load a debug script from another host, which the CSP
            refuses, or post to an endpoint that does not exist. */}
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}
