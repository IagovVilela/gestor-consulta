import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica se o usuário tem o role especificado (case-insensitive)
 */
export function hasRole(userRole: string | undefined | null, role: string): boolean {
  if (!userRole) return false
  return userRole.toUpperCase() === role.toUpperCase()
}

/**
 * Verifica se o usuário é ADMIN
 */
export function isAdmin(userRole: string | undefined | null): boolean {
  return hasRole(userRole, 'ADMIN')
}



