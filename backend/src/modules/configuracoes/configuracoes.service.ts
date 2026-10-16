import { Injectable, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEspecialidadeDto } from './dto/create-especialidade.dto';
import { UpdateEspecialidadeDto } from './dto/update-especialidade.dto';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { CreateClinicaCompletoDto } from './dto/create-clinica-completo.dto';
import { UpdateClinicaDto } from './dto/update-clinica.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { createClinicSlug } from '../../common/utils/clinic-slug';

@Injectable()
export class ConfiguracoesService {
  constructor(private prisma: PrismaService) {}

  async getEspecialidades() {
    return this.prisma.especialidades.findMany({
      where: { active: true },
      orderBy: { nome: 'asc' },
    });
  }

  async createEspecialidade(createDto: CreateEspecialidadeDto) {
    return this.prisma.especialidades.create({
      data: {
        id: crypto.randomUUID(),
        ...createDto,
        updatedAt: new Date(),
      } as any,
    });
  }

  async updateEspecialidade(id: string, updateDto: UpdateEspecialidadeDto) {
    return this.prisma.especialidades.update({
      where: { id },
      data: updateDto,
    });
  }

  async removeEspecialidade(id: string) {
    return this.prisma.especialidades.update({
      where: { id },
      data: { active: false },
    });
  }

