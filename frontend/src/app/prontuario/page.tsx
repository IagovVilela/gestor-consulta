'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Plus, FileText, Pill, Calendar, Copy, Paperclip, Download, Trash2 } from 'lucide-react'
import api from '@/lib/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const evolucaoSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
})

const prescricaoSchema = z.object({
  medicamento: z.string().min(1, 'Medicamento é obrigatório'),
  dosagem: z.string().min(1, 'Dosagem é obrigatória'),
  posologia: z.string().min(1, 'Posologia é obrigatória'),
  observacoes: z.string().optional(),
})

const prontuarioSchema = z.object({
  queixaPrincipal: z.string().optional(),
  historico: z.string().optional(),
  exameFisico: z.string().optional(),
  diagnostico: z.string().optional(),
  conduta: z.string().optional(),
  observacoes: z.string().optional(),
})

type EvolucaoFormData = z.infer<typeof evolucaoSchema>
type PrescricaoFormData = z.infer<typeof prescricaoSchema>
type ProntuarioFormData = z.infer<typeof prontuarioSchema>

interface Anexo {
  id: string
  nome: string
  descricao?: string
  url: string
  tipo?: string
  tamanho?: number
  createdAt: string
}

interface Prontuario {
  id: string
  consulta?: {
    id: string
    dataHora: string
    paciente?: {
      id: string
      nome: string
    } | null
    pacientes?: {
      id: string
      nome: string
    } | null
    profissional?: {
      nome: string
      nomeCompleto?: string
      especialidade?: {
        nome: string
      } | null
    } | null
    profissionais?: {
      nome: string
      nomeCompleto?: string
      especialidades?: {
        nome: string
      } | null
      especialidade?: {
        nome: string
      } | null
    } | null
  } | null
  queixaPrincipal?: string
  historico?: string
  exameFisico?: string
  diagnostico?: string
  conduta?: string
  observacoes?: string
  evolucoes: Evolucao[]
  prescricoes: Prescricao[]
  anexos?: Anexo[]
}

interface Evolucao {
  id: string
  descricao: string
  createdAt: string
}

interface Prescricao {
  id: string
  medicamento: string
  dosagem: string
  posologia: string
  observacoes?: string
  createdAt: string
}

interface Consulta {
  id: string
  dataHora: string
  status?: string
  paciente?: {
    nome: string
  } | null
  pacientes?: {
    nome: string
  } | null
  profissional?: {
    nome: string
    nomeCompleto?: string
    especialidade?: {
      nome: string
    } | null
  } | null
  profissionais?: {
    nome: string
    nomeCompleto?: string
    especialidades?: {
      nome: string
    } | null
    especialidade?: {
      nome: string
    } | null
  } | null
  prontuario?: Prontuario
}

const statusLabels: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  EM_ATENDIMENTO: 'Em Atendimento',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
  FALTA: 'Falta',
}

interface Paciente {
  id: string
  nome: string
}

// Desabilitar prerendering estático para evitar problemas com módulos dinâmicos
export const dynamic = 'force-dynamic'

