import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { Collection, Guild, GuildEmoji, Snowflake } from 'discord.js';
import type {
  EventComposition,
  EventCompositionEntry,
} from '../../../events/event-composition';
import {
  ALBION_WEAPON_EMOJIS,
  ALBION_WEAPON_EMOJIS_BY_KEY,
  type AlbionWeaponEmojiDefinition,
} from './albion-emojis.manifest';

const ALBION_RENDER_BASE_URL = 'https://render.albiononline.com/v1/item';

export type AlbionEmojiSyncStatus = 'created' | 'replaced' | 'kept' | 'failed';

export interface AlbionEmojiSyncItemResult {
  key: string;
  name: string;
  label: string;
  itemUniqueName: string;
  status: AlbionEmojiSyncStatus;
  emoji?: string;
  error?: string;
}

export interface AlbionEmojiSyncResult {
  total: number;
  created: number;
  replaced: number;
  kept: number;
  failed: number;
  items: AlbionEmojiSyncItemResult[];
}

@Injectable()
export class AlbionEmojisService {
  private readonly logger = new Logger(AlbionEmojisService.name);

  async withGuildEmojis(
    composition: EventComposition,
    guild: Guild | null,
  ): Promise<EventComposition> {
    if (!guild) return composition;

    try {
      const emojis = await guild.emojis.fetch();
      const entries = composition?.entries?.map((entry) =>
        this.withGuildEmoji(entry, emojis),
      );

      return {
        ...composition,
        entries,
      };
    } catch (error) {
      this.logger.warn(
        `No se pudieron resolver emojis del servidor: ${(error as Error).message}`,
      );
      return composition;
    }
  }

  /**
   * Devuelve la URL pública de la imagen del arma correspondiente a un emojiKey.
   * Usada para mostrar la imagen en los embeds de preview de build.
   * Ej: 'mace_1h' → 'https://render.albiononline.com/v1/item/T8_MAIN_MACE.png'
   */
  getWeaponRenderUrl(emojiKey: string): string | null {
    const definition = ALBION_WEAPON_EMOJIS_BY_KEY.get(emojiKey);
    if (!definition) return null;
    return this.buildRenderUrl(definition.itemUniqueName);
  }

  /**
   * Devuelve la URL pública de la imagen de un item por su itemUniqueName directo.
   */
  getItemRenderUrl(itemUniqueName: string): string {
    return this.buildRenderUrl(itemUniqueName);
  }

  async syncWeaponEmojis(
    guild: Guild,
    overwrite = true,
  ): Promise<AlbionEmojiSyncResult> {
    const items: AlbionEmojiSyncItemResult[] = [];

    for (const definition of ALBION_WEAPON_EMOJIS) {
      items.push(await this.syncWeaponEmoji(guild, definition, overwrite));
    }

    return {
      total: items.length,
      created: this.countByStatus(items, 'created'),
      replaced: this.countByStatus(items, 'replaced'),
      kept: this.countByStatus(items, 'kept'),
      failed: this.countByStatus(items, 'failed'),
      items,
    };
  }

  private withGuildEmoji(
    entry: EventCompositionEntry,
    emojis: Collection<Snowflake, GuildEmoji>,
  ): EventCompositionEntry {
    if (!entry.emojiKey) return entry;

    const definition = ALBION_WEAPON_EMOJIS_BY_KEY.get(entry.emojiKey);
    if (!definition) return entry;

    const emoji = this.findEmojiByName(emojis, definition.emojiName);
    if (!emoji) return entry;

    return {
      ...entry,
      emoji: this.formatEmoji(emoji),
    };
  }

  private async syncWeaponEmoji(
    guild: Guild,
    definition: AlbionWeaponEmojiDefinition,
    overwrite: boolean,
  ): Promise<AlbionEmojiSyncItemResult> {
    try {
      const emojis = await guild.emojis.fetch();
      const existing = this.findEmojiByName(emojis, definition.emojiName);

      if (existing && !overwrite) {
        return this.buildItemResult(definition, 'kept', existing);
      }

      const attachment = await this.downloadEmojiImage(definition);

      if (existing) {
        await existing.delete(
          `Albion weapon emoji sync: replacing ${definition.itemUniqueName}`,
        );
      }

      const created = await guild.emojis.create({
        attachment,
        name: definition.emojiName,
        reason: `Albion weapon emoji sync: ${definition.itemUniqueName}`,
      });

      return this.buildItemResult(
        definition,
        existing ? 'replaced' : 'created',
        created,
      );
    } catch (error) {
      const message = (error as Error).message;
      this.logger.warn(
        `No se pudo sincronizar emoji ${definition.emojiName}: ${message}`,
      );

      return {
        key: definition.key,
        name: definition.emojiName,
        label: definition.label,
        itemUniqueName: definition.itemUniqueName,
        status: 'failed',
        error: message,
      };
    }
  }

  private async downloadEmojiImage(
    definition: AlbionWeaponEmojiDefinition,
  ): Promise<Buffer> {
    const { data } = await axios.get<ArrayBuffer>(
      this.buildRenderUrl(definition.itemUniqueName),
      {
        responseType: 'arraybuffer',
        timeout: 10000,
      },
    );

    return Buffer.from(data);
  }

  private buildRenderUrl(itemUniqueName: string): string {
    return `${ALBION_RENDER_BASE_URL}/${itemUniqueName}.png?quality=1&size=128`;
  }

  private findEmojiByName(
    emojis: Collection<Snowflake, GuildEmoji>,
    name: string,
  ): GuildEmoji | undefined {
    return emojis.find((emoji) => emoji.name === name);
  }

  private buildItemResult(
    definition: AlbionWeaponEmojiDefinition,
    status: Exclude<AlbionEmojiSyncStatus, 'failed'>,
    emoji: GuildEmoji,
  ): AlbionEmojiSyncItemResult {
    return {
      key: definition.key,
      name: definition.emojiName,
      label: definition.label,
      itemUniqueName: definition.itemUniqueName,
      status,
      emoji: this.formatEmoji(emoji),
    };
  }

  private formatEmoji(emoji: GuildEmoji): string {
    return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
  }

  private countByStatus(
    items: AlbionEmojiSyncItemResult[],
    status: AlbionEmojiSyncStatus,
  ): number {
    return items.filter((item) => item.status === status).length;
  }
}
