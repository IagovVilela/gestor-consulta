'use client'

import { useEffect } from 'react'
import { useLoadingStore } from '@/lib/store/loading-store'
import { cn } from '@/lib/utils'

export function GlobalLoadingBar() {
  const pending = useLoadingStore((state) => state.pending)
  const active = pending > 0

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('global-loading', active)
    return () => {
      document.body.classList.remove('global-loading')
    }
  }, [active])

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-transparent transition-opacity',
        active ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!active}
      role="progressbar"
      aria-busy={active}
    >
      <div
        className={cn(
          'h-full w-1/3 rounded-r-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]',
          active && 'animate-global-loading-bar',
        )}
      />
    </div>
  )
}
