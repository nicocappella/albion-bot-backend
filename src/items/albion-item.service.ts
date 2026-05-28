import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { AnyBulkWriteOperation, Model } from 'mongoose';
import axios from 'axios';
import type { BuildItemSlot } from '../events/event-composition';
import { AlbionItem, type AlbionItemDocument } from './albion-item.schema';

const OPENALBION_API = 'https://api.openalbion.com/api/v3';

// ─── Slot mapping ─────────────────────────────────────────────────────────────

/** Subcategory names that map to the offhand slot */
const OFFHAND_SUBCATEGORIES = new Set(['Shield', 'Torch', 'Tome of Spells']);

/** Subcategory names that map to the head slot */
const HEAD_SUBCATEGORIES = new Set(['Cowl', 'Hoods', 'Helmets']);

/** Subcategory names that map to the chest slot */
const CHEST_SUBCATEGORIES = new Set(['Robes', 'Jackets', 'Armors']);

/** Subcategory names that map to the shoes slot */
const SHOES_SUBCATEGORIES = new Set(['Sandals', 'Shoes', 'Boots']);

/** Category names with no corresponding build slot — skip these items */
const SKIP_CATEGORIES = new Set(['Bag']);

// ─── OpenAlbion API types ─────────────────────────────────────────────────────

interface OpenAlbionCategory {
  id: number;
  name: string;
  type: string;
}

interface OpenAlbionItem {
  id: number;
  name: string;
  tier: string | null;
  item_power: number | null;
  identifier: string;
  icon: string;
  category: OpenAlbionCategory;
  subcategory: OpenAlbionCategory;
}

interface OpenAlbionResponse {
  data: OpenAlbionItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps an OpenAlbion item to a BuildItemSlot.
 * Returns null for items that don't belong in a build (e.g. bags, unknown slots).
 */
function resolveSlot(item: OpenAlbionItem): BuildItemSlot | null {
  const { type: catType, name: catName } = item.category;
  const { name: subName } = item.subcategory;

  if (SKIP_CATEGORIES.has(catName)) return null;

  switch (catType) {
    case 'weapon':
      return OFFHAND_SUBCATEGORIES.has(subName) ? 'offhand' : 'weapon';

    case 'armor':
      if (HEAD_SUBCATEGORIES.has(subName)) return 'head';
      if (CHEST_SUBCATEGORIES.has(subName)) return 'chest';
      if (SHOES_SUBCATEGORIES.has(subName)) return 'shoes';
      return null;

    case 'accessory':
      if (catName === 'Cape') return 'cape';
      if (catName === 'Mount') return 'mount';
      return null;

    case 'consumable':
      if (catName === 'Foods') return 'food';
      if (catName === 'Potions') return 'potion';
      return null;

    default:
      return null;
  }
}

/** Parses a tier string like "3.0" into an integer 3. */
function parseTier(tier: string | null): number | undefined {
  if (tier == null) return undefined;
  const n = Math.floor(parseFloat(tier));
  return isNaN(n) ? undefined : n;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AlbionItemService implements OnModuleInit {
  private readonly logger = new Logger(AlbionItemService.name);

  constructor(
    @InjectModel(AlbionItem.name)
    private readonly itemModel: Model<AlbionItemDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const count = await this.itemModel.countDocuments();
      if (count === 0) {
        this.logger.log(
          'Catálogo vacío — sincronizando items desde OpenAlbion API...',
        );
        const { inserted, skipped } = await this.syncFromOpenAlbion();
        this.logger.log(
          `Sync completado: ${inserted} guardados, ${skipped} omitidos.`,
        );
      } else {
        this.logger.log(`Catálogo de items: ${count} items en DB.`);
      }
    } catch (error) {
      this.logger.error(
        'Error al inicializar catálogo de items:',
        error as Error,
      );
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  async findAll(): Promise<AlbionItem[]> {
    return this.itemModel.find().lean().exec() as Promise<AlbionItem[]>;
  }

  async findBySlot(slot: BuildItemSlot): Promise<AlbionItem[]> {
    return this.itemModel.find({ slot }).lean().exec() as Promise<AlbionItem[]>;
  }

  async findByUniqueName(
    itemUniqueName: string,
  ): Promise<AlbionItem | undefined> {
    const doc = await this.itemModel.findOne({ itemUniqueName }).lean().exec();
    return (doc as AlbionItem | null) ?? undefined;
  }

  async findManyByUniqueNames(
    uniqueNames: string[],
  ): Promise<Map<string, AlbionItem>> {
    const docs = await this.itemModel
      .find({ itemUniqueName: { $in: uniqueNames } })
      .lean()
      .exec();
    return new Map(
      (docs as AlbionItem[]).map((item) => [item.itemUniqueName, item]),
    );
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async upsert(data: {
    itemUniqueName: string;
    name: string;
    slot: BuildItemSlot;
    tier?: number;
    tags?: string[];
  }): Promise<AlbionItem> {
    const doc = await this.itemModel
      .findOneAndUpdate(
        { itemUniqueName: data.itemUniqueName },
        { $set: data },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return doc as AlbionItem;
  }

  async deleteByUniqueName(itemUniqueName: string): Promise<boolean> {
    const result = await this.itemModel.deleteOne({ itemUniqueName }).exec();
    return result.deletedCount > 0;
  }

  // ─── OpenAlbion sync ───────────────────────────────────────────────────────

  /**
   * Fetches all weapons, armors, accessories, and consumables from the
   * OpenAlbion API and upserts them into the local DB catalog.
   *
   * The API returns all items without pagination (~1,300 total).
   * Safe to call multiple times — uses upsert so existing items are updated.
   */
  async syncFromOpenAlbion(): Promise<{ inserted: number; skipped: number }> {
    const endpoints = [
      'weapons',
      'armors',
      'accessories',
      'consumables',
    ] as const;

    let inserted = 0;
    let skipped = 0;

    for (const endpoint of endpoints) {
      this.logger.log(`  Fetching ${endpoint}...`);
      try {
        const response = await axios.get<OpenAlbionResponse>(
          `${OPENALBION_API}/${endpoint}`,
          { timeout: 15_000 },
        );

        const items: OpenAlbionItem[] = response.data?.data ?? [];
        this.logger.log(`  → ${items.length} ${endpoint} recibidos`);

        const bulkOps: AnyBulkWriteOperation<AlbionItem>[] = [];

        for (const item of items) {
          const slot = resolveSlot(item);
          if (!slot) {
            skipped++;
            continue;
          }

          bulkOps.push({
            updateOne: {
              filter: { itemUniqueName: item.identifier },
              update: {
                $set: {
                  itemUniqueName: item.identifier,
                  name: item.name,
                  slot,
                  tier: parseTier(item.tier),
                  tags: [item.category.name, item.subcategory.name],
                },
              },
              upsert: true,
            },
          });
          inserted++;
        }

        if (bulkOps.length > 0) {
          await this.itemModel.bulkWrite(bulkOps);
        }
      } catch (error) {
        this.logger.error(
          `Error al fetch ${endpoint} desde OpenAlbion:`,
          error as Error,
        );
      }
    }

    return { inserted, skipped };
  }
}
