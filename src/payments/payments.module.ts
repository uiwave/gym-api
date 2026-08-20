import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { MemberPaymentsController } from './member-payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, MemberPaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
