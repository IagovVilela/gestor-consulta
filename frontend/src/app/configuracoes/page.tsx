'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, Users, Stethoscope, Building2, Upload, X, Link2 } from 'lucide-react'
import api from '@/lib/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'
import { isAdmin } from '@/lib/utils'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Palette } from 'lucide-react'
import { maskCNPJ, maskPhone, unmaskCNPJ, unmaskPhone } from '@/lib/utils/masks'
import { normalizeMediaUrl } from '@/lib/media'
import { useRef } from 'react'

const especialidadeSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
})

type EspecialidadeFormData = z.infer<typeof especialidadeSchema>

interface Especialidade {
  id: string
  nome: string
  descricao?: string
}

interface Usuario {
  id: string
  name: string
  email: string
  role: string
  clinicaId?: string | null
  createdAt: string
  clinica?: {
    id: string
    nome: string
  } | null
}

interface Clinica {
  id: string
  nome: string
  slug?: string | null
  cnpj?: string
  endereco?: string
  telefone?: string
  email?: string
  logoUrl?: string
  corPrimaria?: string
  corSecundaria?: string
  ownerId?: string | null
  owner?: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

const usuarioSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'MEDICO', 'SECRETARIA']).optional(),
  clinicaId: z.string().optional(),
})

const clinicaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  logoUrl: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) =>
        !value ||
        value === '' ||
        value.startsWith('/') ||
        /^https?:\/\//i.test(value),
      'URL inválida',
    ),
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser em formato hexadecimal').optional().or(z.literal('')),
  corSecundaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser em formato hexadecimal').optional().or(z.literal('')),
  // Campos do gerente para edição
  gerenteId: z.string().optional(),
  gerenteName: z.string().optional(),
  gerenteEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  gerentePassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
})

// Schema para criação completa de clínica (com gerente)
const clinicaCompletoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  logoUrl: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) =>
        !value ||
        value === '' ||
        value.startsWith('/') ||
        /^https?:\/\//i.test(value),
      'URL inválida',
    ),
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser em formato hexadecimal').optional().or(z.literal('')),
  corSecundaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser em formato hexadecimal').optional().or(z.literal('')),
  // Dados do gerente (dono da clínica)
  gerenteName: z.string().min(1, 'Nome do gerente é obrigatório'),
  gerenteEmail: z.string().email('Email do gerente inválido'),
  gerentePassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type UsuarioFormData = z.infer<typeof usuarioSchema>
type ClinicaFormData = z.infer<typeof clinicaSchema>
type ClinicaCompletoFormData = z.infer<typeof clinicaCompletoSchema>

const personalizacaoSchema = z.object({
  logoUrl: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) =>
        !value ||
        value === '' ||
        value.startsWith('/') ||
        /^https?:\/\//i.test(value),
      'URL inválida',
    ),
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser em formato hexadecimal (#RRGGBB)').optional().or(z.literal('')),
  corSecundaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser em formato hexadecimal (#RRGGBB)').optional().or(z.literal('')),
})

type PersonalizacaoFormData = z.infer<typeof personalizacaoSchema>

