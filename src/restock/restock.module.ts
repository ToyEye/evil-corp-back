import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { RestockController } from './restock.controller';
import { RestockService } from './restock.service';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [RestockController],
  providers: [RestockService],
  exports: [RestockService],
})
export class RestockModule {}
