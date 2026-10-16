import { Module } from '@nestjs/common';
import { ConfiguracoesController } from './configuracoes.controller';
import { UploadController } from './upload.controller';
import { ConfiguracoesService } from './configuracoes.service';
import { SecretariasMedicosService } from './secretarias-medicos.service';

@Module({
  controllers: [ConfiguracoesController, UploadController],
  providers: [ConfiguracoesService, SecretariasMedicosService],
  exports: [ConfiguracoesService],
})
export class ConfiguracoesModule {}


