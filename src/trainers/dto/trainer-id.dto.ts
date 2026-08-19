import { IsUUID } from 'class-validator';

export class TrainerIdDto {
  @IsUUID()
  id!: string;
}
