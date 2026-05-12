import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '../styles/app.css';

export const metadata: Metadata = {
  title: 'Aurum Reservas',
  description: 'Sistema de reserva de salas da Aurum Reservas Brasil'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
