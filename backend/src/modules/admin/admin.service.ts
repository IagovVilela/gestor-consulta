import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service';
import { UpdateClinicaAdminDto } from './dto/update-clinica-admin.dto';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configuracoesService: ConfiguracoesService,
  ) {}

  async ensureDefaultPlanos() {
    const defaults = [
      {
        nome: 'Básico',
        descricao: 'Ideal para clínicas pequenas',
        precoMensal: 149,
        maxMedicos: 3,
        maxSecretarias: 5,
        maxConsultasMes: 300,
        portalAtivo: true,
      },
      {
        nome: 'Pro',
        descricao: 'Para clínicas em crescimento',
        precoMensal: 299,
        maxMedicos: 10,
        maxSecretarias: 20,
        maxConsultasMes: 1500,
        portalAtivo: true,
      },
      {
        nome: 'Enterprise',
        descricao: 'Sem limites práticos para redes',
        precoMensal: 599,
        maxMedicos: 100,
        maxSecretarias: 200,
        maxConsultasMes: 20000,
        portalAtivo: true,
      },
    ];

    for (const plano of defaults) {
      const existing = await this.prisma.planos.findUnique({ where: { nome: plano.nome } });
      if (!existing) {
        await this.prisma.planos.create({
          data: {
            id: crypto.randomUUID(),
            ...plano,
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  async getMetrics() {
    await this.ensureDefaultPlanos();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const seteDias = new Date(hoje);
    seteDias.setDate(seteDias.getDate() - 6);

    const [
      clinicasTotal,
      clinicasAtivas,
      clinicasTrial,
      clinicasSuspensas,
      clinicasCanceladas,
      clinicasNovasMes,
      consultasHoje,
      consultas7d,
      consultasMes,
      usuariosAtivos,
      profissionaisAtivos,
      pacientesTotal,
    ] = await Promise.all([
      this.prisma.clinicas.count({ where: { active: true } }),
      this.prisma.clinicas.count({ where: { active: true, statusPlataforma: 'ATIVA' } }),
      this.prisma.clinicas.count({ where: { active: true, statusPlataforma: 'TRIAL' } }),
      this.prisma.clinicas.count({ where: { active: true, statusPlataforma: 'SUSPENSA' } }),
      this.prisma.clinicas.count({ where: { active: true, statusPlataforma: 'CANCELADA' } }),
      this.prisma.clinicas.count({
        where: { active: true, createdAt: { gte: inicioMes } },
      }),
      this.prisma.consultas.count({
        where: { dataHora: { gte: hoje, lt: amanha }, archived: false },
      }),
      this.prisma.consultas.count({
        where: { dataHora: { gte: seteDias }, archived: false },
      }),
      this.prisma.consultas.count({
        where: { dataHora: { gte: inicioMes }, archived: false },
      }),
      this.prisma.users.count({ where: { active: true, role: { not: 'ADMIN' } } }),
      this.prisma.profissionais.count({ where: { active: true } }),
      this.prisma.pacientes.count({ where: { active: true } }),
    ]);

    const clinicasRecentes = await this.prisma.clinicas.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        plano: { select: { id: true, nome: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { users: true, profissionais: true, pacientes: true, consultas: true } },
      },
    });

    return {
      clinicas: {
        total: clinicasTotal,
        ativas: clinicasAtivas,
        trial: clinicasTrial,
        suspensas: clinicasSuspensas,
        canceladas: clinicasCanceladas,
        novasMes: clinicasNovasMes,
      },
      consultas: {
        hoje: consultasHoje,
        seteDias: consultas7d,
        mes: consultasMes,
      },
      equipe: {
        usuarios: usuariosAtivos,
        profissionais: profissionaisAtivos,
        pacientes: pacientesTotal,
      },
      clinicasRecentes: clinicasRecentes.map((c) => this.serializeClinica(c)),
    };
  }

  async listPlanos() {
    await this.ensureDefaultPlanos();
    return this.prisma.planos.findMany({
      where: { active: true },
      orderBy: { precoMensal: 'asc' },
    });
  }

  async listClinicas(search?: string, status?: string) {
    await this.ensureDefaultPlanos();

    const where: any = { active: true };
    if (status && status !== 'all') {
      where.statusPlataforma = status;
    }
    if (search?.trim()) {
      where.OR = [
        { nome: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { cnpj: { contains: search.trim() } },
        { slug: { contains: search.trim() } },
      ];
    }

    const clinicas = await this.prisma.clinicas.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: {
        plano: true,
        owner: { select: { id: true, name: true, email: true, role: true } },
        _count: {
          select: {
            users: true,
            profissionais: true,
            pacientes: true,
            consultas: true,
          },
        },
      },
    });

    for (const clinica of clinicas) {
      if (!clinica.slug) {
        clinica.slug = await this.configuracoesService.ensureClinicSlug(clinica.id);
      }
      if (!clinica.planoId) {
        const basico = await this.prisma.planos.findUnique({ where: { nome: 'Básico' } });
        if (basico) {
          await this.prisma.clinicas.update({
            where: { id: clinica.id },
            data: {
              planoId: basico.id,
              trialAte: clinica.trialAte || this.addDays(new Date(), 14),
            },
          });
          clinica.planoId = basico.id;
          clinica.plano = basico;
          if (!clinica.trialAte) clinica.trialAte = this.addDays(new Date(), 14);
        }
      }
    }

    return clinicas.map((c) => this.serializeClinica(c));
  }

  async getClinica(id: string) {
    const clinica = await this.prisma.clinicas.findFirst({
      where: { id, active: true },
      include: {
        plano: true,
        owner: { select: { id: true, name: true, email: true, role: true } },
        users: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
          orderBy: { name: 'asc' },
        },
        profissionais: {
          where: { active: true },
          include: { especialidades: true },
          orderBy: { nomeCompleto: 'asc' },
        },
        _count: {
          select: {
            users: true,
            profissionais: true,
            pacientes: true,
            consultas: true,
          },
        },
      },
    });

    if (!clinica) {
      throw new NotFoundException('Clínica não encontrada');
    }

    if (!clinica.slug) {
      clinica.slug = await this.configuracoesService.ensureClinicSlug(clinica.id);
    }

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const consultasMes = await this.prisma.consultas.count({
      where: { clinicaId: id, dataHora: { gte: inicioMes }, archived: false },
    });

    return {
      ...this.serializeClinica(clinica),
      users: clinica.users,
      profissionais: clinica.profissionais.map((p) => ({
        id: p.id,
        nomeCompleto: p.nomeCompleto,
        crm: p.crm,
        especialidade: p.especialidades?.nome || null,
      })),
      metricas: {
        consultasMes,
      },
    };
  }

  async updateClinica(id: string, dto: UpdateClinicaAdminDto) {
    const clinica = await this.prisma.clinicas.findFirst({ where: { id, active: true } });
    if (!clinica) {
      throw new NotFoundException('Clínica não encontrada');
    }

    if (dto.planoId) {
      const plano = await this.prisma.planos.findFirst({
        where: { id: dto.planoId, active: true },
      });
      if (!plano) {
        throw new BadRequestException('Plano inválido');
      }
    }

    const data: any = { updatedAt: new Date() };

    if (dto.nome !== undefined) data.nome = dto.nome.trim();
    if (dto.cnpj !== undefined) data.cnpj = dto.cnpj?.replace(/\D/g, '') || null;
    if (dto.endereco !== undefined) data.endereco = dto.endereco?.trim() || null;
    if (dto.telefone !== undefined) data.telefone = dto.telefone?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.planoId !== undefined) data.planoId = dto.planoId || null;
    if (dto.observacoesAdmin !== undefined) data.observacoesAdmin = dto.observacoesAdmin;
    if (dto.trialAte !== undefined) {
      data.trialAte = dto.trialAte ? new Date(dto.trialAte) : null;
    }

    if (dto.statusPlataforma) {
      data.statusPlataforma = dto.statusPlataforma;
      if (dto.statusPlataforma === 'SUSPENSA' || dto.statusPlataforma === 'CANCELADA') {
        data.suspensaEm = new Date();
      } else {
        data.suspensaEm = null;
      }
      if (dto.statusPlataforma === 'TRIAL' && !dto.trialAte && !clinica.trialAte) {
        data.trialAte = this.addDays(new Date(), 14);
      }
    }

    await this.prisma.clinicas.update({ where: { id }, data });
    return this.getClinica(id);
  }

  async ensurePortalLink(id: string) {
    const slug = await this.configuracoesService.ensureClinicSlug(id);
    return { slug, path: `/c/${slug}` };
  }

  async impersonate(clinicaId: string, adminId: string) {
    const clinica = await this.prisma.clinicas.findFirst({
      where: { id: clinicaId, active: true },
      include: {
        owner: true,
      },
    });

    if (!clinica) {
      throw new NotFoundException('Clínica não encontrada');
    }

    let target = clinica.owner;
    if (!target || !target.active) {
      target = await this.prisma.users.findFirst({
        where: { clinicaId, active: true, role: 'MEDICO' },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!target) {
      throw new BadRequestException('Esta clínica não tem gerente ou médico ativo para impersonar.');
    }

    const payload = {
      sub: target.id,
      email: target.email,
      role: target.role,
      clinicaId: target.clinicaId,
      impersonatedBy: adminId,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '2h' });

    const clinicaPublica = {
      id: clinica.id,
      nome: clinica.nome,
      logoUrl: clinica.logoUrl,
      corPrimaria: clinica.corPrimaria,
      corSecundaria: clinica.corSecundaria,
    };

    return {
      access_token: token,
      impersonating: true,
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
        clinicaId: target.clinicaId,
      },
      clinica: clinicaPublica,
    };
  }

  private serializeClinica(clinica: any) {
    return {
      id: clinica.id,
      nome: clinica.nome,
      cnpj: clinica.cnpj,
      endereco: clinica.endereco,
      telefone: clinica.telefone,
      email: clinica.email,
      slug: clinica.slug,
      logoUrl: clinica.logoUrl,
      corPrimaria: clinica.corPrimaria,
      corSecundaria: clinica.corSecundaria,
      statusPlataforma: clinica.statusPlataforma,
      trialAte: clinica.trialAte,
      suspensaEm: clinica.suspensaEm,
      observacoesAdmin: clinica.observacoesAdmin,
      createdAt: clinica.createdAt,
      updatedAt: clinica.updatedAt,
      plano: clinica.plano
        ? {
            id: clinica.plano.id,
            nome: clinica.plano.nome,
            precoMensal: clinica.plano.precoMensal,
            maxMedicos: clinica.plano.maxMedicos,
            maxSecretarias: clinica.plano.maxSecretarias,
            maxConsultasMes: clinica.plano.maxConsultasMes,
            portalAtivo: clinica.plano.portalAtivo,
          }
        : null,
      owner: clinica.owner || null,
      counts: clinica._count
        ? {
            users: clinica._count.users,
            profissionais: clinica._count.profissionais,
            pacientes: clinica._count.pacientes,
            consultas: clinica._count.consultas,
          }
        : undefined,
    };
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
