import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import { DiagnosticsProvider } from '@/components/system/DiagnosticsProvider';
import { ServiceWorkerRegistrar } from '@/components/system/ServiceWorkerRegistrar';

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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${jakarta.variable} ${jetbrainsMono.variable} ${silkscreen.variable}`}>
      <head>
        <Script src="/theme.js" strategy="beforeInteractive" nonce={nonce} />
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
