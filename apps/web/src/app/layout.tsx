import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SwRegister } from '@/components/sw-register';

export const metadata: Metadata = {
  title: 'Editor de Vídeos',
  description: 'Edição automática de vídeos em fila — simples, no celular.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Editor de Vídeos',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-180.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // permite zoom (acessibilidade)
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
