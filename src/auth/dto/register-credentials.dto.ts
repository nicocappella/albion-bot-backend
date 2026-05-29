import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterCredentialsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }) => (value as string)?.trim())
  displayName: string;

  @IsEmail()
  @MaxLength(120)
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
