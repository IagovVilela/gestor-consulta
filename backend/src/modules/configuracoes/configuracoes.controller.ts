import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfiguracoesService } from './configuracoes.service';
import { SecretariasMedicosService } from './secretarias-medicos.service';
import { CreateEspecialidadeDto } from './dto/create-especialidade.dto';
import { UpdateEspecialidadeDto } from './dto/update-especialidade.dto';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { CreateClinicaCompletoDto } from './dto/create-clinica-completo.dto';
import { UpdateClinicaDto } from './dto/update-clinica.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(
    private readonly configuracoesService: ConfiguracoesService,
    private readonly secretariasMedicosService: SecretariasMedicosService,
  ) {}

  @Get('especialidades')
  async getEspecialidades() {
    return this.configuracoesService.getEspecialidades();
  }

  @Post('especialidades')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MEDICO', 'SECRETARIA')
  async createEspecialidade(@Body() createDto: CreateEspecialidadeDto) {
    return this.configuracoesService.createEspecialidade(createDto);
  }

  @Put('especialidades/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MEDICO', 'SECRETARIA')
  async updateEspecialidade(
    @Param('id') id: string,
    @Body() updateDto: UpdateEspecialidadeDto,
  ) {
    return this.configuracoesService.updateEspecialidade(id, updateDto);
  }

  @Delete('especialidades/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MEDICO', 'SECRETARIA')
  async removeEspecialidade(@Param('id') id: string) {
    return this.configuracoesService.removeEspecialidade(id);
  }

  @Get('usuarios')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MEDICO', 'SECRETARIA')
  async getUsuarios(@CurrentUser() user?: any) {
    const userRole = user?.role?.toUpperCase();
    
    // ADMIN vê todos os usuários
    // MÉDICO (incluindo owners) vê usuários da sua clínica
    // SECRETARIA vê apenas médicos da mesma clínica
    
    // Verificar se o usuário é owner de alguma clínica
    const clinicasOwned = await this.configuracoesService.getClinicasOwnedByUser(user?.id);
    const isOwner = clinicasOwned && clinicasOwned.length > 0;
    
    if (userRole === 'MEDICO') {
      // Se for owner, passar userId para ver todos os usuários da clínica
      if (isOwner) {
        return this.configuracoesService.getUsuarios(undefined, undefined, user.id);
      }
      // Caso contrário, ver apenas secretárias
      return this.configuracoesService.getUsuarios(user.id, undefined);
    } else if (userRole === 'SECRETARIA') {
      return this.configuracoesService.getUsuarios(undefined, user.id);
    } else {
      // ADMIN
      return this.configuracoesService.getUsuarios();
    }
  }

  @Put('usuarios/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MEDICO')
  async updateUsuario(
    @Param('id') id: string,
    @Body() updateDto: { name?: string; email?: string; role?: string; clinicaId?: string },
    @CurrentUser() user?: any,
  ) {
    // Verificar se o usuário é owner da clínica do usuário que está sendo editado
    if (user?.role?.toUpperCase() === 'MEDICO') {
      const targetUser = await this.configuracoesService.getUsuarioById(id);
      if (!targetUser) {
        throw new BadRequestException('Usuário não encontrado');
      }
      
      // Verificar se o usuário atual é owner da clínica do usuário alvo
      const clinicasOwned = await this.configuracoesService.getClinicasOwnedByUser(user.id);
      const isOwner = clinicasOwned.some(c => c.id === targetUser.clinicaId);
      
      if (!isOwner) {
        throw new ForbiddenException('Você só pode editar usuários da sua clínica');
      }
      
      // Garantir que o usuário editado permaneça na mesma clínica
      if (updateDto.clinicaId && updateDto.clinicaId !== targetUser.clinicaId) {
        throw new ForbiddenException('Você não pode alterar a clínica de um usuário');
      }
      
      // Owner não pode alterar role para ADMIN
      if (updateDto.role === 'ADMIN') {
        throw new ForbiddenException('Você não pode alterar o perfil de um usuário para ADMIN');
      }
    }
    
    return this.configuracoesService.updateUsuario(id, updateDto);
  }

  @Delete('usuarios/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MEDICO')
  async removeUsuario(@Param('id') id: string, @CurrentUser() user?: any) {
    console.log('🗑️  CONTROLLER - removeUsuario chamado');
    console.log('🗑️  ID do usuário a ser excluído:', id);
    console.log('🗑️  Usuário logado:', user?.id, user?.email, user?.role);
    
    // ADMIN pode excluir qualquer usuário (exceto a si mesmo)
    if (user?.role?.toUpperCase() === 'ADMIN') {
      // A validação de auto-exclusão será feita no service
      return this.configuracoesService.removeUsuario(id, user?.id);
    }
    
    // Verificar se o usuário é owner da clínica do usuário que está sendo excluído
    if (user?.role?.toUpperCase() === 'MEDICO') {
      const targetUser = await this.configuracoesService.getUsuarioById(id);
      if (!targetUser) {
        throw new BadRequestException('Usuário não encontrado');
      }
      
      console.log('🗑️  Usuário alvo:', targetUser.id, targetUser.email, targetUser.role);
      
      // Verificar se o usuário atual é owner da clínica do usuário alvo
      const clinicasOwned = await this.configuracoesService.getClinicasOwnedByUser(user.id);
      const isOwner = clinicasOwned.some(c => c.id === targetUser.clinicaId);
      
      if (!isOwner) {
        throw new ForbiddenException('Você só pode excluir usuários da sua clínica');
      }
      
      // Owner não pode excluir a si mesmo
      if (targetUser.id === user.id) {
        throw new ForbiddenException('Você não pode excluir a si mesmo');
      }
    }
    
    return this.configuracoesService.removeUsuario(id, user?.id);
  }

  @Get('portal-link')
  async getPortalLink(@CurrentUser() user?: any) {
    if (!user?.clinicaId) {
      throw new BadRequestException('Usuário sem clínica vinculada');
    }
    const slug = await this.configuracoesService.ensureClinicSlug(user.clinicaId);
    return { slug, path: `/c/${slug}` };
  }

  @Get('clinicas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getClinicas(@CurrentUser() user?: any) {
    console.log('📋 CONTROLLER - getClinicas chamado');
    console.log('📋 User:', user?.email, 'Role:', user?.role);
    const clinicas = await this.configuracoesService.getClinicas();
    console.log(`✅ CONTROLLER - getClinicas retornando ${clinicas.length} clínica(s)`);
    return clinicas;
  }

  @Get('clinicas/:id')
  async getClinica(@Param('id') id: string) {
    return this.configuracoesService.getClinica(id);
  }

  @Post('clinicas')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createClinica(
    @Body() createDto: CreateClinicaDto,
    @CurrentUser() user?: any,
  ) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 CREATE CLINICA - INÍCIO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('User:', user ? { id: user.id, email: user.email, role: user.role } : 'null');
    console.log('DTO recebido:', JSON.stringify(createDto, null, 2));
    
    if (!user || !user.id) {
      console.error('❌ Usuário não autenticado');
      throw new BadRequestException('Usuário não autenticado');
    }
    
    try {
      const result = await this.configuracoesService.createClinica(createDto, user.id);
      console.log('✅ CREATE CLINICA - SUCESSO');
      console.log('Resultado:', result.id);
      return result;
    } catch (error: any) {
      console.error('❌ CREATE CLINICA - ERRO NO CONTROLLER');
      console.error('Erro:', error);
      throw error;
    }
  }

  /**
   * Endpoint para criar clínica completa (clínica + gerente em uma operação)
   * O gerente será o dono da clínica e poderá gerenciar usuários independentemente
   */
  @Post('clinicas/completo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createClinicaCompleto(
    @Body() createDto: CreateClinicaCompletoDto,
    @CurrentUser() user?: any,
  ) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 CREATE CLINICA COMPLETO - INÍCIO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('User:', user ? { id: user.id, email: user.email, role: user.role } : 'null');
    console.log('DTO recebido:', JSON.stringify(createDto, null, 2));
    
    if (!user || !user.id) {
      console.error('❌ Usuário não autenticado');
      throw new BadRequestException('Usuário não autenticado');
    }
    
    try {
      const result = await this.configuracoesService.createClinicaCompleto(createDto);
      console.log('✅ CREATE CLINICA COMPLETO - SUCESSO');
      console.log('Resultado:', result.id);
      console.log('Gerente criado:', result.owner?.email);
      return result;
    } catch (error: any) {
      console.error('❌ CREATE CLINICA COMPLETO - ERRO NO CONTROLLER');
      console.error('Erro:', error);
      throw error;
    }
  }

  @Put('clinicas/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateClinica(
    @Param('id') id: string,
    @Body() updateDto: UpdateClinicaDto,
  ) {
    return this.configuracoesService.updateClinica(id, updateDto);
  }

  @Delete('clinicas/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async removeClinica(@Param('id') id: string) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🗑️  DELETE CLINICA - INÍCIO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('ID da clínica:', id);
    
    try {
      const result = await this.configuracoesService.removeClinica(id);
      console.log('✅ DELETE CLINICA - SUCESSO');
      return result;
    } catch (error: any) {
      console.error('❌ DELETE CLINICA - ERRO NO CONTROLLER');
      console.error('Erro:', error);
      throw error;
    }
  }

  @Post('secretarias-medicos/vincular')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async vincularSecretariaMedico(
    @Body('secretariaId') secretariaId: string,
    @Body('medicoId') medicoId: string,
  ) {
    return this.secretariasMedicosService.vincular(secretariaId, medicoId);
  }

  @Post('secretarias-medicos/desvincular')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async desvincularSecretariaMedico(
    @Body('secretariaId') secretariaId: string,
    @Body('medicoId') medicoId: string,
  ) {
    return this.secretariasMedicosService.desvincular(secretariaId, medicoId);
  }

  @Get('secretarias/:id/medicos')
  async getMedicosPorSecretaria(@Param('id') id: string) {
    return this.secretariasMedicosService.getMedicosPorSecretaria(id);
  }

  @Get('medicos/:id/secretarias')
  async getSecretariasPorMedico(@Param('id') id: string) {
    return this.secretariasMedicosService.getSecretariasPorMedico(id);
  }

  @Get('secretarias-medicos')
  async getAllVinculos(
    @Query('clinicaId') clinicaId?: string,
    @CurrentUser() user?: any,
  ) {
    // ADMIN pode passar clinicaId, outros usam a própria clínica
    const filterClinicaId = user?.role === 'ADMIN' 
      ? (clinicaId || user?.clinicaId) 
      : user?.clinicaId;

    return this.secretariasMedicosService.getAllVinculos(filterClinicaId);
  }
}

