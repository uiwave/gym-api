import { IsUUID } from 'class-validator';

export class MembershipIdDto {
  @IsUUID()
  id!: string;
}
