import { Module } from '@nestjs/common';
import { ProfissionaisController } from './profissionais.controller';
import { ProfissionaisService } from './profissionais.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ClinicAdminGuard } from '../../common/guards/clinic-admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ProfissionaisController],
  providers: [ProfissionaisService, ClinicAdminGuard],
  exports: [ProfissionaisService],
})
export class ProfissionaisModule {}




