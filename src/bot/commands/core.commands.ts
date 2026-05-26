import { Injectable } from '@nestjs/common';
import { Context, SlashCommand } from 'necord';
import type { SlashCommandContext } from 'necord';

@Injectable()
export class CoreCommands {
  @SlashCommand({
    name: 'ping',
    description: 'Verifica si el bot responde correctamente',
  })
  async handlePing(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const wsPing = Math.round(interaction.client.ws.ping);

    await interaction.reply({
      content: `🏓 Pong! Latencia websocket: ${wsPing} ms`,
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'help',
    description: 'Muestra los comandos básicos disponibles',
  })
  async handleHelp(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const helpLines = [
      '`/ping` - Comprueba si el bot está vivo.',
      '`/guild-info` - Muestra información general de la guild.',
      '`/sync-emojis-albion` - Crea o reemplaza los emojis de armas del servidor.',
    ].join('\n');

    await interaction.reply({
      embeds: [
        {
          title: 'Comandos disponibles',
          description: helpLines,
          color: 0x5865f2,
        },
      ],
      ephemeral: true,
    });
  }
}
