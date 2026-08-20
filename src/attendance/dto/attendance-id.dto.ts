import { IsUUID } from 'class-validator';

export class AttendanceIdDto {
  @IsUUID()
  id!: string;
}
