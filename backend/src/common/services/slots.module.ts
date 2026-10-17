import { Global, Module } from '@nestjs/common';
import { SlotsService } from './slots.service';

@Global()
@Module({
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
