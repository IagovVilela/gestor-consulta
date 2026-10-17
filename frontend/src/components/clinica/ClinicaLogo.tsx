'use client'

import { useClinica } from '@/contexts/clinica-context'
import { useAuthStore } from '@/lib/store/auth-store'
import { normalizeMediaUrl } from '@/lib/media'
import { ProductLogo } from '@/components/brand/ProductLogo'
import { PRODUCT } from '@/lib/company'

export function ClinicaLogo({ className = '' }: { className?: string }) {
  const { clinica } = useClinica()
  const { user } = useAuthStore()
  const logoSrc = normalizeMediaUrl(clinica?.logoUrl)
  
  // ADMIN não deve ter logo de clínica
  const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN'
  
  // Se for ADMIN ou não tiver clínica vinculada, mostrar marca do produto
  if (isUserAdmin || !logoSrc) {
    return <ProductLogo variant="icon" className={className} />
  }

  // Se tiver clínica vinculada e não for ADMIN, mostrar logo
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc}
      alt={clinica?.nome || PRODUCT.name}
      width={40}
      height={40}
      className={className}
    />
  )
}



