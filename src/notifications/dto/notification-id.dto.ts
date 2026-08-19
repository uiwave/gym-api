import { IsUUID } from 'class-validator';

export class NotificationIdDto {
  @IsUUID()
  id!: string;
}
