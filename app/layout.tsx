import React from 'react'
import './globals.css'

export const metadata = {
  title: 'Parkeringsbot - Administrer dine parkingsbøter',
  description: 'Enkel og sikker løsning for parkingsbøter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  )
}
