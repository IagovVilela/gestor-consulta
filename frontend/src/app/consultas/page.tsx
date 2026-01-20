'use client'

import { useEffect, useState, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Play, CheckCircle, XCircle, Eye, Archive, ArchiveRestore } from 'lucide-react'
import api from '@/lib/axios'

interface Consulta {
  id: string
  dataHora: string
  status: string
  archived?: boolean
  paciente?: {
    id: string
    nome: string
  } | null
  profissional?: {
    id: string
    nome: string
    especialidade?: {
      nome: string
    } | null
  } | null
}

const statusLabels: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  EM_ATENDIMENTO: 'Em Atendimento',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
  FALTA: 'Falta',
}

const statusColors: Record<string, string> = {
  AGENDADA: 'bg-blue-100 text-blue-800',
  CONFIRMADA: 'bg-green-100 text-green-800',
  EM_ATENDIMENTO: 'bg-yellow-100 text-yellow-800',
  ATENDIDA: 'bg-gray-100 text-gray-800',
  CANCELADA: 'bg-red-100 text-red-800',
  FALTA: 'bg-orange-100 text-orange-800',
}

export default function ConsultasPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showArchived, setShowArchived] = useState(false)
  const { toast } = useToast()

  const loadConsultas = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (showArchived) {
        params.includeArchived = 'true'
      }
      const response = await api.get('/consultas', { params })
      console.log('📋 Consultas recebidas:', response.data)
      console.log('📊 Total:', Array.isArray(response.data) ? response.data.length : 'Não é array')
      
      // Mapear os dados para o formato esperado pelo frontend
      const mappedConsultas = Array.isArray(response.data) ? response.data.map((c: any) => {
        const profissional = c.profissionais || c.profissional;
        return {
          ...c,
          paciente: c.pacientes || c.paciente,
          profissional: profissional ? {
            ...profissional,
            nome: profissional.nomeCompleto || profissional.nome,
            especialidade: profissional.especialidades || profissional.especialidade,
          } : null,
        };
      }) : []
      
      console.log('✅ Consultas mapeadas:', mappedConsultas)
      setConsultas(mappedConsultas)
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as consultas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, showArchived, toast])

  useEffect(() => {
    loadConsultas()
  }, [loadConsultas])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.put(`/consultas/${id}/status`, { status })
      toast({
        title: 'Sucesso',
        description: 'Status da consulta atualizado',
      })
      loadConsultas()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao atualizar status',
        variant: 'destructive',
      })
    }
  }

  const handleIniciar = async (id: string) => {
    try {
      await api.post(`/consultas/${id}/iniciar`)
      toast({
        title: 'Sucesso',
        description: 'Atendimento iniciado',
      })
      loadConsultas()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao iniciar atendimento',
        variant: 'destructive',
      })
    }
  }

  const handleFinalizar = async (id: string) => {
    try {
      await api.post(`/consultas/${id}/finalizar`)
      toast({
        title: 'Sucesso',
        description: 'Atendimento finalizado',
      })
      loadConsultas()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao finalizar atendimento',
        variant: 'destructive',
      })
    }
  }

  const handleArquivar = async (id: string) => {
    try {
      await api.post(`/consultas/${id}/arquivar`)
      toast({
        title: 'Sucesso',
        description: 'Consulta arquivada com sucesso',
      })
      loadConsultas()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao arquivar consulta',
        variant: 'destructive',
      })
    }
  }

  const handleDesarquivar = async (id: string) => {
    try {
      await api.post(`/consultas/${id}/desarquivar`)
      toast({
        title: 'Sucesso',
        description: 'Consulta desarquivada com sucesso',
      })
      loadConsultas()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao desarquivar consulta',
        variant: 'destructive',
      })
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Consultas</h1>
            <p className="text-muted-foreground">
              Gerencie as consultas em andamento
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showArchived"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="showArchived" className="text-sm font-medium cursor-pointer">
                Mostrar arquivadas
              </label>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="AGENDADA">Agendada</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
                <SelectItem value="ATENDIDA">Atendida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                <SelectItem value="FALTA">Falta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : consultas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma consulta encontrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.map((consulta) => (
                    <TableRow key={consulta.id}>
                      <TableCell className="font-medium">
                        {consulta.paciente?.nome || 'N/A'}
                      </TableCell>
                      <TableCell>{consulta.profissional?.nome || 'N/A'}</TableCell>
                      <TableCell>
                        {consulta.profissional?.especialidade?.nome || 'Sem especialidade'}
                      </TableCell>
                      <TableCell>{formatDateTime(consulta.dataHora)}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            statusColors[consulta.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {statusLabels[consulta.status] || consulta.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {consulta.status === 'CONFIRMADA' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleIniciar(consulta.id)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Iniciar
                            </Button>
                          )}
                          {consulta.status === 'EM_ATENDIMENTO' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFinalizar(consulta.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Finalizar
                            </Button>
                          )}
                          {consulta.status === 'AGENDADA' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(consulta.id, 'CONFIRMADA')
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirmar
                            </Button>
                          )}
                          {(consulta.status === 'AGENDADA' ||
                            consulta.status === 'CONFIRMADA') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(consulta.id, 'CANCELADA')
                              }
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </Button>
                          )}
                          {!consulta.archived ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleArquivar(consulta.id)}
                              title="Arquivar consulta"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDesarquivar(consulta.id)}
                              title="Desarquivar consulta"
                            >
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Desarquivar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