  async getUsuarios(medicoId?: string, secretariaId?: string, ownerId?: string) {
    const where: any = { active: true };

    // Se ownerId foi fornecido, verificar se é owner de alguma clínica
    if (ownerId) {
      // Buscar clínicas onde o usuário é owner
      const clinicasOwned = await this.prisma.clinicas.findMany({
        where: {
          ownerId: ownerId,
          active: true,
        },
        select: { id: true },
      });

      // Se o usuário é owner de alguma clínica, mostrar TODOS os usuários dessa clínica
      if (clinicasOwned && clinicasOwned.length > 0) {
        const clinicaIds = clinicasOwned.map(c => c.id);
        where.clinicaId = { in: clinicaIds };
        // Owner pode ver todos os usuários (MEDICO e SECRETARIA) da sua clínica
        return this.prisma.users.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            clinicaId: true,
            createdAt: true,
            clinica: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        });
      }
    }

    // Se for médico, mostrar todas as secretárias da mesma clínica
    if (medicoId) {
      const medico = await this.prisma.users.findUnique({
        where: { id: medicoId },
      });

      if (medico?.clinicaId) {
        where.clinicaId = medico.clinicaId;
        where.role = 'SECRETARIA';
      } else {
        // Se médico não tem clínica, retornar vazio
        return [];
      }
    }

    // Se for secretária, mostrar apenas médicos da mesma clínica
    if (secretariaId) {
      const secretaria = await this.prisma.users.findUnique({
        where: { id: secretariaId },
      });

      if (secretaria?.clinicaId) {
        where.clinicaId = secretaria.clinicaId;
        where.role = 'MEDICO';
      } else {
        return [];
      }
    }

    return this.prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicaId: true,
        createdAt: true,
        clinica: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async updateUsuario(id: string, updateDto: { name?: string; email?: string; role?: string; clinicaId?: string; password?: string }) {
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Se o email está sendo alterado, verificar se já existe um usuário ativo com este email
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.prisma.users.findFirst({
        where: { 
          email: updateDto.email,
          active: true, // Apenas usuários ativos bloqueiam a atualização
          id: { not: id }, // Excluir o próprio usuário da verificação
        },
      });

      if (existingUser) {
        throw new BadRequestException('Email já cadastrado');
      }
    }

    // Validar que MEDICO e SECRETARIA devem ter clínica
    const finalRole = updateDto.role || user.role;
    
    // ADMIN não deve ter clínica vinculada
    let finalClinicaId: string | null;
    if (finalRole === 'ADMIN') {
      finalClinicaId = null;
    } else {
      finalClinicaId = updateDto.clinicaId !== undefined ? updateDto.clinicaId : user.clinicaId;
    }
    
    if ((finalRole === 'MEDICO' || finalRole === 'SECRETARIA') && !finalClinicaId) {
      throw new Error('Médicos e secretárias devem estar vinculados a uma clínica');
    }

    const updateData: any = {
      name: updateDto.name,
      email: updateDto.email,
      role: updateDto.role,
      clinicaId: finalClinicaId,
      updatedAt: new Date(),
    };

    // Se senha foi fornecida, fazer hash
    if (updateDto.password && updateDto.password.length >= 6) {
      updateData.password = await bcrypt.hash(updateDto.password, 10);
    }

    return this.prisma.users.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicaId: true,
        createdAt: true,
        clinica: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });
  }

  async removeUsuario(id: string, currentUserId?: string) {
    // Usar transação para garantir atomicidade
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { id },
      });

      if (!user) {
        throw new BadRequestException('Usuário não encontrado');
      }

      console.log('🗑️  SERVICE - removeUsuario');
      console.log('🗑️  ID do usuário a ser excluído:', id);
      console.log('🗑️  ID do usuário logado (currentUserId):', currentUserId);
      console.log('🗑️  Usuário encontrado:', user.id, user.email, user.role);
      console.log('🗑️  Comparação de IDs:', id === currentUserId, '(', id, '===', currentUserId, ')');

      // Não permitir excluir o próprio usuário
      if (currentUserId && id === currentUserId) {
        console.log('❌ Bloqueado: Tentativa de auto-exclusão');
        throw new ForbiddenException('Você não pode excluir seu próprio usuário');
      }

      // Verificar se é ADMIN
      if (user.role === 'ADMIN') {
        // Contar quantos ADMINS ativos existem
        const adminCount = await tx.users.count({
          where: {
            role: 'ADMIN',
            active: true,
          },
        });

        // Não permitir excluir se for o último ADMIN
        if (adminCount <= 1) {
          throw new ForbiddenException('Não é possível excluir o último administrador do sistema');
        }
      }

      // Soft delete - marcar como inativo
      // NOTA: Não removemos o email porque ele é parte da identidade do usuário
      // A lógica de criação/reativação deve verificar usuários inativos e reativá-los
      console.log(`🗑️  Excluindo usuário ${user.email} (soft delete)`);
      
      return await tx.users.update({
        where: { id },
        data: {
          active: false,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          updatedAt: true,
        },
      });
    });
  }

  async getClinicas() {
    console.log('🔍 SERVICE - getClinicas iniciado');
    const clinicas = await this.prisma.clinicas.findMany({
      where: { active: true },
      orderBy: { nome: 'asc' },
    });
    for (const clinica of clinicas) {
      if (!clinica.slug) {
        clinica.slug = await this.ensureClinicSlug(clinica.id);
      }
    }
    console.log(`✅ SERVICE - getClinicas retornou ${clinicas.length} clínica(s)`);
    console.log('Clínicas encontradas:', clinicas.map(c => ({ id: c.id, nome: c.nome, active: c.active })));
    return clinicas;
  }

  /**
   * Retorna as clínicas que o usuário é owner
   */
  async getClinicasOwnedByUser(userId: string) {
    return this.prisma.clinicas.findMany({
      where: {
        ownerId: userId,
        active: true,
      },
      select: {
        id: true,
        nome: true,
      },
    });
  }

  /**
   * Busca usuário por ID
   */
  async getUsuarioById(id: string) {
    return this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicaId: true,
        active: true,
      },
    });
  }

  async ensureClinicSlug(clinicaId: string): Promise<string> {
    const clinica = await this.prisma.clinicas.findUnique({ where: { id: clinicaId } });
    if (!clinica || !clinica.active) {
      throw new BadRequestException('Clínica não encontrada');
    }
    if (clinica.slug) return clinica.slug;

    const slug = await this.uniqueSlug(clinica.nome);
    await this.prisma.clinicas.update({
      where: { id: clinicaId },
      data: { slug },
    });
    return slug;
  }

  private async uniqueSlug(nome: string, db: any = this.prisma): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = createClinicSlug(nome);
      const existing = await db.clinicas.findUnique({ where: { slug } });
      if (!existing) return slug;
    }
    return createClinicSlug(`${nome}-${Date.now()}`);
  }

  async getClinica(id: string) {
    return this.prisma.clinicas.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async createClinica(createDto: CreateClinicaDto, ownerId: string) {
    console.log('🔧 SERVICE - createClinica iniciado');
    console.log('OwnerId:', ownerId);
    console.log('DTO:', JSON.stringify(createDto, null, 2));
    
    // Usar transação para garantir atomicidade
    return await this.prisma.$transaction(async (tx) => {
      const cnpjLimpo = createDto.cnpj ? createDto.cnpj.replace(/\D/g, '') : null;
      
      // Se CNPJ foi fornecido, verificar se existe clínica (ativa ou inativa) com este CNPJ
      if (cnpjLimpo && cnpjLimpo.trim() !== '') {
        console.log('🔍 Verificando CNPJ:', cnpjLimpo);
        
        const existingClinica = await tx.clinicas.findFirst({
          where: {
            cnpj: cnpjLimpo,
          },
        });

        if (existingClinica) {
          console.log('🔍 Clínica encontrada com este CNPJ:', {
            id: existingClinica.id,
            nome: existingClinica.nome,
            active: existingClinica.active,
            cnpj: existingClinica.cnpj,
          });
          
          // Se a clínica está ATIVA, não permitir criar nova
          if (existingClinica.active) {
            console.error('❌ Clínica ATIVA encontrada com este CNPJ');
            throw new BadRequestException(
              `Já existe uma clínica ativa cadastrada com este CNPJ: "${existingClinica.nome}". Por favor, use um CNPJ diferente ou exclua a clínica existente primeiro.`
            );
          }
          
          // Se a clínica está INATIVA, REATIVAR em vez de criar nova
          console.log(`🔄 Clínica inativa encontrada. Reativando clínica "${existingClinica.nome}"...`);
          
          // Preparar dados de atualização
          const updateData: any = {
            active: true,
            nome: createDto.nome.trim(),
            updatedAt: new Date(),
          };
          
          // Adicionar ownerId se fornecido
          if (ownerId && ownerId.trim() !== '') {
            updateData.ownerId = ownerId;
          }
          
          // Adicionar campos opcionais apenas se não estiverem vazios
          if (createDto.endereco && createDto.endereco.trim() !== '') {
            updateData.endereco = createDto.endereco.trim();
          }
          if (createDto.telefone && createDto.telefone.trim() !== '') {
            updateData.telefone = createDto.telefone.trim();
          }
          if (createDto.email && createDto.email.trim() !== '') {
            updateData.email = createDto.email.trim();
          }
          if (createDto.logoUrl && createDto.logoUrl.trim() !== '') {
            updateData.logoUrl = createDto.logoUrl.trim();
          }
          if (createDto.corPrimaria && createDto.corPrimaria.trim() !== '') {
            updateData.corPrimaria = createDto.corPrimaria.trim();
          }
          if (createDto.corSecundaria && createDto.corSecundaria.trim() !== '') {
            updateData.corSecundaria = createDto.corSecundaria.trim();
          }
          if (!existingClinica.slug) {
            updateData.slug = await this.uniqueSlug(createDto.nome.trim(), tx);
          }
          
          // Reativar clínica existente
          const reactivatedClinica = await tx.clinicas.update({
            where: { id: existingClinica.id },
            data: updateData,
          });
          
          console.log(`✅ Clínica "${reactivatedClinica.nome}" reativada com sucesso!`);
          return reactivatedClinica;
        }
      }

      // Preparar dados, removendo CNPJ vazio
      const data: any = {
        id: crypto.randomUUID(),
        nome: createDto.nome.trim(),
        updatedAt: new Date(),
      };

      // Adicionar ownerId apenas se fornecido
      if (ownerId && ownerId.trim() !== '') {
        data.ownerId = ownerId;
      }

      // Adicionar campos opcionais apenas se não estiverem vazios
      // CNPJ: só adicionar se fornecido e não vazio, caso contrário deixar undefined (não null)
      if (createDto.cnpj && createDto.cnpj.trim() !== '') {
        const cnpjLimpo = createDto.cnpj.replace(/\D/g, ''); // Remove formatação
        if (cnpjLimpo.length > 0) {
          data.cnpj = cnpjLimpo;
        }
      }
      // Se CNPJ não foi fornecido ou está vazio, não incluir no data (deixar undefined)
      if (createDto.endereco && createDto.endereco.trim() !== '') {
        data.endereco = createDto.endereco.trim();
      }
      if (createDto.telefone && createDto.telefone.trim() !== '') {
        data.telefone = createDto.telefone.trim();
      }
      if (createDto.email && createDto.email.trim() !== '') {
        data.email = createDto.email.trim();
      }
      if (createDto.logoUrl && createDto.logoUrl.trim() !== '') {
        data.logoUrl = createDto.logoUrl.trim();
      }
      if (createDto.corPrimaria && createDto.corPrimaria.trim() !== '') {
        data.corPrimaria = createDto.corPrimaria.trim();
      }
      if (createDto.corSecundaria && createDto.corSecundaria.trim() !== '') {
        data.corSecundaria = createDto.corSecundaria.trim();
      }

      console.log('📦 Dados que serão salvos:', JSON.stringify(data, null, 2));
      
      // Verificação final antes de criar - evitar race condition
      if (data.cnpj) {
        console.log('🔍 Verificação final de CNPJ:', data.cnpj);
        const finalCheck = await tx.clinicas.findFirst({
          where: {
            cnpj: data.cnpj,
            active: true,
          },
        });
        
        if (finalCheck) {
          console.error('❌ CNPJ já existe em clínica ativa:', finalCheck.id);
          throw new BadRequestException('Este CNPJ já está cadastrado em uma clínica ativa');
        }
        console.log('✅ CNPJ disponível para uso');
      }
      
      data.slug = await this.uniqueSlug(createDto.nome.trim(), tx);
      // Cobrança fica em outro sistema — clínica nasce ativa, sem plano/trial
      data.statusPlataforma = 'ATIVA';
      data.planoId = null;
      data.trialAte = null;

      console.log('💾 Tentando criar clínica no banco...');
      const createdClinica = await tx.clinicas.create({
        data,
      });
      
      console.log('✅ Clínica criada com sucesso! ID:', createdClinica.id);
      console.log('📤 Retornando dados da clínica criada');
      return createdClinica;
    }, {
      timeout: 10000, // Timeout de 10 segundos para transação
    }).catch((error: any) => {
      console.error('❌ Erro ao criar clínica:', error);
      console.error('Detalhes do erro:', {
        code: error.code,
        meta: error.meta,
        message: error.message,
      });
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Tratar erro específico de constraint única
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'campo';
        if (field === 'cnpj') {
          throw new BadRequestException(
            'Este CNPJ já está cadastrado. Se você tentou criar uma clínica que foi excluída, aguarde alguns segundos e tente novamente.'
          );
        }
        throw new BadRequestException(`Já existe um registro com este ${field}`);
      }
      
      throw new BadRequestException(
        error.message || 'Erro ao criar clínica. Verifique os dados e tente novamente.'
      );
    });
  }

  /**
   * Cria clínica completa: clínica + usuário gerente em uma única transação
   * O gerente será o dono (owner) da clínica e poderá gerenciar usuários independentemente
   */
  async createClinicaCompleto(createDto: CreateClinicaCompletoDto) {
    return await this.prisma.$transaction(async (tx) => {
      // Verificar se já existe um usuário com este email
      const existingUser = await tx.users.findUnique({
        where: { email: createDto.gerenteEmail },
      });

      if (existingUser && existingUser.active) {
        throw new ConflictException('Email do gerente já cadastrado');
      }

      const cnpjLimpo = createDto.cnpj ? createDto.cnpj.replace(/\D/g, '') : null;
      
      // Verificar CNPJ se fornecido
      if (cnpjLimpo && cnpjLimpo.trim() !== '') {
        const existingClinica = await tx.clinicas.findFirst({
          where: { cnpj: cnpjLimpo },
        });

        if (existingClinica) {
          if (existingClinica.active) {
            throw new BadRequestException(
              `Já existe uma clínica ativa cadastrada com este CNPJ: "${existingClinica.nome}"`
            );
          }
          throw new BadRequestException(
            `Já existe uma clínica inativa com este CNPJ. Por favor, exclua-a primeiro ou use outro CNPJ.`
          );
        }
      }

      // Criar clínica ativa (sem plano/trial — assinatura é gerida em outro sistema)
      const clinicaData: any = {
        id: crypto.randomUUID(),
        nome: createDto.nome.trim(),
        slug: await this.uniqueSlug(createDto.nome.trim(), tx),
        statusPlataforma: 'ATIVA',
        planoId: null,
        trialAte: null,
        updatedAt: new Date(),
      };

      if (cnpjLimpo && cnpjLimpo.trim() !== '') {
        clinicaData.cnpj = cnpjLimpo;
      }
      if (createDto.endereco?.trim()) {
        clinicaData.endereco = createDto.endereco.trim();
      }
      if (createDto.telefone?.trim()) {
        clinicaData.telefone = createDto.telefone.trim();
      }
      if (createDto.email?.trim()) {
        clinicaData.email = createDto.email.trim();
      }
      if (createDto.logoUrl?.trim()) {
        clinicaData.logoUrl = createDto.logoUrl.trim();
      }
      if (createDto.corPrimaria?.trim()) {
        clinicaData.corPrimaria = createDto.corPrimaria.trim();
      }
      if (createDto.corSecundaria?.trim()) {
        clinicaData.corSecundaria = createDto.corSecundaria.trim();
      }

      // Criar clínica (ainda sem owner, será atualizado depois)
      const clinica = await tx.clinicas.create({
        data: clinicaData,
      });

      // Criar ou reativar usuário gerente
      const hashedPassword = await bcrypt.hash(createDto.gerentePassword, 10);
      
      let gerente;
      if (existingUser && !existingUser.active) {
        // Reativar usuário inativo
        gerente = await tx.users.update({
          where: { id: existingUser.id },
          data: {
            email: createDto.gerenteEmail,
            password: hashedPassword,
            name: createDto.gerenteName,
            role: 'MEDICO', // Usar MEDICO como role do gerente (pode gerenciar usuários)
            clinicaId: clinica.id,
            active: true,
            updatedAt: new Date(),
          },
        });
          } else {
            // Criar novo usuário gerente
            gerente = await tx.users.create({
              data: {
                id: crypto.randomUUID(),
                email: createDto.gerenteEmail,
                password: hashedPassword,
                name: createDto.gerenteName,
                role: 'MEDICO', // Usar MEDICO como role do gerente
                clinicaId: clinica.id,
                active: true, // Garantir que está ativo
                updatedAt: new Date(),
              },
            });
          }

      // Atualizar clínica com o ownerId
      const clinicaAtualizada = await tx.clinicas.update({
        where: { id: clinica.id },
        data: {
          ownerId: gerente.id,
        },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return clinicaAtualizada;
    });
  }

  async updateClinica(id: string, updateDto: UpdateClinicaDto) {
    return await this.prisma.$transaction(async (tx) => {
      // Verificar se CNPJ já existe em outra clínica ATIVA (se fornecido)
      if (updateDto.cnpj && updateDto.cnpj.trim() !== '') {
        const cnpjLimpo = updateDto.cnpj.replace(/\D/g, ''); // Remove formatação
        
        // Verificar se já existe outra clínica ATIVA com este CNPJ (comparação exata)
        const existingClinica = await tx.clinicas.findFirst({
          where: {
            active: true,
            AND: [
              {
                OR: [
                  { cnpj: cnpjLimpo },
                  { cnpj: updateDto.cnpj },
                ],
              },
              {
                id: {
                  not: id, // Excluir a própria clínica da verificação
                },
              },
            ],
          },
        });

        if (existingClinica) {
          throw new BadRequestException('Já existe outra clínica cadastrada com este CNPJ');
        }
      }

      // Buscar clínica atual para obter o ownerId atual
      const clinicaAtual = await tx.clinicas.findUnique({
        where: { id },
        select: { ownerId: true },
      });

      if (!clinicaAtual) {
        throw new BadRequestException('Clínica não encontrada');
      }

      // Preparar dados da clínica, removendo campos vazios
      const data: any = {
        updatedAt: new Date(),
      };

      if (updateDto.nome) {
        data.nome = updateDto.nome;
      }
      if (updateDto.cnpj !== undefined) {
        data.cnpj = updateDto.cnpj.trim() !== '' ? updateDto.cnpj.replace(/\D/g, '') : null;
      }
      if (updateDto.endereco !== undefined) {
        data.endereco = updateDto.endereco.trim() !== '' ? updateDto.endereco : null;
      }
      if (updateDto.telefone !== undefined) {
        data.telefone = updateDto.telefone.trim() !== '' ? updateDto.telefone : null;
      }
      if (updateDto.email !== undefined) {
        data.email = updateDto.email.trim() !== '' ? updateDto.email : null;
      }
      if (updateDto.logoUrl !== undefined) {
        data.logoUrl = updateDto.logoUrl.trim() !== '' ? updateDto.logoUrl : null;
      }
      if (updateDto.corPrimaria !== undefined) {
        data.corPrimaria = updateDto.corPrimaria.trim() !== '' ? updateDto.corPrimaria : null;
      }
      if (updateDto.corSecundaria !== undefined) {
        data.corSecundaria = updateDto.corSecundaria.trim() !== '' ? updateDto.corSecundaria : null;
      }

      // Criar ou atualizar gerente
      if (updateDto.gerenteName && updateDto.gerenteEmail) {
        // Se a clínica já tem um gerente, atualizar
        if (clinicaAtual.ownerId) {
          const gerenteData: any = {};
          
          if (updateDto.gerenteName) {
            gerenteData.name = updateDto.gerenteName;
          }
          if (updateDto.gerenteEmail) {
            // Verificar se o email já está em uso por outro usuário
            const existingUser = await tx.users.findFirst({
              where: {
                email: updateDto.gerenteEmail,
                id: { not: clinicaAtual.ownerId },
                active: true,
              },
            });
            
            if (existingUser) {
              throw new BadRequestException('Este email já está em uso por outro usuário');
            }
            
            gerenteData.email = updateDto.gerenteEmail;
          }
          if (updateDto.gerentePassword) {
            gerenteData.password = await bcrypt.hash(updateDto.gerentePassword, 10);
          }

          // Atualizar gerente se houver dados para atualizar
          if (Object.keys(gerenteData).length > 0) {
            gerenteData.updatedAt = new Date();
            await tx.users.update({
              where: { id: clinicaAtual.ownerId },
              data: gerenteData,
            });
          }
        } else {
          // Clínica não tem gerente ainda, criar novo gerente
          // Verificar se o email já está em uso
          const existingUser = await tx.users.findUnique({
            where: { email: updateDto.gerenteEmail },
          });

          if (existingUser && existingUser.active) {
            throw new ConflictException('Email do gerente já cadastrado');
          }

          // Senha é obrigatória ao criar novo gerente
          if (!updateDto.gerentePassword || updateDto.gerentePassword.trim() === '') {
            throw new BadRequestException('Senha é obrigatória ao criar um novo gerente');
          }

          const hashedPassword = await bcrypt.hash(updateDto.gerentePassword, 10);

          let gerente;
          if (existingUser && !existingUser.active) {
            // Reativar usuário inativo
            gerente = await tx.users.update({
              where: { id: existingUser.id },
              data: {
                email: updateDto.gerenteEmail,
                password: hashedPassword,
                name: updateDto.gerenteName,
                role: 'MEDICO',
                clinicaId: id,
                active: true,
                updatedAt: new Date(),
              },
            });
          } else {
            // Criar novo usuário gerente
            gerente = await tx.users.create({
              data: {
                id: crypto.randomUUID(),
                email: updateDto.gerenteEmail,
                password: hashedPassword,
                name: updateDto.gerenteName,
                role: 'MEDICO',
                clinicaId: id,
                active: true, // Garantir que está ativo
                updatedAt: new Date(),
              },
            });
          }

          // Vincular gerente como owner da clínica
          data.ownerId = gerente.id;
        }
      }

      // Se fornecido um novo gerenteId, atualizar o ownerId da clínica
      if (updateDto.gerenteId && updateDto.gerenteId !== clinicaAtual.ownerId) {
        // Verificar se o novo gerente existe e é um MEDICO
        const novoGerente = await tx.users.findUnique({
          where: { id: updateDto.gerenteId },
        });

        if (!novoGerente) {
          throw new BadRequestException('Usuário selecionado não encontrado');
        }

        if (novoGerente.role !== 'MEDICO') {
          throw new BadRequestException('O gerente deve ser um médico');
        }

        // Atualizar ownerId da clínica
        data.ownerId = updateDto.gerenteId;
        
        // Atualizar clinicaId do novo gerente
        await tx.users.update({
          where: { id: updateDto.gerenteId },
          data: { clinicaId: id },
        });

        // Remover clinicaId do gerente antigo (se existir)
        if (clinicaAtual.ownerId) {
          await tx.users.update({
            where: { id: clinicaAtual.ownerId },
            data: { clinicaId: null },
          });
        }
      }

      // Atualizar clínica
      return await tx.clinicas.update({
        where: { id },
        data,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  }

  async removeClinica(id: string) {
    console.log('🔧 SERVICE - removeClinica iniciado');
    console.log('ID da clínica:', id);
    
    try {
      // Usar transação para garantir atomicidade
      const result = await this.prisma.$transaction(async (tx) => {
        // Verificar se a clínica existe
        console.log('🔍 Buscando clínica no banco...');
        const clinica = await tx.clinicas.findUnique({
          where: { id },
        });

        if (!clinica) {
          console.error('❌ Clínica não encontrada');
          throw new BadRequestException('Clínica não encontrada');
        }
        
        console.log('✅ Clínica encontrada:', clinica.nome);

        // Verificar se há usuários, pacientes ou profissionais vinculados
        const usuariosCount = await tx.users.count({
          where: { clinicaId: id, active: true },
        });

        const pacientesCount = await tx.pacientes.count({
          where: { clinicaId: id, active: true },
        });

        const profissionaisCount = await tx.profissionais.count({
          where: { clinicaId: id, active: true },
        });

        const consultasCount = await tx.consultas.count({
          where: { 
            clinicaId: id,
          },
        });

        // Se houver vínculos, informar mas permitir exclusão (soft delete)
        if (usuariosCount > 0 || pacientesCount > 0 || profissionaisCount > 0 || consultasCount > 0) {
          console.warn(`Aviso: Clínica tem vínculos - ${usuariosCount} usuário(s), ${pacientesCount} paciente(s), ${profissionaisCount} profissional(is), ${consultasCount} consulta(s)`);
        }

        // Soft delete - marcar como inativo e SEMPRE remover CNPJ
        // Isso é crítico para permitir criar nova clínica com o mesmo CNPJ
        console.log('💾 Atualizando clínica como inativa e removendo CNPJ...');
        
        const updatedClinica = await tx.clinicas.update({
          where: { id },
          data: {
            active: false,
            cnpj: null, // SEMPRE remover CNPJ para permitir criar nova clínica com o mesmo CNPJ
            updatedAt: new Date(),
          },
          select: {
            id: true,
            nome: true,
            active: true,
            cnpj: true,
            updatedAt: true,
          },
        });
        
        console.log('✅ Clínica marcada como inativa e CNPJ removido com sucesso!');
        console.log('CNPJ após exclusão:', updatedClinica.cnpj);
        
        return updatedClinica;
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao excluir clínica:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Erro ao excluir clínica. Tente novamente.'
      );
    }
  }
}

