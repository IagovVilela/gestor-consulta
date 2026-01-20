import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProfissionalDto } from './dto/create-profissional.dto';
import { CreateProfissionalCompletoDto } from './dto/create-profissional-completo.dto';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class ProfissionaisService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    clinicaId?: string,
  ) {
    const skip = (page - 1) * limit;

    console.log('🔍 ProfissionaisService.findAll - Parâmetros:', {
      page,
      limit,
      search,
      clinicaId,
    });

    const baseWhere: any = { active: true };
    
    // Filtrar por clínica apenas se fornecido (undefined significa mostrar todos)
    if (clinicaId) {
      baseWhere.clinicaId = clinicaId;
      console.log('🔍 Filtrando por clínica:', clinicaId);
    } else {
      console.log('🔍 Não filtrando por clínica (mostrando todos)');
    }

    const where = search
      ? {
          ...baseWhere,
          OR: [
            { nomeCompleto: { contains: search, mode: 'insensitive' } },
            { crm: { contains: search, mode: 'insensitive' } },
            { telefone: { contains: search } },
            { users: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : baseWhere;

    console.log('🔍 Where clause:', JSON.stringify(where, null, 2));

    const [data, total] = await Promise.all([
      this.prisma.profissionais.findMany({
        where,
        skip,
        take: limit,
        include: {
          especialidades: true,
          clinicas: true,
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { nomeCompleto: 'asc' },
      }),
      this.prisma.profissionais.count({ where }),
    ]);

    console.log('✅ ProfissionaisService.findAll - Resultado:', {
      encontrados: data.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllActive(clinicaId?: string, userId?: string) {
    const where: any = { active: true };
    
    // Filtrar por clínica se fornecido
    if (clinicaId) {
      where.clinicaId = clinicaId;
    }

    console.log('ProfissionaisService.findAllActive - where:', JSON.stringify(where));
    console.log('ProfissionaisService.findAllActive - userId:', userId);
    console.log('ProfissionaisService.findAllActive - clinicaId:', clinicaId);

    const result = await this.prisma.profissionais.findMany({
      where,
      include: {
        especialidades: true,
        clinicas: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { nomeCompleto: 'asc' },
    });

    console.log('ProfissionaisService.findAllActive - encontrados:', result.length, 'profissionais');
    
    // Se não encontrou nenhum profissional e temos userId, verificar se o usuário é médico
    if (result.length === 0 && userId && clinicaId) {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: { profissionais: true },
      });
      
      console.log('ProfissionaisService.findAllActive - usuário verificado:', {
        id: user?.id,
        role: user?.role,
        clinicaId: user?.clinicaId,
        temProfissional: !!user?.profissionais,
      });
      
      // Se o usuário é médico mas não tem registro em profissionais, pode ser que não existam profissionais cadastrados
      if (user?.role === 'MEDICO' && !user?.profissionais) {
        console.log('ProfissionaisService.findAllActive - AVISO: Médico logado não tem registro em profissionais');
      }
    }
    
    if (result.length > 0) {
      console.log('ProfissionaisService.findAllActive - primeiro profissional:', {
        id: result[0].id,
        nomeCompleto: result[0].nomeCompleto,
        clinicaId: result[0].clinicaId,
        active: result[0].active,
        userId: result[0].userId,
      });
    } else {
      console.log('ProfissionaisService.findAllActive - NENHUM profissional encontrado com os filtros aplicados');
    }

    return result;
  }

  async findOne(id: string) {
    const profissional = await this.prisma.profissionais.findUnique({
      where: { id },
        include: {
          especialidades: true,
          clinicas: true,
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          consultas: {
            include: {
              pacientes: true,
            },
            orderBy: {
              dataHora: 'desc',
            },
            take: 10,
          },
        },
    });

    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return profissional;
  }

  async create(createDto: CreateProfissionalDto) {
    // Verificar se o usuário existe
    const user = await this.prisma.users.findUnique({
      where: { id: createDto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se já existe profissional para este usuário
    const existingProfissional = await this.prisma.profissionais.findUnique({
      where: { userId: createDto.userId },
    });

    if (existingProfissional) {
      throw new BadRequestException('Este usuário já possui um profissional cadastrado');
    }

    // Verificar se clínica existe
    const clinica = await this.prisma.clinicas.findUnique({
      where: { id: createDto.clinicaId },
    });

    if (!clinica) {
      throw new NotFoundException('Clínica não encontrada');
    }

    // Verificar se especialidade existe
    const especialidade = await this.prisma.especialidades.findUnique({
      where: { id: createDto.especialidadeId },
    });

    if (!especialidade) {
      throw new NotFoundException('Especialidade não encontrada');
    }

    return this.prisma.profissionais.create({
      data: createDto as any,
      include: {
        especialidades: true,
        clinicas: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Cria usuário médico e profissional em uma única transação
   * Esta é a forma profissional e intuitiva de criar profissionais
   */
  async createCompleto(createDto: CreateProfissionalCompletoDto) {
    return await this.prisma.$transaction(async (tx) => {
      // Verificar se já existe um usuário com este email
      const existingUser = await tx.users.findUnique({
        where: { email: createDto.email },
      });

      if (existingUser && existingUser.active) {
        throw new ConflictException('Email já cadastrado');
      }

      // Verificar se clínica existe
      const clinica = await tx.clinicas.findUnique({
        where: { id: createDto.clinicaId },
      });

      if (!clinica) {
        throw new NotFoundException('Clínica não encontrada');
      }

      // Verificar se especialidade existe
      const especialidade = await tx.especialidades.findUnique({
        where: { id: createDto.especialidadeId },
      });

      if (!especialidade) {
        throw new NotFoundException('Especialidade não encontrada');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(createDto.password, 10);

      // Criar ou reativar usuário médico
      let user;
      if (existingUser && !existingUser.active) {
        // Reativar usuário inativo
        user = await tx.users.update({
          where: { id: existingUser.id },
          data: {
            email: createDto.email,
            password: hashedPassword,
            name: createDto.name,
            role: 'MEDICO',
            clinicaId: createDto.clinicaId,
            active: true,
            updatedAt: new Date(),
          },
        });
      } else {
        // Criar novo usuário médico
        user = await tx.users.create({
          data: {
            id: crypto.randomUUID(),
            email: createDto.email,
            password: hashedPassword,
            name: createDto.name,
            role: 'MEDICO',
            clinicaId: createDto.clinicaId,
            updatedAt: new Date(),
          },
        });
      }

      // Verificar se já existe profissional para este usuário
      const existingProfissional = await tx.profissionais.findUnique({
        where: { userId: user.id },
      });

      if (existingProfissional) {
        throw new BadRequestException('Este usuário já possui um profissional cadastrado');
      }

      // Criar profissional vinculado ao usuário
      const profissional = await tx.profissionais.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          clinicaId: createDto.clinicaId,
          especialidadeId: createDto.especialidadeId,
          nomeCompleto: createDto.nomeCompleto,
          crm: createDto.crm || null,
          telefone: createDto.telefone || null,
          active: true,
          updatedAt: new Date(),
        },
        include: {
          especialidades: true,
          clinicas: true,
          users: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return profissional;
    });
  }

  async update(id: string, updateDto: UpdateProfissionalDto) {
    const profissional = await this.prisma.profissionais.findUnique({
      where: { id },
    });

    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    // Verificar clínica se fornecida
    if (updateDto.clinicaId) {
      const clinica = await this.prisma.clinicas.findUnique({
        where: { id: updateDto.clinicaId },
      });

      if (!clinica) {
        throw new NotFoundException('Clínica não encontrada');
      }
    }

    // Verificar especialidade se fornecida
    if (updateDto.especialidadeId) {
      const especialidade = await this.prisma.especialidades.findUnique({
        where: { id: updateDto.especialidadeId },
      });

      if (!especialidade) {
        throw new NotFoundException('Especialidade não encontrada');
      }
    }

    return this.prisma.profissionais.update({
      where: { id },
      data: updateDto,
      include: {
        especialidades: true,
        clinicas: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const profissional = await this.prisma.profissionais.findUnique({
      where: { id },
    });

    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return this.prisma.profissionais.update({
      where: { id },
      data: { active: false },
    });
  }
}

