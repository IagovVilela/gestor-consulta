import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import * as crypto from 'crypto';

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    dataInicio?: Date;
    dataFim?: Date;
    profissionalId?: string;
    status?: string;
    clinicaId?: string;
  }) {
    console.log('📅 AgendaService.findAll - Filtros recebidos:', {
      dataInicio: filters.dataInicio?.toISOString(),
      dataFim: filters.dataFim?.toISOString(),
      profissionalId: filters.profissionalId,
      status: filters.status,
      clinicaId: filters.clinicaId,
    });

    const where: any = {};

    // Filtrar por data - ajustar para incluir todo o dia final
    if (filters.dataInicio && filters.dataFim) {
      const dataInicio = new Date(filters.dataInicio);
      dataInicio.setHours(0, 0, 0, 0);
      
      const dataFim = new Date(filters.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      
      where.dataHora = {
        gte: dataInicio,
        lte: dataFim,
      };
    }

    // Filtrar por profissional
    if (filters.profissionalId) {
      where.profissionalId = filters.profissionalId;
    }

    // Filtrar por status
    if (filters.status) {
      where.status = filters.status as any;
    }

    // Filtrar por clínica
    if (filters.clinicaId) {
      where.clinicaId = filters.clinicaId;
    }

    console.log('📅 AgendaService.findAll - Where clause:', JSON.stringify(where, null, 2));

    const consultas = await this.prisma.consultas.findMany({
      where,
      include: {
        pacientes: true,
        profissionais: {
          include: {
            especialidades: true,
          },
        },
      },
      orderBy: {
        dataHora: 'asc',
      },
    });

    console.log(`✅ AgendaService.findAll - Retornando ${consultas.length} consulta(s)`);
    consultas.forEach((c, index) => {
      console.log(`  ${index + 1}. ${c.pacientes?.nome || 'Sem paciente'} - ${c.dataHora.toISOString()} - Clínica: ${c.clinicaId}`);
    });

    return consultas;
  }

  async create(createDto: CreateAgendaDto) {
    // Verificar conflito de horário
    const conflito = await this.prisma.consultas.findFirst({
      where: {
        profissionalId: createDto.profissionalId,
        dataHora: createDto.dataHora,
        status: {
          notIn: ['CANCELADA', 'FALTA'],
        },
      },
    });

    if (conflito) {
      throw new BadRequestException('Horário já está ocupado');
    }

    return this.prisma.consultas.create({
      data: {
        id: crypto.randomUUID(),
        ...createDto,
        dataHora: new Date(createDto.dataHora),
        // Se não for por convênio, garantir que nomeConvenio seja null
        nomeConvenio: createDto.porConvenio ? createDto.nomeConvenio : null,
        // Se for por convênio, garantir que valor seja 0
        valor: createDto.porConvenio ? 0 : createDto.valor,
        updatedAt: new Date(),
      } as any,
      include: {
        pacientes: true,
        profissionais: true,
      },
    });
  }

  async update(id: string, updateDto: UpdateAgendaDto) {
    return this.prisma.consultas.update({
      where: { id },
      data: updateDto,
      include: {
        pacientes: true,
        profissionais: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.consultas.update({
      where: { id },
      data: { status: 'CANCELADA' },
    });
  }

  async confirmar(id: string) {
    return this.prisma.consultas.update({
      where: { id },
      data: { status: 'CONFIRMADA' },
    });
  }

  async reagendar(id: string, novaDataHora: Date) {
    // Verificar conflito
    const consulta = await this.prisma.consultas.findUnique({
      where: { id },
    });

    const conflito = await this.prisma.consultas.findFirst({
      where: {
        profissionalId: consulta.profissionalId,
        dataHora: novaDataHora,
        id: { not: id },
        status: {
          notIn: ['CANCELADA', 'FALTA'],
        },
      },
    });

    if (conflito) {
      throw new BadRequestException('Horário já está ocupado');
    }

    return this.prisma.consultas.update({
      where: { id },
      data: { dataHora: novaDataHora },
    });
  }

  async getDisponibilidade(profissionalId: string, data: Date) {
    const inicio = new Date(data);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(data);
    fim.setHours(23, 59, 59, 999);

    const consultas = await this.prisma.consultas.findMany({
      where: {
        profissionalId,
        dataHora: {
          gte: inicio,
          lte: fim,
        },
        status: {
          notIn: ['CANCELADA', 'FALTA'],
        },
      },
    });

    // Retornar horários ocupados
    return consultas.map((c) => c.dataHora);
  }
}


