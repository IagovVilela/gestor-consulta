'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { MainLayout } from '@/components/layout/MainLayout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Verificar autenticação
    const checkAuth = () => {
      const token = localStorage.getItem('token')
      const authStorage = localStorage.getItem('auth-storage')
      
      // Se não tem token nem storage, redirecionar imediatamente
      if (!token && !authStorage) {
        router.replace('/login')
        return
      }
      
      // Se tem token mas Zustand não carregou ainda, aguardar
      if (token && !isAuthenticated) {
        // Tentar recarregar o estado do Zustand
        try {
          if (authStorage) {
            const parsed = JSON.parse(authStorage)
            if (parsed.state?.token && parsed.state?.isAuthenticated) {
              setIsChecking(false)
              return
            }
          }
        } catch (e) {
          // Ignorar erro de parse
        }
        
        // Se ainda não autenticado após 1 segundo, redirecionar
        setTimeout(() => {
          const currentToken = localStorage.getItem('token')
          const currentAuth = localStorage.getItem('auth-storage')
          
          if (!currentToken && !currentAuth) {
            router.replace('/login')
          } else if (!isAuthenticated) {
            router.replace('/login')
          } else {
            setIsChecking(false)
          }
        }, 1000)
      } else if (!token && !authStorage) {
        // Não tem token nem storage, redirecionar
        router.replace('/login')
      } else {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [isAuthenticated, router])

  // Mostrar loading enquanto verifica
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não autenticado após verificação, não renderizar
  const token = localStorage.getItem('token')
  if (!token) {
    return null
  }

  return <MainLayout>{children}</MainLayout>
}

