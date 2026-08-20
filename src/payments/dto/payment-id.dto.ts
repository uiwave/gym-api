import { IsUUID } from 'class-validator';

export class PaymentIdDto {
  @IsUUID()
  id!: string;
}
