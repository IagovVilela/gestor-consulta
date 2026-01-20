import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getMetrics(@Request() req, @Query('clinicaId') clinicaId?: string) {
    const finalClinicaId = clinicaId || req.user.clinicaId;
    
    console.log('📊 DashboardController.getMetrics - Request:', {
      userId: req.user.id,
      userRole: req.user.role,
      userClinicaId: req.user.clinicaId,
      queryClinicaId: clinicaId,
      finalClinicaId,
    });
    
    return this.dashboardService.getMetrics(
      req.user.id, 
      req.user.role, 
      finalClinicaId
    );
  }

  @Get('consultas-hoje')
  async getConsultasHoje(@Request() req, @Query('clinicaId') clinicaId?: string) {
    const finalClinicaId = clinicaId || req.user.clinicaId;
    
    console.log('📊 DashboardController.getConsultasHoje - Request:', {
      userId: req.user.id,
      userRole: req.user.role,
      userClinicaId: req.user.clinicaId,
      queryClinicaId: clinicaId,
      finalClinicaId,
    });
    
    return this.dashboardService.getConsultasHoje(
      req.user.id, 
      req.user.role, 
      finalClinicaId
    );
  }

  @Get('atendimentos-periodo')
  async getAtendimentosPeriodo(
    @Request() req,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.dashboardService.getAtendimentosPorPeriodo(
      req.user.id,
      req.user.role,
      new Date(inicio),
      new Date(fim),
    );
  }
}




