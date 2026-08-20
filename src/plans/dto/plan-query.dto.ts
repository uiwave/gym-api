import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const PLAN_STATUSES = ['active', 'inactive'] as const;

export class PlanQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(PLAN_STATUSES)
  status?: (typeof PLAN_STATUSES)[number];
}
