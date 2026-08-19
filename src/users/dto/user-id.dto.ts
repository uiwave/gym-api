import { IsString, Length } from 'class-validator';

export class UserIdDto {
  @IsString()
  @Length(1, 255)
  id!: string;
}
