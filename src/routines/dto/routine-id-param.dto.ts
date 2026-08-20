import { IsUUID } from 'class-validator';

export class RoutineIdParamDto {
  @IsUUID()
  routineId!: string;
}
