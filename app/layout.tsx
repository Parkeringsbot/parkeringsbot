import React from 'react'
import './globals.css'
import { THEME_INIT_SCRIPT } from '@/lib/theme'

export const metadata = {
  title: 'Parkeringsbot – håndter parkeringsbøtene dine',
  description: 'Se og følg opp parkeringsbøtene dine på ett sted.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A1628',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
