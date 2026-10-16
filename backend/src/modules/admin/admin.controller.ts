import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateClinicaAdminDto } from './dto/update-clinica-admin.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('planos')
  listPlanos() {
    return this.adminService.listPlanos();
  }

  @Get('clinicas')
  listClinicas(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listClinicas(search, status);
  }

  @Get('clinicas/:id')
  getClinica(@Param('id') id: string) {
    return this.adminService.getClinica(id);
  }

  @Put('clinicas/:id')
  updateClinica(@Param('id') id: string, @Body() dto: UpdateClinicaAdminDto) {
    return this.adminService.updateClinica(id, dto);
  }

  @Post('clinicas/:id/portal-link')
  ensurePortalLink(@Param('id') id: string) {
    return this.adminService.ensurePortalLink(id);
  }

  @Post('clinicas/:id/impersonate')
  impersonate(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.adminService.impersonate(id, user.id);
  }
}
