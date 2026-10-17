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
import { Plus, Search, Edit, Trash2, Eye, User, Clock } from 'lucide-react'
import api from '@/lib/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { formatPhone, formatCRM } from '@/lib/masks'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'
import {
  ExpedienteEditor,
  ExpedienteItem,
  defaultExpedienteVazio,
  fromApiExpediente,
  toApiExpediente,
} from '@/components/expediente/ExpedienteEditor'

// Schema para criar profissional completo (usuário + profissional)
const profissionalCompletoSchema = z.object({
  // Dados do usuário
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(1, 'Nome é obrigatório'),
  // Dados do profissional
  clinicaId: z.string().min(1, 'Clínica é obrigatória'),
  especialidadeId: z.string().min(1, 'Especialidade é obrigatória'),
  nomeCompleto: z.string().min(1, 'Nome completo é obrigatório'),
  crm: z.string().optional(),
  telefone: z.string().optional(),
})

// Schema para criar profissional vinculando usuário existente (modo antigo)
const profissionalSchema = z.object({
  userId: z.string().min(1, 'Usuário é obrigatório'),
  clinicaId: z.string().min(1, 'Clínica é obrigatória'),
  especialidadeId: z.string().min(1, 'Especialidade é obrigatória'),
  nomeCompleto: z.string().min(1, 'Nome completo é obrigatório'),
  crm: z.string().optional(),
  telefone: z.string().optional(),
})

type ProfissionalCompletoFormData = z.infer<typeof profissionalCompletoSchema>
type ProfissionalFormData = z.infer<typeof profissionalSchema>

interface Profissional {
  id: string
  nomeCompleto: string
  crm?: string
  telefone?: string
  especialidade?: {
    id: string
    nome: string
  }
  clinica?: {
    id: string
    nome: string
  }
  userIdRef?: {
    id: string
    email: string
    name: string
  }
}

interface Usuario {
  id: string
  name: string
  email: string
  role: string
}

interface Especialidade {
  id: string
  nome: string
}

