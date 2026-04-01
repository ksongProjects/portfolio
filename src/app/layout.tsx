import type { Metadata } from 'next'
import { Anonymous_Pro } from 'next/font/google'
import './globals.css'

const anonymousPro = Anonymous_Pro({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-mono',
})

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
    <html lang="en" className={anonymousPro.variable}>
      <body>{children}</body>
    </html>
  )
}
