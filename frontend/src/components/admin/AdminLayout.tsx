'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'
import { useAuthStore } from '@/lib/store/auth-store'
import { ImpersonationBanner } from './ImpersonationBanner'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }

    const timer = setTimeout(() => {
      const current = useAuthStore.getState().user
      const role = current?.role?.toUpperCase()
      if (!current || role !== 'ADMIN') {
        router.replace('/dashboard')
        return
      }
      setReady(true)
    }, 150)

    return () => clearTimeout(timer)
  }, [user, isAuthenticated, router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando painel...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
