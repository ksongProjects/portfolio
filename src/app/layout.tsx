import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kyung Min Song | Portfolio & Night Sky',
  description:
    'Minimal portfolio and interactive night sky explorer for Kyung Min Song, built with Next.js 16.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
