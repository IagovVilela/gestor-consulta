'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'
import { ClinicaSelector } from '@/components/clinica/ClinicaSelector'
import api from '@/lib/axios'

interface Notificacao {
  id: string
  titulo: string
  mensagem?: string | null
  lida: boolean
  createdAt: string
}

export function Header() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { clinica } = useClinica()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false)

  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN'

  const loadNotificacoes = useCallback(async () => {
    if (!user) return
    try {
      setLoadingNotificacoes(true)
      const [listaRes, countRes] = await Promise.all([
        api.get('/notificacoes'),
        api.get('/notificacoes/nao-lidas'),
      ])
      setNotificacoes(Array.isArray(listaRes.data) ? listaRes.data.slice(0, 8) : [])
      setNaoLidas(Number(countRes.data?.count || 0))
    } catch {
      setNotificacoes([])
      setNaoLidas(0)
    } finally {
      setLoadingNotificacoes(false)
    }
  }, [user])

  useEffect(() => {
    loadNotificacoes()
    const interval = setInterval(loadNotificacoes, 60000)
    return () => clearInterval(interval)
  }, [loadNotificacoes])

  const marcarComoLida = async (id: string) => {
    try {
      await api.put(`/notificacoes/${id}/lida`)
      setNotificacoes((prev) =>
        prev.map((item) => (item.id === id ? { ...item, lida: true } : item)),
      )
      setNaoLidas((prev) => Math.max(0, prev - 1))
    } catch {
      // silencioso: UI já mostra a lista
    }
  }

  const roleLabel =
    user?.role?.toUpperCase() === 'ADMIN'
      ? 'Administrador'
      : user?.role?.toUpperCase() === 'MEDICO'
        ? 'Médico'
        : user?.role?.toUpperCase() === 'SECRETARIA'
          ? 'Secretária'
          : user?.role || ''

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Bem-vindo, {user?.name || 'Usuário'}</h2>
        {clinica && !isUserAdmin && (
          <span className="text-sm text-muted-foreground">• {clinica.nome}</span>
        )}
        {isUserAdmin && <ClinicaSelector />}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) loadNotificacoes()
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Notificações" className="relative">
              <Bell className="h-5 w-5" />
              {naoLidas > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {loadingNotificacoes ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notificacoes.map((notificacao) => (
                <DropdownMenuItem
                  key={notificacao.id}
                  className="flex cursor-pointer flex-col items-start gap-1 py-3"
                  onSelect={(event) => {
                    event.preventDefault()
                    if (!notificacao.lida) {
                      void marcarComoLida(notificacao.id)
                    }
                  }}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className={`text-sm ${notificacao.lida ? 'font-normal' : 'font-semibold'}`}>
                      {notificacao.titulo}
                    </span>
                    {!notificacao.lida && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  {notificacao.mensagem && (
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {notificacao.mensagem}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(notificacao.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Perfil">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Usuário'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {roleLabel && (
                  <p className="text-xs leading-none text-muted-foreground">{roleLabel}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                router.push(isUserAdmin ? '/admin' : '/configuracoes')
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              {isUserAdmin ? 'Painel Admin' : 'Meu perfil'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
