import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserStatus } from '../schemas/user.schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string)?.trim())
  displayName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim() || undefined)
  discordUserId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim() || undefined)
  discordUsername?: string;

  @IsOptional()
  @IsEnum(UserStatus, { message: `status must be one of: ${Object.values(UserStatus).join(', ')}` })
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim() || undefined)
  notes?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
