import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClinicaGuard } from '../../common/guards/clinica.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { consultas_status } from '@prisma/client';

@UseGuards(JwtAuthGuard, ClinicaGuard)
@Controller('consultas')
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('profissionalId') profissionalId?: string,
    @Query('pacienteId') pacienteId?: string,
    @Query('clinicaId') clinicaId?: string,
    @Query('includeArchived') includeArchived?: string,
    @CurrentUser() user?: any,
  ) {
    // ADMIN pode passar clinicaId na query, outros usam a própria clínica
    const filterClinicaId = user?.role === 'ADMIN' 
      ? (clinicaId || user?.clinicaId) 
      : user?.clinicaId;

    return this.consultasService.findAll({
      status: status as consultas_status,
      profissionalId,
      pacienteId,
      clinicaId: filterClinicaId,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: any,
  ) {
    const filterClinicaId = user?.role === 'ADMIN' ? undefined : user?.clinicaId;
    return this.consultasService.findOne(id, filterClinicaId);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: consultas_status,
  ) {
    return this.consultasService.updateStatus(id, status);
  }

  @Post(':id/iniciar')
  async iniciarAtendimento(@Param('id') id: string) {
    return this.consultasService.iniciarAtendimento(id);
  }

  @Post(':id/finalizar')
  async finalizarAtendimento(@Param('id') id: string) {
    return this.consultasService.finalizarAtendimento(id);
  }

  @Post(':id/arquivar')
  async arquivar(@Param('id') id: string) {
    return this.consultasService.arquivar(id);
  }

  @Post(':id/desarquivar')
  async desarquivar(@Param('id') id: string) {
    return this.consultasService.desarquivar(id);
  }
}


