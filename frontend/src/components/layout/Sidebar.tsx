'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'
import { ClinicaLogo } from '@/components/clinica/ClinicaLogo'
import { COMPANY } from '@/lib/company'

const allMenuItems = [
  { href: '/admin', label: 'Painel do Dono', icon: Settings, roles: ['ADMIN'] },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/profissionais', label: 'Profissionais', icon: User, roles: ['ADMIN', 'SECRETARIA'] },
  { href: '/consultas', label: 'Consultas', icon: ClipboardList },
  { href: '/prontuario', label: 'Prontuário', icon: FileText },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuthStore()
  const { clinica } = useClinica()
  
  // ADMIN não deve ter clínica vinculada
  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN'
  const shouldShowClinica = !isUserAdmin && clinica
  
  // Filtrar itens do menu baseado no role do usuário
  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles) return true // Sem restrição de role
    if (!user?.role) return false
    return item.roles.some((role) => 
      user.role?.toUpperCase() === role.toUpperCase()
    )
  })

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <ClinicaLogo className="h-10 w-10" />
        <div className="flex flex-col">
          <h1 className="text-sm font-bold leading-tight">
            {shouldShowClinica ? clinica.nome : 'Gestor Consultas'}
          </h1>
          {shouldShowClinica && (
            <span className="text-xs text-muted-foreground">Sistema</span>
          )}
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4 space-y-3">
        <div className="px-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/80">{COMPANY.shortName}</p>
          <a
            href={COMPANY.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-foreground hover:underline"
          >
            {COMPANY.phoneDisplay}
          </a>
          <a
            href={COMPANY.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-foreground hover:underline"
          >
            Instagram {COMPANY.instagramHandle}
          </a>
        </div>
        <button
          onClick={() => {
            logout()
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  )
}

