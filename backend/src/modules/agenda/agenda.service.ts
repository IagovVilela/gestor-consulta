import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SlotsService } from '../../common/services/slots.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import * as crypto from 'crypto';

@Injectable()
export class AgendaService {
  constructor(
    private prisma: PrismaService,
    private slots: SlotsService,
  ) {}

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
    const dataHora = new Date(createDto.dataHora);
    const clinicaId = await this.resolveClinicaId(
      createDto.clinicaId,
      createDto.profissionalId,
    );

    await this.slots.assertHorarioLivre(
      clinicaId,
      createDto.profissionalId,
      dataHora,
    );

    return this.prisma.consultas.create({
      data: {
        id: crypto.randomUUID(),
        ...createDto,
        clinicaId,
        dataHora,
        nomeConvenio: createDto.porConvenio ? createDto.nomeConvenio : null,
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
    const consulta = await this.prisma.consultas.findUnique({
      where: { id },
    });
    if (!consulta) {
      throw new BadRequestException('Consulta não encontrada');
    }

    await this.slots.assertHorarioLivre(
      consulta.clinicaId,
      consulta.profissionalId,
      novaDataHora,
      id,
    );

    return this.prisma.consultas.update({
      where: { id },
      data: { dataHora: novaDataHora },
    });
  }

  async getHorarios(profissionalId: string, data: string, clinicaId?: string) {
    if (!profissionalId || !data) {
      throw new BadRequestException('profissionalId e data são obrigatórios');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new BadRequestException('Data inválida. Use YYYY-MM-DD');
    }

    const resolvedClinicaId = await this.resolveClinicaId(
      clinicaId,
      profissionalId,
    );
    const [year, month, day] = data.split('-').map(Number);
    const dia = new Date(year, month - 1, day, 0, 0, 0, 0);
    const horarios = await this.slots.disponiveis(
      resolvedClinicaId,
      profissionalId,
      dia,
    );
    return { horarios };
  }

  /** @deprecated use getHorarios — mantido para compatibilidade */
  async getDisponibilidade(profissionalId: string, data: Date) {
    const profissional = await this.prisma.profissionais.findUnique({
      where: { id: profissionalId },
      select: { clinicaId: true },
    });
    if (!profissional) {
      throw new BadRequestException('Profissional inválido');
    }
    return this.slots.disponiveis(
      profissional.clinicaId,
      profissionalId,
      data,
    );
  }

  private async resolveClinicaId(
    clinicaId: string | undefined,
    profissionalId: string,
  ) {
    if (clinicaId) return clinicaId;
    const profissional = await this.prisma.profissionais.findUnique({
      where: { id: profissionalId },
      select: { clinicaId: true },
    });
    if (!profissional?.clinicaId) {
      throw new BadRequestException('Clínica do profissional não encontrada');
    }
    return profissional.clinicaId;
  }
}


