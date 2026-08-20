import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const TRAINER_STATUSES = ['active', 'inactive'] as const;

export class TrainerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(TRAINER_STATUSES)
  status?: (typeof TRAINER_STATUSES)[number];
}
