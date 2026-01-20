import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(userId: string, role: string, clinicaId?: string) {
    console.log('📊 DashboardService.getMetrics - Parâmetros:', {
      userId,
      role,
      clinicaId,
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Construir filtro baseado em role e clinicaId
    const buildWhere = async (additionalFilters: any = {}) => {
      const where: any = {
        ...additionalFilters,
      };

      // Se especificou clinicaId, filtrar por ele
      if (clinicaId) {
        where.clinicaId = clinicaId;
        console.log('📊 DashboardService.getMetrics - Filtrando por clinicaId:', clinicaId);
      } else if (role !== 'ADMIN') {
        // Se não é ADMIN e não especificou clinicaId
        if (role === 'MEDICO') {
          // Para médicos, tentar filtrar por profissional primeiro
          // Se não encontrar profissional, usar clinicaId como fallback
          const profissional = await this.prisma.profissionais.findFirst({
            where: { userId: userId },
            select: { clinicaId: true },
          });
          
          if (profissional?.clinicaId) {
            where.clinicaId = profissional.clinicaId;
            console.log('📊 DashboardService.getMetrics - MEDICO: Filtrando por clinicaId do profissional:', profissional.clinicaId);
          } else {
            // Fallback: buscar clinicaId do usuário
            const user = await this.prisma.users.findUnique({
              where: { id: userId },
              select: { clinicaId: true },
            });
            if (user?.clinicaId) {
              where.clinicaId = user.clinicaId;
              console.log('📊 DashboardService.getMetrics - MEDICO: Filtrando por clinicaId do usuário:', user.clinicaId);
            } else {
              console.error('❌ DashboardService.getMetrics - MEDICO sem clinicaId!');
            }
          }
        } else if (role === 'SECRETARIA') {
          // Para secretárias, o clinicaId já deve vir do controller
          // Se chegou aqui sem clinicaId, buscar do usuário
          console.warn('⚠️ DashboardService.getMetrics - SECRETARIA sem clinicaId, buscando do usuário');
        }
      }

      return where;
    };

    // Construir filtro baseado em role e clinicaId
    const baseWhere = await buildWhere();

    // Consultas do dia
    const consultasHoje = await this.prisma.consultas.count({
      where: {
        dataHora: {
          gte: hoje,
          lt: amanha,
        },
        ...baseWhere,
      },
    });

    // Atendimentos no mês
    const atendimentosMes = await this.prisma.consultas.count({
      where: {
        status: 'ATENDIDA',
        dataHora: {
          gte: inicioMes,
          lte: fimMes,
        },
        ...baseWhere,
      },
    });

    // Faltas e cancelamentos
    const faltasCancelamentos = await this.prisma.consultas.count({
      where: {
        status: {
          in: ['FALTA', 'CANCELADA'],
        },
        dataHora: {
          gte: inicioMes,
          lte: fimMes,
        },
        ...baseWhere,
      },
    });

    // Taxa de ocupação (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const consultasAgendadas = await this.prisma.consultas.count({
      where: {
        dataHora: {
          gte: trintaDiasAtras,
        },
        ...baseWhere,
      },
    });

    const consultasAtendidas = await this.prisma.consultas.count({
      where: {
        status: 'ATENDIDA',
        dataHora: {
          gte: trintaDiasAtras,
        },
        ...baseWhere,
      },
    });

    const taxaOcupacao =
      consultasAgendadas > 0
        ? (consultasAtendidas / consultasAgendadas) * 100
        : 0;

    return {
      consultasHoje,
      atendimentosMes,
      faltasCancelamentos,
      taxaOcupacao: Math.round(taxaOcupacao * 100) / 100,
    };
  }

  async getConsultasHoje(userId: string, role: string, clinicaId?: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const where: any = {
      dataHora: {
        gte: hoje,
        lt: amanha,
      },
    };

    // Se especificou clinicaId, filtrar por ele
    if (clinicaId) {
      where.clinicaId = clinicaId;
      console.log('📊 DashboardService.getConsultasHoje - Filtrando por clinicaId:', clinicaId);
    } else if (role !== 'ADMIN') {
      // Se não é ADMIN e não especificou clinicaId
      if (role === 'MEDICO') {
        // Para médicos, tentar filtrar por profissional primeiro
        // Se não encontrar profissional, usar clinicaId como fallback
        const profissional = await this.prisma.profissionais.findFirst({
          where: { userId: userId },
          select: { clinicaId: true },
        });
        
        if (profissional?.clinicaId) {
          where.clinicaId = profissional.clinicaId;
          console.log('📊 DashboardService.getConsultasHoje - MEDICO: Filtrando por clinicaId do profissional:', profissional.clinicaId);
        } else {
          // Fallback: buscar clinicaId do usuário
          const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: { clinicaId: true },
          });
          if (user?.clinicaId) {
            where.clinicaId = user.clinicaId;
            console.log('📊 DashboardService.getConsultasHoje - MEDICO: Filtrando por clinicaId do usuário:', user.clinicaId);
          } else {
            console.error('❌ DashboardService.getConsultasHoje - MEDICO sem clinicaId!');
          }
        }
      } else if (role === 'SECRETARIA') {
        // Para secretárias, buscar o clinicaId do usuário
        console.warn('⚠️ DashboardService.getConsultasHoje - SECRETARIA sem clinicaId, buscando do usuário');
        const user = await this.prisma.users.findUnique({
          where: { id: userId },
          select: { clinicaId: true },
        });
        if (user?.clinicaId) {
          where.clinicaId = user.clinicaId;
          console.log('📊 DashboardService.getConsultasHoje - ClinicaId encontrado para SECRETARIA:', user.clinicaId);
        } else {
          console.error('❌ DashboardService.getConsultasHoje - SECRETARIA sem clinicaId no banco!');
        }
      }
    }

    console.log('📊 DashboardService.getConsultasHoje - Filtros:', {
      userId,
      role,
      clinicaId,
      where,
    });

    const consultas = await this.prisma.consultas.findMany({
      where,
      include: {
        pacientes: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        },
        profissionais: {
          select: {
            id: true,
            nomeCompleto: true,
            especialidades: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataHora: 'asc',
      },
    });

    console.log(`📊 DashboardService.getConsultasHoje - Retornando ${consultas.length} consulta(s)`);
    consultas.forEach((c: any, i: number) => {
      console.log(`  ${i + 1}. Consulta ID: ${c.id}, Paciente: ${c.pacientes?.nome || 'N/A'}, Profissional: ${c.profissionais?.nomeCompleto || 'N/A'}`);
    });

    return consultas;
  }

  async getAtendimentosPorPeriodo(
    userId: string,
    role: string,
    inicio: Date,
    fim: Date,
  ) {
    return this.prisma.consultas.groupBy({
      by: ['status'],
      where: {
        dataHora: {
          gte: inicio,
          lte: fim,
        },
        ...(role !== 'ADMIN' && {
          profissionais: {
            userId: userId,
          },
        }),
      },
      _count: {
        id: true,
      },
    });
  }
}


