import { Anonymous_Pro } from 'next/font/google'

export const anonymousPro = Anonymous_Pro({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-mono',
})

export const anonymousProFontFamily = anonymousPro.style.fontFamily
