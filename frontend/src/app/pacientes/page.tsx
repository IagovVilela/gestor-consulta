'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { MaskedInput } from '@/components/ui/masked-input'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import api from '@/lib/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  formatCPF,
  formatPhone,
  formatRG,
  formatDateFromISO,
  unformatCPF,
  unformatPhone,
  unformatRG,
} from '@/lib/masks'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'

const pacienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  clinicaId: z.string().min(1, 'Clínica é obrigatória'),
  medicoPreferencialId: z.string().optional(),
})

type PacienteFormData = z.infer<typeof pacienteSchema>

interface Paciente {
  id: string
  nome: string
  cpf?: string
  rg?: string
  dataNascimento?: string
  telefone?: string
  email?: string
  endereco?: string
  observacoes?: string
  clinicaId?: string
  medicoPreferencialId?: string
  medicoPreferencial?: {
    id: string
    nomeCompleto: string
    especialidade?: {
      nome: string
    }
  }
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [clinicas, setClinicas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null)
  const [viewingPaciente, setViewingPaciente] = useState<Paciente | null>(null)
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { selectedClinicaId, clinica } = useClinica()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      clinicaId: user?.role === 'ADMIN' 
        ? (selectedClinicaId || user?.clinicaId || '') 
        : (user?.clinicaId || ''),
    },
  })

  const loadPacientes = async () => {
    try {
      setLoading(true)
      // Determinar clinicaId para filtrar (ADMIN pode selecionar, outros usam a própria)
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
      const filterClinicaId = isAdmin
        ? (selectedClinicaId || user?.clinicaId) 
        : user?.clinicaId

      const requests: any[] = [
        api.get('/pacientes', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            clinicaId: filterClinicaId || undefined,
          },
        }),
        api.get('/profissionais/ativos', {
          params: filterClinicaId ? {
            clinicaId: filterClinicaId,
          } : {},
        }),
      ]

      // Se ADMIN, carregar também clínicas
      if (user?.role === 'ADMIN') {
        requests.push(api.get('/configuracoes/clinicas'))
      }

      const results = await Promise.all(requests)
      setPacientes(results[0].data.data)
      setTotalPages(results[0].data.totalPages)
      
      // Debug: verificar profissionais carregados
      console.log('Resposta completa do endpoint profissionais/ativos:', results[1])
      console.log('Profissionais carregados para médico preferencial:', results[1].data)
      console.log('ClinicaId usado no filtro:', filterClinicaId)
      console.log('User role:', user?.role)
      console.log('User clinicaId:', user?.clinicaId)
      
      // Garantir que sempre seja um array
      const profissionaisData = Array.isArray(results[1].data) ? results[1].data : []
      setProfissionais(profissionaisData)
      
      console.log('Profissionais após processamento:', profissionaisData)
      
      if (user?.role === 'ADMIN' && results[2]) {
        setClinicas(results[2].data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pacientes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPacientes()
  }, [page, search, selectedClinicaId, user?.clinicaId])

  const onSubmit = async (data: PacienteFormData) => {
    try {
      // Determinar clinicaId (usar do formulário ou do usuário)
      const clinicaId = data.clinicaId || (user?.role !== 'ADMIN' ? user?.clinicaId : undefined)
      
      // Remover formatação antes de enviar
      const dataToSend = {
        ...data,
        clinicaId: clinicaId || '',
        cpf: data.cpf ? unformatCPF(data.cpf) : undefined,
        rg: data.rg ? unformatRG(data.rg) : undefined,
        telefone: data.telefone ? unformatPhone(data.telefone) : undefined,
        medicoPreferencialId: data.medicoPreferencialId || undefined,
      }

      if (editingPaciente) {
        await api.put(`/pacientes/${editingPaciente.id}`, dataToSend)
        toast({
          title: 'Sucesso',
          description: 'Paciente atualizado com sucesso',
        })
      } else {
        await api.post('/pacientes', dataToSend)
        toast({
          title: 'Sucesso',
          description: 'Paciente criado com sucesso',
        })
      }
      setIsDialogOpen(false)
      reset()
      setEditingPaciente(null)
      loadPacientes()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar paciente',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (paciente: Paciente) => {
    setEditingPaciente(paciente)
    reset({
      nome: paciente.nome,
      cpf: paciente.cpf ? formatCPF(paciente.cpf) : '',
      rg: paciente.rg ? formatRG(paciente.rg) : '',
      dataNascimento: paciente.dataNascimento || '',
      telefone: paciente.telefone ? formatPhone(paciente.telefone) : '',
      email: paciente.email || '',
      endereco: paciente.endereco || '',
      observacoes: paciente.observacoes || '',
      clinicaId: paciente.clinicaId || user?.clinicaId || '',
      medicoPreferencialId: paciente.medicoPreferencialId || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este paciente?')) {
      return
    }

    try {
      await api.delete(`/pacientes/${id}`)
      toast({
        title: 'Sucesso',
        description: 'Paciente excluído com sucesso',
      })
      loadPacientes()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao excluir paciente',
        variant: 'destructive',
      })
    }
  }

  const handleNew = async () => {
    setEditingPaciente(null)
    // Determinar clinicaId padrão
    const defaultClinicaId = user?.role === 'ADMIN' || user?.role === 'admin'
      ? (selectedClinicaId || user?.clinicaId) 
      : user?.clinicaId

    reset({
      nome: '',
      cpf: '',
      rg: '',
      dataNascimento: '',
      telefone: '',
      email: '',
      endereco: '',
      observacoes: '',
      clinicaId: defaultClinicaId || '',
      medicoPreferencialId: '',
    })
    
    // Recarregar profissionais quando abrir o dialog para garantir dados atualizados
    try {
      console.log('handleNew - defaultClinicaId:', defaultClinicaId)
      console.log('handleNew - user:', { id: user?.id, role: user?.role, clinicaId: user?.clinicaId })
      
      // Se não for ADMIN e não tiver clinicaId, não buscar profissionais
      if (!user?.clinicaId && user?.role !== 'ADMIN') {
        console.log('handleNew - Usuário não tem clinicaId, não buscando profissionais')
        setProfissionais([])
      } else {
        const params = defaultClinicaId ? { clinicaId: defaultClinicaId } : {}
        console.log('handleNew - chamando /profissionais/ativos com params:', params)
        
        const profissionaisRes = await api.get('/profissionais/ativos', { params })
        
        console.log('handleNew - resposta completa:', profissionaisRes)
        console.log('handleNew - profissionais recarregados:', profissionaisRes.data)
        console.log('handleNew - quantidade:', profissionaisRes.data?.length || 0)
        
        const profissionaisData = Array.isArray(profissionaisRes.data) ? profissionaisRes.data : []
        setProfissionais(profissionaisData)
        
        if (profissionaisData.length === 0 && user?.clinicaId) {
          toast({
            title: 'Aviso',
            description: 'Nenhum médico cadastrado nesta clínica. Cadastre profissionais na página de Profissionais.',
            variant: 'default',
          })
        }
      }
    } catch (error: any) {
      console.error('Erro ao recarregar profissionais:', error)
      console.error('Erro detalhado:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      setProfissionais([])
    }
    
    setIsDialogOpen(true)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pacientes</h1>
            <p className="text-muted-foreground">
              Gerencie o cadastro de pacientes
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Pacientes</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar paciente..."
                    className="w-64 pl-9"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : pacientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum paciente encontrado
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Data de Nascimento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pacientes.map((paciente) => (
                      <TableRow key={paciente.id}>
                        <TableCell className="font-medium">
                          {paciente.nome}
                        </TableCell>
                        <TableCell>
                          {paciente.cpf ? formatCPF(paciente.cpf) : '-'}
                        </TableCell>
                        <TableCell>
                          {paciente.telefone ? formatPhone(paciente.telefone) : '-'}
                        </TableCell>
                        <TableCell>{paciente.email || '-'}</TableCell>
                        <TableCell>{formatDate(paciente.dataNascimento)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingPaciente(paciente)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(paciente)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(paciente.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criar/Editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPaciente ? 'Editar Paciente' : 'Novo Paciente'}
              </DialogTitle>
              <DialogDescription>
                {editingPaciente
                  ? 'Atualize as informações do paciente'
                  : 'Preencha os dados do novo paciente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    {...register('nome')}
                    placeholder="Nome completo"
                  />
                  {errors.nome && (
                    <p className="text-sm text-destructive">{errors.nome.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <MaskedInput
                    id="cpf"
                    mask="cpf"
                    {...register('cpf')}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <MaskedInput
                    id="rg"
                    mask="rg"
                    {...register('rg')}
                    placeholder="00.000.000-0"
                    maxLength={12}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    {...register('dataNascimento')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <MaskedInput
                    id="telefone"
                    mask="phone"
                    {...register('telefone')}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="email@exemplo.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicoPreferencialId">Médico Preferencial</Label>
                  <Select
                    value={watch('medicoPreferencialId') || 'none'}
                    onValueChange={(value) => setValue('medicoPreferencialId', value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um médico (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {profissionais && profissionais.length > 0 ? (
                        profissionais.map((prof: any) => {
                          // O backend retorna especialidades (plural) como objeto relacionado
                          const especialidadeNome = prof.especialidades?.nome || 'Sem especialidade';
                          return (
                            <SelectItem key={prof.id} value={prof.id}>
                              {prof.nomeCompleto} - {especialidadeNome}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <>
                          <SelectItem value="no-data" disabled>
                            {user?.clinicaId 
                              ? 'Nenhum médico cadastrado nesta clínica'
                              : 'Usuário não vinculado a uma clínica'}
                          </SelectItem>
                          {user?.clinicaId && (
                            <SelectItem value="info" disabled className="text-xs text-muted-foreground">
                              Cadastre profissionais na página de Profissionais
                            </SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {profissionais.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Carregando médicos da sua clínica...
                    </p>
                  )}
                </div>
                {user?.role === 'ADMIN' && (
                  <div className="space-y-2">
                    <Label htmlFor="clinicaId">Clínica *</Label>
                    <Select
                      value={watch('clinicaId')}
                      onValueChange={(value) => setValue('clinicaId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a clínica" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinicas && clinicas.length > 0 ? (
                          clinicas.map((c) => (
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
                    {errors.clinicaId && (
                      <p className="text-sm text-destructive">{errors.clinicaId.message}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    {...register('endereco')}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    {...register('observacoes')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Observações sobre o paciente"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    reset()
                    setEditingPaciente(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPaciente ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Visualização */}
        <Dialog open={!!viewingPaciente} onOpenChange={() => setViewingPaciente(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Paciente</DialogTitle>
            </DialogHeader>
            {viewingPaciente && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{viewingPaciente.nome}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">CPF</Label>
                    <p>
                      {viewingPaciente.cpf ? formatCPF(viewingPaciente.cpf) : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">RG</Label>
                    <p>{viewingPaciente.rg ? formatRG(viewingPaciente.rg) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p>
                      {viewingPaciente.telefone
                        ? formatPhone(viewingPaciente.telefone)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{viewingPaciente.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Nascimento</Label>
                    <p>{formatDate(viewingPaciente.dataNascimento)}</p>
                  </div>
                </div>
                {viewingPaciente.endereco && (
                  <div>
                    <Label className="text-muted-foreground">Endereço</Label>
                    <p>{viewingPaciente.endereco}</p>
                  </div>
                )}
                {viewingPaciente.observacoes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p>{viewingPaciente.observacoes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setViewingPaciente(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
