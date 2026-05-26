import { Injectable, Logger } from '@nestjs/common';
import { PermissionFlagsBits } from 'discord.js';
import { Context, SlashCommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import {
  AlbionEmojisService,
  type AlbionEmojiSyncItemResult,
} from '../features/albion-emojis/albion-emojis.service';

@Injectable()
export class AlbionEmojisCommands {
  private readonly logger = new Logger(AlbionEmojisCommands.name);

  constructor(private readonly albionEmojisService: AlbionEmojisService) {}

  @SlashCommand({
    name: 'sync-emojis-albion',
    description: 'Crea o reemplaza los emojis de armas de Albion del servidor',
  })
  async syncAlbionEmojis(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: 'Este comando solo se puede usar dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageGuildExpressions,
      )
    ) {
      await interaction.reply({
        content:
          'Necesitás el permiso `Manage Guild Expressions` para sincronizar emojis.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const botMember = guild.members.me ?? (await guild.members.fetchMe());
      if (
        !botMember.permissions.has(PermissionFlagsBits.ManageGuildExpressions)
      ) {
        await interaction.editReply({
          content:
            'El bot no tiene el permiso `Manage Guild Expressions`, así que no puede crear emojis.',
        });
        return;
      }

      const result = await this.albionEmojisService.syncWeaponEmojis(
        guild,
        true,
      );

      await interaction.editReply({
        content: this.buildSyncSummary(result.items),
      });
    } catch (error) {
      this.logger.error(
        `Error sincronizando emojis de Albion: ${(error as Error).message}`,
        error as Error,
      );
      await interaction.editReply({
        content: 'No pude sincronizar los emojis de armas de Albion.',
      });
    }
  }

  private buildSyncSummary(items: AlbionEmojiSyncItemResult[]): string {
    const created = this.countByStatus(items, 'created');
    const replaced = this.countByStatus(items, 'replaced');
    const kept = this.countByStatus(items, 'kept');
    const failed = items.filter((item) => item.status === 'failed');
    const okPreview = items
      .filter((item) => item.status !== 'failed')
      .slice(0, 12)
      .map((item) => `${item.emoji ?? item.name} ${item.label}`)
      .join('\n');
    const failedPreview = failed
      .slice(0, 5)
      .map(
        (item) =>
          `- ${item.name} (${item.itemUniqueName}): ${this.truncate(item.error ?? 'error desconocido', 120)}`,
      )
      .join('\n');

    return [
      'Sincronización de emojis terminada.',
      `Total: ${items.length} | creados: ${created} | reemplazados: ${replaced} | conservados: ${kept} | fallidos: ${failed.length}`,
      okPreview ? `\nEmojis disponibles:\n${okPreview}` : '',
      failedPreview ? `\nFallidos:\n${failedPreview}` : '',
      failed.length > 5 ? `\nOtros fallidos: ${failed.length - 5}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private countByStatus(
    items: AlbionEmojiSyncItemResult[],
    status: AlbionEmojiSyncItemResult['status'],
  ): number {
    return items.filter((item) => item.status === status).length;
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength
      ? `${value.slice(0, maxLength - 1)}…`
      : value;
  }
}
