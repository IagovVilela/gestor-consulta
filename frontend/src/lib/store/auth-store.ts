import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Clinica {
  id: string
  nome: string
  logoUrl?: string | null
  corPrimaria?: string | null
  corSecundaria?: string | null
}

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MEDICO' | 'SECRETARIA' | 'admin' | 'medico' | 'secretaria'
  clinicaId?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  clinica: Clinica | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, clinica?: Clinica | null) => void
  setClinica: (clinica: Clinica | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      clinica: null,
      isAuthenticated: false,
      setAuth: (user, token, clinica = null) => {
        // ADMIN não deve ter clínica vinculada
        const isUserAdmin = user.role?.toUpperCase() === 'ADMIN'
        const clinicaToSave = isUserAdmin ? null : clinica
        
        // Salvar token no localStorage
        localStorage.setItem('token', token)
        
        // Salvar no estado do Zustand (que será persistido automaticamente)
        set({ 
          user: {
            ...user,
            // Garantir que ADMIN não tenha clinicaId
            clinicaId: isUserAdmin ? null : user.clinicaId
          }, 
          token,
          clinica: clinicaToSave,
          isAuthenticated: true 
        })
        
        // Forçar persistência imediata
        if (typeof window !== 'undefined') {
          // O Zustand persist já salva automaticamente, mas garantimos aqui
          const storage = localStorage.getItem('auth-storage')
          if (!storage) {
            localStorage.setItem('auth-storage', JSON.stringify({
              state: { user, token, clinica, isAuthenticated: true },
              version: 0
            }))
          }
        }
      },
      setClinica: (clinica) => {
        set({ clinica })
      },
      logout: () => {
        // Limpar todos os dados de autenticação
        localStorage.removeItem('token')
        localStorage.removeItem('auth-storage')
        localStorage.removeItem('clinica-storage')
        
        // Limpar estado do Zustand
        set({ user: null, token: null, clinica: null, isAuthenticated: false })
        
        // Redirecionar para logout page que força limpeza completa
        if (typeof window !== 'undefined') {
          window.location.href = '/logout'
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

