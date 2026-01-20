import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/axios'

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

interface ClinicaState {
  clinica: Clinica | null
  clinicas: Clinica[]
  selectedClinicaId: string | null
  loading: boolean
  setClinica: (clinica: Clinica | null) => void
  setSelectedClinicaId: (clinicaId: string | null) => void
  loadClinicas: () => Promise<void>
  loadClinica: (clinicaId: string) => Promise<void>
  updateClinicaPersonalization: (clinicaId: string, data: {
    logoUrl?: string
    corPrimaria?: string
    corSecundaria?: string
  }) => Promise<void>
}

export const useClinicaStore = create<ClinicaState>()(
  persist(
    (set, get) => ({
      clinica: null,
      clinicas: [],
      selectedClinicaId: null,
      loading: false,
      setClinica: (clinica) => {
        set({ clinica })
        // Aplicar CSS variables quando a clínica muda
        if (clinica && typeof window !== 'undefined') {
          const root = document.documentElement
          if (clinica.corPrimaria) {
            root.style.setProperty('--clinica-primary', clinica.corPrimaria)
          }
          if (clinica.corSecundaria) {
            root.style.setProperty('--clinica-secondary', clinica.corSecundaria)
          }
        }
      },
      setSelectedClinicaId: async (clinicaId) => {
        set({ selectedClinicaId: clinicaId })
        // Se for "all", não carregar clínica específica
        if (clinicaId && clinicaId !== 'all') {
          await get().loadClinica(clinicaId)
        } else if (clinicaId === 'all') {
          // Limpar clínica selecionada quando "Todas" for escolhida
          set({ clinica: null })
        }
      },
      loadClinicas: async () => {
        try {
          set({ loading: true })
          const response = await api.get('/configuracoes/clinicas')
          set({ clinicas: response.data })
        } catch (error) {
          console.error('Erro ao carregar clínicas:', error)
        } finally {
          set({ loading: false })
        }
      },
      loadClinica: async (clinicaId: string) => {
        try {
          set({ loading: true })
          const response = await api.get(`/configuracoes/clinicas/${clinicaId}`)
          const clinica = response.data
          set({ clinica })
          // Aplicar CSS variables
          if (typeof window !== 'undefined') {
            const root = document.documentElement
            if (clinica.corPrimaria) {
              root.style.setProperty('--clinica-primary', clinica.corPrimaria)
            }
            if (clinica.corSecundaria) {
              root.style.setProperty('--clinica-secondary', clinica.corSecundaria)
            }
          }
        } catch (error) {
          console.error('Erro ao carregar clínica:', error)
        } finally {
          set({ loading: false })
        }
      },
      updateClinicaPersonalization: async (clinicaId: string, data) => {
        try {
          const response = await api.put(`/configuracoes/clinicas/${clinicaId}`, data)
          const updatedClinica = response.data
          set({ clinica: updatedClinica })
          // Atualizar CSS variables
          if (typeof window !== 'undefined') {
            const root = document.documentElement
            if (updatedClinica.corPrimaria) {
              root.style.setProperty('--clinica-primary', updatedClinica.corPrimaria)
            }
            if (updatedClinica.corSecundaria) {
              root.style.setProperty('--clinica-secondary', updatedClinica.corSecundaria)
            }
          }
        } catch (error) {
          console.error('Erro ao atualizar personalização:', error)
          throw error
        }
      },
    }),
    {
      name: 'clinica-storage',
      partialize: (state) => ({
        selectedClinicaId: state.selectedClinicaId,
        clinica: state.clinica,
      }),
    }
  )
)



