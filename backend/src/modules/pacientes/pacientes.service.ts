import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import * as crypto from 'crypto';

@Injectable()
export class PacientesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    clinicaId?: string,
  ) {
    const skip = (page - 1) * limit;

    const baseWhere: any = { active: true };
    
    // Filtrar por clínica se fornecido
    if (clinicaId) {
      baseWhere.clinicaId = clinicaId;
    }

    const where = search
      ? {
          ...baseWhere,
          OR: [
            { nome: { contains: search } },
            { cpf: { contains: search } },
            { email: { contains: search } },
            { telefone: { contains: search } },
          ],
        }
      : baseWhere;

    const [data, total] = await Promise.all([
      this.prisma.pacientes.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.pacientes.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, clinicaId?: string) {
    const where: any = { id };
    
    // Se fornecido clinicaId, garantir que o paciente pertence à clínica
    if (clinicaId) {
      where.clinicaId = clinicaId;
    }

    return this.prisma.pacientes.findFirst({
      where,
      include: {
        clinica: true,
        medicoPreferencial: {
          include: {
            especialidades: true,
          },
        },
        consultas: {
          include: {
            profissionais: {
              include: {
                especialidades: true,
              },
            },
          },
          orderBy: {
            dataHora: 'desc',
          },
        },
        documentos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async create(createDto: CreatePacienteDto, clinicaId?: string) {
    return this.prisma.pacientes.create({
      data: {
        id: crypto.randomUUID(),
        ...createDto,
        // Usar clinicaId do DTO ou do parâmetro
        clinicaId: createDto.clinicaId || clinicaId || '',
        // Converter dataNascimento para DateTime se fornecido
        dataNascimento: createDto.dataNascimento
          ? new Date(createDto.dataNascimento)
          : undefined,
        // Adicionar updatedAt (obrigatório no schema)
        updatedAt: new Date(),
      } as any,
    });
  }

  async update(id: string, updateDto: UpdatePacienteDto) {
    return this.prisma.pacientes.update({
      where: { id },
      data: {
        ...updateDto,
        // Converter dataNascimento para DateTime se fornecido
        dataNascimento: updateDto.dataNascimento
          ? new Date(updateDto.dataNascimento)
          : undefined,
        // Atualizar updatedAt
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.pacientes.update({
      where: { id },
      data: { active: false },
    });
  }

  async getHistorico(id: string, clinicaId?: string) {
    const where: any = { pacienteId: id };
    
    // Filtrar por clínica se fornecido
    if (clinicaId) {
      where.clinicaId = clinicaId;
    }

    return this.prisma.consultas.findMany({
      where,
      include: {
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

  async getDocumentos(id: string) {
    return this.prisma.documentos.findMany({
      where: { pacienteId: id },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

