import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BuildItemSlot } from '../../events/event-composition';

const BUILD_ITEM_SLOTS: BuildItemSlot[] = [
  'weapon', 'offhand', 'head', 'chest', 'shoes', 'cape', 'food', 'potion', 'mount',
];

class BuildItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  itemUniqueName?: string;

  @IsOptional()
  @IsEnum(BUILD_ITEM_SLOTS)
  slot?: BuildItemSlot;
}

class CompositionEntryDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  build: string;

  @IsNumber()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  emojiKey?: string;

  @IsOptional()
  @IsString()
  buildKey?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuildItemDto)
  buildItems?: BuildItemDto[];
}

export class UpsertCompositionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'key solo puede contener letras minúsculas, números y guiones' })
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompositionEntryDto)
  entries: CompositionEntryDto[];
}

export class UpdateCompositionDto extends UpsertCompositionDto {
  @IsOptional()
  declare key: string;

  @IsOptional()
  declare name: string;

  @IsOptional()
  declare entries: CompositionEntryDto[];
}
