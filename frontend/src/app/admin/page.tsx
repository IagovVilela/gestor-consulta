'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import { Building2, CalendarDays, Users, Stethoscope } from 'lucide-react'

interface Metrics {
  clinicas: {
    total: number
    ativas: number
    trial: number
    suspensas: number
    canceladas: number
    novasMes: number
  }
  consultas: {
    hoje: number
    seteDias: number
    mes: number
  }
  equipe: {
    usuarios: number
    profissionais: number
    pacientes: number
  }
  clinicasRecentes: Array<{
    id: string
    nome: string
    statusPlataforma: string
    counts?: { profissionais: number; pacientes: number; consultas: number }
  }>
}

const statusLabel: Record<string, string> = {
  TRIAL: 'Ativa',
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
  CANCELADA: 'Cancelada',
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/admin/metrics')
      .then((response) => setMetrics(response.data))
      .catch((err) => setError(err.response?.data?.message || 'Erro ao carregar panorama'))
  }, [])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!metrics) {
    return <p className="text-sm text-muted-foreground">Carregando panorama da plataforma...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panorama da plataforma</h1>
          <p className="text-muted-foreground">
            Visão geral dos clientes, uso e saúde do Gestor Consulta
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clinicas">Gerenciar clínicas</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4" /> Clínicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.clinicas.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.clinicas.ativas + metrics.clinicas.trial} ativas · {metrics.clinicas.suspensas} suspensas ·{' '}
              {metrics.clinicas.canceladas} canceladas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4" /> Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.consultas.hoje}</div>
            <p className="text-xs text-muted-foreground">
              Hoje · {metrics.consultas.seteDias} em 7d · {metrics.consultas.mes} no mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Stethoscope className="h-4 w-4" /> Equipe nas clínicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.equipe.profissionais}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.equipe.usuarios} usuários ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" /> Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.equipe.pacientes}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.clinicas.novasMes} clínicas novas neste mês
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.clinicasRecentes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma clínica cadastrada ainda.</p>
          )}
          {metrics.clinicasRecentes.map((clinica) => (
            <Link
              key={clinica.id}
              href={`/admin/clinicas/${clinica.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{clinica.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {statusLabel[clinica.statusPlataforma] || clinica.statusPlataforma}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {clinica.counts?.profissionais || 0} prof. · {clinica.counts?.pacientes || 0} pac. · {clinica.counts?.consultas || 0} cons.
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
