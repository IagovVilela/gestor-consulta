'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/axios'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinicaStore } from '@/lib/store/clinica-store'
import { ADMIN_BACKUP_KEY } from '@/components/admin/ImpersonationBanner'
interface ClinicaDetalhe {
  id: string
  nome: string
  cnpj?: string | null
  email?: string | null
  telefone?: string | null
  endereco?: string | null
  slug?: string | null
  statusPlataforma: string
  observacoesAdmin?: string | null
  owner?: { id: string; name: string; email: string } | null
  users: Array<{ id: string; name: string; email: string; role: string }>
  profissionais: Array<{ id: string; nomeCompleto: string; especialidade?: string | null }>
  counts?: {
    users: number
    profissionais: number
    pacientes: number
    consultas: number
  }
  metricas?: { consultasMes: number }
}

export default function AdminClinicaDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const { user, token, setAuth } = useAuthStore()
  const { setSelectedClinicaId } = useClinicaStore()

  const [clinica, setClinica] = useState<ClinicaDetalhe | null>(null)
  const [status, setStatus] = useState('ATIVA')
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const clinicaRes = await api.get(`/admin/clinicas/${params.id}`)
    const data = clinicaRes.data as ClinicaDetalhe
    setClinica(data)
    // TRIAL legado passa a ser tratado como ATIVA na UI
    setStatus(data.statusPlataforma === 'TRIAL' ? 'ATIVA' : data.statusPlataforma)
    setObservacoes(data.observacoesAdmin || '')
  }

  useEffect(() => {
    load().catch((error) => {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Clínica não encontrada',
        variant: 'destructive',
      })
      router.push('/admin/clinicas')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await api.put(`/admin/clinicas/${params.id}`, {
        statusPlataforma: status,
        observacoesAdmin: observacoes || null,
      })
      setClinica(response.data)
      toast({ title: 'Salvo', description: 'Dados da clínica atualizados.' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Falha ao salvar',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const copyPortal = async () => {
    try {
      const response = await api.post(`/admin/clinicas/${params.id}/portal-link`)
      const url = `${window.location.origin}${response.data.path}`
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copiado', description: url })
      await load()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível gerar o link',
        variant: 'destructive',
      })
    }
  }

  const openOperacao = () => {
    setSelectedClinicaId(params.id)
    window.location.href = '/dashboard'
  }

  const impersonate = async () => {
    try {
      if (user && token) {
        sessionStorage.setItem(
          ADMIN_BACKUP_KEY,
          JSON.stringify({ user, token }),
        )
      }
      const response = await api.post(`/admin/clinicas/${params.id}/impersonate`)
      setAuth(response.data.user, response.data.access_token, response.data.clinica)
      window.location.href = '/dashboard'
    } catch (error: any) {
      sessionStorage.removeItem(ADMIN_BACKUP_KEY)
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível impersonar',
        variant: 'destructive',
      })
    }
  }

  if (!clinica) {
    return <p className="text-sm text-muted-foreground">Carregando clínica...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/clinicas" className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{clinica.nome}</h1>
          <p className="text-muted-foreground">
            {clinica.email || 'Sem email'} · {clinica.telefone || 'Sem telefone'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyPortal}>Copiar link do portal</Button>
          <Button variant="outline" onClick={openOperacao}>Abrir operação</Button>
          <Button onClick={impersonate}>Impersonar gerente</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Usuários</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{clinica.counts?.users || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Profissionais</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{clinica.counts?.profissionais || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pacientes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{clinica.counts?.pacientes || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Consultas no mês</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{clinica.metricas?.consultasMes || 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gestão da plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={save}>
              <div className="space-y-2">
                <Label>Status operacional</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVA">Ativa</SelectItem>
                    <SelectItem value="SUSPENSA">Suspensa</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cobrança e assinatura ficam no outro sistema. Use o status só para liberar ou bloquear o acesso.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Observações internas</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Portal: {clinica.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${clinica.slug}` : 'ainda sem slug'}
              </div>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipe da clínica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Usuários</p>
              <div className="space-y-2">
                {clinica.users.map((u) => (
                  <div key={u.id} className="rounded-md border px-3 py-2 text-sm">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · {u.role}</p>
                  </div>
                ))}
                {clinica.users.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum usuário ativo.</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Profissionais</p>
              <div className="space-y-2">
                {clinica.profissionais.map((p) => (
                  <div key={p.id} className="rounded-md border px-3 py-2 text-sm">
                    <p className="font-medium">{p.nomeCompleto}</p>
                    <p className="text-xs text-muted-foreground">{p.especialidade || 'Sem especialidade'}</p>
                  </div>
                ))}
                {clinica.profissionais.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum profissional ativo.</p>
                )}
              </div>
            </div>
            {clinica.owner && (
              <p className="text-xs text-muted-foreground">
                Gerente: {clinica.owner.name} ({clinica.owner.email})
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
