import { IsUUID } from 'class-validator';

export class RoutineIdDto {
  @IsUUID()
  id!: string;
}
