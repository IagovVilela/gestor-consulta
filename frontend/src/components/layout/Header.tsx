'use client'

import { Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'
import { ClinicaSelector } from '@/components/clinica/ClinicaSelector'

export function Header() {
  const { user } = useAuthStore()
  const { clinica } = useClinica()
  
  // ADMIN não deve ter clínica vinculada
  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN'

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Bem-vindo, {user?.name || 'Usuário'}</h2>
        {clinica && !isUserAdmin && (
          <span className="text-sm text-muted-foreground">• {clinica.nome}</span>
        )}
        {isUserAdmin && <ClinicaSelector />}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" title="Notificações">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Perfil">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}

