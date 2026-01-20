import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SecretariasMedicosService {
  constructor(private prisma: PrismaService) {}

  async vincular(secretariaId: string, medicoId: string) {
    // Verificar se a secretária existe e é do tipo SECRETARIA
    const secretaria = await this.prisma.users.findUnique({
      where: { id: secretariaId },
    });

    if (!secretaria || secretaria.role !== 'SECRETARIA') {
      throw new NotFoundException('Secretária não encontrada');
    }

    // Verificar se o médico existe
    const medico = await this.prisma.profissionais.findUnique({
      where: { id: medicoId },
    });

    if (!medico) {
      throw new NotFoundException('Médico não encontrado');
    }

    // Verificar se já existe vínculo
    const vinculoExistente = await this.prisma.secretarias_medicos.findFirst({
      where: {
        secretariaId,
        medicoId,
        active: true,
      },
    });

    if (vinculoExistente) {
      throw new BadRequestException('Vínculo já existe');
    }

    // Verificar se secretária e médico pertencem à mesma clínica
    if (secretaria.clinicaId !== medico.clinicaId) {
      throw new BadRequestException(
        'Secretária e médico devem pertencer à mesma clínica',
      );
    }

    return this.prisma.secretarias_medicos.create({
      data: {
        id: crypto.randomUUID(),
        secretariaId,
        medicoId,
        updatedAt: new Date(),
      } as any,
      include: {
        secretaria: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        medico: {
          include: {
            especialidades: true,
          },
        },
      },
    });
  }

  async desvincular(secretariaId: string, medicoId: string) {
    const vinculo = await this.prisma.secretarias_medicos.findFirst({
      where: {
        secretariaId,
        medicoId,
        active: true,
      },
    });

    if (!vinculo) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    return this.prisma.secretarias_medicos.update({
      where: { id: vinculo.id },
      data: { active: false },
    });
  }

  async getMedicosPorSecretaria(secretariaId: string) {
    const vinculos = await this.prisma.secretarias_medicos.findMany({
      where: {
        secretariaId,
        active: true,
      },
      include: {
        medico: {
          include: {
            especialidades: true,
            clinicas: true,
          },
        },
      },
    });

    return vinculos.map((v) => v.medico);
  }

  async getSecretariasPorMedico(medicoId: string) {
    const vinculos = await this.prisma.secretarias_medicos.findMany({
      where: {
        medicoId,
        active: true,
      },
      include: {
        secretaria: {
          select: {
            id: true,
            name: true,
            email: true,
            clinica: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    return vinculos.map((v) => v.secretaria);
  }

  async getAllVinculos(clinicaId?: string) {
    const where: any = { active: true };

    if (clinicaId) {
      // Filtrar por clínica através da secretária ou médico
      where.OR = [
        { secretaria: { clinicaId } },
        { medico: { clinicaId } },
      ];
    }

    return this.prisma.secretarias_medicos.findMany({
      where,
      include: {
        secretaria: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        medico: {
          include: {
            especialidades: true,
            clinicas: true,
          },
        },
      },
    });
  }
}

