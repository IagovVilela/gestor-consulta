import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { UpdateProntuarioDto } from './dto/update-prontuario.dto';
import { CreateEvolucaoDto } from './dto/create-evolucao.dto';
import { CreatePrescricaoDto } from './dto/create-prescricao.dto';
import { CreateAnexoDto } from './dto/create-anexo.dto';
import * as crypto from 'crypto';

@Injectable()
export class ProntuarioService {
  constructor(private prisma: PrismaService) {}

  async findByConsulta(consultaId: string) {
    // Verificar se a consulta existe e tem status válido para prontuário
    const consulta = await this.prisma.consultas.findUnique({
      where: { id: consultaId },
      select: { status: true },
    });

    if (!consulta) {
      throw new NotFoundException('Consulta não encontrada');
    }

    // Verificar se a consulta pode ter prontuário
    // Apenas consultas CONFIRMADA, EM_ATENDIMENTO ou ATENDIDA podem ter prontuário
    const statusValidos = ['CONFIRMADA', 'EM_ATENDIMENTO', 'ATENDIDA'];
    if (!statusValidos.includes(consulta.status)) {
      throw new BadRequestException(
        `Consulta com status "${consulta.status}" não pode ter prontuário. ` +
        `Apenas consultas CONFIRMADA, EM_ATENDIMENTO ou ATENDIDA podem ter prontuário.`
      );
    }

    return this.prisma.prontuarios.findUnique({
      where: { consultaId },
      include: {
        consultas: {
          include: {
            pacientes: true,
            profissionais: {
              include: {
                especialidades: true,
              },
            },
          },
        },
        evolucoes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        prescricoes: true,
        anexos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async create(createDto: CreateProntuarioDto) {
    return this.prisma.prontuarios.create({
      data: {
        id: crypto.randomUUID(),
        ...createDto,
        updatedAt: new Date(),
      } as any,
      include: {
        consultas: {
          include: {
            pacientes: true,
          },
        },
      },
    });
  }

  async update(id: string, updateDto: UpdateProntuarioDto) {
    return this.prisma.prontuarios.update({
      where: { id },
      data: updateDto,
    });
  }

  async getHistoricoCompleto(pacienteId: string) {
    // Filtrar apenas consultas que podem ter prontuário:
    // - CONFIRMADA: consulta confirmada, pode ter prontuário preparado
    // - EM_ATENDIMENTO: consulta em andamento, deve ter prontuário
    // - ATENDIDA: consulta finalizada, deve ter prontuário
    // Não incluir: AGENDADA (ainda não aconteceu), CANCELADA, FALTA
    const consultas = await this.prisma.consultas.findMany({
      where: {
        pacienteId,
        status: {
          in: ['CONFIRMADA', 'EM_ATENDIMENTO', 'ATENDIDA'],
        },
        archived: false, // Não mostrar consultas arquivadas
      },
      include: {
        pacientes: true,
        profissionais: {
          include: {
            especialidades: true,
          },
        },
        prontuarios: {
          include: {
            evolucoes: {
              orderBy: {
                createdAt: 'desc',
              },
            },
            prescricoes: true,
          },
        },
      },
      orderBy: {
        dataHora: 'desc',
      },
    });

    return consultas;
  }

  async addEvolucao(prontuarioId: string, createDto: CreateEvolucaoDto) {
    return this.prisma.evolucoes.create({
      data: {
        id: crypto.randomUUID(),
        prontuarioId,
        ...createDto,
        updatedAt: new Date(),
      } as any,
    });
  }

  async addPrescricao(prontuarioId: string, createDto: CreatePrescricaoDto) {
    return this.prisma.prescricoes.create({
      data: {
        id: crypto.randomUUID(),
        prontuarioId,
        ...createDto,
        updatedAt: new Date(),
      } as any,
    });
  }

  async findOne(id: string) {
    return this.prisma.prontuarios.findUnique({
      where: { id },
      include: {
        consultas: {
          include: {
            pacientes: true,
            profissionais: {
              include: {
                especialidades: true,
              },
            },
          },
        },
        evolucoes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        prescricoes: true,
        anexos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async addAnexo(prontuarioId: string, createDto: CreateAnexoDto) {
    return this.prisma.anexos_prontuario.create({
      data: {
        id: crypto.randomUUID(),
        prontuarioId,
        ...createDto,
        updatedAt: new Date(),
      } as any,
    });
  }

  async getAnexos(prontuarioId: string) {
    return this.prisma.anexos_prontuario.findMany({
      where: { prontuarioId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async removeAnexo(id: string) {
    return this.prisma.anexos_prontuario.delete({
      where: { id },
    });
  }
}
