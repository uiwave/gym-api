import { PartialType } from '@nestjs/swagger';
import { CreateRoutineExerciseDto } from './create-routine-exercise.dto';

export class UpdateRoutineExerciseDto extends PartialType(
  CreateRoutineExerciseDto,
) {}
