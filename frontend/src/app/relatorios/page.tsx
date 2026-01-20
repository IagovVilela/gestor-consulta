'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Download, Calendar } from 'lucide-react'
import api from '@/lib/axios'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82CA9D']

export default function RelatoriosPage() {
  const [dataInicio, setDataInicio] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  )
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [profissionalId, setProfissionalId] = useState<string>('all')
  const [atendimentos, setAtendimentos] = useState<any[]>([])
  const [financeiro, setFinanceiro] = useState<any>(null)
  const [pacientes, setPacientes] = useState<any[]>([])
  const [porProfissional, setPorProfissional] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadRelatorios = async () => {
    try {
      setLoading(true)
      const params: any = {
        inicio: new Date(dataInicio).toISOString(),
        fim: new Date(dataFim + 'T23:59:59').toISOString(),
      }
      if (profissionalId !== 'all') {
        params.profissionalId = profissionalId
      }

      const [atendimentosRes, financeiroRes, pacientesRes, porProfissionalRes] =
        await Promise.all([
          api.get('/relatorios/atendimentos', { params }),
          api.get('/relatorios/financeiro', { params }),
          api.get('/relatorios/pacientes'),
          api.get('/relatorios/profissional', {
            params: {
              inicio: params.inicio,
              fim: params.fim,
            },
          }),
        ])

      setAtendimentos(atendimentosRes.data)
      setFinanceiro(financeiroRes.data)
      setPacientes(pacientesRes.data)
      setPorProfissional(porProfissionalRes.data)
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os relatórios',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRelatorios()
  }, [dataInicio, dataFim, profissionalId])

  const atendimentosPorDia = atendimentos.reduce((acc: any, item: any) => {
    const date = format(new Date(item.dataHora), 'dd/MM')
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})

  const atendimentosPorDiaData = Object.entries(atendimentosPorDia).map(
    ([date, count]) => ({
      date,
      quantidade: count,
    })
  )

  const atendimentosPorStatus = atendimentos.reduce((acc: any, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})

  const atendimentosPorStatusData = Object.entries(atendimentosPorStatus).map(
    ([name, value]) => ({
      name,
      value,
    })
  )

  const exportToCSV = () => {
    try {
      // Preparar dados para CSV
      const csvData: string[] = []
      
      // Cabeçalho
      csvData.push('RELATÓRIO DE ATENDIMENTOS')
      csvData.push(`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} até ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`)
      csvData.push('')
      
      // Resumo
      csvData.push('RESUMO')
      csvData.push(`Total de Atendimentos,${atendimentos.length}`)
      csvData.push(`Receita Total,R$ ${financeiro?.total?.toFixed(2) || '0.00'}`)
      csvData.push(`Total de Pacientes,${pacientes.length}`)
      csvData.push(`Ticket Médio,R$ ${atendimentos.length > 0 ? ((financeiro?.total || 0) / atendimentos.length).toFixed(2) : '0.00'}`)
      csvData.push('')
      
      // Detalhamento de atendimentos
      csvData.push('DETALHAMENTO DE ATENDIMENTOS')
      csvData.push('Data/Hora,Paciente,Profissional,Especialidade,Valor,Status')
      
      atendimentos.forEach((atendimento: any) => {
        const dataHora = format(new Date(atendimento.dataHora), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        const paciente = atendimento.pacientes?.nome || atendimento.paciente?.nome || 'N/A'
        const profissional = atendimento.profissionais?.nomeCompleto || atendimento.profissionais?.nome || 'N/A'
        const especialidade = atendimento.profissionais?.especialidades?.nome || atendimento.profissionais?.especialidade?.nome || 'N/A'
        const valor = atendimento.valor?.toFixed(2) || '0.00'
        const status = atendimento.status || 'N/A'
        
        csvData.push(`"${dataHora}","${paciente}","${profissional}","${especialidade}",R$ ${valor},"${status}"`)
      })
      
      csvData.push('')
      
      // Atendimentos por profissional
      if (porProfissional && porProfissional.length > 0) {
        csvData.push('ATENDIMENTOS POR PROFISSIONAL')
        csvData.push('Profissional ID,Quantidade,Total Recebido')
        porProfissional.forEach((item: any) => {
          csvData.push(`${item.profissionalId},${item._count?.id || 0},R$ ${(item._sum?.valor || 0).toFixed(2)}`)
        })
      }
      
      // Criar arquivo CSV
      const csvContent = csvData.join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `relatorio_atendimentos_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: 'Sucesso',
        description: 'Relatório exportado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao exportar relatório',
        variant: 'destructive',
      })
    }
  }

  const exportToPDF = () => {
    try {
      // Criar conteúdo HTML para PDF
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast({
          title: 'Erro',
          description: 'Não foi possível abrir a janela de impressão',
          variant: 'destructive',
        })
        return
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Relatório de Atendimentos</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #333;
              }
              h1 {
                color: #2F60F7;
                border-bottom: 2px solid #2F60F7;
                padding-bottom: 10px;
              }
              h2 {
                color: #555;
                margin-top: 30px;
                margin-bottom: 15px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #2F60F7;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
              .summary {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin: 20px 0;
              }
              .summary-card {
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 5px;
                background-color: #f9f9f9;
              }
              .summary-label {
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
              }
              .summary-value {
                font-size: 24px;
                font-weight: bold;
                color: #2F60F7;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>RELATÓRIO DE ATENDIMENTOS</h1>
            <p><strong>Período:</strong> ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} até ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}</p>
            
            <div class="summary">
              <div class="summary-card">
                <div class="summary-label">Total de Atendimentos</div>
                <div class="summary-value">${atendimentos.length}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Receita Total</div>
                <div class="summary-value">R$ ${financeiro?.total?.toFixed(2) || '0.00'}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Total de Pacientes</div>
                <div class="summary-value">${pacientes.length}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Ticket Médio</div>
                <div class="summary-value">R$ ${atendimentos.length > 0 ? ((financeiro?.total || 0) / atendimentos.length).toFixed(2) : '0.00'}</div>
              </div>
            </div>

            <h2>Detalhamento de Atendimentos</h2>
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Paciente</th>
                  <th>Profissional</th>
                  <th>Especialidade</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${atendimentos.map((atendimento: any) => {
                  const dataHora = format(new Date(atendimento.dataHora), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                  const paciente = atendimento.pacientes?.nome || atendimento.paciente?.nome || 'N/A'
                  const profissional = atendimento.profissionais?.nomeCompleto || atendimento.profissionais?.nome || 'N/A'
                  const especialidade = atendimento.profissionais?.especialidades?.nome || atendimento.profissionais?.especialidade?.nome || 'N/A'
                  const valor = atendimento.valor?.toFixed(2) || '0.00'
                  const status = atendimento.status || 'N/A'
                  
                  return `
                    <tr>
                      <td>${dataHora}</td>
                      <td>${paciente}</td>
                      <td>${profissional}</td>
                      <td>${especialidade}</td>
                      <td>R$ ${valor}</td>
                      <td>${status}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>

            ${porProfissional && porProfissional.length > 0 ? `
              <h2>Atendimentos por Profissional</h2>
              <table>
                <thead>
                  <tr>
                    <th>Profissional ID</th>
                    <th>Quantidade</th>
                    <th>Total Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  ${porProfissional.map((item: any) => `
                    <tr>
                      <td>${item.profissionalId}</td>
                      <td>${item._count?.id || 0}</td>
                      <td>R$ ${(item._sum?.valor || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          </body>
        </html>
      `

      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Aguardar o conteúdo carregar antes de imprimir
      setTimeout(() => {
        printWindow.print()
      }, 250)
      
      toast({
        title: 'Sucesso',
        description: 'Relatório preparado para impressão/PDF',
      })
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao exportar relatório',
        variant: 'destructive',
      })
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Visualize relatórios e indicadores
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profissional">Profissional</Label>
                <Select value={profissionalId} onValueChange={setProfissionalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {/* Adicionar profissionais aqui quando tiver endpoint */}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadRelatorios} className="w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Atendimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{atendimentos.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Receita Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {financeiro?.total?.toFixed(2) || '0.00'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Pacientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pacientes.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Ticket Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R${' '}
                    {atendimentos.length > 0
                      ? (
                          (financeiro?.total || 0) / atendimentos.length
                        ).toFixed(2)
                      : '0.00'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Atendimentos por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={atendimentosPorDiaData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Atendimentos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={atendimentosPorStatusData}
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
                        {atendimentosPorStatusData.map((entry, index) => (
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
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pacientes.slice(0, 10).map((paciente: any) => (
                    <div
                      key={paciente.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="font-medium">{paciente.nome}</span>
                      <span className="text-muted-foreground">
                        {paciente._count?.consultas || 0} consultas
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}
