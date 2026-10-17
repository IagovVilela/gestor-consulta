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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Calendar as CalendarIcon } from 'lucide-react'
import api from '@/lib/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, unformatCurrency } from '@/lib/masks'
import { useAuthStore } from '@/lib/store/auth-store'
import { useClinica } from '@/contexts/clinica-context'

const consultaSchema = z.object({
  pacienteId: z.string().min(1, 'Paciente é obrigatório'),
  profissionalId: z.string().min(1, 'Profissional é obrigatório'),
  clinicaId: z.string().min(1, 'Clínica é obrigatória'),
  data: z.string().min(1, 'Data é obrigatória'),
  hora: z.string().min(1, 'Selecione um horário do expediente'),
  observacoes: z.string().optional(),
  valor: z.number().optional(),
  porConvenio: z.boolean().optional().default(false),
  nomeConvenio: z.string().optional(),
}).refine((data) => {
  if (data.porConvenio && !data.nomeConvenio?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'Nome do convênio é obrigatório quando a consulta é por convênio',
  path: ['nomeConvenio'],
})

type ConsultaFormData = z.infer<typeof consultaSchema>

interface Consulta {
  id: string
  dataHora: string
  status: string
  valor?: number
  porConvenio?: boolean
  nomeConvenio?: string
  observacoes?: string
  paciente?: {
    id: string
    nome: string
  } | null
  profissional?: {
    id: string
    nomeCompleto?: string
    nome?: string
    especialidade?: {
      nome: string
    } | null
  } | null
}

interface Paciente {
  id: string
  nome: string
}

interface Profissional {
  id: string
  nomeCompleto: string
  especialidade?: {
    id: string
    nome: string
  }
}

// Cores baseadas no status da consulta
const getStatusColors = (status: string): { bg: string; text: string; hover: string } => {
  switch (status) {
    case 'AGENDADA':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        hover: 'hover:bg-blue-200'
      }
    case 'CONFIRMADA':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        hover: 'hover:bg-green-200'
      }
    case 'EM_ATENDIMENTO':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        hover: 'hover:bg-yellow-200'
      }
    case 'ATENDIDA':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        hover: 'hover:bg-gray-200'
      }
    case 'CANCELADA':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        hover: 'hover:bg-red-200'
      }
    case 'FALTA':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        hover: 'hover:bg-orange-200'
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        hover: 'hover:bg-gray-200'
      }
  }
}

