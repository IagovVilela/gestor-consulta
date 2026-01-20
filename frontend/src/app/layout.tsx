import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ClinicaProvider } from '@/contexts/clinica-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gestor de Consultas Médicas',
  description: 'Sistema de gerenciamento de consultas médicas',
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
          {children}
          <Toaster />
        </ClinicaProvider>
      </body>
    </html>
  )
}

