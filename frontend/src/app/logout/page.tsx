'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Limpar todos os dados de autenticação
    localStorage.removeItem('token')
    localStorage.removeItem('auth-storage')
    localStorage.removeItem('clinica-storage')
    
    // Aguardar um pouco para garantir que foi limpo
    setTimeout(() => {
      // Redirecionar para login
      window.location.href = '/login'
    }, 100)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Saindo...</p>
      </div>
    </div>
  )
}



