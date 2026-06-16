import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'IceBreak — Team icebreakers that actually work',
  description: '5-minute icebreakers for remote and in-person teams. No downloads. Players join instantly with a code.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col font-sans`} style={{ fontFamily: 'var(--font-plus-jakarta), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
