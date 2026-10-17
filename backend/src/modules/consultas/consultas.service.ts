import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { consultas_forma_pagamento, consultas_status } from '@prisma/client';
import { FinalizarConsultaDto } from './dto/finalizar-consulta.dto';

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

  async finalizarAtendimento(id: string, dto: FinalizarConsultaDto) {
    if (!dto?.formaPagamento) {
      throw new BadRequestException('Informe a forma de pagamento');
    }

    const formasValidas: consultas_forma_pagamento[] = [
      'PIX',
      'DINHEIRO',
      'DEBITO',
      'CREDITO',
      'TRANSFERENCIA',
      'CONVENIO',
    ];
    if (!formasValidas.includes(dto.formaPagamento)) {
      throw new BadRequestException('Forma de pagamento inválida');
    }

    const isConvenio = dto.formaPagamento === 'CONVENIO';
    if (isConvenio && !dto.nomeConvenio?.trim()) {
      throw new BadRequestException('Informe o nome do convênio');
    }

    return this.prisma.consultas.update({
      where: { id },
      data: {
        status: 'ATENDIDA',
        formaPagamento: dto.formaPagamento,
        porConvenio: isConvenio,
        nomeConvenio: isConvenio ? dto.nomeConvenio!.trim() : null,
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


