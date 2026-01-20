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
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClinicaGuard } from '../../common/guards/clinica.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ClinicaGuard)
@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('clinicaId') clinicaId?: string,
    @CurrentUser() user?: any,
  ) {
    // ADMIN pode passar clinicaId na query, outros usam a própria clínica
    const filterClinicaId = user?.role === 'ADMIN' 
      ? (clinicaId || user?.clinicaId) 
      : user?.clinicaId;

    return this.pacientesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      filterClinicaId,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    const filterClinicaId = user?.role === 'ADMIN' ? undefined : user?.clinicaId;
    return this.pacientesService.findOne(id, filterClinicaId);
  }

  @Post()
  async create(
    @Body() createDto: CreatePacienteDto,
    @CurrentUser() user?: any,
  ) {
    // Se não fornecido no DTO, usar a clínica do usuário (exceto ADMIN)
    const clinicaId = createDto.clinicaId || (user?.role !== 'ADMIN' ? user?.clinicaId : undefined);
    return this.pacientesService.create(createDto, clinicaId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePacienteDto,
    @CurrentUser() user?: any,
  ) {
    return this.pacientesService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pacientesService.remove(id);
  }

  @Get(':id/historico')
  async getHistorico(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    const filterClinicaId = user?.role === 'ADMIN' ? undefined : user?.clinicaId;
    return this.pacientesService.getHistorico(id, filterClinicaId);
  }

  @Get(':id/documentos')
  async getDocumentos(@Param('id') id: string) {
    return this.pacientesService.getDocumentos(id);
  }
}


