'use client'

import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClinica } from '@/contexts/clinica-context'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinicaStore } from '@/lib/store/clinica-store'

export function ClinicaSelector() {
  const { clinicas, selectedClinicaId, setSelectedClinicaId, loadClinicas, clinica } = useClinica()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    // Verificar se há token no localStorage (indica que usuário deve estar autenticado)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    // Se não há token, não fazer nada
    if (!token) {
      return
    }
    
    // Aguardar usuário ser carregado e verificar se é ADMIN
    if (!user || !isAuthenticated) {
      // Se há token mas usuário ainda não carregou, aguardar um pouco
      const timeout = setTimeout(() => {
        const currentUser = useAuthStore.getState().user
        const currentIsAuthenticated = useAuthStore.getState().isAuthenticated
        const isUserAdmin = currentUser?.role?.toUpperCase() === 'ADMIN'
        
        if (currentUser && currentIsAuthenticated && isUserAdmin) {
          console.log('🔄 ClinicaSelector - Carregando clínicas após timeout...')
          loadClinicas()
        }
      }, 200)
      
      return () => clearTimeout(timeout)
    }
    
    const isUserAdmin = user.role?.toUpperCase() === 'ADMIN'
    if (isUserAdmin) {
      console.log('🔄 ClinicaSelector - Carregando clínicas para ADMIN...')
      loadClinicas().then(() => {
        const updatedClinicas = useClinicaStore.getState().clinicas
        console.log('✅ ClinicaSelector - Clínicas carregadas:', updatedClinicas.length)
      }).catch((error: any) => {
        console.error('❌ ClinicaSelector - Erro ao carregar clínicas:', error)
      })
    }
  }, [user, isAuthenticated, loadClinicas])

  // Se não há clínica selecionada, definir "all" como padrão para ADMIN
  useEffect(() => {
    if (user?.role === 'ADMIN' && !selectedClinicaId) {
      setSelectedClinicaId('all')
    }
  }, [selectedClinicaId, user?.role, setSelectedClinicaId])

  if (user?.role !== 'ADMIN') {
    return null
  }

  return (
    <Select
      value={selectedClinicaId || clinica?.id || 'all'}
      onValueChange={(value) => setSelectedClinicaId(value === 'all' ? 'all' : value)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Selecione a clínica" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          Todas as clínicas
        </SelectItem>
        {clinicas && clinicas.length > 0 ? (
          clinicas.map((c: { id: string; nome: string }) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-data" disabled>
            Nenhuma clínica disponível
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}

