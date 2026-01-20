'use client'

import Image from 'next/image'
import { useClinica } from '@/contexts/clinica-context'
import { useAuthStore } from '@/lib/store/auth-store'
import { Building2 } from 'lucide-react'

export function ClinicaLogo({ className = '' }: { className?: string }) {
  const { clinica } = useClinica()
  const { user } = useAuthStore()
  
  // ADMIN não deve ter logo de clínica
  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN'
  
  // Se for ADMIN ou não tiver clínica vinculada, mostrar ícone padrão
  if (isUserAdmin || !clinica?.logoUrl) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-primary/10 p-2 ${className}`}>
        <Building2 className="h-6 w-6 text-primary" />
      </div>
    )
  }

  // Se tiver clínica vinculada e não for ADMIN, mostrar logo
  return (
    <Image
      src={clinica.logoUrl}
      alt={clinica.nome}
      width={40}
      height={40}
      className={className}
    />
  )
}



