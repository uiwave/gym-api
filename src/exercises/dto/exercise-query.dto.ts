import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const EXERCISE_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

export class ExerciseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  muscleGroup?: string;

  @IsOptional()
  @IsIn(EXERCISE_DIFFICULTIES)
  difficulty?: (typeof EXERCISE_DIFFICULTIES)[number];
}
