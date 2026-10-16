import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalTokenService } from './portal-token.service';

@Module({
  controllers: [PortalController],
  providers: [PortalService, PortalTokenService],
})
export class PortalModule {}
