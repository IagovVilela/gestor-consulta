import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ClinicaProvider } from '@/contexts/clinica-context'
import { GlobalLoadingBar } from '@/components/loading/GlobalLoadingBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gestor Consulta',
  description: 'Sistema de gerenciamento de consultas médicas — Energon Technology Solutions',
  icons: {
    icon: '/brand/gestor-consulta-icon.png',
    apple: '/brand/gestor-consulta-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ClinicaProvider>
          <GlobalLoadingBar />
          {children}
          <Toaster />
        </ClinicaProvider>
      </body>
    </html>
  )
}

