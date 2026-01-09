import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'

export const metadata: Metadata = {
  title: 'DevSure - Project Health Analysis',
  description: 'Analyze your project deployment for errors, performance, and durability issues',
  keywords: ['project analysis', 'code quality', 'performance testing', 'deployment testing'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
