import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const ROUTINE_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED'] as const;

export class CreateRoutineDto {
  @IsUUID()
  memberId!: string;

  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(ROUTINE_STATUSES)
  status?: (typeof ROUTINE_STATUSES)[number];
}
