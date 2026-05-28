import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertBuildDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'key solo puede contener letras minúsculas, números y guiones' })
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsString()
  emojiKey?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  weapon?: string;

  @IsOptional()
  @IsString()
  offhand?: string;

  @IsOptional()
  @IsString()
  head?: string;

  @IsOptional()
  @IsString()
  chest?: string;

  @IsOptional()
  @IsString()
  shoes?: string;

  @IsOptional()
  @IsString()
  cape?: string;

  @IsOptional()
  @IsString()
  food?: string;

  @IsOptional()
  @IsString()
  potion?: string;

  @IsOptional()
  @IsString()
  mount?: string;
}

export class UpdateBuildDto extends UpsertBuildDto {
  @IsOptional()
  declare key: string;

  @IsOptional()
  declare name: string;

  @IsOptional()
  declare role: string;
}
