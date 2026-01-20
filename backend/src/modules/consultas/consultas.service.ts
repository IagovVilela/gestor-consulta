import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { consultas_status } from '@prisma/client';

@Injectable()
export class ConsultasService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    status?: consultas_status;
    profissionalId?: string;
    pacienteId?: string;
    clinicaId?: string;
    includeArchived?: boolean;
  }) {
    const where: any = {
      archived: filters.includeArchived ? undefined : false, // Por padrão, não mostrar arquivadas
      ...(filters.status && { status: filters.status }),
      ...(filters.profissionalId && {
        profissionalId: filters.profissionalId,
      }),
      ...(filters.pacienteId && { pacienteId: filters.pacienteId }),
      ...(filters.clinicaId && { clinicaId: filters.clinicaId }),
    };

    return this.prisma.consultas.findMany({
      where,
      include: {
        pacientes: true,
        profissionais: {
          include: {
            especialidades: true,
          },
        },
        prontuarios: true,
      },
      orderBy: {
        dataHora: 'desc',
      },
    });
  }

  async findOne(id: string, clinicaId?: string) {
    const where: any = { id };
    
    // Se fornecido clinicaId, garantir que a consulta pertence à clínica
    if (clinicaId) {
      where.clinicaId = clinicaId;
    }

    return this.prisma.consultas.findFirst({
      where,
      include: {
        pacientes: true,
        profissionais: {
          include: {
            especialidades: true,
          },
        },
        prontuarios: {
          include: {
            evolucoes: true,
            prescricoes: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: consultas_status) {
    return this.prisma.consultas.update({
      where: { id },
      data: { status },
    });
  }

  async iniciarAtendimento(id: string) {
    return this.prisma.consultas.update({
      where: { id },
      data: { status: 'EM_ATENDIMENTO' },
    });
  }

  async finalizarAtendimento(id: string) {
    return this.prisma.consultas.update({
      where: { id },
      data: { 
        status: 'ATENDIDA',
        updatedAt: new Date(),
      },
    });
  }

  async arquivar(id: string) {
    return this.prisma.consultas.update({
      where: { id },
      data: {
        archived: true,
        updatedAt: new Date(),
      },
    });
  }

  async desarquivar(id: string) {
    return this.prisma.consultas.update({
      where: { id },
      data: {
        archived: false,
        updatedAt: new Date(),
      },
    });
  }
}


