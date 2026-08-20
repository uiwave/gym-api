import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const USER_ROLES = ['admin', 'trainer', 'receptionist', 'member'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;
}
