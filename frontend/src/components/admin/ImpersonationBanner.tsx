'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'

const ADMIN_BACKUP_KEY = 'admin-session-backup'

export function ImpersonationBanner() {
  const { setAuth } = useAuthStore()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(!!sessionStorage.getItem(ADMIN_BACKUP_KEY))
  }, [])

  const exit = () => {
    const raw = sessionStorage.getItem(ADMIN_BACKUP_KEY)
    if (!raw) return
    try {
      const backup = JSON.parse(raw)
      sessionStorage.removeItem(ADMIN_BACKUP_KEY)
      setAuth(backup.user, backup.token, null)
      window.location.href = '/admin'
    } catch {
      sessionStorage.removeItem(ADMIN_BACKUP_KEY)
      window.location.href = '/login'
    }
  }

  if (!active) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-amber-950">
      <span>Você está impersonando um usuário da clínica. As ações ficam no contexto dele.</span>
      <Button size="sm" variant="secondary" onClick={exit}>
        Voltar ao painel admin
      </Button>
    </div>
  )
}

export { ADMIN_BACKUP_KEY }
