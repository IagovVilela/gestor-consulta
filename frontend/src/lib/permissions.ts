/**
 * Matriz de acesso do Gestor Consulta
 *
 * ADMIN (Iago)     → admin do sistema, acesso total
 * Clinic Owner     → dono da clínica (ownerId), admin apenas da sua clínica
 * MEDICO           → profissional clínico (sem ser dono)
 * SECRETARIA       → operação da clínica
 */

export type AppRole = 'ADMIN' | 'MEDICO' | 'SECRETARIA' | string

export interface PermissionUser {
  id?: string
  role?: AppRole | null
  clinicaId?: string | null
  isClinicOwner?: boolean
}

export function normalizeRole(role?: string | null): string {
  return String(role || '').toUpperCase().trim()
}

export function isSystemAdmin(user?: PermissionUser | null): boolean {
  return normalizeRole(user?.role) === 'ADMIN'
}

export function isClinicOwner(user?: PermissionUser | null): boolean {
  if (!user || isSystemAdmin(user)) return false
  return user.isClinicOwner === true
}

/** Admin da clínica: dono ou secretária (não inclui médico comum) */
export function canManageClinic(user?: PermissionUser | null): boolean {
  if (!user) return false
  if (isSystemAdmin(user)) return true
  if (isClinicOwner(user)) return true
  return normalizeRole(user.role) === 'SECRETARIA' && !!user.clinicaId
}

export function canManageProfessionals(user?: PermissionUser | null): boolean {
  return canManageClinic(user)
}

export function canManageSpecialties(user?: PermissionUser | null): boolean {
  return canManageClinic(user)
}

export function canManageClinicUsers(user?: PermissionUser | null): boolean {
  return isSystemAdmin(user) || isClinicOwner(user)
}

export function canAccessSystemAdmin(user?: PermissionUser | null): boolean {
  return isSystemAdmin(user)
}
