import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

const EXERCISE_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

export class CreateExerciseDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  muscleGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  equipment?: string;

  @IsOptional()
  @IsIn(EXERCISE_DIFFICULTIES)
  difficulty?: (typeof EXERCISE_DIFFICULTIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instructions?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  imageUrl?: string;
}
