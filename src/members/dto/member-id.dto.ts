import { IsUUID } from 'class-validator';

export class MemberIdDto {
  @IsUUID()
  id!: string;
}