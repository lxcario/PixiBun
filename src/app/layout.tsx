import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Silkscreen } from 'next/font/google';
import './globals.css';

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
  title: 'PixiBun â€” A cozy pixel art studio that lives in your browser',
  description:
    'Draw sprites, build animations, and ship game-ready sheets from a warm little desk in your browser tab. Local-first, no account, nothing leaves your machine.',
};

const themeInitializerScript = `
  (function() {
    try {
      var saved = localStorage.getItem('pixibun-theme');
      var theme = saved === 'light' ? 'light' : 'dark';
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${jetbrainsMono.variable} ${silkscreen.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializerScript }} />
      </head>
      <body className="bg-desk text-text-primary antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

