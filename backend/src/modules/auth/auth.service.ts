import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.users.findUnique({
      where: { email: loginDto.email },
      include: {
        clinica: {
          select: {
            id: true,
            nome: true,
            logoUrl: true,
            corPrimaria: true,
            corSecundaria: true,
          },
        },
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // ADMIN não deve ter clínica vinculada
    // Usar dados da clínica já carregados apenas se não for ADMIN
    const clinica = user.role === 'ADMIN' ? null : user.clinica;

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clinicaId: user.role === 'ADMIN' ? null : (user.clinicaId || null),
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicaId: user.role === 'ADMIN' ? null : (user.clinicaId || null),
      },
      clinica: clinica,
    };
  }

  async register(registerDto: RegisterDto) {
    // Usar transação para garantir atomicidade
    return await this.prisma.$transaction(async (tx) => {
      // Verificar se já existe um usuário com este email (ativo ou inativo)
      const existingUser = await tx.users.findUnique({
        where: { 
          email: registerDto.email,
        },
      });

      // Se existe um usuário ativo, bloquear
      if (existingUser && existingUser.active) {
        throw new ConflictException('Email já cadastrado');
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      
      // ADMIN não deve ter clínica vinculada
      const finalRole = registerDto.role || 'SECRETARIA';
      const finalClinicaId = finalRole === 'ADMIN' ? null : (registerDto.clinicaId || null);

      let user;
      
      // Se existe um usuário inativo, REATIVAR em vez de criar novo
      if (existingUser && !existingUser.active) {
        console.log(`🔄 Reativando usuário inativo com email: ${registerDto.email}`);
        user = await tx.users.update({
          where: { id: existingUser.id },
          data: {
            email: registerDto.email,
            password: hashedPassword,
            name: registerDto.name,
            role: finalRole,
            clinicaId: finalClinicaId,
            active: true, // Reativar o usuário
            updatedAt: new Date(),
          },
          include: {
            clinica: {
              select: {
                id: true,
                nome: true,
                logoUrl: true,
                corPrimaria: true,
                corSecundaria: true,
              },
            },
          },
        });
        console.log(`✅ Usuário "${user.name}" reativado com sucesso!`);
      } else {
        // Se não existe, criar novo usuário
        console.log(`📝 Criando novo usuário com email: ${registerDto.email}`);
        user = await tx.users.create({
          data: {
            id: crypto.randomUUID(),
            email: registerDto.email,
            password: hashedPassword,
            name: registerDto.name,
            role: finalRole,
            clinicaId: finalClinicaId,
            updatedAt: new Date(),
          },
          include: {
            clinica: {
              select: {
                id: true,
                nome: true,
                logoUrl: true,
                corPrimaria: true,
                corSecundaria: true,
              },
            },
          },
        });
        console.log(`✅ Usuário "${user.name}" criado com sucesso!`);
      }

      // ADMIN não deve ter clínica vinculada
      const clinica = finalRole === 'ADMIN' ? null : user.clinica;
      const clinicaIdForPayload = finalRole === 'ADMIN' ? null : (user.clinicaId || null);

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        clinicaId: clinicaIdForPayload,
      };

      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clinicaId: clinicaIdForPayload,
        },
        clinica: clinica,
      };
    }, {
      timeout: 10000, // Timeout de 10 segundos para transação
    });
  }

  async createSecretaria(createDto: RegisterDto, medicoId: string) {
    // Usar transação para garantir atomicidade
    return await this.prisma.$transaction(async (tx) => {
      // Verificar se o médico existe e tem role MEDICO
      const medico = await tx.users.findUnique({
        where: { id: medicoId },
        include: {
          profissionais: true,
        },
      });

      if (!medico || medico.role !== 'MEDICO') {
        throw new UnauthorizedException('Apenas médicos podem criar secretárias');
      }

      // Verificar se já existe um usuário com este email (ativo ou inativo)
      const existingUser = await tx.users.findUnique({
        where: { 
          email: createDto.email,
        },
      });

      // Se existe um usuário ativo, bloquear
      if (existingUser && existingUser.active) {
        throw new ConflictException('Email já cadastrado');
      }

      // Criar secretária sempre com role SECRETARIA e clínica do médico
      const hashedPassword = await bcrypt.hash(createDto.password, 10);

      // Se existe um usuário inativo, REATIVAR em vez de criar novo
      let secretaria;
      if (existingUser && !existingUser.active) {
        console.log(`🔄 Reativando secretária inativa com email: ${createDto.email}`);
        secretaria = await tx.users.update({
          where: { id: existingUser.id },
          data: {
            email: createDto.email,
            password: hashedPassword,
            name: createDto.name,
            role: 'SECRETARIA',
            clinicaId: medico.clinicaId || null,
            active: true, // Reativar o usuário
            updatedAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        });
        console.log(`✅ Secretária "${secretaria.name}" reativada com sucesso!`);
      } else {
        // Se não existe, criar nova secretária
        console.log(`📝 Criando nova secretária com email: ${createDto.email}`);
        secretaria = await tx.users.create({
          data: {
            id: crypto.randomUUID(),
            email: createDto.email,
            password: hashedPassword,
            name: createDto.name,
            role: 'SECRETARIA',
            clinicaId: medico.clinicaId || null,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        });
        console.log(`✅ Secretária "${secretaria.name}" criada com sucesso!`);
      }

      // Vincular secretária ao médico se o médico tiver registro em profissionais
      if (medico.profissionais) {
        // Verificar se já existe vínculo antes de criar
        const existingVinculo = await tx.secretarias_medicos.findFirst({
          where: {
            secretariaId: secretaria.id,
            medicoId: medico.profissionais.id,
          },
        });

        if (!existingVinculo) {
          await tx.secretarias_medicos.create({
            data: {
              id: crypto.randomUUID(),
              secretariaId: secretaria.id,
              medicoId: medico.profissionais.id,
              updatedAt: new Date(),
            },
          });
        }
      }

      return secretaria;
    }, {
      timeout: 10000, // Timeout de 10 segundos para transação
    });
  }

  async validateUser(userId: string) {
    console.log('🔍 AuthService.validateUser - Buscando usuário:', userId);
    
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        clinicaId: true,
      },
    });

    if (!user) {
      console.error('❌ AuthService.validateUser - Usuário não encontrado:', userId);
      
      // Buscar todos os usuários para debug
      const allUsers = await this.prisma.users.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
        },
        take: 10,
      });
      console.error('📋 Usuários no banco (primeiros 10):', allUsers);
      
      return null;
    }
    
    if (!user.active) {
      console.error('❌ AuthService.validateUser - Usuário inativo:', userId);
      return null;
    }
    
    console.log('✅ AuthService.validateUser - Usuário válido:', {
      id: user.id,
      email: user.email,
      role: user.role,
      active: user.active,
      clinicaId: user.clinicaId,
    });
    
    // Se for ADMIN, garantir que não tem clínica vinculada
    if (user.role === 'ADMIN' && user.clinicaId !== null) {
      console.warn('⚠️  AuthService.validateUser - ADMIN com clínica vinculada! Corrigindo...');
      await this.prisma.users.update({
        where: { id: user.id },
        data: { clinicaId: null },
      });
      user.clinicaId = null;
    }

    return user;
  }
}


