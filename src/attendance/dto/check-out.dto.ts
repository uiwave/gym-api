import { IsOptional, IsUUID } from 'class-validator';

export class CheckOutDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
