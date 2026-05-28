import { IsEnum, IsOptional } from 'class-validator';

export const BUILD_ITEM_SLOTS = [
  'weapon',
  'offhand',
  'head',
  'chest',
  'shoes',
  'cape',
  'food',
  'potion',
  'mount',
] as const;

export type BuildItemSlotValue = (typeof BUILD_ITEM_SLOTS)[number];

export class FilterItemsDto {
  @IsOptional()
  @IsEnum(BUILD_ITEM_SLOTS, {
    message: `slot must be one of: ${BUILD_ITEM_SLOTS.join(', ')}`,
  })
  slot?: BuildItemSlotValue;
}
