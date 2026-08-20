import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const MEMBERSHIP_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'PENDING',
] as const;

export class MembershipQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(MEMBERSHIP_STATUSES)
  status?: (typeof MEMBERSHIP_STATUSES)[number];

  @IsOptional()
  @IsUUID()
  memberId?: string;
}
