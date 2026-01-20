import { Module } from '@nestjs/common';
import { ProfissionaisController } from './profissionais.controller';
import { ProfissionaisService } from './profissionais.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProfissionaisController],
  providers: [ProfissionaisService],
  exports: [ProfissionaisService],
})
export class ProfissionaisModule {}




