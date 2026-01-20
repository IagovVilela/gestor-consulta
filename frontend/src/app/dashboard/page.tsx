'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '@/lib/axios'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

// Cores baseadas no status da consulta
const getStatusColors = (status: string): { bg: string; text: string } => {
  switch (status) {
    case 'AGENDADA':
      return { bg: 'bg-blue-100', text: 'text-blue-800' }
    case 'CONFIRMADA':
      return { bg: 'bg-green-100', text: 'text-green-800' }
    case 'EM_ATENDIMENTO':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    case 'ATENDIDA':
      return { bg: 'bg-gray-100', text: 'text-gray-800' }
    case 'CANCELADA':
      return { bg: 'bg-red-100', text: 'text-red-800' }
    case 'FALTA':
      return { bg: 'bg-orange-100', text: 'text-orange-800' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [consultasHoje, setConsultasHoje] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { selectedClinicaId } = useClinica()

  useEffect(() => {
    // Aguardar o usuário estar disponível antes de carregar dados
    if (user) {
      loadData()
    }
  }, [selectedClinicaId, user?.id, user?.clinicaId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Determinar clinicaId para filtrar
      // ADMIN pode selecionar clínica específica ou ver todas
      // SECRETARIA e MEDICO sempre usam sua própria clínica
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
      let filterClinicaId: string | undefined
      
      if (isAdmin) {
        // ADMIN pode selecionar clínica específica
        filterClinicaId = selectedClinicaId && selectedClinicaId !== 'all' 
          ? selectedClinicaId 
          : undefined
      } else {
        // SECRETARIA e MEDICO sempre usam sua própria clínica
        filterClinicaId = user?.clinicaId || undefined
      }

      console.log('📊 Dashboard - Carregando dados:', {
        userRole: user?.role,
        userClinicaId: user?.clinicaId,
        selectedClinicaId,
        filterClinicaId,
      })

      const params: any = {}
      // Sempre enviar clinicaId se disponível (o backend vai usar mesmo se não enviarmos)
      // Mas é melhor enviar explicitamente para garantir
      if (filterClinicaId) {
        params.clinicaId = filterClinicaId
      }

      const [metricsRes, consultasRes] = await Promise.all([
        api.get('/dashboard/metrics', { params }),
        api.get('/dashboard/consultas-hoje', { params }),
      ])
      
      console.log('📊 Dashboard - Resposta metrics:', metricsRes.data)
      console.log('📊 Dashboard - Resposta consultas:', consultasRes.data)
      
      setMetrics(metricsRes.data)
      
      // Mapear os dados para o formato esperado pelo frontend
      const mappedConsultas = Array.isArray(consultasRes.data) ? consultasRes.data.map((c: any) => {
        const profissional = c.profissionais || c.profissional;
        return {
          ...c,
          paciente: c.pacientes || c.paciente,
          profissional: profissional ? {
            ...profissional,
            nome: profissional.nomeCompleto || profissional.nome,
          } : null,
        };
      }) : []
      
      console.log('📊 Dashboard - Consultas mapeadas:', mappedConsultas)
      setConsultasHoje(mappedConsultas)
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados do dashboard:', error)
      console.error('❌ Erro response:', error.response)
      console.error('❌ Erro status:', error.response?.status)
      console.error('❌ Erro data:', error.response?.data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  const statusData = [
    { name: 'Agendadas', value: consultasHoje.filter((c) => c.status === 'AGENDADA').length },
    { name: 'Confirmadas', value: consultasHoje.filter((c) => c.status === 'CONFIRMADA').length },
    { name: 'Atendidas', value: consultasHoje.filter((c) => c.status === 'ATENDIDA').length },
  ]

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Consultas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.consultasHoje || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Atendimentos Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.atendimentosMes || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Faltas/Cancelamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.faltasCancelamentos || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Ocupação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.taxaOcupacao || 0}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Status das Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consultas de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {consultasHoje.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma consulta agendada para hoje
                  </p>
                ) : (
                  consultasHoje.map((consulta) => {
                    const statusColors = getStatusColors(consulta.status || 'AGENDADA')
                    return (
                      <div
                        key={consulta.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${statusColors.bg} ${statusColors.text}`}
                      >
                        <div>
                          <p className="font-medium">{consulta.paciente?.nome || 'N/A'}</p>
                          <p className="text-sm opacity-75">
                            {new Date(consulta.dataHora).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text} border-2 border-current`}
                        >
                          {consulta.status}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}

