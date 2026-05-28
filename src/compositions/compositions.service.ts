import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  BuildItem,
  EventComposition,
  EventCompositionEntry,
} from '../events/event-composition';
import {
  BASE_EVENT_COMPOSITIONS,
  DEFAULT_EVENT_COMPOSITION_KEY,
} from '../events/event-composition';
import {
  Composition,
  type CompositionDocument,
  toEventComposition,
} from './compositions.schema';
import { BuildService } from '../builds/build.service';
import { AlbionItemService } from '../items/albion-item.service';
import { getFilledSlots } from '../builds/build.schema';

@Injectable()
export class CompositionsService implements OnModuleInit {
  private readonly logger = new Logger(CompositionsService.name);

  constructor(
    @InjectModel(Composition.name)
    private readonly compositionModel: Model<CompositionDocument>,
    private readonly buildService: BuildService,
    private readonly albionItemService: AlbionItemService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const count = await this.compositionModel.countDocuments();
      if (count === 0) {
        this.logger.log(
          'Colección de composiciones vacía — sembrando datos base...',
        );
        await this.seed();
        this.logger.log(
          `${BASE_EVENT_COMPOSITIONS.length} composiciones sembradas.`,
        );
      } else {
        this.logger.log(`Composiciones en DB: ${count}.`);
      }
    } catch (error) {
      this.logger.error(
        'Error al verificar/sembrar composiciones:',
        error as Error,
      );
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  async findAll(): Promise<EventComposition[]> {
    const docs = await this.compositionModel.find().lean().exec();
    const compositions = docs.map((doc) =>
      toEventComposition(doc as unknown as CompositionDocument),
    );
    return Promise.all(compositions.map((c) => this.hydrateComposition(c)));
  }

  async findByKey(key: string): Promise<EventComposition | undefined> {
    const doc = await this.compositionModel.findOne({ key }).lean().exec();
    if (!doc) return undefined;
    const composition = toEventComposition(doc as unknown as CompositionDocument);
    return this.hydrateComposition(composition);
  }

  async getDefault(): Promise<EventComposition | undefined> {
    return this.findByKey(DEFAULT_EVENT_COMPOSITION_KEY);
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async upsert(composition: EventComposition): Promise<EventComposition> {
    const doc = await this.compositionModel
      .findOneAndUpdate(
        { key: composition.key },
        {
          $set: {
            name: composition.name,
            description: composition.description,
            entries: composition.entries,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    const result = toEventComposition(doc);
    return this.hydrateComposition(result);
  }

  async deleteByKey(key: string): Promise<boolean> {
    const result = await this.compositionModel.deleteOne({ key }).exec();
    return result.deletedCount > 0;
  }

  /** Siembra todas las composiciones base (salta las que ya existen). */
  async seed(): Promise<void> {
    for (const composition of BASE_EVENT_COMPOSITIONS) {
      const exists = await this.compositionModel
        .exists({ key: composition.key })
        .exec();
      if (!exists) {
        await this.compositionModel.create(composition);
      }
    }
  }

  /** Devuelve las choices para slash commands (key + name). */
  async getChoices(): Promise<Array<{ name: string; value: string }>> {
    const docs = await this.compositionModel
      .find({}, { key: 1, name: 1 })
      .lean()
      .exec();
    return docs.map((d) => ({
      name: (d as { name: string }).name,
      value: (d as { key: string }).key,
    }));
  }

  // ─── Hydration ─────────────────────────────────────────────────────────────

  /**
   * Para cada entry que tenga `buildKey`, carga el Build desde la DB,
   * luego resuelve los AlbionItems de cada slot y popula `buildItems`.
   * Entries sin buildKey se devuelven tal cual (con sus buildItems inline).
   */
  private async hydrateComposition(
    composition: EventComposition,
  ): Promise<EventComposition> {
    const entries = await Promise.all(
      composition.entries.map((entry) => this.hydrateEntry(entry)),
    );
    return { ...composition, entries };
  }

  private async hydrateEntry(
    entry: EventCompositionEntry,
  ): Promise<EventCompositionEntry> {
    if (!entry.buildKey) return entry;

    const build = await this.buildService.findByKey(entry.buildKey);
    if (!build) return entry;

    const slots = getFilledSlots(build);
    if (slots.length === 0) return entry;

    const itemMap = await this.albionItemService.findManyByUniqueNames(
      slots.map((s) => s.itemUniqueName),
    );

    const buildItems: BuildItem[] = slots.map(({ slot, itemUniqueName }) => ({
      name: itemMap.get(itemUniqueName)?.name ?? itemUniqueName,
      itemUniqueName,
      slot,
    }));

    return {
      ...entry,
      buildItems,
      // Inherit emoji/emojiKey from Build if the entry doesn't override them
      emojiKey: entry.emojiKey ?? build.emojiKey,
      emoji: entry.emoji ?? build.emoji,
    };
  }
}
