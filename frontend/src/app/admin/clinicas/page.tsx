'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import api from '@/lib/axios'
import { useToast } from '@/components/ui/use-toast'

interface ClinicaAdmin {
  id: string
  nome: string
  email?: string | null
  telefone?: string | null
  slug?: string | null
  statusPlataforma: string
  owner?: { name: string; email: string } | null
  counts?: {
    profissionais: number
    pacientes: number
    users: number
    consultas: number
  }
}

const statusLabel: Record<string, string> = {
  TRIAL: 'Ativa',
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
  CANCELADA: 'Cancelada',
}

export default function AdminClinicasPage() {
  const { toast } = useToast()
  const [clinicas, setClinicas] = useState<ClinicaAdmin[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/clinicas', {
        params: { search: search || undefined, status },
      })
      setClinicas(response.data)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível listar as clínicas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes / Clínicas</h1>
        <p className="text-muted-foreground">
          Gerencie status, portal e acesso de cada cliente. Cobrança fica no sistema de assinaturas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Buscar por nome, email, CNPJ ou slug"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && load()}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ATIVA">Ativa</SelectItem>
              <SelectItem value="SUSPENSA">Suspensa</SelectItem>
              <SelectItem value="CANCELADA">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load}>Buscar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : clinicas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma clínica encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinicas.map((clinica) => (
                  <TableRow key={clinica.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{clinica.nome}</p>
                        <p className="text-xs text-muted-foreground">{clinica.email || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{statusLabel[clinica.statusPlataforma] || clinica.statusPlataforma}</TableCell>
                    <TableCell>
                      <div>
                        <p>{clinica.owner?.name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{clinica.owner?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {clinica.counts?.profissionais || 0} prof. · {clinica.counts?.pacientes || 0} pac.
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/clinicas/${clinica.id}`}>Abrir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
