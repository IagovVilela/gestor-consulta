'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MaskedInput } from '@/components/ui/masked-input'
import { Label } from '@/components/ui/label'
import portalApi, { portalErrorMessage } from '@/lib/portal-api'
import { COMPANY } from '@/lib/company'
import { formatCPF, formatPhone } from '@/lib/masks'

interface Profissional {
  id: string
  nome: string
  crm?: string | null
  especialidade?: string | null
}

interface ClinicaPublica {
  nome: string
  telefone?: string | null
  endereco?: string | null
  logoUrl?: string | null
  corPrimaria?: string | null
  profissionais: Profissional[]
}

interface ConsultaPublica {
  id: string
  dataHora: string
  status: string
  observacoes?: string | null
  profissionalId: string
  profissional: string
  especialidade?: string | null
  podeAlterar: boolean
}

const statusLabels: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  EM_ATENDIMENTO: 'Em atendimento',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
  FALTA: 'Falta',
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function todayInput() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatConsulta(value: string) {
  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

function tokenKey(slug: string) {
  return `portal-token:${slug}`
}

export default function PortalPacientePage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [aba, setAba] = useState<'agendar' | 'gerenciar'>('agendar')
  const [clinica, setClinica] = useState<ClinicaPublica | null>(null)
  const [loadingClinica, setLoadingClinica] = useState(true)
  const [erroClinica, setErroClinica] = useState<string | null>(null)

  const [profissionalId, setProfissionalId] = useState('')
  const [data, setData] = useState(todayInput())
  const [horarios, setHorarios] = useState<string[]>([])
  const [hora, setHora] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<ConsultaPublica | null>(null)

  const [acessoCpf, setAcessoCpf] = useState('')
  const [acessoNascimento, setAcessoNascimento] = useState('')
  const [pacienteNome, setPacienteNome] = useState('')
  const [consultas, setConsultas] = useState<ConsultaPublica[] | null>(null)
  const [erroAcesso, setErroAcesso] = useState<string | null>(null)
  const [editando, setEditando] = useState<ConsultaPublica | null>(null)
  const [editData, setEditData] = useState(todayInput())
  const [editHora, setEditHora] = useState('')
  const [editProfissionalId, setEditProfissionalId] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')
  const [editHorarios, setEditHorarios] = useState<string[]>([])

  useEffect(() => {
    if (!slug) return
    setLoadingClinica(true)
    portalApi
      .get(`/portal/${slug}`)
      .then((response) => {
        const dataClinica = response.data as ClinicaPublica
        setClinica(dataClinica)
        if (dataClinica.profissionais[0]) {
          setProfissionalId(dataClinica.profissionais[0].id)
        }
      })
      .catch((error) => setErroClinica(portalErrorMessage(error, 'Não foi possível abrir o agendamento.')))
      .finally(() => setLoadingClinica(false))
  }, [slug])

  useEffect(() => {
    if (!slug || !profissionalId || !data) return
    portalApi
      .get(`/portal/${slug}/horarios`, { params: { profissionalId, data } })
      .then((response) => {
        setHorarios(response.data.horarios || [])
        setHora('')
      })
      .catch(() => setHorarios([]))
  }, [slug, profissionalId, data])

  useEffect(() => {
    if (!slug) return
    const saved = sessionStorage.getItem(tokenKey(slug))
    if (!saved) return
    portalApi
      .get(`/portal/${slug}/consultas`, { headers: { Authorization: `Bearer ${saved}` } })
      .then((response) => {
        setPacienteNome(response.data.paciente?.nome || '')
        setConsultas(response.data.consultas || [])
        setAba('gerenciar')
      })
      .catch(() => sessionStorage.removeItem(tokenKey(slug)))
  }, [slug])

  useEffect(() => {
    if (!slug || !editando || !editProfissionalId || !editData) return
    portalApi
      .get(`/portal/${slug}/horarios`, {
        params: { profissionalId: editProfissionalId, data: editData, ignorar: editando.id },
      })
      .then((response) => setEditHorarios(response.data.horarios || []))
      .catch(() => setEditHorarios([]))
  }, [slug, editando, editProfissionalId, editData])

  const cor = clinica?.corPrimaria || undefined

  async function agendar(event: FormEvent) {
    event.preventDefault()
    setErroForm(null)
    setEnviando(true)
    try {
      const response = await portalApi.post(`/portal/${slug}/agendar`, {
        nome: nome.trim(),
        cpf: onlyDigits(cpf),
        dataNascimento: nascimento,
        telefone: onlyDigits(telefone),
        email: email.trim() || undefined,
        profissionalId,
        data,
        hora,
        observacoes: observacoes.trim() || undefined,
      })
      sessionStorage.setItem(tokenKey(slug), response.data.token)
      setPacienteNome(response.data.paciente.nome)
      setSucesso(response.data.consulta)
      setConsultas(null)
    } catch (error) {
      setErroForm(portalErrorMessage(error, 'Não foi possível agendar.'))
    } finally {
      setEnviando(false)
    }
  }

  async function acessar(event: FormEvent) {
    event.preventDefault()
    setErroAcesso(null)
    setEnviando(true)
    try {
      const response = await portalApi.post(`/portal/${slug}/acessar`, {
        cpf: onlyDigits(acessoCpf),
        dataNascimento: acessoNascimento,
      })
      sessionStorage.setItem(tokenKey(slug), response.data.token)
      setPacienteNome(response.data.paciente.nome)
      setConsultas(response.data.consultas || [])
      setEditando(null)
    } catch (error) {
      setErroAcesso(portalErrorMessage(error, 'Não foi possível localizar os agendamentos.'))
    } finally {
      setEnviando(false)
    }
  }

  function authHeader() {
    const token = sessionStorage.getItem(tokenKey(slug))
    return { Authorization: `Bearer ${token}` }
  }

  async function salvarAlteracao(event: FormEvent) {
    event.preventDefault()
    if (!editando) return
    setErroAcesso(null)
    setEnviando(true)
    try {
      await portalApi.put(
        `/portal/${slug}/consultas/${editando.id}`,
        {
          data: editData,
          hora: editHora,
          profissionalId: editProfissionalId,
          observacoes: editObservacoes.trim(),
        },
        { headers: authHeader() },
      )
      const response = await portalApi.get(`/portal/${slug}/consultas`, { headers: authHeader() })
      setConsultas(response.data.consultas || [])
      setEditando(null)
    } catch (error) {
      setErroAcesso(portalErrorMessage(error, 'Não foi possível alterar o agendamento.'))
    } finally {
      setEnviando(false)
    }
  }

  async function cancelar(consulta: ConsultaPublica) {
    const confirmado = window.confirm(`Cancelar a consulta de ${formatConsulta(consulta.dataHora)}?`)
    if (!confirmado) return
    setErroAcesso(null)
    try {
      await portalApi.post(`/portal/${slug}/consultas/${consulta.id}/cancelar`, {}, { headers: authHeader() })
      const response = await portalApi.get(`/portal/${slug}/consultas`, { headers: authHeader() })
      setConsultas(response.data.consultas || [])
      setEditando(null)
    } catch (error) {
      setErroAcesso(portalErrorMessage(error, 'Não foi possível cancelar o agendamento.'))
    }
  }

  function abrirEdicao(consulta: ConsultaPublica) {
    const quando = new Date(consulta.dataHora)
    const month = String(quando.getMonth() + 1).padStart(2, '0')
    const day = String(quando.getDate()).padStart(2, '0')
    const hours = String(quando.getHours()).padStart(2, '0')
    const minutes = String(quando.getMinutes()).padStart(2, '0')
    setEditando(consulta)
    setEditData(`${quando.getFullYear()}-${month}-${day}`)
    setEditHora(`${hours}:${minutes}`)
    setEditProfissionalId(consulta.profissionalId)
    setEditObservacoes(consulta.observacoes || '')
    setErroAcesso(null)
  }

  if (loadingClinica) {
    return <main className="mx-auto max-w-lg p-6 text-sm text-muted-foreground">Carregando...</main>
  }

  if (erroClinica || !clinica) {
    return <main className="mx-auto max-w-lg p-6 text-sm">{erroClinica || 'Clínica não encontrada.'}</main>
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">Agendamento online</p>
          <h1 className="text-3xl font-bold">{clinica.nome}</h1>
          {clinica.endereco && <p className="text-sm text-muted-foreground">{clinica.endereco}</p>}
          {clinica.telefone && (
            <p className="text-sm text-muted-foreground">{formatPhone(clinica.telefone)}</p>
          )}
        </header>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={aba === 'agendar' ? 'default' : 'outline'} style={aba === 'agendar' && cor ? { backgroundColor: cor } : undefined} onClick={() => setAba('agendar')}>
            Agendar
          </Button>
          <Button type="button" variant={aba === 'gerenciar' ? 'default' : 'outline'} style={aba === 'gerenciar' && cor ? { backgroundColor: cor } : undefined} onClick={() => setAba('gerenciar')}>
            Meus agendamentos
          </Button>
        </div>

        {aba === 'agendar' && (
          <Card>
            <CardHeader>
              <CardTitle>Nova consulta</CardTitle>
              <CardDescription>Escolha o profissional, o horário e informe seus dados.</CardDescription>
            </CardHeader>
            <CardContent>
              {sucesso ? (
                <div className="space-y-4">
                  <p className="text-sm">Consulta agendada para {formatConsulta(sucesso.dataHora)} com {sucesso.profissional}.</p>
                  <Button type="button" variant="outline" onClick={() => { setSucesso(null); setAba('gerenciar') }}>
                    Ver ou alterar agendamentos
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={agendar}>
                  <div className="space-y-2">
                    <Label>Profissional</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={profissionalId} onChange={(event) => setProfissionalId(event.target.value)} required>
                      {clinica.profissionais.map((profissional) => (
                        <option key={profissional.id} value={profissional.id}>
                          {profissional.nome}{profissional.especialidade ? ` — ${profissional.especialidade}` : ''}
                        </option>
                      ))}
                    </select>
                    {clinica.profissionais.length === 0 && <p className="text-sm text-muted-foreground">Nenhum profissional disponível para agendamento.</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" min={todayInput()} value={data} onChange={(event) => setData(event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    {horarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum horário livre neste dia.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {horarios.map((slot) => (
                          <Button key={slot} type="button" size="sm" variant={hora === slot ? 'default' : 'outline'} style={hora === slot && cor ? { backgroundColor: cor } : undefined} onClick={() => setHora(slot)}>
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={nome} onChange={(event) => setNome(event.target.value)} required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <MaskedInput
                        mask="cpf"
                        value={cpf}
                        onChange={(event) => setCpf(event.target.value)}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nascimento</Label>
                      <Input type="date" value={nascimento} onChange={(event) => setNascimento(event.target.value)} required />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <MaskedInput
                        mask="phone"
                        value={telefone}
                        onChange={(event) => setTelefone(event.target.value)}
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
                  </div>
                  {erroForm && <p className="text-sm text-destructive">{erroForm}</p>}
                  <Button type="submit" disabled={enviando || !hora || clinica.profissionais.length === 0} style={cor ? { backgroundColor: cor } : undefined}>
                    {enviando ? 'Agendando...' : 'Confirmar agendamento'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {aba === 'gerenciar' && (
          <Card>
            <CardHeader>
              <CardTitle>Meus agendamentos</CardTitle>
              <CardDescription>
                {pacienteNome ? `Olá, ${pacienteNome}.` : 'Informe CPF e data de nascimento para ver, alterar ou cancelar.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {consultas === null ? (
                <form className="space-y-4" onSubmit={acessar}>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <MaskedInput
                      mask="cpf"
                      value={acessoCpf}
                      onChange={(event) => setAcessoCpf(event.target.value)}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de nascimento</Label>
                    <Input type="date" value={acessoNascimento} onChange={(event) => setAcessoNascimento(event.target.value)} required />
                  </div>
                  {erroAcesso && <p className="text-sm text-destructive">{erroAcesso}</p>}
                  <Button type="submit" disabled={enviando} style={cor ? { backgroundColor: cor } : undefined}>
                    {enviando ? 'Buscando...' : 'Entrar'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  {erroAcesso && <p className="text-sm text-destructive">{erroAcesso}</p>}
                  {consultas.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não tem agendamentos nesta clínica.</p>}
                  {consultas.map((consulta) => (
                    <div key={consulta.id} className="rounded-lg border p-4 space-y-3">
                      <div>
                        <p className="font-medium">{formatConsulta(consulta.dataHora)}</p>
                        <p className="text-sm text-muted-foreground">
                          {consulta.profissional}{consulta.especialidade ? ` — ${consulta.especialidade}` : ''}
                        </p>
                        <p className="text-sm">{statusLabels[consulta.status] || consulta.status}</p>
                      </div>
                      {editando?.id === consulta.id ? (
                        <form className="space-y-3" onSubmit={salvarAlteracao}>
                          <div className="space-y-2">
                            <Label>Profissional</Label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={editProfissionalId} onChange={(event) => setEditProfissionalId(event.target.value)}>
                              {clinica.profissionais.map((profissional) => (
                                <option key={profissional.id} value={profissional.id}>{profissional.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Data</Label>
                            <Input type="date" min={todayInput()} value={editData} onChange={(event) => setEditData(event.target.value)} required />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {editHorarios.map((slot) => (
                              <Button key={slot} type="button" size="sm" variant={editHora === slot ? 'default' : 'outline'} onClick={() => setEditHora(slot)}>
                                {slot}
                              </Button>
                            ))}
                          </div>
                          <textarea className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editObservacoes} onChange={(event) => setEditObservacoes(event.target.value)} />
                          <div className="flex gap-2">
                            <Button type="submit" disabled={enviando || !editHora}>Salvar</Button>
                            <Button type="button" variant="outline" onClick={() => setEditando(null)}>Voltar</Button>
                          </div>
                        </form>
                      ) : (
                        consulta.podeAlterar && (
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => abrirEdicao(consulta)}>Alterar</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => cancelar(consulta)}>Cancelar</Button>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      sessionStorage.removeItem(tokenKey(slug))
                      setConsultas(null)
                      setPacienteNome('')
                      setEditando(null)
                    }}
                  >
                    Sair
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <footer className="border-t pt-4 text-center text-xs text-muted-foreground space-y-1">
          <p>Tecnologia por {COMPANY.name}</p>
          <p>
            <a href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {COMPANY.phoneDisplay}
            </a>
            {' · '}
            <a href={COMPANY.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Instagram {COMPANY.instagramHandle}
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
