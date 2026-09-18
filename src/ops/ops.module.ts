import { Global, Module } from '@nestjs/common';
import { OpsService } from './ops.service';

@Global()
@Module({
  providers: [OpsService],
  exports: [OpsService],
})
export class OpsModule {}
