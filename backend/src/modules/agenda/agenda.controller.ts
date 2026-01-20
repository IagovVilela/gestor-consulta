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
import { AgendaService } from './agenda.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClinicaGuard } from '../../common/guards/clinica.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ClinicaGuard)
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  async findAll(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('profissionalId') profissionalId?: string,
    @Query('status') status?: string,
    @Query('clinicaId') clinicaId?: string,
    @CurrentUser() user?: any,
  ) {
    // ADMIN pode passar clinicaId na query, outros usam a própria clínica
    const filterClinicaId = user?.role === 'ADMIN' 
      ? (clinicaId || user?.clinicaId) 
      : user?.clinicaId;

    return this.agendaService.findAll({
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      profissionalId,
      status,
      clinicaId: filterClinicaId,
    });
  }

  @Post()
  async create(
    @Body() createDto: CreateAgendaDto,
    @CurrentUser() user?: any,
  ) {
    // Se não fornecido no DTO, usar a clínica do usuário (exceto ADMIN)
    if (!createDto.clinicaId && user?.role !== 'ADMIN' && user?.clinicaId) {
      createDto.clinicaId = user.clinicaId;
    }
    return this.agendaService.create(createDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateAgendaDto) {
    return this.agendaService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.agendaService.remove(id);
  }

  @Post(':id/confirmar')
  async confirmar(@Param('id') id: string) {
    return this.agendaService.confirmar(id);
  }

  @Put(':id/reagendar')
  async reagendar(
    @Param('id') id: string,
    @Body('dataHora') dataHora: string,
  ) {
    return this.agendaService.reagendar(id, new Date(dataHora));
  }

  @Get('disponibilidade')
  async getDisponibilidade(
    @Query('profissionalId') profissionalId: string,
    @Query('data') data: string,
  ) {
    return this.agendaService.getDisponibilidade(
      profissionalId,
      new Date(data),
    );
  }
}


