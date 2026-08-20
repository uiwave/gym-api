import { IsOptional, IsUUID } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