interface Clinica {
  id: string
  nome: string
}

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfissional, setEditingProfissional] =
    useState<Profissional | null>(null)
  const [viewingProfissional, setViewingProfissional] =
    useState<Profissional | null>(null)
  const [expedienteProfissional, setExpedienteProfissional] =
    useState<Profissional | null>(null)
  const [expediente, setExpediente] = useState<ExpedienteItem[]>(defaultExpedienteVazio())
  const [loadingExpediente, setLoadingExpediente] = useState(false)
  const [savingExpediente, setSavingExpediente] = useState(false)
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { selectedClinicaId, clinica } = useClinica()
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
  const isSecretaria = user?.role === 'SECRETARIA' || user?.role === 'secretaria'
  const isMedico = user?.role === 'MEDICO' || user?.role === 'medico'
  const isClinicOwner = user?.isClinicOwner === true
  const canCreateProfissional =
    isAdmin || isSecretaria || isClinicOwner
  const canEditExpediente =
    isAdmin || isSecretaria || isClinicOwner

  // Form para criar profissional completo (usuário + profissional)
  const {
    register: registerCompleto,
    handleSubmit: handleSubmitCompleto,
    reset: resetCompleto,
    setValue: setValueCompleto,
    watch: watchCompleto,
    formState: { errors: errorsCompleto },
  } = useForm<ProfissionalCompletoFormData>({
    resolver: zodResolver(profissionalCompletoSchema),
  })

  // Form para vincular profissional a usuário existente (modo antigo)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfissionalFormData>({
    resolver: zodResolver(profissionalSchema),
  })

  const loadData = async () => {
    // Verificar se usuário está disponível
    const currentUser = user || useAuthStore.getState().user
    if (!currentUser) {
      console.warn('⚠️  loadData chamado sem usuário, abortando...')
      return
    }
    
    try {
      setLoading(true)
      const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'admin'
      const isSecretaria = currentUser?.role === 'SECRETARIA' || currentUser?.role === 'secretaria'
      const isClinicOwner = currentUser?.isClinicOwner === true
      
      // Determinar clinicaId para filtrar (ADMIN pode selecionar ou ver todas, outros usam a própria)
      // Se selectedClinicaId for "all", não passar clinicaId (mostrar todas)
      let filterClinicaId: string | undefined
      if (isAdmin) {
        // Se for "all", não filtrar por clínica
        if (selectedClinicaId === 'all') {
          filterClinicaId = undefined
        } else {
          filterClinicaId = selectedClinicaId || currentUser?.clinicaId || undefined
        }
      } else {
        filterClinicaId = currentUser?.clinicaId || undefined
      }

      console.log('🔄 Carregando profissionais:', {
        isAdmin,
        selectedClinicaId,
        filterClinicaId,
        search,
        page,
      })

      const requests: any[] = [
        api.get('/profissionais', {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            clinicaId: filterClinicaId,
          },
        }),
        api.get('/configuracoes/especialidades'),
      ]

      // ADMIN, MEDICO e SECRETARIA precisam de usuários/especialidades para criar profissionais
      if (isAdmin) {
        requests.push(
          api.get('/configuracoes/usuarios'),
          api.get('/configuracoes/clinicas')
        )
      } else if (isSecretaria || isClinicOwner) {
        requests.push(
          api.get('/configuracoes/usuarios').then(res => ({
            data: res.data.filter((u: Usuario) => 
              u.role === 'MEDICO' || u.role === 'medico'
            )
          })),
          Promise.resolve({ data: [] })
        )
      } else {
        requests.push(
          Promise.resolve({ data: [] }),
          Promise.resolve({ data: [] })
        )
      }

      const [profissionaisRes, especialidadesRes, usuariosRes, clinicasRes] =
        await Promise.all(requests)

      console.log('✅ Resposta completa de profissionais:', profissionaisRes.data)
      console.log('✅ Profissionais recebidos:', profissionaisRes.data.data)
      console.log('✅ Total de páginas:', profissionaisRes.data.totalPages)
      console.log('✅ Total de profissionais:', profissionaisRes.data.total)

      // Mapear os dados para o formato esperado pelo frontend
      const mappedProfissionais = Array.isArray(profissionaisRes.data.data) 
        ? profissionaisRes.data.data.map((p: any) => ({
            ...p,
            especialidade: p.especialidades || p.especialidade,
            clinica: p.clinicas || p.clinica,
            userIdRef: p.users || p.userIdRef,
          }))
        : []

      console.log('✅ Profissionais mapeados:', mappedProfissionais)
      mappedProfissionais.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.nomeCompleto} - Especialidade: ${p.especialidade?.nome || 'N/A'}, Clínica: ${p.clinica?.nome || 'N/A'}, Email: ${p.userIdRef?.email || 'N/A'}`)
      })

      setProfissionais(mappedProfissionais)
      setTotalPages(profissionaisRes.data.totalPages || 1)
      setEspecialidades(especialidadesRes.data || [])
      setUsuarios(usuariosRes?.data || [])
      setClinicas(clinicasRes?.data || [])
      
      // Debug logs
      console.log('✅ Profissionais no estado:', mappedProfissionais.length)
      console.log('✅ Especialidades carregadas:', especialidadesRes.data?.length || 0)
      console.log('✅ Clínicas carregadas:', clinicasRes?.data?.length || 0)
      
      // Log detalhado do primeiro profissional para debug
      if (mappedProfissionais.length > 0) {
        const primeiro = mappedProfissionais[0]
        console.log('🔍 Primeiro profissional (detalhado):', {
          id: primeiro.id,
          nomeCompleto: primeiro.nomeCompleto,
          especialidade: primeiro.especialidade,
          clinica: primeiro.clinica,
          userIdRef: primeiro.userIdRef,
          especialidades: primeiro.especialidades, // Original do backend
          clinicas: primeiro.clinicas, // Original do backend
          users: primeiro.users, // Original do backend
        })
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      console.error('Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      
      // Mensagens de erro mais específicas
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
      
      toast({
        title: 'Erro',
        description: `Não foi possível carregar os dados: ${errorMessage}`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Aguardar usuário ser carregado antes de fazer requisições
    if (!user) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        // Aguardar um pouco para hidratação do Zustand
        const timeout = setTimeout(() => {
          const storeUser = useAuthStore.getState().user
          if (storeUser) {
            loadData()
          }
        }, 200)
        return () => clearTimeout(timeout)
      }
      return
    }
    
    loadData()
  }, [page, search, selectedClinicaId, user?.clinicaId, user])

  /* Handler para criar profissional completo (usuário + profissional) */
  const onSubmitCompleto = async (data: ProfissionalCompletoFormData) => {
    try {
      // Dono/secretária sempre usam a própria clínica
      const clinicaId =
        isSecretaria || isClinicOwner ? user?.clinicaId : data.clinicaId
      
      // Remover formatação do telefone e CRM antes de enviar
      const dataToSend = {
        ...data,
        clinicaId: clinicaId || data.clinicaId,
        telefone: data.telefone
          ? data.telefone.replace(/\D/g, '')
          : undefined,
        crm: data.crm
          ? data.crm.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
          : undefined,
      }

      await api.post('/profissionais/completo', dataToSend)
      toast({
        title: 'Sucesso',
        description: 'Profissional criado com sucesso! O médico pode fazer login com o email e senha cadastrados.',
      })
      setIsDialogOpen(false)
      resetCompleto()
      setEditingProfissional(null)
      loadData()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao criar profissional',
        variant: 'destructive',
      })
    }
  }

  /* Handler para vincular profissional a usuário existente (modo antigo) */
  const onSubmit = async (data: ProfissionalFormData) => {
    try {
      // Dono/secretária sempre usam a própria clínica
      const clinicaId =
        isSecretaria || isClinicOwner ? user?.clinicaId : data.clinicaId
      
      // Remover formatação do telefone e CRM antes de enviar
      const dataToSend = {
        ...data,
        clinicaId: clinicaId || data.clinicaId,
        telefone: data.telefone
          ? data.telefone.replace(/\D/g, '')
          : undefined,
        crm: data.crm
          ? data.crm.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
          : undefined,
      }

      if (editingProfissional) {
        await api.put(`/profissionais/${editingProfissional.id}`, dataToSend)
        toast({
          title: 'Sucesso',
          description: 'Profissional atualizado com sucesso',
        })
      } else {
        await api.post('/profissionais', dataToSend)
        toast({
          title: 'Sucesso',
          description: 'Profissional criado com sucesso',
        })
      }
      setIsDialogOpen(false)
      reset()
      setEditingProfissional(null)
      loadData()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description:
          error.response?.data?.message || 'Erro ao salvar profissional',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (profissional: Profissional) => {
    setEditingProfissional(profissional)
    reset({
      userId: profissional.userIdRef?.id || '',
      clinicaId: profissional.clinica?.id || '',
      especialidadeId: profissional.especialidade?.id || '',
      nomeCompleto: profissional.nomeCompleto,
      crm: profissional.crm ? formatCRM(profissional.crm) : '',
      telefone: profissional.telefone ? formatPhone(profissional.telefone) : '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) {
      return
    }

    try {
      await api.delete(`/profissionais/${id}`)
      toast({
        title: 'Sucesso',
        description: 'Profissional excluído com sucesso',
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description:
          error.response?.data?.message || 'Erro ao excluir profissional',
        variant: 'destructive',
      })
    }
  }

  const openExpediente = async (profissional: Profissional) => {
    setExpedienteProfissional(profissional)
    setExpediente(defaultExpedienteVazio())
    setLoadingExpediente(true)
    try {
      const response = await api.get(`/profissionais/${profissional.id}/expediente`)
      setExpediente(
        fromApiExpediente(
          Array.isArray(response.data) ? response.data : [],
          defaultExpedienteVazio(),
        ),
      )
    } catch {
      setExpediente(defaultExpedienteVazio())
    } finally {
      setLoadingExpediente(false)
    }
  }

  const saveExpediente = async () => {
    if (!expedienteProfissional) return
    try {
      setSavingExpediente(true)
      const response = await api.put(
        `/profissionais/${expedienteProfissional.id}/expediente`,
        { itens: toApiExpediente(expediente) },
      )
      setExpediente(
        fromApiExpediente(
          Array.isArray(response.data) ? response.data : [],
          defaultExpedienteVazio(),
        ),
      )
      toast({
        title: 'Sucesso',
        description: 'Expediente do profissional salvo com sucesso',
      })
      setExpedienteProfissional(null)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description:
          error.response?.data?.message || 'Erro ao salvar expediente',
        variant: 'destructive',
      })
    } finally {
      setSavingExpediente(false)
    }
  }

  const handleNew = () => {
    setEditingProfissional(null)
    resetCompleto({
      email: '',
      password: '',
      name: '',
      clinicaId: isSecretaria || isClinicOwner ? (user?.clinicaId || '') : '',
      especialidadeId: '',
      nomeCompleto: '',
      crm: '',
      telefone: '',
    })
    setIsDialogOpen(true)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profissionais</h1>
            <p className="text-muted-foreground">
              Gerencie o cadastro de profissionais de saúde
            </p>
          </div>
          {canCreateProfissional && (
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Profissional
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Profissionais</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar profissional..."
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
            ) : profissionais.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum profissional encontrado
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CRM</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Clínica</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profissionais.map((profissional) => (
                      <TableRow key={profissional.id}>
                        <TableCell className="font-medium">
                          {profissional.nomeCompleto}
                        </TableCell>
                        <TableCell>{profissional.crm ? formatCRM(profissional.crm) : '-'}</TableCell>
                        <TableCell>
                          {profissional.especialidade?.nome || '-'}
                        </TableCell>
                        <TableCell>{profissional.clinica?.nome || '-'}</TableCell>
                        <TableCell>{profissional.userIdRef?.email || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingProfissional(profissional)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEditExpediente && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Expediente"
                                onClick={() => openExpediente(profissional)}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(profissional)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(profissional.id)}
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
                {editingProfissional
                  ? 'Editar Profissional'
                  : 'Novo Profissional'}
              </DialogTitle>
              <DialogDescription>
                {editingProfissional
                  ? 'Atualize as informações do profissional'
                  : 'Preencha os dados do novo profissional'}
              </DialogDescription>
            </DialogHeader>
            {editingProfissional ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">Médico *</Label>
                    <Select
                      value={watch('userId')}
                      onValueChange={(value) => {
                        setValue('userId', value)
                        const usuarioSelecionado = usuarios.find(u => u.id === value)
                        if (usuarioSelecionado) {
                          setValue('nomeCompleto', usuarioSelecionado.name)
                        }
                      }}
                      disabled={true}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o médico" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.length > 0 ? (
                          usuarios.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              {usuario.name} ({usuario.email})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled>
                            Nenhum médico disponível
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                    <Input
                      id="nomeCompleto"
                      {...register('nomeCompleto')}
                      placeholder="Nome completo do profissional"
                    />
                    {errors.nomeCompleto && (
                      <p className="text-sm text-destructive">
                        {errors.nomeCompleto.message}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
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
                          {clinicas.length > 0 ? (
                            clinicas.map((c: Clinica) => (
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
                        <p className="text-sm text-destructive">
                          {errors.clinicaId.message}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="especialidadeId">Especialidade *</Label>
                    <Select
                      value={watch('especialidadeId')}
                      onValueChange={(value) => setValue('especialidadeId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {especialidades.length > 0 ? (
                          especialidades.map((especialidade) => (
                            <SelectItem
                              key={especialidade.id}
                              value={especialidade.id}
                            >
                              {especialidade.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled>
                            Nenhuma especialidade disponível
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.especialidadeId && (
                      <p className="text-sm text-destructive">
                        {errors.especialidadeId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crm">CRM</Label>
                    <MaskedInput
                      id="crm"
                      mask="crm"
                      {...register('crm')}
                      value={watch('crm') || ''}
                      onChange={(e) => setValue('crm', e.target.value, { shouldDirty: true })}
                      placeholder="000000 ou 000000-XX/UF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <MaskedInput
                      id="telefone"
                      mask="phone"
                      {...register('telefone')}
                      value={watch('telefone') || ''}
                      onChange={(e) => setValue('telefone', e.target.value, { shouldDirty: true })}
                      placeholder="(00) 00000-0000"
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
                      setEditingProfissional(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Atualizar</Button>
                </DialogFooter>
              </form>
            ) : (
              <form onSubmit={handleSubmitCompleto(onSubmitCompleto)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...registerCompleto('email')}
                      placeholder="email@exemplo.com"
                    />
                    {errorsCompleto.email && (
                      <p className="text-sm text-destructive">
                        {errorsCompleto.email.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      O médico usará este email para fazer login
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      {...registerCompleto('password')}
                      placeholder="Mínimo 6 caracteres"
                    />
                    {errorsCompleto.password && (
                      <p className="text-sm text-destructive">
                        {errorsCompleto.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      {...registerCompleto('name')}
                      placeholder="Nome do médico"
                      onChange={(e) => {
                        registerCompleto('name').onChange(e)
                        // Preencher nomeCompleto automaticamente
                        if (!watchCompleto('nomeCompleto')) {
                          setValueCompleto('nomeCompleto', e.target.value)
                        }
                      }}
                    />
                    {errorsCompleto.name && (
                      <p className="text-sm text-destructive">
                        {errorsCompleto.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                    <Input
                      id="nomeCompleto"
                      {...registerCompleto('nomeCompleto')}
                      placeholder="Nome completo do profissional"
                    />
                    {errorsCompleto.nomeCompleto && (
                      <p className="text-sm text-destructive">
                        {errorsCompleto.nomeCompleto.message}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="clinicaId">Clínica *</Label>
                      <Select
                        value={watchCompleto('clinicaId')}
                        onValueChange={(value) => setValueCompleto('clinicaId', value)}
                      >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a clínica" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinicas.length > 0 ? (
                          clinicas.map((clinica: Clinica) => (
                            <SelectItem key={clinica.id} value={clinica.id}>
                              {clinica.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-data" disabled>
                            Nenhuma clínica disponível
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                      {errorsCompleto.clinicaId && (
                        <p className="text-sm text-destructive">
                          {errorsCompleto.clinicaId.message}
                        </p>
                      )}
                    </div>
                  )}
                  {(isSecretaria || isClinicOwner) && (
                    <div className="space-y-2">
                      <Label htmlFor="clinicaId">Clínica *</Label>
                      <Input
                        id="clinicaId"
                        value={clinica?.nome || user?.clinicaId || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        A clínica será automaticamente definida como a sua clínica
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="especialidadeId">Especialidade *</Label>
                    <Select
                      value={watchCompleto('especialidadeId')}
                      onValueChange={(value) => setValueCompleto('especialidadeId', value)}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {especialidades.length > 0 ? (
                        especialidades.map((especialidade) => (
                          <SelectItem
                            key={especialidade.id}
                            value={especialidade.id}
                          >
                            {especialidade.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-data" disabled>
                          Nenhuma especialidade disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                    {errorsCompleto.especialidadeId && (
                      <p className="text-sm text-destructive">
                        {errorsCompleto.especialidadeId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crm">CRM</Label>
                    <MaskedInput
                      id="crm"
                      mask="crm"
                      {...registerCompleto('crm')}
                      value={watchCompleto('crm') || ''}
                      onChange={(e) =>
                        setValueCompleto('crm', e.target.value, { shouldDirty: true })
                      }
                      placeholder="000000 ou 000000-XX/UF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <MaskedInput
                      id="telefone"
                      mask="phone"
                      {...registerCompleto('telefone')}
                      value={watchCompleto('telefone') || ''}
                      onChange={(e) =>
                        setValueCompleto('telefone', e.target.value, { shouldDirty: true })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      resetCompleto()
                      setEditingProfissional(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Profissional</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Visualização */}
        <Dialog
          open={!!viewingProfissional}
          onOpenChange={() => setViewingProfissional(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Profissional</DialogTitle>
            </DialogHeader>
            {viewingProfissional && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Nome Completo</Label>
                  <p className="font-medium">{viewingProfissional.nomeCompleto}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">CRM</Label>
                    <p>{viewingProfissional.crm ? formatCRM(viewingProfissional.crm) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p>
                      {viewingProfissional.telefone
                        ? formatPhone(viewingProfissional.telefone)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Especialidade</Label>
                    <p>{viewingProfissional.especialidade?.nome || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Clínica</Label>
                    <p>{viewingProfissional.clinica?.nome || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{viewingProfissional.userIdRef?.email || '-'}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setViewingProfissional(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!expedienteProfissional}
          onOpenChange={(open) => {
            if (!open) setExpedienteProfissional(null)
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Expediente — {expedienteProfissional?.nomeCompleto}
              </DialogTitle>
              <DialogDescription>
                Horários em que este profissional atende. Os slots do portal ficam
                na interseção com o expediente da clínica.
              </DialogDescription>
            </DialogHeader>
            {loadingExpediente ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <ExpedienteEditor
                value={expediente}
                onChange={setExpediente}
                title="Agenda do profissional"
                description="Deixe um dia desativado se o profissional não atender nesse dia. Sem expediente próprio, vale o da clínica."
              />
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExpedienteProfissional(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={saveExpediente}
                disabled={savingExpediente || loadingExpediente}
              >
                {savingExpediente ? 'Salvando...' : 'Salvar expediente'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}

