'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinicaStore } from '@/lib/store/clinica-store'

interface Clinica {
  id: string
  nome: string
  logoUrl?: string | null
  corPrimaria?: string | null
  corSecundaria?: string | null
  cnpj?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
}

interface ClinicaContextType {
  clinica: Clinica | null
  clinicas: Clinica[]
  selectedClinicaId: string | null
  setSelectedClinicaId: (clinicaId: string | null) => void
  loadClinicas: () => Promise<void>
  updatePersonalization: (clinicaId: string, data: {
    logoUrl?: string
    corPrimaria?: string
    corSecundaria?: string
  }) => Promise<void>
  loading: boolean
}

const ClinicaContext = createContext<ClinicaContextType | undefined>(undefined)

export function ClinicaProvider({ children }: { children: ReactNode }) {
  const { user, clinica: authClinica } = useAuthStore()
  const {
    clinica,
    clinicas,
    selectedClinicaId,
    setSelectedClinicaId,
    loadClinicas,
    updateClinicaPersonalization,
    loading,
    setClinica,
  } = useClinicaStore()

  // Sincronizar clínica do auth store com o clinica store
  // ADMIN não deve ter clínica vinculada
  useEffect(() => {
    const isUserAdmin = user?.role?.toUpperCase() === 'ADMIN'
    
    // Se for ADMIN, limpar qualquer clínica existente
    if (isUserAdmin) {
      setClinica(null)
      return
    }
    
    // Se não for ADMIN, sincronizar clínica normalmente
    if (authClinica) {
      setClinica(authClinica)
    } else if (user?.clinicaId && !clinica) {
      // Se não há clínica no auth mas há clinicaId no user, carregar
      useClinicaStore.getState().loadClinica(user.clinicaId)
    }
  }, [authClinica, user?.clinicaId, user?.role, clinica, setClinica])

  // Aplicar CSS variables quando a clínica muda
  useEffect(() => {
    if (clinica && typeof window !== 'undefined') {
      const root = document.documentElement
      if (clinica.corPrimaria) {
        root.style.setProperty('--clinica-primary', clinica.corPrimaria)
      }
      if (clinica.corSecundaria) {
        root.style.setProperty('--clinica-secondary', clinica.corSecundaria)
      }
    }
  }, [clinica])

  return (
    <ClinicaContext.Provider
      value={{
        clinica,
        clinicas,
        selectedClinicaId,
        setSelectedClinicaId,
        loadClinicas,
        updatePersonalization: updateClinicaPersonalization,
        loading,
      }}
    >
      {children}
    </ClinicaContext.Provider>
  )
}

export function useClinica() {
  const context = useContext(ClinicaContext)
  if (context === undefined) {
    throw new Error('useClinica deve ser usado dentro de um ClinicaProvider')
  }
  return context
}



