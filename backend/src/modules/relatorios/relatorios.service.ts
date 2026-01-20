import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  async getAtendimentos(inicio: Date, fim: Date, profissionalId?: string) {
    return this.prisma.consultas.findMany({
      where: {
        dataHora: {
          gte: inicio,
          lte: fim,
        },
        status: 'ATENDIDA',
        ...(profissionalId && { profissionalId }),
      },
      include: {
        pacientes: true,
        profissionais: true,
      },
      orderBy: {
        dataHora: 'desc',
      },
    });
  }

  async getFinanceiro(inicio: Date, fim: Date, profissionalId?: string) {
    const consultas = await this.prisma.consultas.findMany({
      where: {
        dataHora: {
          gte: inicio,
          lte: fim,
        },
        status: 'ATENDIDA',
        ...(profissionalId && { profissionalId }),
      },
      select: {
        valor: true,
        dataHora: true,
      },
    });

    const total = consultas.reduce((acc, c) => acc + (c.valor || 0), 0);

    return {
      consultas,
      total,
      quantidade: consultas.length,
    };
  }

  async getPacientes() {
    return this.prisma.pacientes.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            consultas: true,
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async getPorProfissional(inicio: Date, fim: Date) {
    return this.prisma.consultas.groupBy({
      by: ['profissionalId'],
      where: {
        dataHora: {
          gte: inicio,
          lte: fim,
        },
        status: 'ATENDIDA',
      },
      _count: {
        id: true,
      },
      _sum: {
        valor: true,
      },
    });
  }
}


