import { IsUUID } from 'class-validator';

export class ExerciseIdDto {
  @IsUUID()
  id!: string;
}
