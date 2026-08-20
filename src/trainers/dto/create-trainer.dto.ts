import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const TRAINER_STATUSES = ['active', 'inactive'] as const;

export class CreateTrainerDto {
  @IsString()
  @Length(1, 255)
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsIn(TRAINER_STATUSES)
  status?: (typeof TRAINER_STATUSES)[number];
}
