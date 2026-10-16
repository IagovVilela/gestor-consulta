'use client'

import { useClinica } from '@/contexts/clinica-context'
import { useAuthStore } from '@/lib/store/auth-store'
import { normalizeMediaUrl } from '@/lib/media'
import { Building2 } from 'lucide-react'

export function ClinicaLogo({ className = '' }: { className?: string }) {
  const { clinica } = useClinica()
  const { user } = useAuthStore()
  const logoSrc = normalizeMediaUrl(clinica?.logoUrl)
  
  // ADMIN não deve ter logo de clínica
  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN'
  
  // Se for ADMIN ou não tiver clínica vinculada, mostrar ícone padrão
  if (isUserAdmin || !logoSrc) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-primary/10 p-2 ${className}`}>
        <Building2 className="h-6 w-6 text-primary" />
      </div>
    )
  }

  // Se tiver clínica vinculada e não for ADMIN, mostrar logo
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc}
      alt={clinica?.nome || 'Logo da clínica'}
      width={40}
      height={40}
      className={className}
    />
  )
}



