import { Module } from '@nestjs/common';
import { ConfiguracoesController } from './configuracoes.controller';
import { UploadController } from './upload.controller';
import { ConfiguracoesService } from './configuracoes.service';
import { SecretariasMedicosService } from './secretarias-medicos.service';
import { ClinicAdminGuard } from '../../common/guards/clinic-admin.guard';
import { ClinicOwnerGuard } from '../../common/guards/clinic-owner.guard';

@Module({
  controllers: [ConfiguracoesController, UploadController],
  providers: [
    ConfiguracoesService,
    SecretariasMedicosService,
    ClinicAdminGuard,
    ClinicOwnerGuard,
  ],
  exports: [ConfiguracoesService],
})
export class ConfiguracoesModule {}


