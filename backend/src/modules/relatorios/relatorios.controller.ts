import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('atendimentos')
  async getAtendimentos(
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
    @Query('profissionalId') profissionalId?: string,
  ) {
    return this.relatoriosService.getAtendimentos(
      new Date(inicio),
      new Date(fim),
      profissionalId,
    );
  }

  @Get('financeiro')
  async getFinanceiro(
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
    @Query('profissionalId') profissionalId?: string,
  ) {
    return this.relatoriosService.getFinanceiro(
      new Date(inicio),
      new Date(fim),
      profissionalId,
    );
  }

  @Get('pacientes')
  @Roles('ADMIN', 'MEDICO')
  async getPacientes() {
    return this.relatoriosService.getPacientes();
  }

  @Get('profissional')
  @Roles('ADMIN', 'MEDICO', 'SECRETARIA')
  async getPorProfissional(
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.relatoriosService.getPorProfissional(
      new Date(inicio),
      new Date(fim),
    );
  }
}




