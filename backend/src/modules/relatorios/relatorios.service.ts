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
        formaPagamento: true,
        porConvenio: true,
        nomeConvenio: true,
      },
    });

    const total = consultas.reduce((acc, c) => acc + (c.valor || 0), 0);

    return {
      consultas,
      total,
      quantidade: consultas.length,
    };
  }

  async getPagamentos(inicio: Date, fim: Date, profissionalId?: string) {
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
        formaPagamento: true,
        valor: true,
        nomeConvenio: true,
      },
    });

    const mapa = new Map<
      string,
      { formaPagamento: string; quantidade: number; total: number }
    >();

    for (const c of consultas) {
      const key = c.formaPagamento || 'NAO_INFORMADO';
      const atual = mapa.get(key) || {
        formaPagamento: key,
        quantidade: 0,
        total: 0,
      };
      atual.quantidade += 1;
      atual.total += c.valor || 0;
      mapa.set(key, atual);
    }

    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade);
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


