import { IsIn, IsString, Length, MaxLength } from 'class-validator';

export const NOTIFICATION_TYPES = [
  'INFO',
  'WARNING',
  'SUCCESS',
  'PAYMENT',
  'MEMBERSHIP',
  'SYSTEM',
] as const;

export class CreateNotificationDto {
  @IsString()
  @Length(1, 255)
  userId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(4000)
  message!: string;

  @IsIn(NOTIFICATION_TYPES)
  type!: (typeof NOTIFICATION_TYPES)[number];
}
