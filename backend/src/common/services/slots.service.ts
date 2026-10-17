import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  gerarSlots,
  intersectListas,
  janelasPadrao,
  JanelaExpediente,
} from '../utils/expediente';

const STATUS_LIVRES = ['CANCELADA', 'FALTA'] as const;

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  async disponiveis(
    clinicaId: string,
    profissionalId: string,
    dia: Date,
    ignoreConsultaId?: string,
  ): Promise<string[]> {
    const inicio = new Date(dia);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dia);
    fim.setHours(23, 59, 59, 999);
    const diaSemana = dia.getDay();

    const [expedienteClinica, agendasProf, totalExpedienteClinica] =
      await Promise.all([
        this.prisma.clinica_expedientes.findMany({
          where: { clinicaId, active: true, diaSemana },
        }),
        this.prisma.agendas.findMany({
          where: { profissionalId, active: true, diaSemana },
        }),
        this.prisma.clinica_expedientes.count({
          where: { clinicaId, active: true },
        }),
      ]);

    const janelasClinica: JanelaExpediente[] = expedienteClinica.length
      ? expedienteClinica.map((item) => ({
          inicio: item.horaInicio,
          fim: item.horaFim,
          step: item.duracaoConsulta || 30,
        }))
      : totalExpedienteClinica > 0
        ? []
        : janelasPadrao(diaSemana);

    const janelasProf: JanelaExpediente[] = agendasProf.map((agenda) => ({
      inicio: agenda.horaInicio,
      fim: agenda.horaFim,
      step: agenda.duracaoConsulta || 30,
    }));

    const janelas = intersectListas(janelasClinica, janelasProf);
    const step = janelas[0]?.step || 30;

    const consultas = await this.prisma.consultas.findMany({
      where: {
        profissionalId,
        dataHora: { gte: inicio, lte: fim },
        status: { notIn: [...STATUS_LIVRES] },
        ...(ignoreConsultaId ? { id: { not: ignoreConsultaId } } : {}),
      },
    });

    const ocupados = consultas.map((consulta) => ({
      inicio: consulta.dataHora.getTime(),
      fim: consulta.dataHora.getTime() + step * 60 * 1000,
    }));

    return gerarSlots(janelas, dia, ocupados);
  }

  async assertHorarioLivre(
    clinicaId: string,
    profissionalId: string,
    quando: Date,
    ignoreConsultaId?: string,
  ) {
    if (quando.getTime() <= Date.now()) {
      throw new BadRequestException('Escolha um horário futuro');
    }

    const slots = await this.disponiveis(
      clinicaId,
      profissionalId,
      quando,
      ignoreConsultaId,
    );
    const hora = this.formatHora(quando);
    if (!slots.includes(hora)) {
      throw new BadRequestException(
        'Horário fora do expediente da clínica/profissional ou já ocupado',
      );
    }
  }

  private formatHora(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