export default function ConfiguracoesPage() {
  const { user, isAuthenticated } = useAuthStore()
  const { clinica, updatePersonalization } = useClinica()
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [portalSlug, setPortalSlug] = useState<string | null>(null)
  const [portalUrl, setPortalUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEspecialidadeDialogOpen, setIsEspecialidadeDialogOpen] = useState(false)
  const [isUsuarioDialogOpen, setIsUsuarioDialogOpen] = useState(false)
  const [isClinicaDialogOpen, setIsClinicaDialogOpen] = useState(false)
  const [isDeleteUsuarioDialogOpen, setIsDeleteUsuarioDialogOpen] = useState(false)
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null)
  const [editingEspecialidade, setEditingEspecialidade] =
    useState<Especialidade | null>(null)
  const [editingClinica, setEditingClinica] = useState<Clinica | null>(null)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const { toast } = useToast()
  const { loadClinicas: loadClinicasFromContext, clinicas: clinicasFromContext } = useClinica()

  const {
    register: registerEspecialidade,
    handleSubmit: handleSubmitEspecialidade,
    reset: resetEspecialidade,
    formState: { errors: errorsEspecialidade },
  } = useForm<EspecialidadeFormData>({
    resolver: zodResolver(especialidadeSchema),
  })

  const {
    register: registerPersonalizacao,
    handleSubmit: handleSubmitPersonalizacao,
    reset: resetPersonalizacao,
    formState: { errors: errorsPersonalizacao },
  } = useForm<PersonalizacaoFormData>({
    resolver: zodResolver(personalizacaoSchema),
  })

  const {
    register: registerUsuario,
    handleSubmit: handleSubmitUsuario,
    reset: resetUsuario,
    setValue: setValueUsuario,
    watch: watchUsuario,
    formState: { errors: errorsUsuario },
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
  })

  const {
    register: registerClinica,
    handleSubmit: handleSubmitClinica,
    reset: resetClinica,
    setValue: setValueClinica,
    watch: watchClinica,
    formState: { errors: errorsClinica },
  } = useForm<ClinicaFormData>({
    resolver: zodResolver(clinicaSchema),
  })

  // Form para criação completa de clínica (com gerente)
  const {
    register: registerClinicaCompleto,
    handleSubmit: handleSubmitClinicaCompleto,
    reset: resetClinicaCompleto,
    setValue: setValueClinicaCompleto,
    watch: watchClinicaCompleto,
    formState: { errors: errorsClinicaCompleto },
  } = useForm<ClinicaCompletoFormData>({
    resolver: zodResolver(clinicaCompletoSchema),
  })

  const loadData = async () => {
    // Obter usuário atual do store (pode ter mudado desde a última renderização)
    const currentUser = useAuthStore.getState().user
    
    // Verificar se usuário está disponível
    if (!currentUser) {
      console.warn('⚠️  loadData chamado sem usuário, abortando...')
      return
    }
    
    // Evitar múltiplas chamadas simultâneas
    if (isLoadingData) {
      console.warn('⚠️  loadData já está em execução, ignorando chamada duplicada...')
      return
    }
    
    try {
      console.log('🔄 loadData iniciado para usuário:', currentUser.email, currentUser.role)
      setIsLoadingData(true)
      setLoading(true)
      const requests: any[] = [
        api.get('/configuracoes/especialidades'),
      ]

      // ADMIN e MÉDICO podem ver usuários (médico vê apenas suas secretárias)
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'admin' || currentUser?.role === 'MEDICO' || currentUser?.role === 'medico') {
        requests.push(api.get('/configuracoes/usuarios'))
      } else {
        requests.push(Promise.resolve({ data: [] }))
      }

      // Apenas ADMIN pode ver clínicas
      // Usar função helper para verificação case-insensitive
      const userIsAdmin = isAdmin(currentUser?.role)
      
      console.log('📋 Verificando permissão de clínicas...')
      console.log('📋 User object:', currentUser)
      console.log('📋 User role:', currentUser?.role)
      console.log('📋 Is ADMIN?', userIsAdmin)
      
      if (userIsAdmin) {
        console.log('✅ ADMIN detectado, fazendo requisição de clínicas...')
        requests.push(api.get('/configuracoes/clinicas'))
      } else {
        console.warn('⚠️  Usuário não é ADMIN, pulando requisição de clínicas')
        console.warn('⚠️  Role recebido:', currentUser?.role)
        requests.push(Promise.resolve({ data: [] }))
      }

      const results = await Promise.allSettled(requests)
      
      // Processar resultados de forma mais robusta
      let especialidadesData: any[] = []
      let usuariosData: Usuario[] = []
      let clinicasData: Clinica[] = []
      
      // Processar especialidades
      if (results[0].status === 'fulfilled') {
        const response = results[0].value
        especialidadesData = Array.isArray(response?.data) ? response.data : []
      } else {
        console.error('❌ Erro ao carregar especialidades:', results[0].reason)
      }
      
      // Processar usuários
      if (results[1].status === 'fulfilled') {
        const response = results[1].value
        usuariosData = Array.isArray(response?.data) ? response.data : []
        console.log('✅ Usuários carregados:', usuariosData.length)
        usuariosData.forEach((u: Usuario) => {
          console.log(`  ✅ Usuário: ${u.name} (${u.email}) - Role: ${u.role}`)
        })
      } else {
        console.error('❌ Erro ao carregar usuários:', results[1].reason)
      }
      
      // Processar clínicas
      if (results[2].status === 'fulfilled') {
        const response = results[2].value
        console.log('📋 ========== PROCESSANDO CLÍNICAS ==========')
        console.log('📋 Resposta completa:', JSON.stringify(response, null, 2))
        console.log('📋 Tipo de response:', typeof response)
        console.log('📋 response tem .data?', 'data' in (response || {}))
        console.log('📋 response.data:', response?.data)
        console.log('📋 Tipo de response.data:', typeof response?.data)
        console.log('📋 É array?', Array.isArray(response?.data))
        console.log('📋 Length:', Array.isArray(response?.data) ? response.data.length : 'N/A')
        
        // O axios sempre retorna { data: [...], status: 200, ... }
        if (response?.data !== undefined) {
          if (Array.isArray(response.data)) {
            clinicasData = response.data
            console.log('✅ Clínicas extraídas com sucesso:', clinicasData.length)
            if (clinicasData.length > 0) {
              clinicasData.forEach((c: any) => {
                console.log(`  ✅ Clínica: ${c.nome} (ID: ${c.id}, Active: ${c.active})`)
              })
            } else {
              console.warn('⚠️  Array de clínicas está vazio!')
            }
          } else {
            console.error('❌ response.data não é um array!')
            console.error('❌ Tipo:', typeof response.data)
            console.error('❌ Valor:', response.data)
          }
        } else {
          console.error('❌ response.data é undefined!')
          console.error('❌ Response completo:', response)
        }
        console.log('📋 ==========================================')
      } else {
        console.error('❌ ========== ERRO AO CARREGAR CLÍNICAS ==========')
        console.error('❌ Status:', results[2].status)
        console.error('❌ Reason:', results[2].reason)
        console.error('❌ Reason message:', results[2].reason?.message)
        console.error('❌ Reason response:', results[2].reason?.response)
        console.error('❌ Reason response data:', results[2].reason?.response?.data)
        console.error('❌ Reason response status:', results[2].reason?.response?.status)
        console.error('❌ ================================================')
      }
      
      // Atualizar estados - SEMPRE atualizar, mesmo se vazio
      console.log('📊 Atualizando estados:')
      console.log(`  - Especialidades: ${especialidadesData.length}`)
      console.log(`  - Usuários: ${usuariosData.length}`)
      console.log(`  - Clínicas: ${clinicasData.length}`)
      
      setEspecialidades(especialidadesData)
      setUsuarios(usuariosData)
      setClinicas(clinicasData)
      
      console.log('📊 Resumo final:')
      console.log(`  - Especialidades: ${especialidadesData.length}`)
      console.log(`  - Usuários: ${usuariosData.length}`)
      console.log(`  - Clínicas: ${clinicasData.length}`)
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados:', error)
      console.error('❌ Erro response:', error.response)
      console.error('❌ Erro status:', error.response?.status)
      console.error('❌ Erro data:', error.response?.data)
      console.error('❌ User role:', currentUser?.role)
      
      // Se for erro 401 ou 403, não mostrar toast (pode ser problema de autenticação temporário)
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('⚠️  Erro de autenticação/autorização ao carregar dados')
        // Não mostrar toast para erros de autenticação durante o carregamento inicial
        // O interceptor do axios já deve ter tratado isso
      } else {
        toast({
          title: 'Erro',
          description: error.response?.data?.message || 'Não foi possível carregar as configurações',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    // Verificar se há token no localStorage (indica que usuário deve estar autenticado)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    // Se não há token, não fazer nada (usuário não está autenticado)
    if (!token) {
      console.log('⏳ Sem token, aguardando autenticação...')
      return
    }
    
    // Se há token mas usuário ainda não foi carregado, aguardar um pouco para hidratação do Zustand
    if (token && !user && !isAuthenticated) {
      console.log('⏳ Token encontrado mas usuário ainda não carregado, aguardando hidratação do Zustand...')
      const timeout = setTimeout(() => {
        // Verificar novamente após 200ms
        const storeState = useAuthStore.getState()
        if (storeState.user && storeState.isAuthenticated) {
          console.log('✅ Usuário carregado após timeout:', storeState.user.email)
          // Forçar re-render chamando loadData
          loadData()
        } else {
          console.warn('⚠️  Usuário ainda não carregado após timeout')
        }
      }, 200)
      
      return () => clearTimeout(timeout)
    }
    
    // Se usuário está disponível, fazer requisições
    if (user && isAuthenticated) {
      console.log('✅ Usuário carregado, iniciando loadData...', {
        email: user.email,
        role: user.role,
        id: user.id,
      })
      
      loadData()
    }
    
    // Atualizar valores do formulário quando a clínica mudar
    if (clinica) {
      resetPersonalizacao({
        logoUrl: normalizeMediaUrl(clinica.logoUrl) || '',
        corPrimaria: clinica.corPrimaria || '',
        corSecundaria: clinica.corSecundaria || '',
      })
    }
  }, [user, isAuthenticated, clinica, resetPersonalizacao])

  useEffect(() => {
    const role = user?.role?.toUpperCase()
    if (!user || role === 'ADMIN' || !user.clinicaId) {
      setPortalSlug(null)
      setPortalUrl('')
      return
    }

    api.get('/configuracoes/portal-link')
      .then((response) => {
        setPortalSlug(response.data.slug)
        setPortalUrl(`${window.location.origin}/c/${response.data.slug}`)
      })
      .catch(() => {
        setPortalSlug(null)
        setPortalUrl('')
      })
  }, [user])

  const copyPatientLink = async (slug: string) => {
    const url = `${window.location.origin}/c/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: 'Link copiado',
        description: 'Envie este link para o paciente agendar, alterar ou cancelar a consulta.',
      })
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: url,
        variant: 'destructive',
      })
    }
  }
  
  // Adicionar um listener para quando o usuário for carregado após a hidratação
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkUserLoaded = () => {
      const storeState = useAuthStore.getState()
      const token = localStorage.getItem('token')
      
      // Se há token mas usuário ainda não está carregado no componente, aguardar
      if (token && storeState.user && storeState.isAuthenticated && !user) {
        console.log('🔄 Usuário carregado no store mas não no componente, aguardando re-render...')
        // O componente deve re-renderizar automaticamente quando o Zustand atualizar
      }
    }
    
    // Verificar periodicamente por um curto período
    const interval = setInterval(checkUserLoaded, 100)
    const timeout = setTimeout(() => clearInterval(interval), 2000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [user])

  const onSubmitEspecialidade = async (data: EspecialidadeFormData) => {
    try {
      if (editingEspecialidade) {
        await api.put(`/configuracoes/especialidades/${editingEspecialidade.id}`, data)
        toast({
          title: 'Sucesso',
          description: 'Especialidade atualizada com sucesso',
        })
      } else {
        await api.post('/configuracoes/especialidades', data)
        toast({
          title: 'Sucesso',
          description: 'Especialidade criada com sucesso',
        })
      }
      setIsEspecialidadeDialogOpen(false)
      resetEspecialidade()
      setEditingEspecialidade(null)
      loadData()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description:
          error.response?.data?.message || 'Erro ao salvar especialidade',
        variant: 'destructive',
      })
    }
  }

  const handleEditEspecialidade = (especialidade: Especialidade) => {
    setEditingEspecialidade(especialidade)
    resetEspecialidade({
      nome: especialidade.nome,
      descricao: especialidade.descricao || '',
    })
    setIsEspecialidadeDialogOpen(true)
  }

  const onSubmitUsuario = async (data: UsuarioFormData) => {
    try {
      if (editingUsuario) {
        // Editar usuário existente
        const finalRole = data.role || editingUsuario.role
        
        // Validar que MEDICO e SECRETARIA devem ter clínica
        if ((finalRole === 'MEDICO' || finalRole === 'SECRETARIA') && !data.clinicaId && !editingUsuario.clinicaId) {
          toast({
            title: 'Erro',
            description: 'Clínica é obrigatória para médicos e secretárias',
            variant: 'destructive',
          })
          return
        }
        
        const updateData: any = {
          name: data.name,
          email: data.email,
          role: data.role,
          clinicaId: data.clinicaId !== undefined ? data.clinicaId : editingUsuario.clinicaId || undefined,
        }
        
        // Só atualizar senha se foi fornecida
        if (data.password && data.password.length >= 6) {
          updateData.password = data.password
        }
        
        await api.put(`/configuracoes/usuarios/${editingUsuario.id}`, updateData)
        toast({
          title: 'Sucesso',
          description: 'Usuário atualizado com sucesso',
        })
      } else {
        // Criar novo usuário
        // Se for médico, sempre criar como SECRETARIA e usar a clínica do médico
        if (isMedico) {
          await api.post('/auth/secretarias', {
            email: data.email,
            password: data.password,
            name: data.name,
            // Não enviar role nem clinicaId, será definido automaticamente
          })
        } else {
          // ADMIN pode criar qualquer tipo de usuário
          // Se for MEDICO ou SECRETARIA, clínica é obrigatória
          if ((data.role === 'MEDICO' || data.role === 'SECRETARIA') && !data.clinicaId) {
            toast({
              title: 'Erro',
              description: 'Clínica é obrigatória para médicos e secretárias',
              variant: 'destructive',
            })
            return
          }
          
          await api.post('/auth/register', {
            ...data,
            clinicaId: data.clinicaId || undefined,
          })
        }
        toast({
          title: 'Sucesso',
          description: isMedico ? 'Secretária criada com sucesso' : 'Usuário criado com sucesso',
        })
      }
      setIsUsuarioDialogOpen(false)
      resetUsuario()
      setEditingUsuario(null)
      // Pequeno delay para garantir que o backend processou a criação
      setTimeout(() => {
        loadData()
      }, 300)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description:
          error.response?.data?.message || (editingUsuario ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário'),
        variant: 'destructive',
      })
    }
  }

  // Função para criar clínica completa (com gerente)
  const onSubmitClinicaCompleto = async (data: ClinicaCompletoFormData) => {
    try {
      // Limpar campos vazios antes de enviar
      const cleanData: any = {
        nome: data.nome,
        gerenteName: data.gerenteName,
        gerenteEmail: data.gerenteEmail,
        gerentePassword: data.gerentePassword,
      }

      // Adicionar apenas campos não vazios
      if (data.cnpj && data.cnpj.trim() !== '') {
        cleanData.cnpj = unmaskCNPJ(data.cnpj)
      }
      if (data.endereco && data.endereco.trim() !== '') {
        cleanData.endereco = data.endereco
      }
      if (data.telefone && data.telefone.trim() !== '') {
        cleanData.telefone = unmaskPhone(data.telefone)
      }
      if (data.email && data.email.trim() !== '') {
        cleanData.email = data.email
      }
      if (data.logoUrl && data.logoUrl.trim() !== '') {
        cleanData.logoUrl = normalizeMediaUrl(data.logoUrl) || data.logoUrl
      }
      if (data.corPrimaria && data.corPrimaria.trim() !== '') {
        cleanData.corPrimaria = data.corPrimaria
      }
      if (data.corSecundaria && data.corSecundaria.trim() !== '') {
        cleanData.corSecundaria = data.corSecundaria
      }

      const response = await api.post('/configuracoes/clinicas/completo', cleanData)
      console.log('✅ Resposta da criação completa:', response.status, response.data)
      toast({
        title: 'Sucesso',
        description: 'Clínica e gerente criados com sucesso! O gerente pode agora gerenciar usuários da clínica.',
      })
      
      setIsClinicaDialogOpen(false)
      resetClinicaCompleto()
      setLogoPreview(null)
      
      // Recarregar dados
      try {
        await loadData()
      } catch (loadError: any) {
        console.warn('Aviso: Erro ao recarregar dados após criar clínica:', loadError)
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar clínica completa:', error)
      let errorMessage = 'Erro ao criar clínica'
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.message) {
          errorMessage = typeof error.response.data.message === 'string' 
            ? error.response.data.message 
            : JSON.stringify(error.response.data.message)
        } else if (error.response.data.error) {
          errorMessage = typeof error.response.data.error === 'string'
            ? error.response.data.error
            : JSON.stringify(error.response.data.error)
        }
      }
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const onSubmitClinica = async (data: ClinicaFormData) => {
    try {
      // Limpar campos vazios antes de enviar
      const cleanData: any = {
        nome: data.nome,
      }

      // Adicionar apenas campos não vazios
      if (data.cnpj && data.cnpj.trim() !== '') {
        cleanData.cnpj = unmaskCNPJ(data.cnpj)
      }
      if (data.endereco && data.endereco.trim() !== '') {
        cleanData.endereco = data.endereco
      }
      if (data.telefone && data.telefone.trim() !== '') {
        cleanData.telefone = unmaskPhone(data.telefone)
      }
      if (data.email && data.email.trim() !== '') {
        cleanData.email = data.email
      }
      if (data.logoUrl && data.logoUrl.trim() !== '') {
        cleanData.logoUrl = normalizeMediaUrl(data.logoUrl) || data.logoUrl
      }
      if (data.corPrimaria && data.corPrimaria.trim() !== '') {
        cleanData.corPrimaria = data.corPrimaria
      }
      if (data.corSecundaria && data.corSecundaria.trim() !== '') {
        cleanData.corSecundaria = data.corSecundaria
      }

      // Adicionar dados do gerente se fornecidos
      // Se a clínica não tem gerente (ownerId), todos os campos são obrigatórios para criar
      // Se a clínica já tem gerente, os campos são opcionais para atualizar
      if (data.gerenteName && data.gerenteName.trim() !== '') {
        cleanData.gerenteName = data.gerenteName
      }
      if (data.gerenteEmail && data.gerenteEmail.trim() !== '') {
        cleanData.gerenteEmail = data.gerenteEmail
      }
      // Senha: obrigatória se não há gerente, opcional se já existe
      if (data.gerentePassword && data.gerentePassword.trim() !== '') {
        cleanData.gerentePassword = data.gerentePassword
      }
      if (data.gerenteId && data.gerenteId.trim() !== '') {
        cleanData.gerenteId = data.gerenteId
      }

      // Edição: usar endpoint normal
      const response = await api.put(`/configuracoes/clinicas/${editingClinica!.id}`, cleanData)
      console.log('✅ Resposta da atualização:', response.status, response.data)
      toast({
        title: 'Sucesso',
        description: 'Clínica e gerente atualizados com sucesso',
      })
      setIsClinicaDialogOpen(false)
      resetClinica()
      setEditingClinica(null)
      setLogoPreview(null)
      
      // Recarregar dados em background, ignorando erros de autenticação
      // pois a criação já foi bem-sucedida
      try {
        await loadData()
      } catch (loadError: any) {
        console.warn('Aviso: Erro ao recarregar dados após criar clínica:', loadError)
        // Não mostrar erro se foi apenas problema ao recarregar
      }
      
      // Recarregar dados após criar clínica
      try {
        await loadData()
      } catch (loadError: any) {
        console.warn('Aviso: Erro ao recarregar dados após criar clínica:', loadError)
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar clínica:', error)
      console.error('Erro response:', error.response)
      
      // Extrair mensagem de erro corretamente
      let errorMessage = 'Erro ao salvar clínica'
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.message) {
          errorMessage = typeof error.response.data.message === 'string' 
            ? error.response.data.message 
            : JSON.stringify(error.response.data.message)
        } else if (error.response.data.error) {
          errorMessage = typeof error.response.data.error === 'string'
            ? error.response.data.error
            : JSON.stringify(error.response.data.error)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleEditClinica = async (clinica: Clinica) => {
    try {
      // Buscar clínica completa com owner
      const response = await api.get(`/configuracoes/clinicas/${clinica.id}`)
      const clinicaCompleta = response.data
      
      setEditingClinica(clinicaCompleta)
      resetClinica({
        nome: clinicaCompleta.nome,
        cnpj: clinicaCompleta.cnpj || '',
        endereco: clinicaCompleta.endereco || '',
        telefone: clinicaCompleta.telefone || '',
        email: clinicaCompleta.email || '',
        logoUrl: normalizeMediaUrl(clinicaCompleta.logoUrl) || '',
        corPrimaria: clinicaCompleta.corPrimaria || '',
        corSecundaria: clinicaCompleta.corSecundaria || '',
        gerenteId: clinicaCompleta.ownerId || '',
        gerenteName: clinicaCompleta.owner?.name || '',
        gerenteEmail: clinicaCompleta.owner?.email || '',
        gerentePassword: '', // Não preencher senha por segurança
      })
      setLogoPreview(normalizeMediaUrl(clinicaCompleta.logoUrl) || null)
      setIsClinicaDialogOpen(true)
    } catch (error: any) {
      console.error('Erro ao carregar dados da clínica:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da clínica',
        variant: 'destructive',
      })
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      toast({
        title: 'Erro',
        description: 'Apenas imagens são permitidas (JPG, PNG, GIF, WEBP)',
        variant: 'destructive',
      })
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/configuracoes/upload/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const logoUrl = normalizeMediaUrl(response.data.url) || response.data.url
      if (editingClinica) {
        setValueClinica('logoUrl', logoUrl)
      } else {
        setValueClinicaCompleto('logoUrl', logoUrl)
      }
      setLogoPreview(logoUrl)
      
      toast({
        title: 'Sucesso',
        description: 'Logo enviado com sucesso',
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao fazer upload do logo',
        variant: 'destructive',
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDeleteClinica = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta clínica?')) {
      return
    }

    try {
      console.log('🗑️  Tentando excluir clínica:', id)
      const response = await api.delete(`/configuracoes/clinicas/${id}`)
      console.log('✅ Resposta da exclusão:', response.status, response.data)
      toast({
        title: 'Sucesso',
        description: 'Clínica excluída com sucesso',
      })
      
      // Recarregar dados em background, ignorando erros de autenticação
      try {
        await loadData()
      } catch (loadError: any) {
        console.warn('Aviso: Erro ao recarregar dados após excluir clínica:', loadError)
      }
      
      // Recarregar dados após excluir clínica
      try {
        await loadData()
      } catch (loadError: any) {
        console.warn('Aviso: Erro ao recarregar dados após excluir clínica:', loadError)
      }
    } catch (error: any) {
      console.error('❌ Erro ao excluir clínica:', error)
      console.error('❌ Erro response:', error.response)
      console.error('❌ Erro data:', error.response?.data)
      
      // Extrair mensagem de erro corretamente
      let errorMessage = 'Erro ao excluir clínica'
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else if (error.response.data.message) {
          errorMessage = typeof error.response.data.message === 'string' 
            ? error.response.data.message 
            : JSON.stringify(error.response.data.message)
        } else if (error.response.data.error) {
          errorMessage = typeof error.response.data.error === 'string'
            ? error.response.data.error
            : JSON.stringify(error.response.data.error)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteEspecialidade = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta especialidade?')) {
      return
    }

    try {
      await api.delete(`/configuracoes/especialidades/${id}`)
      toast({
        title: 'Sucesso',
        description: 'Especialidade excluída com sucesso',
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description:
          error.response?.data?.message || 'Erro ao excluir especialidade',
        variant: 'destructive',
      })
    }
  }

  const userIsAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
  const isMedico = user?.role === 'MEDICO' || user?.role === 'medico'
  const canManageUsers = userIsAdmin || isMedico

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Configure o sistema e suas preferências
          </p>
        </div>

        {!userIsAdmin && portalSlug && (
          <Card>
            <CardHeader>
              <CardTitle>Link para pacientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Envie este link para os pacientes agendarem, alterarem ou cancelarem a consulta.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={portalUrl} />
                <Button type="button" onClick={() => copyPatientLink(portalSlug)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copiar link
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="perfil" className="space-y-4">
          <TabsList>
            <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
            <TabsTrigger value="especialidades">
              <Stethoscope className="mr-2 h-4 w-4" />
              Especialidades
            </TabsTrigger>
            {userIsAdmin && (
              <TabsTrigger value="clinicas">
                <Palette className="mr-2 h-4 w-4" />
                Clínicas
              </TabsTrigger>
            )}
            {canManageUsers && (
              <TabsTrigger value="usuarios">
                <Users className="mr-2 h-4 w-4" />
                {isMedico ? 'Secretárias' : 'Usuários'}
              </TabsTrigger>
            )}
            {userIsAdmin && clinica && (
              <TabsTrigger value="personalizacao">
                <Palette className="mr-2 h-4 w-4" />
                Personalização
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="perfil" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{user?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{user?.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Perfil</Label>
                    <p className="font-medium">
                      {user?.role === 'ADMIN' || user?.role === 'admin'
                        ? 'Administrador'
                        : user?.role === 'MEDICO' || user?.role === 'medico'
                        ? 'Médico'
                        : 'Secretária'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {clinica && (
            <TabsContent value="personalizacao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personalização da Clínica</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleSubmitPersonalizacao(async (data) => {
                      try {
                        await updatePersonalization(clinica.id, {
                          logoUrl: data.logoUrl || undefined,
                          corPrimaria: data.corPrimaria || undefined,
                          corSecundaria: data.corSecundaria || undefined,
                        })
                        toast({
                          title: 'Sucesso',
                          description: 'Personalização atualizada com sucesso',
                        })
                      } catch (error: any) {
                        toast({
                          title: 'Erro',
                          description:
                            error.response?.data?.message ||
                            'Erro ao atualizar personalização',
                          variant: 'destructive',
                        })
                      }
                    })}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">URL do Logo</Label>
                      <Input
                        id="logoUrl"
                        {...registerPersonalizacao('logoUrl')}
                        placeholder="https://exemplo.com/logo.png"
                      />
                      {errorsPersonalizacao.logoUrl && (
                        <p className="text-sm text-destructive">
                          {errorsPersonalizacao.logoUrl.message}
                        </p>
                      )}
                      {normalizeMediaUrl(clinica.logoUrl) && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={normalizeMediaUrl(clinica.logoUrl) || undefined}
                            alt="Logo atual"
                            className="h-20 w-20 object-contain"
                          />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="corPrimaria">Cor Primária</Label>
                        <div className="flex gap-2">
                          <Input
                            id="corPrimaria"
                            type="color"
                            {...registerPersonalizacao('corPrimaria')}
                            className="h-10 w-20"
                          />
                          <Input
                            {...registerPersonalizacao('corPrimaria')}
                            placeholder="#3b82f6"
                            pattern="^#[0-9A-Fa-f]{6}$"
                          />
                        </div>
                        {errorsPersonalizacao.corPrimaria && (
                          <p className="text-sm text-destructive">
                            {errorsPersonalizacao.corPrimaria.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="corSecundaria">Cor Secundária</Label>
                        <div className="flex gap-2">
                          <Input
                            id="corSecundaria"
                            type="color"
                            {...registerPersonalizacao('corSecundaria')}
                            className="h-10 w-20"
                          />
                          <Input
                            {...registerPersonalizacao('corSecundaria')}
                            placeholder="#1e40af"
                            pattern="^#[0-9A-Fa-f]{6}$"
                          />
                        </div>
                        {errorsPersonalizacao.corSecundaria && (
                          <p className="text-sm text-destructive">
                            {errorsPersonalizacao.corSecundaria.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button type="submit">Salvar Personalização</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="especialidades" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Especialidades</CardTitle>
                  <Button onClick={() => setIsEspecialidadeDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Especialidade
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : especialidades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma especialidade cadastrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {especialidades.map((especialidade) => (
                        <TableRow key={especialidade.id}>
                          <TableCell className="font-medium">
                            {especialidade.nome}
                          </TableCell>
                          <TableCell>{especialidade.descricao || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditEspecialidade(especialidade)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleDeleteEspecialidade(especialidade.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {userIsAdmin && (
            <TabsContent value="clinicas" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Clínicas</CardTitle>
                    <Button onClick={() => {
                      setEditingClinica(null)
                      resetClinica()
                      resetClinicaCompleto()
                      setLogoPreview(null)
                      setIsClinicaDialogOpen(true)
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Clínica
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : clinicas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma clínica cadastrada (Total: {clinicas.length})
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinicas.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              {c.nome}
                            </TableCell>
                            <TableCell>{c.cnpj || '-'}</TableCell>
                            <TableCell>{c.telefone || '-'}</TableCell>
                            <TableCell>{c.email || '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {c.slug && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Copiar link para pacientes"
                                    onClick={() => copyPatientLink(c.slug as string)}
                                  >
                                    <Link2 className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditClinica(c)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClinica(c.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canManageUsers && (
            <TabsContent value="usuarios" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{isMedico ? 'Secretárias' : 'Usuários'}</CardTitle>
                    <Button onClick={() => {
                      setEditingUsuario(null)
                      resetUsuario()
                      setIsUsuarioDialogOpen(true)
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      {isMedico ? 'Nova Secretária' : 'Novo Usuário'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : usuarios.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Perfil</TableHead>
                          {userIsAdmin && <TableHead>Clínica</TableHead>}
                          <TableHead>Data de Cadastro</TableHead>
                          {userIsAdmin && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usuarios.map((usuario) => (
                          <TableRow key={usuario.id}>
                            <TableCell className="font-medium">
                              {usuario.name}
                            </TableCell>
                            <TableCell>{usuario.email}</TableCell>
                            <TableCell>
                              {usuario.role === 'ADMIN'
                                ? 'Administrador'
                                : usuario.role === 'MEDICO'
                                ? 'Médico'
                                : 'Secretária'}
                            </TableCell>
                            {userIsAdmin && (
                              <TableCell>
                                {usuario.clinica?.nome || '-'}
                              </TableCell>
                            )}
                            <TableCell>
                              {new Date(usuario.createdAt).toLocaleDateString('pt-BR')}
                            </TableCell>
                            {userIsAdmin && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingUsuario(usuario)
                                      resetUsuario({
                                        name: usuario.name,
                                        email: usuario.email,
                                        role: usuario.role as 'ADMIN' | 'MEDICO' | 'SECRETARIA',
                                        clinicaId: usuario.clinicaId || undefined,
                                        password: '', // Não preencher senha ao editar
                                      })
                                      setIsUsuarioDialogOpen(true)
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setUsuarioToDelete(usuario)
                                      setIsDeleteUsuarioDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Dialog de Usuário */}
        {canManageUsers && (
          <Dialog
            open={isUsuarioDialogOpen}
            onOpenChange={setIsUsuarioDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUsuario 
                    ? 'Editar Usuário' 
                    : (isMedico ? 'Nova Secretária' : 'Novo Usuário')}
                </DialogTitle>
                <DialogDescription>
                  {editingUsuario 
                    ? 'Atualize os dados do usuário' 
                    : 'Preencha os dados do novo usuário'}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmitUsuario(onSubmitUsuario)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    {...registerUsuario('name')}
                    placeholder="Nome completo"
                  />
                  {errorsUsuario.name && (
                    <p className="text-sm text-destructive">
                      {errorsUsuario.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...registerUsuario('email')}
                    placeholder="usuario@exemplo.com"
                  />
                  {errorsUsuario.email && (
                    <p className="text-sm text-destructive">
                      {errorsUsuario.email.message}
                    </p>
                  )}
                </div>
                {!editingUsuario && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      {...registerUsuario('password')}
                      placeholder="Mínimo 6 caracteres"
                    />
                    {errorsUsuario.password && (
                      <p className="text-sm text-destructive">
                        {errorsUsuario.password.message}
                      </p>
                    )}
                  </div>
                )}
                {editingUsuario && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha (opcional)</Label>
                    <Input
                      id="password"
                      type="password"
                      {...registerUsuario('password')}
                      placeholder="Deixe em branco para manter a senha atual"
                    />
                    {errorsUsuario.password && (
                      <p className="text-sm text-destructive">
                        {errorsUsuario.password.message}
                      </p>
                    )}
                  </div>
                )}
                {!isMedico && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="role">Perfil *</Label>
                      <Select
                        value={watchUsuario('role') || ''}
                        onValueChange={(value) => setValueUsuario('role', value as 'ADMIN' | 'MEDICO' | 'SECRETARIA')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="MEDICO">Médico</SelectItem>
                          <SelectItem value="SECRETARIA">Secretária</SelectItem>
                        </SelectContent>
                      </Select>
                      {errorsUsuario.role && (
                        <p className="text-sm text-destructive">
                          {errorsUsuario.role.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clinicaId">
                        Clínica {watchUsuario('role') !== 'ADMIN' ? '*' : '(opcional)'}
                      </Label>
                      <Select
                        value={watchUsuario('clinicaId') || (editingUsuario?.clinicaId || 'none')}
                        onValueChange={(value) => setValueUsuario('clinicaId', value === 'none' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a clínica" />
                        </SelectTrigger>
                        <SelectContent>
                          {watchUsuario('role') === 'ADMIN' && (
                            <SelectItem value="none">Nenhuma</SelectItem>
                          )}
                          {clinicas.length > 0 ? (
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
                      {watchUsuario('role') !== 'ADMIN' && !watchUsuario('clinicaId') && !editingUsuario?.clinicaId && (
                        <p className="text-sm text-destructive">
                          Clínica é obrigatória para médicos e secretárias
                        </p>
                      )}
                    </div>
                  </>
                )}
                {isMedico && (
                  <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    A secretária será automaticamente vinculada à sua clínica e ao seu perfil.
                  </div>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsUsuarioDialogOpen(false)
                      resetUsuario()
                      setEditingUsuario(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingUsuario ? 'Atualizar' : (isMedico ? 'Criar Secretária' : 'Criar Usuário')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Clínica */}
        {userIsAdmin && (
          <Dialog
            open={isClinicaDialogOpen}
            onOpenChange={setIsClinicaDialogOpen}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingClinica ? 'Editar Clínica' : 'Nova Clínica'}
                </DialogTitle>
                <DialogDescription>
                  {editingClinica
                    ? 'Atualize as informações da clínica'
                    : 'Preencha os dados da nova clínica e do gerente (dono da clínica)'}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={editingClinica 
                  ? handleSubmitClinica(onSubmitClinica)
                  : handleSubmitClinicaCompleto(onSubmitClinicaCompleto)
                }
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="clinica-nome">Nome *</Label>
                  <Input
                    id="clinica-nome"
                    {...(editingClinica ? registerClinica('nome') : registerClinicaCompleto('nome'))}
                    placeholder="Nome da clínica"
                  />
                  {(editingClinica ? errorsClinica.nome : errorsClinicaCompleto.nome) && (
                    <p className="text-sm text-destructive">
                      {(editingClinica ? errorsClinica.nome : errorsClinicaCompleto.nome)?.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinica-cnpj">CNPJ</Label>
                    <Input
                      id="clinica-cnpj"
                      {...(editingClinica ? registerClinica('cnpj') : registerClinicaCompleto('cnpj'))}
                      placeholder="00.000.000/0000-00"
                      onChange={(e) => {
                        const masked = maskCNPJ(e.target.value)
                        if (editingClinica) {
                          setValueClinica('cnpj', masked)
                        } else {
                          setValueClinicaCompleto('cnpj', masked)
                        }
                      }}
                      value={(editingClinica ? watchClinica('cnpj') : watchClinicaCompleto('cnpj')) || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinica-telefone">Telefone</Label>
                    <Input
                      id="clinica-telefone"
                      {...(editingClinica ? registerClinica('telefone') : registerClinicaCompleto('telefone'))}
                      placeholder="(00) 00000-0000"
                      onChange={(e) => {
                        const masked = maskPhone(e.target.value)
                        if (editingClinica) {
                          setValueClinica('telefone', masked)
                        } else {
                          setValueClinicaCompleto('telefone', masked)
                        }
                      }}
                      value={(editingClinica ? watchClinica('telefone') : watchClinicaCompleto('telefone')) || ''}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinica-email">Email</Label>
                  <Input
                    id="clinica-email"
                    type="email"
                    {...(editingClinica ? registerClinica('email') : registerClinicaCompleto('email'))}
                    placeholder="contato@clinica.com"
                  />
                  {(editingClinica ? errorsClinica.email : errorsClinicaCompleto.email) && (
                    <p className="text-sm text-destructive">
                      {(editingClinica ? errorsClinica.email : errorsClinicaCompleto.email)?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinica-endereco">Endereço</Label>
                  <Input
                    id="clinica-endereco"
                    {...(editingClinica ? registerClinica('endereco') : registerClinicaCompleto('endereco'))}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinica-logo">Logo da Clínica</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          width={100}
                          height={100}
                          className="rounded-lg border object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                          onClick={() => {
                            setLogoPreview(null)
                            if (editingClinica) {
                              setValueClinica('logoUrl', '')
                            } else {
                              setValueClinicaCompleto('logoUrl', '')
                            }
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingLogo ? 'Enviando...' : 'Selecionar Imagem'}
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB)
                      </p>
                    </div>
                  </div>
                  <Input
                    {...(editingClinica ? registerClinica('logoUrl') : registerClinicaCompleto('logoUrl'))}
                    type="hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinica-corPrimaria">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="clinica-corPrimaria"
                        type="color"
                        {...(editingClinica ? registerClinica('corPrimaria') : registerClinicaCompleto('corPrimaria'))}
                        className="h-10 w-20"
                      />
                      <Input
                        {...(editingClinica ? registerClinica('corPrimaria') : registerClinicaCompleto('corPrimaria'))}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinica-corSecundaria">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="clinica-corSecundaria"
                        type="color"
                        {...(editingClinica ? registerClinica('corSecundaria') : registerClinicaCompleto('corSecundaria'))}
                        className="h-10 w-20"
                      />
                      <Input
                        {...(editingClinica ? registerClinica('corSecundaria') : registerClinicaCompleto('corSecundaria'))}
                        placeholder="#1e40af"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Campos do Gerente - ao criar nova clínica ou editar */}
                {!editingClinica ? (
                  <>
                    <div className="border-t pt-4">
                      <h3 className="mb-4 text-lg font-semibold">Dados do Gerente (Dono da Clínica)</h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        O gerente será o dono da clínica e poderá gerenciar usuários (médicos e secretárias) independentemente.
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="gerente-name">Nome do Gerente *</Label>
                          <Input
                            id="gerente-name"
                            {...registerClinicaCompleto('gerenteName')}
                            placeholder="Nome completo do gerente"
                          />
                          {errorsClinicaCompleto.gerenteName && (
                            <p className="text-sm text-destructive">
                              {errorsClinicaCompleto.gerenteName.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gerente-email">Email do Gerente *</Label>
                          <Input
                            id="gerente-email"
                            type="email"
                            {...registerClinicaCompleto('gerenteEmail')}
                            placeholder="gerente@clinica.com"
                          />
                          {errorsClinicaCompleto.gerenteEmail && (
                            <p className="text-sm text-destructive">
                              {errorsClinicaCompleto.gerenteEmail.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gerente-password">Senha do Gerente *</Label>
                          <Input
                            id="gerente-password"
                            type="password"
                            {...registerClinicaCompleto('gerentePassword')}
                            placeholder="Mínimo 6 caracteres"
                          />
                          {errorsClinicaCompleto.gerentePassword && (
                            <p className="text-sm text-destructive">
                              {errorsClinicaCompleto.gerentePassword.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Campos do Gerente na Edição */}
                    <div className="border-t pt-4">
                      <h3 className="mb-4 text-lg font-semibold">Dados do Gerente (Dono da Clínica)</h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {editingClinica?.ownerId 
                          ? 'Atualize as informações do gerente da clínica. Deixe a senha em branco para não alterá-la.'
                          : 'Esta clínica ainda não tem um gerente. Preencha os dados para criar o gerente.'}
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="gerente-name-edit">Nome do Gerente</Label>
                          <Input
                            id="gerente-name-edit"
                            {...registerClinica('gerenteName')}
                            placeholder="Nome completo do gerente"
                          />
                          {errorsClinica.gerenteName && (
                            <p className="text-sm text-destructive">
                              {errorsClinica.gerenteName.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gerente-email-edit">Email do Gerente</Label>
                          <Input
                            id="gerente-email-edit"
                            type="email"
                            {...registerClinica('gerenteEmail')}
                            placeholder="gerente@clinica.com"
                          />
                          {errorsClinica.gerenteEmail && (
                            <p className="text-sm text-destructive">
                              {errorsClinica.gerenteEmail.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gerente-password-edit">
                            {editingClinica?.ownerId 
                              ? 'Nova Senha do Gerente (opcional)' 
                              : 'Senha do Gerente *'}
                          </Label>
                          <Input
                            id="gerente-password-edit"
                            type="password"
                            {...registerClinica('gerentePassword')}
                            placeholder={editingClinica?.ownerId 
                              ? 'Deixe em branco para não alterar'
                              : 'Mínimo 6 caracteres'}
                          />
                          {errorsClinica.gerentePassword && (
                            <p className="text-sm text-destructive">
                              {errorsClinica.gerentePassword.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsClinicaDialogOpen(false)
                      if (editingClinica) {
                        resetClinica()
                      } else {
                        resetClinicaCompleto()
                      }
                      setEditingClinica(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingClinica ? 'Atualizar' : 'Criar Clínica'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Especialidade */}
        <Dialog
          open={isEspecialidadeDialogOpen}
          onOpenChange={setIsEspecialidadeDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEspecialidade
                  ? 'Editar Especialidade'
                  : 'Nova Especialidade'}
              </DialogTitle>
              <DialogDescription>
                {editingEspecialidade
                  ? 'Atualize as informações da especialidade'
                  : 'Preencha os dados da nova especialidade'}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmitEspecialidade(onSubmitEspecialidade)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  {...registerEspecialidade('nome')}
                  placeholder="Nome da especialidade"
                />
                {errorsEspecialidade.nome && (
                  <p className="text-sm text-destructive">
                    {errorsEspecialidade.nome.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <textarea
                  id="descricao"
                  {...registerEspecialidade('descricao')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descrição da especialidade"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEspecialidadeDialogOpen(false)
                    resetEspecialidade()
                    setEditingEspecialidade(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingEspecialidade ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão de Usuário */}
        <Dialog open={isDeleteUsuarioDialogOpen} onOpenChange={setIsDeleteUsuarioDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o usuário <strong>{usuarioToDelete?.name}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita. O usuário será marcado como inativo e não poderá mais acessar o sistema.
              </p>
              {usuarioToDelete?.role === 'ADMIN' && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Atenção:</strong> Você está prestes a excluir um usuário Administrador. 
                  Certifique-se de que existem outros administradores no sistema.
                </div>
              )}
              {usuarioToDelete?.id && user?.id && String(usuarioToDelete.id).trim() === String(user.id).trim() && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
                  <strong>Erro:</strong> Você não pode excluir seu próprio usuário.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteUsuarioDialogOpen(false)
                  setUsuarioToDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (!usuarioToDelete) return
                  
                  // Logs para debug
                  console.log('🗑️  FRONTEND - Tentando excluir usuário');
                  console.log('🗑️  ID do usuário a ser excluído:', usuarioToDelete.id);
                  console.log('🗑️  ID do usuário logado:', user?.id);
                  console.log('🗑️  Comparação:', usuarioToDelete.id === user?.id);
                  console.log('🗑️  Tipo do ID do usuário a excluir:', typeof usuarioToDelete.id);
                  console.log('🗑️  Tipo do ID do usuário logado:', typeof user?.id);
                  
                  // Verificar se está tentando excluir a si mesmo (comparação mais robusta)
                  const usuarioId = String(usuarioToDelete.id).trim();
                  const userId = user?.id ? String(user.id).trim() : null;
                  
                  if (userId && usuarioId === userId) {
                    console.log('❌ Bloqueado no frontend: Tentativa de auto-exclusão');
                    toast({
                      title: 'Erro',
                      description: 'Você não pode excluir seu próprio usuário',
                      variant: 'destructive',
                    })
                    setIsDeleteUsuarioDialogOpen(false)
                    setUsuarioToDelete(null)
                    return
                  }

                  try {
                    console.log('✅ Enviando requisição de exclusão para o backend');
                    await api.delete(`/configuracoes/usuarios/${usuarioToDelete.id}`)
                    toast({
                      title: 'Sucesso',
                      description: 'Usuário excluído com sucesso',
                    })
                    setIsDeleteUsuarioDialogOpen(false)
                    setUsuarioToDelete(null)
                    loadData()
                  } catch (error: any) {
                    console.error('❌ Erro ao excluir usuário:', error);
                    console.error('❌ Resposta do erro:', error.response?.data);
                    toast({
                      title: 'Erro',
                      description: error.response?.data?.message || 'Erro ao excluir usuário',
                      variant: 'destructive',
                    })
                  }
                }}
                disabled={usuarioToDelete?.id && user?.id ? String(usuarioToDelete.id).trim() === String(user.id).trim() : false}
              >
                Excluir Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
