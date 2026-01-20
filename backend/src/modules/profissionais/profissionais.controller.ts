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
} from '@nestjs/common';
import { ProfissionaisService } from './profissionais.service';
import { CreateProfissionalDto } from './dto/create-profissional.dto';
import { CreateProfissionalCompletoDto } from './dto/create-profissional-completo.dto';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClinicaGuard } from '../../common/guards/clinica.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ClinicaGuard)
@Controller('profissionais')
export class ProfissionaisController {
  constructor(private readonly profissionaisService: ProfissionaisService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('clinicaId') clinicaId?: string,
    @CurrentUser() user?: any,
  ) {
    const userRole = user?.role?.toUpperCase();
    
    console.log('📋 ProfissionaisController.findAll - Parâmetros:', {
      page,
      limit,
      search,
      clinicaId,
      userRole,
      userClinicaId: user?.clinicaId,
    });
    
    // ADMIN pode passar clinicaId na query ou não passar nada para ver todos
    // Se clinicaId for "all" ou undefined e for ADMIN, não filtrar por clínica
    let filterClinicaId: string | undefined;
    
    if (userRole === 'ADMIN') {
      // Se clinicaId for "all" ou não fornecido, não filtrar (mostrar todos)
      if (clinicaId === 'all' || !clinicaId) {
        filterClinicaId = undefined;
      } else {
        filterClinicaId = clinicaId;
      }
    } else {
      // Outros roles sempre usam sua própria clínica
      filterClinicaId = user?.clinicaId;
    }
    
    console.log('📋 ProfissionaisController.findAll - filterClinicaId:', filterClinicaId);

    const result = await this.profissionaisService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      filterClinicaId,
    );
    
    console.log('📋 ProfissionaisController.findAll - Resultado:', {
      total: result.total,
      dataLength: result.data.length,
      page: result.page,
      totalPages: result.totalPages,
    });
    
    return result;
  }

  @Get('ativos')
  async findAllActive(
    @Query('clinicaId') clinicaId?: string,
    @CurrentUser() user?: any,
  ) {
    // ADMIN pode passar clinicaId na query, outros SEMPRE usam a própria clínica
    const userRole = user?.role?.toUpperCase();
    const filterClinicaId = userRole === 'ADMIN' 
      ? (clinicaId || user?.clinicaId) 
      : (user?.clinicaId || undefined);

    // Log para debug
    console.log('findAllActive - userRole:', userRole);
    console.log('findAllActive - userId:', user?.id);
    console.log('findAllActive - user.clinicaId:', user?.clinicaId);
    console.log('findAllActive - clinicaId query:', clinicaId);
    console.log('findAllActive - filterClinicaId:', filterClinicaId);

    // Se não for ADMIN e não tiver clinicaId, retornar array vazio
    if (!filterClinicaId && userRole !== 'ADMIN') {
      console.log('findAllActive - Retornando vazio: usuário não tem clinicaId');
      return [];
    }

    const result = await this.profissionaisService.findAllActive(filterClinicaId, user?.id);
    console.log('findAllActive - Resultado:', result.length, 'profissionais encontrados');
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.profissionaisService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  async create(@Body() createDto: CreateProfissionalDto, @CurrentUser() user?: any) {
    // Secretárias só podem criar profissionais para sua própria clínica
    if (user?.role?.toUpperCase() === 'SECRETARIA') {
      createDto.clinicaId = user.clinicaId || createDto.clinicaId;
    }
    return this.profissionaisService.create(createDto);
  }

  /**
   * Endpoint para criar profissional completo (usuário + profissional em uma operação)
   * Esta é a forma profissional e intuitiva de criar profissionais
   */
  @Post('completo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SECRETARIA')
  async createCompleto(@Body() createDto: CreateProfissionalCompletoDto, @CurrentUser() user?: any) {
    // Secretárias só podem criar profissionais para sua própria clínica
    if (user?.role?.toUpperCase() === 'SECRETARIA') {
      createDto.clinicaId = user.clinicaId || createDto.clinicaId;
    }
    return this.profissionaisService.createCompleto(createDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateDto: UpdateProfissionalDto) {
    return this.profissionaisService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.profissionaisService.remove(id);
  }
}


