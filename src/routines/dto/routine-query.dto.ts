import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const ROUTINE_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED'] as const;

export class RoutineQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ROUTINE_STATUSES)
  status?: (typeof ROUTINE_STATUSES)[number];

  @IsOptional()
  @IsUUID()
  memberId?: string;
}
