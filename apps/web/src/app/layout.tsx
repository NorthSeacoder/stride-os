import type { Metadata } from 'next';
import { env } from '@stride-os/db/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: 'Stride OS',
    template: '%s | Stride OS',
  },
  description: 'A self-hosted, agent-native personal execution system',
  applicationName: 'Stride OS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased"
        style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
