import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { anonymousPro } from '@/lib/fonts'
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
    <html lang="en" className={`${anonymousPro.variable} ${anonymousPro.className}`}>
      <Analytics />
      <SpeedInsights />
      <body>{children}</body>
    </html>
  )
}
