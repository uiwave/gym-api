import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoutineExerciseDto {
  @IsUUID()
  exerciseId!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  sets!: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  repetitions!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  weight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  restSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