export default function ProntuarioPage() {
  const searchParams = useSearchParams()
  const consultaId = searchParams.get('consultaId')
  const pacienteId = searchParams.get('pacienteId')

  const [prontuario, setProntuario] = useState<Prontuario | null>(null)
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [selectedPaciente, setSelectedPaciente] = useState<string | null>(pacienteId)
  const [selectedConsulta, setSelectedConsulta] = useState<string | null>(consultaId)
  const [loading, setLoading] = useState(false)
  const [loadingPacientes, setLoadingPacientes] = useState(false)
  const [isEvolucaoDialogOpen, setIsEvolucaoDialogOpen] = useState(false)
  const [isPrescricaoDialogOpen, setIsPrescricaoDialogOpen] = useState(false)
  const [isProntuarioDialogOpen, setIsProntuarioDialogOpen] = useState(false)
  const [isAnexarDialogOpen, setIsAnexarDialogOpen] = useState(false)
  const [isAnexoDialogOpen, setIsAnexoDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [prontuariosAnteriores, setProntuariosAnteriores] = useState<Prontuario[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [anexoDescricao, setAnexoDescricao] = useState('')
  const { toast } = useToast()

  const {
    register: registerEvolucao,
    handleSubmit: handleSubmitEvolucao,
    reset: resetEvolucao,
    formState: { errors: errorsEvolucao },
  } = useForm<EvolucaoFormData>({
    resolver: zodResolver(evolucaoSchema),
  })

  const {
    register: registerPrescricao,
    handleSubmit: handleSubmitPrescricao,
    reset: resetPrescricao,
    formState: { errors: errorsPrescricao },
  } = useForm<PrescricaoFormData>({
    resolver: zodResolver(prescricaoSchema),
  })

  const {
    register: registerProntuario,
    handleSubmit: handleSubmitProntuario,
    reset: resetProntuario,
    formState: { errors: errorsProntuario },
  } = useForm<ProntuarioFormData>({
    resolver: zodResolver(prontuarioSchema),
  })

  const loadProntuario = async (consultaIdParam: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/prontuario/consulta/${consultaIdParam}`)
      console.log('📋 Prontuário recebido:', response.data)
      
      // Mapear os dados para o formato esperado pelo frontend
      const prontuarioData = response.data;
      if (prontuarioData) {
        const consulta = prontuarioData.consulta || prontuarioData.consultas;
        if (consulta) {
          const profissional = consulta.profissionais || consulta.profissional;
          const paciente = consulta.pacientes || consulta.paciente;
          
          prontuarioData.consulta = {
            ...consulta,
            paciente: paciente,
            profissional: profissional ? {
              ...profissional,
              nome: profissional.nomeCompleto || profissional.nome,
              especialidade: profissional.especialidades || profissional.especialidade,
            } : null,
          };
        }
      }
      
      console.log('✅ Prontuário mapeado:', prontuarioData)
      setProntuario(prontuarioData)
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Prontuário não existe ainda, criar um básico
        setProntuario(null)
      } else {
        console.error('Erro ao carregar prontuário:', error)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o prontuário',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPacientes = async () => {
    try {
      setLoadingPacientes(true)
      const response = await api.get('/pacientes', {
        params: {
          limit: 1000,
        },
      })
      const pacientesData = response.data.data || response.data || []
      console.log('📋 Pacientes carregados:', pacientesData)
      setPacientes(Array.isArray(pacientesData) ? pacientesData : [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pacientes',
        variant: 'destructive',
      })
    } finally {
      setLoadingPacientes(false)
    }
  }

  const loadHistorico = async (pacienteIdParam: string) => {
    if (!pacienteIdParam) {
      setConsultas([])
      return
    }

    try {
      setLoading(true)
      const response = await api.get(`/prontuario/paciente/${pacienteIdParam}`)
      console.log('📋 Consultas do paciente recebidas:', response.data)
      
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
      }) : [];
      
      console.log('✅ Consultas mapeadas:', mappedConsultas)
      setConsultas(mappedConsultas)
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error)
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível carregar o histórico de consultas',
        variant: 'destructive',
      })
      setConsultas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Carregar pacientes se não houver seleção
    if (!selectedPaciente && !pacienteId && !selectedConsulta) {
      loadPacientes()
      setLoading(false) // Não mostrar loading quando apenas carregando pacientes
      return
    }
    
    // Carregar histórico de consultas quando um paciente for selecionado
    if (selectedPaciente) {
      loadHistorico(selectedPaciente)
    } else if (pacienteId) {
      loadHistorico(pacienteId)
    }
    
    // Carregar prontuário quando uma consulta for selecionada
    if (selectedConsulta) {
      loadProntuario(selectedConsulta)
    } else {
      // Se não há consulta selecionada, garantir que loading seja false e limpar prontuário
      setLoading(false)
      setProntuario(null)
    }
  }, [selectedConsulta, selectedPaciente, pacienteId])

  const onSubmitEvolucao = async (data: EvolucaoFormData) => {
    if (!prontuario) {
      toast({
        title: 'Erro',
        description: 'Prontuário não encontrado',
        variant: 'destructive',
      })
      return
    }

    try {
      await api.post(`/prontuario/${prontuario.id}/evolucao`, data)
      toast({
        title: 'Sucesso',
        description: 'Evolução adicionada com sucesso',
      })
      setIsEvolucaoDialogOpen(false)
      resetEvolucao()
      if (selectedConsulta) {
        loadProntuario(selectedConsulta)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao adicionar evolução',
        variant: 'destructive',
      })
    }
  }

  const onSubmitPrescricao = async (data: PrescricaoFormData) => {
    if (!prontuario) {
      toast({
        title: 'Erro',
        description: 'Prontuário não encontrado',
        variant: 'destructive',
      })
      return
    }

    try {
      await api.post(`/prontuario/${prontuario.id}/prescricao`, data)
      toast({
        title: 'Sucesso',
        description: 'Prescrição adicionada com sucesso',
      })
      setIsPrescricaoDialogOpen(false)
      resetPrescricao()
      if (selectedConsulta) {
        loadProntuario(selectedConsulta)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao adicionar prescrição',
        variant: 'destructive',
      })
    }
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR,
    })
  }

  const handleCreateProntuario = () => {
    if (!selectedConsulta) {
      toast({
        title: 'Erro',
        description: 'Selecione uma consulta primeiro',
        variant: 'destructive',
      })
      return
    }
    resetProntuario()
    setIsEditMode(false)
    setIsProntuarioDialogOpen(true)
  }

  const handleEditProntuario = () => {
    if (!prontuario) return
    resetProntuario({
      queixaPrincipal: prontuario.queixaPrincipal || '',
      historico: prontuario.historico || '',
      exameFisico: prontuario.exameFisico || '',
      diagnostico: prontuario.diagnostico || '',
      conduta: prontuario.conduta || '',
      observacoes: prontuario.observacoes || '',
    })
    setIsEditMode(true)
    setIsProntuarioDialogOpen(true)
  }

  const handleAnexarProntuario = async () => {
    if (!selectedConsulta || (!selectedPaciente && !pacienteId)) {
      toast({
        title: 'Erro',
        description: 'Selecione uma consulta e paciente primeiro',
        variant: 'destructive',
      })
      return
    }

    try {
      // Buscar prontuários anteriores do paciente
      const pacienteIdParam = selectedPaciente || pacienteId
      if (!pacienteIdParam) return

      const response = await api.get(`/prontuario/paciente/${pacienteIdParam}`)
      const consultasComProntuario = Array.isArray(response.data) 
        ? response.data.filter((c: any) => c.prontuarios && c.id !== selectedConsulta)
        : []

      if (consultasComProntuario.length === 0) {
        toast({
          title: 'Informação',
          description: 'Não há prontuários anteriores para anexar',
        })
        return
      }

      // Buscar os prontuários completos
      const prontuariosCompletos = await Promise.all(
        consultasComProntuario.map(async (c: any) => {
          try {
            const prontuarioRes = await api.get(`/prontuario/consulta/${c.id}`)
            return prontuarioRes.data
          } catch {
            return null
          }
        })
      )

      const prontuariosValidos = prontuariosCompletos.filter((p: any) => p !== null)
      setProntuariosAnteriores(prontuariosValidos)
      setIsAnexarDialogOpen(true)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao carregar prontuários anteriores',
        variant: 'destructive',
      })
    }
  }

  const handleSelecionarProntuarioAnterior = (prontuarioAnterior: Prontuario) => {
    // Copiar dados do prontuário anterior para o formulário
    resetProntuario({
      queixaPrincipal: prontuarioAnterior.queixaPrincipal || '',
      historico: prontuarioAnterior.historico || '',
      exameFisico: prontuarioAnterior.exameFisico || '',
      diagnostico: prontuarioAnterior.diagnostico || '',
      conduta: prontuarioAnterior.conduta || '',
      observacoes: prontuarioAnterior.observacoes || '',
    })
    setIsAnexarDialogOpen(false)
    setIsProntuarioDialogOpen(true)
    setIsEditMode(false)
    
    toast({
      title: 'Sucesso',
      description: 'Dados do prontuário anterior foram copiados. Você pode editar antes de salvar.',
    })
  }

  const onSubmitProntuario = async (data: ProntuarioFormData) => {
    if (!selectedConsulta) {
      toast({
        title: 'Erro',
        description: 'Selecione uma consulta primeiro',
        variant: 'destructive',
      })
      return
    }

    try {
      if (isEditMode && prontuario) {
        await api.put(`/prontuario/${prontuario.id}`, data)
        toast({
          title: 'Sucesso',
          description: 'Prontuário atualizado com sucesso',
        })
      } else {
        await api.post('/prontuario', {
          consultaId: selectedConsulta,
          ...data,
        })
        toast({
          title: 'Sucesso',
          description: 'Prontuário criado com sucesso',
        })
      }
      setIsProntuarioDialogOpen(false)
      resetProntuario()
      if (selectedConsulta) {
        loadProntuario(selectedConsulta)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar prontuário',
        variant: 'destructive',
      })
    }
  }

  const handleUploadAnexo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }

    if (!selectedConsulta) {
      toast({
        title: 'Erro',
        description: 'Selecione uma consulta primeiro',
        variant: 'destructive',
      })
      return
    }

    const file = event.target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    if (anexoDescricao) {
      formData.append('descricao', anexoDescricao)
    }

    try {
      setUploadingFile(true)
      
      // Se o prontuário não existe, criar primeiro
      let prontuarioId = prontuario?.id
      if (!prontuarioId) {
        // Criar prontuário vazio primeiro
        const prontuarioResponse = await api.post('/prontuario', {
          consultaId: selectedConsulta,
        })
        prontuarioId = prontuarioResponse.data.id
      }
      
      // Anexar o arquivo ao prontuário
      await api.post(`/prontuario/${prontuarioId}/anexo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      toast({
        title: 'Sucesso',
        description: prontuario 
          ? 'Arquivo anexado com sucesso' 
          : 'Prontuário criado e arquivo anexado com sucesso',
      })
      
      setIsAnexoDialogOpen(false)
      setAnexoDescricao('')
      if (selectedConsulta) {
        loadProntuario(selectedConsulta)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao anexar arquivo',
        variant: 'destructive',
      })
    } finally {
      setUploadingFile(false)
      event.target.value = '' // Reset input
    }
  }

  const handleRemoveAnexo = async (anexoId: string) => {
    if (!prontuario) return

    try {
      await api.delete(`/prontuario/anexo/${anexoId}`)
      toast({
        title: 'Sucesso',
        description: 'Anexo removido com sucesso',
      })
      if (selectedConsulta) {
        loadProntuario(selectedConsulta)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao remover anexo',
        variant: 'destructive',
      })
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (!selectedConsulta && !pacienteId && !selectedPaciente) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Prontuário</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie prontuários médicos
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPacientes ? (
                <p className="text-center text-muted-foreground py-4">Carregando pacientes...</p>
              ) : pacientes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum paciente encontrado</p>
              ) : (
                <Select
                  value={selectedPaciente || ''}
                  onValueChange={(value) => {
                    setSelectedPaciente(value)
                    setSelectedConsulta(null) // Limpar consulta selecionada ao mudar paciente
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map((paciente) => (
                      <SelectItem key={paciente.id} value={paciente.id}>
                        {paciente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prontuário</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie prontuários médicos
            </p>
          </div>
          {prontuario && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEvolucaoDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Evolução
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPrescricaoDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Prescrição
              </Button>
            </div>
          )}
        </div>

        {(pacienteId || selectedPaciente) && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              {consultas.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma consulta encontrada para este paciente
                </p>
              ) : (
                <Select
                  value={selectedConsulta || ''}
                  onValueChange={setSelectedConsulta}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma consulta" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultas.map((consulta) => (
                      <SelectItem key={consulta.id} value={consulta.id}>
                        {formatDateTime(consulta.dataHora)} -{' '}
                        {consulta.profissional?.nome || consulta.profissional?.nomeCompleto || 'N/A'} ({consulta.profissional?.especialidade?.nome || 'Sem especialidade'})
                        {consulta.status && ` - ${statusLabels[consulta.status] || consulta.status}`}
                        {consulta.prontuario && ' ✓'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        )}

        {loading && selectedConsulta ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Carregando prontuário...</p>
            </CardContent>
          </Card>
        ) : !selectedConsulta ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                {consultas.length > 0 
                  ? 'Selecione uma consulta acima para visualizar o prontuário'
                  : 'Nenhuma consulta encontrada para este paciente'}
              </p>
            </CardContent>
          </Card>
        ) : prontuario ? (
          <>
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                onClick={handleEditProntuario}
              >
                Editar Prontuário
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Informações da Consulta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Paciente</Label>
                    <p className="font-medium">
                      {prontuario.consulta?.paciente?.nome || prontuario.consulta?.pacientes?.nome || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Profissional</Label>
                    <p className="font-medium">
                      {prontuario.consulta?.profissional?.nome || prontuario.consulta?.profissionais?.nome || prontuario.consulta?.profissionais?.nomeCompleto || 'N/A'} -{' '}
                      {prontuario.consulta?.profissional?.especialidade?.nome || prontuario.consulta?.profissionais?.especialidades?.nome || 'Sem especialidade'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data/Hora</Label>
                    <p>{prontuario.consulta?.dataHora ? formatDateTime(prontuario.consulta.dataHora) : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {prontuario.queixaPrincipal && (
              <Card>
                <CardHeader>
                  <CardTitle>Queixa Principal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prontuario.queixaPrincipal}
                  </p>
                </CardContent>
              </Card>
            )}

            {prontuario.historico && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico Clínico</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prontuario.historico}
                  </p>
                </CardContent>
              </Card>
            )}

            {prontuario.exameFisico && (
              <Card>
                <CardHeader>
                  <CardTitle>Exame Físico</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prontuario.exameFisico}
                  </p>
                </CardContent>
              </Card>
            )}

            {prontuario.diagnostico && (
              <Card>
                <CardHeader>
                  <CardTitle>Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prontuario.diagnostico}
                  </p>
                </CardContent>
              </Card>
            )}

            {prontuario.conduta && (
              <Card>
                <CardHeader>
                  <CardTitle>Conduta</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prontuario.conduta}
                  </p>
                </CardContent>
              </Card>
            )}

            {prontuario.observacoes && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prontuario.observacoes}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Evoluções
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prontuario.evolucoes.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma evolução registrada</p>
                ) : (
                  <div className="space-y-4">
                    {prontuario.evolucoes.map((evolucao) => (
                      <div
                        key={evolucao.id}
                        className="border-l-4 border-blue-500 pl-4 py-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(evolucao.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{evolucao.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Prescrições
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prontuario.prescricoes.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma prescrição registrada</p>
                ) : (
                  <div className="space-y-4">
                    {prontuario.prescricoes.map((prescricao) => (
                      <div
                        key={prescricao.id}
                        className="border-l-4 border-green-500 pl-4 py-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{prescricao.medicamento}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(prescricao.createdAt)}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Dosagem:</span>{' '}
                            {prescricao.dosagem}
                          </p>
                          <p>
                            <span className="font-medium">Posologia:</span>{' '}
                            {prescricao.posologia}
                          </p>
                          {prescricao.observacoes && (
                            <p>
                              <span className="font-medium">Observações:</span>{' '}
                              {prescricao.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Anexos
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAnexoDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Anexar Arquivo
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!prontuario.anexos || prontuario.anexos.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum arquivo anexado</p>
                ) : (
                  <div className="space-y-2">
                    {prontuario.anexos.map((anexo) => (
                      <div
                        key={anexo.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{anexo.nome}</p>
                            {anexo.descricao && (
                              <p className="text-sm text-muted-foreground truncate">
                                {anexo.descricao}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{formatFileSize(anexo.tamanho)}</span>
                              {anexo.tipo && <span>•</span>}
                              {anexo.tipo && <span>{anexo.tipo}</span>}
                              <span>•</span>
                              <span>{formatDateTime(anexo.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // A URL já vem do backend como /api/uploads/prontuarios/...
                              // Precisamos construir a URL completa usando a baseURL do axios
                              const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api'
                              const url = anexo.url.startsWith('http') 
                                ? anexo.url 
                                : anexo.url.startsWith('/api')
                                ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3011'}${anexo.url}`
                                : `${baseUrl}${anexo.url}`
                              window.open(url, '_blank')
                            }}
                            title="Baixar arquivo"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAnexo(anexo.id)}
                            title="Remover anexo"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Prontuário não encontrado para esta consulta
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    onClick={handleCreateProntuario}
                    variant="default"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Prontuário
                  </Button>
                  {(selectedPaciente || pacienteId) && (
                    <Button
                      onClick={handleAnexarProntuario}
                      variant="outline"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Anexar Prontuário Anterior
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsAnexoDialogOpen(true)}
                    variant="outline"
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Upload de Arquivo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de Criar/Editar Prontuário */}
        <Dialog open={isProntuarioDialogOpen} onOpenChange={setIsProntuarioDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? 'Editar Prontuário' : 'Criar Prontuário'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode 
                  ? 'Edite as informações do prontuário médico'
                  : 'Preencha as informações do prontuário médico'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitProntuario(onSubmitProntuario)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="queixaPrincipal">Queixa Principal</Label>
                <textarea
                  id="queixaPrincipal"
                  {...registerProntuario('queixaPrincipal')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descreva a queixa principal do paciente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="historico">Histórico Clínico</Label>
                <textarea
                  id="historico"
                  {...registerProntuario('historico')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Histórico clínico do paciente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exameFisico">Exame Físico</Label>
                <textarea
                  id="exameFisico"
                  {...registerProntuario('exameFisico')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descreva o exame físico realizado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnostico">Diagnóstico</Label>
                <textarea
                  id="diagnostico"
                  {...registerProntuario('diagnostico')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Diagnóstico da consulta"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conduta">Conduta</Label>
                <textarea
                  id="conduta"
                  {...registerProntuario('conduta')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Conduta médica adotada"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea
                  id="observacoes"
                  {...registerProntuario('observacoes')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Observações adicionais"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsProntuarioDialogOpen(false)
                    resetProntuario()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {isEditMode ? 'Atualizar' : 'Criar'} Prontuário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Evolução */}
        <Dialog open={isEvolucaoDialogOpen} onOpenChange={setIsEvolucaoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Evolução</DialogTitle>
              <DialogDescription>
                Adicione uma nova evolução ao prontuário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitEvolucao(onSubmitEvolucao)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <textarea
                  id="descricao"
                  {...registerEvolucao('descricao')}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descreva a evolução do paciente"
                />
                {errorsEvolucao.descricao && (
                  <p className="text-sm text-destructive">
                    {errorsEvolucao.descricao.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEvolucaoDialogOpen(false)
                    resetEvolucao()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Adicionar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Prescrição */}
        <Dialog open={isPrescricaoDialogOpen} onOpenChange={setIsPrescricaoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Prescrição</DialogTitle>
              <DialogDescription>
                Adicione uma nova prescrição ao prontuário
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmitPrescricao(onSubmitPrescricao)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="medicamento">Medicamento *</Label>
                <Input
                  id="medicamento"
                  {...registerPrescricao('medicamento')}
                  placeholder="Nome do medicamento"
                />
                {errorsPrescricao.medicamento && (
                  <p className="text-sm text-destructive">
                    {errorsPrescricao.medicamento.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosagem">Dosagem *</Label>
                <Input
                  id="dosagem"
                  {...registerPrescricao('dosagem')}
                  placeholder="Ex: 500mg"
                />
                {errorsPrescricao.dosagem && (
                  <p className="text-sm text-destructive">
                    {errorsPrescricao.dosagem.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="posologia">Posologia *</Label>
                <Input
                  id="posologia"
                  {...registerPrescricao('posologia')}
                  placeholder="Ex: 1 comprimido a cada 8 horas"
                />
                {errorsPrescricao.posologia && (
                  <p className="text-sm text-destructive">
                    {errorsPrescricao.posologia.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea
                  id="observacoes"
                  {...registerPrescricao('observacoes')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Observações adicionais"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPrescricaoDialogOpen(false)
                    resetPrescricao()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Adicionar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Anexar Prontuário Anterior */}
        <Dialog open={isAnexarDialogOpen} onOpenChange={setIsAnexarDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Anexar Prontuário Anterior</DialogTitle>
              <DialogDescription>
                Selecione um prontuário anterior do paciente para copiar os dados
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {prontuariosAnteriores.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum prontuário anterior encontrado
                </p>
              ) : (
                <div className="space-y-2">
                  {prontuariosAnteriores.map((prontuarioAnterior) => {
                    const consultaRelacionada =
                      prontuarioAnterior.consulta ||
                      (prontuarioAnterior as { consultas?: typeof prontuarioAnterior.consulta }).consultas
                    const dataHora = consultaRelacionada?.dataHora
                    const profissional =
                      consultaRelacionada?.profissional || consultaRelacionada?.profissionais
                    const nomeProfissional = profissional?.nomeCompleto || profissional?.nome || 'N/A'
                    const especialidade =
                      profissional?.especialidade?.nome ||
                      (profissional as { especialidades?: { nome?: string } } | null | undefined)
                        ?.especialidades?.nome ||
                      'Sem especialidade'
                    
                    return (
                      <Card
                        key={prontuarioAnterior.id}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelecionarProntuarioAnterior(prontuarioAnterior)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {dataHora ? formatDateTime(dataHora) : 'Data não disponível'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {nomeProfissional} - {especialidade}
                              </p>
                              {(prontuarioAnterior.diagnostico || prontuarioAnterior.queixaPrincipal) && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {prontuarioAnterior.diagnostico || prontuarioAnterior.queixaPrincipal}
                                </p>
                              )}
                            </div>
                            <Copy className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAnexarDialogOpen(false)}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Anexar Arquivo */}
        <Dialog open={isAnexoDialogOpen} onOpenChange={setIsAnexoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {prontuario ? 'Anexar Arquivo ao Prontuário' : 'Upload de Arquivo - Criar Prontuário'}
              </DialogTitle>
              <DialogDescription>
                {prontuario 
                  ? 'Selecione um arquivo para anexar ao prontuário (máximo 10MB)'
                  : 'Selecione um arquivo. Um prontuário será criado automaticamente e o arquivo será anexado (máximo 10MB)'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="arquivo">Arquivo *</Label>
                <Input
                  id="arquivo"
                  type="file"
                  onChange={handleUploadAnexo}
                  disabled={uploadingFile}
                  accept="*/*"
                />
                {uploadingFile && (
                  <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="anexoDescricao">Descrição (opcional)</Label>
                <textarea
                  id="anexoDescricao"
                  value={anexoDescricao}
                  onChange={(e) => setAnexoDescricao(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descreva o arquivo anexado"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAnexoDialogOpen(false)
                  setAnexoDescricao('')
                }}
                disabled={uploadingFile}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}




