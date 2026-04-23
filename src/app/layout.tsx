import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { anonymousPro } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Kyung Min Song | Demo Portfolio',
    template: '%s | Kyung Min Song',
  },
  description:
    'Modular Next.js portfolio and demo lab with route-based feature apps and service seams.',
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
