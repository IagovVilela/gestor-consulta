import Image from 'next/image'
import { COMPANY } from '@/lib/company'
import { cn } from '@/lib/utils'

interface CompanyContactProps {
  className?: string
  showLogo?: boolean
  compact?: boolean
}

export function CompanyContact({
  className,
  showLogo = true,
  compact = false,
}: CompanyContactProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 text-center', className)}>
      {showLogo && (
        <Image
          src={COMPANY.logoSrc}
          alt={COMPANY.name}
          width={compact ? 72 : 96}
          height={compact ? 72 : 96}
          className="rounded-full"
        />
      )}
      <div className="space-y-1">
        <p className={cn('font-semibold tracking-wide', compact ? 'text-sm' : 'text-base')}>
          {COMPANY.name}
        </p>
        <p className="text-xs text-muted-foreground">Suporte e contato comercial</p>
      </div>
      <div className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-2', compact ? 'text-xs' : 'text-sm')}>
        <a
          href={COMPANY.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {COMPANY.phoneDisplay}
        </a>
        <a
          href={COMPANY.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Instagram {COMPANY.instagramHandle}
        </a>
      </div>
    </div>
  )
}