export default function AgendaPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState(false)
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
  } = useForm<ConsultaFormData>({
    resolver: zodResolver(consultaSchema),
    defaultValues: {
      clinicaId: user?.role === 'ADMIN' 
        ? (selectedClinicaId || user?.clinicaId || '') 
        : (user?.clinicaId || ''),
      data: '',
      hora: '',
    },
  })

  const profissionalIdWatch = watch('profissionalId')
  const dataWatch = watch('data')

  const weekStart = startOfWeek(currentWeek, { locale: ptBR })
  const weekEnd = endOfWeek(currentWeek, { locale: ptBR })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const loadData = async () => {
    try {
      setLoading(true)
      // Determinar clinicaId para filtrar (ADMIN pode selecionar, outros usam a própria)
      const filterClinicaId = user?.role === 'ADMIN' 
        ? (selectedClinicaId || user?.clinicaId) 
        : user?.clinicaId

      console.log('📅 loadData - Carregando consultas:', {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        filterClinicaId,
        userRole: user?.role,
      })

      const [consultasRes, pacientesRes, profissionaisRes] = await Promise.all([
        api.get('/agenda', {
          params: {
            dataInicio: weekStart.toISOString(),
            dataFim: weekEnd.toISOString(),
            clinicaId: filterClinicaId || undefined,
          },
        }),
        api.get('/pacientes', { 
          params: { 
            limit: 1000,
            clinicaId: filterClinicaId || undefined,
          } 
        }),
        api.get('/profissionais/ativos', {
          params: {
            clinicaId: filterClinicaId || undefined,
          },
        }),
      ])

      console.log('✅ Consultas recebidas:', consultasRes.data)
      console.log('📊 Total de consultas:', Array.isArray(consultasRes.data) ? consultasRes.data.length : 'Não é array')
      
      if (Array.isArray(consultasRes.data)) {
        consultasRes.data.forEach((c: any, index: number) => {
          console.log(`  ${index + 1}. Consulta: ${c.paciente?.nome || 'Sem paciente'} - ${new Date(c.dataHora).toLocaleString('pt-BR')}`)
        })
      }

      // Mapear os dados para o formato esperado pelo frontend
      const mappedConsultas = Array.isArray(consultasRes.data) ? consultasRes.data.map((c: any) => {
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
      
      console.log('✅ Consultas mapeadas:', mappedConsultas);
      setConsultas(mappedConsultas);
      setPacientes(pacientesRes.data.data || [])
      setProfissionais(profissionaisRes.data)
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Atualizar clinicaId no formulário quando mudar
    const filterClinicaId = user?.role === 'ADMIN' 
      ? (selectedClinicaId || user?.clinicaId) 
      : user?.clinicaId
    if (filterClinicaId) {
      setValue('clinicaId', filterClinicaId)
    }
  }, [currentWeek, selectedClinicaId, user?.clinicaId, setValue])

  useEffect(() => {
    const loadHorarios = async () => {
      if (!profissionalIdWatch || !dataWatch) {
        setHorariosDisponiveis([])
        return
      }
      try {
        setLoadingHorarios(true)
        const filterClinicaId =
          user?.role === 'ADMIN'
            ? selectedClinicaId || user?.clinicaId
            : user?.clinicaId
        const response = await api.get('/agenda/horarios', {
          params: {
            profissionalId: profissionalIdWatch,
            data: dataWatch,
            clinicaId: filterClinicaId || undefined,
          },
        })
        const horarios = Array.isArray(response.data?.horarios)
          ? response.data.horarios
          : []
        setHorariosDisponiveis(horarios)
        const horaAtual = watch('hora')
        if (horaAtual && !horarios.includes(horaAtual)) {
          setValue('hora', '')
        }
      } catch (error) {
        console.error('Erro ao carregar horários:', error)
        setHorariosDisponiveis([])
        setValue('hora', '')
      } finally {
        setLoadingHorarios(false)
      }
    }
    loadHorarios()
  }, [
    profissionalIdWatch,
    dataWatch,
    selectedClinicaId,
    user?.clinicaId,
    user?.role,
    setValue,
  ])

  const onSubmit = async (data: ConsultaFormData) => {
    try {
      // Garantir que clinicaId está definido
      const clinicaId = data.clinicaId || (user?.role !== 'ADMIN' ? user?.clinicaId : undefined)
      
      // Se for por convênio, valor deve ser 0
      const valorFinal = data.porConvenio ? 0 : data.valor
      const [year, month, day] = data.data.split('-').map(Number)
      const [hours, minutes] = data.hora.split(':').map(Number)
      const dataHoraLocal = new Date(year, month - 1, day, hours, minutes, 0, 0)
      
      const response = await api.post('/agenda', {
        pacienteId: data.pacienteId,
        profissionalId: data.profissionalId,
        clinicaId: clinicaId || '',
        observacoes: data.observacoes,
        dataHora: dataHoraLocal.toISOString(),
        valor: valorFinal,
        porConvenio: data.porConvenio,
        nomeConvenio: data.porConvenio ? data.nomeConvenio : undefined,
      })
      
      console.log('✅ Consulta criada:', response.data)
      console.log('📅 Data/Hora da consulta:', new Date(data.dataHora).toISOString())
      console.log('🏥 Clínica ID:', clinicaId)
      
      toast({
        title: 'Sucesso',
        description: 'Consulta agendada com sucesso',
      })
      setIsDialogOpen(false)
      reset()
      // Aguardar um pouco antes de recarregar para garantir que o backend processou
      setTimeout(() => {
        console.log('🔄 Recarregando dados após criar consulta...')
        loadData()
      }, 500)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao agendar consulta',
        variant: 'destructive',
      })
    }
  }

  const getConsultasByDay = (day: Date) => {
    return consultas.filter((c) => isSameDay(new Date(c.dataHora), day))
  }

  const handleNewConsulta = (day: Date, hour: number) => {
    const filterClinicaId =
      user?.role === 'ADMIN'
        ? selectedClinicaId || user?.clinicaId || ''
        : user?.clinicaId || ''
    const dataStr = format(day, 'yyyy-MM-dd')
    const horaStr = `${String(hour).padStart(2, '0')}:00`
    reset({
      pacienteId: '',
      profissionalId: '',
      clinicaId: filterClinicaId,
      data: dataStr,
      hora: horaStr,
      observacoes: '',
      valor: undefined,
      porConvenio: false,
      nomeConvenio: '',
    })
    setHorariosDisponiveis([])
    setIsDialogOpen(true)
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8h às 19h

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">Gerencie seus agendamentos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setCurrentWeek(
                  new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
                )
              }
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentWeek(
                  new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
                )
              }
            >
              Próxima
            </Button>
            <Button
              onClick={() => {
                const filterClinicaId =
                  user?.role === 'ADMIN'
                    ? selectedClinicaId || user?.clinicaId || ''
                    : user?.clinicaId || ''
                reset({
                  pacienteId: '',
                  profissionalId: '',
                  clinicaId: filterClinicaId,
                  data: format(new Date(), 'yyyy-MM-dd'),
                  hora: '',
                  observacoes: '',
                  valor: undefined,
                  porConvenio: false,
                  nomeConvenio: '',
                })
                setHorariosDisponiveis([])
                setIsDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Consulta
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {format(weekStart, "d 'de' MMMM", { locale: ptBR })} -{' '}
              {format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="grid grid-cols-8 gap-2">
                    <div className="font-semibold p-2">Hora</div>
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="font-semibold p-2 text-center border-b"
                      >
                        <div className="text-sm">
                          {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div className="text-lg">
                          {format(day, 'd', { locale: ptBR })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {hours.map((hour) => (
                    <div key={hour} className="grid grid-cols-8 gap-2 border-b">
                      <div className="p-2 text-sm text-muted-foreground">
                        {hour}:00
                      </div>
                      {weekDays.map((day) => {
                        const dayConsultas = getConsultasByDay(day).filter(
                          (c) => new Date(c.dataHora).getHours() === hour
                        )
                        return (
                          <div
                            key={`${day.toISOString()}-${hour}`}
                            className="p-1 min-h-[60px] border-r"
                          >
                            {dayConsultas.length > 0 ? (
                              <div className="space-y-1">
                                {dayConsultas.map((consulta) => {
                                  const statusColors = getStatusColors(consulta.status || 'AGENDADA')
                                  return (
                                    <div
                                      key={consulta.id}
                                      className={`${statusColors.bg} ${statusColors.text} text-xs p-1 rounded cursor-pointer ${statusColors.hover}`}
                                      title={`${consulta.paciente?.nome || 'N/A'} - ${consulta.profissional?.nomeCompleto || consulta.profissional?.nome || 'N/A'} - Status: ${consulta.status || 'AGENDADA'}`}
                                      onClick={() => {
                                        setSelectedConsulta(consulta);
                                        setIsDetailsDialogOpen(true);
                                      }}
                                    >
                                      <div className="font-medium truncate">
                                        {consulta.paciente?.nome || 'N/A'}
                                      </div>
                                      <div className="text-[10px] truncate">
                                        {consulta.profissional?.nome || 'N/A'} - {consulta.profissional?.especialidade?.nome || 'Sem especialidade'}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <button
                                className="w-full h-full text-muted-foreground hover:bg-muted rounded text-xs"
                                onClick={() => handleNewConsulta(day, hour)}
                              >
                                +
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criar Consulta */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Consulta</DialogTitle>
              <DialogDescription>
                Preencha os dados para agendar uma nova consulta
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pacienteId">Paciente *</Label>
                  <Select
                    value={watch('pacienteId')}
                    onValueChange={(value) => setValue('pacienteId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {pacientes.map((paciente) => (
                        <SelectItem key={paciente.id} value={paciente.id}>
                          {paciente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.pacienteId && (
                    <p className="text-sm text-destructive">
                      {errors.pacienteId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profissionalId">Profissional *</Label>
                  <Select
                    value={watch('profissionalId')}
                    onValueChange={(value) => {
                      setValue('profissionalId', value)
                      setValue('hora', '')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.nomeCompleto} - {prof.especialidade?.nome || 'Sem especialidade'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.profissionalId && (
                    <p className="text-sm text-destructive">
                      {errors.profissionalId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    {...register('data')}
                    onChange={(e) => {
                      setValue('data', e.target.value)
                      setValue('hora', '')
                    }}
                  />
                  {errors.data && (
                    <p className="text-sm text-destructive">
                      {errors.data.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">Horário *</Label>
                  <Select
                    value={watch('hora') || ''}
                    onValueChange={(value) => setValue('hora', value)}
                    disabled={
                      !profissionalIdWatch ||
                      !dataWatch ||
                      loadingHorarios ||
                      horariosDisponiveis.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !profissionalIdWatch || !dataWatch
                            ? 'Selecione profissional e data'
                            : loadingHorarios
                              ? 'Carregando...'
                              : horariosDisponiveis.length === 0
                                ? 'Sem horários no expediente'
                                : 'Selecione o horário'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {horariosDisponiveis.map((hora) => (
                        <SelectItem key={hora} value={hora}>
                          {hora}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.hora && (
                    <p className="text-sm text-destructive">
                      {errors.hora.message}
                    </p>
                  )}
                  {profissionalIdWatch &&
                    dataWatch &&
                    !loadingHorarios &&
                    horariosDisponiveis.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum horário livre neste dia (verifique o expediente
                        da clínica e do profissional).
                      </p>
                    )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="text"
                    {...register('valor')}
                    placeholder="R$ 0,00"
                    disabled={watch('porConvenio')}
                    onChange={(e) => {
                      if (!watch('porConvenio')) {
                        const value = e.target.value
                        const unformatted = unformatCurrency(value)
                        const formatted = formatCurrency(unformatted)
                        e.target.value = formatted
                        setValue('valor', unformatted ? parseFloat(unformatted) / 100 : undefined)
                      }
                    }}
                  />
                  {watch('porConvenio') && (
                    <p className="text-xs text-muted-foreground">
                      Valor zerado para consultas por convênio
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      id="porConvenio"
                      type="checkbox"
                      checked={watch('porConvenio') || false}
                      onChange={(e) => {
                        setValue('porConvenio', e.target.checked)
                        // Se marcar como convênio, zerar o valor
                        if (e.target.checked) {
                          setValue('valor', 0)
                        }
                        // Se desmarcar, limpar nome do convênio
                        if (!e.target.checked) {
                          setValue('nomeConvenio', '')
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="porConvenio" className="cursor-pointer">
                      Consulta por convênio
                    </Label>
                  </div>
                </div>
                {watch('porConvenio') && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="nomeConvenio">Nome do Convênio *</Label>
                    <Input
                      id="nomeConvenio"
                      type="text"
                      {...register('nomeConvenio')}
                      placeholder="Ex: Unimed, Bradesco Saúde, Amil, etc."
                    />
                    {errors.nomeConvenio && (
                      <p className="text-sm text-destructive">
                        {errors.nomeConvenio.message}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    {...register('observacoes')}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Observações sobre a consulta"
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
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Agendar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Detalhes da Consulta */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Consulta</DialogTitle>
              <DialogDescription>
                Informações completas da consulta agendada
              </DialogDescription>
            </DialogHeader>
            {selectedConsulta && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Paciente</Label>
                    <p className="font-medium">{selectedConsulta.paciente?.nome || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Profissional</Label>
                    <p className="font-medium">
                      {selectedConsulta.profissional?.nome || selectedConsulta.profissional?.nomeCompleto || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Especialidade</Label>
                    <p className="font-medium">
                      {selectedConsulta.profissional?.especialidade?.nome || 'Sem especialidade'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data e Hora</Label>
                    <p className="font-medium">
                      {new Date(selectedConsulta.dataHora).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium">{selectedConsulta.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor</Label>
                    <p className="font-medium">
                      {selectedConsulta.porConvenio 
                        ? `R$ 0,00 (Convênio: ${selectedConsulta.nomeConvenio || 'N/A'})`
                        : selectedConsulta.valor 
                          ? `R$ ${selectedConsulta.valor.toFixed(2).replace('.', ',')}`
                          : 'R$ 0,00'
                      }
                    </p>
                  </div>
                </div>
                {selectedConsulta.observacoes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm mt-1">{selectedConsulta.observacoes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
