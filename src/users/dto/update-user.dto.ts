import { IsIn } from 'class-validator';

const USER_ROLES = ['admin', 'trainer', 'receptionist', 'member'] as const;

export class UpdateUserRoleDto {
  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];
}
