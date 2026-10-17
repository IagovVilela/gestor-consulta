import { PRODUCT } from '@/lib/company'
import { cn } from '@/lib/utils'

type ProductLogoVariant = 'full' | 'icon'

interface ProductLogoProps {
  variant?: ProductLogoVariant
  className?: string
  priority?: boolean
}

export function ProductLogo({
  variant = 'full',
  className,
  priority = false,
}: ProductLogoProps) {
  const src = variant === 'icon' ? PRODUCT.iconSrc : PRODUCT.logoSrc

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={PRODUCT.name}
      width={variant === 'icon' ? 40 : 326}
      height={variant === 'icon' ? 40 : 147}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : {})}
      className={cn(
        'object-contain',
        variant === 'icon' ? 'h-10 w-10 rounded-lg' : 'h-20 w-auto',
        className,
      )}
    />
  )
}
