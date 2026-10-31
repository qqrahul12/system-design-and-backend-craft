import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CineMind — AI Movie Platform',
  description:
    'AI-powered movie booking, document intelligence, and analytics platform built with Gemini 2.0.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body style={{ backgroundColor: '#0a0a0a' }}>
        {/* Fixed sidebar */}
        <Sidebar />

        {/* Main content — offset by sidebar width (w-64 = 16rem = 256px) */}
        <div className="ml-64 min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  )
}
