'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/modules/auth/components/LoginForm'
import { CompanyContact } from '@/components/brand/CompanyContact'
import { useAuthStore } from '@/lib/store/auth-store'
import api from '@/lib/axios'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      
      // Se não tem token, permitir acesso à página de login
      if (!token) {
        setIsChecking(false)
        return
      }

      // Se tem token mas não está autenticado no Zustand, verificar se o token é válido
      if (token && !isAuthenticated) {
        try {
          // Tentar validar o token fazendo uma requisição
          await api.get('/auth/me')
          // Se chegou aqui, o token é válido mas o Zustand não carregou ainda
          // Aguardar um pouco e verificar novamente
          setTimeout(() => {
            setIsChecking(false)
          }, 500)
        } catch (error) {
          // Token inválido ou expirado, limpar e permitir login
          logout()
          setIsChecking(false)
        }
        return
      }

      // Se tem token e está autenticado, verificar se o token ainda é válido
      if (token && isAuthenticated && user) {
        try {
          await api.get('/auth/me')
          const role = (user.role || '').toUpperCase()
          router.push(role === 'ADMIN' ? '/admin' : '/dashboard')
        } catch (error) {
          // Token inválido, limpar e permitir login
          logout()
          setIsChecking(false)
        }
      } else {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [isAuthenticated, user, router, logout])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  const handleClearSession = () => {
    logout()
    localStorage.removeItem('token')
    localStorage.removeItem('auth-storage')
    setIsChecking(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <LoginForm />
        {(localStorage.getItem('token') || isAuthenticated) && (
          <div className="text-center">
            <button
              onClick={handleClearSession}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Limpar sessão e fazer novo login
            </button>
          </div>
        )}
        <CompanyContact compact className="rounded-xl border bg-background/80 px-4 py-4 shadow-sm" />
      </div>
    </div>
  )
}

