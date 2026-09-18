import { Module, forwardRef } from '@nestjs/common';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { RestockModule } from '../restock/restock.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    forwardRef(() => InvoicesModule),
    forwardRef(() => DeliveriesModule),
    forwardRef(() => RestockModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
