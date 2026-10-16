'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { useAuthStore } from '@/lib/store/auth-store'
import Link from 'next/link'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN'

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        {isAdmin && (
          <div className="border-b bg-slate-950 px-4 py-2 text-xs text-slate-200">
            Você está na operação clínica.{' '}
            <Link href="/admin" className="underline underline-offset-2 hover:text-white">
              Voltar ao Painel do Sistema
            </Link>
          </div>
        )}
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}




