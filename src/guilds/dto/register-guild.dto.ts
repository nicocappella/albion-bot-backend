import { IsOptional, IsString } from 'class-validator';

export class RegisterGuildDto {
  @IsString()
  discordGuildId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  icon?: string;
}
