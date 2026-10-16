import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PortalTokenService, PortalTokenPayload } from './portal-token.service';
import { AgendarDto } from './dto/agendar.dto';
import { AcessarDto } from './dto/acessar.dto';
import { AlterarConsultaDto } from './dto/alterar-consulta.dto';
import * as crypto from 'crypto';

const STATUS_ABERTOS = ['AGENDADA', 'CONFIRMADA'] as const;
const STATUS_LIVRES = ['CANCELADA', 'FALTA'] as const;

interface Janela {
  inicio: string;
  fim: string;
  step: number;
}

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private tokens: PortalTokenService,
  ) {}

  async getClinica(slug: string) {
    const clinica = await this.findClinica(slug);
    const profissionais = await this.prisma.profissionais.findMany({
      where: { clinicaId: clinica.id, active: true },
      include: { especialidades: true },
      orderBy: { nomeCompleto: 'asc' },
    });

    return {
      nome: clinica.nome,
      telefone: clinica.telefone,
      endereco: clinica.endereco,
      logoUrl: clinica.logoUrl,
      corPrimaria: clinica.corPrimaria,
      corSecundaria: clinica.corSecundaria,
      profissionais: profissionais.map((profissional) => ({
        id: profissional.id,
        nome: profissional.nomeCompleto,
        crm: profissional.crm,
        especialidade: profissional.especialidades?.nome || null,
      })),
    };
  }

  async horarios(slug: string, profissionalId: string, data: string, ignoreConsultaId?: string) {
    const clinica = await this.findClinica(slug);
    await this.findProfissional(clinica.id, profissionalId);
    const dia = this.parseData(data);
    const slots = await this.slotsDisponiveis(profissionalId, dia, ignoreConsultaId);
    return { horarios: slots };
  }

  async agendar(slug: string, dto: AgendarDto) {
    const clinica = await this.findClinica(slug);
    const profissional = await this.findProfissional(clinica.id, dto.profissionalId);
    const quando = this.combinar(dto.data, dto.hora);
    await this.assertHorarioLivre(profissional.id, quando);

    const paciente = await this.resolverPaciente(clinica.id, dto, profissional.id);

    const consulta = await this.prisma.consultas.create({
      data: {
        id: crypto.randomUUID(),
        pacienteId: paciente.id,
        profissionalId: profissional.id,
        clinicaId: clinica.id,
        dataHora: quando,
        status: 'AGENDADA',
        observacoes: dto.observacoes?.trim() || null,
        porConvenio: false,
        updatedAt: new Date(),
      },
      include: {
        profissionais: { include: { especialidades: true } },
      },
    });

    return {
      token: this.tokens.sign(paciente.id, clinica.id),
      paciente: { nome: paciente.nome },
      consulta: this.toPublicConsulta(consulta),
    };
  }

  async acessar(slug: string, dto: AcessarDto) {
    const clinica = await this.findClinica(slug);
    const paciente = await this.findPacientePorCpf(dto.cpf);

    if (!paciente || !(await this.pacienteNaClinica(paciente.id, clinica.id, paciente.clinicaId))) {
      throw new NotFoundException('Não encontramos um cadastro com esses dados nesta clínica.');
    }

    this.assertNascimento(paciente.dataNascimento, dto.dataNascimento);

    if (!paciente.dataNascimento) {
      await this.prisma.pacientes.update({
        where: { id: paciente.id },
        data: {
          dataNascimento: this.parseDateOnly(dto.dataNascimento),
          updatedAt: new Date(),
        },
      });
    }

    const consultas = await this.listarConsultas(paciente.id, clinica.id);
    return {
      token: this.tokens.sign(paciente.id, clinica.id),
      paciente: { nome: paciente.nome },
      consultas,
    };
  }

  async minhasConsultas(slug: string, auth?: string) {
    const { clinica, pacienteId } = await this.sessao(slug, auth);
    const paciente = await this.prisma.pacientes.findUnique({ where: { id: pacienteId } });
    return {
      paciente: { nome: paciente?.nome || '' },
      consultas: await this.listarConsultas(pacienteId, clinica.id),
    };
  }

  async alterar(slug: string, consultaId: string, dto: AlterarConsultaDto, auth?: string) {
    const { clinica, pacienteId } = await this.sessao(slug, auth);
    const consulta = await this.consultaDoPaciente(consultaId, clinica.id, pacienteId);
    this.assertPodeAlterar(consulta.status, consulta.dataHora);

    const profissionalId = dto.profissionalId || consulta.profissionalId;
    await this.findProfissional(clinica.id, profissionalId);
    const quando = this.combinar(dto.data, dto.hora);
    await this.assertHorarioLivre(profissionalId, quando, consulta.id);

    const atualizada = await this.prisma.consultas.update({
      where: { id: consulta.id },
      data: {
        profissionalId,
        dataHora: quando,
        observacoes: dto.observacoes !== undefined ? dto.observacoes.trim() || null : consulta.observacoes,
        updatedAt: new Date(),
      },
      include: {
        profissionais: { include: { especialidades: true } },
      },
    });

    return this.toPublicConsulta(atualizada);
  }

  async cancelar(slug: string, consultaId: string, auth?: string) {
    const { clinica, pacienteId } = await this.sessao(slug, auth);
    const consulta = await this.consultaDoPaciente(consultaId, clinica.id, pacienteId);
    this.assertPodeAlterar(consulta.status, consulta.dataHora);

    const atualizada = await this.prisma.consultas.update({
      where: { id: consulta.id },
      data: { status: 'CANCELADA', updatedAt: new Date() },
      include: {
        profissionais: { include: { especialidades: true } },
      },
    });

    return this.toPublicConsulta(atualizada);
  }

  private async sessao(slug: string, auth?: string) {
    const clinica = await this.findClinica(slug);
    const payload = this.tokens.verify(auth);
    if (payload.clinicaId !== clinica.id) {
      throw new NotFoundException('Clínica não encontrada');
    }
    return { clinica, pacienteId: payload.pacienteId, payload: payload as PortalTokenPayload };
  }

  private async findClinica(slug: string) {
    const clinica = await this.prisma.clinicas.findFirst({
      where: { slug, active: true },
    });
    if (!clinica) {
      throw new NotFoundException('Clínica não encontrada');
    }
    return clinica;
  }

  private async findProfissional(clinicaId: string, profissionalId: string) {
    const profissional = await this.prisma.profissionais.findFirst({
      where: { id: profissionalId, clinicaId, active: true },
      include: { especialidades: true },
    });
    if (!profissional) {
      throw new BadRequestException('Profissional não disponível nesta clínica');
    }
    return profissional;
  }

  private async resolverPaciente(clinicaId: string, dto: AgendarDto, profissionalId: string) {
    const existente = await this.findPacientePorCpf(dto.cpf);

    if (!existente) {
      return this.prisma.pacientes.create({
        data: {
          id: crypto.randomUUID(),
          nome: dto.nome.trim(),
          cpf: dto.cpf,
          dataNascimento: this.parseDateOnly(dto.dataNascimento),
          telefone: dto.telefone.trim(),
          email: dto.email?.trim() || null,
          clinicaId,
          medicoPreferencialId: profissionalId,
          updatedAt: new Date(),
        },
      });
    }

    if (existente.clinicaId && existente.clinicaId !== clinicaId) {
      throw new BadRequestException('Este CPF já está cadastrado em outra clínica. Procure a recepção.');
    }

    this.assertNascimento(existente.dataNascimento, dto.dataNascimento);

    return this.prisma.pacientes.update({
      where: { id: existente.id },
      data: {
        clinicaId,
        telefone: dto.telefone.trim(),
        email: dto.email?.trim() || existente.email,
        dataNascimento: existente.dataNascimento || this.parseDateOnly(dto.dataNascimento),
        medicoPreferencialId: existente.medicoPreferencialId || profissionalId,
        updatedAt: new Date(),
      },
    });
  }

  private async findPacientePorCpf(cpf: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM pacientes
      WHERE cpf IS NOT NULL
        AND REPLACE(REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), '/', ''), ' ', '') = ${cpf}
      LIMIT 1
    `;
    if (!rows.length) return null;
    return this.prisma.pacientes.findUnique({ where: { id: rows[0].id } });
  }

  private async pacienteNaClinica(pacienteId: string, clinicaId: string, pacienteClinicaId: string | null) {
    if (pacienteClinicaId === clinicaId) return true;
    const consulta = await this.prisma.consultas.findFirst({
      where: { pacienteId, clinicaId },
      select: { id: true },
    });
    return !!consulta;
  }

  private assertNascimento(stored: Date | null, input: string) {
    if (!stored) return;
    const iso = stored.toISOString().slice(0, 10);
    const local = this.formatData(stored);
    if (iso !== input && local !== input) {
      throw new BadRequestException('Data de nascimento não confere com o cadastro.');
    }
  }

  private async listarConsultas(pacienteId: string, clinicaId: string) {
    const consultas = await this.prisma.consultas.findMany({
      where: { pacienteId, clinicaId, archived: false },
      include: { profissionais: { include: { especialidades: true } } },
      orderBy: { dataHora: 'desc' },
    });
    return consultas.map((consulta) => this.toPublicConsulta(consulta));
  }

  private async consultaDoPaciente(id: string, clinicaId: string, pacienteId: string) {
    const consulta = await this.prisma.consultas.findFirst({
      where: { id, clinicaId, pacienteId },
    });
    if (!consulta) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return consulta;
  }

  private assertPodeAlterar(status: string, dataHora: Date) {
    const aberta = STATUS_ABERTOS.includes(status as (typeof STATUS_ABERTOS)[number]);
    if (!aberta || dataHora.getTime() <= Date.now()) {
      throw new BadRequestException('Este agendamento não pode mais ser alterado ou cancelado.');
    }
  }

  private async assertHorarioLivre(profissionalId: string, quando: Date, ignoreConsultaId?: string) {
    if (quando.getTime() <= Date.now()) {
      throw new BadRequestException('Escolha um horário futuro');
    }

    const slots = await this.slotsDisponiveis(profissionalId, quando, ignoreConsultaId);
    const hora = this.formatHora(quando);
    if (!slots.includes(hora)) {
      throw new BadRequestException('Horário indisponível');
    }
  }

  private async slotsDisponiveis(profissionalId: string, dia: Date, ignoreConsultaId?: string) {
    const inicio = new Date(dia);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dia);
    fim.setHours(23, 59, 59, 999);

    const agendas = await this.prisma.agendas.findMany({
      where: { profissionalId, active: true, diaSemana: dia.getDay() },
    });

    const janelas: Janela[] = agendas.length
      ? agendas.map((agenda) => ({
          inicio: agenda.horaInicio,
          fim: agenda.horaFim,
          step: agenda.duracaoConsulta || 30,
        }))
      : this.janelasPadrao(dia);

    const step = janelas[0]?.step || 30;
    const consultas = await this.prisma.consultas.findMany({
      where: {
        profissionalId,
        dataHora: { gte: inicio, lte: fim },
        status: { notIn: [...STATUS_LIVRES] },
        ...(ignoreConsultaId ? { id: { not: ignoreConsultaId } } : {}),
      },
    });

    const slots: string[] = [];
    for (const janela of janelas) {
      let cursor = this.minutos(janela.inicio);
      const limite = this.minutos(janela.fim);
      const intervalo = janela.step > 0 ? janela.step : 30;
      while (cursor + intervalo <= limite) {
        const hora = this.horaFromMinutos(cursor);
        const quando = this.combinar(this.formatData(dia), hora);
        const ocupado = consultas.some((consulta) => {
          const ini = consulta.dataHora.getTime();
          const end = ini + step * 60 * 1000;
          const slotEnd = quando.getTime() + intervalo * 60 * 1000;
          return quando.getTime() < end && slotEnd > ini;
        });
        if (!ocupado && quando.getTime() > Date.now()) {
          slots.push(hora);
        }
        cursor += intervalo;
      }
    }

    return slots;
  }

  private janelasPadrao(dia: Date): Janela[] {
    const semana = dia.getDay();
    if (semana === 0) return [];
    if (semana === 6) return [{ inicio: '08:00', fim: '12:00', step: 30 }];
    return [{ inicio: '08:00', fim: '18:00', step: 30 }];
  }

  private toPublicConsulta(consulta: {
    id: string;
    dataHora: Date;
    status: string;
    observacoes: string | null;
    profissionalId: string;
    profissionais?: { nomeCompleto: string; especialidades?: { nome: string } | null } | null;
  }) {
    const podeAlterar =
      STATUS_ABERTOS.includes(consulta.status as (typeof STATUS_ABERTOS)[number]) &&
      consulta.dataHora.getTime() > Date.now();

    return {
      id: consulta.id,
      dataHora: consulta.dataHora,
      status: consulta.status,
      observacoes: consulta.observacoes,
      profissionalId: consulta.profissionalId,
      profissional: consulta.profissionais?.nomeCompleto || '',
      especialidade: consulta.profissionais?.especialidades?.nome || null,
      podeAlterar,
    };
  }

  private parseData(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Data inválida');
    }
    return this.combinar(value, '00:00');
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private combinar(data: string, hora: string): Date {
    const [year, month, day] = data.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  private formatData(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private formatHora(date: Date): string {
    return this.horaFromMinutos(date.getHours() * 60 + date.getMinutes());
  }

  private minutos(hora: string): number {
    const [hours, minutes] = hora.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private horaFromMinutos(total: number): string {
    const hours = String(Math.floor(total / 60)).padStart(2, '0');
    const minutes = String(total % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
