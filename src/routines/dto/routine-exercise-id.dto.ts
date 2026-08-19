import { IsUUID } from 'class-validator';

export class RoutineExerciseIdDto {
  @IsUUID()
  id!: string;
}
