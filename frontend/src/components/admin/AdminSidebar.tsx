'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Building2,
  LayoutDashboard,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/auth-store'
import { COMPANY } from '@/lib/company'
import Image from 'next/image'

const menuItems = [
  { href: '/admin', label: 'Panorama', icon: LayoutDashboard, exact: true },
  { href: '/admin/clinicas', label: 'Clientes / Clínicas', icon: Building2 },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuthStore()

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-slate-950 text-slate-100">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <Image
          src={COMPANY.logoSrc}
          alt={COMPANY.name}
          width={36}
          height={36}
          className="rounded-full"
        />
        <div className="leading-tight">
          <p className="text-sm font-bold">Painel do Dono</p>
          <p className="text-[11px] text-slate-400">{COMPANY.shortName}</p>
        </div>
      </div>

      <div className="border-b border-white/10 px-5 py-3 text-xs text-slate-400">
        Logado como <span className="text-slate-200">{user?.name || 'Admin'}</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        <Link
          href="/dashboard"
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Ver operação clínica
        </Link>
      </nav>

      <div className="border-t border-white/10 p-4 space-y-2 text-xs text-slate-400">
        <a href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer" className="block hover:text-white">
          {COMPANY.phoneDisplay}
        </a>
        <a href={COMPANY.instagramUrl} target="_blank" rel="noopener noreferrer" className="block hover:text-white">
          Instagram {COMPANY.instagramHandle}
        </a>
        <button
          onClick={() => logout()}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  )
}
