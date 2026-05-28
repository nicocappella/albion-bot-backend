import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (value as string)?.trim() || undefined)
  search?: string;
}
