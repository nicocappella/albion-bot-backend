import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginCredentialsDto {
  @IsEmail()
  @MaxLength(120)
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
